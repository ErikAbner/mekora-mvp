[CmdletBinding()]
param(
    [ValidateRange(1024, 65535)]
    [int]$Porta = 8080,

    [ValidatePattern('^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')]
    [string]$Email = 'usuario@mekora.local',

    [switch]$NaoAbrir,
    [switch]$Parar
)

$ErrorActionPreference = 'Stop'
$Raiz = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$EnvWindows = Join-Path $Raiz '.env.windows'
$ComposeBase = Join-Path $Raiz 'docker-compose.yml'
$ComposeWindows = Join-Path $Raiz 'docker-compose.windows.yml'
$Relatorio = Join-Path $Raiz 'storage\logs\iniciar-windows.log'
$Url = "http://localhost:$Porta"
$Compose = @(
    'compose',
    '--env-file', $EnvWindows,
    '-f', $ComposeBase,
    '-f', $ComposeWindows
)

function Escrever-Titulo([string]$Texto) {
    Write-Host "`n$Texto" -ForegroundColor White
}

function Escrever-Ok([string]$Texto) {
    Write-Host "  OK  $Texto" -ForegroundColor Green
}

function Falhar([string]$Texto) {
    throw $Texto
}

function Executar-Docker {
    param([string[]]$Argumentos)
    & docker @Compose @Argumentos
    if ($LASTEXITCODE -ne 0) {
        Falhar "O Docker terminou com erro ao executar: docker $($Compose + $Argumentos -join ' ')"
    }
}

function Gravar-ConfiguracaoLocal {
    if (Test-Path $EnvWindows) {
        $Conteudo = Get-Content $EnvWindows -Raw
    } else {
        $Conteudo = @"
# Criado pelo iniciador do Mekora para Windows.
# Este arquivo fica somente neste computador e nao entra no Git.
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
KINDLE_EMAIL=
"@
    }

    $ValoresLocais = [ordered]@{
        MEKORA_ENV_FILE = '.env.windows'
        MEKORA_DOMINIO = 'localhost'
        MEKORA_FRONTEND_URL = $Url
        MEKORA_PORTA_LOCAL = "$Porta"
        DONO_EMAIL = $Email
        CONVIDADOS = $Email
        ALLOWED_ORIGINS = ''
    }
    foreach ($Chave in $ValoresLocais.Keys) {
        $Linha = "$Chave=$($ValoresLocais[$Chave])"
        if ($Conteudo -match "(?m)^$Chave=") {
            $Conteudo = [regex]::Replace($Conteudo, "(?m)^$Chave=.*$", $Linha)
        } else {
            $Conteudo = $Conteudo.TrimEnd() + "`n$Linha`n"
        }
    }
    $Utf8SemBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($EnvWindows, $Conteudo, $Utf8SemBom)
}

try {
    Set-Location $Raiz
    Escrever-Titulo 'Mekora para Windows'

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Falhar @'
Docker Desktop nao foi encontrado.

1. Instale o Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Durante a instalacao, mantenha marcada a opcao WSL 2.
3. Abra o Docker Desktop e espere aparecer "Engine running".
4. Execute novamente "Iniciar Mekora.cmd".
'@
    }

    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Falhar 'O Docker Desktop esta instalado, mas ainda nao esta funcionando. Abra-o, espere o motor iniciar e tente novamente.'
    }
    Escrever-Ok 'Docker Desktop esta funcionando.'

    $VersaoCompose = (& docker compose version --short 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0) {
        Falhar 'O componente Docker Compose nao foi encontrado. Atualize o Docker Desktop e tente novamente.'
    }
    if ($VersaoCompose -notmatch '(\d+\.\d+\.\d+)') {
        Falhar 'Nao foi possivel identificar a versao do Docker Compose. Atualize o Docker Desktop e tente novamente.'
    }
    if ([version]$Matches[1] -lt [version]'2.24.4') {
        Falhar "O Docker Compose $($Matches[1]) e antigo demais. Atualize o Docker Desktop para usar a versao 2.24.4 ou mais recente."
    }
    Escrever-Ok 'Docker Compose esta disponivel.'

    # A configuracao do Windows e separada do .env usado no Mac ou em producao.
    # Assim o iniciador nunca apaga SMTP, Kindle ou qualquer segredo existente.
    $PrecisaGravar = -not (Test-Path $EnvWindows)
    if (-not $PrecisaGravar) {
        $Configuracao = Get-Content $EnvWindows -Raw
        $PrecisaGravar = ($Configuracao -notmatch "(?m)^MEKORA_PORTA_LOCAL=$Porta$") -or
            ($Configuracao -notmatch "(?m)^DONO_EMAIL=$([regex]::Escape($Email))$")
    }
    if ($PrecisaGravar) {
        Gravar-ConfiguracaoLocal
        Escrever-Ok 'Configuracao local segura foi preparada.'
    } else {
        Escrever-Ok 'Configuracao local existente foi preservada.'
    }

    if ($Parar) {
        Escrever-Titulo 'Encerrando'
        Executar-Docker -Argumentos @('down')
        Escrever-Ok 'O Mekora foi encerrado. Livros, notas e progresso foram preservados.'
        exit 0
    }

    Escrever-Titulo 'Preparando o aplicativo'
    Write-Host '  Na primeira vez, o download pode levar alguns minutos.' -ForegroundColor DarkGray
    Executar-Docker -Argumentos @('up', '-d', '--build')

    Escrever-Titulo 'Esperando o Mekora ficar pronto'
    $Pronto = $false
    for ($Tentativa = 1; $Tentativa -le 120; $Tentativa++) {
        try {
            $Resposta = Invoke-WebRequest -UseBasicParsing -Uri "$Url/health" -TimeoutSec 2
            if ($Resposta.StatusCode -eq 200) {
                $Pronto = $true
                break
            }
        } catch {
            Start-Sleep -Seconds 2
        }
        if (($Tentativa % 10) -eq 0) {
            Write-Host "  Ainda preparando... $($Tentativa * 2)s" -ForegroundColor DarkGray
        }
    }

    if (-not $Pronto) {
        Write-Host "`nUltimas mensagens do servidor:" -ForegroundColor Yellow
        & docker @Compose logs --tail 80 backend web
        Falhar "O servidor nao respondeu em $Url. As mensagens acima ajudam a identificar a causa."
    }
    Escrever-Ok "Servidor pronto em $Url."

    # O link e escrito diretamente no banco local. Nao depende de SMTP e nao
    # cria uma porta de entrada remota: exige acesso ao Docker deste computador.
    $SaidaToken = (& docker @Compose exec -T -e "MEKORA_EMAIL=$Email" backend python3 /app/scripts/chave-local.py | Select-Object -Last 1)
    $Token = if ($null -eq $SaidaToken) { '' } else { $SaidaToken.Trim() }
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($Token)) {
        Falhar 'O servidor iniciou, mas nao foi possivel criar o link de entrada local.'
    }

    $Entrada = "$Url/entrar/$Token"
    Escrever-Titulo 'Pronto'
    Write-Host "  $Entrada" -ForegroundColor Cyan
    Write-Host '  Os dados ficam na pasta storage e sobrevivem a atualizacoes e reinicios.' -ForegroundColor DarkGray
    Write-Host '  Para encerrar, use "Parar Mekora.cmd".' -ForegroundColor DarkGray

    if (-not $NaoAbrir) {
        Start-Process $Entrada
    }
} catch {
    $ErroOriginal = $_.Exception.Message
    try {
        $PastaRelatorio = Split-Path $Relatorio -Parent
        New-Item -ItemType Directory -Force -Path $PastaRelatorio | Out-Null
        @(
            "Mekora para Windows - $(Get-Date -Format o)",
            "Erro: $ErroOriginal",
            "Windows: $([Environment]::OSVersion.VersionString)",
            '',
            'Docker:',
            ((& docker version 2>&1) | Out-String),
            '',
            'Containers:',
            ((& docker @Compose ps 2>&1) | Out-String),
            '',
            'Ultimas mensagens:',
            ((& docker @Compose logs --tail 100 backend web 2>&1) | Out-String)
        ) | Set-Content -Path $Relatorio -Encoding UTF8
    } catch {
        # O diagnostico e auxiliar. A falha original continua sendo a mensagem
        # mais importante, mesmo quando o Docker ainda nem chegou a iniciar.
    }
    Write-Host "`nNao foi possivel iniciar o Mekora." -ForegroundColor Red
    Write-Host $ErroOriginal -ForegroundColor Yellow
    if (Test-Path $Relatorio) {
        Write-Host "`nRelatorio salvo em: $Relatorio" -ForegroundColor DarkGray
    }
    Write-Host 'Se precisar pedir ajuda, envie uma captura desta janela e o relatorio.' -ForegroundColor DarkGray
    exit 1
}

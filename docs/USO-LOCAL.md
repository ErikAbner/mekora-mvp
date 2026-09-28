# Usar o Mekora localmente

## Windows

Instale o Docker Desktop com WSL 2, clone a branch recebida e dê dois cliques
em **`Iniciar Mekora.cmd`**. O iniciador evita a instalação manual de Python,
Node, Calibre, Tesseract e Ghostscript; todas essas dependências vivem nas
imagens reproduzíveis do projeto.

O aplicativo abre em `http://localhost:8080` com uma chave de entrada local. O
link não depende de SMTP e só pode ser criado por quem já controla o Docker e o
banco deste computador. Livros, notas, capas, traduções e progresso permanecem
em `storage/`.

Use **`Parar Mekora.cmd`** para encerrar os servidores. Esse comando não remove
containers, imagens ou dados. Para trocar a porta ou o e-mail local, abra o
PowerShell na pasta e execute, por exemplo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\iniciar-windows.ps1 -Porta 8180 -Email professor@faculdade.edu.br
```

Se o Docker informar que o WSL 2 ou a virtualização estão indisponíveis, eles
precisam ser habilitados no Windows antes de repetir o iniciador.

### SMTP e Kindle no Windows

Depois da primeira abertura, o iniciador cria `.env.windows`. Para enviar ao
Kindle e receber links por e-mail, preencha nesse arquivo `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `KINDLE_EMAIL`. O iniciador pode atualizar
a porta ou o e-mail local em execuções futuras sem apagar essas credenciais.
Sem SMTP, o uso local continua funcionando pelo link criado diretamente no
computador.

## macOS

## Abrir

Se esta é uma cópia recebida de outra pessoa, execute `./install.sh` uma única
vez. Ele instala as dependências que faltarem, prepara a interface atual, cria
o comando `mekora` e instala **Mekora Local** na pasta Aplicativos. Depois
disso, o uso cotidiano não depende desse instalador.

Abra **Mekora Local** na pasta Aplicativos. Ele inicia o servidor e abre o
produto quando tudo estiver pronto. A janela do Terminal permanece aberta
enquanto o Mekora está funcionando. Fechá-la ou pressionar **Control+C**
encerra o servidor, mas não apaga nada.

Como alternativa, no Finder dê dois cliques em **`Mekora.command`**. O iniciador:

1. usa o acervo e o banco existentes em `storage/`;
2. recompila a interface somente quando o código mudou;
3. faz e verifica um backup antes de o banco ser aberto;
4. confere a autenticação SMTP sem enviar mensagem;
5. abre `http://127.0.0.1:8000/mesa` no navegador.

Se o Mekora já estiver rodando, um novo duplo clique apenas abre a página.

## Instalar como aplicativo

Com o Mekora aberto no Chrome, use o botão **Instalar o Mekora** que aparece no
cabeçalho. Ele cria uma janela própria no computador, sem App Store, Play
Store ou mensalidade. O navegador não pode iniciar sozinho um programa local;
por isso, se o servidor estiver fechado, a tela de recuperação oferece
**Abrir o Mekora local**, aciona o iniciador e volta automaticamente quando o
servidor estiver pronto.

O aplicativo guarda em cache somente a interface. Livros, notas, histórico e
dados da conta nunca entram no cache do navegador; continuam no acervo local e
nos backups descritos abaixo.

## Preparar vários arquivos

Envie os arquivos e abra a **Mesa**. Em **Preparar todos com uma receita**,
escolha **Leitura em português** para traduzir automaticamente documentos em
inglês, manter os que já estão em português e converter todos para EPUB. O
cartão de andamento permanece visível nas outras telas e o servidor continua o
trabalho mesmo se a aba for fechada.

Também é possível salvar uma receita pessoal para reutilizar as mesmas decisões
nos próximos lotes.

## Onde o progresso fica

- banco, livros, capas e saídas: `storage/`;
- credenciais SMTP: `.env` (não entram no Git nem no backup);
- backups verificados: `~/Library/Application Support/Mekora/Backups/`.

O iniciador mantém sete cópias recentes do banco. Os arquivos grandes são
espelhados de forma incremental, sem duplicar tudo a cada abertura. Os backups
ficam fora do repositório, portanto continuam existindo se a pasta do código
for movida ou limpa. O Time Machine normalmente inclui essa localização.

## SMTP e Kindle

O `.env` precisa ter `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e
`KINDLE_EMAIL`. Para Gmail, `SMTP_PASS` deve ser uma **senha de app**, não a
senha normal da conta. O `SMTP_USER` também precisa estar autorizado como
remetente nas preferências de documentos pessoais da Amazon.

Para conferir novamente sem abrir o produto:

```bash
.venv/bin/python scripts/verificar-smtp.py
```

Esse teste autentica e encerra; ele não envia e-mail.

## Backup manual

O backup completo também pode ser executado a qualquer momento:

```bash
.venv/bin/python scripts/backup.py
```

O procedimento de restauração está em [`RESTAURAR.md`](RESTAURAR.md).

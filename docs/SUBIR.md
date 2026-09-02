# Subir o Mekora

Este documento é para ser seguido sem lembrar de nada.

O alvo: uma VPS da Hostinger, com Cloudflare na frente. O Mekora sobe em dois
containers — a borda, que serve a interface e o TLS, e o backend, que converte.

---

## Antes: as duas coisas que precisam existir

**Na VPS** — Docker. A Hostinger tem imagem com ele pronto; se a sua não tem:

```bash
curl -fsSL https://get.docker.com | sh
```

**No Cloudflare** — um registro `A` do domínio apontando para o IP da VPS, com
o **proxy desligado na primeira subida** (a nuvem cinza, não a laranja).

O motivo é específico: o Caddy prova o domínio pedindo que a Let's Encrypt
alcance o servidor. Com o proxy do Cloudflare ligado, quem responde é o
Cloudflare, e a prova falha. Depois que o certificado existe, ligue a nuvem
laranja e ponha o SSL/TLS em **Full (strict)** — aí os dois lados ficam
cifrados, que é o ponto.

---

## Subir

```bash
git clone <o repositório> mekora && cd mekora
cp .env.example .env
```

Edite o `.env`. Quatro coisas, e **a última é obrigatória ou você fica de fora
da sua própria instalação**:

| | o que é |
|---|---|
| `MEKORA_DOMINIO` | o domínio que a borda serve, sem `https://` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | por onde sai o link de entrada e o envio ao Kindle |
| `KINDLE_EMAIL` | o endereço `@kindle.com` do aparelho |
| `DONO_EMAIL` | **o seu e-mail.** Sem ele ninguém manda na instalação — nem você |

**O `.env` nunca entra no git e nunca entra na imagem.** Ele existe só nesse
servidor, e é a única cópia — se a VPS sumir, ele some junto.

```bash
docker compose up -d --build
```

A primeira construção demora: ela instala o Calibre, o tesseract e o
ghostscript. As seguintes reaproveitam quase tudo.

O build **falha de propósito** se faltar alguma ferramenta externa —
`conferir-ferramentas.py` roda dentro dele. Uma falta descoberta ali custa um
build; descoberta em produção, custa o primeiro documento de alguém.

---

## Conferir que subiu de verdade

```bash
docker compose ps
```

O backend precisa aparecer como `healthy`, não só `running`. A diferença
importa: a verificação bate numa rota que consulta o banco, e um processo vivo
que não alcança o disco continua respondendo em porta aberta.

```bash
curl -fsS https://SEU-DOMINIO/health
```

E confira a configuração da borda **antes** de confiar nela:

```bash
docker compose exec web caddy validate --config /etc/caddy/Caddyfile
```

Ele lê o arquivo e diz se entendeu. Um erro de sintaxe ali derruba o TLS junto,
e o sintoma é o navegador recusando a conexão — que não parece um erro de
configuração, parece o domínio estar errado.

---

## O banco

As tabelas nascem da migração, não de `create_all`. Ela roda sozinha quando o
backend sobe, e grava no próprio banco em que versão ele está.

Ver a versão:

```bash
docker compose exec backend alembic current
```

Depois de mudar um modelo:

```bash
docker compose exec backend alembic revision --autogenerate -m "o que mudou"
```

Leia o arquivo gerado antes de subir. O autogenerate **acerta o que é acrescentado
e erra o que é renomeado**: uma coluna renomeada aparece como uma apagada e outra
criada, e aplicar isso apaga os dados dela.

---

## Backup

```bash
python3 scripts/backup.py
```

O banco é copiado com a API do próprio SQLite, não com `cp` — cópia de arquivo
com a aplicação escrevendo pode capturar um estado pela metade, que abre normal e
falha depois. Toda cópia é conferida logo após ser escrita.

Para rodar sozinho, todo dia às 3 da manhã:

```bash
crontab -e
```

```
0 3 * * * cd /caminho/para/mekora && docker compose exec -T backend python3 /app/scripts/backup.py >> storage/logs/backup.log 2>&1
```

E confira de vez em quando que ele ainda está rodando:

```bash
python3 scripts/backup.py --conferir
```

**Backup que ninguém abre não é backup.** Vale marcar no calendário uma vez por
mês: pegar a última cópia e abri-la. Leva um minuto e é a única forma de saber.

---

## Depois de criar uma rota no backend

```bash
python3 scripts/rotas.py
```

As rotas do backend não têm prefixo comum, e a borda precisa saber quais
caminhos repassar. Essa lista é gerada do próprio FastAPI — se você criar uma
rota e não regenerar, ela funciona em desenvolvimento e não funciona em
produção. O pedido cai na interface, volta HTML, e o erro é
`Unexpected token '<'`, que não diz nada sobre rota.

Para conferir sem escrever nada (serve em CI):

```bash
python3 scripts/rotas.py --conferir
```

---

---

## O acesso, e o que ele cobre

Isto está resolvido, e fica escrito porque é o que decide se o Mekora pode ficar
num endereço público.

**Cada arquivo tem um endereço próprio.** O número do trabalho continua existindo
por dentro; para fora vai um token aleatório. Antes era `/storage/output/7/...`,
e qualquer um lia os documentos de todos só contando.

**Duas portas cobrem as rotas.** `exigir_acesso` protege tudo que tem o número de
um trabalho no caminho — 41 rotas —, aceitando a sessão do dono ou a chave do
trabalho. `exigir_conta` protege o que fala da instalação: configuração,
presets, métricas.

**Cinco rotas ficam públicas, e cada uma tem razão:**

| Rota | Por quê |
|---|---|
| `/health` | a verificação do container bate aqui, sem credencial |
| `/config/formatos` | a tela de entrada precisa saber o que o Mekora aceita antes de haver conta |
| `/entrar/pedir` | pedir um link é o começo de tudo; tem limite de 5 por 10 minutos |
| `/entrar/{token}` | o token no caminho **é** a credencial |
| `/storage/{rest}` | o apanhador que responde 404 a tudo que não é artefato permitido |

**Enviar sem conta tem teto**: dez arquivos por hora por origem de rede, sessenta
com conta. Converter sem cadastro é garantido pela `DEC-0018`, e sem teto de
quantidade essa garantia era o caminho para encher o disco da máquina.

`tests/test_superficie.py` verifica tudo isto. Ele existe porque proteção sem
teste é proteção que some no próximo refactor — e ele foi provado removendo uma
das portas, para confirmar que reprova.

### Quem manda na instalação

`/config`, `/app-config` e `/presets` falam da INSTALAÇÃO inteira — o `smtp_user`
de onde os documentos saem, o `retention_days` que decide quanto tempo o arquivo
de todo mundo vive, e o gatilho da limpeza. Elas exigem ser **dono**, e não só
ter conta: a entrada é por link no e-mail, então "tem conta" é qualquer pessoa da
internet trinta segundos depois de querer.

Quem é dono sai de `DONO_EMAIL`, no `.env`:

```
DONO_EMAIL=voce@seudominio.com
```

Aceita mais de um, separados por vírgula. **Sem essa linha ninguém é dono e as
três respondem 403 para todo mundo** — inclusive para você. Isso é de propósito:
o contrário seria "esqueci de configurar, então está aberto".

## Ver o produto no seu computador

```bash
bash scripts/ver.sh
```

Ele sobe o backend e o web, cria a conta `erik@mekora.local`, semeia um acervo e
imprime um endereço que **entra na conta e leva direto para a Estante**.

O link vale quinze minutos e serve uma vez. Para outro, com tudo já no ar:

```bash
bash scripts/ver.sh --link
```

**Por que isto precisou existir:** entrar exige um link por e-mail, o e-mail não
está configurado em desenvolvimento, e o link é de uso único. "Veja no localhost"
não era um convite — era uma tarefa de cinco passos, e por isso ficou sem ser
feita.

O acervo semeado é **mentira confessa**: seis livros que nunca foram convertidos,
com capa de exemplo e contagem de páginas escrita no `scripts/semear.py`. Serve
para as telas terem o que mostrar — uma estante vazia não mostra a grade, a
ficha, o alternador de vista nem a lombada, que é justamente o que há para ver.

Para parar: `bash scripts/prova.sh parar`

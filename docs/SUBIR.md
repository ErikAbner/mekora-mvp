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

Edite o `.env`: SMTP, o e-mail do Kindle, e `MEKORA_DOMINIO`.

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

## O que este documento NÃO cobre, e precisa ser resolvido antes de abrir ao público

**Os arquivos não têm dono.** O `id` de um trabalho é um número em sequência —
1, 2, 3 — e `/storage/output/7/livro.epub` responde para qualquer um que peça.
Enquanto não existir conta, subir com endereço público significa que qualquer
visitante lê os documentos de todos, só contando.

Enquanto isso não for resolvido, o lugar do Mekora é atrás de algo que limite
quem chega — Cloudflare Access, ou uma senha na borda.

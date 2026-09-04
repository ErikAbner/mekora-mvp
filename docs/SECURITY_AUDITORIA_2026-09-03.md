# Auditoria de segurança — 03/09/2026

**Estado:** achados abertos, nenhum corrigido
**Método:** leitura do código, mais **uma** prova dinâmica local — o achado 3,
metade do app, num servidor isolado na porta 8299 (ver *Anexo: a prova do achado
3*). Todo o resto se lê no código e **não** foi reproduzido contra um Mekora
rodando; onde a leitura não basta para afirmar, está escrito que não basta. Nada
foi testado contra produção, e nada será: forjar cabeçalho para derrubar teto de
envio no ar é o próprio ataque.

**Ordem de correção**, decidida pelo Erik em 03/09: **1**, depois **3**, depois
**2**. O achado 1 vem primeiro por ser zero-autenticação e queimar a reputação de
envio do domínio, e porque o conserto é pequeno — trabalho sem dono não tem
destino; o retorno ao `KINDLE_EMAIL` é o defeito, e não a configuração.

**Alcance:** `backend/` (97 arquivos, ~22 mil linhas), `web/src/`, `Caddyfile`,
`docker-compose.yml`, `.env.example`, `start.sh`, `install.sh`.

Isto é uma auditoria **datada**. Ela descreve o que o código dizia em 03/09/2026
e não é descrição de estado vigente: se for lida meses depois como se fosse,
mente com a boa-fé de quem escreveu. Corrigido um item, o lugar de anotar é aqui,
ao lado dele.

---

## O que já está resolvido, e por isso não aparece na lista

A parte difícil está feita, e vale escrever para que a lista de achados não seja
lida como um retrato do todo. Foi conferido e está correto:

- **Nenhum `shell=True`, nenhum `os.system`, nenhum `os.popen`** em todo o
  backend. `subprocess_runner.py` é o ponto único: lista de argumentos, timeout
  por chamada, morte do grupo de processos no POSIX, saída truncada e mensagem
  pública sem caminho absoluto.
- **Nenhuma SQL montada com dado de requisição.** As únicas strings de SQL são
  migrações do alembic, e a interpolação que existe lá é de nome de tabela vindo
  de uma lista fixa no próprio arquivo.
- **Nenhum `eval`, `exec`, `pickle.load` ou `yaml.load`.**
- **Travessia e bomba de descompressão cobertas** em `archive_safety.py`: nome
  absoluto, `..`, oculto, caractere de controle e link simbólico rejeitados
  antes de qualquer `read()`; para 7z, os bytes efetivamente escritos são
  contados, e não só o tamanho declarado.
- **Upload em streaming com teto acumulado** e conferência de *magic bytes*
  contra o formato declarado (`upload_safety.py`); o nome do arquivo em disco é
  do servidor, nunca do cliente.
- **O filtro de dono está no `WHERE`, e não num `if` depois**, de forma
  consistente em `notas.py`, `estudos.py`, `canvas.py`, `aparelhos.py`,
  `preferencias.py` e `privacidade.py`. Não foi encontrado um IDOR.
- **Credencial nunca em texto puro no banco:** chave e sessão guardam `sha256`
  (`models/pessoa.py`). A sessão mora em cookie `httponly`, `secure` fora de
  desenvolvimento, `samesite=lax` — e não em `localStorage`, que o `grep` no
  `web/src/` confirma.
- **Nenhum `dangerouslySetInnerHTML`.** O único `innerHTML` do produto
  (`web/src/jornadas/Canvas.jsx:1878`) escreve apenas números formatados. O link
  da prévia (`web/src/jornadas/previa.js:20`) só casa `https?://`, então
  `javascript:` não chega a um `href`.
- **Os três geradores de HTML escapam** com `html.escape(..., quote=True)`, e o
  overlay ainda sanitiza cor, alinhamento, tamanho e `src` por função própria
  (`comic_overlay_service.py:366`).

---

## Achados

### 1 — Trabalho anônimo envia para o Kindle do dono · ALTO

`backend/app/api/jobs.py:175` (`_destino_de`), `:1685` (`send_job`), `:1726`.

Sem dono, `_destino_de` devolve `None`, e o envio cai no `KINDLE_EMAIL` do
`.env` — o Kindle de quem cuida da instalação. A intenção está escrita no
docstring e era correta: "mantém a instalação de uma pessoa só funcionando como
sempre funcionou".

O que mudou é o mesmo que já mudou três vezes neste repositório, e está anotado
com todas as letras no `main.py`: o que era "o dono do computador" virou
"qualquer um na internet". A cadeia hoje é curta e não pede conta nenhuma:

1. `POST /upload` é público por garantia da `DEC-0018`.
2. A resposta devolve `endereco`, que **é** o `token_publico` do trabalho
   (`jobs.py:1004`).
3. Esse token passa em `exigir_acesso` pelo cabeçalho `X-Mekora-Chave`.
4. `POST /jobs/{job_id}/send` entrega o arquivo no Kindle do dono, **enviado
   pela conta SMTP do dono**.

Dois estragos, e o segundo é o pior: um estranho põe conteúdo arbitrário no
aparelho de leitura de outra pessoa, e faz isso *assinando com o remetente
dela*. O teto de dez por hora é o único freio, e ele é contornável — ver o
achado 3.

Direção de conserto, e ela é uma decisão de produto, não de implementação: sem
dono, recusar o envio e dizer que enviar pede conta. O `KINDLE_EMAIL` do `.env`
continua servindo à instalação de uma pessoa só se o retorno ao padrão antigo
ficar condicionado a `DONO_EMAIL` vazio — que é exatamente a marca de "isto aqui
ainda é a máquina de alguém", e a mesma que já governa `/config`.

### 2 — O limite de `/entrar/pedir` é por endereço pedido, não por quem pede · ALTO

`backend/app/services/acesso_service.py:69-95`, e `docs/SUBIR.md:184`.

`pedir_link` conta chaves recentes **da pessoa** — cinco em dez minutos por
e-mail. O número de e-mails distintos não tem teto. Então o limite real de quem
chama a rota é: cinco mensagens *por endereço que ele escolher*, sem conta, sem
nada.

Duas consequências:

- **A conta SMTP do Mekora vira máquina de mandar e-mail para terceiros.** A
  mensagem é legítima, sai do domínio do Mekora, e chega a quem nunca pediu. É o
  caminho mais curto para o domínio ser marcado como remetente ruim.
- **A tabela `pessoas` cresce sem limite**, porque `_pessoa`
  (`acesso_service.py:59`) cria a linha ao *pedir*, antes de qualquer prova de
  que o endereço existe.

O `docs/SUBIR.md:184` descreve essa rota como tendo "limite de 5 por 10
minutos", numa tabela sobre o que é público. Lido ali, o número parece ser o
teto de quem chama — e não é. **A frase precisa mudar junto com o código**, e
enquanto não mudar ela é a parte mais perigosa do achado: um limite que se
acredita ter é pior que um que se sabe não ter.

Direção: a janela em memória de `vazao.py` já existe e já resolve esse formato
de problema; falta aplicá-la a `/entrar/pedir`, por origem. E criar a `Pessoa`
só quando o link for usado, ou podar as que nunca foram.

### 3 — `X-Forwarded-For` é confiável, e o Caddy só ANEXA · ALTO

`backend/app/api/vazao.py:52-69` e `Caddyfile:18,21`.

`_de_onde` lê `x-forwarded-for` quando há domínio configurado e pega o
**primeiro** elemento. O raciocínio do docstring está certo — atrás do Caddy,
`request.client.host` é o Caddy. Mas o `reverse_proxy` do Caddy, sem
configuração adicional, *acrescenta* o IP do cliente ao valor que já veio no
pedido, em vez de substituí-lo. Quem manda `X-Forwarded-For: 1.2.3.4` faz o
cabeçalho chegar como `1.2.3.4, <ip real>`, e o primeiro elemento é o que o
atacante escreveu.

O efeito é que a chave de contagem é escolhida por quem está sendo contado. Vale
para os dois contadores que dependem dela:

- o teto de dez envios por hora sem conta — a única coisa entre a internet e o
  disco cheio, pelo raciocínio do próprio `vazao.py`;
- o teto de recados (`api/recados.py`).

O achado tem **duas metades, e elas se provam separado**:

**A metade do app — PROVADA.** Que `_de_onde` obedece ao primeiro elemento do
cabeçalho, e que isso zera o teto, foi reproduzido localmente em 03/09. Os
números estão no *Anexo* no fim deste documento: com o cabeçalho fixo o 11º envio
responde 429; com o primeiro elemento girando, doze envios passam, todos 201.

**A metade do Caddy — NÃO provada.** Que o `reverse_proxy` *acrescenta* em vez de
substituir é o comportamento documentado dele, e é o que torna a metade de cima
alcançável de fora. Não há `caddy` nem `docker` nesta máquina, então a prova —
uma pilha local com o Caddy na frente — não foi feita. **Enquanto ela não for
feita, esta é a única afirmação deste documento apoiada em documentação de
terceiro, e não em leitura do repositório ou em medição.**

Direção: escrever o cabeçalho na borda em vez de confiar no que chegou —
`reverse_proxy backend:8000 { header_up X-Forwarded-For {remote_host} }` — ou
ler o **último** elemento da lista, que é o que o proxy imediato acrescentou.
As duas fecham a metade do app mesmo que a do Caddy nunca seja provada, e é por
isso que a correção não precisa esperar a prova.

### 4 — Sem `Content-Security-Policy`, e artefato HTML sai da origem do produto · MÉDIO

`Caddyfile:33-42` e `backend/app/api/files.py:36-60,173`.

A borda manda `X-Content-Type-Options`, `X-Frame-Options` e `Referrer-Policy`.
Não manda `Content-Security-Policy` nem `Strict-Transport-Security`.

Ao mesmo tempo, `files.py` serve `comic_review.html`, `comic_overlay.html` e
`comic_translation.html` com `text/html`, **na mesma origem do produto** — a
origem que carrega o cookie de sessão.

Hoje isso não é um XSS: os três geradores escapam tudo que interpolam, e a
sanitização do overlay é específica por tipo de valor. O achado é sobre a
**segunda camada**, que não existe: a primeira é escape escrito à mão em cada
interpolação de três arquivos que crescem a cada rodada de quadrinhos. Uma
interpolação nova sem `_e` é uma linha, e ela roda script de estranho no domínio
que guarda a sessão.

O `httponly` do cookie impede que o script *leia* a sessão, e isso é real. Não
impede que ele *use* a sessão: mesma origem, o navegador anexa o cookie sozinho
em qualquer chamada que o script fizer.

Direção: CSP restritiva em `/storage/*` (esses arquivos não precisam de script
nenhum; precisam de `img-src 'self'` e de estilo em atributo), CSP para o
aplicativo, e HSTS quando o domínio estiver estável — o Caddy redireciona
http→https, mas não manda HSTS por conta própria.

### 5 — `chaves` e `pessoas` só crescem · MÉDIO

`backend/app/services/acesso_service.py:282` e `backend/main.py:224,229`.

`limpar_vencidas` existe, está correta, e **não é chamada de lugar nenhum**. O
`grep` por ela em todo o `backend/` devolve só a própria definição. A limpeza de
startup chama `cleanup_old_jobs` e `limpar_eventos_antigos`, e não esta.

Sozinho seria um problema de higiene. Junto com o achado 2, é uma tabela que um
visitante sem conta escreve e ninguém apaga.

### 6 — Dependências sem pinagem · MÉDIO

`backend/requirements.txt` — as 25 linhas usam `>=`, e não há arquivo de
travamento.

Duas construções da mesma imagem, no mesmo commit, em dias diferentes, produzem
Mekoras diferentes. Isso vale para `pymupdf`, `Pillow`, `py7zr`, `rarfile` e
`ocrmypdf` — que são justamente as bibliotecas que abrem arquivo de estranho, e
onde uma versão nova pode tanto fechar um buraco quanto abrir um.

Não é urgente porque nada aqui está sabidamente vulnerável — **nenhuma
verificação contra base de vulnerabilidades foi feita nesta leitura**, e ela é o
próximo passo natural. É estrutural: sem travamento não há como responder "que
versão estava rodando quando aquilo aconteceu".

### 7 — Sem teto de tentativas na senha do PDF · BAIXO

`backend/app/api/jobs.py:1315`.

`POST /jobs/{job_id}/senha` chama `doc.authenticate` sem contar tentativas. Quem
tenta já provou acesso ao trabalho — pela sessão do dono ou pela chave —, então
o alcance é adivinhar a senha de um documento que a pessoa já alcança. Registrado
por completude; a correção não é prioritária.

### 8 — Notas menores

- **Um trabalhador, e o número está fixado.** Os dois contadores em memória
  (`vazao.py`, `recados.py`) só valem com um processo. O `Dockerfile:79` fixa
  `--workers 1`, então hoje está coerente. Quem mudar esse número muda o teto
  real junto, e o comentário do `vazao.py` já avisa.
- **`token_publico` comparado de dois jeitos.** `porta.py` usa
  `secrets.compare_digest` de propósito, com o motivo escrito. `files.py:_autorizar`
  compara o mesmo segredo por consulta ao banco (`filter(token_publico == ref)`).
  Não é o mesmo canal de tempo, e pela rede é difícil de explorar — mas são dois
  caminhos discordando sobre o mesmo valor, e o barato é o que já está escolhido.
- **`/docs` e `/openapi.json` estão ligados** no FastAPI e **não** aparecem na
  lista de rotas gerada do `Caddyfile`, então não respondem pela borda; o
  `docker-compose.yml` usa `expose` sem `ports`, e o 8000 não chega ao host. Nada
  a fazer hoje. Fica anotado para o dia em que alguém publicar a porta.
- **O cookie não usa prefixo `__Host-`.** `httponly`, `secure`, `samesite=lax` e
  `path=/` estão todos lá; o prefixo é a trava que impede um subdomínio de
  sobrescrever o cookie do domínio principal.
- **Descompasso de documentação:** `docs/SUBIR.md:175` ainda diz que
  `exigir_conta` protege configuração, presets e métricas. Desde 03/09,
  `/config`, `/app-config` e `/presets` exigem **dono** (`main.py`,
  `porta.py:exigir_dono`). O `SUBIR.md` está mais fechado do que descreve, que é
  o lado certo de errar — mas continua sendo duas verdades sobre a mesma coisa.

---

## O que esta leitura não cobriu

Escrito porque um relatório que não diz onde parou é lido como se tivesse ido
até o fim.

- **Só o achado 3 foi executado, e só metade dele.** Os achados 1 e 2 são cadeias
  que se leem inteiras no código e não foram rodadas. A metade do Caddy do
  achado 3 continua sem prova, por falta de `caddy` e de `docker` nesta máquina.
- **Nenhum teste foi feito contra produção**, e a prova do achado 3 rodou num
  servidor isolado, com storage e banco descartáveis, sem SMTP e em porta que não
  é a da bancada de prova (8299, não 8199/5180).
- **Nenhuma verificação contra base de vulnerabilidades** das dependências
  Python ou npm.
- **`legado/`** foi lido só o suficiente para ver que o `main.py` o serve quando
  `legado/dist` existe. O código dele não foi auditado.
- **`plugin/`, `scripts/` e os HTML de exploração** ficaram fora: não são o
  produto no ar.
- **A suíte não foi rodada** (`pytest` sobe processo). Existem
  `test_superficie.py`, `test_file_security.py`, `test_html_escaping.py`,
  `test_upload_safety.py`, `test_archive_safety.py`, `test_subprocess_runner.py`
  e `test_smtp_redaction.py` — a cobertura de segurança existe e é levada a
  sério. Nenhum dos achados acima tem teste que o reprove hoje; se algum for
  corrigido, o padrão da casa vale: o teste primeiro, vermelho, reproduzindo o
  defeito.

---

## Anexo: a prova do achado 3, metade do app

Rodada em 03/09/2026, contra um Mekora local isolado — `MEKORA_STORAGE` e
`DATABASE_URL` no scratchpad, SMTP em branco, `DONO_EMAIL` vazio, porta **8299**.
A porta importa: `scripts/prova.sh` derruba **por porta** (8199 e 5180), e havia
outra sessão medindo naquelas duas. Uma prova de segurança que mata a medição de
quem está do lado é uma prova que custa mais do que descobre.

Doze envios de um PDF de 120 bytes em `POST /upload`, variando só o cabeçalho.

| Rodada | `MEKORA_DOMINIO` | `X-Forwarded-For` | 1º ao 10º | 11º | 12º |
|---|---|---|---|---|---|
| **A** | `prova.mekora.local` | `203.0.113.9`, fixo | 201 | **429** | 429 |
| **B** | `prova.mekora.local` | `198.51.100.<n>, 203.0.113.9` | 201 | **201** | **201** |
| **C** | *não definida* | `198.51.100.<n>, 203.0.113.9` | 201 | **429** | 429 |

O que cada linha diz:

**A** é o controle positivo: o teto de dez por hora sem conta existe e funciona.
O 429 no 11º é `SEM_CONTA = 10` (`vazao.py:47`) fazendo o que promete.

**B** é o achado. O cabeçalho tem a forma exata que o Caddy produziria ao
acrescentar: o valor forjado primeiro, o IP "real" do proxy depois. Girando só o
primeiro elemento, **o teto desaparece** — doze envios, nenhum 429. Não é o teto
sendo alto; é a chave de contagem mudando a cada pedido, porque quem escolhe a
chave é quem está sendo contado.

**C** é o controle negativo, e é ele que localiza o defeito. Sem
`MEKORA_DOMINIO`, `_de_onde` ignora o cabeçalho por decisão explícita
(`vazao.py:64`) e conta tudo em `rede:127.0.0.1` — mesmo cabeçalho da rodada B, e
o 429 volta no 11º. Ou seja: **o buraco só abre com o domínio configurado, que é
exatamente a configuração de produção.** Em desenvolvimento ele não aparece, e
essa é a pior forma de defeito, porque a bancada diz que está tudo certo.

Reproduzir:

```bash
PROVA=/tmp/mekora-prova-xff && mkdir -p "$PROVA/storage"
printf '%%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%%%EOF\n' > "$PROVA/t.pdf"

MEKORA_STORAGE="$PROVA/storage" DATABASE_URL="sqlite:///$PROVA/storage/prova.db" \
MEKORA_DOMINIO=prova.mekora.local SMTP_HOST= SMTP_USER= SMTP_PASS= KINDLE_EMAIL= DONO_EMAIL= \
.venv/bin/python -c "import sys; sys.path.insert(0,'backend'); import uvicorn; \
uvicorn.run('main:app', host='127.0.0.1', port=8299, log_level='warning')" &

for i in $(seq 1 12); do
  curl -s -o /dev/null -w "$i: %{http_code}\n" -X POST http://127.0.0.1:8299/upload \
    -H "X-Forwarded-For: 198.51.100.$i, 203.0.113.9" -F "file=@$PROVA/t.pdf;filename=b$i.pdf"
done
```

Trocar o cabeçalho por um fixo dá a rodada A; tirar `MEKORA_DOMINIO` dá a C.

Quando o achado for corrigido, **este anexo vira o teste**: a rodada B tem de
passar a responder 429 no 11º, e ela é a prova de que a correção pegou. O padrão
da casa pede o teste vermelho antes — aqui ele já está escrito, e já está
vermelho.

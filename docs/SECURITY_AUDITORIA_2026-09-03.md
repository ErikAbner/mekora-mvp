# Auditoria de segurança — 03/09/2026

**Estado:** os três ALTOs (1, 2, 3) estão **corrigidos** e com teste; 4 a 8
continuam abertos; 9 e 10 foram encontrados durante o conserto e nascem abertos
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

### 1 — Trabalho anônimo envia para o Kindle do dono · ALTO · CORRIGIDO 03/09

> **Conserto:** `_destino_de` virou `_exigir_destino` e responde **403** quando o
> trabalho não tem dono, nas duas portas — `/jobs/{id}/send` e
> `/pending-send/{id}/retry`. A recusa acontece **antes** de qualquer escrita de
> estado, senão o trabalho ficaria preso em "enviando" sem ninguém para
> desfazê-lo. O padrão do `.env` continua valendo para quem TEM dono e não
> cadastrou aparelho: ali há uma pessoa, e o trabalho é dela.
> Teste: `backend/tests/test_envio_sem_dono.py` (5 casos). Controle negativo:
> com o `raise` comentado, os dois casos de porta ficam vermelhos com
> `assert 200 == 403`, e o espião registra o envio já feito.
> **Continua aberto o achado 9**, que é a terceira porta para o mesmo lugar.

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

### 2 — O limite de `/entrar/pedir` é por endereço pedido, não por quem pede · ALTO · CORRIGIDO 03/09

> **Conserto:** `vazao.limitar_links` — vinte pedidos por hora **por origem** —
> entrou como dependência da rota. O teto por e-mail continua onde estava: ele
> cobre insistir no mesmo endereço, que é outra coisa. O `docs/SUBIR.md` foi
> corrigido junto, e agora descreve os dois tetos e o que cada um conta.
> Teste: `backend/tests/test_pedido_de_link.py` (4 casos). Controle negativo:
> tirando a dependência, dois casos ficam vermelhos com `assert 204 == 429` — e
> o caso do sigilo continua verde, que é o que mostra que o teto novo não
> comprou volume ao preço do silêncio da rota.
> **Continua aberto:** `_pessoa` ainda cria a linha em `pessoas` ao PEDIR, e não
> ao usar o link. O teto por origem limita o crescimento; não o zera.

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

### 3 — `X-Forwarded-For` é confiável, e o Caddy só ANEXA · ALTO · CORRIGIDO 03/09

> **Conserto, nas duas metades.** A borda: `scripts/rotas.py` passou a gerar
> `reverse_proxy backend:8000 { header_up X-Forwarded-For {remote_host} }`, que
> SOBRESCREVE a lista em vez de acrescentar a ela — e é gerador, e não
> `Caddyfile` à mão, porque o bloco é regenerado e a correção precisa
> sobreviver à próxima regeneração. O app: `_de_onde` lê o **último** elemento.
> As duas se seguram sozinhas de propósito: uma borda trocada um dia não pode
> reabrir o buraco calada.
> Teste: `backend/tests/test_vazao_cabecalho.py` — as três rodadas do anexo,
> agora sem servidor, mais uma conferência de que o `header_up` não some do
> `Caddyfile`. Controle negativo: voltando a `partes[0]`, a rodada B fica
> vermelha com `assert [201, 201] == [429, 429]`, e A e C seguem verdes.

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

### 9 — O router `/batch` opera sobre trabalho de qualquer um · ALTO · ABERTO

`backend/app/api/batch.py:72` (`GET /batch/jobs`), `:118`, `:167`, `:241`,
`:321` (`retry-send`), `:381`. Achado em 03/09, **durante o conserto do achado
1**, e não na leitura que produziu a lista original.

O router é montado com `Depends(exigir_acesso)` e `Depends(exigir_conta)`. A
primeira dependência **não cobre nada aqui**: ela procura `job_id` ou
`upload_id` no CAMINHO, e as rotas de lote levam os números no CORPO. Sem esses
nomes no caminho ela devolve na primeira linha, por desenho — está escrito na
docstring do `porta.py`. Sobra `exigir_conta`, que é "tem conta"; e a entrada é
por link no e-mail, então isso é qualquer pessoa da internet em trinta segundos.

Depois da porta, nenhuma das seis rotas filtra por dono:

    db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()

Sem `dono_id` no filtro. É a forma exata que o resto do backend não usa em
lugar nenhum — `notas.py`, `estudos.py`, `canvas.py`, `aparelhos.py` e
`privacidade.py` põem o `pessoa_id` no `WHERE`, e o comentário de cada um diz
por quê. Este arquivo ficou de fora da revisão de 31/08 e da de 30/08.

O que está do outro lado, com uma conta qualquer e uma lista de números:

| Rota | O que faz com trabalho alheio |
|---|---|
| `GET /batch/jobs` | lista **todos** os trabalhos da instalação, de todo mundo |
| `POST /batch/apply-preset` | muda as configurações de conversão deles |
| `POST /batch/export` | dispara exportação |
| `POST /batch/apply-suggestions` | escreve sugestões no conteúdo |
| `POST /batch/set-final-variant` | escolhe qual variante é a final |
| `POST /batch/retry-send` | **manda o arquivo para o `KINDLE_EMAIL` da instalação** |

`GET /batch/jobs` é a mesma coisa que o `/history` deixou de ser em 30/08 —
"listava TODOS os processamentos registrados", diz o comentário lá. A correção
foi feita num arquivo e não no outro. Duas atenuações reais: o `response_model`
é `HistoryEntry`, e `_to_history` do `batch.py` (diferente do de `jobs.py`) não
escreve `endereco`, então o `token_publico` **não** sai na resposta — sem ele
não há acesso aos arquivos. E a listagem não traz caminho de disco. O que sai é
nome de arquivo original, título, autor, estado e datas de todo mundo.

`POST /batch/retry-send` é a **terceira porta** do achado 1, e a única que
continua aberta: `send_epub_to_kindle(epub, cfg)` — repare que `cfg` está na
posição do `title`, e o `destino` fica em `None` — manda para o `KINDLE_EMAIL`
sempre, para qualquer trabalho, inclusive os sem dono. A diferença para o achado
1 é que aqui é preciso ter conta; a semelhança é o destino.

**Não foi corrigido, e a razão é de combinado, não de dificuldade.** O conserto
desta rodada foi acordado nos arquivos `jobs.py`, `acesso_service.py`,
`vazao.py` e `Caddyfile`. O `batch.py` está fora, e sair do combinado sem avisar
é o que faz duas frentes colidirem. Fica como a próxima da fila, e ela é curta:
`exigir_conta` já devolve a pessoa, então falta pôr `dono_id` no filtro das seis
consultas e passar o destino no `retry-send`.

### 10 — O comportamento que só existe em produção não é testado por construção · MÉDIO · ABERTO

Este não é um defeito: é a **categoria** de que os achados 1 e 3 são membros, e
ela foi encontrada olhando por que a suíte de 801 testes passava por cima dos
dois. Está aqui porque uma família se conserta uma vez, e um membro se conserta
por vez.

A forma é sempre a mesma: um `if` sobre variável de ambiente que a bancada nunca
define, e por isso um dos dois lados do `if` nunca roda em teste nenhum. A
bancada diz que está tudo certo, e está — para o lado que ela executa.

Antes de 03/09, **nenhum teste do repositório mencionava `MEKORA_DOMINIO`**. O
`grep` devolvia zero linhas em `backend/tests/`.

| Onde | Variável | O que muda, e o que nunca foi executado em teste |
|---|---|---|
| `vazao.py:107` `_de_onde` | `MEKORA_DOMINIO` | lê ou ignora o `X-Forwarded-For`. **Era o achado 3.** Hoje coberto, nos dois lados |
| `acesso.py:29` `EM_PRODUCAO` | `MEKORA_DOMINIO` | o cookie de sessão sai com `Secure` ou sem. **Lido no import**, então nem `monkeypatch.setenv` alcança — é o pior caso da lista |
| `acesso.py:109` `_base_publica` | `MEKORA_DOMINIO` | o endereço que vai DENTRO do e-mail. Errado aqui, ninguém entra, e a suíte não vê |
| `acesso_service.py:99` `_em_producao` | `MEKORA_DOMINIO` | sem SMTP, produção levanta `RuntimeError`; fora dela o link de entrada é IMPRESSO no log do servidor |
| `email_service.py:81` | `KINDLE_EMAIL` | o padrão de destino. Vazio na bancada, então "foi para o `.env`" e "não foi para lugar nenhum" tinham a mesma cara. **Era metade do achado 1** |
| `acesso_service.py:107-109`, `email_service.py:84-92` | `SMTP_*` | com credenciais, conectar/autenticar/enviar. Tudo mockado na suíte, sempre |
| `main.py:71` | `ALLOWED_ORIGINS` | a lista de origens do CORS, e o portão contra `*` |
| `config.py:23`, `database.py:21` | `MEKORA_STORAGE`, `DATABASE_URL` | onde os documentos e o banco ficam. Já custou uma colisão em 30/08, e está anotada no `config.py` |
| `Dockerfile:79` | `--workers 1` | não é variável, é a mesma família: as janelas de vazão em memória só são corretas com um processo, e nenhum teste consegue ver isso |

Uma linha da tabela **está coberta**, e vale dizer qual: `porta.py:145`
`DONO_EMAIL`. O `conftest` nomeia a conta de teste como dona, e
`test_acesso.py::test_sem_dono_configurado_ninguem_entra` roda o outro lado. É a
prova de que a categoria é tratável — não é que produção não dê para testar, é
que ninguém tinha listado o que precisava ser.

Direção: esta tabela vira um teste que percorre os dois lados de cada `if`, e o
`EM_PRODUCAO` de `acesso.py` deixa de ser calculado no import — enquanto for, o
lado de produção dele é inalcançável para qualquer teste, e isso é uma decisão
de desenho, não uma falta de esforço.

---

## O que esta leitura não cobriu

Escrito porque um relatório que não diz onde parou é lido como se tivesse ido
até o fim.

- **A metade do Caddy do achado 3 continua sem prova**, por falta de `caddy` e de
  `docker` nesta máquina. A decisão do Erik em 03/09 foi não instalar: a correção
  é a mesma nas duas hipóteses — borda autoritativa e app lendo o valor que o
  próprio proxy escreveu —, um Caddy local não é a borda real, e a prova
  definitiva já está definida: a rodada B tem de responder 429 no 11º contra a
  borda que existir.
- **Os achados 1 e 2 nunca foram rodados como ataque**, só como teste da
  correção. A cadeia dos dois se lê inteira no código; o que existe hoje é a
  prova de que ela está fechada, e não o registro de tê-la percorrido aberta.
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

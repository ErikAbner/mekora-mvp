# Aberto — o que ainda não foi decidido

**Estado:** vigente
**Última revisão:** 2026-08-21

> **Esta é a fila, não um registro.** Um item sai daqui quando vira decisão, e a linha some.
>
> Se este arquivo começar a ter estado próprio — "aceito", "rejeitado" —, virou uma segunda
> `decisions/` e deve ser cortado. A coluna *"o que destrava"* diz por que o item **ainda está na
> fila**; não é estado dele.
>
> **Os números são estáveis.** Quando uma linha sai, a numeração não se reorganiza — `PRODUTO.md`,
> `SISTEMA.md`, `DESIGN-SYSTEM.md` e as DECs apontam para eles.

## Por que classificar por momento, e não responder

Documentação melhor organizada não pode virar paralisia de especificação. **Nem toda pergunta aberta
bloqueia trabalho**, e tratá-las como se bloqueassem produz o efeito oposto do pretendido.

```
A   antes da arquitetura        decide forma de sistema; segurar é mais barato que refazer
B   antes da feature afetada    não impede outras frentes; impede aquela
C   antes do lançamento         decide-se durante a construção, não pode faltar na V1
D   backlog técnico             decide-se durante a implementação, por quem implementa
```

| | quantas |
|---|---:|
| **A** — antes da arquitetura | 6 |
| **B** — antes da feature afetada | 22 |
| **C** — antes do lançamento | 18 |
| **D** — backlog técnico | 14 |
| | **60** |

### Saíram da fila em 2026-08-21

`A1` → `DEC-0031` · `A3` → `DEC-0032` · `A6` e `B19` → `DEC-0033`

### Saíram da fila em 2026-08-31

`A7` → **`DEC-0037`** nomeou a base do desenho, e a interface foi construída nela: React servido por
Vite, oito telas medidas pelo portão. A pergunta era *sobre qual base*, e ela tem resposta com
código rodando.

`B22` → **implementado.** A posição no Canvas deixou de viver em memória.

`C5` → **`DEC-0039`.** A `AUTH-001` era o documento que proibia desenhar tela de acesso, e por isso
ela mesma travava. Virou decisão: entrar por link no e-mail.

**Três linhas saíram, e o registro delas fica aqui e não some** — a numeração é estável porque as
DECs apontam para ela.

---

## A — antes da arquitetura

Decidem forma de sistema. Errar aqui custa refação, não ajuste.

| | pergunta | o que destrava | origem |
|---|---|---|---|
| **A2** | **Como a tradução própria é construída.** A regra é o limite; a arquitetura que a cumpre pode ter custo relevante | auditar o pipeline NLLB no Mac — `mac-mini-erik:/Users/sipnm/dev/kindle-local-tool`, revisão `12d7062`. **Precedente não é conformidade** | DEC-0022 |
| **A4** | **O formato do identificador de conteúdo.** UUID foi exemplo, não especificação | auditar o schema no Mac — Drizzle com `livros`, `notas`, `tags`, `livro_tags`, commit `e0a5204` | DEC-0021 |
| **A5** | **Como relacionar duas importações do mesmo título.** A norma proíbe colisão; não define agrupamento, metadado de edição nem deduplicação | mesma auditoria de A4 | DEC-0021 |
| **A8** | **O escopo por domínio do `baseline_revisions`.** Todo run carimba todos os repositórios — `bin/project-os.mjs:804`, sem filtro | **nada.** É do Project OS, não do produto: instrumento decide e implementa | DEC-0026 |
| **A9** | **Como o Kindle por cabo funciona num produto web.** *"Pelo cabo o Mekora leva e traz"* é a afirmação mais frágil da interface | **verificação de bancada**, não decisão. Um Kindle e um Chrome, numa tarde | DEC-0022 |
| **A10** | **Onde fica a fronteira entre metadado e conteúdo.** Título, autor e formato não são o texto do livro — mas uma lista de títulos é um perfil. A `DEC-0032` protege conteúdo e não trata metadado | decisão | DEC-0032 |

### A9 mudou de enunciado, e a versão nova é mais barata

O próprio produto já escreveu o fato técnico: *"Ele aparece como um disco no computador."* O Kindle
monta como volume, e o que o Mekora precisa é **ler e escrever arquivo num volume montado** — não
protocolo USB cru. A pergunta deixa de ser *"o navegador fala USB?"* e passa a ser **"o navegador
alcança um diretório que a pessoa escolheu?"**

**Se a resposta for a que se suspeita**, o cabo passa a valer só em Chrome e Edge, no desktop — e
seria a **primeira capacidade do Mekora com recorte de navegador**. Por isso é bancada antes de DEC.

---

## B — antes da feature afetada

Não impedem outras frentes. Impedem aquela.

| | pergunta | trava o quê | origem |
|---|---|---|---|
| **B1** | O formato concreto do conteúdo visual da família Quadrinho/Mangá | leitura de quadrinho | DEC-0021 |
| **B2** | Quais formatos de entrada são aceitos | ingestão | DEC-0021 |
| **B3** | Os limiares de cada verificação do contrato de conversão | pipeline de conversão | DEC-0021 |
| **B4** | Quais avisos são possíveis em "concluído com avisos", e como aparecem | conversão + tela de preparo | DEC-0021 |
| **B5** | Se "falhou" oferece retry automático, manual ou nenhum, e quantas vezes | conversão | DEC-0021 |
| **B6** | O que acontece com uma nota órfã depois da exclusão da origem — **é a mesma pergunta que B16**, vista do outro lado | Notas + exclusão | DEC-0021 |
| **B7** | O que acontece com o trabalho feito antes de a conta existir | primeiro uso + conta | DEC-0022 |
| **B8** | Como Relacionadas, Trilhas e Assuntos se apresentam | Conexões no telefone | DEC-0023 |
| **B9** | **Se o Mapa continua existindo.** A decisão de 20/08 o pôs como "vista opcional, talvez nunca" — e a ordem já foi executada: Conexões abre por trilha, depois território, e o mapa é o terceiro. **Reordenar cumpriu a decisão; aposentar é outra** | Conexões | DEC-0023 |
| **B10** | Como a escolha de modo de leitura é lembrada — conta, aparelho ou livro | Reader | DEC-0023 |
| **B11** | O tablet, feature a feature | tudo no tablet | DEC-0023 |
| **B12** | Quais breakpoints existem além de 390px, e o que "tablet" significa em números — a regra `@container` de 18/08 sugere que parte do problema não se resolve por breakpoint | design system | DEC-0023 |
| **B13** | Como os cinco lugares se apresentam no telefone | navegação mobile | DEC-0024 |
| **B14** | Se Mesa é um lugar como os outros, ou a casa que a marca abre — a DEC-0019 a trata das duas formas na mesma frase, e a ambiguidade pode ser deliberada | navegação | DEC-0024 |
| **B15** | Que vistas Notas tem, e como se chama a partição hoje rotulada "Soltas" | Notas | DEC-0024 |
| **B16** | Como a visão filtrada do livro se comporta quando a origem foi excluída | Notas dentro do livro | DEC-0024 |
| **B17** | O destino do `mekora-canvas-motion` daqui em diante. Ele contém o Canvas de cinco tipos, a implementação mais avançada das cinco | frente de implementação | DEC-0025 · DEC-0030 |
| **B18** | O destino do `mekora-experience` — o conflito DEC-0011 §4 × DEC-0017 | reconciliação | DEC-0025 |
| **B20** | Que eventos são coletados, com que granularidade | instrumentação | DEC-0029 |
| **B21** | **Auto-ocultar as barras no celular** depois de segundos sem interação. Precisa de regra para nunca ocultar com campo em foco | Reader no telefone | DEC-0023 |
| **B23** | **Se o agrupamento entra no contrato do Canvas como capacidade.** Grupo não é só interação: é entidade, e o `canvas-motion` já o tratava como um dos cinco tipos | Canvas | DEC-0030 |
| **B24** | **Que soluções dos ancestrais são efetivamente absorvidas, e quando.** Duas comprovadas estão ausentes do produto atual: agrupamento com moldura tracejada e rótulo, e zoom com "ajustar à tela" | Canvas | DEC-0030 |

> **As duas lacunas do contrato do Canvas foram fechadas em 31/08.** *Remover da superfície sem
> apagar a entidade* nunca foi pergunta — era implementação que a `DEC-0030 §5` já exigia. E a
> *persistência da posição*, que era o `B22`, deixou de viver em memória: `canvas_nos` guarda `x` e
> `y` por pessoa e nota, gravados ao soltar o arrasto.

---

## C — antes do lançamento

Podem ser decididas durante a construção. Não podem ficar sem resposta na V1.

| | pergunta | origem |
|---|---|---|
| **C1** | Que criptografia é usada, e se o produto tem acesso ao conteúdo em claro durante o processamento | DEC-0022 |
| **C2** | O que é "processo mínimo necessário", e como o acesso humano interno é auditado e por quem | DEC-0022 |
| **C3** | Por quanto tempo o original temporário sobrevive entre a falha e o descarte | DEC-0021 · DEC-0022 |
| **C4** | **Prazo exato de retenção de sessões anônimas.** Sem conta os dados são temporários, e o prazo foi deliberadamente não fixado | DEC-0018 |
| **C6** | Se há consentimento para a coleta de uso, e como é pedido | DEC-0029 |
| **C7** | Por quanto tempo os eventos coletados são mantidos | DEC-0029 |
| **C8** | Qual ferramenta de instrumentação é usada, e se é própria | DEC-0029 |
| **C9** | ~~Quando as telas passam a ser efetivamente verificadas a 390px~~ — **medidas em 01/09.** Doze das treze cabem; a Leitura continua sem medida, e a razão está abaixo | DEC-0023 |
| **C10** | A migração do acervo e das notas existentes para identidade estável | DEC-0021 |
| **C11** | Que estado cada uma das 19 DECs anteriores recebe além da normalização mecânica | DEC-0027 |
| **C12** | O `role` literal de cada repositório existente | DEC-0026 |
| **C13** | Quando a máquina Windows é efetivamente zerada | DEC-0028 |
| **C14** | O destino do `artefato-mekora.html`, 2,87 MB versionados por ausência de regra | DEC-0028 |
| **C15** | Quando a V1 é lançada | DEC-0029 |
| **C16** | **O limiar de "talvez" em Conexões.** Uma palavra em comum pode ser generoso demais num acervo grande; calibrar com onze notas seria no escuro | DEC-0024 |
| **C17** | **Se o Mekora terá usuários fora do Brasil, e o que isso exige.** Jurisdição-base não é restrição de público: atender pessoa de outro país pode trazer obrigação adicional | DEC-0031 |
| **C18** | **Em que país ficam os servidores da VPS.** A hospedagem foi escolhida em 30/08 — VPS da Hostinger com Cloudflare —, e isso responde *qual serviço*, não *onde*. A Hostinger tem data centers em vários países, e a escolha da região é feita na contratação | DEC-0031 |
| **C19** | **O catálogo de componentes.** O `DESIGN-SYSTEM.md` cobre fundamentos e composição; não existe catálogo com estados, variantes e anatomia. Sete componentes foram construídos até 31/08 — Botao, Campo, Escolha, Folha, Icone, Cabecalho, TrilhaConta — e nenhum tem página que mostre seus estados | DEC-0033 |

### C9 · o que a medida a 390px encontrou

**Nove telas transbordavam, e a causa era uma.** O `Cabecalho` não tinha media
query nenhuma: quatro lugares de 130px mais a busca de 476px somam bem além de
390, e a página ganhava **524px de rolagem horizontal**. Como o componente está
em toda tela de dentro, o defeito era um e aparecia nove vezes. Uma décima, a
Estante, transbordava mais 78px pelos quatro recortes.

**O instrumento estava mentindo, e foi preciso consertá-lo antes.** O
`portao-logado.sh` documenta uma flag `--tela` que diz *"navega de novo depois de
a sessão existir"* — e ela **nunca foi implementada** no `medir.mjs`. O script
media o destino do redirecionamento de `/entrar/<token>`, que é a Estante, fosse
qual fosse a tela pedida no argumento.

A primeira tentativa de contornar por `history.pushState` de dentro do setup deu
**oito telas devolvendo "cabe"** enquanto a Mesa, com o mesmo cabeçalho,
transbordava 524px. O React Router não reagia, e as oito mediram `/entrar` — 12
nós, sem cabeçalho. Verde por omissão de novo, e desta vez só apareceu porque o
resultado era bom demais para ser verdade.

O `--depois=<url>` agora existe, navega de verdade, e **confere onde parou**:
pedir `/estante` e terminar em `/entrar` vira erro, não medida.

**A Leitura continua sem medida, a 390 e a 1440.** Ela mostra *"O livro não pôde
ser aberto: este livro ainda não tem texto"*, porque o `upload` não dispara
conversão — o arquivo fica em `uploaded`, e converter exige a jornada do Preparo
inteira. Medir a Leitura de verdade depende de semear um livro **já convertido**,
e isso é trabalho de instrumento, não desta rodada.

**Isto não responde o B13.** Como os lugares se apresentam no telefone continua
pergunta aberta: o lugar passou a empilhar ícone sobre rótulo porque ícone
sozinho obriga a adivinhar e 12px sairia da escala — é o mínimo para caber, não
uma decisão de navegação móvel.

---

## D — backlog técnico

Podem ser decididas durante a implementação, por quem implementa.

| | pergunta | origem |
|---|---|---|
| **D1** | A ordem dos cinco lugares — aberta de propósito, e a V1 observável a responde com dado | DEC-0024 |
| **D2** | Que tipos de conteúdo têm padrão diferente de paginado | DEC-0023 |
| **D3** | Quem pode mudar o estado de uma DEC, e se exige run aberto ou revisor independente | DEC-0027 |
| **D4** | O que acontece com uma DEC que não declara estado — hoje não há nenhuma | DEC-0027 |
| **D5** | Se `conflicts_with` é declarado à mão ou detectado | DEC-0027 |
| **D6** | Se `supporting_artifacts` deveria aparecer no briefing | DEC-0026 |
| **D7** | Quando o campo `canonical` é efetivamente removido dos manifestos | DEC-0026 |
| **D8** | Que critério classifica cada item na reconciliação | DEC-0028 |
| **D9** | Se `archive/` tem estrutura interna, e qual | DEC-0028 |
| **D10** | O destino das ~60 MB de transcrições de sessão | DEC-0028 |
| **D11** | Que número, em qualquer medida, conta como sucesso — depende de linha de base que ainda não existe | DEC-0029 |
| **D12** | O que entra no escopo da V1 — matéria da DEC-0018, não da DEC-0029 | DEC-0029 |
| **D13** | **O Sumário continua sendo folha**, e folha cobre o texto. Próximo candidato à tese da fita | DEC-0023 |
| **D14** | **Canvas em toque, e regra de escala acima de ~50 itens.** Desktop-only no V1, então não bloqueia | DEC-0023 |

---

## O que não está nesta fila, e por quê

**Divergências entre norma e implementação não são perguntas.** Elas estão em
`propostas/DRIFT-revisao.md`, e a diferença importa: uma pergunta espera decisão; uma divergência
espera trabalho.

| | |
|---|---|
| **`I1`** — identidade estável de conteúdo | norma vigente sem modelo que a cumpra. **Bloqueada por A4 e A5** |
| **`I2`** — a Estante particiona por formato de origem | modelo mental antigo na interface. **Depende de B2** e do modelo de conteúdo |
| **`P1`** — Original / Adaptado / Comparar | perdeu a base normativa com a DEC-0021. **Remove-se** |
| **`P2`** — as cinco variantes de Mesa sem marca | só falta a marca, e o precedente já existe na Estante 3D |

---

## Três exemplos de por que a classificação importa

**O algoritmo do identificador** (A4) não impede construir a Estante, desde que o contrato já diga
"identidade estável, independente do título". Continua sendo `A` porque a escolha atravessa
persistência, notas, deduplicação e migração.

**Como a preferência paginação/rolagem é persistida** (B10) não bloqueia arquitetura nenhuma.
Bloqueia o Reader, e só ele.

**A fronteira entre metadado e conteúdo** (A10) é `A` e não `C` pelo mesmo motivo que a A3 era: ela
decide o que pode sair do sistema, e "pode sair" é forma de sistema. A A3 foi respondida estendendo o
princípio; a A10 é a metade que o princípio não alcança.

## Uma que se responde sozinha

**D1, a ordem dos cinco lugares**, é o melhor caso do que a DEC-0029 destrava. Ela não precisa de
opinião: com a V1 observável, transições como `Estante → Notas`, `Reader → Notas` e
`Conexões → Canvas` viram medida. A ordem deixa de ser preferência de quem desenha e passa a ter
evidência — e é por isso que ficou deliberadamente aberta.

---

## Levantado na noite de 01/09, na auditoria contra o Figma

**A-11 · A vista 3D pode estar na orientação errada.** Implementei os livros **em
pé, lado a lado**, com a lombada de frente. O nó `895:7506` (`D · Livro — ficha`)
mostra os livros **deitados e empilhados**, vistos de lado, com um índice de
títulos à esquerda. As duas leituras cabem no nome do nó, e refazer com base na
leitura incerta custaria mais que perguntar. **Decisão do Erik.**

**A-12 · O degrau de 56px não existe na escala.** O desenho mobile pede `56px`
para o título de abertura da leitura, e a escala é
`[14,16,18,20,22,24,28,32,40,48,64]`. Ficou 48, o degrau mais perto. Acrescentar
56 mexe no sistema inteiro por causa de uma tela. **Decisão do Erik.**

**A-13 · 34 caracteres por linha na leitura mobile.** Seguindo o desenho — corpo
de 20px numa coluna de 358 —, a Zodiak dá cerca de 34 caracteres por linha,
abaixo da faixa confortável de 45 a 75. É a medida de livro de bolso, e funciona;
mas é escolha, não consequência.

**A-14 · O rodapé do Figma é placeholder.** `"Link link link"` quatro vezes, em
`#d5d5d5` e 28px — nenhum dos três existe no sistema. A implementação usa o
`Rodape` real do produto. O conteúdo das colunas continua sem definição no
desenho.

**A-15 · Três seções repetidas na Apresentação.** A seção "PDF não é um livro"
aparece duas vezes (`895:7172` e `941:22531`, idênticas), e a legenda das capas
três vezes (`895:7195`, `895:7285`, `895:7306`). Implementei uma de cada.

**A-16 · Erros de digitação no desenho, corrigidos na implementação:**
"photografia" → fotografia; "letra , há" → "letra, há"; "capitulos" → capítulos;
"todos sem sumário você vai marcar" sem ponto.

**A-17 · Duas cores fora do sistema no desenho:** `#666668` (nó `895:7232`) e
`#727274` (chip `.cbr`, nó `895:7275`). Os vizinhos usam `text/secondary`
`#6A6A6A`. Implementado com o token.

**A-18 · O Canvas não tem grupos.** O nó `895:6938` mostra os cartões dentro de
uma área tracejada com título — *"Design & Tecnologia"*. Isso é um agrupamento
espacial, e exige modelo novo: um grupo com nome e retângulo. A superfície
infinita entrou; o agrupamento não.

**A-19 · O Canvas não mostra prévia de link.** O desenho traz cartões com
miniatura de página externa (*DesignTakes*, um preview de artigo). Buscar uma
prévia é ir a um endereço de fora, e a Privacidade diz hoje que *"não há
rastreamento, análise de uso nem terceiros"* — a prévia contradiz isso, ou exige
que a frase mude. **Decisão do Erik.**

**A-20 · Dezesseis telas M ainda não foram abertas uma a uma.** Conferi Leitura,
Ajuda, Apresentação, Estante e Mesa. Faltam: `M · Estante — busca`, `M · Conta`
(quatro), `M · Estudos` (duas), `M · Estudo — página`, `M · Conexões`,
`M · Preparo` (duas), `M · Livro — o que ficou`, `M · Atualizações`. Elas passam
no portão e no transbordo a 390 — mas passar na medida não é ter sido comparada,
e a Apresentação provou isso.

**A-21 · "Baixar" promete o original, e o produto não pode entregá-lo.** O nó
`941:23118` diz *"O EPUB preparado, ou o PDF original do jeito que chegou"*. O
segundo não existe: `files.py` fecha `/storage/{rest}` com 404 de propósito, e
`input/` está do lado de dentro dessa porta — servir o arquivo enviado é abrir
uma rota nova para o que a pessoa mandou, e isso é decisão de segurança, não
detalhe de tela. A linha implementada oferece o EPUB e diz isso. **Decisão do
Erik:** servir o original também, ou reescrever a frase do desenho.

**A-22 · O símbolo "Criar conta" não tem botão que crie conta.** No nó
`941:23106` os dois botões são *"Agora não"* e *"Preparar arquivos"* — os dois
levam para longe da conta, numa folha cujo título é *"Criar conta no Mekora"* e
cujo corpo lista três razões para ter uma. Implementei o primário como
**"Criar conta" → `/entrar`**, que é onde a conta nasce, e mantive o secundário
do desenho. **Decisão do Erik:** o rótulo do primário.

**A-23 · Os vãos de ícone do `941:23118` estão vazios no Figma.** Cada uma das
cinco linhas tem um quadrado de 40px com borda e nada dentro. Ficaram vazios na
implementação — desenhar cinco ícones à mão produziria ícones que não passaram
pelo efeito handmade e não seriam do sistema. Faltam: renomear, páginas, baixar,
refazer, remover, no Solar 480.

**A-24 · "Conectar nota" é folha no desenho e seção na tela.** O nó `941:23108`
mostra *"Ligar esta nota a qual?"* como diálogo por cima, com busca, lista de
candidatas e "Cancelar". Na tela ela é uma seção da página da nota, com a mesma
busca e a mesma lista. O conteúdo é o mesmo; o recipiente não. **Decisão do
Erik:** vale a pena virar folha.

**A-25 · A busca não entra no texto dos livros.** *"Buscar em Mekora"*
(`941:23107`) procura título, autor, nome do arquivo, o texto das notas e o
assunto dos estudos — tudo que o banco sabe. O texto do livro está dentro do
EPUB, não no banco, e indexá-lo é trabalho de outra ordem. A tela diz isso
quando não acha nada.

**A-26 · Buscar no livro e Marcadores não têm painel desenhado.** Os dois ícones
estão no cromo da leitura desde o começo. Os quatro painéis que existem no Figma
— `941:23110` aparência, `941:23111` notas e destaques, `941:23112` índice,
`941:23120` seleção — foram construídos, e nenhum deles é um destes dois. Eles
ficam `disabled` com o motivo no título. **Decisão do Erik:** desenhar os dois,
ou tirá-los do cromo.

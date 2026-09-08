# Aberto — o que ainda não foi decidido

**Estado:** vigente
**Última revisão:** 2026-09-03

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
| **A** — antes da arquitetura | **0** |
| **B** — antes da feature afetada | 20 |
| **C** — antes do lançamento | **0** |
| **D** — backlog técnico | 5 |
| | **25** |

*Contagem refeita em 07/09, contra as linhas da própria tabela — e revista no mesmo dia quando o `C21` fechou. Ela dizia 44 —
A6, B22, C2, D14 — e a diferença não era arredondamento: **`C21` não estava
sendo contado.** Ele nasceu na auditoria de segurança do mesmo 03/09, depois de
o parágrafo abaixo ter sido escrito, e o parágrafo continuou dizendo "sobram
`C2` e `C10`". O item mais urgente da fila — marcado pelo Erik como **primeiro
da fila de segurança**, valendo mais que os P1 juntos — estava invisível na
contagem que a página abre.*

*Revista de novo no fim de 07/09, quando `A10`, `C2` e `C10` fecharam — as três
com decisão do Erik, e as três implementadas no mesmo dia. **A coluna `C` foi a
zero:** não sobra nenhuma pergunta que precise de resposta antes do lançamento.*

*Um cabeçalho que conta errado é pior que nenhum: ele é lido no lugar da tabela.*

*A contagem de C caiu de 12 para 2 em 03/09. `C9` e `C16` fecharam em 02/09; `C1`, `C3`, `C4` e `C8`
na manhã de 03/09, as quatro por leitura do código e não por decisão; `C6`, `C7`, `C17` e `C18` à
noite, por decisão do Erik; e `C19`, `C14`, `C12` e `C11` de madrugada. **Sobram `C2` e `C10`, e as
duas só são respondíveis com usuário de verdade na frente** — a primeira pergunta quem pode olhar
documento de gente e como isso fica registrado, que só se define quando existe um "quem" além do
Erik; a segunda pergunta como migrar acervo e notas para identidade estável, que não tem o que
migrar enquanto ninguém tiver acervo. A regra do topo diz que a numeração não se reorganiza — as
linhas continuam onde estavam, riscadas, porque outros documentos apontam para elas.*

### Saíram da fila em 2026-08-21

`A1` → `DEC-0031` · `A3` → `DEC-0032` · `A6` e `B19` → `DEC-0033`

### Saíram da fila em 2026-09-03 (madrugada) — as três de registro

`C14` — o `artefato-mekora.html` saiu do versionamento. Ele é **gerado** do `prototipo-mesa.html`, e
o gerador o reproduz byte a byte: mesmo `sha256`, conferido antes de tirar. Versioná-lo gravava 2,87
MB de HTML com trinta imagens embutidas a cada mudança, e HTML não faz delta — 29 objetos inteiros
num pacote de 29,4 MB. O histórico não foi reescrito: os objetos continuam alcançáveis pelos commits
antigos, que é o que a DEC-0028 pede.

`C12` — os dezoito repositórios foram normalizados contra o vocabulário da DEC-0026, e a abertura que
ela prevê foi usada duas vezes, cada uma por um caso que nenhum dos cinco descrevia: `product` (o
repositório que É o produto inteiro — Mekora depois da fusão, Panela, Plantas) e `native-client`
(Siphon e o widget do Plantas, que não são web-frontend). O texto livre migrou para
`role_description`, e o `os context` imprime os dois.

`C11` — as trinta e nove DECs continuam `accepted`, e isso não é omissão: a DEC-0027 §4 diz que
emenda parcial não é estado. O que faltava era mecânico e relacional. **E o conflito que ela deixou
explicitamente em aberto foi resolvido:** a emendada é a DEC-0017 — as duas explorações deixaram de
ser *fontes* quando o produto virou um repositório só, e hoje o registro carrega
`historical-reference` nas duas, que é literalmente o que o ponto 4 da DEC-0011 dizia. O que
permanece da DEC-0017 é o que ela existia para dizer: nenhuma foi descartada.

### Saíram da fila em 2026-09-03 (noite)

`C19` — o catálogo existe, em `/sistema`, e **só em desenvolvimento**. Ele mostra as tintas, a escala
de corpos e cada componente com os estados dele lado a lado: os três tons de botão com e sem
desligado, o campo com ajuda e com erro, a escolha de duas e de três opções, os vinte e dois ícones.

A razão de não ser produto: uma tela que o Figma não tem seria escopo acrescentado por mim.

**Ele usa os componentes de verdade, não cópias** — uma cópia envelhece, e o catálogo passaria a
mostrar um botão que o produto já não tem, que é o defeito que ele existe para evitar.

**E os dois guardas o corrigiram, um de cada vez.** O portão recusou os ícones rotulados pelo nome do
arquivo (`preferencias`, sem acento — é assim que identificador interno vaza para a tela), e estava
certo duas vezes, porque o nome do arquivo também não diz o que o desenho significa. O
`scripts/botoes.mjs` recusou os botões do catálogo, que clicavam e não faziam nada: o gesto que um
espécime tem de verdade é entregar a si mesmo, e clicar copia o JSX daquele estado.

`C7` — 90 dias para os eventos de uso, aceito pelo Erik.

`C13` — a máquina Windows foi **aposentada no registro**, e é isso que "zerar" quer dizer aqui: a
DEC-0028 permite zerar e proíbe remover do histórico. Ela ganhou `status: retired`, data, razão e
sucessor, e a entrada continua lá — os 100 runs dela apontam para uma máquina que o registro
conhece. Formatar o computador físico é outra coisa, e é do Erik.

`C15` — **quando estiver pronta.** Nas palavras dele, *"vai ser um mistério até que tudo esteja
devidamente implementado"*. Não é adiamento: uma data marcada faz o resto ser cortado para caber
nela, e o escopo aqui é o Figma inteiro.

### Saíram da fila em 2026-09-03 (tarde)

`C6`, `C17` e `C18` — decisões do Erik, tomadas de uma vez: não se pede consentimento e se diz o que
é medido; só Brasil na V1; servidores no Brasil.

**E `C4` ganhou uma resposta melhor que a que eu tinha escrito.** Perguntado sobre o prazo, o Erik
mudou o enunciado: **quem tem conta guarda os arquivos enquanto o serviço funcionar** — é o que a
conta passa a valer, e é onde a monetização encosta —, e **quem não entrou tem 90 a 120 dias**.
Ficou 90, o número de baixo, porque a assimetria manda: subir para 120 depois não custa nada, e
descer de 120 para 90 apaga arquivo de quem contava com ele.

`C7` continua aberta e é a única de dado que sobra: por quanto tempo os EVENTOS de uso são
mantidos. A pergunta foi feita e a resposta veio sobre os arquivos, que era a decisão maior. Hoje
eles não são apagados nunca, por ausência de regra.

### Saíram da fila em 2026-09-03

`C1`, `C3`, `C4` e `C8` **não eram perguntas: eram fatos que ninguém tinha ido ler no código.** Uma
pergunta aberta que já tem resposta escrita em Python custa o mesmo que uma que não tem — ela ocupa
a mesma linha da fila e faz a lista parecer maior do que é.

**E `C3` levou a um achado.** Ir conferir por quanto tempo o original sobrevive mostrou que ele
sobrevive PARA SEMPRE no caso comum: a limpeza filtrava `status in ("done", "error")`, e a conversão
bem-sucedida grava `"converted"` — "done" é valor do outro campo, o `conversion_status`. E se ela
rodasse, apagaria a pasta de saída inteira, ou seja o EPUB da estante. Um defeito escondia o outro.
Corrigido, com quatro provas.

### Saíram da fila em 2026-09-02

`C9` → **medida.** A Leitura era a única tela sem medida a 390, e a razão era circular: medi-la
exigia um livro já convertido, e o ajudante de sessão da auditoria não entregava um. Desde que ele
passou a entregar, ela é medida em toda rodada e passa.

`C16` → **respondida pelo desenho, e não por calibragem.** O risco registrado dizia que calibrar um
limiar com onze notas seria no escuro. O `895:8545` não pede um limiar: pede três faixas nomeadas —
"Parecem próximas", "Talvez", "Talvez um estudo" —, e errar a fronteira entre duas custa um rótulo,
não uma sugestão escondida. As três existem, e cada uma mostra o próprio corte.

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
| **A2** | ✅ **FECHADA em 08/09 — `docs/TRADUCAO.md`.** ~~Como a tradução própria é construída~~ — deixou de esperar a auditoria de um repositório que **não existe mais nesta máquina** (`/Users/sipnm/Projeto-kindle/` tem um `.DS_Store`) e virou a conclusão de `A4`+`A5` sobre o código que existe. A seam é `TranslatorEngine`, e ela **já era**: dois métodos, sem estado compartilhado, instância entregue pronta aos dois pipelines. Nenhuma camada nova — o que faltava era um lugar só onde a instância é escolhida, e a fábrica morava na camada de API. `MEKORA_MOTOR_DE_TESTE` entra por ali com sucesso, erro, timeout, resposta inválida e cancelamento determinísticos | DEC-0022 |
| **A4** | ✅ **FECHADA em 08/09.** ~~Auditoria do engine e do model service~~ — cinco defeitos medidos e corrigidos: o cache do modelo sem trava (duas traduções simultâneas carregavam 2,4 GB **duas vezes**), sem teto e com o dispositivo fora da chave (`device="mps"` reusava o pipeline de `cpu`); `is_nllb_model_ready` dizia "pronto" para um diretório com **zero arquivos de peso** — 22 MB onde deveriam estar 2,4 GB; `is_pair_available` respondia coisas diferentes nas duas implementações da mesma interface; e o truncamento silencioso, que fazia um parágrafo de 5.840 caracteres voltar com **37% do texto**. Ver `docs/TRADUCAO.md` | DEC-0021 |
| **A5** | ✅ **FECHADA em 08/09.** ~~Auditoria do fluxo de quadrinho~~ — cinco defeitos: `limits.max_pages` conferido **depois** da extração inteira (medido: 49 MB na memória antes de o erro sair); erro de motor detectado por **nome de classe em string**, justificado por um import circular que **não existe**; os dois artefatos escritos em sequência, deixando JSON sem HTML numa queda; cancelamento que só chegava **entre** páginas, com dezenas de balões por página; e a imagem do OCR nunca fechada. A diferença entre traduzir texto e traduzir balão foi conferida e é legítima — está escrita. Ver `docs/TRADUCAO.md` | DEC-0021 |
| **A8** | ✅ **FECHADO em 08/09.** ~~O escopo por domínio do `baseline_revisions`~~ — a pergunta era se carimbar todos os repositórios era escopo demais, e medindo os 236 runs a resposta foi outra: o campo copiava `repo.revision` do MANIFESTO, escrito à mão. O manifesto dizia `produto: 80c5413`; o repositório estava em `9b4ff7e`, **575 commits depois**, e os 236 runs gravaram a mesma string. A hipótese óbvia caiu junto: os `historical-reference` tiveram TRÊS revisões e o `produto`, UMA — o campo media com que frequência alguém editava o JSON. Agora a revisão vem do git, e o escopo se resolve por presença: carimba-se o que esta máquina alcança | DEC-0026 |
| **A9** | ✅ **FECHADA em 08/09 — a premissa era falsa, e a medida mostrou.** ~~Como o Kindle por cabo funciona num produto web~~ — a frase *"pelo cabo o Mekora leva e traz"* **existe só neste arquivo**: `grep` em `web/`, `backend/` e `contrato/` não a acha, e **não há uma linha de File System Access API** no produto (`showDirectoryPicker` e companhia: zero). O Mekora nunca prometeu acessar o cabo. O que ele faz, testado nesta rodada pela interface: **"leva"** é envio por **e-mail** ao endereço do aparelho — com SMTP fora devolve 503, mensagem clara, `status` de volta a `converted` e o arquivo em envios pendentes, sem sucesso falso; **"traz"** é o upload do `My Clippings.txt`, e a copy diz apenas **onde o arquivo fica** ("na raiz do aparelho quando você o liga no computador por cabo"), o que é verdade. O ensaio de importação passou de ponta a ponta: 22 → 25 notas, com o parser acertando registro em português, registro em **inglês** e título com dois parênteses; repetir devolve "0 notas novas · 3 já estavam aqui" sem duplicar; arquivo incompatível dá erro útil, não grava nada e deixa tentar de novo. **O aparelho não foi necessário** — o que precisaria dele era testar um fluxo por cabo que não existe. Registrado: o Kindle não estava acessível nesta máquina em nenhuma das quatro verificações (`ioreg` via os três dispositivos USB presentes — dois hubs e um microfone — e nenhum Kindle) | DEC-0022 |
| **A10** | ✅ **FECHADA em 07/09 — `DEC-0040`.** ~~Onde fica a fronteira entre metadado e conteúdo~~ — três categorias: conteúdo (proteção da `DEC-0032`), metadado sensível de biblioteca (não vai para profiling, publicidade nem analytics sem necessidade explícita; sem log indiscriminado; acesso interno limitado) e metadado operacional. A regra central: metadado não é automaticamente conteúdo, mas metadado capaz de revelar o acervo ou o comportamento de leitura é dado sensível do produto. **E não era pergunta teórica:** o autocapture do `posthog-js` nasce com `maskAllText: false`, o `medir.js` passava `autocapture: true`, e clicar num livro da estante enviava título e autor para fora. Fechado com máscara global no autocapture, contêineres de acervo marcados para a Clarity, e o `medir.teste.mjs` — que tinha passado verde estando cego — reescrito com `--autoteste` de seis venenos | decisão | DEC-0032 |

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
| **B8** | ~~Como Relacionadas, Trilhas e Assuntos se apresentam~~ — **a `DEC-0023` delegou o vocabulário ao desenho, e o desenho respondeu.** A `§6` nomeia "Relacionadas · Trilhas · Assuntos", e a lista de pendências da MESMA DEC diz que aquilo *"é ponto de partida para desenho, não especificação fechada"*. Datas: DEC em **20/08**, quadros com evidência em **01/09**. Não há conflito de autoridade nem emenda a fazer. A redação do item nomeava três seções; **os dois quadros de Conexões (`895:8545` e `966:30269`) não têm "Trilhas" nem "Assuntos" em lugar nenhum.** O que eles têm, com rótulo, é: **Estudos**, **Relacionadas** (a seção cuja ação é "Conectar outra nota"), e as três faixas de sugestão — **Parecem próximas**, **Talvez**, **Talvez um estudo** — mais **Tag**. Sete rótulos, os sete escritos no arquivo, nos dois tamanhos. **Trilha e território, onde existem no código, são MECANISMO** — como Conexões abre —, e mecanismo não vira seção titulada no telefone. **A forma:** hierarquia é profundidade, não abas; nenhum dos dois quadros tem aba ou `tablist`, e a tela a 390 já se comporta assim (medido: 0 abas, 390 de 390, seções empilhadas). **Constrói-se o que está no quadro** | Conexões | DEC-0023 |
| ~~**B8-b**~~ | ~~"Trilhas" e "Assuntos" não existem em quadro nenhum~~ — **dissolvida em 03/09, sem decisão.** As faixas TÊM rótulo nos dois quadros, então não havia o que escolher: usam-se os rótulos que estão lá, e os dois nomes da redação antiga somem com ela. A pergunta só existia porque o item descrevia errado o que faltava | — | DEC-0023 |
| **B8-c** | **"Ligadas" e "Relacionadas" — MEDIDO: é uma seção só com dois nomes, e os dois nomes querem dizer coisas diferentes.** A suspeita era que fossem dois conceitos; a medida diz que não. No quadro, "Relacionadas" é o cabeçalho da seção cuja ação é **"Conectar outra nota" → "Ligar esta nota a qual?"** (ordem dos nós conferida no `895:8545`). No produto, a mesma seção se chama **"Ligadas"**, e o que ela lista vem da tabela `Ligacao` — **ato explícito da pessoa** —, com o vazio dizendo *"quem diz é você, não o produto"*. **A escolha que sobra é de vocabulário, e é minha só se o Erik quiser:** o `CLAUDE.md` reserva "parecem relacionadas" para o palpite do sistema, e as três faixas de sugestão ficam logo abaixo desta seção. Chamar a seção do ato da pessoa de "Relacionadas" põe a palavra da sugestão sobre o que não é sugestão. **A contagem que o `CLAUDE.md` exige já existe nas faixas:** "N em comum: palavra, palavra", mais o corte declarado | Conexões | DEC-0023 |
| ~~**B9**~~ | ~~Se o Mapa continua existindo~~ — **aposentado em 03/09: não planejado.** O `CLAUDE.md` põe "grafo futurista" entre as coisas a evitar e exige que arranjo espacial só valha quando a posição significa alguma coisa. **O Canvas É essa superfície**, existe e funciona; um segundo espaço competiria com o que já ganhou o lugar. **Reabrir só com evidência de uso real que peça vista espacial que não seja o Canvas.** Conferido antes de aposentar: não há código nem UI de Mapa — a palavra só aparece no repositório com outros sentidos (o mapa do EPUB, o mapa mental do arranjo) | — | DEC-0023 |
| **B10** | Como a escolha de modo de leitura é lembrada — conta, aparelho ou livro | Reader | DEC-0023 |
| **B11** | O tablet, feature a feature | tudo no tablet | DEC-0023 |
| **B12** | Quais breakpoints existem além de 390px, e o que "tablet" significa em números — a regra `@container` de 18/08 sugere que parte do problema não se resolve por breakpoint | design system | DEC-0023 |
| **B13** | Como os cinco lugares se apresentam no telefone | navegação mobile | DEC-0024 |
| **B14** | Se Mesa é um lugar como os outros, ou a casa que a marca abre — a DEC-0019 a trata das duas formas na mesma frase, e a ambiguidade pode ser deliberada | navegação | DEC-0024 |
| **B8-d** | ✅ **CONSTRUÍDO em 03/09**, com o piso cumprido: marca explícita, saída DERIVADA (`revisar_desde` × `atualizada_em`) e vista própria — o recorte "Para revisar" em `/notas`. **"Revisar depois" — respondido em 03/09, e adiado para a frente de Notas.** As três perguntas: **(1)** não é o mesmo que `rascunho` — são sujeitos diferentes. Rascunho é afirmação sobre a NOTA (não está pronta), com consequência declarada; "revisar depois" é afirmação sobre a INTENÇÃO da pessoa (quero voltar aqui), sem consequência nenhuma. Nota pronta pode precisar de revisão, e unificar faria o "não vai para estudo" pegar carona numa intenção que não pediu isso. **(2)** não se constrói como marca à mão: sem nada que tire e sem lugar que mostre, a pessoa marca e nunca mais vê — pior que não oferecer, porque PARECE arquivado. **(3)** o menu é sobre a NOTA, e não sobre uma sugestão — medido pela ordem dos nós no `895:8545`: a linha vem logo depois da citação e da procedência da nota, entre elas e Tag/Estudos/Relacionadas, e traz "Abrir no livro" e "Apagar nota". **Vai para a frente de Notas, com piso mínimo escrito: abrir ou editar a nota LIMPA o estado, e existe vista que o mostre. Sem os dois, não entra.** **Forma decidida em 03/09:** marcar é explícito (é intenção, não se deduz), **limpar é DERIVADO** — `revisar_desde` comparado com `atualizada_em`, então a saída é um fato e nunca envelhece; desmarcar à mão continua possível. **E a `DEC-0023 §4` foi relida antes:** ela diz "estas CAPACIDADES existem no telefone", e a lista mistura lugares (Mesa, Estante) com capacidades (Busca, Marcadores, Para revisar). A exigência é estar disponível e operante a 390px — **um recorte dentro de Notas cumpre; não precisa ser lugar** | Notas | DEC-0024 |
| **B8-e** | **"Tag" — princípio conferido, e o quadro não pede etapa.** O `895:8663` mostra uma linha com o rótulo "Tag" e um chip; **nenhum estado vazio exigindo tag, nada bloqueado por falta dela, nenhuma tela que peça uma para prosseguir.** Não há conflito de oráculo: tag é oferta. **Mas ela não existe em lugar nenhum do produto** — sem modelo, sem tabela, sem rota, sem tela; o `SISTEMA.md` a lista como entidade da norma e nada foi construído. É frente própria (entidade + migração + API + tela), não cabe numa fatia de rótulos. **Quando for construída, a regra já está escrita aqui:** nada inalcançável por falta de tag, nenhuma etapa, ausência de tag não é pendência | Notas | DEC-0024 |
| **B8-f** | ✅ **CONSTRUÍDO em 03/09**, com desfazer imediato no aviso — sem ele o gesto seria silencioso e permanente. ~~Não há como dispensar uma sugestão na página da nota — e a norma diz que há.** O `SISTEMA.md` declara "dispensada" como forma vigente: *"a pessoa recusou a sugestão, e ela não volta — uma sugestão que volta na próxima visita deixa de ser sugestão e vira insistência"*. Em `/nota/:id` não existe: as candidatas de "Parecem próximas" e "Talvez" voltam para sempre, e a única saída é ligar. **O produto sabe dispensar em outro lugar** — `ignorarGrupo` / `grupos_ignorados`, nos Estudos —, então a mecânica existe e o nível da nota ficou de fora. **Nenhum dos dois quadros de Conexões tem afordância de dispensa** (procurado: dispensar, ignorar, descartar — zero ocorrências), então há regra e não há forma: onde o gesto mora e com que palavra é o que falta decidir. Dispensar tem consequência óbvia — sai da lista — e dá sinal negativo ao corte | Conexões | DEC-0023 |
| **B15-b** | ✅ **CONSTRUÍDO em 03/09: virou "Parecem do mesmo assunto"** — o título carrega a postura (é palpite) e o corpo carrega o critério (N notas, M livros, P palavras), que é a divisão que o `CLAUDE.md` pede. ~~"Você ligou", nos Estudos, nomeia o que a pessoa NÃO ligou.~~ Conferido em 03/09, a pedido: a seção `estudos-ligou` não lista a tabela `Ligacao` — ela vem de `/notas/agrupadas`, uma varredura que acha grupos de notas que dividem palavras. O próprio texto dela diz, três linhas abaixo do título: *"Nada foi organizado por você."* **Título e corpo se contradizem, e o título atribui à pessoa um ato que foi do sistema** — que é o avesso da regra do `CLAUDE.md` sobre não tratar sugestão como fato. **Não é o mesmo conjunto de "Ligadas" na página da nota**, então não há o que unificar: o que há é um nome errado num lugar só. Resolver junto da frente de Notas | Estudos | DEC-0024 |
| **B15** | ✅ **CONSTRUÍDO em 03/09.** ~~Que vistas Notas tem, e como se chama a partição hoje rotulada "Soltas"~~ — **decidido em 03/09.** "Solta" nomeia a nota pelo que ela NÃO tem, e uma nota escrita no Canvas não é deficiente: é um pensamento que não veio de livro. A partição fica em **dois positivos e paralelos, os dois por origem — "Escritas aqui" × "Do livro"** —, e "escrita aqui" já é palavra que o produto fala, no rodapé do cartão. Mais **um corte só, noutro eixo: "sem ligação"** — o pensamento que ainda não encostou em nada, que é lista acionável. **"Por livro" fica de fora de propósito:** a Estante já é a vista centrada em livro. Falta implementar, junto da frente de Notas | Notas | DEC-0024 |
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
| **C1** | ~~Que criptografia é usada, e se o produto tem acesso ao conteúdo em claro durante o processamento~~ — **respondida pelo código em 03/09.** Não há criptografia em repouso: `grep` por `Fernet`/`cryptography` no backend não devolve nada. O servidor lê o arquivo em claro, porque converter é ler — o Calibre e o ocrmypdf recebem o caminho. O que existe é o endereço não adivinhável (`token_publico`) e o dono. Isto é fato, não decisão; a decisão que sobra é se ISSO BASTA | DEC-0022 |
| **C2** | ✅ **FECHADA em 07/09 — `DEC-0041`.** ~~O que é "processo mínimo necessário", e como o acesso humano interno é auditado e por quem~~ — definido em quatro eixos (dados, privilégio, duração, número de pessoas), com ordem de investigação em quatro degraus e conteúdo restrito a três casos. **O estado medido antes de decidir:** uma porta de dono em quatro routers, um deles servindo o texto que as pessoas escreveram, e **zero registros de quem a atravessou**. Agora todo acesso privilegiado gera evidência com os sete campos, em JSONL append-only fora do banco, com limpeza por arquivo mensal e nunca por linha. A revisão fica com o operador, e isso vai escrito: não existe auditoria independente no Mekora, e afirmar que existe seria pior que não ter. Procedimento em `ACESSO.md` | DEC-0022 |
| **C3** | ~~Por quanto tempo o original temporário sobrevive entre a falha e o descarte~~ — **respondida em 03/09.** O mesmo prazo de todos: `retention_days`, hoje 30. `error` está na lista de estados terminais da limpeza desde sempre, e agora `converted` e `analyzed` também — ver o achado abaixo | DEC-0021 · DEC-0022 |
| **C4** | ~~Prazo exato de retenção de sessões anônimas~~ — **respondida em 03/09.** Trabalho sem dono não é caso à parte: ele cai na mesma limpeza por idade, que olha `updated_at` e não o dono. São os mesmos 30 dias, e a tela de privacidade os diz | DEC-0018 |
| **C6** | ~~Se há consentimento para a coleta de uso, e como é pedido~~ — **decidido em 03/09: não se pede, e se diz.** A medição não sai do servidor, não toca conteúdo nem nome de arquivo, e a tela de Privacidade a lista item por item. Um banner de consentimento para dado que não vai a lugar nenhum treina a pessoa a clicar em "aceito" sem ler | DEC-0029 |
| **C7** | ~~Por quanto tempo os eventos coletados são mantidos~~ — **90 dias, decidido em 03/09.** O mesmo número da janela sem conta, para não haver dois prazos a lembrar — e é o que a MEDIDA precisa: a estimativa de "costuma levar" exige cinco execuções da mesma etapa, e trinta dias apagaria a base antes de ela virar número. A limpeza roda no startup, junto da de arquivos | DEC-0029 |
| **C8** | ~~Qual ferramenta de instrumentação é usada, e se é própria~~ — **respondida pelo código.** É própria: a tabela `stage_metrics`, escrita por `record_stage`. Não há serviço externo, e nada sai da máquina — a tela de privacidade diz isso desde 02/09 | DEC-0029 |
| **C9** | ~~Quando as telas passam a ser efetivamente verificadas a 390px~~ — **reaberta e fechada de novo em 03/09.** O cabeçalho transbordava **102px em toda rota** (`scrollWidth` 492 numa janela de 390): a consulta de telefone trocava o `flex` de `.cabecalho-acoes` e deixava de pé o `inline-size: 476px` do computador. Junto, os dois atalhos que o `964:24606` substitui pelo hambúrguer continuavam na tela — a regra que os escondia pegava filho, e eles são netos —, e por isso o campo de busca ficava com 70px. Agora: 390 de 390 em treze rotas, campo de 198px. A medida original era boa; ela olhava o `body`, e o cabeçalho é parte `fixed`. — **fechada em 02/09.** As treze cabem, a Leitura inclusive: a auditoria a mede com um livro convertido de verdade, e ela passa com 21 nós | DEC-0023 |
| **C10** | ✅ **FECHADA em 07/09.** ~~A migração do acervo e das notas existentes para identidade estável~~ — `pessoas.uuid` (migração `c7d81e3a94b2`) substitui as duas identidades instáveis: o `id` sequencial, que muda em restore e fusão de bases, e o e-mail, que a pessoa troca. E `scripts/migrar-identidade.py` leva o grafo órfão para uma identidade **informada**, com os doze requisitos — backup, ensaio por padrão, inventário, contagens, transação, FKs ligadas, detecção de órfão, validação dentro da transação, idempotência, relatório e rollback impresso na saída. **O princípio é o que ele não faz:** nada de nome, e-mail parecido, título ou timestamp — o único sinal aceito é a chave estrangeira, e quando ela aponta para duas pessoas o script para. Dezesseis testes, a maioria medindo a recusa. Procedimento em `MIGRAR-IDENTIDADE.md` | DEC-0021 |
| **C11** | ~~Que estado cada uma das 19 DECs anteriores recebe~~ — **fechada em 03/09.** As trinta e nove continuam `accepted`: a própria DEC-0027 §4 diz que emenda parcial NÃO é estado, e nenhuma foi superada ou revogada. O que faltava era mecânico e relacional — onze declaravam com item de lista e passaram à forma em negrito, e três emendadas não tinham apontamento reverso. E o conflito que ela nomeava foi resolvido: **a emendada é a DEC-0017** | DEC-0027 |
| **C12** | ~~O `role` literal de cada repositório existente~~ — **reconciliado em 03/09.** Os dezoito foram normalizados contra o vocabulário da DEC-0026, e a abertura que ela prevê foi usada duas vezes: `product` (o repositório que é o produto inteiro — Mekora depois da fusão, Panela, Plantas) e `native-client` (Siphon e o widget do Plantas, que não são web-frontend). O texto livre migrou para `role_description` e o `os context` imprime os dois | DEC-0026 |
| **C13** | ~~Quando a máquina Windows é efetivamente zerada~~ — **aposentada em 03/09.** `status: retired` no `machines.json`, com data, razão e sucessor. A entrada FICA: a DEC-0028 permite zerar e proíbe remover do histórico, e os 100 runs dela continuam apontando para uma máquina que o registro conhece. O `role`, que estava errado desde 06/08, foi corrigido para o que ela de fato foi | DEC-0028 |
| **C14** | ~~O destino do `artefato-mekora.html`~~ — **fora do versionamento, 03/09.** Ele é GERADO do `prototipo-mesa.html`, que é versionado, e o gerador o reproduz byte a byte — mesmo `sha256`, conferido. Versioná-lo gravava 2,87 MB de HTML com trinta imagens embutidas a cada mudança, e HTML não faz delta: 29 objetos inteiros num pacote de 29,4 MB. O histórico não é reescrito — os objetos continuam alcançáveis pelos commits antigos, que é o que a DEC-0028 pede | DEC-0028 |
| **C15** | ~~Quando a V1 é lançada~~ — **respondida em 03/09: quando estiver pronta.** Nas palavras do Erik, *"vai ser um mistério até que tudo esteja devidamente implementado"*. Não é adiamento: é a recusa de uma data que faria o resto ser cortado para caber nela | DEC-0029 |
| **C16** | ~~O limiar de "talvez" em Conexões~~ — **fechada pelo desenho.** O nó `895:8545` não pede um corte binário: pede três faixas nomeadas, e três faixas só precisam estar em ordem. O corte de cada uma aparece na tela, com as palavras em comum ao lado | DEC-0024 |
| **C17** | ~~Se o Mekora terá usuários fora do Brasil~~ — **decidido em 03/09: só Brasil na V1.** O produto é todo em português e a jurisdição é uma só; nada impede alguém de fora usar, e a política fala de LGPD e mais nada. Atender a Europa traria GDPR, que é trabalho de texto e de encarregado — quando houver público para isso | DEC-0031 |
| **C18** | ~~Em que país ficam os servidores da VPS~~ — **decidido em 03/09: Brasil.** A Hostinger tem região aqui. Dado de brasileiro em servidor no Brasil é a resposta mais simples para a LGPD, e a leitura fica mais rápida para quem está aqui | DEC-0031 |
| **C20** | ✅ **VEREDITO: NÃO SE APLICA.** Nunca houve produção — logo nunca houve nota para a cascata destruir. **A verificação, e ela é de três lados:** o domínio `mekora.com.br` **não existe em DNS** (`NXDOMAIN`, conferido em 03/09), então nada jamais atendeu por ele; o banco de desenvolvimento tem **duas pessoas, as duas contas de medida** (`medida-…@teste.local`, criadas hoje) e **zero trabalhos com dono**; e os sete backups de 30–31/08 trazem `notas=0` em todos. Não há terceiro lugar onde o produto tenha rodado: o `docker-compose` sobe com `MEKORA_DOMINIO=localhost` por padrão, e o `.env.example` é o único lugar onde o domínio aparece. **O item fecha com veredito escrito, e não com "aberto: 4 a 8"** — item fechado sem veredito volta. ~~Algum livro já foi apagado em produção?~~ Se foi, notas foram destruídas — até 03/09 `notas.job_id` era `CASCADE`. **A pergunta não se responde daqui, e a razão é parte do defeito: cascata não deixa rastro.** Não sobra linha órfã, e nada registra a contagem. Nos sete backups locais (30–31/08) e no banco de desenvolvimento de hoje: `notas=0, trabalhos=37` em todos — nada foi destruído nesta base, e nada nesta base responde por produção. **O que responde:** rodar a contagem de `notas` no conjunto de backups da VPS e comparar com hoje; uma queda sem explicação é o rastro | — | DEC-0021 |
| **C21** | ✅ **FECHADO em 07/09.** ~~Não ter caminho de restauração~~ — `scripts/restaurar.py` restaura um snapshot escolhido para um destino isolado, reescreve os caminhos absolutos e roda oito verificações; `scripts/ensaio-de-restauracao.sh` exerce o caminho inteiro e sobe o Mekora contra a cópia, provando pela API que um livro abre, que as notas sobrevivem com texto e que o progresso guarda capítulo e deslocamento; `scripts/provar-restauracao.sh` envenena cada verificação e prova que ela reprova o defeito dela e só ele. O ensaio de 07/09 está em `docs/operacional/ensaio-de-restauracao.md`, e o procedimento para quem não conhece o código em `docs/RESTAURAR.md`. Três defeitos apareceram no caminho: o `backup.py` ignorava `MEKORA_STORAGE` e copiava a pasta errada em container; `retratos/` e a configuração persistente nunca eram copiados; e os caminhos do banco são absolutos, então restaurar sem reescrevê-los daria um Mekora que sobe e não abre livro nenhum. | segurança | — |
| **C19** | ~~O catálogo de componentes~~ — **construído em 03/09**, na rota `/sistema`. Ele NÃO é tela do produto: a rota só é registrada quando `import.meta.env.DEV` é verdadeiro, e em produção o Rollup corta o ramo e o arquivo nem entra no pacote. A razão é de escopo — o Erik fixou que a V1 é o Figma inteiro, e uma tela que o Figma não tem seria escopo acrescentado por mim. É instrumento, como o `scripts/portao.js` | DEC-0033 |

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
| **D3** | ✅ **FECHADO em 08/09** — quem muda o estado é quem edita o arquivo, e o git registra. Exigir run aberto seria regra nova que nada no sistema sustenta — o que faltava não era permissão, era **conferência** | DEC-0027 |
| **D4** | ✅ **FECHADO em 08/09** — a pergunta se dissolve: uma DEC sem estado não pode existir, porque a validação reprova | DEC-0027 |
| **D5** | ✅ **FECHADO em 08/09** — **à mão.** Detectar conflito entre duas decisões exigiria entender o que cada uma diz; o que se automatiza é a reciprocidade do apontamento | DEC-0027 |
| **D6** | ✅ **FECHADO em 08/09** — `supporting_artifacts` entra no briefing, em lista própria — a `DEC-0026` já tinha registrado o efeito da ausência: *"o briefing nunca nomeou onde o produto vivia"* | DEC-0026 |
| **D7** | ✅ **FECHADO em 08/09** — removido dos manifestos. Onde valia `true`, a informação passou para o texto do papel antes da remoção | DEC-0026 |
| **D8** | ✅ **FECHADO em 08/09** — **se este material sumisse, alguma decisão futura ficaria sem base?** Sim → referência; não, mas prova que algo foi assim → evidência; não e é reproduzível → descarte. A pergunta é sobre o FUTURO, e é isso que a torna decidível | DEC-0028 |
| **D9** | ✅ **FECHADO em 08/09** — `AAAA-MM-DD-nome/` com `LEIA.md`, a mesma do `resgate/`. A data é a chave e não o assunto | DEC-0028 |
| **D10** | ✅ **FECHADO em 08/09** — **não entram no registro.** As 60 MB do Windows foram embora com a máquina; as 378 MB desta ficam de fora porque transcrição é log de ferramenta, não registro de projeto | DEC-0028 |
| **D11** | Que número, em qualquer medida, conta como sucesso — depende de linha de base que ainda não existe | DEC-0029 |
| **D12** | O que entra no escopo da V1 — matéria da DEC-0018, não da DEC-0029 | DEC-0029 |
| **D13** | ~~**O Sumário continua sendo folha**, e folha cobre o texto~~ — **falso desde que o índice virou gaveta.** A leitura não tem `<Folha>` nenhuma: o sumário é o painel `.indice`, à esquerda, como a busca no livro e os marcadores. Conferido no código em 03/09 | DEC-0023 |
| **D15** | ✅ **FECHADO em 08/09 — `scripts/portao-seletores.mjs`.** ~~O `seletores.mjs` virar portão~~ — o invariante cobrado não é "toda regra casa em alguma rota" (o relatório, com mais de mil linhas de rota não visitada), e sim **"a regra de uma folha de tela veste marcação que existe"**. A calibração é o trabalho: a primeira versão reprovou 264 de uma vez, e duas eram medidas erradas minhas — o portão media a tela pela metade (`/canvas` dava zero para `.canvas-mundo` com a espera padrão; 23 elementos com 500ms a mais) e o mapa folha→rota estava trocado. Das 264 reais, 183 são estado que a bancada não semeia — relatadas, não bloqueiam — e 81 vestiam marcação inexistente. A conferência é **dupla**, e a segunda peneira salvou dez telas: das 19 classes que o padrão estrito deu por ausentes, dez nascem de template. As 13 regras das 9 órfãs de verdade foram removidas. Provado nos dois sentidos, com `--autoteste` de sete verificações | DEC-0029 |
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

**A-11 · RESOLVIDA.** A vista 3D foi refeita como **pilha de livros deitados**,
com o índice de títulos à esquerda, depois dos prints que o Erik mandou — é o
que o nó `895:7506` mostra. A anotação ficou para trás; fica aqui o registro.

**A-12 · RESOLVIDA.** 56 entrou na escala. Ela ia `48 → 64`, e o que faltava era
justamente o degrau do meio: a cauda anda de 8 em 8 (`32, 40, 48, [56], 64`).
Acrescentá-lo tornou a sequência regular em vez de abrir uma exceção para uma
tela, e o título de abertura da leitura no telefone passou a ser o 56 do
desenho.

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

**A-21 · RESOLVIDA.** O Erik respondeu: *"qual seria o sentido de baixar um
arquivo que você já possui?"* — o original é o arquivo que ele mesmo mandou. O
botão oferece só o EPUB preparado, que é o que o Mekora fez, e a frase do desenho
é que muda. A porta de `/storage/input` continua fechada.

**A-21 (registro do que era) · "Baixar" promete o original.** O nó
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

**A-23 · RESOLVIDA.** Os cinco ícones do `941:23118` — renomear, páginas, baixar,
refazer, remover — foram exportados e estão ligados em
`ConfiguracoesArquivo.jsx:34-40`, cada um na linha dele. Conferido no código em
03/09.

**A-23 (registro do que era) · Os vãos de ícone do `941:23118` estão vazios no Figma.** Cada uma das
cinco linhas tem um quadrado de 40px com borda e nada dentro. Ficaram vazios na
implementação — desenhar cinco ícones à mão produziria ícones que não passaram
pelo efeito handmade e não seriam do sistema. Faltam: renomear, páginas, baixar,
refazer, remover, no Solar 480.

**A-24 · RESOLVIDA.** Virou folha, como o `941:23108` mostra. Era uma seção fixa
da página da nota, sempre aberta com a lista inteira de notas embaixo — e a
página é para LER a nota, não para escolher entre quarenta outras. Um botão
"Ligar a outra nota" abre a folha.

**A-24 (registro do que era) · "Conectar nota" é folha no desenho e seção na tela.** O nó `941:23108`
mostra *"Ligar esta nota a qual?"* como diálogo por cima, com busca, lista de
candidatas e "Cancelar". Na tela ela é uma seção da página da nota, com a mesma
busca e a mesma lista. O conteúdo é o mesmo; o recipiente não. **Decisão do
Erik:** vale a pena virar folha.

**A-25 · A busca não entra no texto dos livros.** *"Buscar em Mekora"*
(`941:23107`) procura título, autor, nome do arquivo, o texto das notas e o
assunto dos estudos — tudo que o banco sabe. O texto do livro está dentro do
EPUB, não no banco, e indexá-lo é trabalho de outra ordem. A tela diz isso
quando não acha nada.

**A-26 · RESOLVIDA.** Os **marcadores** foram construídos em 03/09, e a decisão
que faltava — desenhar os dois painéis ou tirar os ícones do cromo — foi
respondida construindo: o marcador veste a mesma gaveta do índice e da busca,
porque os três são formas de ir a um lugar do livro, e uma terceira forma de
gaveta seriam três desenhos para uma ideia. Tabela própria (`marcadores`), e não
uma coluna em `notas`: a nota aparece no Canvas, nos Estudos e em `/notas`, e uma
dobra de página não pertence a nenhuma dessas telas. Provado por jornada contra
o produto rodando: 12 de 12 — dobrar guarda capítulo, deslocamento e trecho;
dobrar o mesmo lugar de novo devolve `ja_estava` sem duplicar; a lista leva de
volta ao ponto; tirar limpa servidor e tela. **Não há mais botão desligado no
produto.**

**A-26 (registro do que era) · METADE RESOLVIDA.** A **busca dentro do livro** foi construída: ela não
tem painel desenhado, então veste a gaveta do índice — é o mesmo tipo de coisa,
um jeito de ir a um lugar do livro, e uma terceira forma de gaveta seria três
desenhos para uma ideia. Ela procura no LIVRO INTEIRO e não só no que está
carregado: abre os capítulos que faltam, um a um, e diz em qual está enquanto
procura. Os **Marcadores** continuam sem painel e sem função.

**A-26 (registro do que era) · Buscar no livro e Marcadores não têm painel.** Os dois ícones
estão no cromo da leitura desde o começo. Os quatro painéis que existem no Figma
— `941:23110` aparência, `941:23111` notas e destaques, `941:23112` índice,
`941:23120` seleção — foram construídos, e nenhum deles é um destes dois. Eles
ficam `disabled` com o motivo no título. **Decisão do Erik:** desenhar os dois,
ou tirá-los do cromo.

**A-27 · As telas `M ·` não têm id que eu consiga descobrir.** O `get_metadata`
da página do Figma vem truncado e devolve só os símbolos de exploração; as telas
`D ·` e `M ·` não aparecem nele. Consegui abrir duas, porque os ids estavam
escritos no repositório: `964:24606` (`M · Estante — grade`) e `966:29395`
(`M · Leitura`). As outras doze continuam por comparar. **Preciso do Erik:** os
ids, ou selecionar cada tela no Figma — a ferramenta lê a seleção atual.

**A-28 · Três divergências no `M · Estante — grade` (964:24606).** A grade virou
duas colunas e o alternador Capas/3D subiu para antes dela, como no desenho. O
que não foi feito, e por quê:

- **O hambúrguer.** O desenho troca os dois botões de ação do topo (notas,
  conta) por um `☰`. O menu que ele abre não está desenhado em lugar nenhum, e
  inventá-lo seria inventar navegação.
- **O funil.** Os recortes (Tudo / Com nota / No Kindle / Quadrinhos) ficam
  atrás de um botão de funil no desenho; na tela eles são um bloco de quatro
  chips. O painel do funil também não está desenhado.
- **O dock sem rótulos.** O desenho mostra quatro ícones e nenhuma palavra. Na
  tela eles têm rótulo, e a razão está no `cabecalho.css`: ícone sozinho obriga
  a adivinhar. É divergência deliberada.

**A-29 · RESOLVIDA — gatilho confirmado, e a CARGA medida.** O `941:23113` é o
popup onde se escreve a nota, e ele abre **logo depois de marcar um trecho, pelo
"Adicionar nota" da barra de seleção** (`Leitura.jsx:482`).

O gatilho segue o mesmo padrão do Canvas, onde "Criar seção" nasce da escolha: a
nota é sobre o trecho, então nasce onde o trecho está.

**E o que faltava não era decidir, era medir:** a nota chega com o trecho preso
ou em branco? Medido em 03/09, com seleção de verdade e leitura do servidor:

    marcado na tela   "ue primeiro roeu as frias carn"
    trecho da nota    "ue primeiro roeu as frias carn"   ✓ bate
    de / ate          19 / 49
    antes / depois    "Ao verme q" / "es do meu cadáver dedico como…"
    o cartão mostra   Nota · 21:40 · “ue primeiro roeu as frias carn” · Salvar

A carga está certa: trecho preso, âncora com contexto dos dois lados, e o cartão
mostrando a citação em vez de um campo vazio. **`origem` vem vazia, e isso não é
falta:** ela só se preenche para nota que NÃO vem de um trabalho daqui — a do
Kindle. Esta tem `job_id`, e é o trabalho que diz de onde ela veio. A alternativa que existia antes
era abrir o caderno inteiro — a coluna com todas as notas do livro — para
escrever uma linha sobre a que acabou de nascer, que é abrir um arquivo para
anotar um papel.

**A-29 (registro do que era) · Um símbolo que apareceu e não foi construído: `941:23113`
"Nota · cartão".** Um cartão com o trecho citado, um campo "Escreva aqui..." e um
botão "Salvar". Ele estava selecionado no Figma quando a ferramenta leu a
seleção. Parece ser a edição de uma nota — sobreposto ao texto, provavelmente.
**Decisão do Erik:** onde ele abre.


**A-30 · Como eu leio as telas do Figma sem os ids.** A ferramenta do Figma lê a
**seleção atual** quando não recebe um id — foi assim que o `941:23113` apareceu.
Então: **selecione na aba de camadas os quadros que quer que eu abra** (clique no
primeiro, `Shift` no último) e me avise. Eu leio nome e id de todos de uma vez, e
o problema do A-27 acaba para sempre.

Sozinho eu não consigo: `get_metadata` da página vem truncado e não devolve as
telas, e sondar id por id não funciona — os números não são sequenciais entre
quadros irmãos (medido: `964:24607` é FILHO de `964:24606`, não o vizinho dele).

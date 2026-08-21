# As nove perguntas `A`, com a evidência que já existe

**Data:** 2026-08-20
**Estado:** evidência reunida. **Nenhuma decisão foi tomada aqui.**
**Base:** a seção A do `ABERTO.md` — as nove que decidem forma de sistema. O arquivo era rascunho
daqui e hoje é canônico, em [`docs/ABERTO.md`](../docs/ABERTO.md); a numeração não mudou.

O Erik pediu três coisas: trazer as nove inteiras com a evidência que já existe, separar A4 e A5 como
aguardando a auditoria do schema no Mac, e resolver as outras sete.

**As sete não se dividem em sete decisões.** Ao reunir a evidência, quatro delas mudaram de natureza:

```
A1  A3  A6      prontas para o Erik decidir — a evidência está completa
A2              aguardando auditoria no Mac, como A4 e A5 — mas do backend, não do schema
A9              aguardando verificação de bancada, não decisão
A8              é do Project OS, não do produto
A7              fica aberta, e a razão é a ordem: ela depende de A1, A2 e A9
```

Forçar sete decisões teria produzido quatro decisões sem base. O que segue é o porquê de cada uma.

---

## A1 · Onde a infraestrutura fica — região, provedor, jurisdição

> É a única de todas as 61 cuja resposta muda obrigação legal, e não só implementação. — `DEC-0022`

### O que já está decidido em volta

A **DEC-0022 item 7** proíbe enviar conteúdo do usuário a serviço externo de tradução ou IA. O mesmo
item permite explicitamente provedor de nuvem que forneça *"computação, rede ou armazenamento sob
contrato, sem usar o conteúdo para outro fim"* — e diz, com todas as letras, que os nomes citados são
exemplos: **trocar de fornecedor não reabre a decisão.**

### A evidência que existe

| | |
|---|---|
| **Precedente de deploy** | `mekora-canvas-motion` faz deploy em **Cloudflare Workers** — `DEC-0011:21`, repetido em `DEC-0025:106` |
| **Não é precedente** | O Supabase que aparece em `panela.status.md:32` é da **Vynce**. Outro projeto, outra pilha |
| **Jurisdição** | Nenhum registro do Mekora nomeia país, região ou base legal |

### O que falta, e o que não falta

**Provedor não falta.** A DEC-0022 já o tornou reversível por escrito, e existe precedente rodando.

**Jurisdição falta, e ela não é reversível.** Onde o conteúdo repousa determina que lei o alcança —
e o conteúdo aqui é biblioteca pessoal, com material que pode ser protegido por direito autoral.

### Recomendação — **decisão do Erik**

Decidir **onde o conteúdo repousa**, e deixar provedor de fora da norma. É uma linha, destrava a
arquitetura, e não prende fornecedor nenhum. Escrever provedor na DEC seria escrever no lugar errado
a única parte que a própria DEC-0022 já declarou trocável.

---

## A2 · Como a tradução própria é construída

> A regra é o limite; a arquitetura que a cumpre não existe, e pode ter custo relevante. — `DEC-0022`

### A evidência muda o enunciado

**A arquitetura existe.** `DEC-0011:19` descreve o backend operacional: 112 arquivos Python em
`backend/app/`, com 40 de teste, e entre os serviços *"um pipeline de quadrinhos com quinze serviços
e tradução via NLLB"*. A `RECONCILIACAO-01` classificou tradução como **classe B**: *"Argos e NLLB
funcionais — existe no app, não incorporada à V2."*

### E o enunciado corrigido não é uma resposta

Regra do Erik, verbatim: **implementação histórica compatível ≠ estado atual comprovadamente
conforme.** Argos e NLLB são **precedente**, não conformidade. O que provam: a arquitetura que a
DEC-0022 exige já foi construída e funcionou. O que não provam: que ela cobre o escopo de hoje, que
o custo é aceitável, ou que a V1 a reusa.

### Por que esta é a terceira do Mac, e não a quarta a decidir

O backend está em `mac-mini-erik:/Users/sipnm/dev/kindle-local-tool`, revisão `65bb244` — **não
existe nesta máquina.** Decidir como construir a tradução sem ler os quinze serviços que já a
constroem é exatamente o erro que A4 e A5 estão evitando.

### Recomendação — **aguardando auditoria no Mac**

Mesma disciplina de A4 e A5, alvo diferente: lá é o schema, aqui é o pipeline. Auditar antes de
decidir.

---

## A3 · Se algum processamento além da tradução pode usar serviços externos

> O item 7 nomeia tradução e IA. OCR, extração e geração de capa não foram tratados. — `DEC-0022:89`

### A evidência

Os três já existem, e **os três já são locais.** `DEC-0011:19` lista, no mesmo backend: `ocr_service`,
`document_extractor_service`, `pdf_service`, `convert_service`, `kcc_service`. Nenhum deles é serviço
externo hoje.

### Isso reformula a pergunta

Não é *"podemos usar serviço externo?"*. É:

> **Há alguma razão para passar a mandar para fora o que já é feito dentro?**

E a razão que a DEC-0022 item 7 dá para proibir tradução — o conteúdo do usuário sai da máquina do
Mekora — vale igual para OCR, extração e capa. **Os três processam o mesmo conteúdo.** OCR, aliás,
processa a página inteira, não um trecho.

### Recomendação — **decisão do Erik, e é curta**

Estender o item 7 a todo processamento de conteúdo, não só tradução e IA. Se houver exceção que o
Erik queira abrir, ela entra **nomeada** — o que não pode continuar é a regra valer por silêncio,
porque hoje o silêncio já está do lado certo por acidente de história, e acidente não é norma.

---

## A4 · O formato do identificador de conteúdo
## A5 · Como relacionar duas importações do mesmo título

> UUID foi exemplo, não especificação. — `DEC-0021`
> A norma proíbe colisão; não define agrupamento, metadado de edição nem deduplicação. — `DEC-0021`

### Estas duas ficam **aguardando a auditoria do schema no Mac**

Instrução do Erik, e ela não é conveniência: *"tem implementação histórica concreta a ser auditada
antes de qualquer decisão nova"*, e *"não faria o Claude inventar substitutos para A4/A5 só porque a
máquina atual não alcança o código."*

### O que existe, e onde

| | |
|---|---|
| **O schema** | Drizzle com `livros`, `notas`, `tags`, `livro_tags`, criado na madrugada de 14/08 |
| **Commit** | `e0a5204`, no `canvas_motion` |
| **Onde** | `mac-mini-erik:/Users/sipnm/dev/mekora-canvas-motion`, revisão `e862326` — **não existe nesta máquina** |

**Encontrar quatro tabelas não responde nada.** Chave primária, formato do id, fingerprint de
conteúdo e regra de deduplicação são justamente o que não se lê de uma lista de nomes de tabela.

### O que o protótipo de hoje prova sobre as duas

**Contra a norma:** `sig(` em três pontos e `d.livro===ARQ.titulo` em sete — identidade por título,
que a **DEC-0021 itens 12 e 13** proíbem. É o `I1` da revisão de drifts, e está bloqueado por estas
duas perguntas.

**A favor de que a pergunta é real:** o `ACERVO` tem **14 itens e 10 títulos distintos**, e as
repetições são de quatro tipos diferentes:

```
Malha Urbana      02 EPUB "preparado hoje"  ·  05 EPUB "outra edição"    → mesma obra, duas edições
Ensaio Visual     06 TXT  "2 notas"         ·  07 TXT  "variante"        → mesma obra, duas variantes
Ata da reunião    09 PDF  "pesquisa"        ·  12 PDF  "pesquisa"        → indistinguíveis
Arquivo           08 PDF  "capa gerada"     ·  10 XLSX "planilha"        → provavelmente obras DIFERENTES
```

A última é a mais eloquente: **mesmo título, formatos diferentes, quase certamente coisas distintas.**
O protótipo já encena o problema inteiro da A5 — e a interface hoje distingue os pares por uma
etiqueta escrita à mão no campo `q`, que é exatamente o *metadado de edição* que a DEC-0021 diz não
existir.

---

## A6 · Qual é, nominalmente, a fonte de design vigente

> Deliberadamente não nomeada, porque podem coexistir design system em código, arquivo de design e
> implementação. — `DEC-0025`

### Um achado que muda a leitura desta pergunta

Havia trabalho pesado de Figma e design system nos últimos dias, e é fácil supor que seja do Mekora.
**Não é.** Dos 13 runs de 20/08:

```
mekora   4   todos visual-exploration, todos sobre prototipo-mesa.html
vynce    9   auditoria mobile, Actos A/B/C de design system, saneamento do Figma
```

**O Mekora não tem arquivo de design.** Não tem design system em repositório separado. O que tem:

| | |
|---|---|
| **Tokens** | 64 nomes de variável CSS distintos, declarados dentro do próprio `prototipo-mesa.html` |
| **Documentação** | o bloco `:root` explica em prosa a razão de cada escolha — *"off-white em vez de branco puro"*, *"as camadas passam a vir do fundo, não da borda"* |
| **Estado** | é onde o produto é desenhado, e a DEC-0025 explicitamente **não o promoveu** |

A DEC-0025 deixou a pergunta aberta nestes termos: *"Se `prototipo-mesa.html` é ele próprio a fonte
do desenho aprovado, ou um instrumento de exploração como o `canvas-motion`."*

### Recomendação — **decisão do Erik**

Nomear o `prototipo-mesa.html` como fonte de design vigente **reconhece o que já é**, e não fecha
porta nenhuma: a DEC-0025 já previu coexistência com design system em código mais adiante.

**O contra-argumento honesto, porque ele é real:** um HTML de 460 KB é fonte de design *executável*,
não *consultável*. Enquanto o Mekora tiver um implementador, isso é vantagem — a regra e o código
moram juntos e não podem divergir. No dia em que tiver dois, vira problema, e o problema aparece de
uma vez.

---

## A7 · Sobre qual base a interface será implementada

> Separada do desenho pela DEC-0025, e não respondida. — `DEC-0025`

### A evidência: três bases, e elas não se misturam

`DEC-0011:21`, verbatim: *"Os dois frontends são pilhas incompatíveis, não variações de estilo."*

```
mekora-app          64 arquivos .ts/.tsx · React Router · Tailwind · i18next · axios · Docker
canvas-motion       vinext sobre Vite com RSC · tokens CSS próprios · sem Tailwind, sem router
                    de biblioteca, sem i18n, sem axios · deploy em Cloudflare Workers
prototipo-mesa      HTML, CSS e JS num arquivo · sem build · sem dependência
```

A **DEC-0025** tirou do `canvas-motion` o papel de frontend canônico e **não nomeou substituto** —
foi essa a metade que ela deliberadamente não respondeu. E o **ponto 6 da DEC-0011 continua vigente**:
o frontend legado sai quando a interface nova cobrir importar com validação, acompanhar a conversão
até o fim, e enviar ao Kindle.

### Recomendação — **fica aberta, e a razão é a ordem**

Esta é a mais cara das nove e a que tem menos evidência própria. Ela **depende de três outras**:

- **A1** — onde roda decide o que a base precisa suportar;
- **A2** — se o backend Python fica, a base nova fala com ele por contrato de API (DEC-0011 ponto 5),
  e isso é uma restrição de arquitetura, não de gosto;
- **A9** — se o cabo exigir capacidade que só um tipo de cliente tem, a base deixa de ser escolha
  livre.

Decidir a base antes dessas três é decidir na ordem errada. **Resolver A7 hoje é declarar quando ela
se decide, não empurrá-la** — e o quando é: depois de A1, A2 e A9.

---

## A8 · O escopo por domínio do `baseline_revisions`

> Hoje todo run carimba todos os repositórios, independente do que tocou. — `DEC-0026`

### A evidência é uma linha de código

`bin/project-os.mjs:804`:

```js
baseline_revisions: Object.fromEntries(project.repositories.map((repo) => [repo.id, repo.revision]))
```

Sem filtro, sem declaração, sem escopo. E `schemas/run.schema.json:25` exige apenas
`{ "type": "object" }` — o schema não impõe nada que a implementação pudesse violar.

Consequência já registrada na **DEC-0025, consequência 3**: 58 runs gravam três hashes observados em
05/08, de repositórios que não receberam nenhuma daquelas mudanças.

### Esta não é pergunta do Erik

Instrução dele, verbatim: *"não abra mais perguntas técnicas para você que o próprio Project OS pode
resolver."* Das nove, **A8 é a única que não é do produto** — é do instrumento de registro.

### Recomendação — **o Project OS decide e implementa**

A forma que segue o que já existe: `start` passa a aceitar `--repo` para declarar quais domínios o
run toca, e `baseline_revisions` carimba só esses. Sem `--repo`, carimba todos **e o run fica marcado
como não-declarado** — porque carimbar tudo em silêncio é o que produziu os 58.

Fica registrada aqui e sai da fila do Erik.

---

## A9 · Como o Kindle por cabo funciona num produto web

> Hoje *"pelo cabo o Mekora leva e traz"* é a afirmação mais frágil da interface. — `DEC-0022`

### O próprio produto já escreveu o fato técnico que reformula a pergunta

Na folha do cabo, `prototipo-mesa.html:5321`:

> *"Ligue o cabo e desbloqueie o aparelho. **Ele aparece como um disco no computador.**"*

O Kindle monta como volume de armazenamento. O que o Mekora precisa fazer nele é **ler e escrever
arquivo num volume montado** — `My Clippings.txt` para trazer, `documents/` para levar. Não é
protocolo USB cru.

Então a pergunta não é *"o navegador fala USB?"*. É:

> **O navegador alcança um diretório que a pessoa escolheu?**

### Minha avaliação, e ela precisa ser verificada antes de virar norma

- **WebUSB provavelmente não serve.** A especificação bloqueia classes de interface protegidas, e
  armazenamento em massa é uma delas — é a mesma proteção que impede uma página de ler um pendrive.
- **O caminho seria o seletor de diretório** (File System Access API), que **é Chromium-only**: sem
  Firefox, sem Safari.

**Não escrevi isso como fato.** É o que eu sei sobre as duas especificações, e não consegui conferir
contra a fonte nesta máquina. É verificável numa tarde, com um Kindle e um Chrome.

### A consequência de produto, se confirmar

*"Pelo cabo o Mekora leva e traz"* passa a valer **só em Chrome e Edge, no desktop**. A **DEC-0023**
já põe Canvas como desktop-only no V1; o cabo seria a **segunda capacidade com recorte de
superfície — e a primeira com recorte de navegador**, que é uma classe de restrição que o Mekora
ainda não tem em lugar nenhum.

### Recomendação — **verificar, não decidir**

Escrever DEC sobre isto com o que temos seria fingir certeza. A verificação é barata e a decisão que
vem depois dela é sólida; a decisão sem ela seria escrita duas vezes.

---

## Resumo

| | pergunta | estado |
|---|---|---|
| **A1** | onde a infraestrutura fica | **pronta para decidir** — decidir jurisdição, deixar provedor fora da norma |
| **A2** | como a tradução própria é construída | **aguardando auditoria no Mac** — o pipeline NLLB, em `65bb244` |
| **A3** | serviços externos além da tradução | **pronta para decidir** — estender o item 7 a todo processamento de conteúdo |
| **A4** | formato do identificador | **aguardando auditoria do schema no Mac** — `e0a5204` |
| **A5** | duas importações do mesmo título | **aguardando auditoria do schema no Mac** — `e0a5204` |
| **A6** | fonte de design vigente | **pronta para decidir** — o Figma recente é da Vynce; o Mekora só tem o protótipo |
| **A7** | base de implementação da interface | **aberta por ordem** — depende de A1, A2 e A9 |
| **A8** | escopo do `baseline_revisions` | **do Project OS** — sai da fila do Erik |
| **A9** | Kindle por cabo num produto web | **aguardando verificação de bancada**, não decisão |

### Três coisas que a evidência mudou

1. **A2 é a terceira do Mac.** O Erik separou A4 e A5 pelo schema; A2 tem a mesma forma e alvo
   diferente — quinze serviços de tradução que já existem e que ninguém leu nesta rodada.

2. **O trabalho de Figma dos últimos dias não é do Mekora.** Nove dos treze runs de 20/08 são da
   Vynce. Supor o contrário teria feito A6 parecer respondida por um design system que pertence a
   outro projeto.

3. **Quatro das sete não eram decisões.** Duas esperam leitura de código, uma espera bancada, uma é
   do instrumento. Só três chegam ao Erik — e as três cabem em uma linha cada.

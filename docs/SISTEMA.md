# Mekora — o sistema

**Estado:** vigente
**Última revisão:** 2026-08-21

> **Este documento descreve o estado vigente.** Histórico, alternativas rejeitadas e evolução
> normativa pertencem às DECs e à reconciliação, e **não são repetidos aqui**.
>
> Cada regra aponta a decisão que a sustenta. Onde este documento e uma DEC divergirem, **a DEC
> vale**.

## Duas origens, e elas não têm o mesmo peso

Este documento tem regras de duas procedências, e misturá-las seria repetir o erro que a
consolidação de agosto existiu para desfazer:

```
NORMA           vem de uma DEC. Marcada com DEC-XXXX. É obrigação.
FORMA VIGENTE   vem do Protótipo de Produto do Mekora, que é referência funcional e de
                interação enquanto não existe fonte de design formal — DEC-0033 §2, §5.
                É como está feito, e vale até uma DEC dizer o contrário.
```

**Onde uma seção não tiver nenhuma das duas marcas, ela está aberta** — e está listada em
`ABERTO.md`. Este documento não preenche buraco com invenção.

---

## As entidades

```
                      ┌─────────────┐
                      │    ITEM     │  o conteúdo persistido
                      └──────┬──────┘
                             │ origem
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │ DESTAQUE  │  │ MARCADOR  │  │  (leitura)│
        └─────┬─────┘  └───────────┘  └───────────┘
              │ pode ter
        ┌─────▼─────┐
        │   NOTA    │────┐
        └─────┬─────┘    │
              │          │ RELAÇÃO  (uma só, duas maneiras de fazer)
              └──────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
    ┌───▼───┐  ┌────▼────┐  ┌───▼────┐
    │  TAG  │  │ TERRITÓ-│  │ CANVAS │
    │       │  │   RIO   │  │        │
    └───────┘  └─────────┘  └────────┘

    COLEÇÃO ── agrupa ITENS, na Estante
```

### Item

O que a biblioteca guarda. **Não é o arquivo que foi enviado** — é o conteúdo depois de convertido e
validado.

**Duas famílias canônicas, e nenhuma é forçada ao formato da outra** `DEC-0021 §1`:

```
Conteúdo textual      →  EPUB responsivo
Quadrinho / Mangá     →  conteúdo visual responsivo apropriado ao formato
```

- **O item persistido para conteúdo textual é o EPUB responsivo** `DEC-0021 §4`.
- **Não existe PDF paralelo ao EPUB na biblioteca.** Um item não carrega duas representações
  concorrentes do mesmo conteúdo `DEC-0021 §6`.
- **O Mekora não adota Work → Edition → Representation** `DEC-0021 §3`.
- **Formato de entrada é etapa do pipeline, não atributo permanente do item.** Depois de uma
  conversão validada, o item é o formato canônico, um só.

### Destaque

Um trecho marcado dentro de um item. **Existe sem nota** — e destaque sem nota vai para revisão
`DEC-0024 §2`.

### Nota

O que a pessoa escreveu. **É o artefato de PENSAR** `DEC-0024 §3`.

- Pode nascer **presa a um trecho** (do destaque), **sobre o livro**, ou **solta** (sem item nenhum).
- **Sobrevive à exclusão do item, por padrão**, com a origem marcada como removida `DEC-0021 §15`.
  A razão é normativa, não de conveniência: é trabalho intelectual de quem escreveu, e não simples
  derivado do arquivo.
- **Não existe "nota de Canvas".** As entidades do Canvas são as mesmas do resto do Mekora
  `DEC-0030 §7`.
- **Não existe um segundo sistema de notas dentro de um livro.** O que aparece ali é a Notas global,
  filtrada `DEC-0024 §6`.

**Forma vigente** — no protótipo, destaque e nota são **o mesmo registro**, e o que os distingue é
haver âncora e haver texto escrito. Um registro carrega:

```
k        identidade
livro    o item de origem
cita     o texto citado          ─┐
antes    o texto antes dele       ├─ a âncora resiliente
depois   o texto depois dele     ─┘
cap par ini fim                   a posição — dica, não fonte de verdade
perg     a nota-mãe, quando esta pende de outra
nota     o que a pessoa escreveu
origem   leitura · titulo · livro · solta
```

### Relação

**Uma só, com duas maneiras de fazer** `DEC-0030 §2`.

```
CANVAS organiza          a pessoa puxa a linha
CONEXÕES descobre        o sistema propõe a partir do que já existe
```

Uma linha puxada à mão no Canvas vira **exatamente o mesmo objeto** que aparece em "Você ligou"
dentro de uma nota. **Não há relação de Canvas e relação de nota.**

**Forma vigente** — no protótipo há três estados de relação, e a diferença entre eles é quem os
criou:

| | |
|---|---|
| **sua** | a pessoa ligou. Persiste |
| **forte / possível** | o sistema achou por termos em comum. É sugestão, derivada, não gravada |
| **dispensada** | a pessoa recusou a sugestão, e ela não volta — *"uma sugestão que volta na próxima visita deixa de ser sugestão e vira insistência"* |

### Território

Um assunto que **apareceu sozinho**, por se repetir em itens diferentes. Não é pasta e não é tag: é
observação do sistema, que a pessoa pode nomear, manter sem nome ou ignorar.

**Conceito criado pela pessoa é o mesmo objeto que Território**, distinguido apenas por quem começou.

### Tag

Palavra colada na nota. **Sem página, sem posição.**

### Coleção

Agrupa **itens**, na Estante. É da biblioteca, não do conhecimento.

### Marcador

**Nem destaque nem nota: um lugar para voltar.** É a terceira coisa, e existe porque as outras duas
carregam significado que um simples "parei aqui" não tem.

**Construído em 03/09/2026**, na tabela própria `marcadores` — e a tabela própria é a consequência
direta da frase acima: guardado em `notas`, cada dobra de página viraria uma linha no Canvas, nos
Estudos e em `/notas`, telas cujo assunto é o que se escreveu. Ele guarda **capítulo + deslocamento**,
a mesma âncora do progresso, e o **trecho** daquele ponto — que é o que torna a lista legível e o que
denuncia uma âncora escorregada. Não tem cor nem comentário: quem quer dizer alguma coisa sobre o
trecho está fazendo uma nota. Marcar o mesmo lugar duas vezes é uma dobra só, e a unicidade está no
banco. **Ele não implementa os cinco degraus da resolução de âncora** descritos abaixo — isso é da
nota, cuja perda é mais cara.

---

## O ciclo de vida do conteúdo

### A ingestão é transacional `DEC-0021 §8`

```
entrada recebida
     ↓
conversão
     ↓
validação
     ├── falhou  →  o original continua disponível para retry
     └── passou  →  o formato canônico persiste, o original temporário é eliminado
```

**O original importado não é persistido depois de uma conversão validada** `DEC-0021 §5`. Ele existe
durante upload, conversão, retry e validação — e depois disso é eliminado. Não há original guardado
para comparar, e é por isso que *Original / Adaptado / Comparar* deixou de ser arquitetura do produto
`DEC-0021 §7`.

### Conversão bem-sucedida é contrato, não "o arquivo abre" `DEC-0021 §9`

Dez verificações, e todas precisam passar:

| | |
|---|---|
| 1 | texto extraível presente |
| 2 | imagens preservadas quando relevantes |
| 3 | ordem de leitura coerente |
| 4 | capítulos e seções identificáveis quando detectáveis |
| 5 | nenhum conteúdo essencial cortado |
| 6 | layout refluível |
| 7 | funciona nas larguras suportadas |
| 8 | tipografia escala sem quebrar o conteúdo |
| 9 | imagens respeitam a área de conteúdo |
| 10 | arquivo tecnicamente válido |

### São três resultados, não dois `DEC-0021 §10`

```
CONCLUÍDO               conteúdo validado; as dez verificações passam
CONCLUÍDO COM AVISOS    legível, mas houve perda ou incerteza detectável
FALHOU                  não atende ao mínimo
```

"Concluído com avisos" existe para que **o produto não finja que a conversão foi perfeita** — OCR de
baixa confiança, por exemplo.

### O que se preserva `DEC-0021 §11`

**Conteúdo e estrutura semântica, não apresentação.** Preservar tudo não significa preservar cada
quebra ruim do PDF de origem. **A transformação de apresentação rígida em apresentação maleável é o
trabalho, não um efeito colateral.**

### Arquivar e excluir são atos diferentes `DEC-0021 §14`

| | |
|---|---|
| **Arquivar** | tira o item da biblioteca ativa **sem destruir conhecimento** |
| **Excluir permanentemente** | remove o arquivo e os destaques que dependem dele |

E em qualquer um dos dois, **as notas escritas pela pessoa sobrevivem** `DEC-0021 §15`.

---

## Identidade

**Decidido:** cada item tem identidade estável própria, e **título não pode ser identidade**
`DEC-0021 §12`. Identidade derivada do título é **proibida**: `id = hash(título)` nunca é aceitável, e
duas importações chamadas "Duna" não podem colidir só por terem o mesmo título `DEC-0021 §13`.

**Não decidido, e é a divergência mais séria deste documento:**

- **o formato do identificador** — UUID foi exemplo, não especificação. É a `A4`;
- **como relacionar duas importações do mesmo título** — a norma proíbe colisão, mas não define
  agrupamento, metadado de edição nem deduplicação. É a `A5`.

> ⚠ **O Protótipo de Produto está em divergência com esta norma.** Ele deriva identidade do título —
> `sig()` em três pontos e `d.livro === ARQ.titulo` em sete. Isso **não é bug de implementação**: é
> norma sem modelo que a cumpra, e construir o modelo depende de A4 e A5. Registrado como `I1` em
> `propostas/DRIFT-revisao.md`.
>
> As duas estão **aguardando a auditoria do schema no Mac** — Drizzle com `livros`, `notas`, `tags`,
> `livro_tags`, commit `e0a5204`. **Auditar antes de construir.**

---

## A âncora

**Norma** `DEC-0016`: a posição do leitor num documento é guardada e restaurada por **âncora
semântica** — parágrafo, capítulo, trecho — e **nunca** por pixel, percentual de rolagem ou altura de
documento. Onde o pixel aparecer, ele é consequência da âncora, não a fonte dela.

**Forma vigente** — a âncora de uma nota é **a citação mais o texto em volta**, e o deslocamento é
rebaixado a dica de busca. Ela resolve em cinco degraus, nesta ordem:

```
1  exata        onde ela disse que estava
2  contexto     o mesmo parágrafo, casando com o texto em volta
3  citação      o mesmo parágrafo, só a citação
4  capítulo     qualquer parágrafo do mesmo capítulo
5  livro        qualquer parágrafo do livro inteiro
   ─────────────────────────────────────────────────
   perdida      o trecho não existe mais neste texto
```

**"Perdida" é um estado que a nota pode ter, e a tela precisa poder dizê-lo.** Quando o trecho some,
o produto **diz que perdeu** e mostra a citação guardada — em vez de apontar para o lugar errado. E
quando reencontra por um degrau que não o primeiro, **diz por qual**: *"O parágrafo mudou; o trecho
foi reencontrado pelo texto em volta."*

O que a pessoa escreveu continua sendo dela mesmo quando o trecho sumiu.

---

## Conta e persistência `DEC-0018`

```
SEM CONTA        enviar · converter · ver o resultado · ler naquela sessão
COM CONTA        biblioteca persistente · sincronização · notas permanentes ·
                 Canvas · histórico entre aparelhos · Conexões persistentes
```

**A conta é o que transforma uma conversão temporária em patrimônio persistente da pessoa.**

**O prazo de retenção de sessão anônima não está fixado** — depende das perguntas de privacidade
ainda abertas.

---

## As fronteiras do sistema

### O conteúdo não sai `DEC-0032`

**O conteúdo do usuário não é enviado a serviços externos de IA ou de processamento de conteúdo.**
Isso inclui tradução, OCR, extração de texto, conversão, sumarização, embeddings, classificação,
geração de capa e qualquer outra análise que leia o conteúdo.

**A regra vale por princípio, não por enumeração:** o padrão é não sair, e o que sai precisa estar
escrito.

**Infraestrutura de computação, armazenamento ou rede sob controle do Mekora continua permitida**
`DEC-0022 §8` — a regra é sobre **quem executa o processamento**, não sobre onde o servidor roda.

**Toda exceção exige nova decisão explícita e nomeada** `DEC-0032 §4`, declarando: que conteúdo sai,
para quem, com que finalidade, por quanto tempo o terceiro o retém, e o que acontece se ele for
descontinuado `DEC-0032 §5`.

> **Metadado não é conteúdo, e a fronteira não foi traçada.** Título, autor e formato não são o texto
> do livro — mas uma lista de títulos é um perfil. `DEC-0032` protege conteúdo; metadado está aberto.

### A instrumentação não lê o conteúdo `DEC-0020 §1`

Nada de gravação de sessão sobre a área de pré-visualização, nada de texto saído do reconhecimento,
nada de nome de arquivo em evento. **A escolha da ferramenta é subordinada a isto.**

### A jurisdição `DEC-0031`

**Brasil é a jurisdição-base do V1.** Isso fixa o regime sob o qual o tratamento do conteúdo é
avaliado. **Não escolhe provedor, região de datacenter nem fornecedor** — provedor continua
governado por `DEC-0022 §8` e continua trocável sem reabrir decisão.

---

## O Canvas, como contrato

O Canvas **não é definido por nenhum protótipo tomado por inteiro** `DEC-0030 §3`. É definido por
este contrato, e o protótipo é implementação dele.

**O Canvas deve permitir** `DEC-0030 §5`:

```
trazer nota existente
criar nota solta
mover e posicionar
conectar manualmente
remover da superfície sem apagar a entidade
manter a origem da nota, e abri-la
persistir posição
reutilizar a mesma Connection usada em Notas e Conexões
```

**O Canvas não é** `DEC-0030 §6`: gerenciador da biblioteca; sistema automático de descoberta;
substituto de Notas; substituto de Conexões; requisito do telefone no V1.

> **Duas lacunas de implementação, não de modelo** `DEC-0030` consequência 2: *remover da superfície
> sem apagar* não existe, e *persistir posição* hoje é memória. **Como a posição é persistida** é a
> `B22`, e está aberta.

---

## O que a interface implementa, e sobre que base

**Nada disto está decidido.** A base de implementação da interface é a `A7`, e ela depende de `A2`
(se o backend Python de 112 arquivos fica) e `A9` (se o Kindle por cabo exige capacidade que só um
tipo de cliente tem).

O que existe hoje, e o papel de cada um:

| | papel |
|---|---|
| **Protótipo de Produto do Mekora** | referência funcional e de interação vigente `DEC-0033 §2` |
| `mekora-app` — backend | serviço, e é o ativo a preservar `DEC-0011 §3` |
| `mekora-app` — frontend | legado; roda, não recebe recurso novo, e sai quando a interface nova cobrir importar com validação, acompanhar a conversão até o fim, e enviar ao Kindle `DEC-0011 §2, §6` |
| `mekora-canvas-motion` | fonte exploratória de comportamento, motion, componentes e interface — **não** frontend canônico `DEC-0025 §2` |
| `mekora-experience` | fonte, não candidata descartada `DEC-0017` |

**A integração acontece por contrato de API, não por fusão de repositórios** `DEC-0011 §5`.

---

## As decisões que sustentam este documento

| | |
|---|---|
| `DEC-0011` | Frontend e contrato com a API operacional — §1 emendado pela DEC-0025 |
| `DEC-0016` | Âncora semântica manda, pixel obedece |
| `DEC-0017` | As duas explorações de experiência são fontes |
| `DEC-0018` | Identidade do produto, escopo do MVP e a regra da conta |
| `DEC-0020` | Instrumentação mede a interface, nunca o conteúdo |
| `DEC-0021` | Modelo de conteúdo |
| `DEC-0022` | O Mekora é web-first — §7 emendado pela DEC-0032 |
| `DEC-0024` | Os cinco lugares, e Notas como entidade global |
| `DEC-0025` | O papel do canvas-motion |
| `DEC-0030` | O contrato do Canvas |
| `DEC-0031` | Brasil é a jurisdição-base do V1 |
| `DEC-0032` | O conteúdo do usuário não vai para terceiros |
| `DEC-0033` | O Protótipo de Produto do Mekora |

# Para o Project OS — pendente de filtro

> **Nova consolidação de qualidade — 14/09/2026:** a retrospectiva detalhada das
> rodadas de implementação, incluindo padrões do produto, causas dos erros,
> correções, evidências e protocolo de prevenção, está em
> [`docs/RETROSPECTIVA-DE-IMPLEMENTACAO-E-QUALIDADE-2026-09-14.md`](docs/RETROSPECTIVA-DE-IMPLEMENTACAO-E-QUALIDADE-2026-09-14.md).
> Ela foi adicionada ao projeto como material de entrada para o Project OS sem
> apagar as pendências históricas registradas abaixo.

> **Resolvido em 2026-08-12.** O Erik julgou os itens no chat e eles foram aplicados:
>
> - **item 1** — o repositório entrou em `projects/mekora.json` como `supporting_artifact`
>   `cadernos_de_exploracao`, que era a opção recomendada;
> - **item 3** — `last_reviewed`, `last_reviewed_from` e `current_focus` corrigidos, este último com
>   o critério gravado ao lado em `current_focus_basis`;
> - **item 4** — virou **DEC-0011**; os outros dois candidatos ficaram deliberadamente sem registro,
>   com a razão anotada dentro dela para ninguém reavaliar do zero;
> - **item 5** — a avaliação do DOC.cc ganhou documento próprio em
>   `docs/references/doc-cc-avaliado-2026-08-12.md`, agora incluindo o sistema e não só a tipografia.
>
> Continua aberto o **item 2**: as duas rodadas de 11/08 seguem sem run registrado. Da rodada final
> em diante todo trabalho abriu e fechou run.
>
> O texto abaixo fica como estava, porque é o registro do que foi proposto.

**Nada disto foi escrito no `erik-project-os`.** É um rascunho para você aprovar item a item no chat.
Os itens são independentes: dá para aceitar uns e recusar outros sem quebrar os demais.

- Projeto: `mekora`
- Repositório de trabalho: `github.com/ErikAbner/mekora` (privado)
- Revisões desta rodada: `25a2c5e`, `3755986`
- Máquina: Windows (`C:\Users\erikc\mekora`)
- Data: 2026-08-11

---

## 1. Registro do repositório — o mais urgente

**O que é:** o `github.com/ErikAbner/mekora` não consta em `projects/mekora.json`. Os três repositórios
declarados são `mekora-app`, `mekora-experience` e `mekora-canvas-motion`.

**Por que importa:** a DEC-0009, ponto 3, diz que ao encontrar repositório fora de `projects/` ele deve ser
cadastrado **antes** de se trabalhar nele. Trabalhei nele sem cadastrar. Não é dano — o repositório tem
remoto privado desde o começo, então o risco de cópia única que a DEC-0009 existe para prevenir nunca
ocorreu. É descumprimento de processo, não perda.

**Proposta:** entrar em `supporting_artifacts` como `canonical: false`, não como quarto `repository`.

**Por que assim:** o `mekora.status.md` já registra a pendência de que *"são duas explorações de experiência
coexistindo, e nenhuma decisão registrada diz qual continua"*. Entrar como `repository` criaria uma terceira
candidata e pioraria essa pendência. Entrar como artefato de apoio declara o oposto: não disputa o lugar de
base de experiência. É o mesmo tratamento que o `flow_prototype` já tem no manifesto.

**Se você recusar:** a alternativa honesta é não registrar e tratar este repositório como descartável — mas
aí vale decidir isso explicitamente, porque hoje ele tem três documentos de exploração e nenhum status.

---

## 2. Runs não registrados

Duas rodadas de trabalho hoje, nenhuma com `project-os start` / `close`:

| Rodada | Workflow aplicável | Resultado |
|---|---|---|
| Densidade das notas de margem | `visual-exploration` | modelo corrigido, decisão movida para *provável* |
| Grid editorial de quatro faixas | `visual-exploration` | alternativa implementada, decisão em *candidato* |

Os dois cumprem o `definition_of_done` do `visual-exploration.json`: a pergunta está explícita, as simulações
estão identificadas como tais, a exploração é navegável, os resultados foram verificados por medição, e há
decisão registrada sobre o próximo passo — só que **dentro do protótipo**, na aba Decisões, e não no
Project OS.

**Proposta:** registrar retroativamente, ou aceitar que exploração visual não gera run e ajustar a
expectativa. Prefiro a segunda hipótese só se você disser que runs são para trabalho no app operacional.

---

## 3. Manifesto desatualizado

| Campo | Está | Deveria |
|---|---|---|
| `last_reviewed` | `2026-08-04` | 2026-08-11 |
| `last_reviewed_from` | `mac-mini-erik` | esta revisão veio do Windows |
| `current_focus` | "concluir o mapa de capacidades" | o mapa foi concluído em 2026-08-02 |

O `current_focus` descreve trabalho já feito. Não sei qual é o foco correto agora — isso é decisão sua, não
inferência minha.

---

## 4. Candidatos a decisão registrada

Três resultados desta rodada têm cara de DEC, mas **nenhum deve virar decisão sem você decidir**. Listo com
a força de evidência que cada um tem hoje:

**a) Âncora semântica manda, pixel obedece** — evidência forte. O progresso ficou invariante em 43% através
de seis mudanças de tipografia e uma de viewport, e em 66% através da troca de grid, que altera a altura do
documento em 190px. É a mais próxima de merecer registro, porque é regra de arquitetura e não preferência
visual: qualquer implementação futura de leitor herda ou quebra isso.

**b) Breakpoint derivado em vez de herdado** — evidência média. A regra (60 caracteres de coluna + gutter +
40 de nota + respiro) produz 854px no corpo 16 e 1004px no corpo 21. Funciona, mas os mínimos de 60 e 40
caracteres são escolha minha baseada em Bringhurst, não medição com gente.

**c) Notas de margem como direção do desktop** — evidência fraca para decisão. O teste mostrou que margem e
painel entregam a mesma quantidade sob densidade (5 notas) e diferem no que fazem com o excedente. Isso é
bom para escolher, mas ninguém leu um capítulo inteiro em nenhum dos dois. Recomendo **não** registrar.

---

## 5. O que foi recusado, e por quê

Registro aqui para ninguém reavaliar do zero — mesmo espírito do `ferramentas-avaliadas-2026-08-05.md`.

| Vindo do doc.cc | Decisão | Razão |
|---|---|---|
| Medida de 50 caracteres | recusado | ritmo de ensaio de 8 min, retorno de linha a cada ~8 palavras; cansa em 300 páginas |
| Entrelinha 1,30 no corpo | recusado | mesma razão |
| Full-bleed a cada 3 parágrafos | recusado | destruiria o fluxo de leitura longa; o bleed ficou só na fronteira de capítulo |
| Proporção 2,4× para o bleed | não transportado | é consequência da coluna estreita do DOC (575px), não constante do sistema |
| Grid de quatro faixas | adotado como alternativa | ver item 4 |
| Recuo de parágrafo em vez de espaço | medido, não implementado | fora do escopo autorizado nesta rodada |
| Papéis tipográficos rígidos (serifa = livro, grotesca = aparato) | medido, não implementado | idem |

---

## 6. Nota sobre as skills

O `ferramentas-avaliadas-2026-08-05.md:67` lista dezessete skills em `~/.claude/skills` — `emil-design-eng`,
`apple-design`, `prototype`, os oito do GSAP e as de animação. Esse `~` é o Mac. **Nenhuma existe na máquina
Windows**, e o `impeccable` vive dentro do `mekora-canvas-motion`, que também só está lá.

Não é lacuna a corrigir às pressas: essas skills são de gesto, spring, sheet e animação — servem ao
`canvas-motion`, não a trabalho de grid e texto corrido. Fica registrado para não se procurar de novo.

---

## Onde ver o que foi feito

- Protótipo: `prototipo.html` → botão **◇ lab** (canto inferior direito) → aba **● Novidades**
- Sem abrir o lab: **Aa** no leitor → *Em teste · grid* e *Em teste · notas*
- Números medidos: abas **Grid**, **Densidade** e **Decisões** do lab
- Cenários: aba **Cenários**, prefixos `M` (densidade) e `G` (grid)

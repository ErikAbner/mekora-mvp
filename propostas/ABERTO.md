# Aberto — as 55 perguntas, classificadas por momento

**Data:** 2026-08-20
**Estado:** rascunho — este documento ainda não é canônico
**Fonte:** as nove decisões aceitas em 2026-08-20, seção "O que esta decisão NÃO decide" de cada uma.
Elas vivem em `erik-project-os/decisions/`, como DEC-0021 a DEC-0029.

Esta é a fila. Não é registro: um item sai daqui quando vira decisão, e a linha some. Se este
arquivo começar a ter estado próprio — "aceito", "rejeitado" —, virou uma segunda `decisions/` e
deve ser cortado.

## Por que classificar por momento, e não responder

Documentação melhor organizada não pode virar paralisia de especificação. Nem toda pergunta aberta
bloqueia trabalho, e tratá-las como se bloqueassem produz o efeito oposto do pretendido.

```
A   antes da arquitetura          decide forma de sistema; segurar é mais barato que refazer
B   antes da feature afetada      não impede outras frentes; impede aquela
C   antes do lançamento           pode ser decidido durante a construção, não pode ficar sem resposta na V1
D   backlog técnico               pode ser decidido durante a implementação, por quem implementa
```

**Nenhuma delas bloqueia a escrita do PRD.** As que bloqueavam foram respondidas nesta rodada.

| | quantas |
|---|---:|
| **A** — antes da arquitetura | 8 |
| **B** — antes da feature afetada | 20 |
| **C** — antes do lançamento | 15 |
| **D** — backlog técnico | 12 |

---

## A — antes da arquitetura

Decidem forma de sistema. Errar aqui custa refação, não ajuste.

| | pergunta | origem |
|---|---|---|
| **A1** | **Onde a infraestrutura fica** — região, provedor, jurisdição. É a única de todas as 55 cuja resposta muda obrigação legal, e não só implementação. | DEC-0022 |
| **A2** | **Como a tradução própria é construída.** A regra é o limite; a arquitetura que a cumpre não existe, e pode ter custo relevante. | DEC-0022 |
| **A3** | **Se algum processamento além da tradução pode usar serviços externos.** O item 7 nomeia tradução e IA. OCR, extração e geração de capa não foram tratados. | DEC-0022 |
| **A4** | **O formato do identificador de conteúdo.** UUID foi exemplo, não especificação. | DEC-0021 |
| **A5** | **Como relacionar duas importações do mesmo título.** A norma proíbe colisão; não define agrupamento, metadado de edição nem deduplicação. | DEC-0021 |
| **A6** | **Qual é, nominalmente, a fonte de design vigente.** Deliberadamente não nomeada, porque podem coexistir design system em código, arquivo de design e implementação. | DEC-0025 |
| **A7** | **Sobre qual base a interface será implementada.** Separada do desenho pela DEC-0025, e não respondida. | DEC-0025 |
| **A8** | **O escopo por domínio do `baseline_revisions`.** Hoje todo run carimba todos os repositórios, independente do que tocou. | DEC-0026 |

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
| **B6** | O que acontece com uma nota órfã depois da exclusão da origem | Notas + exclusão | DEC-0021 |
| **B7** | O que acontece com o trabalho feito antes de a conta existir | primeiro uso + conta | DEC-0022 |
| **B8** | Como Relacionadas, Trilhas e Assuntos se apresentam | Conexões no telefone | DEC-0023 |
| **B9** | Se o Mapa ganha alguma representação no telefone | Conexões no telefone | DEC-0023 |
| **B10** | Como a escolha de modo de leitura é lembrada — conta, aparelho ou livro | Reader | DEC-0023 |
| **B11** | O tablet, feature a feature | tudo no tablet | DEC-0023 |
| **B12** | Quais breakpoints existem além de 390px, e o que "tablet" significa em números | design system | DEC-0023 |
| **B13** | Como os cinco lugares se apresentam no telefone | navegação mobile | DEC-0024 |
| **B14** | Se Mesa é um lugar como os outros, ou a casa que a marca abre | navegação | DEC-0024 |
| **B15** | Que vistas Notas tem, e como se chama a partição hoje rotulada "Soltas" | Notas | DEC-0024 |
| **B16** | Como a visão filtrada do livro se comporta quando a origem foi excluída | Notas dentro do livro | DEC-0024 |
| **B17** | O destino do `mekora-canvas-motion` daqui em diante | frente de implementação | DEC-0025 |
| **B18** | O destino do `mekora-experience` — o conflito DEC-0011 §4 × DEC-0017 | reconciliação | DEC-0025 |
| **B19** | Se `prototipo-mesa.html` é a fonte do desenho aprovado ou um instrumento de exploração | governança do desenho | DEC-0025 |
| **B20** | Que eventos são coletados, com que granularidade | instrumentação | DEC-0029 |

---

## C — antes do lançamento

Podem ser decididas durante a construção. Não podem ficar sem resposta na V1.

| | pergunta | origem |
|---|---|---|
| **C1** | Que criptografia é usada, e se o produto tem acesso ao conteúdo em claro durante o processamento | DEC-0022 |
| **C2** | O que é "processo mínimo necessário", e como o acesso humano interno é auditado e por quem | DEC-0022 |
| **C3** | Por quanto tempo o original temporário sobrevive entre a falha e o descarte | DEC-0021 · DEC-0022 |
| **C4** | **Prazo exato de retenção de sessões anônimas.** A DEC-0018, emendada em 20/08, fixa que sem conta os dados são temporários — e deliberadamente não fixa o prazo, porque depende das perguntas de privacidade e infraestrutura ainda abertas | DEC-0018 |
| **C5** | Autenticação — a AUTH-001 continua pendente e proíbe desenhar | DEC-0022 |
| **C6** | Se há consentimento para a coleta de uso, e como é pedido | DEC-0029 |
| **C7** | Por quanto tempo os eventos coletados são mantidos | DEC-0029 |
| **C8** | Qual ferramenta de instrumentação é usada, e se é própria | DEC-0029 |
| **C9** | Quando as telas passam a ser efetivamente verificadas a 390px | DEC-0023 |
| **C10** | A migração do acervo e das notas existentes para identidade estável | DEC-0021 |
| **C11** | Que estado cada uma das 19 DECs recebe além da normalização mecânica | DEC-0027 |
| **C12** | O `role` literal de cada repositório existente | DEC-0026 |
| **C13** | Quando a máquina Windows é efetivamente zerada | DEC-0028 |
| **C14** | O destino do `artefato-mekora.html`, 2,87 MB versionados por ausência de regra | DEC-0028 |
| **C15** | Quando a V1 é lançada | DEC-0029 |

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

---

## Três exemplos de por que a classificação importa

**A região da nuvem** (A1) não impede desenhar o Reader. Mas é `A`, e não `C`, porque a jurisdição
muda obrigação legal e refazer depois é caro.

**O algoritmo do identificador** (A4) não impede construir a Estante, desde que o contrato já diga
"identidade estável, independente do título". Continua sendo `A` porque a escolha atravessa
persistência, notas, deduplicação e migração.

**Como a preferência paginação/rolagem é persistida** (B10) não bloqueia o PRD nem a arquitetura.
Bloqueia o Reader, e só ele.

## Uma que se responde sozinha

**D1, a ordem dos cinco lugares**, é o melhor caso do que a DEC-0029 destrava. Ela não precisa de
opinião: com a V1 observável, transições como `Estante → Notas`, `Reader → Notas` e
`Conexões → Canvas` viram medida. A ordem deixa de ser preferência de quem desenha e passa a ter
evidência — e é por isso que ficou deliberadamente aberta.

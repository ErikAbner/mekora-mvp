# Mekora — o produto

**Estado:** vigente
**Última revisão:** 2026-08-21

> **Este documento descreve o estado vigente.** Histórico, alternativas rejeitadas e evolução
> normativa pertencem às DECs e à reconciliação, e **não são repetidos aqui**.
>
> Cada regra aponta a decisão que a sustenta. Onde este documento e uma DEC divergirem, **a DEC
> vale** — este documento está errado e é ele que se corrige.

---

## O que o Mekora é

**O Mekora recebe o material que uma pessoa quer ler, entrega esse material legível, e guarda o que
ela pensou enquanto lia.**

São três coisas, e a terceira é a que o distingue: a maioria das ferramentas do gênero para na
primeira ou na segunda. O Mekora trata **o que a pessoa escreveu como patrimônio dela**, não como
subproduto do arquivo — a ponto de uma nota sobreviver à exclusão do livro que a originou
`DEC-0021 §15`.

O produto se chama **Mekora**. "Makora" é erro de digitação, e não é variante `DEC-0018`.

## Como se usa, do início

```
VISITANTE
  envia arquivo  →  conversão  →  validação  →  abre e lê o resultado
                                                     ↓
                                          "Salvar na minha Estante"
                                                     ↓
                                              criar conta / entrar
```

**Sem conta:** enviar, converter, ver o resultado e ler, naquela sessão.

**Com conta:** biblioteca persistente, sincronização, notas permanentes, Canvas, histórico entre
aparelhos e Conexões persistentes.

> **A conta não é necessária para experimentar o fluxo inicial e receber o primeiro valor do
> Mekora. Ela passa a ser necessária para persistência, sincronização e continuidade.**
> `DEC-0018`

A conta é o que transforma uma conversão temporária em patrimônio persistente da pessoa. Sem ela, os
dados são temporários — **e o prazo de retenção de sessão anônima ainda não está fixado**
(`ABERTO.md`).

## Os cinco lugares, e os quatro verbos

O produto tem cinco lugares: **Mesa, Estante, Notas, Canvas e Conexões** `DEC-0024 §1`.

Eles não são cinco telas escolhidas por gosto. Cada verbo do uso tem um artefato próprio, e é isso
que os separa:

```
LER        →  destaque
PENSAR     →  nota
ORGANIZAR  →  canvas
DESCOBRIR  →  conexões
```

| | o que é |
|---|---|
| **Mesa** | onde o trabalho chega e o que precisa de você aparece |
| **Estante** | a biblioteca — o que está guardado |
| **Notas** | espaço de trabalho **global**: notas por livro, notas soltas, ideias, revisão, origem, edição |
| **Canvas** | organização espacial deliberada do conhecimento, feita pela pessoa |
| **Conexões** | descoberta de relação a partir do que já existe |

**A regra que separa os dois últimos**, e que vale no modelo e não só na explicação:

> **Canvas organiza. Conexões descobre.** `DEC-0030 §2`

Uma linha puxada à mão no Canvas vira **exatamente o mesmo objeto** que aparece em "Você ligou"
dentro de uma nota. Não há relação de Canvas e relação de nota: há relação, e duas maneiras de fazer
uma.

**Notas é entidade global, não aba de outro lugar** `DEC-0024 §5`. Dentro de um livro não existe um
segundo sistema de notas — o que aparece ali é a mesma Notas, filtrada por aquele livro `DEC-0024 §6`.

**"Cinco lugares" é arquitetura de informação, não layout.** Não significa cinco botões
permanentemente visíveis em toda tela e todo aparelho, e a ordem entre eles não está decidida
`DEC-0024 §8-9`.

## O que entra na V1

**MVP e V1 são a mesma coisa:** a primeira versão pública entregue a usuários reais `DEC-0029 §1`.

```
preparação e biblioteca      Estante, Canvas e Conexões entram — não são fase dois   DEC-0018
Notas                        um dos cinco lugares                                     DEC-0024 §7
quadrinho e mangá            conteúdo ingerível e legível na primeira versão          DEC-0021 §2
tradução de texto            funcionalidade principal — para documentos textuais      DEC-0018
mobile                       faz parte do V1                                          DEC-0023 §1
instrumentação               requisito da versão, não fase posterior                  DEC-0029 §2
```

**Tradução fica de fora para quadrinhos e mangás**, onde a eficiência ainda não foi comprovada
`DEC-0018`. É a *tradução* que fica de fora, não o formato.

### A V1 nasce observável

Uma V1 que funcione e não meça **não cumpre a decisão** `DEC-0029 §2`. Ela nasce preparada para
responder, com dado e não com opinião: onde as pessoas abandonam, o que usam, o que nunca usam, em
que etapa a conversão quebra, onde o Reader perde a pessoa, e que caminhos percorrem entre os cinco
lugares `DEC-0029 §3`.

**Com quatro limites que são regra, não intenção** `DEC-0020`:

1. Mede a **interface**, nunca o conteúdo. Ferramenta que grave a tela inteira sem poder desligar por
   região está reprovada, independentemente da qualidade.
2. A pessoa é informada sem ser bloqueada.
3. Consentimento no momento em que a frase tem referente — junto da primeira pendência respondida,
   não num banner de entrada que só ensina a clicar em aceitar.
4. **Ter dado não autoriza fingir certeza.**

## Em que aparelhos, e com que promessa

**A regra é paridade de valor, não paridade de interface** `DEC-0023 §3`:

> **Responsividade não significa reproduzir a mesma representação em todos os dispositivos. O
> significado é preservado; a representação pode mudar.**

Disso decorre que **uma feature ausente num aparelho não é, por si só, defeito** `DEC-0023 §2`.

| | |
|---|---|
| **Em todos os aparelhos** | Mesa · Estante · Reader · Busca · Destaques · Notas · Marcadores · Para revisar |
| **A 390px** | uma dessas indisponível ou inoperante **é falha de V1** `DEC-0023 §4` |
| **Canvas** | desktop-only no V1 — forçá-lo a 390px produziria experiência pior que a ausência `DEC-0023 §5` |
| **Conexões** | existe em todo aparelho; no telefone como **Relacionadas · Trilhas · Assuntos**, em listas, sem grafo `DEC-0023 §6` |
| **O Mapa** | pode permanecer desktop-only, e a ausência não conta como feature faltando `DEC-0023 §7` |
| **Tablet** | não é terceira especificação rígida; decide-se feature a feature, sem herança automática `DEC-0023 §8` |

### O Reader

Oferece **os dois modos**: paginado e rolagem contínua `DEC-0023 §9`. **Paginado é o padrão** para
livros textuais — unidade espacial estável, menos deslocamento acidental, mais perto do modelo mental
de livro `DEC-0023 §10`. Rolagem contínua é escolha da pessoa, **e a escolha é lembrada**
`DEC-0023 §11`.

A posição de leitura é guardada e restaurada por **âncora semântica** — parágrafo, capítulo, trecho —
e **nunca** por pixel, percentual de rolagem ou altura de documento `DEC-0016`.

## O que o produto promete sobre si mesmo

Estas não são preferências de tom. São regras, e um produto que as quebre está com defeito.

**Sobre o que ele sabe:**

- **Confiança só com medição.** O produto só declara confiança quando existe contagem verificável
  — *"2 de 120 páginas têm largura dupla"*. Sem medição, ele **pergunta, e diz que pergunta porque
  não sabe** `DEC-0019 §7`.
- **Progresso honesto.** Barra só em etapa contável; nas demais, a etapa e o tempo decorrido. **Nunca
  porcentagem inventada** `DEC-0019 §8`.
- **Uma conversão pode terminar com avisos.** São três resultados, não dois — e "concluído com
  avisos" existe para que **o produto não finja que foi perfeita** `DEC-0021 §10`.

**Sobre o que ele faz com o que é seu:**

- **O conteúdo não vai para terceiros.** Nada do que a pessoa envia é mandado a serviço externo de IA
  ou de processamento de conteúdo — tradução, OCR, extração, conversão, sumarização, embeddings,
  classificação ou capa. Toda exceção exige decisão explícita e nomeada `DEC-0032`.
- **A instrumentação nunca lê o conteúdo** `DEC-0020 §1`.
- **Arquivar e excluir são atos diferentes**, e as notas que a pessoa escreveu **sobrevivem à
  exclusão por padrão**, com a origem marcada como removida `DEC-0021 §14-15`.

**Sobre como ele pede as coisas:**

- **Exceção antes de configuração.** A pessoa é chamada quando há dúvida real, uma de cada vez, com a
  evidência à vista. Quando não há exceção, não aparece nada `DEC-0019 §4`.
- **Guiado não tem controle nenhum.** Ele mostra o que foi encontrado, o que vai ser feito e o que
  precisa de você. Cada decisão automática é uma linha de texto com "alterar", que leva ao
  Personalizado — **onde nenhum campo nasce vazio** `DEC-0019 §3`.
- **Etapa é estado, não página.** Análise, Preparação, Conversão e Exportar não são páginas
  navegáveis: é o item mudando de estado, na mesma tela `DEC-0019 §2`.
- **Não existe área de Configurações** `DEC-0019 §1`.

## O que fica de fora, e por quê

| | razão |
|---|---|
| **Tradução de quadrinho e mangá** | eficiência não comprovada `DEC-0018` |
| **Original / Adaptado / Comparar** | deixou de ser arquitetura do produto: não há original persistido para comparar `DEC-0021 §5, §7` |
| **PDF paralelo ao EPUB na biblioteca** | um item não carrega duas representações concorrentes do mesmo conteúdo `DEC-0021 §6` |
| **Canvas no telefone, no V1** | `DEC-0023 §5` |

## Onde este produto é operado

**A jurisdição-base do V1 é o Brasil** `DEC-0031 §1`. Isso fixa o contexto legal e de dados sob o
qual o produto se avalia; **não escolhe provedor, região de datacenter nem fornecedor** — provedor
continua trocável sem reabrir decisão `DEC-0031 §2`, `DEC-0022 §8`.

---

## As decisões que sustentam este documento

| | |
|---|---|
| `DEC-0016` | Âncora semântica manda, pixel obedece |
| `DEC-0018` | O produto se chama Mekora, e o MVP inclui a biblioteca |
| `DEC-0019` | Arquitetura de experiência |
| `DEC-0020` | Instrumentação mede a interface, nunca o conteúdo |
| `DEC-0021` | Modelo de conteúdo |
| `DEC-0022` | O Mekora é web-first |
| `DEC-0023` | Mobile no V1 com paridade seletiva |
| `DEC-0024` | Os cinco lugares |
| `DEC-0029` | MVP e V1 são a mesma versão, e ela nasce observável |
| `DEC-0030` | O Canvas vigente é definido pelo contrato |
| `DEC-0031` | Brasil é a jurisdição-base do V1 |
| `DEC-0032` | O conteúdo do usuário não vai para terceiros |

Elas vivem em `erik-project-os/decisions/`.

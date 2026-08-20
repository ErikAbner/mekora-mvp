# O artefato publicado, visto seis vezes em sete dias

> **Não classificado. Não canônico.** Estar aqui não torna nada uma decisão vigente.
> Ver [`../NOTA.md`](../NOTA.md) para a regra que vale em todo o diretório `resgate/`.

## Origem

| | |
|---|---|
| **Caminho original** | `C:\Users\erikc\Downloads\screencapture-claude-ai-code-artifact-1f9df6ef-*.png` |
| **Data das capturas** | 14 a 20 de agosto de 2026 |
| **Data do resgate** | 20 de agosto de 2026 |
| **Origem preservada** | sim — os arquivos continuam em `Downloads` |
| **Git** | **nenhum.** Estavam fora de qualquer repositório |

Todas do mesmo artefato publicado, id `1f9df6ef-59b5-495c-87e4-3dd53dbc56c3`. Nomes de origem
preservados sem renomear, apenas com o prefixo do id removido.

## Por que capturas importam quando o código está versionado

O Git guarda o **fonte**. O artefato publicado é outra build, é mutável, e é republicado no
mesmo endereço a cada rodada — a versão anterior deixa de existir. O guardrail do projeto diz
exatamente isto:

> "Preservar capturas do estado anterior antes de corrigir defeito visual: depois do conserto, o
> antes deixa de existir."

Estas seis imagens são a única prova de como o produto **parecia** em seis momentos. Não são
deriváveis de nada.

## O que cada uma mostra

Verificado abrindo cada imagem, uma a uma, em 20/08.

### `2026-08-14-14_29_50.png`

Título da aba: *"Mekora · protótipo navegável"*. Barra com **quatro lugares**: Mesa, Estante,
Canvas, Conexões. **Notas ainda não existe.** A Mesa é "Sua mesa — o que chegou, o que está sendo
preparado e o que já pode ser lido", com os três números (2 precisam de você, 2 em preparo, 14 na
estante), "Precisa de você", "Continue de onde parou" e "Ficaram prontos".

**O detalhe que faz esta captura valer:** a barra de depuração no rodapé diz
`mesa C · workspace`. O run de 14/08 às 17h33 — três horas depois desta captura — registra a
recusa da Mesa C, chamando-a de *"o dashboard que a direção editorial recusa"*. Esta imagem é o
único registro visual de uma variante que foi rejeitada no mesmo dia.

### `2026-08-18-15_50_00.png`

A página do livro **longa**. Diário 02, com capa fotográfica própria, e as seções: "De onde veio",
"Ficha", "Perguntas que guiam esta leitura" (cinco, com o selo "4 vieram dos capítulos"),
"O que você marcou" (4 marcados · 1 com nota · 2 sob pergunta), "Suas ideias" e "Só destacado".
Ainda quatro lugares na barra.

Registra também um defeito que a auditoria apontou: a Ficha diz *"Sumário: 14 capítulos,
navegáveis"* enquanto o código tem `CAPS.length === 4`.

### `2026-08-18-16_40_41.png`

**Cinquenta minutos depois, a mesma página já encurtada.** Isto corrige o que a auditoria tinha
registrado: o encurtamento aconteceu em 18/08, não em 19/08.

A capa fotográfica deu lugar à capa **gerada pelo sistema** — rótulo "Arquivo", com o texto
"relatório de pesquisa sem capa, gerado automaticamente pelo sistema Mekora". Apareceu o aviso de
defeito *"Três páginas ficaram sem texto · ver as páginas"*. E os destaques passaram a ser
organizados **por pergunta** (02, 03), com uma seção "Solto no livro" para o que não tem âncora.

### `2026-08-19-09_45_39.png` e `2026-08-19-09_45_55.png`

**Idênticas byte a byte**, md5 `4fb4455a6027291238289ff3adbb9ed4`. Duas capturas do mesmo estado,
com 16 segundos de diferença. As duas foram mantidas porque a instrução era preservar os originais
sem modificar — são 6 estados distintos em 7 arquivos.

O encurtamento foi mais fundo: a seção agora se chama "O que ficou", com "2 marcados · 1 com nota ·
6 anotações", e o agrupamento por pergunta deu lugar a uma lista mais plana. Ainda quatro lugares.

### `2026-08-20-10_44_58.png`

Título da aba mudou para *"Mekora · Mesa e preparação"*, e a barra tem **cinco lugares** — Notas
entrou entre Estante e Canvas. É a mudança que contradiz a DEC-0019 e que está registrada como a
pergunta **P3** do relatório de auditoria.

A tela é Notas, com a partição "Todas 10 · De livros 9 · Soltas 1 · Para revisar 0" e as notas
agrupadas por livro (Diário 02, Malha Urbana, Estudo de Viabilidade, Sem livro).

Duas coisas que esta imagem prova melhor que qualquer texto:

- **Conexões aparecendo dentro de Notas**, não como tela separada: um cartão no topo diz
  *"Talvez exista uma conexão — três notas suas, em dois livros diferentes, usam as mesmas
  palavras"*, com as ações **Dar um nome** e **ignorar**, e um "como cheguei aqui ▾". É a decisão
  "o Mekora não nomeia o que descobre" funcionando na tela.
- **A regra dos destaques sem nota, escrita no rodapé:** *"2 trechos marcados sem nota — eles ficam
  no livro, e não aqui."*

### `2026-08-20-10_45_23.png`

Vinte e cinco segundos depois, a tela **Conexões**: *"Três direções possíveis para o mesmo
material. Elas respondem a perguntas diferentes — não são três aparências da mesma tela."*
Com A · Mapa, B · Trilhas, C · Territórios, e a distinção Coleção / Território / Conexão.

**O detalhe mais útil desta captura:** a navegação da seção já diz `A · Mapa`, enquanto o título
do bloco logo abaixo ainda diz `A · MAPA NEURAL`. A imagem pegou a renomeação pela metade — o run
de 20/08 registra *"Mapa neural virou Mapa: neural é palavra que o próprio projeto proibiu na
primeira rodada"*, e aqui está o momento em que a troca estava incompleta.

Traz também o argumento contra o mapa como porta: *"Com 10 notas ele já está quase cheio; com
duzentas vira uma nuvem. Ele mostra que existe relação sem nunca dizer qual."* É a base da decisão
— declarada e ainda não executada — de que o mapa não é a entrada de Conexões.

## O que estas seis imagens contam, juntas

```
14/08   quatro lugares · Mesa C ativa · Notas não existe
18/08   página do livro longa
  ↓ 50 minutos
18/08   encurtada · capa gerada · defeito à vista · destaques por pergunta
19/08   encurtada de novo · "O que ficou" · lista plana
20/08   CINCO lugares · Notas entrou · Conexões aparece dentro de Notas
20/08   Conexões em três direções · renomeação de "Mapa neural" pela metade
```

Para a reconciliação, isto dá o que um run não dá: **o estado observado**, com data e hora, contra
o que foi decidido. Onde os dois divergem, a imagem diz qual chegou primeiro.

## Fora do escopo deste resgate

Existe em `Downloads` uma oitava captura, `screencapture-claude-ai-code-artifact-aa94397e-…`,
de 20/08 às 13h28. Ela é do **relatório de auditoria** publicado nesta rodada, não do produto.
Não foi preservada aqui: é reproduzível a partir do artefato, que segue publicado.

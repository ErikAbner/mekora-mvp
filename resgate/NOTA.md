# Resgate — material preservado, ainda não classificado

Este diretório existe por um motivo só: **tirar material insubstituível de lugares onde ele
pode sumir sem aviso.** Nada aqui foi classificado, e nada aqui tem autoridade.

## A regra que vale neste diretório

> Estar aqui não torna nada uma decisão vigente. Este material é anterior à consolidação e, em
> boa parte, descreve um produto que mudou de nome, de direção e de premissa desde então.

Estes arquivos **não são especificação**. São evidência histórica. Quem for escrever
`PRODUTO.md`, `SISTEMA.md` ou `DESIGN-SYSTEM.md` pode citá-los como origem de uma ideia, nunca
como fonte de uma regra em vigor. A autoridade de cada item só se decide na fase de
reconciliação, comparando com as decisões registradas e com a implementação atual.

O caminho é: **resgatar → preservar → classificar → só então decidir autoridade.**
Hoje estamos no segundo passo.

### Uma distinção que evita confusão ao ler este material

```
AUTORIDADE NORMATIVA          "como o produto deve ser"
  DEC  →  documentação canônica

ESTADO OBSERVADO              "como o produto está hoje"
  implementação  →  testes  →  protótipos
```

Quando uma DEC vigente diz uma coisa e a implementação faz outra, **isso não é conflito de
autoridade — é um bug.** Quando uma DEC vigente diz uma coisa e um protótipo daqui diz outra,
**isso não é disputa — é material histórico incompatível.** Nenhum arquivo deste diretório
disputa com uma DEC. Ele registra o que já se pensou.

## Regras seguidas neste resgate

Para cada item: original preservado sem modificação, estrutura de diretórios mantida, origem e
data registradas, hash gerado, e **a origem não foi apagada nem movida**. Nenhum `.gitignore` de
origem foi alterado e nada foi forçado para o histórico de nenhum repositório auditado.

`HASHES.txt` cataloga os 47 arquivos. Para conferir a integridade a qualquer momento:

```bash
md5sum -c HASHES.txt
```

Verificação feita no dia do resgate: manifesto íntegro, cópias idênticas às origens byte a byte,
bundle Git clonável com história completa, 22/22 PNGs com assinatura válida, JavaScript com
sintaxe válida, JSON parseável e zip legível.

## O que está aqui

### [`2026-07-24-kindle-local/`](2026-07-24-kindle-local/) — os dois relatórios de teste

118 KB resgatados de `C:\Users\erikc\.codex\attachments\`, o cache de anexos do Codex — cujo
índice tem um campo `pendingRemovalPaths`, ou seja, os arquivos viviam numa fila de remoção por
design. Achados por varredura de conteúdo, não por nome.

Contêm evidência marcada (`[V]` verificado, `[C]` lido no código, `[H]` hipótese, `[R]`
recomendação), conformidade WCAG 2.2 AA item a item, execução real em Chromium headless a cinco
viewports incluindo **390**, três direções de arquitetura com wireframe desktop e mobile, e um
fluxo de dez telas com microcópia final.

### [`2026-07-24-kindle-local-repo/`](2026-07-24-kindle-local-repo/) — o repositório sem remoto

História Git completa em `kindle-local.bundle` (`git clone kindle-local.bundle`), mais os
arquivos **gitignored** preservados ao lado — que o `.gitignore` de origem excluía e que nenhum
`git push` levaria. Entre eles, a versão mais avançada que o Kindle Local chegou a ter.

### [`2026-07-31-mekora-library-lab/`](2026-07-31-mekora-library-lab/) — o primeiro "Mekora"

O protótipo "Importar do Kindle" e os fontes do library-lab, com a Estante 3D em WebGL e o Canvas
com pan e zoom. Nunca esteve em Git. Contém a premissa local-first como promessa exibida ao
usuário — o antes de uma decisão que foi revogada em 10/08.

**Atenção:** o caminho de origem é homônimo de um repositório que existe no Mac com conteúdo
diferente. Verificar por conteúdo, nunca por nome. Detalhes no `LEIA.md` de lá.

### [`2026-08-10-exploracao-card/`](2026-08-10-exploracao-card/) — o raciocínio do caderno 01

O documento-fonte que virou `caderno-01-bancada-do-card.html` seis horas depois. Guarda a tabela
de arquitetura da informação, o diagnóstico do card em quatro escalas e o enunciado do problema —
nenhum dos três presente no caderno.

### [`2026-08-20-kindle-painel-leitura/`](2026-08-20-kindle-painel-leitura/) — 22 capturas + índice

Capturas do painel de leitura do próprio Kindle, usadas como referência competitiva, com o run
que elas fundamentaram preservado ao lado como índice. Sem ele, são 22 PNGs sem assunto.

## Uma prova de proveniência que fechou sozinha

O relatório `relatorio-testes-v2-e-direcoes.md` identifica o material que analisou pelo hash:
*"index.html v2 (24,6 KB) — MD5 `8c2ea1bd…`"*. O arquivo resgatado em
`2026-07-24-kindle-local-repo/gitignored/index.html` tem md5
`8c2ea1bd2467ded836345f0b745324aa`.

Os dois resgates vieram de lugares diferentes, por caminhos diferentes, e se identificam. O
relatório e o artefato que ele avalia estão os dois aqui, verificáveis um contra o outro.

## Um padrão a procurar na reconciliação

Vale marcar, ao ler este material, os casos de:

```
ideia antiga  →  esquecida  →  redescoberta de forma independente
```

Sugestão de marca durante a reconciliação: **`PRINCÍPIO RECORRENTE`**. Se uma regra foi
descoberta em julho e de novo em agosto por caminhos separados, isso não a torna
automaticamente correta — mas é evidência forte de que ela emerge de necessidade real do produto,
e não de preferência do momento.

Um caso já confirmado: a disciplina de evidência marcada existia em 24/07 nos relatórios acima e
foi reinventada em 12/08 como *"confiança só quando existe medição"*.

### [`2026-08-14-a-20-artefato-publicado/`](2026-08-14-a-20-artefato-publicado/) — seis estados da interface

O artefato publicado é mutável e republicado no mesmo endereço: a versão anterior deixa de
existir, e o Git guarda o fonte, não o render. Estas capturas são a única prova de como o produto
parecia em 14, 18, 19 e 20/08 — incluindo a Mesa C três horas antes de ser recusada, o
encurtamento da página do livro acontecendo em cinquenta minutos, e a barra passando de quatro
para cinco lugares. Cada imagem foi aberta e descrita uma a uma.

## O que continua fora, e por quê

- **Duplicatas verificadas por hash**, que não precisam de resgate: `mekora-exploracao.zip`,
  `erik-project-os-main.zip`, `tipography-cards-reference/` e os builds do library-lab.
- **Os três repositórios do Mac**, que têm remoto e não dependem desta máquina.

---

*Criado em 20 de agosto de 2026, na fase de preservação da consolidação do Mekora. Nenhum arquivo
existente foi movido, renomeado ou alterado para criar este diretório.*

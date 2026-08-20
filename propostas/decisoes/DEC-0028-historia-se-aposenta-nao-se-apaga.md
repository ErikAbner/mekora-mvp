# DEC-0028 — História se aposenta, não se apaga

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** erik-project-os (aplica-se a todos os projetos)
**Substitui / emenda:** nenhuma
**Proposta redigida a partir de:** sessão de reconciliação com Erik, 2026-08-20
**Aceita em:** —

## Contexto

A máquina Windows vai ser zerada. Ela produziu 100 dos 170 runs registrados, e `machines.json` não
tem como dizer que uma máquina saiu de operação: são duas máquinas, cinco campos cada, e **nenhum
campo de estado**. A única operação disponível hoje é remover a entrada — o que quebraria `validate`
em três campos, quebraria `tests/cli.test.mjs:451`, que fixa literalmente
`{ "windows-erikc": "C:/Users/erikc/mekora" }`, e deixaria 100 runs apontando uma máquina que o
registro não conhece mais.

Em paralelo, `resgate/` guarda 56 arquivos e 7,7 MB de material tirado de lugares frágeis — um cache
de anexos com fila de remoção, um repositório Git sem remoto, pastas de trabalho fora de
versionamento. O `NOTA.md` de lá já declara que estar naquele diretório não torna nada vigente. Falta
dizer para onde esse material vai depois de classificado.

Os dois casos são a mesma regra aplicada a coisas diferentes.

## Decisão

### Máquinas

1. **Zerar a máquina é permitido. Removê-la do histórico não é.**

   ```
   ZERAR ✓        REMOVER DO HISTÓRICO ✗
   ```

   Um registro em que a entrada dela desapareceu está em violação desta decisão.

2. **A razão, nas palavras de Erik:**

   > "Os 100 runs pertencem à história do projeto. Remover a máquina porque ela foi formatada seria
   > como apagar um autor do histórico Git porque ele trocou de computador. A máquina física pode
   > desaparecer. A identidade histórica dela não."

3. **Uma máquina tem estes campos:**

   ```
   id · name · role · status · registered_at · retired_at · retirement_reason · successor_id
   ```

   `status` é `active` ou `retired`. `retired_at`, `retirement_reason` e `successor_id` só existem
   quando `status` é `retired`; `successor_id` é opcional.

4. **Uma máquina aposentada preserva o papel que tinha.** O `role` registra o que ela era, e não é
   sobrescrito por vazio.

5. **Máquina que volta do zero é instância nova.** O ambiente anterior produziu os runs anteriores, e
   aquele contexto terminou. O histórico antigo continua associado à máquina aposentada, e a nova
   entrada aponta a antiga por `successor_id` no sentido correto.

### Material preservado

6. **O material resgatado percorre um ciclo declarado:**

   ```
   resgate/  →  reconciliação  →  archive/
   ```

   Fica em `resgate/` até a reconciliação classificar cada item. Depois vai para `archive/`, no mesmo
   repositório, explicitamente não canônico.

7. **Não se cria repositório separado nem storage próprio agora.** É critério de volume: 7,7 MB não
   justifica a complexidade. Se um dia virar gigabytes de captura, vídeo e build, aí se avalia Git
   LFS, storage próprio ou repositório de arquivo — não antes.

8. **Estar num repositório não torna nada uma decisão vigente.** A regra já escrita em
   `resgate/NOTA.md` passa a valer para todo material histórico, em qualquer diretório.

## O que esta decisão NÃO decide

- **Quando a máquina Windows é efetivamente zerada.**
- **O destino das transcrições de sessão** — cerca de 60 MB em
  `~/.claude/projects/C--Users-erikc-mekora/`. Não são registro do projeto e não estão cobertas pelo
  item 6.
- **O destino do `artefato-mekora.html`**, 2,87 MB versionados por ausência de `.gitignore`. Erik
  pediu explicitamente para não mexer nisso agora.
- **Que critério classifica cada item na reconciliação** — se vira referência, evidência, histórico
  ou descarte.
- **Se `archive/` tem estrutura interna**, e qual.

## Consequências

1. **Ao ser aceita, esta DEC autoriza acrescentar os campos do item 3 a `machines.json`.** Enquanto o
   estado for `proposta`, o arquivo permanece como está.

2. **Remover a entrada da máquina deixa de ser a única saída, e passa a ser proibida.** Isso evita, de
   propósito, a quebra em `validate`, em `tests/cli.test.mjs:451` e nos 100 runs.

3. **O `role` do Windows está factualmente errado desde 06/08.** Ele diz "PC Windows; fonte viva da
   Vynce", escrito antes de o Mekora passar a ser desenhado ali. Pelo item 4, o `role` de uma máquina
   aposentada é preservado — logo precisa estar correto **antes** da aposentadoria, ou preserva-se um
   erro. É dívida a corrigir no mesmo ato.

4. **Uma correção de premissa que vale registrar:** estar no Git **não** significa deixar de ocupar
   espaço em disco. Clonar o repositório traz o histórico junto. O que o remoto resolve é **não
   depender de uma máquina só** — que é o problema real. Depois de confirmado o push, é possível não
   manter cópia local completa do material histórico, se o espaço importar.

5. **`archive/` ainda não existe.** O item 6 nomeia o destino; a pasta é criada quando o primeiro
   item for classificado, e não antes.

6. **A DEC-0008 não é emendada.** Ela estabeleceu manifestos cientes de máquina e continua vigente
   inteira; esta DEC acrescenta ciclo de vida a um modelo que ela criou sem prever aposentadoria.

## Histórico

O guardrail que originou esta decisão já estava no manifesto do Mekora, escrito para outro caso:
*"Preservar capturas do estado anterior antes de corrigir defeito visual: depois do conserto, o antes
deixa de existir."*

Ele já provou valor uma vez. O run de 12/08 registra as 26 telas originais do produto anterior em
`C:/Users/erikc/Desktop/New`. Essa pasta **sumiu** — hoje o Desktop tem apenas `desktop.ini` e um
atalho. As cópias sobreviveram porque alguém as levou para `telas-atuais/`, que está no Git. O
guardrail funcionou naquela vez; nada garantia que funcionaria na próxima.

O resgate de 20/08 é a próxima vez. Sete artefatos existiam em cópia única, e o mais valioso deles —
118 KB de relatórios de teste com conformidade WCAG, três direções de arquitetura e wireframes a
390px — vivia num cache de anexos do Codex cujo índice tem um campo chamado `pendingRemovalPaths`.
Os arquivos estavam literalmente numa fila de remoção, e não tinham "mekora" nem "kindle" no nome:
foram encontrados por varredura de conteúdo.

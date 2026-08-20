# DEC-0026 — Canonicalidade é por papel, não propriedade do repositório

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** erik-project-os (aplica-se a todos os projetos)
**Substitui / emenda:** nenhuma
**Proposta redigida a partir de:** sessão de reconciliação com Erik, 2026-08-20
**Aceita em:** —

## Contexto

O registro classifica `C:/Users/erikc/mekora` como `supporting_artifact` com `canonical: false`,
enquanto foi o único lugar onde o produto foi desenhado entre 14 e 20/08. O risco R-008 nomeia o
sintoma. A pergunta parecia ser "promover ou não a canônico".

A auditoria de 20/08 apurou que a pergunta estava mal posta:

- **`canonical` é lido zero vezes por `bin/project-os.mjs`** e não consta de
  `schemas/project.schema.json`. Não valida nada, não bloqueia nada, não aparece em nenhuma saída.
- **`role` já é texto livre e já chega ao briefing.** `os context` percorre `project.repositories` e
  imprime `repo.role` literalmente (`bin/project-os.mjs:688-698`).
- **O binário real é a pertinência ao array.** `os context` lê só `repositories`;
  `baseline_revisions` é `Object.fromEntries(project.repositories.map(...))`
  (`bin/project-os.mjs:804`); `supporting_artifacts` não aparece em nenhum dos dois.

Ou seja: canonicalidade por papel já é expressável hoje, sem mudar schema. Não há booleano a
consertar — o booleano já é inerte.

## Decisão

1. **Canonicalidade é por papel e por domínio.** Não é propriedade binária do repositório. Podem
   existir vários repositórios canônicos ao mesmo tempo, para domínios diferentes. Uma afirmação de
   canonicidade que não nomeia o domínio não é verificável, e não pode ser lida como decidida.

2. **Os dois arrays têm significado distinto, e nenhum recurso vive nos dois:**

   | | significado |
   |---|---|
   | `repositories` | fonte ativa do projeto, que participa do trabalho e precisa de baseline |
   | `supporting_artifacts` | material de apoio que pode informar trabalho, mas não é frente versionada ativa |

3. **O repositório onde o desenho do produto acontece entra em `repositories`**, porque os runs
   precisam registrar a revisão dele. Ao entrar, **sai de `supporting_artifacts`**.

4. **`role` diz a função do repositório, inclusive quando essa função é de implementação.**
   Vocabulário documentado, consistente, e deliberadamente pequeno:

   ```
   product-design
   web-frontend
   backend-processing
   project-governance
   historical-reference
   ```

   O vocabulário é aberto a acréscimo quando aparecer papel que nenhum dos cinco descreve. Não é
   ontologia: é lista curta que se lê de relance no briefing.

5. **`canonical` deixa de ser usado como sinal de autoridade.** Nenhum comportamento novo é
   construído sobre ele, e nenhuma leitura do registro deve invocá-lo para afirmar ou negar
   autoridade. O campo legado é removido com calma, sem urgência.

6. **A autoridade vem de:**

   ```
   DEC  →  documentação canônica   +   repository.role
   ```

## O que esta decisão NÃO decide

- **O escopo por domínio do `baseline_revisions`.** Hoje todo run carimba todos os repositórios do
  array, independente do que tocou — um run de desenho leva junto a revisão do backend. É questão
  separada, e Erik pediu explicitamente que fosse tratada como tal.
- **Se `supporting_artifacts` deveria aparecer no briefing.** Hoje não aparece, e por isso o briefing
  nunca nomeou onde o produto vivia. O item 3 resolve o caso concreto sem decidir a regra geral.
- **Quando o campo `canonical` é efetivamente removido** dos manifestos.
- **O `role` literal de cada repositório existente.** O item 4 fixa o vocabulário; a aplicação
  entrada por entrada é trabalho de reconciliação.

## Consequências

1. **Ao ser aceita, esta DEC autoriza a mudança em `projects/mekora.json`:** a entrada
   `cadernos_de_exploracao` sai de `supporting_artifacts` e passa a constar em `repositories` com
   `role: "product-design"`. Enquanto o estado desta DEC for `proposta`, o manifesto permanece como
   está.

2. **Metade do R-008 fica resolvida.** O repositório de desenho passa a aparecer no briefing que os
   agentes leem e a ter revisão carimbada nos runs. A outra metade — runs carimbando repositório
   irrelevante — depende da questão separada.

3. **Um efeito colateral pequeno e desejável:** `validate` exige que toda entrada tenha `local_paths`
   com ao menos uma máquina. A entrada já cumpre. Nada quebra na mudança de array.

4. **Os `role` existentes ficam fora de vocabulário até a reconciliação.** Hoje há textos como
   "implementação operacional", "frente de trabalho diário: canvas, movimento e retrabalho de UX" e
   "cadernos de UX e protótipos de raciocínio, versionados fora das bases de produto". São
   descritivos e úteis; passam a ser normalizados contra os cinco valores do item 4, com o texto
   longo migrando para uma descrição ao lado, se necessário.

5. **A DEC-0025 e esta se completam.** Aquela corrige a norma sobre onde o desenho vive; esta corrige
   o registro. Nenhuma das duas sozinha resolve o R-008.

6. **A DEC-0008 não é emendada.** Ela criou os manifestos cientes de máquina e continua vigente
   inteira. Esta DEC opera dentro do modelo que ela estabeleceu.

## Histórico

A entrada foi registrada como `supporting_artifact` em 12/08, com razão declarada no próprio
manifesto: entrar como `repository` criaria uma terceira base de experiência candidata e pioraria uma
pendência já registrada — *"são duas explorações de experiência coexistindo, e nenhuma decisão
registrada diz qual continua"*.

Essa razão foi tornada obsoleta pela própria DEC-0017, que resolveu a pendência ao declarar que as
duas bases são fontes e nenhuma é descartada. A classificação sobreviveu à razão que a justificava
por oito dias, e nesse intervalo o produto inteiro foi desenhado num lugar que o briefing dos agentes
nunca nomeava.

O manifesto já registrava a contradição, em nota de 19/08 dentro da própria entrada: *"Deixou de ser
apenas caderno: entre 14 e 19/08 foi o unico lugar onde o produto foi desenhado, em 25 runs. A
classificacao canonical:false e a ausencia de revisao rastreada nao descrevem mais o papel real."*

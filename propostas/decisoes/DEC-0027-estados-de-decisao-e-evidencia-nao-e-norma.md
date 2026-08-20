# DEC-0027 — Estados de decisão, e evidência não é norma

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** nenhuma
**Decidido por:** Erik, em 2026-08-20

## Contexto

O registro tem 19 documentos de decisão e nenhuma forma de dizer que um deles deixou de valer. Verificado arquivo por arquivo em 20/08: 11 declaram estado como item de lista (`- Estado: aceito`, ex. `decisions/DEC-0001-separate-product-repositories.md:3`) e 8 declaram como campo de cabeçalho (`**Estado:** aceita`, ex. `decisions/DEC-0019-experience-architecture-final-round.md:5`). Os únicos valores em uso são `aceito`/`aceita` (18 documentos) e `pendente` (1, a AUTH-001, em `decisions/AUTH-001-modelo-de-autenticacao-e-identidade.md:5`). Não existe nenhum valor que signifique "substituída" ou "revogada", e nenhum arquivo tem campo que aponte uma decisão substituta. A tabela de `decisions/README.md` repete as mesmas duas palavras.

Nota sobre o número: a auditoria desta rodada registrou 11 DECs "sem estado declarado". A verificação arquivo por arquivo mostra que essas 11 declaram estado, em formato de lista. O problema nunca foi ausência de estado — foi ausência de vocabulário e de forma única.

A ferramenta não cobre a lacuna. `schemas/` contém `handoff.schema.json`, `project.schema.json`, `run.schema.json` e `workflow.schema.json` — não existe `decision.schema.json`. A CLI lê `decisions/` apenas para extrair id e título (`bin/project-os.mjs:660-671`) e nunca valida estado. O contraste está dentro do próprio código: handoffs têm estados formais desde cedo — `HANDOFF_STATUSES` inclui `superseded` (`bin/project-os.mjs:17`) e a validação recusa um handoff `superseded` sem `superseded_by` existente (`bin/project-os.mjs:399-405`). O que o handoff tem, a decisão não tem.

O custo já está cobrado. A DEC-0011, aceita em 11/08, diz no ponto 4: "`mekora-experience` sai do caminho crítico. (…) Não é base de trabalho" (`decisions/DEC-0011-canonical-frontend-and-operational-api-contract.md:41`). A DEC-0017, aceita no dia seguinte, diz que as duas explorações de experiência são fontes e que nenhuma é descartada. As duas se declaram "aceita". Nada no sistema sinaliza o conflito e nada indica qual prevalece. É o cenário que o Erik descreveu: a busca encontra duas decisões e ninguém sabe qual vale.

A segunda metade do problema tem uma evidência limpa e datada. A captura de 14/08 às 14h29 mostra a barra de depuração do protótipo publicado com `mesa C · workspace` ativo; o run das 17h33 do **mesmo dia** registra a recusa da Mesa C, chamando-a de "o dashboard que a direção editorial recusa" (`resgate/2026-08-14-a-20-artefato-publicado/LEIA.md:43-44`). Implementação e aprovação estiveram separadas por três horas, na ordem errada. O material está preservado em `resgate/2026-08-14-a-20-artefato-publicado/`, cujo `LEIA.md` remete em `:4` ao `resgate/NOTA.md`, que já declara, por conta própria, que estar ali não torna nada decisão vigente (`resgate/NOTA.md:8`).

## Decisão

1. **Toda DEC declara estado.**

2. **Os estados são quatro:** `proposta` (*proposed*), `aceita` (*accepted*), `substituída` (*superseded*), `revogada` (*revoked*). Só valem estes valores.

3. **Uma DEC substituída aponta quem a substituiu.** O estado `substituída` sem a identificação da decisão substituta é inválido. O exemplo que o Erik deu foi de forma — "DEC-0019 status: superseded, superseded_by: DEC-00XX". O exemplo fixa o par estado + apontamento; não determina que a DEC-0019 receba esse estado. Ver "O que esta decisão NÃO decide".

4. **`descontinuada` (*deprecated*) é opcional e não entra agora.** Só passa a existir se aparecer necessidade real. Até lá não integra o vocabulário e nenhuma DEC pode usá-lo.

5. **Implementação não prova aprovação.** Um protótipo, commit, screenshot ou implementação é evidência de **estado observado**. Nunca constitui por si só decisão normativa.

6. **A distinção entre as duas autoridades vale no registro e entra no README da governança:**

   | | pergunta que responde | onde vive |
   |---|---|---|
   | **Autoridade normativa** | "como o produto deve ser" | DEC → documentação canônica |
   | **Estado observado** | "como o produto está hoje" | implementação → testes → protótipos |

7. **DEC vigente contra implementação divergente é BUG**, não conflito de autoridade. A norma não entra em disputa com o código que a descumpre.

8. **DEC vigente contra protótipo antigo divergente é material histórico incompatível**, não disputa. O protótipo anterior não passa a ser um lado da discussão.

## O que esta decisão NÃO decide

- **Como se registra uma DEC emendada só em parte.** Os quatro estados do item 2 descrevem o documento inteiro. Propostas desta rodada emendam pontos isolados de DECs aceitas sem substituí-las: o rascunho da DEC-0024 declara no cabeçalho emenda à regra 1 da DEC-0019, e o rascunho da DEC-0025 declara emenda ao ponto 1 da DEC-0011. Uma DEC nessa situação não é "aceita" sem ressalva nem "substituída". O Erik não tratou desse caso, e esta decisão não o resolve por conta própria. **Duas perguntas fechadas para ele responder:** (a) uma DEC emendada em parte permanece com estado `aceita` — sim ou não? (b) o documento emendado passa a apontar de volta quem o emendou — sim ou não? Enquanto as duas não forem respondidas, quem abre a DEC antiga lê redação já emendada sem aviso.
- **O que acontece com uma DEC que não declara estado.** O item 1 obriga a declaração. Se a omissão torna o documento inválido, incompleto ou apenas pendente de correção — e se ele pode ou não ser citado nesse intervalo — não foi decidido.
- **Se o estado passa a ser validado por schema ou permanece em prosa.** Criar `decision.schema.json` é mudança de ferramenta, e o Erik não autorizou tocar em schema nesta rodada. Enquanto ficar em prosa, o cumprimento é humano.
- **Quem pode mudar o estado de uma DEC.** Não há regra decidida sobre quem marca uma decisão como substituída ou revogada, nem sobre que ato registra essa mudança.
- **O formato do campo.** O registro tem hoje duas formas concorrentes — item de lista e campo de cabeçalho — e nenhuma foi eleita. O nome do campo que aponta a substituta também está em aberto: o Erik escreveu `superseded_by`, mas nomear campo é ferramenta.
- **Qual estado cada uma das 19 DECs existentes recebe** — inclusive a DEC-0019, que o Erik nomeou por número ao dar o exemplo de forma do item 3. Esta decisão não determina que a DEC-0019 passe a `substituída`. Também não decide qual das duas — DEC-0011 ponto 4 ou DEC-0017 — é a substituída. Esta decisão fornece vocabulário; não resolve os conflitos concretos.
- **O que acontece com uma DEC que fica em `proposta` e nunca é aceita.** Não há prazo, caducidade ou regra de expiração decidida.
- **Em qual arquivo vive o "README da governança".** O repositório tem `README.md` na raiz e `decisions/README.md`; qual dos dois recebe o texto do item 6 não foi verificado.
- **Como o estado observado é catalogado.** A decisão diz que protótipo, commit e captura são evidência; não define onde essa evidência é registrada nem por quanto tempo é mantida.

## Consequências

- **As 19 DECs existentes precisam ser reconciliadas com o vocabulário de quatro estados.** 18 dizem `aceito`/`aceita` e 1 diz `pendente` — valor que não existe no conjunto (`decisions/AUTH-001-modelo-de-autenticacao-e-identidade.md:5`, "**pendente** — nenhuma decisão tomada"). A conversão de cada uma é trabalho de reconciliação, não desta DEC.
- **A divergência de forma vira dívida nomeada.** 11 arquivos (DEC-0001 a DEC-0009, DEC-0012 e DEC-0013) escrevem o estado como item de lista; 8 escrevem como campo de cabeçalho. Fechar isso é parte da reconciliação.
- **Se aceita, o valor `amended` deixa de ser escrevível em qualquer DEC.** O rascunho da DEC-0024, de 20/08, lista `amended` entre os estados candidatos da DEC-0019 dentro da sua própria seção "O que esta decisão NÃO decide". Pelo item 2, `amended` não é um dos quatro valores. As duas propostas precisam ser resolvidas na mesma sessão: ou aquele termo sai, ou o Erik responde antes as duas perguntas registradas acima sobre emenda parcial.
- **O conflito DEC-0011 §4 × DEC-0017 passa a ter solução possível:** uma das duas é marcada como `substituída`, apontando a outra. Enquanto isso não for feito, o registro continua respondendo duas coisas para a mesma pergunta — e continua sem sinalizar que responde.
- **`decisions/README.md` fica incompleto.** A coluna Estado só comporta `aceito` e `pendente`; passa a precisar exibir `substituída` e `revogada`, e a apontar a substituta.
- **Lacuna conhecida na ferramenta:** `bin/project-os.mjs:660-671` continua lendo apenas id e título de cada decisão, e nenhum schema valida decisões. A regra existe sem execução mecânica, por escolha desta rodada.
- **A barra, e como a regra 7 funciona.** `prototipo-mesa.html:2065` enumera cinco lugares (Mesa, Estante, Notas, Canvas, Conexões) e `prototipo-mesa.html:5359` enumera quatro no menu de dentro da leitura. A norma vigente é a regra 1 da DEC-0019 — "os quatro lugares — Mesa, Estante, Canvas, Conexões — iguais nas quatro superfícies" (`decisions/DEC-0019-experience-architecture-final-round.md:11-12`) —, aceita e não substituída. **Enquanto a DEC-0024 permanecer em `proposta`**, é `:2065` que diverge da norma vigente: bug pela regra 7, e não argumento a favor de cinco lugares. **Se a DEC-0024 for aceita**, o veredito se inverte — `:2065` passa a ser conformidade e `:5359` passa a ser a linha divergente. Este exemplo existe para mostrar a regra 7 em funcionamento; não fixa o número de lugares da barra. O próprio código admite a inversão: "Notas entra na barra porque a aposta da rodada e que ela e o produto" (`prototipo-mesa.html:2061`).
- **Efeito simétrico das DECs desta rodada.** Enquanto uma DEC estiver em `proposta`, a implementação que a contraria **não** é bug — a norma ainda não existe. A contradição da tela entre "o preparo não é feito no seu computador" (`prototipo-mesa.html:2000`), "o trabalho não é feito no seu computador" (`:3179`) e "o produto é local" (`:6587`, `:6647`, `:6652`) permanece estado observado inconsistente até que a decisão sobre onde o produto roda seja aceita.
- **`resgate/` deixa de ser exceção e vira aplicação da regra.** O `resgate/NOTA.md` já declara, em `:8`, que estar ali não torna nada decisão vigente, e o `LEIA.md` de `resgate/2026-08-14-a-20-artefato-publicado/` remete a ele em `:4`; agora obedecem a uma norma escrita, não a uma convenção local. As 7 capturas ali preservadas — 6 estados distintos, conforme o próprio `LEIA.md:71`, com integridade registrada em `resgate/HASHES.txt` — são evidência de estado observado datada, e nada além disso.
- **A reconciliação dos 18–24 assuntos ganha vocabulário de resultado.** Cada assunto pode agora terminar em uma DEC `proposta`, `aceita`, `substituída` ou `revogada`, em vez de terminar em prosa.
- **As 88 decisões de produto tomadas em runs entre 13 e 20/08 que nunca viraram DEC** nascem, quando virarem, com estado declarado. Um run que registra uma escolha continua sendo evidência de estado observado até que a DEC exista.

## Histórico

O registro já sabia fazer isto — só não para decisões. Os handoffs têm estados formais desde o início, com `superseded` na lista de valores (`bin/project-os.mjs:17`) e uma validação que recusa handoff substituído sem substituto existente (`bin/project-os.mjs:399-405`). A decisão, que é o artefato mais durável do sistema, ficou sem o mecanismo que o artefato mais efêmero tinha.

O campo de estado nas DECs cresceu sem regra. As nove primeiras, de 02 a 05/08, escreveram `- Estado: aceito` como item de lista. A partir da DEC-0010, de 07/08, apareceu o cabeçalho em negrito; a DEC-0012 e a DEC-0013, de 12/08, voltaram ao formato antigo. Duas formas conviveram porque nunca houve norma para escolher entre elas.

A falta de vocabulário já tinha aparecido uma vez. A AUTH-001, de 14/08, precisou de um estado que o conjunto em uso não tinha e inventou `pendente`, com a frase "Este documento não decide nada". Foi remendo local para um problema geral.

O conflito entre a DEC-0011 ponto 4 e a DEC-0017 é de 11 e 12/08 e é anterior a esta rodada. Permaneceu invisível precisamente porque as duas se declaram "aceita" e nenhuma delas pode se declarar outra coisa.

A regra de que evidência não é norma já vinha sendo obedecida antes de ser escrita. O guardrail citado em `resgate/2026-08-14-a-20-artefato-publicado/LEIA.md` manda preservar capturas do estado anterior antes de corrigir defeito visual — "depois do conserto, o antes deixa de existir" — e o resgate de 20/08 foi feito com `NOTA.md` e `HASHES.txt` declarando não-autoridade. Esta DEC não cria a prática: nomeia a norma que aquele diretório já cumpria e a estende ao protótipo, ao commit e à implementação.

O enquadramento que o Erik deu à rodada sustenta as duas metades deste documento. A reconciliação preserva o caminho que levou ao produto atual, mas a autoridade normativa descreve o Mekora que existe daqui para frente. Estados formais servem à primeira metade; a distinção entre norma e estado observado serve à segunda.

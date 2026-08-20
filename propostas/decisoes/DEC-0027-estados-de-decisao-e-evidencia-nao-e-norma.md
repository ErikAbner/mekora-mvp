# DEC-0027 — Estados de decisão, e evidência não é norma

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** erik-project-os (aplica-se a todos os projetos)
**Substitui / emenda:** nenhuma
**Proposta redigida a partir de:** sessão de reconciliação com Erik, 2026-08-20
**Aceita em:** —

## Contexto

O registro tem 19 documentos de decisão e nenhuma forma de dizer que um deles deixou de valer.
Verificado arquivo por arquivo em 20/08: onze declaram estado como item de lista
(`- Estado: aceito`, ex. `decisions/DEC-0001-separate-product-repositories.md:3`) e oito como campo
de cabeçalho (`**Estado:** aceita`, ex. `decisions/DEC-0019:5`). Os únicos valores em uso são
`aceito`/`aceita` — dezoito documentos — e `pendente`, um, a AUTH-001.

Não existe valor que signifique "substituída" ou "revogada". Nenhum arquivo tem campo que aponte uma
decisão substituta. Não existe `decision.schema.json`: a CLI valida runs, handoffs, projetos e
workflows, e não valida decisões.

A consequência já está no registro: a DEC-0011 ponto 4 e a DEC-0017 se contradizem, as duas
declaram-se aceitas, e nada no sistema sinaliza isso. Foram necessárias uma auditoria e uma leitura
humana para encontrar.

O padrão para consertar isso já existe no próprio repositório, implementado para outra entidade.
`schemas/handoff.schema.json` tem `status` como enum com `superseded`, tem `superseded_by`, tem
`history` com `{at, status, actor, reason}` obrigatório, e tem validação condicional —
`if status == "superseded" then required ["superseded_by"]`. Decisão é a única entidade de primeira
classe do Project OS que nunca ganhou ciclo de vida.

## Decisão

### Estados

1. **Toda DEC declara estado.**

2. **Os estados são quatro**, e só valem estes valores:

   ```
   proposed    ·  accepted  ·  superseded  ·  revoked
   ```

3. **`deprecated` não entra agora.** Fica disponível se aparecer necessidade real; até lá não
   integra o vocabulário.

### Relacionamentos entre decisões

4. **Emenda parcial não é estado. É relacionamento.** Uma DEC emendada em parte continua `accepted` e
   ganha um apontamento reverso. **Não existe o estado `amended`.**

5. **Os relacionamentos entre decisões são campos, com escopo:**

   ```
   amends  ·  amended_by  ·  supersedes  ·  superseded_by  ·  conflicts_with
   ```

   Exemplo, nos dois sentidos:

   ```
   DEC-0019                          DEC-0024
   status: accepted                  status: accepted
   amended_by:                       amends:
     - decision: DEC-0024              - decision: DEC-0019
       scope: regra 1                    scope: regra 1
   ```

6. **`superseded` sem `superseded_by` é inválido.** O mesmo vale para `amended_by` sem `scope`.

### Formato

7. **O estado é validado por schema, não confiado à prosa.** Foi a prosa que permitiu `aceito`,
   `aceita` e `pendente` conviverem sem garantia estrutural.

8. **A DEC tem metadado estruturado para a máquina e corpo Markdown para a pessoa.** O metadado
   carrega id, estado, datas e relacionamentos. O corpo carrega contexto, decisão e consequências.
   **A DEC não é duplicada em JSON e Markdown** — cada metade existe uma vez, no formato que lhe
   serve.

### Evidência não é norma

9. **Implementação não prova aprovação.** Um protótipo, commit, screenshot ou implementação é
   evidência de **estado observado**. Nunca constitui por si só decisão normativa.

10. **A distinção entre as duas autoridades vale no registro, e entra no README da governança:**

    | | pergunta que responde | onde vive |
    |---|---|---|
    | **Autoridade normativa** | "como o produto deve ser" | DEC → documentação canônica |
    | **Estado observado** | "como o produto está hoje" | implementação → testes → protótipos |

11. **DEC vigente contra implementação divergente é BUG**, não conflito de autoridade. A norma não
    entra em disputa com o código que a descumpre.

12. **DEC vigente contra protótipo antigo divergente é material histórico incompatível**, não
    disputa. O protótipo anterior não passa a ser um lado da discussão.

### As 19 existentes

13. **A normalização das DECs existentes é mecânica, e não reinterpreta significado:**

    ```
    aceito / aceita  →  accepted
    pendente         →  proposed
    ```

14. **A reavaliação de cada uma acontece na reconciliação**, não agora:

    ```
    accepted
       ├── continua válida            →  accepted
       ├── parcialmente alterada      →  accepted + amended_by
       ├── totalmente substituída     →  superseded + superseded_by
       └── abandonada sem substituta  →  revoked
    ```

## O que esta decisão NÃO decide

- **Que estado cada uma das 19 DECs recebe** além da normalização mecânica do item 13. Em especial:
  qual das duas em conflito — DEC-0011 ponto 4 ou DEC-0017 — é a emendada.
- **Quem pode mudar o estado de uma DEC**, e se isso exige run aberto ou revisor independente.
- **O que acontece com uma DEC que não declara estado.** Hoje não há nenhuma; a regra para o caso
  futuro não foi escrita.
- **Se `conflicts_with` é declarado à mão ou detectado.** Detecção automática exigiria vocabulário de
  escopo comparável, que não existe. À mão funciona hoje e é barato.

## Consequências

1. **A implementação disso é trabalho de ferramenta, com o padrão já escrito uma vez.** O
   `handoff.schema.json` traz enum de status, `superseded_by`, `history` obrigatório e validação
   condicional. Um `decision.schema.json` é a aplicação do mesmo padrão a uma segunda entidade, com
   conjunto de estados menor.

2. **A DEC-0002 não é contrariada — é cumprida.** Ela fixa que o Project OS é arquivos, Markdown, Git
   e CLI sem dependências, e fecha dizendo: *"Automação só será adicionada depois que o fluxo manual
   revelar necessidades reais."* Esta DEC é a necessidade real, revelada pelo fluxo manual: 88
   decisões sem registro, duas DECs aceitas em conflito, e nenhum mecanismo que sinalize. Nada aqui
   introduz painel, banco ou agente automático.

3. **O `decisions/README.md` fica incompleto.** A coluna Estado só comporta `aceito` e `pendente`;
   passa a precisar exibir `superseded` e `revoked`, e a apontar a substituta.

4. **A DEC-0024 e a DEC-0025 dependem do item 5 para serem coerentes.** As duas declaram emenda a
   DECs aceitas. Sem `amends`/`amended_by`, a DEC-0019 e a DEC-0011 continuariam marcadas apenas
   `accepted`, e uma busca futura encontraria a redação antiga sem saber que mudou.

5. **A reconciliação dos 18–24 assuntos ganha vocabulário de saída.** Cada assunto termina com um
   estado do item 2 e, quando for o caso, um relacionamento do item 5.

6. **O item 11 muda como se lê a divergência da barra.** `prototipo-mesa.html:2065` enumera cinco
   lugares e `:5359` enumera quatro. Enquanto a DEC-0024 for `proposed`, a norma vigente é a regra 1
   da DEC-0019 e é `:2065` que diverge — bug, não argumento a favor de cinco. Se a DEC-0024 for
   aceita, o veredito se inverte. **Este exemplo existe para mostrar o item 11 funcionando; não fixa
   o número de lugares da barra.**

## Histórico

O campo de estado nas DECs cresceu sem regra. As nove primeiras, de 02 a 05/08, escreveram
`- Estado: aceito` como item de lista. A partir da DEC-0010, de 07/08, apareceu o cabeçalho em
negrito; a DEC-0012 e a DEC-0013, de 12/08, voltaram ao formato antigo. Duas formas conviveram
porque nunca houve norma para escolher entre elas — e a divergência de gênero, `aceito` contra
`aceita`, é o sintoma mais visível de que ninguém estava validando o valor.

O item 9 tem a evidência mais limpa que este projeto produziu. Uma captura do artefato publicado de
14/08/2026, às 14h29, mostra `mesa C · workspace` ativo na barra de depuração. O run das **17h33 do
mesmo dia** registra a recusa da Mesa C, chamando-a de *"o dashboard que a direcao editorial
recusa"*. Implementação e aprovação estiveram separadas por três horas, na mesma tarde. A captura
está preservada em `resgate/2026-08-14-a-20-artefato-publicado/`.

Uma versão anterior desta proposta reportava que 11 das 19 DECs não declaravam estado. Estava errado:
o `grep` original procurava apenas o formato em negrito. As 19 declaram. O problema real é pior do
que a ausência de estado — é a ausência de vocabulário para dizer que uma decisão morreu.

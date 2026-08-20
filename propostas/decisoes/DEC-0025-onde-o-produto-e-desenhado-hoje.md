# DEC-0025 — A DEC-0011 é emendada, não revogada

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** emenda a DEC-0011. Qual ponto muda e com qual redação não está decidido — ver "O que esta decisão NÃO decide".
**Decidido por:** Erik, em 2026-08-20

## Contexto

A DEC-0011, aceita em 2026-08-11, diz no ponto 1 (`decisions/DEC-0011-canonical-frontend-and-operational-api-contract.md:35`): "`mekora-canvas-motion` é o frontend canônico do Mekora. É onde a interface do produto é construída daqui em diante."

O estado observado nove dias depois é outro. O risco R-008 nomeou o sintoma antes desta rodada: aberto em 2026-08-19 em `projects/mekora.risks.json:70`–`:77`, com o título "O produto e desenhado fora dos repositorios que o registro rastreia" (`:71`), ele registra como evidência que entre 14 e 19/08 houve 25 runs do Mekora e nenhum tocou `operational_app`, `experience` ou `canvas_motion`; todos alteraram `C:/Users/erikc/mekora`. O manifesto do projeto repete o fato em `projects/mekora.json:22` — "o trabalho vive em C:/Users/erikc/mekora/prototipo-mesa.html" — e em `projects/mekora.json:131` — "Deixou de ser apenas caderno: entre 14 e 19/08 foi o unico lugar onde o produto foi desenhado", com `prototipo-mesa.html` como superfície principal.

O registro continua descrevendo esse lugar como outra coisa. `projects/mekora.json:98` classifica `C:/Users/erikc/mekora` dentro de `supporting_artifacts`, com `role` "cadernos de UX e protótipos de raciocínio, versionados fora das bases de produto" (`:110`) e `canonical: false` (`:118`). A lista de `contents` (`:121`–`:127`) não menciona `prototipo-mesa.html`. A revisão registrada é `0b12f1f`, observada em 19/08 (`:128`–`:130`), enquanto o `HEAD` do repositório é `af57c54`, de 20/08, com dez commits entre a revisão registrada e ele — cinco de desenho (`7c93518`, `27c779f`, `44c83e5`, `13b8257`, `64becca`) e cinco de preservação do material de resgate (`645ac22`, `5f32064`, `7da7b3e`, `e2df18e`, `af57c54`).

Lendo a frase do ponto 1, ela responde a duas perguntas ao mesmo tempo: **onde a interface é desenhada** e **qual base a implementa**. O estado observado acima diverge da primeira. Nada nesta rodada testou a segunda: nenhuma implementação de interface começou.

Diante da opção entre revogar a DEC-0011 e corrigi-la, o Erik decidiu, verbatim: "emendar DEC-0011, não jogar fora as partes ainda válidas." Foi a única frase dele sobre a DEC-0011 nesta rodada. Ele não indicou qual ponto emendar, não escreveu redação nova e não se pronunciou sobre o `mekora-canvas-motion`.

## Decisão

**1. A DEC-0011 é emendada, não revogada.** As partes ainda válidas são preservadas. Verbatim do Erik em 2026-08-20: "emendar DEC-0011, não jogar fora as partes ainda válidas."

## O que esta decisão NÃO decide

- **Qual ponto da DEC-0011 é emendado?** Não decidido. O Erik não indicou ponto.
- **Qual é a nova redação desse ponto?** Não decidido. Nenhuma redação nova foi escrita por ele.
- **`mekora-canvas-motion` continua sendo o frontend canônico e a base sobre a qual a interface será implementada?** Não decidido nesta rodada. O ponto 1 da DEC-0011 responde hoje que sim, e continua vigente nesse aspecto até o Erik revisá-lo. Esta decisão não o desativa.
- **Mudança de desenho de interface feita fora de `C:/Users/erikc/mekora` passa a exigir registro próprio?** Não decidido. Nenhuma obrigação de processo é criada aqui.
- **`C:/Users/erikc/mekora` sai de `supporting_artifacts` e entra em `repositories`, e com qual `role`?** É matéria da **DEC-0026**, proposta na mesma data. Esta decisão descreve o estado; não altera manifesto, e não depende da aceitação da DEC-0026 para valer.
- **O protótipo pode ser citado, sozinho, como aprovação de comportamento do produto?** É matéria da **DEC-0027**, proposta na mesma data, cujo item 5 trata de implementação como evidência de estado observado. Não é decidido aqui.
- **O que acontece com `prototipo-mesa.html` depois que houver implementação?** Se ele vira especificação, referência histórica ou material a arquivar não está decidido.
- **O conflito, anterior e não resolvido, entre o ponto 4 da DEC-0011 e a DEC-0017.** O ponto 4 diz que `mekora-experience` "sai do caminho crítico" e "não é base de trabalho" (`decisions/DEC-0011-canonical-frontend-and-operational-api-contract.md:41`); a DEC-0017, posterior (2026-08-12, aceita), diz que `mekora-experience` e `mekora-canvas-motion` não disputam o lugar de base da experiência, que nenhuma das duas é descartada, e que as duas são fontes. As duas DECs estão marcadas como aceitas. O conflito nasceu antes desta rodada, não foi criado nem resolvido por ela, e continua aberto.
- **Nenhuma exclusão, movimentação ou fusão é autorizada.** Como já dizia a DEC-0011, apagar, mover, copiar ou fundir qualquer coisa nesses repositórios continua exigindo decisão própria.
- **A correção de `baseline_revisions`.** Continua sendo questão separada.

## Consequências

- **Enquanto o ponto a emendar e a nova redação não forem decididos, a DEC-0011 continua citável na íntegra, inclusive o ponto 1.** Aceitar esta decisão registra a forma da correção — emenda, não revogação — e não muda ainda nenhuma palavra da DEC-0011.
- **Nenhuma consequência da DEC-0011 é alterada.** Inclusive a técnica: "O próximo marco técnico passa a ser o modelo de livro persistente: a entidade que `ProcessingJob` não é."
- **O risco R-008 continua aberto.** A mitigação escrita em `projects/mekora.risks.json:76` pede decisão sobre promover o repositório de desenho, e essa decisão não é esta.
- **BUG conhecido — o manifesto descreve o repositório de desenho por um papel que ele não tem mais.** `projects/mekora.json:110` chama `C:/Users/erikc/mekora` de "cadernos de UX e protótipos de raciocínio"; `:118` marca `canonical: false`; `:121`–`:127` listam os conteúdos sem `prototipo-mesa.html`. O próprio arquivo já se contradiz em `:22` e `:131`. É divergência entre registro e estado observado; permanece registrada, e não é corrigida aqui.
- **BUG conhecido — a revisão rastreada do repositório de desenho está atrasada.** `projects/mekora.json:128` grava `0b12f1f`, observado em 19/08; o `HEAD` é `af57c54`, de 20/08.
- **Dívida registrada, e não paga: a DEC-0011 mandava corrigir o `mekora.status.md`, e a correção nunca foi feita.** As três correções eram: o caminho de `mekora-app` (não está em `~/mekora-app`; o clone é `~/Projeto-kindle/kindle-local-tool`), a revisão observada (`HEAD` local `12d7062`, um commit à frente da revisão registrada `65bb244`) e a ausência de clone local de `mekora-experience`. Nenhuma entrou no arquivo. `projects/mekora.status.md:3` ainda diz "Última revisão: 2 de agosto de 2026" — nove dias antes da própria DEC-0011 e dezoito dias antes desta decisão. `projects/mekora.status.md:7`–`:10` ainda descrevem o Mekora como "um produto único com duas bases oficiais", `mekora-app` e `mekora-experience`, e a tabela em `:16`–`:19` lista só essas duas, sem o `canvas-motion` e sem o repositório de desenho. A dívida é anterior a esta decisão e continua aberta.
- **Nenhuma linha de código muda por causa desta decisão.**

## Histórico

Em 2026-08-11 a DEC-0011 foi aceita com seis pontos. Ela nasceu de uma auditoria que encontrou três bases sob o nome Mekora sem decisão registrada sobre qual seria a interface do produto, e o ponto 1 respondeu a essa pergunta apontando o `mekora-canvas-motion`. Naquela data a escolha descrevia o trabalho real: o app operacional estava congelado desde 2026-07-22, e a própria DEC registrava que "todo o trabalho diário migrou para o canvas".

Em 2026-08-12 a DEC-0017 encerrou como "pergunta errada" a disputa entre `mekora-experience` e `mekora-canvas-motion`, declarando as duas fontes. É desse momento que vem o conflito com o ponto 4 da DEC-0011, nunca reconciliado.

Entre 14 e 20/08 o desenho passou a acontecer fora dos três repositórios registrados: 25 runs entre 14 e 19/08, nenhum tocando `operational_app`, `experience` ou `canvas_motion`, com `prototipo-mesa.html` como superfície principal. Em 19/08 o risco R-008 foi aberto para nomear exatamente isso.

Há evidência datada, na mesma janela, de que estar no protótipo não equivale a estar aprovado: a captura de 2026-08-14 14:29 mostra "mesa C · workspace" ativo, e o run das 17:33 do mesmo dia registra a recusa da Mesa C como "o dashboard que a direcao editorial recusa". A tela existia; a decisão era contrária. O tratamento dessa distinção corre na DEC-0027, não aqui.

Em 2026-08-20, diante da opção entre revogar a DEC-0011 e corrigi-la, o Erik decidiu: "emendar DEC-0011, não jogar fora as partes ainda válidas." A redação da emenda ainda não existe; as perguntas que faltam estão listadas acima.

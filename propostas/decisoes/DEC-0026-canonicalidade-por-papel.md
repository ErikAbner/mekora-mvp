# DEC-0026 — Canonicalidade é por papel, não propriedade do repositório

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** nenhuma
**Decidido por:** Erik, em 2026-08-20

## Contexto

O risco R-008 está aberto em `projects/mekora.risks.json:71`, com o título "O produto e desenhado fora dos repositorios que o registro rastreia". O desenho vive em `C:/Users/erikc/mekora`, registrado em `projects/mekora.json` dentro de `supporting_artifacts` (`:98`), com `id: cadernos_de_exploracao` (`:109`) e `canonical: false` (`:118`).

A pergunta levada ao Erik foi se esse repositório deveria ser declarado canônico. Ele recusou a forma da pergunta: "podem existir múltiplos repositórios canônicos, mas para domínios diferentes". E respondeu o que fazer com a entrada: "repo de desenho entra em repositories com role correto". São essas duas frases, e só elas, que a seção Decisão registra.

A auditoria do registro mostra que o campo que a pergunta assumia como decisivo não decide nada. `canonical` é lido **zero vezes** por `bin/project-os.mjs` (verificado: `grep -rn "canonical" bin/ schemas/` não retorna nenhuma ocorrência) e não existe em `schemas/project.schema.json`, que declara apenas `schema_version`, `id`, `name`, `status`, `stage`, `repositories` (array, `minItems: 1`) e `next_milestone`. Hoje `canonical` é prosa: não valida nada, não bloqueia nada, não é impresso em lugar nenhum. Isso é estado observado, não norma — o que o registro deve fazer com o campo não é matéria desta DEC.

O campo `role` também é texto livre e também não está no schema — mas **já é impresso no briefing que os agentes leem**. `bin/project-os.mjs:696` monta a linha `- ${repo.id}: ${repo.role}; ...` e `:699` a imprime sob "Repositórios". O campo que carrega significado para quem lê o briefing já existe e já funciona.

O que o registro efetivamente distingue não é `canonical`: é a pertinência ao array. `os context` percorre somente `project.repositories` (`bin/project-os.mjs:688`). `baseline_revisions` de cada run é `Object.fromEntries(project.repositories.map((repo) => [repo.id, repo.revision]))` (`:804`). `supporting_artifacts` aparece em três lugares, nenhum deles o briefing e nenhum deles a baseline: a validação de `local_paths` (`:524`), a inicialização de um projeto novo com array vazio (`:1015`) e a deduplicação do `os scan`, que evita reportar como não registrado um caminho já cadastrado (`:1071`).

A conclusão que sustenta esta decisão: **canonicalidade por papel já é expressável hoje, sem mudar o schema.** Não há booleano a consertar — o booleano já é inerte. O que falta é o repositório de desenho estar no array que o registro efetivamente lê.

## Decisão

**1. Canonicalidade é por papel e por domínio, não é propriedade binária do repositório.** Podem existir múltiplos repositórios canônicos ao mesmo tempo, desde que para domínios diferentes. Verificação: uma afirmação de canonicidade que não nomeia o domínio não é verificável, e não pode ser lida como decidida.

**2. Ao ser aceita, esta DEC autoriza que o repositório de desenho passe a constar no array `repositories` de `projects/mekora.json`, com um `role` que diga que ele é a fonte do desenho do produto.** Verbatim do Erik: "repo de desenho entra em repositories com role correto". O texto literal do `role` não é fixado aqui. Enquanto o estado desta DEC for "proposta", o manifesto permanece como está.

## O que esta decisão NÃO decide

- **Se `canonical` pode continuar sendo invocado para afirmar ou negar autoridade.** Que o campo é inerte é estado observado, registrado no Contexto. Proibir o seu uso seria decidir sobre canonicidade além do que o Erik decidiu, e prenderia a decisão seguinte. Pergunta em aberto: o campo `canonical` deve ser removido dos manifestos, mantido inerte, ou levado ao schema?
- **Se o `role` pode ou não falar de implementação.** O Erik disse apenas "role correto". Se o `role` do repositório de desenho pode declará-lo implementação canônica, ou se deve se limitar ao desenho, não foi decidido.
- **O texto literal do `role`** da entrada movida.
- **Se a entrada sai de `supporting_artifacts` ao entrar em `repositories`, ou permanece nos dois arrays.** Nada no verbatim diz. Pergunta em aberto: a entrada `cadernos_de_exploracao` é removida de `supporting_artifacts` quando passa a constar em `repositories`?
- **Se a entrada conserva o campo `canonical` depois de cadastrada em `repositories`.**
- **O vocabulário de roles.** Não existe lista fechada de valores de `role`, e o Erik não pediu uma. Esta DEC não cria uma e não fixa nenhum termo como obrigatório.
- **O escopo por domínio do baseline.** `baseline_revisions` continuará carimbando todos os repositórios em todo run, inclusive os que o run não toca (`bin/project-os.mjs:804`). Como corrigir isso — e se deve ser corrigido — fica em aberto, e permanece aberto depois desta DEC.
- **Se `supporting_artifacts` deve aparecer no briefing.** Hoje não aparece (`bin/project-os.mjs:688`). Esta DEC não muda isso e não decide se deveria mudar.
- **O destino da outra entrada de `supporting_artifacts`** (`flow_prototype`, `projects/mekora.json:100`–`:107`). Esta DEC trata só do repositório de desenho.
- **A DEC-0011 ponto 1.** Ele é emendado pela DEC-0025, proposta na mesma data, que separa "onde o produto é desenhado" de "qual base o implementa" e deixa a segunda em aberto. Esta DEC não toca nem uma coisa nem outra: ela decide em qual array do manifesto o repositório de desenho vive e o que o seu `role` diz. Dois repositórios canônicos em domínios diferentes — desenho e implementação — é exatamente o caso que o item 1 desta DEC admite.

## Consequências

**A alteração de `projects/mekora.json` acontece quando esta DEC for aceita, não antes.** Enquanto o estado for "proposta", o manifesto permanece como está. O que segue descreve o que passa a valer no momento da aceitação, e vale independentemente de a entrada sair ou não de `supporting_artifacts` — o que decide é ela constar em `repositories`.

Ao ser aceita:

- O briefing (`os context mekora`) passa a imprimir o repositório de desenho, com seu `role`, seu caminho local e sua revisão (`bin/project-os.mjs:688`–`:696`). Hoje ele não aparece.
- `baseline_revisions` passa a incluir a revisão do desenho em todo run novo (`bin/project-os.mjs:804`). Hoje ela nunca é carimbada.
- `os status mekora` passa a contar quatro repositórios em vez de três (`bin/project-os.mjs:649`–`:651`).

Isso conserta **metade** do R-008. A outra metade fica de pé: `baseline_revisions` carimba **todos** os repositórios em **todo** run, sem relação com o domínio do trabalho (`bin/project-os.mjs:804`). Um run de desenho passará a levar junto a revisão do backend `operational_app` e a do `experience`, que ele não tocou. A baseline continua descrevendo o registro inteiro em vez de descrever o que o run pode alterar. Trocar "a baseline não inclui o que foi mexido" por "a baseline inclui tudo, mexido ou não" é progresso, não é conserto.

BUGs conhecidos que a aceitação cria ou torna visíveis — implementação que passa a divergir da norma:

- `projects/mekora.json:11`, campo `stage`: hoje diz `desenho_do_produto_no_prototipo_de_mesa_fora_das_bases_registradas`. Aceita a DEC e cadastrada a entrada em `repositories`, a frase fica falsa: o desenho passa a estar dentro das bases registradas.
- `projects/mekora.json:106` e `:118`, campo `canonical`: continua no manifesto e continua inerte, como o Contexto registra. Esta DEC não decide o que fazer com ele; a divergência entre o que o campo aparenta dizer e o que ele faz permanece.
- `projects/mekora.risks.json:76`, R-008: a mitigação registrada oferece duas saídas — "promover os cadernos a repository, o que muda baseline_revisions e o significado de canonico" ou "registrar por escrito que o desenho vive num artefato de apoio de proposito". A primeira é a que esta DEC autoriza. O risco não pode ser fechado por isso: permanece aberto pela metade descrita acima, e o texto do risco precisa passar a dizer qual metade.
- `projects/mekora.json:131`, `note_2026_08_19`: a nota diz "Promover a repository exige decisao do Erik". Aceita esta DEC, a nota passa a descrever uma pendência que deixou de existir.
- `tests/cli.test.mjs:444`–`:461`: o teste copia o repositório real para um sandbox (`tests/cli.test.mjs:53`–`:61`), sobrescreve `manifest.repositories[0].local_paths` com `{ "windows-erikc": "C:/Users/erikc/mekora" }` e assere `/1 em outra/` sobre a saída de `os status`. A contagem vem de `bin/project-os.mjs:649`–`:651`, e `here` depende de a chave de máquina bater com `currentMachineId()` (`:90`–`:96`). Acrescentar uma quarta entrada com chave `windows-erikc` acrescenta um repositório à contagem de "em outra" quando o teste roda em `mac-mini-erik`, que é a máquina que a asserção pressupõe. O teste **não foi executado** nesta revisão — o mecanismo foi lido, o resultado não foi observado. Precisa ser rodado antes e depois da alteração.

Sobre a DEC-0009 ponto 3 (`decisions/DEC-0009-projects-are-born-registered.md:29`): "Ao encontrar repositório que não está em `projects/`, cadastrar antes de trabalhar nele." Não há violação a corrigir. O repositório está cadastrado desde 2026-08-12 (`projects/mekora.json:119`, `registered_at`). Estava na gaveta errada, não fora do registro.

## Histórico

Em 2026-08-12 o repositório foi registrado como artefato de apoio, e o próprio manifesto guardou a razão: "já existem duas explorações de experiência coexistindo sem decisão registrada sobre qual continua (mekora.status.md), e uma terceira candidata pioraria essa pendência". A escolha foi deliberada e, na data, defensável — eram cadernos.

Entre 14 e 19 de agosto, 25 runs do Mekora não tocaram nenhum dos três repositórios registrados. Todos alteraram `C:/Users/erikc/mekora`. Em 19/08 o manifesto ganhou a nota (`projects/mekora.json:131`): "Deixou de ser apenas caderno: entre 14 e 19/08 foi o unico lugar onde o produto foi desenhado (...) A classificacao canonical:false e a ausencia de revisao rastreada nao descrevem mais o papel real. Promover a repository exige decisao do Erik." O R-008 foi aberto na mesma data, e a revisão passou a ser rastreada (`0b12f1f`).

A hipótese que morreu no caminho foi a de que existia um booleano a consertar — que bastaria trocar `canonical: false` por `canonical: true`, ou criar um campo melhor. A auditoria mostrou que o booleano nunca fez nada: zero leituras em `bin/`, ausência do schema. A pergunta "este repositório é canônico?" era uma pergunta sobre um campo que ninguém lê. A pergunta que restou — em qual array ele está, e o que o `role` diz — já tinha resposta disponível no registro tal como ele é.

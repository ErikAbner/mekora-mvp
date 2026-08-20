# DEC-0028 — História se aposenta, não se apaga

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** nenhuma
**Decidido por:** — (proposta; nenhuma aceitação registrada)
**Proposta redigida a partir de:** sessão de reconciliação com Erik, 2026-08-20

## Contexto

O registro sabe nomear máquinas e não sabe aposentá-las. `machines.json` tem duas máquinas e cinco campos cada — `id`, `hostname`, `platform`, `role`, `home` — e nenhum campo de estado ou de ciclo de vida. A consequência prática é que, quando uma máquina sai de operação, a única operação que o formato oferece é remover a entrada.

Remover não é barato. `bin/project-os.mjs` consulta `machines.json` em três pontos de validação: `last_reviewed_from` (`:520-521`), as chaves de `local_paths` de cada repositório e artefato (`:532-534`) e `revision_source` (`:543-544`). `tests/cli.test.mjs:451` fixa literalmente `{ "windows-erikc": "C:/Users/erikc/mekora" }` e `:456` afirma a mensagem de máquina ausente (`NÃO EXISTE NESTA MÁQUINA (registrado em windows-erikc…)`). Os runs gravam a máquina de origem em `machine: currentMachineId()` (`bin/project-os.mjs:803`). Contagem de 20/08: `runs/` tem 171 arquivos de run; 127 têm o campo `machine`; desses, 101 gravam `"machine": "windows-erikc"` e 26 gravam `"machine": "mac-mini-erik"`; os 44 restantes são anteriores ao campo.

O Erik declarou na sessão que a máquina Windows vai ser zerada. O `role` dela em `machines.json` diz "PC Windows; fonte viva da Vynce", texto escrito em 2026-08-05 no commit que criou o arquivo (`2378dee`) e não alterado desde então — o commit de 06/08 (`cfe46c0`) só preencheu o `hostname`. É a mesma classe de defasagem que o risco R-008 registra em aberto (`projects/mekora.risks.json:69–:77`, com `"id": "R-008"` em `:70` e o título em `:71`), cuja evidência afirma que entre 14 e 19/08 houve 25 runs do Mekora e todos alteraram `C:/Users/erikc/mekora`.

Do outro lado está o material resgatado. `resgate/` existe no repositório do Mekora com 7,7 MB, `NOTA.md` declarando não-autoridade e `HASHES.txt` catalogando 56 arquivos — todos os 57 da árvore menos o próprio `HASHES.txt`. O texto de `resgate/NOTA.md:40` ainda diz "cataloga os 47 arquivos": número desatualizado dentro do próprio documento, verificado em 20/08. Dentro dele, `resgate/2026-08-14-a-20-artefato-publicado/` tem `LEIA.md` e `originais/`, e o `LEIA.md:4` remete ao `../NOTA.md`, que vale para todo o diretório `resgate/`.

`resgate/` foi criado para tirar material insubstituível de lugares onde ele podia sumir sem aviso. Não existe hoje destino registrado para ele depois da classificação: `arquivo/` não existe no repositório (verificado em 2026-08-20).

## Decisão

**1. Zerar a máquina é permitido. Removê-la do histórico não é.**

```
ZERAR ✓        REMOVER DO HISTÓRICO ✗
```

A máquina Windows pode ser zerada, e sua identidade histórica permanece registrada como aposentada. Um registro em que a entrada dela desapareceu está em violação desta decisão.

**2. A razão, nas palavras do Erik:**

> "Os 100 runs pertencem à história do projeto. Remover a máquina porque ela foi formatada seria como apagar um autor do histórico Git porque ele trocou de computador. A máquina física pode desaparecer. A identidade histórica dela não."

**3. Uma máquina fora de operação precisa ficar registrada com estado, papel anterior e data de aposentadoria.** O Erik esboçou uma forma possível — ilustração do que precisa caber, não especificação de campos:

```
machine: { id: windows-..., status: retired, previous_role: ..., current_role: none,
           retired_at: 2026-08-20 }
```

O que a decisão exige é que o papel anterior fique preservado, e não sobrescrito. Como representar isso não está decidido aqui.

**4. O material resgatado fica em `resgate/` até a reconciliação. Depois da reconciliação, cada item é classificado e arquivado.**

**5. Por enquanto, não se cria repositório separado para o resgate.** Razão do Erik: 7,7 MB não justifica essa complexidade. É critério de volume, e portanto revisável.

## O que esta decisão NÃO decide

- **Onde o material arquivado passa a viver.** O Erik disse "arquivar". Não nomeou diretório, nem caminho, nem declarou canonicidade de destino. `arquivo/` não existe no repositório hoje (verificado em 2026-08-20). Pergunta em aberto: o material classificado passa a viver num diretório nomeado dentro do repositório do Mekora, sim ou não? Se sim, qual?
- **Os nomes dos campos que representam a aposentadoria.** `status`, `previous_role`, `current_role` e `retired_at` vêm do esboço do item 3 e não estão fixados. Pergunta em aberto: esses quatro nomes são adotados como estão, sim ou não?
- **A alteração de `machines.json`.** Esta DEC descreve o estado que o registro precisa passar a representar. Ela não autoriza editar registros e não decide se `machines.json` ganha esquema de validação.
- **A emenda formal da DEC-0008.** Foi ela que fixou os cinco campos de `machines.json` ("Identificador, hostname, plataforma, papel e home", `decisions/DEC-0008-machine-aware-manifests.md:30`). Pergunta em aberto: a lista da DEC-0008 ponto 2 é mínimo aberto ou conjunto fechado? Enquanto isso não estiver escrito, esta DEC não emenda a DEC-0008 e o item 3 não é normativo sobre campos.
- **A partir de que volume a decisão de não criar repositório separado é reaberta.** O critério do Erik é volumétrico; o limiar não foi dito.
- **Quando a máquina Windows é efetivamente zerada.** Nenhuma data foi decidida. `retired_at: 2026-08-20` aparece no esboço como forma de campo, não como agendamento.
- **O que acontece com as transcrições de sessão.** Volume relatado na sessão: cerca de 60 MB, não verificado. Nada foi decidido sobre preservar, mover, comprimir ou descartar.
- **O destino do `artefato-mekora.html`,** 2.866.342 bytes versionados por ausência de regra. O Erik disse explicitamente para não mexer nisso agora.
- **Os critérios de classificação da reconciliação.** O que vale como "classificado", quem classifica e o que distingue arquivar de descartar continua em aberto.
- **O `role` correto da máquina Windows,** nem quando corrigi-lo.
- **Se a mesma regra de aposentadoria vale para repositórios, projetos ou DECs.** Não verificado; não decidido aqui.
- **Qual documento é a fonte da regra "estar num repositório não torna nada decisão vigente".** A regra está escrita como regra local em `resgate/NOTA.md` e é proposta como norma do projeto pela DEC-0027, itens 5 a 8. Esta DEC não a promove por conta própria. Pergunta em aberto: a fonte da regra passa a ser a DEC-0027, sim ou não?

## Consequências

1. **`machines.json` passa a precisar de representação de estado que hoje não existe.** As duas entradas atuais têm `id`, `hostname`, `platform`, `role` e `home`. Enquanto não houver como registrar aposentadoria, esta decisão não é representável no registro. Isto é consequência da aceitação — não é ação autorizada: o Erik não autorizou alterar registros nesta rodada.

2. **Remover a entrada `windows-erikc` quebraria três validações e um teste, e orfanaria 101 runs.** `bin/project-os.mjs:520-521` (`last_reviewed_from`), `:532-534` (chaves de `local_paths`) e `:543-544` (`revision_source`) passariam a acusar máquina desconhecida; `tests/cli.test.mjs:451` e `:456` falhariam, porque fixam o identificador literal; e os 101 arquivos de run que gravam `"machine": "windows-erikc"` apontariam para uma máquina que o registro não conhece. Esta decisão evita isso por desenho — a entrada nunca sai.

3. **Nenhuma validação precisa mudar para a decisão valer.** Uma máquina aposentada continua sendo uma entrada válida de `machines.json`, então `knownMachineIds()` (`bin/project-os.mjs:84`) continua resolvendo runs e manifestos antigos. O que muda é o significado da entrada, não a existência dela.

4. **O `role` da máquina Windows passa a ser dívida declarada.** "PC Windows; fonte viva da Vynce" está no arquivo desde 05/08 e não acompanhou o que o R-008 descreve. O efeito é de registro, não de saída da ferramenta: o `role` de máquina não é lido em nenhum ponto de `bin/project-os.mjs` — o único `role` impresso por `os context` é o do repositório (`:696`), e de `machines.json` a CLI lê `hostname` (`:78`) e `id` (`:84`). A dívida fica ligada ao R-008 (`projects/mekora.risks.json:69–:77`), sem correção autorizada aqui.

5. **`resgate/` continua sendo o lugar do material até a reconciliação, e continua sem autoridade.** Como o destino posterior não está decidido, nenhum caminho novo passa a existir por efeito desta DEC.

6. **`resgate/NOTA.md` continua valendo como declaração local do diretório.** Esta decisão não o substitui nem transfere para si a autoridade daquela regra.

7. **Os 7,7 MB continuam dentro de `C:/Users/erikc/mekora`,** com `HASHES.txt` como mecanismo de integridade, enquanto o critério de volume não mudar.

## Histórico

`machines.json` nasceu com a DEC-0008 (aceita, 05/08), depois de dois erros reais de registro: um `capability_snapshot.sobre` que ficou `not_implemented` por uma semana e um `revision` apontando commit inexistente na máquina fonte — os dois descritos em `decisions/DEC-0008-machine-aware-manifests.md` e registrados como R-006 em `projects/vynce.risks.json:56–:64`, fechado em 05/08 pela própria DEC-0008. O problema que ela resolveu era espacial: o registro mentia para quem lia da outra máquina. Ela fixou cinco campos por máquina e não previu tempo, porque nenhuma máquina havia saído de operação.

O `role` do Windows foi escrito em 05/08, no commit que criou o arquivo, quando aquela máquina era descrita pelo trabalho da Vynce. O registro não acompanhou a mudança — é a classe de defasagem que o R-008 nomeia ("O produto e desenhado fora dos repositorios que o registro rastreia", `projects/mekora.risks.json:71`), aberto até hoje.

`resgate/` foi criado em 20/08 para tirar material insubstituível de lugares onde ele podia sumir sem aviso — parte veio do cache de anexos do Codex, cujo índice mantém um campo `pendingRemovalPaths`, isto é, arquivos que viviam numa fila de remoção por design. Desde o início `resgate/NOTA.md:16` já escrevia o caminho: "resgatar → preservar → classificar → só então decidir autoridade".

A ideia de dar ao material resgatado um repositório próprio foi considerada nesta rodada e descartada por enquanto, pelo volume.

Observação de quem redigiu, não decisão do Erik: as duas metades deste documento respondem a perguntas que ele respondeu separadamente — a aposentadoria da máquina e o ciclo do resgate. A afinidade entre elas é a distinção que `resgate/NOTA.md` já desenhava, entre autoridade normativa e estado observado. Se for melhor aceitá-las em separado, esta proposta pode ser partida em duas.

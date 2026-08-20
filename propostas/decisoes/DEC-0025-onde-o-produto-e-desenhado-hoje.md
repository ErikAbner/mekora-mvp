# DEC-0025 — O papel do canvas-motion, e onde o desenho aprovado vive

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** emenda a DEC-0011, ponto 1. Os pontos 2, 3, 5 e 6 permanecem vigentes e são
preservados explicitamente. O ponto 4 é tratado à parte — ver Consequências.
**Proposta redigida a partir de:** sessão de reconciliação com Erik, 2026-08-20
**Aceita em:** —

## Contexto

A DEC-0011, aceita em 11/08 e nunca emendada, fixa no ponto 1: *"`mekora-canvas-motion` é o frontend
canônico do Mekora. É onde a interface do produto é construída daqui em diante."*

Isso deixou de descrever o projeto. Entre 14 e 20/08 o desenho do produto avançou em 25 runs, e
nenhum deles tocou `canvas-motion`, `mekora-app` ou `mekora-experience`. O risco R-008 do registro
nomeia o sintoma: *"O produto é desenhado fora dos repositórios que o registro rastreia."* A
consequência mecânica é que 58 runs gravam `baseline_revisions` com três hashes observados em
05/08, de repositórios que não receberam nenhuma dessas mudanças.

O ponto 1 confundia dois papéis numa frase só: **onde o desenho acontece** e **qual é a base de
implementação da interface**. A emenda separa os dois e responde o primeiro.

## Decisão

1. **A DEC-0011 é emendada, não revogada.** As partes ainda válidas são preservadas. Verbatim de
   Erik: *"emendar DEC-0011, não jogar fora as partes ainda válidas."*

2. **O ponto 1 da DEC-0011 passa a ter esta redação:**

   > `mekora-canvas-motion` **deixa de ser o frontend canônico** do Mekora. Passa a ser fonte
   > exploratória de comportamento, motion, componentes, funções, superfícies e hipóteses de
   > interface. O desenho aprovado do produto é consolidado na fonte de design vigente definida pelo
   > projeto.

3. **Os pontos 2, 3, 5 e 6 da DEC-0011 permanecem vigentes**, e são repetidos aqui para que esta
   emenda não seja lida como revogação:

   - **2.** O frontend de `mekora-app` continua legado: roda, é o único cliente que exercita o
     pipeline operacional ponta a ponta, e não recebe recurso novo.
   - **3.** O backend de `mekora-app` permanece como serviço, e é o ativo a preservar.
   - **5.** A integração acontece por contrato de API, não por fusão de repositórios.
   - **6.** A condição de aposentadoria do frontend legado é inalterada: ele sai quando a interface
     nova cobrir importar com validação, acompanhar a conversão até o fim, e enviar ao Kindle.

4. **Caminho local não governa o projeto.** Nenhuma penalidade, desvio ou obrigação de registro nasce
   do fato de alguém ter trabalhado fora de uma pasta específica. `C:/Users/erikc/mekora` é
   circunstância de uma máquina, não norma.

5. **A governança rastreia papel de repositório, não pasta física.** A pergunta que o registro
   precisa responder é *qual fonte tem qual papel* — não *em que diretório alguém estava naquele
   dia*. A implementação disso é matéria da DEC-0026.

## O que esta decisão NÃO decide

- **Qual é, nominalmente, a fonte de design vigente.** O item 2 diz que o desenho aprovado é
  consolidado nela; não a nomeia. Erik foi explícito ao evitar escrever hoje que uma ferramenta
  específica é eternamente canônica — mais adiante podem coexistir design system em código, arquivo
  de design e implementação, e a decisão de qual manda entre elas ainda não foi tomada.
- **O que acontece com `mekora-canvas-motion` daqui em diante.** Ele deixa de ser canônico e ganha
  papel exploratório. Se continua recebendo trabalho, em que ritmo, e se um dia é aposentado, não foi
  decidido.
- **Sobre qual base a interface do produto será implementada.** O ponto 1 deixava isso confundido com
  o desenho; a emenda desfaz a confusão e não responde a segunda metade. É decisão própria, ainda não
  tomada.
- **O que acontece com `mekora-experience`.** Ver Consequências, item 4.
- **Se `prototipo-mesa.html` é ele próprio a fonte do desenho aprovado, ou um instrumento de
  exploração como o `canvas-motion`.** Hoje é onde o produto é desenhado; o item 2 não o promove.

## Consequências

1. **A DEC-0011 passa a declarar `amended_by: DEC-0025, escopo: ponto 1`.** Pela DEC-0027, emenda
   parcial não muda o estado do documento emendado: a DEC-0011 permanece `accepted`.

2. **A pergunta "onde eu mexo?" muda de resposta, e continua tendo resposta escrita.** Era esse o
   mérito declarado da DEC-0011 nas suas consequências — *"A pergunta 'onde eu mexo?' tem resposta
   escrita, e não depende de ninguém lembrar."* A emenda preserva o mérito e corrige o conteúdo.

3. **O R-008 fica parcialmente endereçado.** Esta DEC corrige a norma; a DEC-0026 corrige o registro,
   fazendo o repositório de desenho entrar em `repositories` e passar a ter revisão rastreada nos
   runs. Nenhuma das duas resolve o escopo por domínio do `baseline_revisions`, que segue como
   questão separada.

4. **O conflito entre a DEC-0011 ponto 4 e a DEC-0017 é tratado como emenda parcial, não como
   substituição.** O ponto 4 diz que `mekora-experience` "sai do caminho crítico" e "não é base de
   trabalho"; a DEC-0017, posterior, diz que as duas bases de experiência são fontes e nenhuma é
   descartada. A saída conservadora é a DEC-0017 emendar aquele trecho da DEC-0011 — e não substituir
   a DEC inteira. **Este conflito é anterior a esta rodada**, e a resolução formal acontece na
   reconciliação, com o vocabulário da DEC-0027.

5. **A DEC-0011 mandava corrigir o `mekora.status.md`** quanto ao caminho de `mekora-app`, à revisão
   observada e à ausência de clone do `mekora-experience`. As correções nunca foram feitas, e o
   documento ainda abre com "Última revisão: 2 de agosto". A dívida é anterior e continua aberta.

6. **Nenhuma norma nova de processo é criada.** Uma versão anterior desta proposta transformava
   trabalho fora de `C:/Users/erikc/mekora` em "desvio que exige registro próprio". O item 4 diz o
   oposto, e diz por quê.

## Histórico

O ponto 1 da DEC-0011 foi escrito em 11/08 depois de uma auditoria que apurou fatos ainda válidos: os
dois frontends são pilhas incompatíveis e não variações de estilo — React Router, Tailwind, i18next e
axios de um lado; vinext sobre Vite com RSC, tokens CSS próprios e deploy em Cloudflare Workers do
outro. Unificar não seria apagar estilo antigo: seria escolher uma pilha e reescrever a outra. Esse
diagnóstico não é desfeito por esta emenda.

O que mudou foi outra coisa. O `canvas-motion` foi escolhido como frontend canônico quando o trabalho
diário acontecia nele — 51 commits entre 1º e 4 de agosto, 41 deles num único dia. A partir de 12/08
o desenho migrou para um protótipo autocontido, e a escolha de 11/08 passou a descrever um passado.

Uma versão anterior desta proposta escrevia, na seção Decisão, que a base de implementação "fica em
aberto" — o que teria **removido autoridade vigente do `canvas-motion` sem decisão do dono**. Erik
depois decidiu explicitamente que ele deixa de ser canônico e ganha papel exploratório, e é isso que
o item 2 registra. A distinção importa: uma coisa é o dono decidir; outra é o documento desativar por
inferência.

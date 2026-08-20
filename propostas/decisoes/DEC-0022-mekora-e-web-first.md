# DEC-0022 — O Mekora é web-first

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** nenhuma
**Proposta redigida a partir de:** sessão de reconciliação com Erik, 2026-08-20
**Aceita em:** —

## Contexto

O produto afirma duas coisas incompatíveis sobre si mesmo, no mesmo arquivo. Na tela que a pessoa lê:
"Pode fechar a aba: o trabalho não é feito no seu computador" (`prototipo-mesa.html:2000` e
`:3179`). E três vezes, ao justificar recusas de feature: "o produto é local" (`:6587`), "numa
ferramenta local" (`:6647`), "um corpo de leitores que um produto local não tem" (`:6652`).

A auditoria de 20/08 registrou isso como a contradição B4, e a classificou como bloqueio à escrita
do PRD: privacidade, a seção Arquivos, o sentido de "aparelho" e a tela inteira de tradução dependem
da resposta.

A premissa local-first é anterior e está documentada em artefato executável. O protótipo de
31/07/2026, preservado em `resgate/2026-07-31-mekora-library-lab/`, fixa na barra lateral de todas as
telas: *"Processamento local — Seus arquivos ficam sob seu controle."* Uma busca por conta, nuvem,
sincronização, servidor ou login naquele material devolve zero ocorrências. Não era omissão de
protótipo; era ausência sistemática. O caderno 02 corrigiu a premissa em 10/08 e a DEC-0018
consolidou o argumento de conta. Esta decisão torna explícito o que ficou implícito.

## Decisão

### A direção

1. **Web-first é a direção vigente.** O Mekora é um produto web, acessado pelo navegador e pela
   internet.
2. **O navegador é o cliente.**
3. **Processamento, armazenamento e sincronização podem ocorrer na infraestrutura do produto.**
4. **O Mekora é account-based.**
5. **A premissa local-first está obsoleta.** Nenhuma tela, microcópia ou argumento de recusa pode
   invocá-la.
6. **A integração física com Kindle por cabo permanece como questão técnica separada**, até que se
   verifique a arquitetura adequada para um produto web. Esta decisão não a autoriza nem a descarta.

### O conteúdo não vai para terceiros

7. **O conteúdo usado para tradução é processado dentro da infraestrutura controlada pelo Mekora, e
   não é enviado a provedores terceiros de tradução ou de IA.**

   Isto é regra dura, e a consequência técnica é assumida: implica tradução própria ou
   self-hosted. O produto avalia depois *como* cumprir; a implementação não decide isto em silêncio.

### Baseline de privacidade e retenção

8. O comportamento do produto quanto a arquivos é o seguinte. **São afirmações de comportamento, não
   de conformidade legal** — nenhuma delas alega adequação a qualquer regulação, e a revisão jurídica
   é etapa própria e posterior.

   | | comportamento |
   |---|---|
   | **Original importado** | temporário; eliminado depois de conversão validada (DEC-0021, item 5) |
   | **Conteúdo canônico** | permanece enquanto o item existir na biblioteca |
   | **Trânsito** | criptografado |
   | **Armazenamento** | criptografado |
   | **Acesso** | a pessoa dona da conta, e os processos mínimos do serviço necessários para operar |
   | **Acesso humano interno** | excepcional, auditável, e vinculado a suporte ou operação |
   | **Exclusão** | ato explícito de exclusão permanente elimina o arquivo e seus derivados |

9. **A pergunta de privacidade está reformulada.** Ela deixa de ser "este arquivo pode sair da sua
   máquina?", porque usar o produto já envolve upload. As perguntas que valem agora, e que o item 8
   responde em nível de baseline, são: quanto tempo o original é mantido; onde os arquivos ficam; se
   são criptografados; quem e que processos podem acessá-los; e o que é eliminado depois da conversão.

## O que esta decisão NÃO decide

- **Onde a infraestrutura fica.** Região, provedor e jurisdição não foram decididos, e a jurisdição
  tem efeito jurídico direto.
- **Que algoritmo, chave ou modelo de criptografia é usado**, nem se o produto tem acesso ao
  conteúdo em claro durante o processamento.
- **O que é "processo mínimo necessário"**, nem como o acesso humano interno é auditado e por quem.
- **O prazo entre a falha de conversão e o descarte do original.** A DEC-0021 fixa que ele é
  temporário; nenhuma das duas fixa o número.
- **Como a tradução própria é construída.** A regra do item 7 é o limite; a arquitetura que a cumpre
  é trabalho técnico ainda não iniciado, e pode ter custo relevante.
- **Se algum outro processamento além da tradução pode usar terceiros.** O item 7 nomeia tradução e
  IA. OCR, extração e geração de capa não foram tratados nesta rodada.
- **Autenticação.** A AUTH-001 permanece pendente e proíbe desenhar tela de senha, provedor, sessão
  ou verificação. Ser account-based não a destrava.
- **O que acontece com o trabalho feito antes de a conta existir.** É fluxo de V1 e continua aberto.

## Consequências

1. **A contradição B4 está encerrada.** As três ocorrências de "produto local" em `:6587`, `:6647` e
   `:6652` passam a ser texto a corrigir, se esta DEC for aceita.

2. **Um argumento de recusa caducou.** "Destaques populares" foi recusado em 20/08 porque "depende de
   um corpo de leitores que um produto local não tem". Sob web-first, essa razão não se sustenta como
   está. A recusa pode continuar de pé por outro motivo — esta DEC não reabre a feature, apenas
   registra que a justificativa registrada perdeu validade.

3. **A tradução tem agora um limite arquitetural, não uma pergunta.** O item 7 fecha a contradição
   B5 da auditoria por outro caminho que o esperado: não se decide *se* o texto sai, decide-se que
   ele **não sai**. A tela de tradução, desenhada em `:4800-4812` como seletor de idioma, deixa de
   precisar virar pedido de consentimento para terceiros — porque não há terceiro.

4. **O custo da tradução própria entra no orçamento do produto.** É a consequência mais cara desta
   DEC e está assumida deliberadamente.

5. **A DEC-0018 mantém tradução de texto no MVP como funcionalidade principal.** Com o item 7, isso
   passa a implicar infraestrutura de tradução própria dentro do MVP. Se isso é viável no prazo é
   pergunta de execução, não de norma.

6. **O baseline do item 8 é material direto para o PRD.** A auditoria classificou "Privacidade e
   retenção" como bloco parcial, com o comportamento descrito e o prazo faltando. Sete das oito
   linhas agora existem.

## Histórico

A premissa local-first não foi um detalhe de implementação: foi promessa exibida ao usuário, fixa em
todas as telas do protótipo de 31/07. Ela nomeava o produto — o nome anterior era **Kindle Local**, e
o material de 24/07 preservado em `resgate/2026-07-24-kindle-local-repo/` traz em `app/page.tsx:151`
a frase "O arquivo é processado localmente. Apenas o resultado final é enviado ao seu Kindle."

Entre 24 e 31 de julho o produto inverteu de direção — o Kindle deixou de ser destino e virou fonte.
Em 10/08 o caderno 02 registrou a correção de premissa. Em 12/08 a DEC-0018 fixou o argumento de
conta. Nenhuma decisão registrada, até hoje, declarou o oposto de local-first com todas as letras, e
por isso a linguagem antiga sobreviveu dentro do produto durante três semanas, sendo usada para
recusar features.

Erik, em 20/08: *"a premissa local-first está obsoleta. O Mekora evoluiu para um produto web,
acessado pelo navegador e pela internet."*

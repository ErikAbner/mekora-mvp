# DEC-0022 — Mekora é web-first

**Data:** 2026-08-20
**Estado:** proposta
**Projeto:** Mekora
**Substitui / emenda:** nenhuma
**Decidido por:** Erik, em 2026-08-20

## Contexto

O Mekora nunca declarou em DEC onde roda. Uma busca por `local-first`, `produto local`,
`processamento local` ou `ferramenta local` em
`C:/Users/erikc/Projeto-os/erik-project-os/decisions/` devolve zero ocorrências. A premissa
local-first viveu em tela e em prosa; nunca teve autoridade normativa. Por isso ela pôde ser
contrariada dentro do próprio produto sem que nada quebrasse formalmente.

O resultado é a contradição B4 da auditoria: o mesmo arquivo afirma as duas coisas. Na resposta ao
leitor, `prototipo-mesa.html:2000` diz **"Pode. O preparo não é feito no seu computador."**, e o
rodapé do fluxo de preparo, em `prototipo-mesa.html:3179`, imprime **"Pode fechar a aba: o trabalho
não é feito no seu computador."**

Alguns milhares de linhas abaixo, no mesmo arquivo, a premissa oposta é usada como fundamento de
recusa: `prototipo-mesa.html:6587` — **"o produto é local, e a biblioteca é de uma pessoa só"**;
`prototipo-mesa.html:6647` — "Numa ferramenta local, isso é o sintetizador do sistema operacional";
`prototipo-mesa.html:6652` — "depende de um corpo de leitores que um produto local não tem".

As duas afirmações não podiam ser resolvidas por observação, porque nenhuma das duas é decisão: um
protótipo é estado observado, não autoridade normativa — regra escrita na DEC-0027. Esta DEC trata
a contradição pelo lado normativo: declara qual das duas premissas o dono do produto reconhece como
vigente.

## Decisão

1. **Web-first é a direção vigente.** O Mekora é um produto web, acessado pelo navegador e pela
   internet.
2. **O navegador é o cliente.**
3. **Processamento, armazenamento e sincronização podem ocorrer na infraestrutura do produto.**
4. **O Mekora é account-based.**
5. **A premissa local-first está obsoleta.**
6. **A integração física com Kindle/USB permanece como questão técnica separada**, até que se
   verifique a arquitetura adequada para um produto web.
7. **A pergunta de privacidade está reformulada.** Ela deixa de ser "este arquivo pode sair da sua
   máquina?", porque usar o produto já envolve upload. Passa a ser, nas palavras do Erik:
   - "quanto tempo mantemos o original?"
   - "onde os arquivos ficam?"
   - "são criptografados?"
   - "quem/processos podem acessá-los?"
   - "o que é eliminado depois da conversão?"

   As cinco perguntas ficam registradas. Nenhuma delas é respondida aqui. A única exceção parcial
   está anotada na seção seguinte.

## O que esta decisão NÃO decide

- **Retenção do original.** Quanto tempo o arquivo recebido é mantido — em aberto. Nenhum prazo,
  nenhuma política.
- **Onde os arquivos ficam.** Nenhum lugar, provedor, região ou tecnologia foi dito — em aberto.
- **Se os arquivos são criptografados.** Nada foi decidido — em aberto.
- **Quem, ou que processos, podem acessá-los** — em aberto.
- **O que é eliminado depois da conversão.** Registrado por honestidade: a **DEC-0021**, proposta na
  mesma data, responde em parte esta pergunta ao fixar a ordem "PDF recebido → converter → validar
  EPUB → persistir EPUB → só então descartar o PDF temporário" (DEC-0021, decisão 8). Ela decide *o
  quê* é descartado; não decide *quando*, *onde* o arquivo ficou até lá, nem quem teve acesso. As
  outras quatro perguntas permanecem inteiramente abertas.
- **O modelo de privacidade e retenção como um todo.** Que ele precise ser reconciliado a partir do
  web-first é consequência visível; nenhuma obrigação, prazo ou responsável foi decidido — em aberto.
- **Se a tradução envia texto a um terceiro.** A DEC-0018 mantém tradução no MVP para documentos de
  texto (DEC-0018:15-17). Para onde esse texto vai não foi decidido em lugar nenhum — em aberto.
- **A arquitetura do Kindle por cabo.** Isolada pelo item 6 da Decisão — em aberto.
- **Autenticação.** AUTH-001 continua pendente. "Account-based" não autoriza desenhar tela de senha,
  provedor, sessão ou verificação.
- **Se a conta é obrigatória ou opcional.** A DEC-0018 registra que "a conta é opcional e pedida"
  depois de converter (DEC-0018:31); `prototipo-mesa.html:2000` descreve o caminho sem conta.
  "Account-based" e "conta opcional" precisam ser reconciliados, e a reconciliação não acontece aqui.
- **Se "Destaques populares" entra ou sai do produto.** Ver Consequências.
- **Se algum processamento continua podendo acontecer no cliente.** A decisão diz que processamento
  *pode* ocorrer na infraestrutura; não diz que precisa ocorrer só lá. Não verificado, em aberto.

## Consequências

**1. Enquanto esta DEC estiver em estado "proposta", nada no protótipo vira bug.** A norma ainda não
existe — DEC-0027. A contradição B4 permanece estado observado inconsistente. **Se esta DEC for
aceita**, passam a ser BUG conhecido de texto — implementação divergente da norma, não disputa de
autoridade — estas três linhas de prosa de justificativa:

| Linha | Texto |
|---|---|
| `prototipo-mesa.html:6587` | "o produto é local, e a biblioteca é de uma pessoa só" |
| `prototipo-mesa.html:6647` | "Numa ferramenta local, isso é o sintetizador do sistema operacional" |
| `prototipo-mesa.html:6652` | "depende de um corpo de leitores que um produto local não tem" |

As linhas `:2000` e `:3179` estão de acordo com esta DEC e não mudam.

**2. Aceita esta DEC, nenhuma justificativa nova pode se apoiar na premissa revogada.** Uma recusa,
uma tela ou um documento escrito depois da aceitação não pode citar "produto local" como fundamento.
Uma verificação possível — não executada aqui, e não requisito desta DEC — é buscar "produto local",
"ferramenta local" e "processamento local" nos artefatos vigentes e conferir o que sobra.

**3. O argumento registrado contra "Destaques populares" caducaria.** A recusa está escrita em
`prototipo-mesa.html:6652`: "depende de um corpo de leitores que um produto local não tem". Aceita
esta DEC, esse argumento deixa de valer **como está** — a premissa que o sustentava foi declarada
obsoleta. A recusa pode continuar de pé por outra razão, já presente no mesmo arquivo em
`:6586-6588`: "Não temos esse corpo e não vamos ter (...) Prometer isso seria prometer um dado que
não existe." Mas essa é outra razão, e ela ainda não foi escrita como fundamento único. **Esta DEC
não decide a feature.** Ela apenas registra que a razão arquivada não pode mais ser citada na forma
em que está.

**4. A pergunta de privacidade muda de natureza.** Não é mais "este arquivo pode sair da sua
máquina?" — usar o produto já envolve upload. As cinco perguntas do item 7 passam a valer no lugar
dela. **Elas não são respondidas aqui.** Qualquer tela, texto de interface ou promessa que responda
alguma delas antes de haver decisão está prometendo o que não foi decidido.

**5. A pergunta da tradução muda junto.** A DEC-0018 mantém tradução de documentos de texto dentro
do MVP (DEC-0018:15-17). Sob web-first, perguntar se o texto sai da máquina não separa mais nada: o
texto já saiu. A pergunta que resta é outra — "o texto vai para um terceiro?" —, e ela continua
aberta. Se alguma decisão anterior já dependia da resposta antiga: não verificado.

**6. Um argumento que dependa do Kindle por cabo está apoiado em algo não decidido.** O item 6 isola
a integração física como questão técnica separada, sem arquitetura verificada. Quem citar essa
integração como fundamento está citando pendência, não decisão.

**7. AUTH-001 continua pendente.** Nada aqui autoriza desenhar tela de autenticação. O item 4 fixa
que o produto é account-based; não fixa provedor, fluxo, sessão, verificação nem momento do cadastro.

**8. O material do resgate não se corrige.** `resgate/2026-07-31-mekora-library-lab/` é material
histórico incompatível, não bug. Continua como está, sob a não-autoridade declarada em
`resgate/NOTA.md`: "Estar aqui não torna nada uma decisão vigente."

**9. Fica registrada a pendência de reconciliar "account-based" com a conta opcional da DEC-0018.**
Registrada aqui; não decidida aqui.

## Histórico

O artefato executável de 31/07/2026, hoje preservado em
`C:/Users/erikc/mekora/resgate/2026-07-31-mekora-library-lab/`, exibia a premissa local-first como
promessa de interface, não como detalhe de implementação. Em `outputs/index.html:24` a barra lateral
fixa o par: **"Processamento local — Seus arquivos ficam sob seu controle."**

A prova negativa está no mesmo material: uma busca por conta, nuvem, sincronização, servidor ou
login naquele artefato devolve zero ocorrências — o único arquivo do diretório que menciona esses
termos é o `LEIA.md`, escrito depois, no resgate. Não é omissão de protótipo; é ausência sistemática.

A premissa foi corrigida em 10/08, no caderno 02
(`caderno-02-preferencias-e-prototipo.html:533` — "premissa corrigida: produto com conta e
continuidade"), e a DEC-0018 registra o cadastro como conta opcional pedida depois de converter
(DEC-0018:31). Desde então o produto passou a se comportar como produto web —
`prototipo-mesa.html:2000` e `:3179` são a evidência —, mas a premissa antiga sobreviveu na prosa e
continuou sendo usada para recusar features (`:6587`, `:6647`, `:6652`).

Esta DEC não muda a direção do produto. Ela torna explícito o que ficou implícito em 10/08 e na
DEC-0018, e fecha a porta pela qual a premissa revogada continuava entrando.

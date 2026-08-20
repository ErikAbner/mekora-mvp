# Reconciliação — primeira leva: as quatro fundações

**Data:** 2026-08-20
**Estado:** análise apresentada, **nenhuma DEC foi alterada**
**Método:** por assunto, não por número de DEC

Quatro assuntos estruturais, escolhidos porque as outras features assumem o que eles decidem. O
Reader antigo, por exemplo, pressupõe PDF persistido — avaliá-lo antes de reconciliar conteúdo seria
julgar uma interface em cima de uma premissa morta.

> **Regra desta leva:** nada foi marcado `superseded`, `revoked` nem emendado. As alterações
> normativas aparecem como **proposta**, ao fim de cada assunto, para o Erik aprovar.

---

## Assunto 1 — Identidade e modelo de conteúdo

### 1. Estado normativo atual

**DEC-0021** (accepted, 20/08) determina duas famílias canônicas, ingestão transacional, original não
persistido depois de conversão validada, identidade estável própria e título proibido como
identidade.

**DEC-0011** (accepted, 11/08) não decide sobre conteúdo, mas nomeia a lacuna nas consequências:
*"O próximo marco técnico passa a ser o modelo de livro persistente: a entidade que `ProcessingJob`
não é."*

### 2. Histórico relevante

| quando | o quê |
|---|---|
| 02/08 | Mapa de capacidades registra o conflito nº 3: **"Job versus livro"** — o app persiste uma execução de processamento; a V2 pressupõe item bibliográfico durável. Biblioteca persistente classificada **D** (existe parcialmente ou há conflito entre as bases). |
| 11/08 | DEC-0011 nomeia o marco e para ali, porque faltava resposta de produto. |
| **14/08 04:13** | **A entidade foi criada.** Run `20260814T041344Z`, na máquina `mac-mini-erik`. |
| 20/08 | DEC-0021 dá a resposta de produto. |

### 3. Estado observado — e aqui está o achado desta leva

**Existem duas implementações divergentes, e a auditoria só tinha visto uma.**

O run de 14/08 registra, com verificação:

```
files_changed:  db/schema.ts · app/lib/book.ts · tests/book.test.mjs · drizzle/0000_certain_the_hood.sql
verification:   npm test 139 passaram (13 novos), 0 falharam
                npm run lint: 0 erros
                npm run db:generate: 4 tabelas
machine:        mac-mini-erik
```

Quatro tabelas — **livros, notas, tags, livro_tags** — com os campos tirados da própria tela de
Estante, mais funções puras de domínio em `app/lib/book.ts`, com testes.

Do outro lado, `prototipo-mesa.html` indexa por título: `LIVROS` chaveado pelo título (`:1858`),
pertinência por `d.livro===ARQ.titulo` (`:2441`), chave da nota `"d"+sig(lv)+cap+par` (`:2455`).

**O modelo existe. Só não existe onde a auditoria olhou.**

### 4. Convergências

Duas decisões de modelagem do run de 14/08 são compatíveis com a norma atual, e devem ser
preservadas:

- **Progresso é derivado de posição/total na unidade nativa, nunca gravado como porcentagem** —
  *"porcentagem gravada não sobrevive à reconversão e não volta a ser posição"*. Coerente com a
  DEC-0016 (âncora semântica manda) e com a DEC-0021 item 11 (preservar estrutura, não apresentação).
- **A origem do livro fica no dado e governa a permissão de leitura** — mantém a regra do Kindle
  somente-leitura fora do alcance de cada tela nova.

### 5. Divergências

| | |
|---|---|
| **Norma** | DEC-0021 itens 12 e 13: identidade estável própria; título proibido como identidade |
| **Observado (protótipo)** | identidade por título, em três pontos |
| **Observado (canvas-motion)** | schema com 4 tabelas e migração gerada — **conformidade não verificada**, o disco está no Mac |

### 6. Evidência de rejeição explícita

Três coisas foram **recusadas**, não apenas abandonadas — e isso é informação mais forte que "antigo":

- **Work → Edition → Representation**, recusado por Erik em 20/08: *"sofisticado demais para um
  problema que vocês não querem ter."*
- **Original/Adaptado/Comparar**, DEC-0021 item 7: deixa de ser regra do produto. Estava implementado
  em `:2663` e `:2676`.
- **Porcentagem gravada como progresso**, run 14/08: recusada com razão técnica escrita.

### 7. Princípio recorrente

```
PRINCÍPIO RECORRENTE — derivar em vez de gravar
```

Quatro ocorrências independentes, por caminhos separados:

| quando | onde |
|---|---|
| 14/08 | progresso derivado de posição/total, nunca gravado |
| 18/08 | contagem do filtro derivada do acervo, não escrita |
| 19/08 | descrição do livro derivada, nunca composta |
| — | `scripts/README.md`: *"Derivar é mais barato que verificar, e não precisa ser lembrado"* — porque `96` estava escrito à mão em dez superfícies |

Quatro vezes é padrão, não coincidência. **Candidato forte a princípio do `PRODUTO.md`.**

### 8. Resultado

- **DEC-0021** — permanece vigente, sem alteração.
- **DEC-0011** — permanece vigente. A consequência que apontava o "modelo de livro persistente" como
  próximo marco foi **cumprida em 14/08**, três dias depois de escrita. O documento não registra isso.
- **DEC-0016** — permanece vigente e reforçada.

### 9. Ação normativa proposta

**Nenhuma DEC nova.** Duas anotações:

1. A DEC-0011 merece nota de consequência cumprida, apontando o run de 14/08. Não é emenda: é
   fechamento de pendência.
2. **A4 e A5 de `ABERTO.md` podem já ter resposta.** "O formato do identificador" e "como relacionar
   duas importações do mesmo título" são exatamente o que um schema Drizzle com quatro tabelas
   resolve. **Ler `db/schema.ts` no Mac antes de decidir** — decidir agora arriscaria inventar pela
   terceira vez algo que já existe.

### 10. Ação posterior

- **BUG / DRIFT:** `prototipo-mesa.html:1858`, `:2441`, `:2455` divergem da DEC-0021. Não é decisão;
  é defeito com endereço.
- **Correção de registro:** ver o achado abaixo.

---

## ⚠ Correção à auditoria — a evidência do R-008 está errada

O risco R-008 afirma, em `projects/mekora.risks.json`:

> *"Entre 14 e 19/08 houve 25 runs do Mekora e nenhum tocou operational_app, experience ou
> canvas_motion."*

**Isso é factualmente falso.** Verificado run a run, dos 30 runs do Mekora naquela janela, **dois
rodaram no Mac e tocaram `canvas-motion`**:

```
20260814T035817Z   mac-mini-erik   app/globals.css · tests/design-tokens.test.mjs
20260814T041344Z   mac-mini-erik   db/schema.ts · app/lib/book.ts · tests/book.test.mjs · drizzle/0000_*.sql
```

Os dois na madrugada de 14/08. A partir das 15h12 daquele dia, tudo migrou para o protótipo no
Windows — e é essa segunda metade que o R-008 descreve corretamente.

**Por que importa:** o run das 04h13 é o trabalho tecnicamente mais consequente do período. A
evidência do R-008, como está, faria alguém concluir que a entidade de livro nunca foi construída —
e reconstruí-la seria a terceira vez que este projeto inventa a mesma coisa.

Eu propaguei esse erro no relatório de auditoria. A correção é do registro, não da decisão.

---

## Assunto 2 — Conversão e ingestão

### 1. Estado normativo atual

**DEC-0021** itens 5, 8, 9, 10 e 11: ingestão transacional, contrato funcional de dez verificações,
três resultados (`concluído` · `concluído com avisos` · `falhou`), e preservação de conteúdo e
estrutura semântica em vez de apresentação.

**DEC-0018**: tradução de texto entra no MVP como funcionalidade principal; tradução de quadrinho e
mangá fica fora.

**DEC-0022** item 7: o conteúdo não vai para serviço externo de tradução ou IA.

### 2. Histórico relevante

O pipeline operacional é o ativo mais maduro do projeto, e é o único bloco com capacidades reais:

| capacidade | classe | o que existe |
|---|---|---|
| Análise e metadados | D | análise de PDF, detecção de escaneado, edição de título/autor/idioma |
| OCR de documentos | D | OCRmyPDF/Tesseract, **com falha bloqueando conversão insegura** |
| Conversão de documento | D | Calibre para EPUB com metadados e capa, progresso indeterminado |
| Tradução | **B** | Argos e NLLB funcionais — *existe no app, não incorporada à V2* |
| Envio por SMTP | D | envio real com STARTTLS, limite e fila de retry offline |

E, resgatado de 24/07: o fluxo guiado do **Kindle Local**, com sete etapas, validação de campo,
cancelamento e agendamento com fuso — mais os dois relatórios de teste que o avaliaram.

### 3. Estado observado

O app operacional faz conversão de verdade. O protótipo simula. **O mapa que afirma isso é de 02/08
e não é reverificado há dezoito dias.**

### 4. Convergências

- **"Falha bloqueando conversão insegura"** (OCR, classe D) já implementa o espírito do item 8 da
  DEC-0021: não persistir resultado que não passou.
- **Tradução classe B** — funcional no app e não incorporada à experiência — é compatível com a
  DEC-0022 item 7: Argos e NLLB são modelos que rodam na própria infraestrutura, não APIs de
  terceiros. **A regra dura de 20/08 já está satisfeita pela escolha técnica de julho.**

Esta segunda convergência é a mais valiosa da leva: a DEC-0022 parecia impor custo novo, e a
implementação existente já cumpre o limite.

### 5. Divergências

- **O contrato de dez verificações não existe em lugar nenhum.** O app tem "progresso indeterminado"
  e não expõe resultado intermediário. Os três resultados da DEC-0021 item 10 são norma sem
  implementação.
- **A DEC-0021 item 5** manda eliminar o original depois da validação. Se o app hoje guarda ou não:
  **não verificado**.

### 6. Evidência de rejeição explícita

Cuidado com uma distinção: o fluxo guiado de sete etapas de 24/07 **não foi rejeitado**. Foi
**abandonado pela inversão de direção do produto** — o Kindle deixou de ser destino. São coisas
diferentes, e tratá-lo como recusado descartaria material que nunca foi julgado.

O que foi rejeitado, com razão escrita: *"Original / Adaptado / Comparar quando o arquivo veio de
PDF"* (`:2663`), pela DEC-0021 item 7.

### 7. Princípio recorrente

```
PRINCÍPIO RECORRENTE — não fingir certeza que não se tem
```

- **24/07**: os relatórios marcam cada afirmação com `[V]` verificado, `[C]` lido no código, `[H]`
  hipótese, `[R]` recomendação, e declaram *"nenhum número neste documento é medição"*.
- **12/08**: *"confiança só quando existe medição; sem medição, o produto pergunta."*
- **20/08**: o resultado **"concluído com avisos"** — *"o produto não finge que foi perfeita."*

Três ocorrências, duas redescobertas independentes.

### 8. Resultado

- **DEC-0021** — vigente.
- **DEC-0018** — vigente quanto à tradução.
- **DEC-0022** — vigente, e mais barata do que parecia.

### 9. Ação normativa proposta

**Nenhuma.**

### 10. Ação posterior

- **Reverificar o mapa de capacidades.** Dezoito dias sem conferência, e ele é a única fonte que
  separa operacional de protótipo.
- **B3 de `ABERTO.md`** (limiares das dez verificações) depende de medir o app real, não de decidir.

---

## Assunto 3 — Web-first e arquitetura atual

### 1. Estado normativo atual

**DEC-0022**: web-first, navegador como cliente, account-based, processamento e sincronização na
infraestrutura do produto, local-first obsoleto, Kindle por cabo como questão separada, baseline de
privacidade em sete linhas.

### 2. Histórico relevante

| quando | o quê |
|---|---|
| 24/07 | *"O arquivo é processado localmente. Apenas o resultado final é enviado ao seu Kindle."* O nome do produto era a premissa: **Kindle Local**. |
| 31/07 | *"Processamento local — Seus arquivos ficam sob seu controle"*, fixo na barra lateral de todas as telas. Zero ocorrências de conta, nuvem, sincronização, servidor ou login. |
| 10/08 | Caderno 02 corrige a premissa: produto com conta e continuidade entre aparelhos. |
| 12/08 | DEC-0018 consolida o argumento de conta. |
| 20/08 | DEC-0022 declara web-first com todas as letras. |

### 3. Estado observado

O protótipo afirma as duas coisas: *"pode fechar a aba: o trabalho não é feito no seu computador"*
(`:2000`, `:3179`) e *"o produto é local"* três vezes ao justificar recusas (`:6587`, `:6647`,
`:6652`).

O app operacional **roda localmente** — é uma aplicação que se instala e executa na máquina.

### 4. Convergências

DEC-0018: *"a conta é opcional e pedida depois de converter, com o motivo escrito"*. Compatível com
account-based: ser baseado em conta não obriga a pedir conta antes do primeiro valor entregue.

### 5. Divergências

**Uma pequena, e uma que merece atenção.**

- **Pequena:** as três linhas de "produto local" no protótipo. Texto a corrigir.
- **Que merece atenção:** o app operacional é local. A DEC-0022 não o torna ilegal — ele continua
  sendo, pela DEC-0011 ponto 3, *"o ativo a preservar"*. Mas a direção do produto e a natureza da
  implementação existente divergem, e a DEC-0011 ponto 5 já previu o caminho: **integração por
  contrato de API**. A divergência é conhecida e tem rota; não é conflito novo.

### 6. Evidência de rejeição explícita

**Local-first como promessa exibida ao usuário** foi revogado — não abandonado. O caderno 02 registra
a correção de premissa, e a DEC-0022 item 5 a declara obsoleta.

### 7. Princípio recorrente

Nenhum novo neste assunto.

### 8. Resultado

- **DEC-0022** — vigente.
- **DEC-0011** — vigente; o ponto 3 e o ponto 5 ganham importância nova.
- **DEC-0018** — vigente, **com uma tensão a examinar** (ver item 9).

### 9. Ação normativa proposta

**Uma candidata a emenda, e ela é decisão do Erik — não a executei.**

A DEC-0018 diz que *"a conta é opcional e pedida depois de converter"*. Sob a DEC-0022, **converter
já envolve upload para a infraestrutura do produto**. A frase continua fazendo sentido do ponto de
vista de experiência — não pedir cadastro antes de entregar valor —, mas o que ela significava em
02/08, num produto local, era outra coisa: significava que nada saía da máquina até a pessoa decidir.

> **Pergunta para o Erik:** "converter não exige conta" continua valendo como está, agora que
> converter implica upload? Ou precisa de nova redação que diga o que acontece com o arquivo de quem
> ainda não tem conta?

Isso se conecta a **B7** de `ABERTO.md` — *o que acontece com o trabalho feito antes de a conta
existir* — e é a mesma pergunta vista por outro lado.

### 10. Ação posterior

- **BUG / DRIFT:** três linhas de microcópia em `:6587`, `:6647`, `:6652`.
- **Anotar:** a recusa de "Destaques populares" tem razão caducada — *"depende de um corpo de
  leitores que um produto local não tem"*. A feature pode continuar fora por outro motivo; a razão
  registrada não vale mais.

---

## Assunto 4 — MVP e V1

### 1. Estado normativo atual

**DEC-0029**: MVP e V1 nomeiam a mesma versão — a primeira pública, entregue a usuários reais — e ela
nasce observável, com instrumentação como requisito e não como fase posterior.

**DEC-0018**: escopo do MVP é preparação e biblioteca, com Estante, Canvas e Conexões dentro.

### 2. Histórico relevante

A DEC-0018 é de 12/08. Desde então, três decisões acrescentaram coisas ao escopo:

| quando | o quê entra |
|---|---|
| 20/08 · DEC-0024 item 7 | **Notas** como quinto lugar, no MVP |
| 20/08 · DEC-0021 item 2 | **Quadrinho e mangá** como conteúdo ingerível no MVP |
| 20/08 · DEC-0023 item 1 | **Mobile** faz parte do V1 |

### 3. Estado observado

O escopo declarado cresceu substancialmente em oito dias, e **o documento que fixa o escopo não
registra nenhum desses três acréscimos**.

### 4. Convergências

O argumento central da DEC-0018 continua de pé, e fica mais forte: *"cortar Estante, Canvas e
Conexões do MVP esvazia o único argumento honesto de cadastro."* Acrescentar Notas ao MVP reforça a
tese, não a contraria.

### 5. Divergências

**A DEC-0018 enumera um MVP que não é mais o MVP.** Ela lista três lugares; hoje são cinco. Não
menciona quadrinho como conteúdo ingerível; a DEC-0021 o inclui. Não trata de aparelho; a DEC-0023
põe mobile dentro.

Isso não é conflito de autoridade — as três DECs novas são posteriores e explícitas. É **enumeração
desatualizada**, e é exatamente o caso que a DEC-0027 item 4 chama de emenda parcial.

### 6. Evidência de rejeição explícita

Nenhuma neste assunto.

### 7. Princípio recorrente

Nenhum novo.

### 8. Resultado

- **DEC-0029** — vigente.
- **DEC-0018** — **vigente, e emendada em parte por três decisões**, das quais só uma está registrada
  no cabeçalho dela hoje (a DEC-0024, quanto às superfícies do design system).

### 9. Ação normativa proposta

**Emenda à DEC-0018, no escopo do MVP.** Não executada — proposta.

O que ela precisaria declarar:

```
DEC-0018  amended_by:
  - DEC-0021 — escopo: quadrinho e mangá são conteúdo ingerível no MVP
  - DEC-0023 — escopo: mobile faz parte do V1
  - DEC-0024 — escopo: Notas é o quinto lugar e está no MVP
                        (além da enumeração das superfícies, já registrada)
  - DEC-0029 — escopo: MVP e V1 nomeiam a mesma versão, e ela nasce observável
```

E um marcador inline no ponto do escopo, como os que já existem nas DEC-0011, 0018 e 0019 — porque
quem chega por `grep` na linha do escopo lê a enumeração antiga.

### 10. Ação posterior

Nenhuma de implementação. **D12 de `ABERTO.md`** — *o que entra no escopo da V1* — deixa de ser
pergunta aberta e passa a ser esta emenda, se aprovada.

---

## Resumo da leva

| assunto | resultado | ação normativa proposta |
|---|---|---|
| **Identidade e modelo de conteúdo** | tudo vigente | nenhuma · ler `db/schema.ts` no Mac antes de decidir A4 e A5 |
| **Conversão e ingestão** | tudo vigente | nenhuma |
| **Web-first** | tudo vigente | **1 pergunta ao Erik** sobre "converter não exige conta" |
| **MVP / V1** | tudo vigente | **1 emenda proposta** à DEC-0018, no escopo |

**Nenhuma DEC foi marcada `superseded` ou `revoked` nesta leva.** Nenhuma decisão anterior a 20/08
se revelou obsoleta — o padrão até aqui é enumeração desatualizada e consequência cumprida, não
autoridade morta.

### Drift e bugs registrados separadamente

Não viraram decisão, e não devem virar:

| onde | o quê | contra |
|---|---|---|
| `prototipo-mesa.html:1858` `:2441` `:2455` | identidade por título | DEC-0021 itens 12–13 |
| `prototipo-mesa.html:6587` `:6647` `:6652` | microcópia "produto local" | DEC-0022 item 5 |
| `prototipo-mesa.html:5359` | menu da leitura com quatro lugares | DEC-0024 item 1 |
| `projects/mekora.risks.json` R-008 | evidência factualmente errada | verificação run a run |
| `docs/mekora-capability-map.md` | 18 dias sem reverificação | — |

### Dois princípios recorrentes confirmados

```
derivar em vez de gravar               4 ocorrências independentes
não fingir certeza que não se tem      3 ocorrências, 2 redescobertas
```

Os dois são candidatos fortes a princípio do `PRODUTO.md`, quando ele for escrito.

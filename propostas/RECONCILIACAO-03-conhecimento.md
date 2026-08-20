# Reconciliação — terceira leva: Notas, Canvas, Conexões e Kindle

**Data:** 2026-08-20
**Estado:** análise apresentada, **nenhuma DEC foi alterada**
**Método:** por assunto, com passagem obrigatória pelas perguntas de `ABERTO.md`

Os quatro são interdependentes — Conexões deriva de Notas, Canvas e Conexões compartilham modelo, e
o Kindle atravessa os três pela origem do conteúdo. Foram reconciliados juntos por isso.

---

## Assunto 9 — Notas

### 1. Estado normativo atual

| | |
|---|---|
| **DEC-0024** itens 5, 6, 7 | Notas é espaço de trabalho global; dentro do livro é visão filtrada; está no MVP |
| **DEC-0021** item 15 | as notas escritas pela pessoa sobrevivem à exclusão do arquivo |
| **DEC-0023** item 4 | Notas existe a 390px, como requisito de V1 |

### 2. Histórico relevante

O modelo de escrita foi decidido em 18/08, e é a decisão mais bem-argumentada do período:

> *"O Mekora tem **um** tipo de escrita. O que muda entre nota de trecho e anotação sobre o livro não
> é a natureza do que se escreveu: é onde o endereço para. Não há campo de tipo, não há menu de 'nova
> nota / nova anotação', e a âncora é consequência do gesto."*

E a pergunta deixou de ser um terceiro objeto:

> *"A pergunta não é um terceiro objeto: é uma escrita sem âncora para a qual outras escritas
> apontam. Ser apontável é papel, não espécie."*

Com a regra de recursão fechada em um nível: uma pergunta aponta para escrito cujo grão não seja
trecho.

### 3. Estado observado

Cinco vistas, partição por origem, pauta derivada, hierarquia pergunta/trecho. E dois defeitos
registrados pelo próprio run.

### 4. Convergências

**A DEC-0024 item 6 e o modelo de 18/08 são a mesma coisa dita de dois jeitos.** "Um tipo de escrita,
o que muda é onde o endereço para" **exige** que a vista dentro do livro seja consulta filtrada — se
fosse um segundo sistema, haveria dois tipos de escrita, e a decisão de 18/08 cairia.

A DEC-0021 item 15 também converge: se a nota é um objeto só, com endereço variável, ela não pode ser
filha do arquivo. As duas normas exigem a mesma arquitetura por razões diferentes — sinal forte de
que a arquitetura está certa.

### 5. Divergências

Nenhuma de norma.

### 6. Evidência de rejeição explícita — e uma distinção que o run fez sozinho

- **Selo ou rótulo para distinguir tipos de escrita**, recusado: *"a distinção aparece por forma,
  nunca por rótulo (…) se essa leitura falhar, a aposta falhou — por selo depois seria desfazer a
  aposta."* Régua de 2px em tinta quando há voz de autor atrás, 1px translúcido quando é só sua.
- **"Adicionar ao conhecimento"** como ponte, recusado em 18/08: *"Conhecimento não existe neste
  produto e ponte para lugar inexistente é promessa não verificável."*

E o run de 18/08 registrou uma coisa que vale como método:

> *"Soltar do trecho depois de guardado fica **ABERTO, não recusado**."*

O autor separou explicitamente as duas categorias no próprio registro. É exatamente o rigor que o
Erik pediu para a Mesa, aplicado espontaneamente três dias antes.

### 7. Revisão de tese registrada

Segunda deste tipo encontrada na reconciliação, depois da reversão do Reader:

> *"REVISÃO DE TESE, registrada como revisão e não como continuidade: as explorações anteriores
> diziam que todo modelo preserva o trecho. O trecho continua preservado em toda escrita que nasce de
> um trecho; o que se soltou foi a **obrigação** de ter um."*

Mudança de premissa declarada como mudança, e não maquiada de evolução natural.

### 8. Princípio recorrente

```
PRINCÍPIO RECORRENTE — não fingir certeza que não se tem     (5ª ocorrência)
```

Bloqueio de 18/08: *"`S.erroNota` nunca vira `true`: o ramo de erro do compositor é inalcançável por
construção. **Ramo inalcançável não é honestidade, é decoração.**"*

Um estado de erro que nunca acontece é uma promessa de tratamento que o produto não cumpre.

### 9. Resultado

Tudo vigente.

### 10. Ação normativa proposta / posterior

**Nenhuma norma.** Dois defeitos: `S.erroNota` inalcançável, e *"ir-livro continua sem carregar qual
livro"* — *"um caderno idêntico para os 14 livros do acervo"*.

### ↳ Passagem pelo `ABERTO.md`

| | pergunta | resultado |
|---|---|---|
| **B6** | o que acontece com uma nota órfã depois da exclusão da origem | **continua aberta** |
| **B15** | que vistas Notas tem, e como se chama a partição "Soltas" | **continua aberta** |
| **B16** | como a visão filtrada se comporta quando a origem foi excluída | **continua aberta** — e a convergência acima mostra que B6 e B16 são a mesma pergunta vista dos dois lados |

---

## Assunto 10 — Canvas

### 1. Estado normativo atual

| | |
|---|---|
| **DEC-0024** | Canvas é um dos cinco lugares; é o artefato de ORGANIZAR |
| **DEC-0023** item 5 | desktop-only no V1 |
| **DEC-0018** | entra no MVP; não é fase dois |

### 2. Histórico relevante — e aqui há três Canvas, não um

| quando | onde | o que era |
|---|---|---|
| **31/07** | `mekora-library-lab` | Canvas navegável com drag, zoom no cursor com clamp, botão "Enquadrar". **Era a vista padrão** — `state={view:'canvas'}` |
| **12/08** | `mekora-canvas-motion` | `BookPlacement` vira `ItemPlacement`. Cinco tipos: imagem, link/vídeo, notas do Kindle, grupos e texto |
| **20/08** | `prototipo-mesa.html` | mesa de notas, com o commit `64becca` |

### 3. Estado observado — e a correção

O commit de 20/08 se chama **"O Canvas nao existia, e agora existe"**.

**É verdade para o repositório e falso para o produto.** Ele existia em 31 de julho, funcionando, e
era a vista padrão do library-lab. E existia em outra forma no `canvas-motion` desde 12/08, com o
comentário do próprio arquivo declarando a intenção:

> *"A mudança não é acrescentar quatro tipos ao lado do livro — é parar de tratar o livro como o
> assunto."*

A auditoria já tinha registrado isto como o conflito **C1**: "Canvas tem quatro sentidos". A
reconciliação confirma três implementações distintas, em três lugares, nenhuma delas descartada por
decisão.

### 4. Convergências

A decisão de 20/08 é a que unifica, e ela é de **modelo**, não de tela:

> *"Canvas é intenção, Conexões é descoberta — e isso vale no modelo: uma relação só, com duas
> maneiras de fazer. Se a regra ficasse só na explicação, as duas telas convergiriam."*

Isso converge com o `ItemPlacement` de 12/08: parar de tratar o livro como assunto é o mesmo
movimento que fazer do Canvas uma superfície de intenção, e não uma biblioteca espacial.

### 5. Divergências

**Nenhuma de norma — e é justamente esse o problema.** Três implementações coexistem, nenhuma foi
declarada obsoleta, e o `capability_snapshot` ainda registra `spatial_library` e
`canvas_as_object_surface` como `experience_prototype`, sem distinguir qual das três.

O `mekora.status.md` já anotara a consequência em 12/08: *"se a superfície de objetos vingar, é ela
que vira a capacidade principal e a biblioteca espacial vira um caso de uso dela — mas isso é decisão
de produto do Erik, não inferência de quem lê o código."*

**Essa decisão continua não tomada.**

### 6. Evidência de rejeição explícita

Nenhuma. **Nenhum dos três Canvas foi rejeitado** — os dois anteriores foram deixados para trás por
mudança de lugar de trabalho, não por julgamento. Tratá-los como recusados seria erro.

### 7. Princípio recorrente

Nenhum novo.

### 8. Resultado

Tudo vigente. **Uma decisão de produto pendente desde 12/08**, nomeada pelo próprio registro.

### 9. Ação normativa proposta

**Nenhuma DEC nova.** Mas a pergunta de 12/08 merece entrar na fila: *qual das três superfícies é o
Canvas do produto* — ou se as três são fases de uma só.

### 10. Ação posterior

- Persistência da posição não existe: vive em memória.
- Comportamento em toque e regra de escala acima de ~50 itens: não decididos.
- **Registrar** que o commit `64becca` descreve o repositório, não o produto.

### ↳ Passagem pelo `ABERTO.md`

| | pergunta | resultado |
|---|---|---|
| **B17** | o destino do `mekora-canvas-motion` | **continua aberta, com evidência nova** — ele contém o Canvas de cinco tipos, que é a implementação mais avançada das três |

---

## Assunto 11 — Conexões

### 1. Estado normativo atual

| | |
|---|---|
| **DEC-0024** | Conexões é um dos cinco lugares; é o artefato de DESCOBRIR |
| **DEC-0023** item 6 | existe no telefone como Relacionadas · Trilhas · Assuntos, sem grafo |
| **DEC-0023** item 7 | o Mapa pode permanecer desktop-only |
| **DEC-0018** | entra no MVP |

### 2. Histórico relevante — e um falso cognato já identificado

**31/07:** existiu uma seção chamada **"Conexões futuras"**, e ela **não** é a ancestral de Conexões.
Era automação por aparelho — *"defina o que o Mekora fará quando este Kindle voltar a ser
conectado"*, com quatro automações e exportação. O nome foi reciclado para outro conceito.

**20/08:** três direções decididas, com a ordem proposta — *"trilha junto das relacionadas,
território como limiar (só quando o assunto se repete em livros diferentes) e mapa como vista
opcional, talvez nunca."*

### 3. Estado observado

`:4083` ainda abre com **"A · Mapa"**. A decisão das 12h51 diz que o mapa **não** entra como porta, e
os commits seguintes investiram nele.

**Decisão declarada e não executada** — e é a única desta natureza encontrada nas três levas.

### 4. Convergências

A regra de 20/08 sobre nomear é coerente com toda a doutrina do produto:

> *"O Mekora não nomeia o que descobre. Ele oferece as palavras que contou e o nome é do usuário:
> nomear é o gesto que transforma sugestão em Território."*

Converge com a derivação determinística das perguntas (18/08) e com a descrição derivada (19/08): o
produto **conta**, e a pessoa **nomeia**. Nenhum dos três usa IA fingida.

### 5. Divergências

| | |
|---|---|
| `:4083` abre com "A · Mapa" | contra a decisão das 12h51 de 20/08 |
| *"Tag, Coleção e Marcador não existem"* (bloqueio, 20/08 14h10) | contra a implementação do commit `645ac22`, do mesmo dia |

A segunda é notável: o bloqueio foi escrito e resolvido no mesmo dia, e o registro guarda os dois
estados sem apontar um para o outro.

### 6. Evidência de rejeição explícita

- **"Argumento de design não é conteúdo de tela"** — Responde/Não responde e os três parágrafos de
  defesa saíram de Conexões para o painel de notas.
- **"Mapa neural" → "Mapa"**, com a razão mais honesta do lote: *"neural é a palavra que o próprio
  projeto proibiu na primeira rodada, e **eu a reintroduzi sem perceber**."* Drift apanhado pelo
  próprio autor.
- **"Observação como sistema"** recusado como nome sugerido: *"é interpretação, e nenhuma das três
  notas usa a palavra sistema."*

### 7. Princípio recorrente

```
PRINCÍPIO RECORRENTE — não fingir certeza que não se tem     (6ª ocorrência)
```

Bloqueio de 20/08: *"o limiar de uma palavra em comum para 'talvez' pode ser generoso demais num
acervo grande; **calibrar com onze notas seria no escuro**."*

Recusa de calibrar sem amostra. É a mesma regra de 12/08 aplicada a um parâmetro.

### 8. Resultado

Tudo vigente.

### 9. Ação normativa proposta

**Nenhuma.**

### 10. Ação posterior

- **DRIFT:** `:4083` — a ordem das três direções contraria a decisão de 20/08.
- **Registrar:** o bloqueio de Tag/Coleção/Marcador foi resolvido no mesmo dia e o registro não
  aponta.

### ↳ Passagem pelo `ABERTO.md`

| | pergunta | resultado |
|---|---|---|
| **B8** | como Relacionadas, Trilhas e Assuntos se apresentam | **continua aberta** |
| **B9** | se o Mapa ganha representação no telefone | **continua aberta, com evidência nova** — a decisão de 20/08 já sugere "vista opcional, talvez nunca", inclusive no desktop |

---

## Assunto 12 — Kindle

### 1. Estado normativo atual

| | |
|---|---|
| **DEC-0018** | envio ao Kindle faz parte do produto |
| **DEC-0022** item 6 | **a integração física por cabo permanece como questão técnica separada**, até que se verifique a arquitetura adequada para um produto web |
| **DEC-0011** ponto 6 | a aposentadoria do frontend legado exige que a interface nova cubra o envio ao Kindle |

### 2. Histórico relevante — e a maior distância entre promessa e realidade do produto

| capacidade | classe | realidade |
|---|---|---|
| **Envio por SMTP** | **D** | **real** — STARTTLS, limite, regra de export para comic, fila de retry offline |
| **Conexão e sincronização USB** | **C** | *"Nenhum serviço, endpoint ou tela para detectar/montar Kindle, My Clippings ou sincronizar USB foi encontrado."* |

O mapa de capacidades já classificava a jornada USB como risco alto: *"todo o backend USB está
ausente, e há questões de montagem, formatos, encoding, deduplicação, associação e retomada."*

E o run de 18/08 registrou o mesmo, do outro lado: *"`kindle_usb_sync` continua marcado como
`simulated_in_experience`: o fluxo construído é experiência, não capacidade."*

### 3. Estado observado

A assimetria foi decidida e está dita na interface:

> *"Pelo cabo o Mekora leva e traz; pelo e-mail só leva."*

Metade dessa frase é real. A outra metade não tem uma linha de backend.

### 4. Convergências

O envio por SMTP é uma das poucas capacidades genuinamente operacionais, e a DEC-0011 ponto 3 já a
protege: o backend é *"o ativo a preservar"*.

A prévia no aparelho, decidida em 18/08, converge com a doutrina de evidência: *"a prévia no aparelho
é prova, não painel de parâmetros (…) o Mekora não define o tamanho da letra no Kindle, quem define é
quem lê."*

### 5. Divergências

**A maior do produto inteiro, e ela cresceu com a DEC-0022.**

Antes, o Kindle por cabo era uma capacidade **não implementada**. Agora é uma capacidade não
implementada **e arquiteturalmente incerta**: acesso a dispositivo físico a partir do navegador impõe
restrições que ninguém verificou.

A DEC-0022 item 6 fez a coisa certa — isolou o problema em vez de decidi-lo por suposição. Mas o
resultado é que **"pelo cabo o Mekora leva e traz" é hoje a afirmação mais frágil da interface.**

### 6. Evidência de rejeição explícita

Nenhuma. O USB nunca foi recusado: foi simulado, e a simulação foi honestamente marcada no
`capability_snapshot`.

### 7. Princípio recorrente

Nenhum novo — mas a marcação `simulated_in_experience` é o princípio de não fingir certeza aplicado
ao **registro**, e não à interface. Vale como sexta ocorrência do mesmo padrão em outro plano.

### 8. Resultado

Tudo vigente.

### 9. Ação normativa proposta

**Nenhuma.** A DEC-0022 item 6 já deixou a pergunta aberta na forma correta.

### 10. Ação posterior

- **Registrar** que a frase da interface promete uma capacidade cuja arquitetura não foi verificada.
  Não é mentira — é promessa a prazo, e precisa de prazo.

### ↳ Passagem pelo `ABERTO.md`

A pergunta que a DEC-0022 item 6 deixou aberta **não estava registrada**. Entra agora.

---

## Delta de `ABERTO.md`

| | antes | depois |
|---|---:|---:|
| **A** — antes da arquitetura | 8 | **9** |
| **B** — antes da feature afetada | 21 | **22** |
| **C** — antes do lançamento | 15 | **16** |
| **D** — backlog técnico | 13 | **14** |
| **Total** | **57** | **61** |

### As quatro novas

| | pergunta | por que nasceu | classe |
|---|---|---|---|
| **A9** | **Como o Kindle por cabo funciona num produto web.** A DEC-0022 item 6 isolou a questão e ela não estava na fila. Acesso a dispositivo físico pelo navegador pode impor restrições que mudam a arquitetura | Kindle | A |
| **B22** | **Persistência da posição no Canvas.** Hoje vive em memória | Canvas | B |
| **C16** | **O limiar de "talvez" em Conexões.** Uma palavra em comum pode ser generoso demais; calibrar com onze notas seria no escuro. Depende dos dados que a DEC-0029 destrava | Conexões | C |
| **D14** | **Canvas em toque, e regra de escala acima de ~50 itens.** Desktop-only no V1 pela DEC-0023, então não bloqueia | Canvas | D |

### O que mudou de estado

| | pergunta | de → para |
|---|---|---|
| **B9** | se o Mapa ganha representação no telefone | continua aberta → **com evidência nova**: a decisão de 20/08 sugere "vista opcional, talvez nunca", inclusive no desktop |
| **B17** | o destino do `canvas-motion` | continua aberta → **com evidência nova**: ele contém o Canvas de cinco tipos |
| **B6 / B16** | nota órfã / visão filtrada com origem excluída | **identificadas como a mesma pergunta**, vista dos dois lados |

### Uma pergunta de produto que a reconciliação encontrou e não estava em lugar nenhum

**Qual das três superfícies é o Canvas do produto** — a do library-lab de 31/07, a de cinco tipos do
`canvas-motion`, ou a mesa de notas de 20/08 — ou se as três são fases de uma só.

O `mekora.status.md` nomeou essa decisão em 12/08 e a deixou explicitamente para o Erik. **Ela nunca
foi tomada, e nunca entrou em fila nenhuma.** Não a acrescentei ao `ABERTO.md` como pergunta técnica
porque é decisão de produto — vai para a lista de perguntas ao dono.

---

## Resumo da leva

| assunto | resultado | ação normativa proposta |
|---|---|---|
| **Notas** | tudo vigente | nenhuma |
| **Canvas** | tudo vigente | nenhuma · **1 decisão de produto pendente desde 12/08** |
| **Conexões** | tudo vigente | nenhuma |
| **Kindle** | tudo vigente | nenhuma |

---

# Fecho das três levas

**Doze assuntos reconciliados. Zero DECs marcadas `superseded` ou `revoked`.**

Nenhuma decisão anterior a 20/08 se revelou obsoleta. O padrão foi consistente nas três levas:

```
enumeração desatualizada          DEC-0018, escopo do MVP
consequência cumprida sem registro DEC-0011, o modelo de livro
implementação divergindo da norma  sete pontos de drift
decisão declarada e não executada  a ordem das três direções de Conexões
fato falso no registro             a evidência do R-008
```

Nenhum desses é autoridade morta. Todos são **registro desatualizado sobre norma que continua
válida** — que é um problema muito menor do que o que se temia no início, e mais fácil de consertar.

### Duas revisões de tese e uma reversão, todas declaradas

Encontradas nas três levas, e as três com o raciocínio escrito:

| | onde | o quê |
|---|---|---|
| **reversão** | Reader, 19/08 | o menu recolhido foi recusado e depois aceito, desfeito pela consequência da própria recusa |
| **revisão de tese** | Notas, 18/08 | o que se soltou não foi o trecho, foi a obrigação de ter um |
| **autorrecusa** | Mesa, 14/08 | o mesmo agente que recomendou a Mesa C a recusou 1h26 depois |

Um projeto que registra as próprias reversões com a razão é um projeto que consegue reabrir uma
decisão sem recomeçar do zero.

### Placar final dos princípios recorrentes

```
não fingir certeza que não se tem     6 ocorrências, 2 redescobertas independentes
derivar em vez de gravar              5 ocorrências independentes
```

Os dois seguem marcados e **não viraram DEC**. Com seis e cinco ocorrências, atravessando conteúdo,
conversão, leitura, estante, notas e conexões, eles deixaram de ser coincidência — são candidatos a
princípio transversal do `PRODUTO.md`, quando ele for escrito.

### Drift acumulado nas três levas

| onde | o quê | contra |
|---|---|---|
| `:1858` `:2441` `:2455` | identidade por título | DEC-0021 |
| `:2663` `:2676` | Original/Adaptado/Comparar | DEC-0021 |
| `:5359` | menu da leitura com quatro lugares | DEC-0024 |
| `:6587` `:6647` `:6652` | microcópia "produto local" | DEC-0022 |
| `:4083` | Conexões abre pelo Mapa | decisão de 20/08 12h51 |
| `:4899` | busca no livro implementada sem run | *drift de registro* |
| `S.erroNota` | ramo de erro inalcançável | *"decoração, não honestidade"* |
| `ir-livro` | não carrega qual livro | defeito conhecido |
| Estante | TXT e XLSX fora da partição | defeito conhecido |
| Mesa | cinco variantes vivas sem marcação | *precisa do selo `EXP`* |
| Canvas | commit descreve o repositório, não o produto | — |

Onze pontos, **nenhum deles decisão**. É a separação que o Erik pediu na primeira leva, mantida até o
fim.

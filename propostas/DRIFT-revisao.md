# Revisão dos drifts — o que é bug, o que é protótipo antigo, o que exige implementação

**Data:** 2026-08-20
**Estado:** classificação apresentada. **Nada foi corrigido.**
**Base:** os onze pontos acumulados nas três levas de reconciliação, reverificados no arquivo de hoje

Todos os onze foram conferidos contra `prototipo-mesa.html` na revisão `4fa812a`. **Um estava
descrito errado e um já estava resolvido** — os dois estão corrigidos abaixo.

---

## As quatro categorias

O Erik pediu três. A evidência exigiu uma quarta:

```
BUG                      código errado contra norma vigente. Conserta-se.
PROTÓTIPO ANTIGO         código que funciona e perdeu a base normativa. Remove-se.
EXIGE IMPLEMENTAÇÃO      norma vigente sem código que a cumpra. Constrói-se.
DRIFT DE REGISTRO        o código está certo e o registro está errado. Não se toca no código.
```

A quarta importa porque dois dos onze **não têm nada a corrigir em código** — e tratá-los como bug
mandaria alguém mexer em algo que está certo.

---

## BUG — cinco

Código errado contra norma vigente ou contra decisão declarada. Conserto pontual.

### B1 · O menu da leitura tem quatro lugares

```js
lug = [["mesa","Mesa"],["estante","Estante"],["canvas","Canvas"],["conexoes","Conexões"]]
```

Notas falta. **Contra a DEC-0024 item 1.** A barra principal em `:2065` já tem cinco; este é o único
ponto do produto que discorda. Conserto: uma linha.

### B2 · Conexões abre pelo Mapa

`:4083` enumera `"A · Mapa"` · `"B · Trilhas"` · `"C · Territórios"`.

A decisão de 20/08 às 12h51 diz o contrário: *"o mapa não entra como porta de Conexões. A ordem
proposta é trilha junto das relacionadas, território como limiar e mapa como vista opcional."*

**É a única decisão declarada e não executada das três levas.** Conserto: reordenar.

**Ressalva:** *"vista opcional, talvez nunca"* é mais que reordenação. Reordenar cumpre a decisão;
decidir se o Mapa continua existindo é outra pergunta, e é do Erik.

### B3 · A microcópia diz que o produto é local

Duas ocorrências: *"o produto é local"* e *"numa ferramenta local"*, usadas para justificar recusas.
**Contra a DEC-0022 item 5**, que declara a premissa obsoleta. Conserto: reescrever duas frases.

**Ressalva registrada na segunda leva:** uma delas é a razão pela qual "Destaques populares" foi
recusado. Corrigir o texto **não** reabre a feature — mas a razão registrada caduca, e isso precisa
ficar dito onde a recusa mora.

### B4 · `S.erroNota` nunca vira `true`

Cinco ocorrências. O ramo de erro do compositor é inalcançável por construção. O run de 18/08 que o
encontrou já deu o veredito: *"ramo inalcançável não é honestidade, é decoração."*

Um estado de erro que nunca acontece é uma promessa de tratamento que o produto não cumpre.

### B5 · `ir-livro` não carrega qual livro

Doze ocorrências. O run de 18/08 descreve a consequência: *"um caderno idêntico para os 14 livros do
acervo."* Defeito funcional, não de modelo.

---

## PROTÓTIPO ANTIGO — dois

Código que funciona e perdeu a base normativa. Não se conserta: retira-se ou marca-se.

### P1 · Original / Adaptado / Comparar

`comoSaiuDoPDF`, duas ocorrências. **Perdeu as duas pernas** com a DEC-0021: não há original
persistido para comparar, e o que a feature mostrava nunca foi o original — era uma simulação de PDF
derivada do texto adaptado por regra fixa.

Não é bug: funciona como foi escrito. É material sem norma. **Remove-se, e vai para o histórico.**

### P2 · As cinco variantes de Mesa atrás do botão de debug

Não são bug — são bancada de comparação, e é por existirem que a captura da Mesa C pôde ser feita.

**O que falta é marcação.** A Estante 3D recebeu o selo `EXP` no botão exatamente por isso, com a
razão escrita: *"marcar depois do clique seria marcar tarde."* A Mesa não recebeu.

Sem marca, o próximo a encontrar a Mesa C não terá como saber que ela foi recusada às 14h33 de
14/08 — e a DEC-0027 item 9 existe justamente para esse caso.

---

## EXIGE IMPLEMENTAÇÃO — dois

Norma vigente sem código que a cumpra. Não é conserto: é construção.

### I1 · Identidade estável de conteúdo

`sig(` em três pontos e `d.livro===ARQ.titulo` em sete. **Contra a DEC-0021 itens 12 e 13.**

Não é bug: o código faz o que foi escrito para fazer. É que a norma mudou e o modelo não existe.

**Bloqueado por A4 e A5 do `ABERTO.md`**, e as duas têm implementação histórica a auditar — o schema
de 14/08 no Mac, com `livros`, `notas`, `tags`, `livro_tags`. **Auditar antes de construir.**

### I2 · A Estante particiona por formato de origem

**Este é o achado desta revisão, e ele corrige o que eu tinha registrado.**

O drift que eu havia anotado era *"o filtro deixa TXT e XLSX fora da partição"*. **Isso já estava
resolvido** — o comentário do próprio arquivo explica que os recortes passaram a sair do acervo
justamente porque *"com PDF e EPUB fixos, 3 dos 14 itens (2 TXT, 1 XLSX) não cabiam em recorte nenhum
e 'Tudo 14' deixava de fechar a conta na frente de quem soma."*

O drift real é mais fundo, e o mesmo comentário o declara: **"Formato agora particiona."**

```js
const fs = [...new Set(ACERVO.map(b => b.f))]        // recortes = formatos do acervo
...FILTROS.concat(fs.map(f => [f.toLowerCase(), f, b => b.f === f]))
```

Sob a **DEC-0021**, a Estante guarda **conteúdo persistido**, não arquivo de origem. O formato de
entrada é etapa do pipeline, não atributo permanente do item — e depois de uma conversão validada o
item é o formato canônico, um só. **Particionar por PDF, EPUB, TXT e XLSX é a Estante se comportando
como gerenciador de arquivos**, que é o que a norma removeu.

Não é bug de implementação: é modelo mental antigo sobrevivendo na interface, e a correção depende de
saber por que a Estante deveria particionar — o que **B2 do `ABERTO.md`** (quais formatos de entrada
são aceitos) e o modelo de conteúdo respondem juntos.

**Nota honesta:** a solução atual é boa dentro da premissa antiga. Derivar os recortes do acervo em
vez de fixá-los à mão é o princípio "derivar em vez de gravar" aplicado corretamente — a sexta
ocorrência dele. O que caiu foi a premissa, não a execução.

---

## DRIFT DE REGISTRO — dois

O código está certo. O registro está errado. **Não se toca no código.**

### R1 · Busca dentro do livro implementada sem run

`:4899`. A feature foi bloqueio declarado **duas vezes** em 19/08 — *"a única feature de referência
marcada como obrigatória pela auditoria"* — e apareceu implementada em 20/08 sem run que a cubra.

Nada a corrigir na implementação. O que falta é registro do trabalho.

### R2 · O commit do Canvas descreve o repositório, não o produto

`64becca` — *"O Canvas nao existia, e agora existe."*

Verdade para o repositório, falsa para o produto: o Canvas existia em 31/07 no `library-lab` como
vista padrão, e no `canvas-motion` desde 12/08 com cinco tipos. **Nada a corrigir em código** — a
mensagem de commit é imutável, e a correção é o registro da microauditoria do Canvas, que já existe.

---

## Resumo

| | quantos | o que fazer |
|---|---:|---|
| **BUG** | 5 | conserto pontual; três deles são de uma linha |
| **PROTÓTIPO ANTIGO** | 2 | remover um, marcar o outro |
| **EXIGE IMPLEMENTAÇÃO** | 2 | os dois bloqueados por perguntas `A` e `B` do `ABERTO.md` |
| **DRIFT DE REGISTRO** | 2 | nada a fazer no código |

### O que está pronto para conserto imediato

Os cinco bugs, e nenhum depende de decisão do Erik:

```
B1  menu da leitura → cinco lugares         1 linha
B2  Conexões → trilha, território, mapa     reordenar
B3  duas frases de "produto local"          texto
B4  S.erroNota inalcançável                 lógica
B5  ir-livro sem o livro                    lógica
```

### O que não pode ser tocado ainda

**I1** depende de auditar o schema no Mac. **I2** depende de B2 do `ABERTO.md` e do modelo de
conteúdo. **P1** depende de a DEC-0021 estar aceita — e está. **P2** só precisa da marca, e a decisão
de qual marca já existe como precedente na Estante 3D.

### Duas correções ao meu próprio registro

1. O drift da Estante estava **descrito errado**: o defeito do TXT e XLSX já fora corrigido; o drift
   real é a partição por formato, que é maior.
2. Não são "11 drifts" homogêneos. **Quatro dos onze não têm conserto de código** — dois são registro
   e dois são norma sem implementação. Tratar a lista como uma fila de bugs teria produzido trabalho
   errado em quatro dos onze casos.

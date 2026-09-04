# Componentes de fora — o que o Erik mandou, e como eles entrariam

Escrito em 04/09, e **nada aqui foi implementado**. O Erik mandou a lista dizendo
ele mesmo que é refinamento, e que com o produto ainda não funcionando direito
seria contexto para mexer depois. Concordo com a segunda metade e discordo da
primeira: link em conversa some — os trinta e oito itens dele de 01–02/09
sumiram assim e voltaram como defeito na tela dele dois dias depois. Então fica
guardado aqui, com a razão junto, e a fila do lançamento continua na frente.

## O ADENDO DELE, QUE É A PARTE QUE MAIS IMPORTA

> *"apesar de anexar componentes novos eu n quero que eles tenham o poder de
> adicionar borda no nosso projeto, ou de adicionar cores sem antes consultar a
> gente, ja ocorreu isso outras vezes"*

Ele está certo, e o medo é bem calibrado: **cinco dos seis componentes abaixo
trazem cor crua no código.** Dois trazem hex roxo (`#7b52b9`, `#A855F7`), um
traz laranja e azul de laranja (`#f1775b`, `#506c86`), um traz cinzas soltos.

### O que já protege, e foi provado hoje

O `scripts/portao.js` reprova **cor fora do sistema** na página servida. Não é
promessa: em 04/09 ele reprovou as capas de reserva que EU tinha acabado de
escrever, por `#111111` e `#f4f2ec` não serem token — e só passaram depois de o
Erik decidir que a paleta das capas entrava como família própria.

Então um componente que chegue com `#7b52b9` fica vermelho na primeira medida
da tela onde ele for usado. A porta existe e fecha.

### O buraco que EXISTE, e é honesto dizer

O portão julga **cor**, contraste, escala tipográfica e fonte servida. Ele **não
julga espessura de borda nem raio**. O `inventario.mjs` acusa peça reescrita
comparando assinatura visual — borda entra na assinatura —, mas só dispara
quando a peça nova COLIDE com uma existente. Um componente que traga uma borda
nova, que não se pareça com nada, passa pelos dois.

É um portão a escrever, e o enunciado dele já está claro: *quais espessuras e
raios de borda o sistema tem, e o que aparece fora dessa lista.* Não foi
escrito ainda. Enquanto não for, a conferência da borda é à mão, na entrada.

### A regra de entrada

1. Estes componentes **não entram como dependência**. Todos são trecho copiado
   (React Bits, Uiverse), não pacote — então entram como arquivo do projeto,
   sob as regras do projeto.
2. **Toda cor crua vira token antes de o arquivo ser ligado a qualquer tela.**
   Não depois: o portão só mede o que foi renderizado, e "ligo agora e arrumo
   depois" é como a cor entra.
3. **Borda e raio conferidos à mão contra o `DESIGN-SYSTEM.md`**, até o portão
   de borda existir.
4. O que o componente resolve tem de **não existir ainda**. Dois dos seis abaixo
   duplicam coisa que o produto ou o Figma já têm.

---

## Os seis

### 1 · LineSidebar — React Bits
Lista vertical com marcadores que se deslocam conforme o ponteiro se aproxima.

**Cor crua:** `accentColor="#A855F7"` (roxo), `textColor="#c4c4c4"`,
`markerColor="#6c6c6c"` — três, e como API obrigatória.
**Onde caberia:** o **índice do livro**. É o painel que lista capítulos, e a
proximidade dá alcance a uma lista longa sem rolagem fina.
**Vale olhar.** É o mais promissor da lista.

### 2 · ElasticSlider — React Bits
Deslizador com mola e passo.

**Cor crua:** não na API; conferir o interno antes.
**Onde caberia:** o painel de **aparência da leitura** — corpo do texto e
margem. Hoje são controles secos; mola aqui é decoração que ajuda, porque o
valor é contínuo e a pessoa procura um ponto, não um número.
**Vale olhar.**

### 3 · GradualBlur — desfoque progressivo na borda
**O Erik já disse o que não quer:** *"eu acho o blur muito pesado, eu gostaria
de algo leve e sutil na parte inferior"*.

**Ele tem razão duas vezes.** O componente empilha `divCount={5}` camadas de
`backdrop-filter`. Cinco desfoques de fundo sobre uma página de leitura que
rola é caro em qualquer navegador e caro de doer no Safari.

**E o desenho dele já resolve isso.** O nó `895:7367`, no rodapé da grade da
Estante, é exatamente o efeito: `backdrop-blur-[5px]` com um gradiente de
`rgba(0,0,0,0)` até `rgba(0,0,0,0.08)`. **Uma camada, 5px, 8% de tinta** — leve
e sutil, que é a palavra dele.

**Recomendação: não trazer o componente.** Construir o `895:7367`, que é o
mesmo efeito na dose que ele mesmo desenhou. Medido em 04/09: o produto não tem
nenhum `backdrop-filter`, então o efeito está por fazer de qualquer jeito.

### 4 · Alternador sol/lua — Uiverse
Interruptor de tema em CSS puro, com raios que abrem.

**Cor crua:** `color: #bbb`.
**Não encaixa no modelo.** O Mekora tem **três** temas — claro, escuro e sepia
—, e o sepia não é um estado intermediário: o portão tem uma paleta inteira só
dele. Um interruptor de dois estados não representa três, e forçá-lo esconde o
sepia ou o transforma em exceção.
**Recomendação: não.** A menos que o Erik queira reduzir para dois temas, e aí
é decisão de produto, não de componente.

### 5 · Alternador hambúrguer — Uiverse
Três barras que giram e viram X.

**Cor crua:** `background: #7b52b9` (roxo).
**Ficou sem vaga.** Em 04/09 decidimos tirar o "Menu" do cromo da leitura: o
hambúrguer do desenho **é o índice** (nó `919:18713`), e o produto tinha criado
um Menu genérico ao lado dele. Sem Menu, não há hambúrguer para animar.
**Recomendação: não, por ora.**

### 6 · Carregador de livro — Uiverse
Páginas virando em laço.

**Cor crua:** `--book-color: #f1775b`, `--book-cover-color: #506c86`.
**Duplica o que existe.** O `index.html` já tem esqueleto de carregamento — a
forma da tela aparece enquanto o pacote baixa. Esqueleto é melhor que animação:
ele mostra o que vem, e a animação só diz "espere".
**Recomendação: não.** Se o Erik quiser um carregador com identidade, o lugar é
onde não há forma a mostrar — uma conversão longa, não a abertura da tela.

---

## Resumo

| | veredito | por quê |
|---|---|---|
| LineSidebar | **olhar** | serve o índice; três cores cruas a trocar |
| ElasticSlider | **olhar** | serve a aparência; conferir cor interna |
| GradualBlur | **não** | o nó `895:7367` já é o efeito, mais leve |
| sol/lua | **não** | dois estados para três temas |
| hambúrguer | **não** | perdeu a vaga com a decisão do cromo |
| carregador | **não** | o esqueleto já faz melhor |

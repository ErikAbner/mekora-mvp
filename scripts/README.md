# Medir, em vez de estimar

As métricas dos cadernos são medidas no DOM depois do render, não escritas à
mão. Este diretório é o instrumento disso para os protótipos.

## Por que não basta olhar

O painel de navegador embutido em editores com agente renderiza a página e tira
captura, mas **não compõe layout para medição**: `innerWidth` devolve 0 e todo
`getBoundingClientRect()` sai degenerado. Duas rodadas fecharam com "não
verifiquei renderizado" por causa disso — e foi assim que as 96 miniaturas da
organização avançada passaram seis dias medindo 2 por 20 pixels sem ninguém ver:
em captura reduzida, uma miniatura de 2px parece um fio de grade.

Captura serve para julgar composição. Número só vale medido.

## Como rodar

Suba a pasta em HTTP — `file://` também funciona no navegador, mas o Chrome
headless prefere origem HTTP para carregar as capas:

```
python3 -m http.server 8765 -d .
```

Depois:

```
node scripts/medir.mjs <url> [largura] [altura] [setup.js] <medida.js>
```

Sem dependência: Node 18+ já tem `fetch` e `WebSocket` globais, e o Chrome é
procurado no cache do puppeteer e nos caminhos usuais. `CHROME=` força outro.

O `setup.js` põe o protótipo no estado que interessa; o `medida.js` é avaliado
na página e o valor volta como JSON.

## O que já existe

| medida | responde |
|---|---|
| `medidas/smoke.js` | 162 estados renderizam? algum estoura ou sai vazio? |
| `medidas/inline-sem-caixa.js` | alguma regra de CSS pede altura a elemento de linha? |
| `medidas/progresso.js` | o progresso da leitura acompanha a rolagem, e sobrevive à tipografia? |
| `medidas/folha-bancada.js` | quanto sobra para a prévia e para a tira dentro da folha? |
| `medidas/estante-3d.js` | quanto da prateleira as lombadas ocupam? |

Exemplos:

```
node scripts/medir.mjs http://localhost:8765/prototipo-mesa.html 1440 900 scripts/medidas/smoke.js
node scripts/medir.mjs http://localhost:8765/prototipo-mesa.html 1440 900 scripts/medidas/setup-aa.js scripts/medidas/folha-bancada.js
```

Rodar `smoke.js` e `inline-sem-caixa.js` antes de fechar uma rodada custa poucos
segundos e pega a classe de defeito que não aparece no console: função que
termina cedo em silêncio, e caixa que nunca teve tamanho.

## O par estático

`medir.mjs` precisa de navegador. `verificar.mjs` não precisa de nada e roda em
menos de um segundo:

```
node scripts/verificar.mjs prototipo-mesa.html
```

| ele acusa | o que aconteceu de verdade |
|---|---|
| `corte` | três `return` terminados cedo por ponto e vírgula automático — sintaxe válida, resto da função morto |
| `duplicada` | dois `vPerfil`: o interpretador lia o primeiro, sobrescrevia e esquecia |
| `sem-definicao` | `acoesDst` apagada por uma substituição em bloco vizinha |
| `sem-rota` | `data-a="x"` sem `case "x"` — botão que não faz nada, e nada avisa |

Nenhuma dessas aparece no console e todas passam no `node --check`.

Ele **se testa antes de responder**. A primeira versão dele tinha um separador
de código que se dessincronizava numa expressão regular contendo aspas, comia
140k de 195k caracteres, deixava zero funções de pé — e respondia `✓`. Um
instrumento que falha calado é pior que instrumento nenhum, então os quatro
detectores rodam contra casos conhecidos a cada invocação, mais dois casos que
ele **não** pode acusar: prosa dentro de comentário, e aspas aninhadas.

```
node scripts/verificar.mjs --autoteste
```

## O que instrumento nenhum pega

Duas das piores coisas de 18 de agosto não eram mecânicas: o cabeçalho dizia
*8 marcados* onde a seção logo abaixo dizia *2*, e o filtro da Estante deixava
TXT e XLSX fora da partição. Nos dois casos o mesmo fato tinha **dois donos**,
e nenhum verificador compara sentido.

O conserto não foi testar que as duas afirmações batem — foi parar de afirmar
duas vezes: a cláusula do cabeçalho saiu, e os recortes passaram a sair do
acervo. `ARQ.pgs`, `ARQ.lidas` e `ARQ.estreitas` existem pelo mesmo motivo:
`96` estava escrito à mão em dez superfícies, e trocá-lo deixaria dez frases
mentindo sem nenhuma avisar.

**Derivar é mais barato que verificar, e não precisa ser lembrado.**

# De onde vieram estes arquivos

A Zodiak é do Indian Type Foundry, distribuída pela Fontshare. Termos em
<https://fontshare.com/terms>. O aviso dentro do arquivo pede que a fonte seja
identificada pelo nome e creditada — o crédito é a última seção dos Termos
de uso, em `/termos-de-uso`.

## O que aconteceu aqui

Até 03/09/2026 o `@font-face` do produto declarava só `local()`. Nenhum arquivo
de fonte era servido. A Zodiak aparecia porque estava **instalada na máquina de
quem media** — e em nenhuma outra. Todo visitante via o produto em `system-ui`, e
nenhuma medição pegava isso, porque toda medição rodava na máquina que tinha a
fonte. Verde por omissão: o desenho inteiro conferido contra o Figma, com a
tipografia errada para todo mundo menos uma pessoa.

## Como foram gerados

Da versão variável instalada, com `fonttools[woff]`:

    pyftsubset Zodiak-Variable.ttf       --unicodes='*' --layout-features='*' --flavor=woff2 --output-file=zodiak.woff2
    pyftsubset Zodiak-VariableItalic.ttf --unicodes='*' --layout-features='*' --flavor=woff2 --output-file=zodiak-italico.woff2

`sha256` das origens:

    18740e2c8eba67c1fe1994248505294202274ea6836b9c56e0a06c4f8e5c3556  Zodiak-Variable.ttf
    dc87dbd20f3bef5eddd212414846aef4dec4bc577397b555c2bd2273e42f2307  Zodiak-VariableItalic.ttf

## Por que INTEIRAS, e não recortadas

O primeiro instinto foi recortar para o Latim e servir o resto por
`unicode-range`, como o Google Fonts faz. Medido antes de decidir: a fonte
inteira dá 35,1 KB e o recorte dá 33,0 KB. **Dois quilobytes.** A Zodiak tem 381
glifos e é Latim inteirinha — não há Cirílico nem Grego para deixar de fora.
Recortar custaria um segundo pedido, uma tabela de faixas para manter, e um passo
de geração, para economizar 2 KB.

E teria um preço maior que o tamanho: a fonte de leitura padrão é esta. Quem
converte um livro em polonês ou vietnamita lê nela. Recortar por país de origem
do produto é decidir que idioma o acervo de outra pessoa pode ter.

## Por que duas, e quando a segunda desce

O itálico é um arquivo separado com `font-style: italic`. O navegador só busca
uma face que a página realmente usa — quem nunca vê texto em itálico nunca baixa
os 42 KB. Juntar os dois num arquivo só faria todo mundo pagar por eles.

---

# O peso do produto, medido em 03/09/2026

A pergunta do Erik foi "fontes, imagens e SVGs são as maiores causas de peso".
Ele estava certo, e a maior de todas nem era servida a ninguém.

## O que foi medido, e o que mudou

| | antes | depois |
|---|---:|---:|
| pacote JS | 139 KB | 139 KB |
| folha de estilo | 28 KB | 28 KB |
| fonte servida | **0 KB, e errada** | 35 KB |
| capas da abertura | 248 KB | 136 KB |
| ícones, os 29 juntos | 290 KB | 178 KB |
| PNG que ninguém usava | 1972 KB | — |

*JS e folha em gzip; capas e ícones no que sai do servidor.*

## Um por um

**A fonte.** Não estava sendo servida — está descrito acima. Passou a ser, e o
portão passou a recusar a página que declara a Zodiak sem baixar nenhum `.woff2`.
A conferência não usa `document.fonts.check`, que responde `true` para fonte
INSTALADA e diria "está tudo bem" na única máquina onde estava tudo errado; ela
pergunta ao `PerformanceResourceTiming` se o arquivo veio pela rede.

**O PNG de 1,97 MB.** `publico/livros/exemplo-ilustracao.png`, 3602 por 1942,
entrou no commit `ee1cf37` junto da tela de Leitura e nunca foi referenciado por
nada — nem código, nem CSS, nem teste. Sozinho, era mais da metade de tudo que a
subida carregava. Saiu.

**As capas.** Quatro PNG de 420 por 594 na tela de abertura, 248 KB somados, a
primeira coisa que qualquer visitante baixa. Viraram WebP a 90. Conferido pixel a
pixel num Chrome: o pior canal desvia 14 de 255 e NENHUM passa de 16. 45% menos
peso na primeira tela.

**Os ícones.** Exportados do Figma com seis casas decimais — 1044 números num
desenho de 20,8 por 21,6. `scripts/svg.py` corta para duas casas, tira os `id`
que o Figma inventa, e junta as linhas. A escolha do número de casas está
documentada lá dentro com a tabela que a decidiu, medida em Chrome a 24 e a 96
pixels. 38% menos peso no fio, com 31 pixels de diferença somando os 29 arquivos.
`auditoria.sh` avisa quando algum voltou gordo.

## O que NÃO foi feito, e por quê

**Recortar a fonte por faixa de Unicode.** Medido: a inteira dá 35,1 KB e o
recorte latino dá 33,0. Dois quilobytes não pagam um segundo pedido e uma tabela
de faixas — e a fonte de leitura padrão é esta, então recortar seria decidir em
que idioma o acervo dos outros pode estar.

**Dividir o pacote JS por rota.** Hoje as 22 telas entram num arquivo de 139 KB
comprimidos, e `React.lazy` por rota tiraria talvez 40% da primeira carga. Não
foi feito, e a razão é a data: é uma mudança estrutural no roteamento na semana
de subir, e o problema que ela resolveria — a espera na primeira tela — acabou
de ser resolvido de outro jeito, pelo esqueleto. Fica anotado como o próximo
passo de peso, para depois do ar.

**Enxugar a folha de estilo.** São 1151 variáveis de token, geradas do Design
System. Comprimem para 28 KB e não se editam à mão.

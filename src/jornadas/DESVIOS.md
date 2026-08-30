# O que mudou em relação ao desenho, e por quê

O nó `895:10286` foi desenhado **antes** do sistema de 29/08. Onde ele e o sistema
discordam, o registro fica aqui: nada foi "melhorado" em silêncio.

A ordem de autoridade que decidiu cada linha: **REGRA escrita > desenho vigente**.
Onde o desenho traz um valor solto que o sistema já nomeou, o token vence, porque
é isso que o portão vai cobrar da página servida.

## Cor: dez valores soltos viraram token

| no desenho | virou | por quê |
|---|---|---|
| `bg-white` | `surface/base` `#f9f9f9` | off-white em vez de branco puro, primeira linha da regra de Cor |
| `#111` (título) | `text/strong` `#151515` | mesma tinta cheia, valor decidido |
| `#282828` | `text/strong` | não existe no sistema |
| `#cfcfcf` (borda da nav) | `border/subtle` `#b1b1b1` | não existe no sistema |
| `#e0e0e0` (borda do chip) | `border/subtle` | idem |
| `#6b6b80` (texto do chip) | `text/secondary` `#6a6a6a` | o `80` no azul puxa a cor para fora do neutro |
| `rgba(255,255,255,.8)` | `surface/base` | superfície translúcida esconde o par de contraste real |
| `bg-black` (rodapé e botão) | `surface/inverse` `#161616` | preto puro não existe no sistema |
| `#d5d5d5` (links do rodapé) | `text/on-inverse` `#f3f3f3` | não existe no sistema |
| `#585858` | `text/primary` `#535353` | idem |

## Geometria: o raio dos chips

Os chips de formato tinham `border-radius: 16px`. **Foram para zero.**

Raio zero em ação e estrutura é **REGRA**, e a razão está escrita: pílula e círculo
são os 5% que quebram a regra, e funcionam *por serem raros* — numa composição
reta, uma curva vira sinal. Seis chips arredondados gastariam esse sinal em algo
que não é sinal nenhum.

## Tipografia: três corpos fora da escala

| no desenho | virou | por quê |
|---|---|---|
| `14/16` nos chips | `14/22` (`Label/Small`) | entrelinha abaixo da regra `corpo + 8` |
| `16/16` no "não é preciso criar conta" | `16/24` (`Label/Medium`) | idem |
| `28/24` nos links do rodapé | **não implementado** | entrelinha menor que o corpo, o mesmo defeito do antigo `Heading/H5-Bold-28`. E o conteúdo é `Link link link`: placeholder |

**O rodapé saiu inteiro, menos a marca.** Os quarenta nós de `Link link link` são
um componente que nunca foi preenchido, e o Erik pediu para pausar essa parte até
o rodapé do site existir. Sistematizar placeholder é polir o que vai ser
substituído.

## O que NÃO foi corrigido, de propósito

**As sombras da nav.** Cinco camadas quase invisíveis, entre 0 e 4% de opacidade.
O idioma do produto pede *poucas* sombras, não zero, e um elemento que flutua sobre
a página é o caso em que uma sombra sutil é o certo. Ficaram.

**A largura de 1920px do quadro.** O desenho é de uma tela específica; a
implementação é fluida, com o conteúdo limitado por `max-width`. Copiar 1920 fixo
seria copiar a moldura em vez do desenho.

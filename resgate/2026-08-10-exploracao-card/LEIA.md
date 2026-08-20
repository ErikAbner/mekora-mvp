# Exploração Profunda do Card

> **Não classificado. Não canônico.** Estar aqui não torna nada uma decisão vigente.
> Ver [`../NOTA.md`](../NOTA.md) para a regra que vale em todo o diretório `resgate/`.

## Origem

| | |
|---|---|
| **Caminho original** | `C:\Users\erikc\Downloads\Exploracao Profunda Card.dc.html` |
| **Data do material** | 10 de agosto de 2026, 11h06 |
| **Data do resgate** | 20 de agosto de 2026 |
| **Origem preservada** | sim — o arquivo continua em `Downloads` |
| **Git** | **nenhum.** Não está em nenhum commit dos dois repositórios |

## Motivo do resgate

É o **documento-fonte** da exploração que, seis horas depois no mesmo dia, virou
`caderno-01-bancada-do-card.html` no repositório. O caderno guarda as conclusões; este arquivo
guarda o raciocínio que levou até elas.

Estava em `Downloads`, uma pasta volátil, fora de qualquer repositório.

## O que existe aqui e não existe no caderno 01

Verificado por busca nos dois repositórios — cada item abaixo devolve **zero ocorrências** fora
deste arquivo:

**A tabela de arquitetura da informação do card.** Doze informações, cada uma com a camada de
revelação e a justificativa. Duas entradas literais:

> *Capa* — sempre visível — "Reconhecimento pré-atencional; é o índice visual da biblioteca."
>
> *Nº de notas* — sempre visível como sinal — "É o diferencial do Mekora, mas como sinal
> discreto, não manchete. Ausente quando zero."

E a regra de corte, que não está escrita em lugar nenhum versionado: sempre visível é o que é
necessário para decidir *"abro este?"*; hover é enriquecimento que nunca é essencial.

**O diagnóstico do card em quatro escalas** — 6, 20, 50 e 200 livros. A frase que explica a
Estante inteira:

> "200 livros: inviável sem busca. O card deixa de ser unidade de navegação e vira unidade de
> leitura — o oposto do job de uma galeria."

**O enunciado do problema**, que o caderno não traz:

> "Competição de jobs, não excesso de dados. O card tenta servir dois modos de uso ao mesmo
> tempo: navegar a estante e revisar conhecimento. Nenhuma dosagem de informação resolve isso —
> são estados ou superfícies diferentes."

É a formulação do problema que a separação entre Estante e página do livro resolve.

**A tabela de padrões de interação** (adequados × frágeis), o veredito de que *"a hipótese
original está 80% certa"*, o M4 puro como alternativa de segurança e o M5 "Knowledge First" como
modo alternativo de visualizar a biblioteca — "ver por conhecimento".

Sem este arquivo, o repositório fica com as conclusões e sem a derivação.

## Ressalva sobre a leitura

O arquivo é um Design Canvas (`.dc.html`) e carrega `<script src="./support.js">`. O
`support.js` **não** estava em `Downloads` e não foi encontrado em lugar nenhum, então a página
**não renderiza as tabelas no navegador**.

Os dados estão íntegros e legíveis no código-fonte, dentro da função `renderVals()` e do array
`iaRows`. Preservar o arquivo preserva o conteúdo; não preserva a renderização.

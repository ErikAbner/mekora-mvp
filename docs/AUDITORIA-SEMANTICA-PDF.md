# Mekora — auditoria da interpretação semântica de PDFs

> Data: 1 de outubro de 2026
>
> Escopo: conversão PDF/OCR → EPUB → leitor do Mekora
>
> Caso de validação: `VELLOSO.pdf`

## Resumo executivo

O problema não estava somente no reconhecimento das letras. O pipeline tratava
caixas geométricas produzidas pelo OCR como se já fossem parágrafos editoriais,
criava um capítulo EPUB por folha do PDF e emitia praticamente todo o conteúdo
como `<p>`. Isso destruía continuidade entre páginas, hierarquia, notas e
variações tipográficas mesmo quando o PDF original ainda continha evidências
úteis de composição.

A correção mantém as bibliotecas existentes e acrescenta uma etapa determinística
de blocos semânticos entre OCR e EPUB. Ela combina texto reconhecido, geometria,
recuo, distância, posição na página, tamanho relativo, pontuação, repetição de
cabeçalho/rodapé e sinais tipográficos da camada original. O EPUB passa a usar
elementos semânticos, e o leitor recebeu apenas os tipos novos necessários para
autoria e notas editoriais.

## Problemas críticos encontrados

### Continuidade entre páginas

No caso real, a folha termina em `emocio-` e a seguinte começa em `nantes`.
Antes, os dois trechos pertenciam a arquivos XHTML diferentes e nunca podiam
formar um único parágrafo. A continuidade agora exige evidências conjuntas:
posição no fim/início das páginas, ausência de mudança semântica, recuo
compatível e continuidade linguística. Hífen editorial de quebra é removido;
hífen lexical é preservado.

### Bloco de OCR não é parágrafo

O segmentador do OCR cria caixas para facilitar reconhecimento, não edição.
Essas caixas agora são classificadas por contexto relativo da própria página.
Uma quebra geométrica só vira novo parágrafo quando recuo, distância,
pontuação ou mudança de papel sustentam essa decisão.

### Notas e conteúdo auxiliar

Notas inferiores em corpo menor eram texto comum. Agora viram
`<aside epub:type="footnote">`, recebem separação visual e não interrompem a
continuidade do corpo principal. Relações explícitas entre marcador e nota só
devem ser criadas quando os dois lados forem reconhecidos com confiança.

### Hierarquia e tipografia

O PDF original do caso contém Times Italic, Times Bold Italic e tamanhos
distintos; o OCR forçado produzia Noto Sans sem papel editorial. A solução usa o
texto do OCR, mas reaproveita por sobreposição geométrica os sinais de estilo da
camada original. O resultado pode emitir títulos, subtítulos, autoria, listas,
citações, notas, itálico e negrito.

## Pipeline alterado

1. Detectar idioma e executar OCR somente com o idioma confiável.
2. Segmentar spreads em páginas impressas antes do reconhecimento destinado ao
   EPUB.
3. Fundir conservadoramente OCR novo e camada textual antiga.
4. Produzir blocos com texto, caixa, corpo relativo, recuo e marcas inline.
5. Classificar blocos semanticamente e remover cabeçalhos/rodapés corridos.
6. Construir arestas de continuidade dentro e entre páginas.
7. Emitir XHTML semântico no EPUB.
8. Renderizar autoria e notas editoriais no leitor com linguagem visual própria.

## Suporte atual depois da correção

| Elemento | Resultado |
|---|---|
| Continuação de parágrafo | Reconstruída dentro e entre páginas |
| Novo parágrafo | Preservado por recuo, distância e terminação |
| Título/subtítulo | `h1`–`h3` por hierarquia relativa |
| Lista | `ul/li` para marcadores e enumeração reconhecidos |
| Citação/bloco recuado | `blockquote` |
| Nota editorial | `aside` com `epub:type="footnote"` |
| Autoria | `p` com `epub:type="contributors"` |
| Itálico/negrito | `em/strong` quando sustentados pela camada original |
| Legenda | Preservada quando declarada; inferência visual continua conservadora |
| Cabeçalho/rodapé corrido | Removido do fluxo principal |

## Limites e alternativa futura

PDF puramente rasterizado não contém informação tipográfica verdadeira. Corpo,
recuo e alinhamento podem ser inferidos, mas itálico e negrito não devem ser
inventados sem confiança. Documentos muito complexos — tabelas densas,
manuscritos, revistas com várias colunas irregulares — podem justificar um
modelo de análise de layout como etapa opcional. Isso não foi adotado agora
porque aumentaria instalação, memória e risco no Windows sem necessidade para
o caso corrente.

## Verificação

Os testes cobrem continuidade entre páginas, hífen de quebra, novo parágrafo,
títulos junto ao corpo, notas, autoria, itálico, negrito, citações, listas e
mudança de seção. O caso VELLOSO também foi convertido por inteiro: o trecho
`emocio-` + `nantes` passou a ser `emocionantes` dentro do mesmo parágrafo, a
nota inferior virou conteúdo auxiliar e o título principal passou a ser uma
única unidade hierárquica.

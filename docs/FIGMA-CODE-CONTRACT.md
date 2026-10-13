# Contrato entre Figma e código

**Arquivo canônico:** `uuhto6FREG14H3DME0XCI7` — *Kindle local tool - Project*  
**Telas:** `895:6937` — *Wireframing - Alta ✅*  
**Sistema de design:** `1649:21` — *DS — Mekora*  
**Última reconciliação:** 2026-10-13

Este contrato evita que uma tela seja reconstruída por semelhança. Antes de alterar uma
composição, é obrigatório localizar o quadro vigente em `TELAS-FIGMA.md`, identificar os
componentes utilizados e conferir os estados reais existentes no código.

## Autoridade de cada camada

| camada | decide | não decide |
|---|---|---|
| Figma | composição, hierarquia visual, espaçamento, ordem e variantes visíveis | regras de negócio, persistência e capacidade técnica |
| `DESIGN-SYSTEM.md` | princípios, tokens e razões das decisões | conteúdo específico de uma rota |
| código e testes | comportamento, dados, acessibilidade e estados possíveis | uma composição diferente sem registrar o desvio |

Quando houver divergência, ela não deve ser resolvida silenciosamente. Registre a decisão,
atualize o quadro vigente e o código na mesma entrega, ou marque explicitamente o quadro
como histórico.

## Componentes compartilhados

| Figma | código | contrato principal |
|---|---|---|
| `Botao` | `web/src/componentes/Botao.jsx` | tom, estado, foco e área clicável |
| `Campo` | `web/src/componentes/Campo.jsx` | rótulo, ajuda, erro e estado desabilitado |
| `EstadoDoSistema` | componentes de estado e preparo | andamento, sucesso, atenção e erro |
| Cabeçalho global | `web/src/componentes/Cabecalho.jsx` | lugar atual, busca, ajuda e conta |
| Capa de reserva | `web/src/componentes/CapaDeReserva.jsx` | título, autoria, formato e contagem sem invadir a arte |

Os três primeiros componentes já existem como conjuntos na página `DS — Mekora`. O
Code Connect só deve ser publicado depois que esses componentes forem publicados como
biblioteca e a correspondência for confirmada no Figma; até lá esta tabela é o mapa
normativo, sem inventar ligações automáticas.

## Tokens

As variáveis de cor existentes receberam sintaxe Web ligada aos tokens CSS. A coleção
`Mekora Layout` adiciona espaçamentos, larguras de conteúdo, breakpoints e raio estrutural.
Valores novos entram primeiro em `web/tokens/`, depois no Figma, e por último nesta tabela;
um número isolado dentro de uma tela não vira regra por repetição acidental.

## Checklist de uma tela

1. Conferir o quadro e o estado corretos em `TELAS-FIGMA.md`.
2. Comparar a composição — não apenas cores e tipografia.
3. Usar componentes e tokens existentes antes de criar outra variante.
4. Cobrir vazio, carregando, erro, sucesso e excesso de conteúdo quando se aplicarem.
5. Conferir desktop, tablet e telefone sem deslocamento entre cabeçalhos.
6. Testar teclado, foco, toque e texto ampliado.
7. Atualizar Figma, documentação e código juntos quando a decisão mudar.

## Telas reconciliadas em 2026-10-13

O conjunto `1654:2176` no quadro de alta fidelidade contém as rotas que estavam no código
e não tinham quadro próprio: Entrar, Notas, Segurança vigente, Política de privacidade,
Termos, Não encontrada, Kindle no desktop e o estado móvel do Canvas. Cada quadro traz
uma faixa `Contrato com o código` com rota e arquivo de origem; a faixa é anotação do
design e não deve aparecer no produto.

# O inventário das telas do Figma

**Este arquivo existe porque eu perdi os ids duas vezes.** O `get_metadata` da
página vem truncado e não devolve as telas; sondar id por id não funciona,
porque os números não são sequenciais entre quadros irmãos (medido: `964:24607`
é FILHO de `964:24606`, não o vizinho dele). O Erik teve de mandar a lista à mão.

Ela fica aqui para não se perder de novo. Quando uma tela nova nascer no Figma,
acrescente a linha.

Arquivo: `uuhto6FREG14H3DME0XCI7` — *Kindle local tool - Project*.

## Como abrir uma que não está aqui

A ferramenta lê a **seleção atual** do Figma quando não recebe id. Selecione o
quadro e peça — o nome e o id vêm juntos.

## Telefone — `M ·`

| id | tela | rota do produto | estado |
|---|---|---|---|
| `964:24178` | M · Apresentação | `/` | por comparar |
| `964:24606` | M · Estante — grade | `/estante` | **comparada** — duas colunas e alternador acima da grade; A-28 registra o que ficou |
| `966:25321` | M · Conta | `/conta` | por comparar — **o desenho tem Nome e Senha, que o produto não tem** |
| `966:25554` | M · Conta — Dispositivos Kindle | `/conta/kindle` | por comparar |
| `966:25786` | M · Conta — Preferências | `/conta/preferencias` | por comparar |
| `966:26643` | M · Conta — Privacidade | `/conta/privacidade` | por comparar |
| `966:27160` | M · Atualizações | `/atualizacoes` | por comparar |
| `966:27747` | M · Ajuda e recursos | `/ajuda` | por comparar |
| `966:28476` | M · Mesa | `/mesa` | por comparar |
| `966:29052` | M · Livro — o que ficou | `/estante/:id` | por comparar |
| `966:29395` | M · Leitura | `/leitura/:id` | **comparada** — o cromo transbordava 390 e foi corrigido |
| `966:29743` | M · Nota — página | `/nota/:id` | por comparar |
| `966:30269` | M · Nota — ligar e estudos | `/nota/:id` | por comparar |
| `966:30771` | M · Estudo — página | `/estudo/:id` | por comparar |
| `966:31095` | M · Estudos | `/estudos` | por comparar |
| `966:31504` | M · Preparo — o que encontrei | `/preparo/:id` | por comparar |
| `967:31833` | M · Preparo — em andamento | `/preparo/:id` | por comparar |
| `973:32414` | M · Leitura · aparência | painel da leitura | por comparar |

## Símbolos — trechos de fluxo

| id | símbolo | onde vive | estado |
|---|---|---|---|
| `941:23103`–`941:23105`, `941:23115`–`941:23117` | Kindle · assistente | `/conta/kindle` | construído |
| `941:23106` | Criar conta | gate de quem não entrou | construído (A-22) |
| `941:23107` | Estudo · seletor | busca do cabeçalho | construído |
| `941:23108` | Conectar nota | folha da página da nota | construído (A-24) |
| `941:23109` | Aviso · preferência fora do padrão | `/preparo/:id` | construído |
| `941:23110` | Leitura · aparência | painel da leitura | construído |
| `941:23111` | Leitura · notas e destaques | painel da leitura | construído |
| `941:23112` | Leitura · índice | painel da leitura | construído |
| `941:23113` | Nota · cartão | popup de escrever a nota | construído |
| `941:23118` | Arquivo · configurações | ficha do livro | construído (A-23) |
| `941:23120` | Seleção · ações | leitura | construído |

## Computador — `D ·`

Os ids que estão escritos no repositório. Faltam os outros, e valem as mesmas
instruções acima.

| id | tela |
|---|---|
| `895:7315` | D · Estante — grade |
| `895:7506` | D · Livro — ficha / estante em 3D |
| `895:6938` | D · Canvas |
| `895:10286` | D · Mesa — vazia |
| `895:10715` | D · Conta — preferências |
| `895:8164` | D · Preparo — pronto |

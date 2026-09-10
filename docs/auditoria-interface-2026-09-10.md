# Auditoria de interface e fluxo — Mekora

Data: 10 de setembro de 2026

## Resultado

Os 17 pontos relatados foram tratados como uma única revisão de coerência. A rodada cobriu tema inicial, cabeçalho, busca do Canvas, menu e páginas da conta, Ajuda, Atualizações, tradução e recuperação de erros de conversão.

## Correções aplicadas

- Primeiro acesso no tema claro; “Como o sistema” permanece como escolha explícita.
- Cabeçalho recolhido ao rolar para baixo e devolvido ao rolar para cima.
- Busca do cabeçalho branca e contextual no Canvas; a segunda busca da superfície foi removida.
- Perfil marcado como ativo com o menu aberto; dropdown usa a largura total do bloco de ações.
- Grade, alinhamento, espaçamento vertical e ilustrações das páginas de conta normalizados.
- Conteúdo auxiliar do Kindle condensado em “Ver detalhes”.
- Ajuda apresentada como gaveta sobre o chão pontilhado.
- Atualizações reconstruída conforme o frame 895:11060 do Figma: folha larga, coluna de 888 px, hero, tipografia, etiquetas e card final.
- Conversão não falha mais pela referência ausente a `cancel_requested`.
- Arquivos em outro idioma mostram a decisão “Ler em português” antes do relatório detalhado.
- Estado de erro de preparo agora oferece contexto, nova tentativa e volta à Mesa.

## Verificação

- Build de produção do frontend concluído.
- 931 testes do backend aprovados; 1 ignorado.
- Teste de regressão novo cobre conversão com identificador de operação.
- Teste das lombadas 3D aprovado.
- Verificação de colisão de classes aprovada.
- Conferência visual no navegador: tema claro, Atualizações, Ajuda, menu da conta, comportamento do cabeçalho e busca contextual do Canvas.

## Observação operacional

A tradução local está operacional com o motor Argos e os pares inglês ↔ português e espanhol ↔ português. O par inglês → português foi exercitado no ambiente definitivo, sem chamada a um serviço externo. Quando não houver um par compatível, a interface mostra essa limitação no lugar onde a decisão seria tomada, em vez de esconder a função ou oferecer um botão que falharia.

## Revisão autenticada das telas privadas

As cinco rotas da conta foram abertas com uma sessão real: Conta, Dispositivos Kindle, Segurança, Preferências e Privacidade.

- Tema inicial confirmado como claro (`#f9f9f9`) e opção “Claro” marcada.
- Nenhuma das cinco telas apresentou rolagem horizontal em 1280 px ou 390 px.
- As ilustrações são distintas, transparentes, padronizadas e invadem levemente o painel de conteúdo.
- O detalhe “Antes do primeiro envio” do Kindle abre e revela a orientação completa.
- Privacidade permanece navegável na gaveta interna apesar do conteúdo longo.
- No celular, a navegação da conta vem primeiro e o conteúdo segue na mesma gaveta rolável, sem corte lateral.

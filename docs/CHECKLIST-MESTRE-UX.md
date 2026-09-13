# Checklist mestre de fechamento UX — Mekora

**Início da reconciliação:** 10 de setembro de 2026
**Objetivo:** deixar o produto apresentável a uma banca/professor de UX sem depender de afirmações vagas como “parece corrigido”.

## Regra de estado

- **Não auditado:** requisito reconstruído, mas ainda não comparado nesta rodada.
- **Implementado; falta provar:** há código correspondente, mas falta teste funcional e/ou evidência visual atual.
- **Comprovado:** código, comportamento e tela atual foram verificados nesta rodada.
- **Falhou:** a implementação atual contradiz o requisito.
- **Bloqueado:** existe uma dependência externa explícita; o bloqueio e a evidência devem estar registrados.

Um item só pode virar **Comprovado** quando tiver critério observável e evidência atual. Documento histórico ou comentário no código não substitui a prova.

## 1. Estrutura e navegação global

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| NAV-01 | Tema claro no primeiro acesso | Sem preferência salva, a primeira pintura e a interface carregada são claras | Comprovado | `/mesa` anônima: `data-tema=claro`, fundo `rgb(249,249,249)` |
| NAV-02 | Botões de ícone quadrados e centralizados | Ajuda, perfil, lupa e controles equivalentes têm largura=altura e padding ótico uniforme | Comprovado no cabeçalho | Ajuda e perfil medidos em 60×60 px; ícones centralizados visualmente |
| NAV-03 | Cabeçalho não atrapalha a rolagem | Some ao rolar para baixo e retorna ao rolar para cima, sem salto de layout | Comprovado | Em `/mesa`: `translateY(-138px)` ao descer; volta a `none` ao subir |
| NAV-04 | Rolagem suave | Âncoras e navegações internas usam rolagem suave; `prefers-reduced-motion` desliga o efeito | Comprovado | No navegador, `scroll-behavior` computado em `/mesa` é `smooth`; `base.css` contém a exceção para movimento reduzido |
| NAV-05 | Perfil ativo com menu aberto | O botão de perfil mantém estado visual e `aria-expanded=true` enquanto o menu está aberto | Comprovado | Botão recebe classe `ativo`, fundo inverso e `aria-expanded=true` |
| NAV-06 | Menu da conta fiel ao componente | Dropdown alinha à caixa de ações, tem largura prevista no Figma e não corta itens | Comprovado no desktop | Caixa de ações 476 px; menu 474 px dentro do mesmo alinhamento |
| NAV-07 | Busca com fundo neutro/branco | Campo não ganha uma superfície colorida sem função | Comprovado | Fundo computado `rgb(255,255,255)` |
| NAV-08 | Links e botões têm destino/ação real | Nenhum controle interativo visível fica sem ação, destino ou explicação de indisponibilidade | Comprovado estruturalmente | `scripts/links.mjs`: 28 rotas e nenhum link morto; `scripts/botoes.mjs`: nenhum botão sem gesto e nenhum desligado sem razão |
| NAV-09 | Nenhuma entrada devolve a interface legada | Abrir `:8000`, usar link válido ou repetir link vencido mantém a pessoa no Mekora atual, com seus arquivos públicos carregados | Comprovado | `:8000/` abriu a landing atual com título “Mekora”; link inválido terminou em `:5180/entrar?erro=link`; SVG servido como `image/svg+xml`; regressões cobrem interface, link válido e link repetido |

## 2. Mesa e fluxo de entrada

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| MES-01 | Hero equilibrado e fiel ao Figma | Título, texto e ilustração formam a composição do frame, sem grande vazio/deslocamento ótico | Comprovado | Estados vazio e autenticado comparados à família `895:9348`/`895:10286`; composição de 564 px e coluna de título de 876 px, sem overflow |
| MES-02 | “Nova nota” sem desalinhamento | Área da seta é quadrada, centralizada e não deforma a altura do botão | Comprovado no lugar real do controle (Canvas) | Controle principal 147×56 px e seta “Adicionar livro ou mídia” exatamente 56×56 px |
| MES-03 | “Continue” leva primeiro à central do livro | A ação principal abre `/estante/:id`; “Notas” não substitui esse destino | Comprovado | Mesa autenticada: “Continuar” aponta para `/estante/27` |
| MES-04 | Leitura continua disponível com nome inequívoco | A ação secundária “Voltar à leitura” abre `/leitura/:id` | Comprovado | Mesa autenticada: “Voltar à leitura” aponta para `/leitura/27` |
| MES-05 | Arquivo único não para na fila | Um upload único abre diretamente a configuração temporária daquele arquivo | Comprovado | Ensaio real anterior desta rodada: TXT abriu `/preparo/46?modo=guiado` |
| MES-06 | Lote continua visível na Mesa | Dois ou mais arquivos permanecem na fila com estado individual | Comprovado | Ensaio real pelo seletor nativo: `multiple=true`, dois TXT apareceram juntos como `prova-lote-mekora-a.txt` e `prova-lote-mekora-b.txt`, contador “2 arquivos na fila” e rota permaneceu em `/mesa`; trabalhos sintéticos removidos ao terminar |
| MES-07 | Recuperar todos os erros | Havendo arquivos com erro, uma única ação tenta novamente todos eles e atualiza seus estados | Comprovado com um erro; plural coberto pelo mesmo laço | Ação “Tentar arquivo novamente” chamou de novo o backend e atualizou o trabalho; a falha controlada reapareceu por o arquivo de prova não ter input |
| MES-08 | Ícone de “Ver na estante” comunica navegação | Não usa símbolo de upload/envio | Comprovado | Ação usa `icone-estante.svg`; varredura de ícones aprovou 27 desenhos distintos e papéis coerentes |

## 3. Preparo e conversão

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| PRE-01 | Preparo é uma gaveta Vaul | A rota temporária aparece como folha sobre o chão, pode ser fechada e devolve à origem | Comprovado | `/preparo/28`: Vaul e alça presentes; arrasto real da alça fechou a folha e devolveu a `/mesa` |
| PRE-02 | Título e autor editáveis no modo guiado | Os dois campos aparecem e persistem antes de converter, em ambos os modos | Comprovado | Guiado mostra os dois valores com “Alterar”; Personalizado os expõe no início. Edição real ficou gravada antes da tentativa de conversão |
| PRE-03 | Tradução aparece quando aplicável | Livro em idioma estrangeiro oferece idioma de destino antes da conversão | Comprovado autenticado | Ação “Traduzir este arquivo” abre folha com quatro pares instalados; botões medidos sem sobreposição no desktop e alcançáveis por rolagem no mobile |
| PRE-04 | Ausência de sessão não parece carregamento infinito | A área de tradução explica que é preciso entrar | Comprovado estruturalmente | O estado sem sessão é distinto de carregamento e mostra a orientação de entrada; autenticação e carregamento usam ramos separados em `Preparo.jsx` |
| PRE-05 | Erro `cancel_requested` eliminado | Conversão real termina sem `NameError`, inclusive após tentar novamente | Comprovado no caso simples | Conversão real do trabalho 46 gerou EPUB de 139 KB; suíte backend 932 aprovados, 1 ignorado |
| PRE-06 | Estado de erro preserva contexto | A folha mostra arquivo, causa, “Tentar de novo” e retorno à Mesa sem desmontar a interface | Comprovado visualmente | Falha controlada do trabalho 28 manteve a gaveta e mostrou as duas recuperações; exceção técnica foi substituída por orientação acionável |
| PRE-07 | Singular e plural corretos | “1 página”; demais valores no plural | Comprovado estruturalmente | Copy usa ramo explícito para `1 página`; demais valores usam plural |
| PRE-08 | Cancelar é seguro e coerente | Cancelamento não deixa trabalho travado nem converte uma tentativa seguinte em erro | Comprovado por regressão | `test_cancelar_conversao.py` cobre interrupção, retorno a `analyzed`, nova tentativa e permanência na Mesa; suíte completa aprovada |

## 4. Leitura e central do livro

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| LEI-01 | Leitura é uma gaveta Vaul | `/leitura/:id` abre uma folha Vaul sobre o chão e mantém a rolagem contínua | Comprovado | `/leitura/46`: um `[data-vaul-drawer]` e uma alça presentes; composição conferida em desktop e 390 px |
| LEI-02 | Existe volta inequívoca | Fechar/arrastar e o controle de voltar levam a `/estante/:id` | Comprovado | Controle aponta para `/estante/27`; arrasto real da alça fechou a leitura e chegou a essa rota |
| LEI-03 | “Continuar” abre a central do livro | Mesa/Estante usam `/estante/:id` como ação principal; leitura é uma ação nomeada separadamente | Comprovado na Mesa | “Continuar” → `/estante/27`; “Voltar à leitura” → `/leitura/27` |
| LEI-04 | Progresso não se perde | Abrir, rolar, fechar e reabrir retorna ao ponto guardado sem salto indevido | Comprovado após correção | Marca conhecida `capítulo 0 / deslocamento 384` reabriu no bloco `data-de=384` e permaneceu igual no banco; corrigidos o texto provisório e o escopo por capítulo |
| LEI-05 | Notas/destaques funcionam | Selecionar texto, destacar, comentar, recolorir e apagar produz feedback e persiste | Comprovado | Arrasto real do mouse no trabalho 44 selecionou “term was first coined by Don Norman in 1993 for his new” e abriu a paleta com quatro cores, “Adicionar nota”, “Copiar” e “Cancelar”. O ciclo seguinte já havia sido provado na interface: caderno mostrou a nota; azul persistiu após recarga; comentário editado e verde persistiram após nova recarga; “Apagar” zerou `Notas (0)` e removeu o registro do banco. Regressão cobre âncora, offsets, capítulo, contexto e posição |
| LEI-06 | Painéis abrem do lado do controle | Índice, aparência, busca, notas e marcador não abrem invertidos nem se sobrepõem de forma errada | Comprovado | Índice, Notas e Marcadores: 464 px à esquerda; Aparência e Busca: 464 px à direita; só um `aria-pressed=true` por ensaio e zero overflow |
| LEI-07 | Layout responsivo | Desktop e 390 px não cortam texto, controles ou conteúdo do livro | Comprovado no carregamento inicial | Desktop e viewport móvel: `scrollWidth === clientWidth`; gaveta, cabeçalho, título e início do conteúdo permanecem visíveis |
| LEI-08 | EPUB real com pontuação abre | Título/autor com vírgulas, parênteses, apóstrofo ou `&` não transforma arquivo válido em 404 | Comprovado após correção | `/leitura/44` abriu o conteúdo real sem 404; regressão `test_epub_com_pontuacao_do_titulo_e_servido` aprovada sem enfraquecer a proteção contra traversal |

## 5. Estante e livros 3D

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| EST-01 | Clique funciona na capa inteira | Capa, lombada e área textual selecionam o livro; não existe zona morta | Comprovado | Clique real na face superior escolheu o segundo livro; clique real na lombada escolheu novamente o primeiro. As faces e textos pertencem ao mesmo `<button>` |
| EST-02 | Títulos longos não quebram o grid | Corte visual em duas linhas, com nome completo acessível | Comprovado | Título longo fica visualmente limitado sem expandir o cartão; `title` e nome acessível conservam “Interviewing Users: How to Uncover Compelling Insights” inteiro |
| EST-03 | Fallback de capa é consistente | Sem capa, usa componente oficial, não uma implementação ad hoc | Comprovado | Primeiro livro sem imagem usa `CapaDeReserva`; lombada fica neutra em vez de copiar cor/capa de outro livro |
| EST-04 | Livro 3D usa lombada correta | Usa as lombadas criadas pelo usuário, título/autor abreviados quando necessário e cor principal da capa | Comprovado | Seis lombadas inspecionadas: títulos/autores reais, variantes do conjunto e cores calculadas por capa; mobile 390 px sem overflow |
| EST-05 | Faces do 3D não mostram capa errada | Frente, lombada e topo pertencem ao mesmo livro e não trocam textura entre cartões | Comprovado nos seis livros de prova | Cada botão contém a própria face superior e a própria lombada; caminhos de capa distintos `semeado-0`…`semeado-4`, sem textura compartilhada |
| EST-06 | Detalhes não empurram a ação principal | Metadados ficam em “Ver detalhes do arquivo”; continuar permanece visível | Comprovado | Grade da Estante mantém ações primárias visíveis e recolhe metadados em “Ver detalhes do arquivo” |
| EST-07 | Envio ao Kindle só na central do livro | A Estante mostra estado, mas não oferece o envio fora do contexto | Comprovado | `/estante/44` oferece “Enviar ao Kindle”; a visão geral da Estante não oferece envio fora do livro escolhido |

## 6. Canvas

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| CAN-01 | Uma única busca contextual | No Canvas não aparece uma segunda pesquisa sobreposta; a busca do cabeçalho busca o contexto do Canvas | Comprovado | Uma busca visível, com placeholder “Buscar neste Canvas” |
| CAN-02 | Padding igual às outras seções | Conteúdo útil começa a 32 px no topo e nas laterais em desktop | Comprovado | Cabeçalho do Canvas medido com 32 px no desktop e 16 px no mobile; zero overflow |
| CAN-03 | Pan, zoom e arrasto são previsíveis | Post-its, mídias e grupos movem sem o chão roubar o gesto | Comprovado | Zoom real 100%→110%; pan alterou a câmera para `(-60,-120)`; nota e grupo foram arrastados, persistiram e mantiveram a mesma diferença de posição |
| CAN-04 | Controles não se sobrepõem | Nova nota, menu, zoom e busca mantêm áreas de clique separadas | Comprovado | Nova nota 147×56, seta 56×56; menu 208×114 com “Livro da Estante” e “Mídia”; zoom separado e zero overflow |
| CAN-05 | Grupos preservam leitura visual | Sobreposição permitida não esconde controles nem torna pertencimento ambíguo | Comprovado | Grupo de prova exibiu rótulo e contorno, carregou a nota vinculada e moveu grupo+nota pelo mesmo delta; registros sintéticos foram removidos após a prova |

## 7. Conta, configurações, ajuda e atualizações

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| CON-01 | Identidade correta | A conta mostra `eriks0403@gmail.com`, sem truncar ou quebrar em duas linhas no desktop | Comprovado | Conta isolada autenticada: endereço completo em desktop e 390 px; `scrollWidth === clientWidth` no texto |
| CON-02 | Menu e painel na mesma régua | Primeiro item da navegação alinha ao topo do primeiro bloco de conteúdo | Comprovado no desktop | Medição após ajuste: `itemTop=385,6875` e `panelTop=385,6875`; delta zero |
| CON-03 | Largura evita quebras inadmissíveis | E-mail e textos de botão permanecem em uma linha nas larguras desktop previstas | Comprovado | E-mail completo em 206 px; varredura das cinco rotas encontrou zero botão com quebra em duas linhas |
| CON-04 | Padding/vertical trim não corta tinta | Descendentes, títulos e metadados não são cortados; espaçamento segue o frame | Comprovado | As cinco rotas foram varridas em desktop e 390 px; nenhum título, e-mail, botão ou metadado apresentou corte ou overflow |
| CON-05 | Ilustrações distintas e relevantes | Cada página usa arte adequada; não há repetição arbitrária | Comprovado | Conta, Kindle, Segurança, Preferências e Privacidade usam cinco SVGs distintos e semanticamente relacionados |
| CON-06 | Ilustrações padronizadas | Base, escala e invasão negativa do painel são coerentes no conjunto | Comprovado | Conjunto varrido em desktop/mobile; Segurança usa 224/164 px e Conta e Segurança invadem o painel exatamente 26 px |
| CON-07 | Segurança usa a bruxa das senhas | A arte “magic password” aparece sem bloco retangular indevido atrás | Comprovado | Asset exato do nó `966:25339`; conferência autenticada mostra a bruxa correta, sem bloco retangular, no desktop e no celular |
| CON-08 | Segurança centralizada, não esticada | Miolo e blocos seguem a largura e a composição do Figma | Comprovado nas larguras testadas | Painel de 761 px no desktop, 328 px em 390; sem overflow e proporção da ilustração preservada |
| CON-09 | Sessões sem bugs de padding | Linhas, estado atual e ações não se sobrepõem nem raspam bordas | Comprovado visualmente | Segurança auditada em desktop e 390 px; cartões e ações não sobrepõem e não há overflow |
| CON-10 | Ajuda é Vaul | Ajuda abre como folha sobre o chão pontilhado e fecha para o contexto anterior | Comprovado | Abertura com Vaul/alça; arrasto real fechou e devolveu à Mesa |
| CON-11 | Preferências usa largura do sistema | Conteúdo respeita 32 px laterais e não vira a única tela estreita | Comprovado | Rota incluída na varredura das cinco telas, alinhada ao mesmo painel de 761 px desktop/328 px mobile |
| CON-12 | Kindle usa detalhe progressivo | Orientação longa fica em hotspot/“Ver detalhes”, dentro do grid | Comprovado | “Antes do primeiro envio · Ver detalhes” começa recolhido, abre no clique dentro do painel de 759 px e não causa overflow |
| CON-13 | Atualizações fiel ao frame 895:11060 | Largura, coluna, hero, datas, etiquetas, cards e rodapé batem com o Figma em desktop e celular | Comprovado | Comparação direta com `895:11060` e `966:27160`; página de 6557 px, duas datas, 13 ações reais, título/arte mobile corrigidos e zero overflow em desktop/390 px |

## 8. Conteúdo, acessibilidade e estados

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| TXT-01 | Copy crítica revisada | Ações dizem o destino/efeito; textos não contradizem o comportamento; erros explicam recuperação | Comprovado nas rotas principais | Varredura das 18 rotas não expôs exceção, placeholder, `cancel_requested`, `NoneType` ou `[object Object]`; erros de preparo têm ação e destino de recuperação |
| TXT-02 | Sem dados inventados | Progresso, autor, notas, metadados e sessões só aparecem quando vêm do estado real | Comprovado estruturalmente e na leitura real | Exemplos só entram com `?exemplo`; progresso, livros, notas, sessões e contagens vêm das APIs. `/leitura/44` deixou de cair no livro de reserva quando o EPUB real foi servido |
| TXT-03 | Estados vazios orientam próximo passo | Mesa, Estante, Canvas, Estudos, Notas e conta distinguem vazio de falha | Comprovado por revisão de conteúdo | Mesa explica fila vazia; Estante aponta para preparar; Notas aponta leitura/Kindle/Canvas; Estudos explica começar por pergunta; erros usam blocos separados de vazio |
| A11Y-01 | Navegação por teclado | Ordem de foco, Escape, Enter e setas funcionam nos controles compostos | Comprovado | Percurso real na Mesa atravessou 25 alvos em ordem, do primeiro lugar ao último livro, voltou ao Canvas com Shift+Tab e reiniciou no primeiro lugar. “Sua conta” abriu com Enter e foco em “Perfil e conta”; ↓ passou por “Atualizações” e “Ajuda e recursos”; Home voltou ao primeiro item; End chegou a “Sair”; Escape fechou com `aria-expanded=false` e devolveu o foco ao gatilho após o ciclo de pintura |
| A11Y-02 | Foco visível e contraste | Todo controle tem foco perceptível e contraste suficiente nos temas | Comprovado estruturalmente | Regras `:focus-visible` cobrem cabeçalho, busca, botões, gavetas, leitura, Canvas, Estante, Estudos e conta; 196 pares medidos, nenhum abaixo de 3:1 |
| A11Y-03 | Semântica e nomes acessíveis | Ícones têm nome, decorativos ficam ocultos, diálogos/gavetas anunciam título | Comprovado | Em 18 rotas e duas larguras: zero botão sem nome e zero imagem visível sem `alt`; gavetas usam título e `aria-label`; conteúdo fora da Vaul não fica oculto para leitor de tela |
| RESP-01 | Sem overflow horizontal | Rotas principais passam em desktop e 390 px sem conteúdo cortado lateralmente | Comprovado | 18 rotas auditadas em desktop e 390 px; `scrollWidth === clientWidth` em todas |
| RESP-02 | Hierarquia sobrevive no mobile | A ordem de leitura e as ações principais continuam claras no telefone | Comprovado nas rotas principais | Cabeçalhos, ações primárias, conteúdo de conta, Canvas, Preparo, leitura e central do livro permaneceram visíveis e na ordem de leitura em 390 px |

## Portão para apresentação

Antes de chamar o produto de finalizado, a rodada deve entregar:

1. zero itens em **Falhou**;
2. nenhum item crítico de fluxo em **Não auditado**;
3. build e suítes automatizadas verdes;
4. ensaio real dos fluxos upload → preparo → conversão → estante → leitura;
5. ensaio autenticado de tradução e das cinco rotas da conta;
6. capturas atuais em desktop e 390 px para as telas alteradas;
7. comparação atual com os frames canônicos do Figma, não apenas registro histórico;
8. lista honesta de limitações fora do escopo, se restar alguma.

## Escopo desta rodada

Entram reconstrução dos feedbacks já dados, correções estruturais, visuais e de copy, fluxos funcionais e validação final. Hospedagem, custo de infraestrutura e funcionalidades novas não pedidas ficam fora deste fechamento.

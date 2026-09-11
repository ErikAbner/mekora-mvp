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
| NAV-01 | Tema claro no primeiro acesso | Sem preferência salva, a primeira pintura e a interface carregada são claras | Não auditado | — |
| NAV-02 | Botões de ícone quadrados e centralizados | Ajuda, perfil, lupa e controles equivalentes têm largura=altura e padding ótico uniforme | Não auditado | — |
| NAV-03 | Cabeçalho não atrapalha a rolagem | Some ao rolar para baixo e retorna ao rolar para cima, sem salto de layout | Não auditado | — |
| NAV-04 | Rolagem suave | Âncoras e navegações internas usam rolagem suave; `prefers-reduced-motion` desliga o efeito | Implementado; falta provar | `base.css` possui regra global e exceção de movimento reduzido |
| NAV-05 | Perfil ativo com menu aberto | O botão de perfil mantém estado visual e `aria-expanded=true` enquanto o menu está aberto | Não auditado | — |
| NAV-06 | Menu da conta fiel ao componente | Dropdown alinha à caixa de ações, tem largura prevista no Figma e não corta itens | Não auditado | — |
| NAV-07 | Busca com fundo neutro/branco | Campo não ganha uma superfície colorida sem função | Não auditado | — |
| NAV-08 | Links e botões têm destino/ação real | Nenhum controle interativo visível fica sem ação, destino ou explicação de indisponibilidade | Não auditado | — |

## 2. Mesa e fluxo de entrada

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| MES-01 | Hero equilibrado e fiel ao Figma | Título, texto e ilustração formam a composição do frame, sem grande vazio/deslocamento ótico | Não auditado | — |
| MES-02 | “Nova nota” sem desalinhamento | Área da seta é quadrada, centralizada e não deforma a altura do botão | Não auditado | — |
| MES-03 | “Continue” leva primeiro à central do livro | A ação principal abre `/estante/:id`; “Notas” não substitui esse destino | Implementado; falta provar | `MesaCheia.jsx` aponta “Continuar” para `/estante/:id` |
| MES-04 | Leitura continua disponível com nome inequívoco | A ação secundária “Voltar à leitura” abre `/leitura/:id` | Implementado; falta provar | `MesaCheia.jsx` |
| MES-05 | Arquivo único não para na fila | Um upload único abre diretamente a configuração temporária daquele arquivo | Comprovado | Ensaio real anterior desta rodada: TXT abriu `/preparo/46?modo=guiado` |
| MES-06 | Lote continua visível na Mesa | Dois ou mais arquivos permanecem na fila com estado individual | Implementado; falta provar | `App.jsx`/`useJornada.js` alterados nesta rodada |
| MES-07 | Recuperar todos os erros | Havendo arquivos com erro, uma única ação tenta novamente todos eles e atualiza seus estados | Implementado; falta provar | `MesaCheia.jsx` alterado nesta rodada |
| MES-08 | Ícone de “Ver na estante” comunica navegação | Não usa símbolo de upload/envio | Implementado; falta provar | Ícone trocado nesta rodada |

## 3. Preparo e conversão

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| PRE-01 | Preparo é uma gaveta Vaul | A rota temporária aparece como folha sobre o chão, pode ser fechada e devolve à origem | Implementado; falta provar | `App.jsx` envolve `Preparo` em `GavetaDeSecao` |
| PRE-02 | Título e autor editáveis no modo guiado | Os dois campos aparecem e persistem antes de converter, em ambos os modos | Implementado; falta provar | `Preparo.jsx`/API alterados nesta rodada |
| PRE-03 | Tradução aparece quando aplicável | Livro em idioma estrangeiro oferece idioma de destino antes da conversão | Implementado; falta provar autenticado | `Preparo.jsx` consulta pares instalados |
| PRE-04 | Ausência de sessão não parece carregamento infinito | A área de tradução explica que é preciso entrar | Implementado; falta provar | Estado anônimo adicionado nesta rodada |
| PRE-05 | Erro `cancel_requested` eliminado | Conversão real termina sem `NameError`, inclusive após tentar novamente | Comprovado no caso simples | Conversão real do trabalho 46 gerou EPUB de 139 KB; suíte backend 932 aprovados, 1 ignorado |
| PRE-06 | Estado de erro preserva contexto | A folha mostra arquivo, causa, “Tentar de novo” e retorno à Mesa sem desmontar a interface | Implementado; falta provar visualmente | Precedência de estado corrigida nesta rodada |
| PRE-07 | Singular e plural corretos | “1 página”; demais valores no plural | Implementado; falta provar | Copy corrigida nesta rodada |
| PRE-08 | Cancelar é seguro e coerente | Cancelamento não deixa trabalho travado nem converte uma tentativa seguinte em erro | Não auditado | — |

## 4. Leitura e central do livro

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| LEI-01 | Leitura é uma gaveta Vaul | `/leitura/:id` abre uma folha Vaul sobre o chão e mantém a rolagem contínua | Implementado; falta provar visualmente | `GavetaDeLeitura.jsx` usa `Drawer.Root` e `Drawer.Content` |
| LEI-02 | Existe volta inequívoca | Fechar/arrastar e o controle de voltar levam a `/estante/:id` | Implementado; falta provar interação | `GavetaDeLeitura` e `Leitura` recebem `voltarPara=/estante/:id` |
| LEI-03 | “Continuar” abre a central do livro | Mesa/Estante usam `/estante/:id` como ação principal; leitura é uma ação nomeada separadamente | Implementado; falta provar | `MesaCheia.jsx` e `Estante.jsx` |
| LEI-04 | Progresso não se perde | Abrir, rolar, fechar e reabrir retorna ao ponto guardado sem salto indevido | Não auditado | — |
| LEI-05 | Notas/destaques funcionam | Selecionar texto, destacar, comentar, recolorir e apagar produz feedback e persiste | Não auditado | — |
| LEI-06 | Painéis abrem do lado do controle | Índice, aparência, busca, notas e marcador não abrem invertidos nem se sobrepõem de forma errada | Não auditado | — |
| LEI-07 | Layout responsivo | Desktop e 390 px não cortam texto, controles ou conteúdo do livro | Não auditado | — |

## 5. Estante e livros 3D

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| EST-01 | Clique funciona na capa inteira | Capa, lombada e área textual selecionam o livro; não existe zona morta | Não auditado | — |
| EST-02 | Títulos longos não quebram o grid | Corte visual em duas linhas, com nome completo acessível | Não auditado | — |
| EST-03 | Fallback de capa é consistente | Sem capa, usa componente oficial, não uma implementação ad hoc | Não auditado | — |
| EST-04 | Livro 3D usa lombada correta | Usa as lombadas criadas pelo usuário, título/autor abreviados quando necessário e cor principal da capa | Implementado; falta prova visual atual | Rodada “Lombadas reais na estante 3D”; teste automatizado aprovado anteriormente |
| EST-05 | Faces do 3D não mostram capa errada | Frente, lombada e topo pertencem ao mesmo livro e não trocam textura entre cartões | Não auditado | — |
| EST-06 | Detalhes não empurram a ação principal | Metadados ficam em “Ver detalhes do arquivo”; continuar permanece visível | Implementado; falta provar | `Estante.jsx` usa `<details>` |
| EST-07 | Envio ao Kindle só na central do livro | A Estante mostra estado, mas não oferece o envio fora do contexto | Implementado; falta provar | `Estante.jsx` |

## 6. Canvas

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| CAN-01 | Uma única busca contextual | No Canvas não aparece uma segunda pesquisa sobreposta; a busca do cabeçalho busca o contexto do Canvas | Não auditado | — |
| CAN-02 | Padding igual às outras seções | Conteúdo útil começa a 32 px no topo e nas laterais em desktop | Não auditado | — |
| CAN-03 | Pan, zoom e arrasto são previsíveis | Post-its, mídias e grupos movem sem o chão roubar o gesto | Não auditado | — |
| CAN-04 | Controles não se sobrepõem | Nova nota, menu, zoom e busca mantêm áreas de clique separadas | Não auditado | — |
| CAN-05 | Grupos preservam leitura visual | Sobreposição permitida não esconde controles nem torna pertencimento ambíguo | Não auditado | — |

## 7. Conta, configurações, ajuda e atualizações

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| CON-01 | Identidade correta | A conta mostra `eriks0403@gmail.com`, sem truncar ou quebrar em duas linhas no desktop | Não auditado | — |
| CON-02 | Menu e painel na mesma régua | Primeiro item da navegação alinha ao topo do primeiro bloco de conteúdo | Não auditado | — |
| CON-03 | Largura evita quebras inadmissíveis | E-mail e textos de botão permanecem em uma linha nas larguras desktop previstas | Não auditado | — |
| CON-04 | Padding/vertical trim não corta tinta | Descendentes, títulos e metadados não são cortados; espaçamento segue o frame | Não auditado | — |
| CON-05 | Ilustrações distintas e relevantes | Cada página usa arte adequada; não há repetição arbitrária | Não auditado | — |
| CON-06 | Ilustrações padronizadas | Base, escala e invasão negativa do painel são coerentes no conjunto | Não auditado | — |
| CON-07 | Segurança usa a bruxa das senhas | A arte “magic password” aparece sem bloco colorido atrás | **Falhou** | `ContaSeguranca.jsx` aponta para `ilustracao-conta-telefone.svg`; asset correto não está em `web/publico/icones` |
| CON-08 | Segurança centralizada, não esticada | Miolo e blocos seguem a largura e a composição do Figma | Não auditado | — |
| CON-09 | Sessões sem bugs de padding | Linhas, estado atual e ações não se sobrepõem nem raspam bordas | Não auditado | — |
| CON-10 | Ajuda é Vaul | Ajuda abre como folha sobre o chão pontilhado e fecha para o contexto anterior | Não auditado | — |
| CON-11 | Preferências usa largura do sistema | Conteúdo respeita 32 px laterais e não vira a única tela estreita | Não auditado | — |
| CON-12 | Kindle usa detalhe progressivo | Orientação longa fica em hotspot/“Ver detalhes”, dentro do grid | Não auditado | — |
| CON-13 | Atualizações fiel ao frame 895:11060 | Largura, coluna, hero, datas, etiquetas, cards e rodapé batem com o Figma em desktop e celular | Não auditado | — |

## 8. Conteúdo, acessibilidade e estados

| ID | Requisito | Critério de aceite | Estado | Evidência |
|---|---|---|---|---|
| TXT-01 | Copy crítica revisada | Ações dizem o destino/efeito; textos não contradizem o comportamento; erros explicam recuperação | Não auditado | — |
| TXT-02 | Sem dados inventados | Progresso, autor, notas, metadados e sessões só aparecem quando vêm do estado real | Não auditado | — |
| TXT-03 | Estados vazios orientam próximo passo | Mesa, Estante, Canvas, Estudos, Notas e conta distinguem vazio de falha | Não auditado | — |
| A11Y-01 | Navegação por teclado | Ordem de foco, Escape, Enter e setas funcionam nos controles compostos | Não auditado | — |
| A11Y-02 | Foco visível e contraste | Todo controle tem foco perceptível e contraste suficiente nos temas | Não auditado | — |
| A11Y-03 | Semântica e nomes acessíveis | Ícones têm nome, decorativos ficam ocultos, diálogos/gavetas anunciam título | Não auditado | — |
| RESP-01 | Sem overflow horizontal | Rotas principais passam em desktop e 390 px sem conteúdo cortado lateralmente | Não auditado | — |
| RESP-02 | Hierarquia sobrevive no mobile | A ordem de leitura e as ações principais continuam claras no telefone | Não auditado | — |

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

# Kindle Local — Relatório de testes de UX e funcionalidade

**Material:** `index.html` (arquivo único, 18 KB, sem dependências externas)
**Método:** execução real em Chromium headless (Playwright) nos viewports 1440×900, 768×1024 e 390×844, mais 720×450 (equivalente a zoom 200%) e 320×800 (reflow). Inspeção da árvore de acessibilidade do Chromium, cálculo de contraste WCAG, medição de alvos e verificação de foco por teclado real.
**Data:** 24/07/2026

### Convenções deste relatório

Cada afirmação está marcada:

- **[V] Verificado** — executado no navegador, com o valor observado registrado.
- **[C] Código** — lido no fonte, não exercitado em execução.
- **[H] Hipótese** — julgamento especialista sem participantes reais.
- **[R] Recomendação.**

**Não houve participantes humanos.** Nenhum número de compreensão, tempo de conclusão ou taxa de sucesso neste documento é medição — onde aparecem, são hipóteses rotuladas. **Nenhum leitor de tela real foi executado**: inspecionei a árvore de acessibilidade que o Chromium expõe, o que prevê mas não substitui NVDA/JAWS/VoiceOver.

---

## 1. Resumo executivo

O protótipo é coeso, bonito e cobre as sete telas prometidas; o esqueleto do fluxo está correto e nada é enviado sem uma tela de revisão e um clique explícito. Três problemas, porém, atacam o núcleo da proposta. Primeiro: **o agendamento não existe de fato** — escolher "Hoje, às 21h" não altera o botão, a estimativa ("pronto em ~3 minutos") nem a tela final ("Seu livro está a caminho"), e "Escolher data e hora" não abre seletor algum, confirmando um envio sem horário definido. Segundo: **os dois caminhos são o mesmo caminho** — "Preparar para mim" e "Configurar manualmente" diferem por exatamente um controle (o seletor de formato), embora o cartão manual prometa metadados e capa, que não existem em lugar nenhum, e venda 5 minutos contra 2. Terceiro: **a acessibilidade da troca de etapa está ausente** — o foco cai no `<body>` a cada avanço e nenhuma mudança de etapa ou erro de validação é anunciada. Somam-se a isso a perda dos botões "Editar" no mobile, um indicador que exibe "Etapa 6 de 6 · Revisão" na tela de envio e um progresso congelado em 68%. Pontos fortes reais: contraste aprovado, reflow até 320 px sem rolagem, estado preservado ao alternar caminhos, e a jornada final que separa corretamente converter, enviar e aparecer na biblioteca.

**Veredito: precisa de ajustes antes do teste moderado.**

---

## 2. Scorecard

Notas de 1 a 5, **julgamento especialista [H]**, não medição.

| Dimensão | Nota | Base |
|---|---|---|
| Compreensão | 3 | Telas legíveis e bem hierarquizadas, mas a distinção entre os dois caminhos é vendida com promessas que o produto não cumpre |
| Velocidade | 4 | Caminho recomendado: 6 cliques do início ao envio, tudo pré-preenchido [V] |
| Controle | 2 | O modo "avançado" oferece um único controle extra; agendamento não funciona; sem cancelamento |
| Confiança | 2 | Contradições visíveis entre o que foi escolhido e o que a tela afirma; ✓ verde de sucesso sobre um estado em andamento |
| Acessibilidade | 2 | Bases sólidas (contraste, foco visível, rádios nativos) anuladas pela ausência de gestão de foco e de anúncios |
| Recuperação de erros | 1 | Dois campos validados, nenhum caminho de erro de sistema, sem cancelar, sem desfazer, recarregar apaga tudo sem aviso |

---

## 3. Matriz de cobertura

**Leitura honesta desta matriz:** os fluxos foram executados mecanicamente uma vez por viewport. Os cinco perfis **não** são cinco execuções independentes — são camadas analíticas aplicadas sobre as mesmas execuções, avaliando o mesmo resultado sob restrições diferentes (só teclado, uma mão, pressa, etc.). O status abaixo é do fluxo sob a ótica daquele perfil.

Legenda: ✅ passou · ⚠️ passou com ressalvas · ❌ falhou · ∅ não testável

| Perfil | Cenário | Desktop 1440 | Tablet 768 | Mobile 390 |
|---|---|---|---|---|
| Iniciante cauteloso | A recomendado | ⚠️ | ⚠️ | ❌ |
| | B manual | ❌ | ❌ | ❌ |
| | C alternância | ❌ | ❌ | ❌ |
| | D erros | ❌ | ❌ | ❌ |
| Leitor frequente | A recomendado | ✅ | ✅ | ⚠️ |
| | B manual | ⚠️ | ⚠️ | ❌ |
| | C alternância | ⚠️ | ⚠️ | ⚠️ |
| | D erros | ⚠️ | ⚠️ | ⚠️ |
| Usuário avançado | A recomendado | ✅ | ✅ | ⚠️ |
| | B manual | ❌ | ❌ | ❌ |
| | C alternância | ❌ | ❌ | ❌ |
| | D erros | ❌ | ❌ | ❌ |
| Mobile com pressa | A recomendado | — | — | ⚠️ |
| | B manual | — | — | ❌ |
| | C alternância | — | — | ⚠️ |
| | D erros | — | — | ❌ |
| Acessibilidade | A–C (teclado) | ⚠️ | ⚠️ | ⚠️ |
| | E foco/anúncio | ❌ | ❌ | ❌ |
| | E contraste/reflow | ✅ | ✅ | ✅ |
| | E leitor de tela real | ∅ | ∅ | ∅ |

**Notas por perfil**

- **Iniciante cauteloso** falha em A no mobile porque o selo "Verificado" e a frase de privacidade do rodapé são ocultados justamente no dispositivo onde a ansiedade é maior [V].
- **Leitor frequente** é o único perfil bem servido: o caminho recomendado vem pré-selecionado e todos os campos pré-preenchidos.
- **Usuário avançado** falha em B porque metade do que o cartão manual promete não existe, e o formato que ele escolhe não aparece na revisão final [V].
- **Mobile com pressa** perde os quatro botões "Editar" na revisão [V] e não tem proteção contra recarregamento acidental [V].
- **Acessibilidade** passa nos critérios estáticos e falha nos dinâmicos.

---

## 4. Achados priorizados

| ID | Sev. | Etapa · Elemento | Evidência | Impacto | Recomendação | Critério de aceite |
|---|---|---|---|---|---|---|
| **KL-01** | **S0** | Etapa 5 (Revisão) e 6 · `#send`, `.estimate`, `[data-step="6"] h1` | [V] Com `input[name=schedule]="Hoje, às 21h"` marcado, o botão continua `"Converter e enviar para o Kindle →"`, `.estimate` continua `"◷ Pronto no Kindle em aproximadamente 3 minutos"` e a etapa 6 abre com `"Envio em andamento"` / `"Seu livro está a caminho"` / `#sendingTo = "Enviando para leitor_72@kindle.com"`, barra em 68% | O usuário agenda para as 21h e a interface afirma que o envio já começou e termina em 3 minutos. Ele não consegue saber o que foi de fato disparado. Risco direto de envio em momento incorreto | Ramificar a etapa 5 e a 6 pelo valor de `schedule`. Agendado: botão `"Agendar envio para hoje, às 21h"`, estimativa `"Será enviado hoje às 21h"`, tela 6 = estado "Agendado" com contagem e botão **Cancelar agendamento** | Com qualquer opção diferente de "Agora", o rótulo do botão, a estimativa e o `h1` da etapa 6 citam o horário escolhido e nenhum texto afirma envio em andamento |
| **KL-02** | **S0** | Etapa 4 · `input[name=schedule][value="Escolher data e hora"]` | [V] Selecionar essa opção não cria nenhum campo: `document.querySelectorAll('input[type=date],input[type=time],input[type=datetime-local]').length === 0`. O resumo exibe literalmente `#sumSchedule = "Escolher data e hora"` e o envio é confirmável | Confirmação de um envio sem horário definido. O resumo apresenta o rótulo de um controle como se fosse um valor | Ou implementar `<input type="datetime-local">` revelado ao selecionar, com validação de horário futuro e fuso explícito; ou remover a opção do protótipo | Selecionar a opção revela um campo de data/hora; horário passado bloqueia com mensagem; `#sumSchedule` exibe data, hora e fuso |
| **KL-03** | **S1** | Etapa 1 · `#recommended`, `#manual`; etapa 2 · `#formatField` | [V] Diferença total entre os modos: **um** `<select id="format">`. Etapas 2, 3, 4 e 5 exibem controles idênticos nos dois modos. `#manual` promete `"Metadados e capa"` — não existe nenhum campo de autor, capa ou metadado no documento [V]; `"Horário de envio"` e o idioma estão nos dois modos | A escolha central do produto é uma escolha falsa. Um usuário avançado que escolhe "manual" não ganha controle; um iniciante que escolhe "recomendado" não é poupado de nada. A estimativa "5 minutos" contra "2 minutos" desincentiva o caminho manual sem base | Ou dar substância ao manual (autor, série, capa, margens, destino alternativo, formato), ou reduzir o recomendado ao que ele promete: pular as etapas 2 e 3 com um resumo do que foi decidido e um link "Rever escolhas" | O cartão manual só lista capacidades que existem; o caminho recomendado tem menos telas ou menos campos que o manual; as estimativas de tempo derivam da contagem real de decisões |
| **KL-04** | **S1** | Etapa 1 · `#recommended` `<li>`; etapa 2 · `#modeLabel`; etapa 5 · `#sumTranslation` | [V] Cenário C: escolher "Traduzir para inglês", ir ao manual, voltar ao recomendado → `#recommended` continua listando `"Sem tradução"`, `#modeLabel` volta a `"NOSSA RECOMENDAÇÃO"` e o resumo mostra `"Traduzir para inglês"` sob esse rótulo. `#format` retém `"MOBI (legado)"` oculto [V] | A persistência de estado está correta (é um objetivo do produto), mas a copy do cartão vira uma afirmação falsa sobre o estado atual. O usuário pode enviar uma tradução acreditando ter preservado o original | Tornar o cartão reflexivo: quando houver divergência, exibir `"Você alterou: tradução para inglês"` e um botão `"Restaurar recomendações"`. Nunca listar como fato uma configuração que não está ativa | Alterar qualquer campo e voltar à etapa 1 faz o cartão recomendado exibir as escolhas atuais e um botão de restauração; o resumo nunca contradiz o rótulo do modo |
| **KL-05** | **S1** | Etapa 5 · `.summary` | [V] Cenário B: `#format = "AZW3"` selecionado; `"AZW3" in .summary.innerText === False`. O resumo tem quatro linhas: Livro, Idioma, Verificação, Destino — nenhuma cita formato. A linha "Livro" ainda diz `"EPUB · 248 páginas"` | Um parâmetro de conversão escolhido pelo usuário nunca é confirmado. O objetivo "nunca enviar sem confirmação explícita" é cumprido para o arquivo, não para a configuração | Adicionar linha "Formato" ao resumo sempre que o modo manual tiver sido usado, com botão Editar → etapa 2 | Escolher AZW3 ou MOBI faz o resumo exibir "Formato: AZW3" e a linha "Livro" deixa de afirmar EPUB |
| **KL-06** | **S1** | Etapa 4 · `#email` | [V] `validateEmail()` usa `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Aceita `leitor_72@gmail.com` e `a@b.c` sem qualquer aviso. Nenhuma menção a lista de remetentes autorizados em todo o documento | O caso "endereço Kindle que ainda não autorizou o remetente" — explicitamente pedido no roteiro — não tem tratamento. Enviar para um endereço não-Kindle falha silenciosamente na vida real | Avisar (sem bloquear) quando o domínio não for `@kindle.com`/`@free.kindle.com`; adicionar bloco fixo explicando a autorização do remetente, com link para a página da Amazon | Domínio fora da lista dispara aviso não-bloqueante; a etapa 4 explica a autorização do remetente antes do campo |
| **KL-07** | **S1** | Todas · `go()` | [V] Após qualquer avanço, `document.activeElement.tagName === "BODY"`. Única `aria-live` do documento está em `[data-step="6"]`. `#stepLabel` não está dentro de região live (`closest('[aria-live]') === false`). `role="progressbar"`: 0 ocorrências. `.progress` sem `aria-valuenow` | Usuário de teclado volta ao topo do documento a cada etapa e precisa tabular de novo. Usuário de leitor de tela não é informado de que a etapa mudou. WCAG 2.2 AA: 4.1.3 Mensagens de status, 2.4.3 Ordem do foco | Em `go()`, mover foco para o `<h1>`/`<h2>` da tela com `tabindex="-1"`; envolver `.progress` em `role="progressbar"` com `aria-valuenow`/`aria-valuemin`/`aria-valuemax`/`aria-valuetext`; anunciar a etapa em região `aria-live="polite"` | Avançar por teclado põe o foco no título da nova tela; a árvore de acessibilidade expõe progressbar com valor; a mudança de etapa é anunciada |
| **KL-08** | **S1** | Etapas 2 e 4 · `#titleError`, `#emailError` | [V] `role` dos dois: `(nenhum)`. `#title` e `#email` sem `aria-invalid` e sem `aria-describedby`. Nenhum ancestral com `aria-live`. O foco vai ao campo, mas a mensagem não é lida | Usuário de leitor de tela percebe que não avançou e não sabe por quê. WCAG 2.2 AA: 3.3.1 Identificação de erro, 3.3.3 Sugestão de erro | `role="alert"` no `<span class="error">`, `aria-invalid="true"` no campo e `aria-describedby` apontando para o erro; limpar tudo ao corrigir | Submeter vazio faz o leitor anunciar a mensagem sem intervenção; corrigir remove `aria-invalid` |
| **KL-09** | **S1** | Todas · ausência de History API e de `beforeunload` | [V] `history.length` permanece 2 durante todo o fluxo; `go_back()` a partir da etapa 5 leva a `about:blank` — sai do aplicativo. `pg.reload()` na etapa 5 retorna à etapa 0 e descarta o e-mail digitado. `window.onbeforeunload === false` | Toque acidental no Voltar do sistema (o gesto mais comum no mobile) destrói a sessão sem aviso. Contradiz frontalmente "Você pode mudar de caminho depois. Suas escolhas serão preservadas" | `history.pushState` por etapa + `popstate` mapeado para `go()`; persistir o estado em `sessionStorage`; `beforeunload` a partir da etapa 2 | Voltar do navegador retrocede uma etapa; recarregar restaura a etapa e os valores; fechar após a etapa 2 pede confirmação |
| **KL-10** | **S2** | Etapa 5 · `.summary button` (mobile) | [V] `@media(max-width:700px){.summary button{display:none}}` — os quatro "Editar" ficam `display:none`. Visíveis: 0 de 4. Resta `"← Voltar e editar"`, que chama `go(4)` | Na tela de decisão final, o mobile perde o atalho de correção. Editar o título exige três telas de retorno. Aparece quem tem mais pressa e menos precisão de toque | Substituir por linhas inteiras clicáveis (`<a>`/`<button>` envolvendo a linha) ou um ícone de lápis de 44×44 | No mobile, cada linha do resumo leva à sua etapa; nenhum caminho de edição é removido por viewport |
| **KL-11** | **S2** | Etapa 6 · `#stepLabel`, `#stepName` | [V] Na tela de envio: `"ETAPA 6 DE 6"` / `"REVISÃO"`, barra em 100%. Causa: `const shown = Math.min(n,5)` e `names[]` só tem 6 entradas para 7 telas | O indicador afirma que o usuário está na revisão quando já confirmou o envio. Contradiz o objetivo de "comunicar o estado atual" | Adicionar sétimo estado ("Envio") ou ocultar o indicador na etapa 6, substituindo-o pela jornada | A etapa 6 não exibe "Revisão"; o indicador nunca aponta uma etapa já concluída |
| **KL-12** | **S2** | Etapa 6 · `.success` | [V] Círculo verde com `✓` no topo de uma tela cujo próprio texto diz `"Envio em andamento"` e cuja jornada tem dois passos pendentes | Marca de conclusão sobre estado incompleto. O iniciante cauteloso conclui que acabou e fecha antes da hora | Trocar por indicador de progresso indeterminado ou pelo ícone de relógio já usado em `.estimate`; reservar o ✓ verde para o estado final | A tela 6 só exibe ✓ de sucesso quando os quatro passos da jornada estiverem concluídos |
| **KL-13** | **S2** | Etapa 6 · `.bar b`, `.journey .doing small` | [V] `.bar b{width:68%}` fixo no CSS. Após 3 s: largura `381.25px` inalterada, texto `"Otimizando fontes e imagens · 68%"` inalterado. Botões disponíveis na tela: apenas `["Preparar outro arquivo"]` — nenhum cancelar | Progresso falso. Combinado com o ✓ e com KL-01, a tela final é a menos confiável do fluxo. E a promessa "Você pode cancelar antes do horário" (etapa 4) não tem nenhum controle correspondente | Mesmo em protótipo, animar os quatro passos por temporizador para tornar o estado testável; adicionar "Cancelar envio" enquanto não concluído | A jornada avança visivelmente sem interação; existe cancelamento até o passo 3; a promessa de cancelamento da etapa 4 tem controle correspondente |
| **KL-14** | **S2** | Etapa 4 · `.privacy` vs. etapa 6 · `.lede` | [V] Etapa 4: `"O arquivo é processado localmente. Apenas o resultado final é enviado ao seu Kindle."` Etapa 6: `"Pode fechar esta página. Avisaremos quando ele aparecer no Kindle."` | As duas afirmações não podem ser verdadeiras juntas: se o processamento é local na página, fechá-la o interrompe; e nenhum canal de aviso (e-mail, notificação, conta) foi estabelecido em momento algum | Escolher um modelo e ser consistente. Se é local: `"Mantenha esta aba aberta até a conversão terminar"`. Se é servidor: corrigir a frase de privacidade da etapa 4 | Nenhuma tela promete aviso por um canal não configurado; a instrução sobre fechar a página é coerente com o local de processamento |
| **KL-15** | **S2** | Cabeçalho, etapas 0 e 3 | [V] 8 botões sem nenhuma ação: `"Salvar e sair"`, `"Trocar arquivo"`, `"Reportar problema"` e as 5 miniaturas `.page`. As miniaturas são `<button>` focáveis, com nomes acessíveis (`"A ILHA DO TESOURO 1. Capa ✓ Legível"`) e 166×281 px, e clicá-las não altera o DOM | "Salvar e sair" é perigoso: o cauteloso o procura exatamente quando quer proteger o progresso. As 5 miniaturas criam 5 paradas de tabulação que prometem ampliação e não entregam | Implementar a ampliação da página (é o valor real da etapa 3) e o "Salvar e sair"; até lá, converter miniaturas em `<figure>` não focáveis e desativar os botões mortos | Nenhum controle focável do fluxo é inerte; clicar numa miniatura abre a página ampliada |
| **KL-16** | **S2** | Etapa 5 · `#send` / `function send()` | [V] `typeof send === "function"` — a declaração de função sombreia `window.send` do `id`, então `send.disabled = true` grava a propriedade no objeto Function, não no botão. Confirmado: `#send.disabled === False` após o clique. A flag `sending` **funciona**: no duplo clique, `go()` foi chamado 1 vez [V] | Não há envio duplicado, mas também não há feedback: o botão continua ativo e clicável, num momento de alta ansiedade | Renomear a função (`submitJob()`) e alternar de fato `document.getElementById('send').disabled`, com rótulo `"Enviando…"` | Após o clique, o botão fica desabilitado, com rótulo de estado, e o `disabled` é observável no DOM |
| **KL-17** | **S2** | Etapa 2 · `fieldset` "Tradução" | [C] Para um arquivo detectado como português (etapa 0: `"Livro detectado · 248 páginas · Português"`), o grupo oferece `"Traduzir para português"` | Opção sem sentido para o arquivo em questão, ocupando espaço no grupo que define a fidelidade ao original. Ruído na decisão mais delicada da tela | Filtrar o idioma de origem da lista, ou converter em `<select>` "Traduzir para…" com a opção "Não traduzir" fora do grupo, como padrão explícito | O idioma detectado do arquivo não aparece como destino de tradução |
| **KL-18** | **S2** | Etapa 3 · `.pages` (mobile) | [V] No mobile: `scrollWidth 677` contra `clientWidth 356`, rolagem horizontal interna, sem indicador. Elementos `.page`/`.sheet` transbordam o viewport [V] | O usuário vê 2,8 páginas de 5 e não tem sinal de que há mais. A tela pede uma verificação que o layout esconde | Indicador de posição (pontos ou "3 de 5"), corte parcial do quinto cartão ou `scroll-snap` com setas | No mobile fica visível que existem 5 páginas e quantas faltam |
| **KL-19** | **S2** | Etapa 0 e rodapé (mobile) | [V] `.pill` ("Verificado") → `display: none`; `footer span` ("Seus arquivos permanecem privados") → `display: none`. O rodapé mobile fica só `"Kindle Local · Protótipo de experiência"` | Os dois sinais de segurança do início do fluxo desaparecem exatamente no dispositivo do perfil mais ansioso. A frase de privacidade só reaparece na etapa 4, tarde demais | Manter os dois no mobile: mover "Verificado" para baixo do nome do arquivo; transformar a linha de privacidade em faixa persistente | Nenhum sinal de segurança ou privacidade é removido por viewport |
| **KL-20** | **S2** | Etapa 2 · `#title` | [V] `maxlength="100"`: colar 300 caracteres resulta em 100 sem qualquer aviso. Emoji aceito (`"A ilha 🏴‍☠️🗺️ do tesouro «édição» —"` avança normalmente) mas consome 2 unidades UTF-16 por ponto de código | Truncamento silencioso de um campo que define como o livro aparecerá na biblioteca. Contradiz "Aparecerá assim na sua biblioteca" | Contador visível a partir de ~80 caracteres, aviso ao truncar e prévia do nome real na estante | Colar texto longo mostra contador e aviso; nenhum truncamento acontece sem feedback |
| **KL-21** | **S3** | Global · CSS | [V] `@media (prefers-reduced-motion)` ausente do CSS. Com `reduced_motion: "reduce"` no navegador: `.screen` mantém `animation-name: up`, `#track` mantém `transition-duration: 0.3s`. `window.scrollTo({behavior:"smooth"})` incondicional | Movimento involuntário para quem sinalizou preferência do sistema. Impacto real em vestibular e enxaqueca | `@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}` e `behavior: matchMedia(...).matches ? "auto" : "smooth"` | Com a preferência ativa, nenhuma animação de tela, transição de barra ou rolagem suave ocorre |
| **KL-22** | **S3** | Etapa 4 · `#email` | [V] `type="text"` (não `email`), `autocomplete` ausente. `inputmode="email"` só afeta o teclado virtual | Sem validação nativa, sem preenchimento automático. O mobile com pressa digita à mão um endereço longo | `type="email"` + `autocomplete="email"` | O campo aceita preenchimento automático e expõe validação nativa |
| **KL-23** | **S3** | Etapa 0 | [V] Hierarquia por tela: `H2, H1, H1, H1, H1, H1, H1` — a primeira tela usa `<h2>` sem `<h1>` acima | Documento abre sem cabeçalho de primeiro nível | Promover a `<h1>` | A tela inicial expõe um `h1` na árvore de acessibilidade |
| **KL-24** | **S3** | Global | [V] Tamanhos abaixo de 13 px: `.pill` e `.tag` 10 px, `.radio em` 10 px, `.meta` 11 px, `.eyebrow` 11 px, `footer` 11 px, `.error` 12 px | Não é falha de WCAG (o contraste passa), mas 10 px em maiúsculas com `letter-spacing` é onde ficam "Recomendado", "Verificado" e o indicador de etapa — informação que o produto quer que seja lida | Piso de 12 px para rótulos e 13 px para o indicador de etapa | Nenhum texto informativo abaixo de 12 px |
| **KL-25** | **S3** | Global · `.link`, `.summary button` | [V] Altura de 19 px, abaixo do mínimo de 24×24 de WCAG 2.2 SC 2.5.8: "Salvar e sair" 100×19, "Trocar arquivo" 116×19, "Reportar problema" 146×19, "← Voltar" 73×19, "Editar" 55×19. Não se aplica a exceção de alvo em linha — são botões isolados | Erros de toque em controles de reversão, no perfil que mais depende deles | `min-height: 44px` e padding vertical nos `.link` | Todo controle interativo tem ao menos 24×24 CSS px; alvos primários no mobile, 44×44 |
| **KL-26** | **S3** | Global · foco | [V] Nenhuma regra `:focus`/`:focus-visible` no CSS. O foco **é** visível — via `outline: auto 1px` padrão do Chromium, confirmado por tabulação real em todos os controles | Funciona hoje, mas o indicador varia entre navegadores e o `outline` escuro sobre o verde `#315d4d` do botão primário tem contraste baixo [H] | Token próprio: `:focus-visible{outline:3px solid #20201d;outline-offset:3px}` e variante clara sobre fundos escuros | Indicador de foco idêntico em Chrome, Firefox e Safari, com ≥3:1 contra o fundo adjacente |
| **KL-27** | **S3** | `resetFlow()` | [C] Restaura `title`, `email`, `translation`, `schedule` e o modo — não restaura `#format`, que permanece no valor anterior | Preparar outro arquivo herda silenciosamente um formato da sessão anterior | Adicionar `format.selectedIndex = 0` | Após "Preparar outro arquivo", todos os campos voltam ao padrão |

---

## 5. Resultados funcionais

### Passou [V]

| Teste | Observado |
|---|---|
| Fluxo recomendado completo, etapa 0 → 6 | 6 cliques, sem becos sem saída |
| Progressão do indicador nas etapas 0–5 | 16,7% → 100%, rótulos corretos ("Arquivo", "Caminho", "Detalhes", "Prévia", "Kindle", "Revisão") |
| Título vazio bloqueia | Erro exibido, permanece na etapa 2, foco devolvido a `#title` |
| Título só com espaços bloqueia | `trim()` aplicado corretamente |
| E-mail vazio, sem `@`, sem TLD, com espaço interno | Todos rejeitados, permanece na etapa 4 |
| E-mail com espaços nas bordas | Normalizado por `trim()`, avança e o resumo mostra o valor limpo |
| Duplo clique no botão final | `go()` chamado 1 vez — flag `sending` protege contra envio duplicado |
| Persistência ao alternar de caminho (cenário C) | Título e tradução preservados nas duas direções; o seletor de formato aparece/some corretamente |
| Contraste (WCAG 1.4.3 AA) | Todos os pares medidos passam: texto secundário 4,79:1 · selo 6,35:1 · eyebrow e links 7,17:1 · botão primário 7,49:1 · erro 6,22:1 · texto em cartão 5,0:1 |
| Reflow (WCAG 1.4.10 AA) | Sem rolagem horizontal de página em 1440, 768, 390, 720 (zoom 200%) e 320 px |
| Zoom 200% | Nada é ocultado nem sobreposto; os "Editar" continuam visíveis a 720 px |
| Estado selecionado não depende só de cor (1.4.1) | Cartão selecionado expõe `aria-pressed="true"`, `::after "✓"` e borda de 2 px contra 1 px |
| Rádios nativos | Setas ↑↓ percorrem o grupo, uma única parada de tabulação por grupo, rótulo inteiro clicável (650×67 px) |
| Foco visível | Presente em todos os controles via `outline: auto` do navegador (ver ressalva KL-26) |
| Avanço só por teclado | Tab + Enter avança as etapas normalmente (ver ressalva KL-07 sobre a perda de foco) |
| Idioma do documento | `lang="pt-BR"` |
| Jornada final diferencia as três fases | "Convertendo para Kindle" · "Enviando para \<e-mail\>" · "Disponível na biblioteca" |
| Próximo passo no dispositivo | Explícito: manter o Kindle no Wi-Fi e tocar em "Sincronizar" |
| Nenhum envio sem confirmação | Tela de revisão obrigatória antes do botão final, em ambos os caminhos |

### Falhou [V]

Agendamento sem efeito (KL-01) · "Escolher data e hora" sem seletor (KL-02) · modos quase idênticos com promessas não cumpridas (KL-03) · cartão recomendado contradiz o estado (KL-04) · formato ausente do resumo (KL-05) · domínio de e-mail não verificado (KL-06) · foco perdido e etapa não anunciada (KL-07) · erros sem `role="alert"` (KL-08) · Voltar do navegador sai do app e recarregar apaga tudo (KL-09) · "Editar" removidos no mobile (KL-10) · indicador errado na etapa 6 (KL-11) · progresso congelado e sem cancelar (KL-13) · botões inertes (KL-15) · `disabled` aplicado ao objeto errado (KL-16) · sem `prefers-reduced-motion` (KL-21) · alvos de 19 px (KL-25).

### Não testável ∅

| Item pedido | Por quê |
|---|---|
| Arquivo corrompido, com DRM, grande demais, formato incompatível | `input[type=file]`: 0 ocorrências. O arquivo é conteúdo estático no HTML; nenhum caminho de erro existe |
| Perda de conexão durante conversão ou envio | Não há requisição de rede nem camada assíncrona |
| Falha parcial após a conversão e antes do envio | Não há máquina de estados: `send()` apenas chama `go(6)` |
| Fechamento da página durante o processamento | Não há processamento real a interromper |
| Cancelamento e repetição do envio | Nenhum controle de cancelamento existe |
| Mudança de fuso horário | O horário é a string `"Hoje, às 21h"`; nenhuma data real é manipulada |
| Agendamento em horário passado | Sem entrada de data/hora, não há o que validar (ver KL-02) |
| Leitor de tela real (NVDA, JAWS, VoiceOver) | Inspecionei a árvore de acessibilidade do Chromium. Prevê o comportamento, não o substitui |
| Compreensão em 10 s, tempo de conclusão, confiança percebida | Sem participantes. Tratados como hipóteses na seção 7 |

---

## 6. Análise por etapa

**Etapa 0 — Arquivo.** A melhor tela do protótipo. A miniatura da capa, o tamanho, o formato, a contagem de páginas e o idioma detectado respondem antes da pergunta. "Nada será enviado sem sua confirmação" chega no momento certo. Falhas: "Trocar arquivo" é inerte [V], o selo "Verificado" some no mobile [V] e o título é `<h2>` [V]. **[H]** É onde o iniciante cauteloso decide continuar, e ela faz esse trabalho bem.

**Etapa 1 — Caminho.** Visualmente resolvida: dois cartões, um pré-selecionado, tempos estimados, ✓ e borda reforçada. O problema não é a tela, é o que está por trás dela (KL-03). **[H]** A tela é compreendida rápido; o que ela promete é que não se sustenta. A pré-seleção do recomendado é uma boa decisão — favorece o caminho seguro sem esconder o outro.

**Etapa 2 — Detalhes.** Dois campos, ou três no manual. O texto "O arquivo já está em português — opção mais fiel" é o melhor microtexto do protótipo: justifica a recomendação em vez de apenas rotulá-la. Ressalvas: "Traduzir para português" para um arquivo em português (KL-17), truncamento silencioso em 100 caracteres (KL-20) e erro não anunciado (KL-08). O rótulo `#modeLabel` muda entre "Nossa recomendação" e "Configuração manual" — bom sinal de contexto, prejudicado por KL-04.

**Etapa 3 — Prévia.** Conceito correto: verificar antes de enviar é exatamente o que reduz ansiedade. A execução esvazia o conceito — as cinco miniaturas são botões que não fazem nada [V], todas já marcadas "✓ Legível" antes de qualquer inspeção, e o aviso "Nenhum problema encontrado" antecipa a conclusão que se pede ao usuário. **[H] Risco de virar burocracia:** a tela pede uma verificação já respondida por ela mesma. No mobile piora — só 2,8 dos 5 cartões cabem, sem indicação (KL-18). O valor aparece se as miniaturas ampliarem e se "Reportar problema" existir.

**Etapa 4 — Kindle.** Estrutura correta (destino, depois momento, depois privacidade). É onde estão os dois S0. Também é a tela que mais promete sem cumprir: "Você pode cancelar antes do horário" não tem controle correspondente em lugar nenhum (KL-13). A frase de privacidade é boa e chega tarde — deveria estar na etapa 0.

**Etapa 5 — Revisão.** A tela mais importante para "nunca enviar sem confirmação", e ela quase acerta: quatro linhas com botão Editar para cada uma. Três problemas: o formato escolhido não aparece (KL-05), os Editar somem no mobile (KL-10) e a estimativa contradiz o agendamento (KL-01). O rótulo "Configuração preservada" sob o idioma é uma boa ideia executada de forma estranha — é estático e aparece mesmo quando nada foi alterado [C].

**Etapa 6 — Envio e acompanhamento.** A jornada de quatro passos é conceitualmente a melhor parte do protótipo: separa converter, enviar e aparecer na biblioteca, com estimativas por passo, e diz o que fazer no dispositivo. Está minada pelo ✓ de sucesso sobre estado em andamento (KL-12), pelo progresso congelado (KL-13), pelo indicador que insiste em "Revisão" (KL-11), pela contradição sobre fechar a página (KL-14) e pela ausência de cancelamento. O último passo, "Disponível na biblioteca", é o único sem estimativa de tempo — justamente o que o usuário quer saber.

---

## 7. Recomendado vs. manual

**Clareza [H].** A tela comunica bem *que* existem dois caminhos. Os cartões têm hierarquia clara, o recomendado está marcado e pré-selecionado, e há estimativa de tempo. **Hipótese:** a distinção é entendida em menos de 10 segundos — mas é entendida *errado*, porque o que se compreende não corresponde ao produto.

**Persistência [V].** Funciona corretamente nas duas direções. Título, tradução e formato sobrevivem à alternância; o seletor de formato aparece e desaparece conforme o modo; nada é redefinido silenciosamente. Este objetivo do produto está cumprido. A falha é de comunicação: o cartão recomendado continua listando "Sem tradução" enquanto o estado é outro (KL-04), e o formato escolhido no manual permanece retido e invisível ao voltar ao recomendado [V].

**Lacunas [V].** A diferença real entre os modos é um `<select>`. Consequências:

- O manual promete "Metadados e capa" — não há campo de autor, capa ou metadado em todo o documento.
- "Horário de envio" é listado como exclusivo do manual e está nos dois modos.
- "Idioma" é listado como exclusivo do manual e está nos dois modos.
- O recomendado promete "Você só revisa o essencial" e apresenta exatamente as mesmas telas e os mesmos campos, menos um.
- "Cerca de 2 minutos" vs. "cerca de 5 minutos" para uma diferença de um `<select>`.

**Sobre dark patterns.** Não encontrei falsa urgência, contagem regressiva, opção pré-marcada contra o interesse do usuário, nem consentimento obscurecido. O botão de envio é explícito, precedido de revisão, e "Não traduzir" é o padrão correto. Existe, porém, **certeza indevida em três lugares**: a diferença de tempo entre os caminhos [V], o "Nenhum problema encontrado" exibido antes de qualquer verificação do usuário [V], e o "68%" de um progresso que não mede nada [V]. Nenhum é manipulação deliberada; todos corroem a confiança se o usuário perceber (**[H]**, e é provável que o usuário avançado perceba na primeira sessão).

### Respostas diretas às perguntas de UX

| Pergunta | Resposta |
|---|---|
| A diferença entre recomendado e manual é compreendida em 10 s? | **[H] Sim, mas a compreensão é falsa** — os cartões são claros, o produto não corresponde a eles |
| A recomendação parece confiável e explica "por quê"? | **Parcialmente [V].** "O arquivo já está em português — opção mais fiel" explica de verdade. "Usamos escolhas seguras para este arquivo" não explica nada |
| O recomendado reduz decisões sem esconder consequências? | **Não [V].** Não reduz decisão alguma: mesmas telas, mesmos campos, menos um `<select>` |
| O usuário entende que pode voltar e editar sem perder progresso? | **A interface promete e cumpre — até tocar em Voltar do navegador [V]**, quando perde tudo sem aviso |
| A revisão das cinco páginas parece útil ou burocrática? | **[H] Burocrática hoje**: as miniaturas não ampliam e a tela já respondeu a própria pergunta |
| "Não traduzir" comunica preservação do original? | **Sim [V]** — "opção mais fiel" faz esse trabalho bem. É a melhor microcópia do protótipo |
| Destino, horário e irreversibilidade estão claros antes da confirmação? | **Destino sim; horário não [V] (KL-01, KL-02); irreversibilidade não** — nada diz que o envio não pode ser desfeito |
| A tela de progresso diferencia converter, enviar e aparecer na biblioteca? | **Sim [V]** — é o maior acerto do protótipo, comprometido pelo ✓ e pelo 68% congelado |
| O próximo passo no Kindle está explícito? | **Sim [V]** — Wi-Fi conectado e "Sincronizar" na biblioteca |
| Há dark pattern, falsa urgência ou certeza indevida? | **Sem dark pattern nem urgência falsa. Certeza indevida sim, em três pontos [V]** |

---

## 8. Acessibilidade — WCAG 2.2 AA

### Conformes [V]

| Critério | Resultado |
|---|---|
| 1.4.1 Uso da cor | Cartões expõem `aria-pressed` + `✓` + borda dupla |
| 1.4.3 Contraste mínimo | Todos os pares ≥ 4,79:1 |
| 1.4.10 Reflow | Sem rolagem horizontal de página até 320 px |
| 1.4.11 Contraste de não-texto | Bordas e botões acima de 3:1 |
| 2.1.1 Teclado | Todo o fluxo é operável por Tab/Enter/Espaço/setas |
| 2.1.2 Sem armadilha de teclado | Nenhuma armadilha; telas inativas são `display:none` e saem da ordem de foco |
| 2.4.7 Foco visível | Presente via padrão do navegador (ver KL-26) |
| 3.1.1 Idioma da página | `lang="pt-BR"` |
| 3.3.2 Rótulos e instruções | Campos rotulados por `<label>` envolvente, com texto de apoio |
| 4.1.2 Nome, função, valor | Botões e rádios com nome acessível correto na árvore |

### Não conformes

| Critério | Nível | Achado | ID |
|---|---|---|---|
| 4.1.3 Mensagens de status | AA | Mudança de etapa e erros não expostos como status. Única `aria-live` na etapa 6; sem `role="progressbar"`; sem `role="alert"` | KL-07, KL-08 |
| 3.3.1 Identificação de erro | A | Erros não associados aos campos: sem `aria-invalid`, sem `aria-describedby` | KL-08 |
| 2.4.3 Ordem do foco | A | Foco cai no `<body>` a cada avanço de etapa | KL-07 |
| 2.5.8 Tamanho do alvo (mínimo) | AA (2.2) | `.link` e `.summary button` com 19 px de altura; sem exceção de alvo em linha | KL-25 |
| 1.3.1 Informação e relações | A | `.progress` é um `div` com `aria-label`; a relação valor/máximo não é programaticamente determinável | KL-07 |
| 2.4.6 Cabeçalhos e rótulos | AA | Primeira tela sem `h1` | KL-23 |

### Ressalvas

- **2.3.3 Animação por interação** é AAA, não AA — a ausência de `prefers-reduced-motion` (KL-21) não reprova em AA, mas é a correção de acessibilidade mais barata da lista.
- **1.3.4 Orientação** e **1.3.5 Identificar propósito da entrada**: `#email` sem `autocomplete` (KL-22) enfraquece 1.3.5.
- **Não verificado com leitor de tela real.** As previsões de KL-07 e KL-08 derivam da árvore de acessibilidade do Chromium. A `aria-live="polite"` da etapa 6 é caso de comportamento notoriamente inconsistente entre leitores: a região passa de `display:none` a visível com o conteúdo já presente, e vários leitores não anunciam conteúdo pré-existente numa região que acabou de aparecer. **[H]** Provável que a tela final não seja anunciada. Verificar com NVDA + Firefox e VoiceOver + Safari antes de qualquer conclusão.

---

## 9. Recomendação de microcopy

### Comparações pedidas

| Atual | Alternativas | Avaliação [H] | Recomendação |
|---|---|---|---|
| **"Preparar para mim"** | "Fluxo recomendado" · "Configuração automática" | "Preparar para mim" é a melhor das três: linguagem humana, sujeito claro, sem jargão. "Fluxo recomendado" é vocabulário de processo interno. "Configuração automática" é a pior — sugere que nada será mostrado, e o produto mostra as mesmas cinco telas; o iniciante cauteloso lê "automático" como "perco o controle" | **Manter "Preparar para mim"**, condicionado a KL-03. Sem reduzir decisões de fato, qualquer rótulo é promessa vazia |
| **"Configurar manualmente"** | "Personalizar" | "Personalizar" reduz o custo percebido e evoca ganho; "manualmente" evoca trabalho e sugere que o outro caminho é o normal. Risco de "Personalizar": prometer estética/metadados que não existem | **"Escolher cada detalhe"** — nomeia o benefício (controle) sem prometer personalização visual e sem o peso de "manual" |
| **"Converter e enviar para o Kindle"** | "Confirmar envio" | "Converter e enviar" é melhor: nomeia as duas operações, deixa claro que algo será transformado e algo sairá do computador. "Confirmar envio" é mais curto e mais ambíguo — confirma o quê, para onde, quando? | **Manter, tornando condicional:** "Converter e enviar agora" quando imediato, "Converter e agendar para hoje, 21h" quando agendado (resolve KL-01) |
| **"Está tudo certo"** | "Aprovar prévia" | "Está tudo certo" soa a encerramento — **[H]** parte dos usuários lerá como o botão final e hesitará por achar que está enviando. "Aprovar prévia" é preciso mas burocrático, e "prévia" não é a palavra usada na tela (que diz "primeiras páginas") | **"Continuar"**, com o cabeçalho já perguntando "As primeiras páginas estão boas?". Um botão de avanço não precisa carregar a resposta; se houver "Reportar problema" ao lado, o par fica claro |

### Outras correções de texto

| Onde | Atual | Sugerido | Por quê |
|---|---|---|---|
| Etapa 1 · `#recommended p` | "Usamos escolhas seguras para este arquivo." | "Detectamos EPUB em português, 248 páginas. Mantemos o formato e o idioma originais." | "Escolhas seguras" pede confiança sem dar motivo; a versão específica *é* a explicação do "por quê" |
| Etapa 1 · `#manual li` | "Metadados e capa" | Remover até existir | Promessa não cumprida (KL-03) |
| Etapa 3 · `.notice strong` | "Nenhum problema encontrado" | "Verificação automática sem alertas — confira você também" | Não antecipa a conclusão que se pede ao usuário |
| Etapa 4 · `.privacy` | "O arquivo é processado localmente. Apenas o resultado final é enviado ao seu Kindle." | Mover para a etapa 0 e manter visível | O sinal de privacidade chega na quinta tela, depois de todas as decisões |
| Etapa 4 · opção agendada | "Você pode cancelar antes do horário." | Manter **e implementar o cancelamento** | Promessa sem controle correspondente (KL-13) |
| Etapa 5 · `.estimate` | "◷ Pronto no Kindle em aproximadamente 3 minutos" | "Você confirmará o envio no próximo passo. Depois disso, não é possível cancelar." | A irreversibilidade nunca é dita, e a estimativa mente no modo agendado (KL-01) |
| Etapa 6 · `.lede` | "Pode fechar esta página. Avisaremos quando ele aparecer no Kindle." | "Mantenha esta aba aberta até a conversão terminar. Você pode acompanhar por aqui." | Duas afirmações incompatíveis com a etapa 4 (KL-14) |
| Etapa 6 · passo 4 | "Disponível na biblioteca" sem estimativa | Acrescentar "~3 min" ou "após a sincronização" | É a informação que o usuário mais quer, e é a única sem prazo |
| Cabeçalho | "Salvar e sair" | Remover até existir | Botão inerte no lugar mais perigoso (KL-15) |

---

## 10. Backlog

### Quick wins — baixo custo, alto retorno

1. Ramificar os textos da etapa 5 e 6 pelo valor de `schedule` (KL-01) — **S0**
2. Remover ou implementar "Escolher data e hora" (KL-02) — **S0**
3. Adicionar a linha "Formato" ao resumo (KL-05)
4. Corrigir o indicador da etapa 6 (KL-11): estender `names[]` e ajustar `Math.min`
5. Trocar o ✓ verde por indicador de andamento (KL-12)
6. `role="alert"` + `aria-invalid` + `aria-describedby` nos dois erros (KL-08)
7. `@media (prefers-reduced-motion)` (KL-21)
8. `type="email"` + `autocomplete="email"` (KL-22)
9. Remover ou desativar os 8 botões inertes (KL-15)
10. `min-height: 44px` nos `.link` (KL-25)
11. Etapa 0 de `<h2>` para `<h1>` (KL-23)
12. Restaurar `#format` em `resetFlow()` (KL-27)

### Próxima iteração

13. Foco gerenciado em `go()` + `role="progressbar"` + anúncio de etapa (KL-07)
14. Linhas do resumo clicáveis no mobile (KL-10)
15. History API + `sessionStorage` + `beforeunload` (KL-09)
16. Progresso animado com cancelamento (KL-13)
17. Miniaturas ampliáveis e "Reportar problema" funcional (KL-15, etapa 3)
18. Indicador de rolagem na faixa de páginas do mobile (KL-18)
19. Manter selo e privacidade no mobile (KL-19)
20. Contador de caracteres no título (KL-20)
21. Filtrar o idioma de origem da lista de tradução (KL-17)
22. Reconciliar a mensagem de privacidade entre as etapas 4 e 6 (KL-14)

### Antes de produção

23. **Decidir o que os dois caminhos realmente são** (KL-03) — decisão de produto, não de implementação, e bloqueia a pergunta central da pesquisa
24. Cartão recomendado reflete o estado + "Restaurar recomendações" (KL-04)
25. Verificação de domínio Kindle e fluxo de remetente autorizado (KL-06)
26. Todos os caminhos de erro reais: DRM, corrompido, tamanho, formato, rede, falha parcial
27. Cancelar e reenviar
28. Fuso horário explícito e bloqueio de horário passado
29. Corrigir o sombreamento de `send` e desabilitar de fato o botão (KL-16)
30. Verificação com leitor de tela real em NVDA/Firefox e VoiceOver/Safari

---

## 11. Cinco experimentos de produto

Todos pressupõem as correções S0 aplicadas — testar o protótipo atual mediria os defeitos, não as hipóteses.

**E1 — O caminho recomendado precisa mesmo ser mais curto?**
*Hipótese:* se "Preparar para mim" realmente pular as etapas 2 e 3, exibindo um resumo do que foi decidido com um link "Rever escolhas", a conclusão do iniciante sobe sem queda de confiança.
*Variantes:* A = atual (mesmas telas) · B = recomendado com 2 telas + resumo expansível.
*Métrica principal:* taxa de conclusão até o envio, sem ajuda.
*Guardrail:* proporção que declara não saber o que foi decidido em seu nome (≤ 10%) e uso do "Rever escolhas" (se > 60%, o resumo está escondendo demais).
*Decisão:* adotar B se a conclusão subir ≥ 10 pontos sem violar o guardrail.

**E2 — Explicação específica vs. genérica na recomendação.**
*Hipótese:* substituir "Usamos escolhas seguras para este arquivo" por "Detectamos EPUB em português, 248 páginas. Mantemos formato e idioma originais" aumenta a confiança declarada e reduz a troca defensiva para o manual.
*Variantes:* A = genérica · B = específica derivada do arquivo.
*Métrica:* confiança autorrelatada na escolha do caminho (escala de 5 pontos, medida logo após a etapa 1).
*Guardrail:* tempo na etapa 1 não sobe mais de 5 s.
*Decisão:* adotar B se a confiança subir ≥ 0,5 ponto.

**E3 — A revisão das cinco páginas é útil ou teatro?**
*Hipótese:* a etapa 3 só reduz ansiedade se as miniaturas ampliarem; sem isso é uma tela de passagem.
*Variantes:* A = atual · B = miniaturas ampliáveis + "Reportar problema" funcional · C = etapa removida, com "Ver as primeiras páginas" opcional na revisão final.
*Métrica:* ansiedade antes de confirmar o envio (autorrelato) e taxa de ampliação em B.
*Guardrail:* taxa de conclusão não cai em nenhuma variante.
*Decisão:* se B não superar C em ansiedade e a ampliação ficar abaixo de 25%, adotar C e recuperar uma tela inteira.

**E4 — Rótulo do botão final quando há agendamento.**
*Hipótese:* "Converter e agendar para hoje, 21h" elimina a confusão sobre o que acabou de acontecer, comparado a um rótulo fixo.
*Variantes:* A = rótulo fixo · B = rótulo condicional ao agendamento.
*Métrica:* acerto na pergunta pós-tarefa "seu livro já foi enviado?".
*Guardrail:* nenhuma queda no uso do agendamento.
*Decisão:* adotar B se o acerto for ≥ 90% contra qualquer valor menor em A. **[H]** Espero um efeito grande; se A já acertar acima de 90%, meu diagnóstico de KL-01 está superestimado e o experimento merece ser reportado como tal.

**E5 — Momento da mensagem de privacidade.**
*Hipótese:* o iniciante cauteloso decide continuar ou desistir na etapa 0; mover "processado localmente" para lá reduz abandono precoce mais do que mantê-la na etapa 4.
*Variantes:* A = etapa 4 apenas · B = etapa 0 + persistente no rodapé, inclusive no mobile.
*Métrica:* abandono entre as etapas 0 e 1.
*Guardrail:* a menção não deve aumentar a preocupação declarada com privacidade — se B elevar a ansiedade, a mensagem está criando o problema que pretende resolver.
*Decisão:* adotar B se o abandono cair e a ansiedade não subir.

---

## 12. Veredito

### **Precisa de ajustes antes do teste moderado.**

Não é "não está pronto": o fluxo é navegável ponta a ponta nos três viewports, as sete telas existem, a arquitetura de informação está correta e há acertos reais — a jornada final que separa converter, enviar e aparecer na biblioteca; a persistência de estado; o contraste; o reflow; a explicação da opção "Não traduzir".

Também não é "pronto para teste moderado", por três razões:

1. **KL-01 e KL-02 contaminam qualquer sessão que toque em agendamento.** O participante não estaria reagindo a um desenho, mas a um defeito. Tudo o que ele dissesse sobre confiança, controle e clareza estaria medindo a falha.
2. **KL-03 invalida a pergunta central da pesquisa.** Não se pode investigar se a distinção entre recomendado e manual funciona quando os dois caminhos são o mesmo caminho menos um `<select>`. Isso é decisão de produto e precisa ser tomada antes, não descoberta em sessão.
3. **KL-07 e KL-08 impedem a sessão com o perfil de acessibilidade.** Sem gestão de foco e sem anúncio de etapa, a sessão registraria a ausência da fundação, não a qualidade do desenho.

**Menor conjunto de correções que destrava o teste moderado:** os itens 1 a 6 e 13 do backlog, mais uma decisão explícita sobre KL-03. Estimo isso como algumas horas de trabalho no protótipo, não uma reconstrução.

**O que já pode ser testado sem qualquer correção:** as etapas 0 a 3 no desktop, com o perfil iniciante cauteloso e o leitor frequente, focando na compreensão dos cartões de caminho e na percepção de utilidade da revisão de páginas — desde que a sessão termine na etapa 3 e não toque em agendamento.

---

## Segunda passagem — contradições internas

Reli o relatório procurando afirmações incompatíveis. Encontrei cinco e as resolvi assim:

1. **"Foco visível" aparece como aprovado (seção 5 e 8) e KL-26 registra um problema de foco.** Não é contradição, mas exigia precisão: o foco *é* visível hoje, via `outline: auto` padrão do Chromium, verificado por tabulação real. KL-26 é a fragilidade de depender do padrão do navegador, não a ausência do indicador. Rebaixei KL-26 a S3 e reformulei o texto para deixar isso explícito. **Correção aplicada.**

2. **"Duplo clique não causa envio duplicado" (aprovado) vs. KL-16 sobre o `disabled`.** Compatíveis, mas o texto original de KL-16 sugeria risco de duplicação. A flag `sending` protege de fato — verifiquei que `go()` foi chamado uma única vez. O defeito é só a ausência de feedback visual. Reescrevi KL-16 e mantive S2 pelo feedback, não pelo risco de duplicação. **Correção aplicada.**

3. **"Estado é preservado ao alternar de caminho" (aprovado, cenário C) vs. KL-04 como falha do cenário C.** A persistência funciona e é um objetivo cumprido; o defeito é a copy do cartão contradizer o estado preservado. A matriz de cobertura marcava C como ❌ para todos os perfis, o que era severo demais para o leitor frequente, cujo uso não expõe a contradição. Ajustei C para ⚠️ nesse perfil. **Correção aplicada.**

4. **"Nunca enviar sem confirmação explícita" aparece como cumprido (seções 5 e 6) e KL-05 diz que o formato não é confirmado.** Reformulei: o objetivo está **parcialmente** cumprido — o arquivo e o destino passam por confirmação explícita, um parâmetro de conversão não. **Correção aplicada.**

5. **"Contraste aprovado" (seção 5) vs. KL-24 sobre tipografia de 10–11 px.** Critérios distintos: 1.4.3 mede contraste e passa; tamanho de fonte não é critério WCAG em nível AA. Mantive os dois e explicitei que KL-24 é legibilidade, não conformidade. **Correção aplicada.**

Verifiquei também a consistência das severidades: dois S0, ambos na cadeia de agendamento e envio, que é onde a taxonomia do roteiro localiza o risco de "envio incorreto". KL-06 (domínio de e-mail) foi mantido em S1 e não S0 porque o protótipo não envia nada; em produção ele sobe para S0.

**Uma incerteza que não consegui resolver e que registro como tal:** não sei se a etapa 6 é anunciada por leitores de tela reais. A `aria-live="polite"` está presente, mas numa região que passa de `display:none` a visível com o conteúdo já dentro — comportamento tratado de forma inconsistente entre NVDA, JAWS e VoiceOver. Classifiquei como hipótese em KL-07 e na seção 8, e não a contabilizei nas não conformidades confirmadas.
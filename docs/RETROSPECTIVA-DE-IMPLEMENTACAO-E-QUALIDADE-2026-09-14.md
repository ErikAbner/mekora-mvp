# Mekora — retrospectiva de implementação, padrões e protocolo de qualidade

**Data de consolidação:** 14 de setembro de 2026
**Escopo:** interface web, jornadas de preparação, Mesa, Estante, Conta, Ajuda, Atualizações e Leitura
**Finalidade:** registrar o que foi alterado, o que o projeto ensinou, por que os erros anteriores aconteceram e qual processo deve impedir a repetição deles.

---

## 1. Por que este documento existe

Este documento não é uma lista promocional de entregas. É um registro operacional para quem continuar o Mekora e precisar responder quatro perguntas sem reconstruir meses de contexto:

1. Qual é a lógica visual e comportamental do produto?
2. Quais erros já aconteceram e qual era a causa real de cada um?
3. O que significa considerar uma alteração realmente pronta?
4. Como verificar a interface sem confundir “compilou” com “funciona” ou “parece próximo” com “corresponde ao projeto”?

O aprendizado central desta fase é simples: no Mekora, acabamento visual e correção funcional são o mesmo problema. Um índice que indica o capítulo errado, uma gaveta que abre no começo do livro ou um botão que muda de tamanho sem motivo são falhas de orientação. Não basta a tela estar presente; ela precisa preservar a relação espacial e semântica que explica ao usuário onde ele está e o que acontecerá a seguir.

---

## 2. Princípios do produto que ficaram claros

### 2.1 A estrutura vem antes da aparência

Copiar posições aparentes de um print não reproduz a interface. O resultado correto depende primeiro de identificar:

- o container que governa a seção;
- a largura útil do conteúdo;
- o respiro externo;
- o eixo de alinhamento;
- o comportamento quando a viewport muda;
- o que fica fixo, flutuante, rolável ou ancorado ao documento.

Quando essa estrutura está errada, ajustes locais de margem criam uma “mímica” que funciona numa única captura e se desfaz no restante da jornada.

### 2.2 A interface é editorial, mas não é estática

O Mekora usa tipografia, linhas, espaços e contraste como principais elementos de composição. Isso não significa que suas telas sejam pôsteres. A interface precisa reagir a arquivos reais, títulos longos, e-mails longos, quantidades variáveis, livros sem capa, EPUBs com estruturas diferentes e estados de erro.

### 2.3 A posição de leitura é semântica

Página visual não é uma coordenada estável em conteúdo fluido. Corpo, entrelinha, largura da coluna e idioma alteram a paginação. Por isso:

- progresso é guardado por capítulo e deslocamento de texto;
- o índice usa o destino real declarado pelo EPUB;
- destaques e notas usam intervalos de caracteres;
- marcadores são mostrados no bloco correspondente, não em uma posição absoluta da tela.

### 2.4 Uma ação temporária deve parecer temporária

Preparar ou traduzir um único arquivo é uma operação curta, não uma nova área permanente do sistema. Por isso as configurações de conversão funcionam como uma superfície contida, e não como uma página full width que rompe o contexto.

### 2.5 Ícone é linguagem, não decoração

Um ícone de envio não pode representar “ver na estante”. O óculos usado na contracapa de um livro específico não pode virar um ornamento genérico de todo livro. A bruxa das senhas não pode ser substituída por uma ilustração parecida só porque ocupa o mesmo retângulo.

---

## 3. O que foi feito ao longo das rodadas

### 3.1 Navegação, estrutura e consistência geral

- A navegação principal foi mantida como um sistema único entre Mesa, Estante, Canvas e Estudos.
- O padding do Canvas foi igualado ao das demais seções depois que o ganho da exceção se mostrou mínimo e a inconsistência, maior que o benefício.
- Containers foram ampliados onde e-mail e rótulos de botão quebravam em duas linhas.
- O alinhamento óptico do bloco “Continue” foi revisto; não basta centralizar matematicamente quando capa, título e ações têm pesos visuais diferentes.
- O hero da Mesa foi reestruturado para obedecer ao container da página, em vez de acumular compensações isoladas.
- Botões próximos e com o mesmo nível hierárquico passaram a compartilhar altura, distribuição interna e largura coerente.

### 3.2 Conta e Segurança

- A tela de Segurança voltou a usar a ilustração correta, a “bruxa das senhas”.
- A ilustração deixou de ser tratada como peça intercambiável.
- A composição foi centralizada e limitada por container, em vez de se esticar horizontalmente em telas largas.
- A coluna lateral ganhou largura suficiente para manter o e-mail íntegro e evitar quebra visual inadmissível.
- Ícones e rótulos da navegação lateral foram alinhados no mesmo eixo da ação de saída.
- A lista de sessões foi preparada para quantidades reais, preservando separadores e alvos de encerramento.

### 3.3 Entrada, análise e conversão de arquivos

- Um arquivo único segue diretamente para as configurações de conversão. O usuário não precisa rolar uma lista para então clicar em “Ver o que encontrei”.
- A conversão guiada também permite editar nome e autor; essa capacidade deixou de ser uma diferença artificial do modo personalizado.
- A tradução foi integrada à configuração temporária da conversão.
- A superfície de conversão foi contida como painel temporário, preservando contexto.
- A fila passou a oferecer nova tentativa para os arquivos com erro em conjunto.
- O acesso à Estante usa linguagem e iconografia de navegação/visualização, não de envio.
- O erro `cancel_requested is not defined` foi eliminado na origem, corrigindo o estado de cancelamento em vez de esconder a mensagem.
- Erros estruturados deixaram de aparecer como `[object Object]`; a interface normaliza o retorno e apresenta uma mensagem humana.
- O retorno à tela de tradução preserva o estado correto e não deve converter uma saída deliberada em falso erro.

### 3.4 Estante e visualização de livros

- A Estante 3D foi removida quando ficou claro que a construção disponível não entregava um livro tridimensional convincente. Manter uma aba tecnicamente chamativa e visualmente falsa criava uma feature sem função.
- A Estante permanece focada em capas e acesso aos livros.
- A imagem do óculos deixou de ser usada como padrão genérico. Ela pertence apenas ao material editorial do livro que a contém.

### 3.5 Detalhes do arquivo, Ajuda e Atualizações

- A página de detalhes teve ritmo vertical e padding revistos após o problema provocado por compensações de `vertical-trim`.
- Dados em pares passaram a respeitar alinhamento, medida e separação consistentes.
- A Ajuda foi reorganizada segundo a estrutura de navegação e conteúdo desenhada, reduzindo respostas que ocupavam espaço excessivo.
- Atualizações recuperou a relação planejada entre imagem, título, texto e tags; tags não podem competir em tamanho com o título.
- As correções nessas telas passaram a considerar a geometria dos containers, e não somente posições aparentes de uma captura.

### 3.6 Leitor — superfície e navegação

- A leitura ocupa a superfície disponível, preservando apenas 32 px de respiro lateral no desktop.
- Índice, marcadores, aparência e busca funcionam como superfícies flutuantes. Não pertencem ao topo do documento e não obrigam o usuário a voltar ao início do livro.
- O controle de retorno, índice, marcadores e aparência foi alinhado como conjunto.
- O índice recebeu corpo e padding menores para caber como ferramenta de navegação, não como página de apresentação.
- A seleção de texto oferece nota, cópia e cancelamento em botões de mesma altura e distribuição.
- Destacar, criar nota e copiar funcionam com seleção real no conteúdo.
- Um destaque existente é interativo por mouse e teclado e oferece:
  - editar a nota;
  - copiar o trecho;
  - remover o destaque.
- A opção “Ocultar destaques” esconde somente fundo e sublinhado. O texto permanece visível.
- Um marcador salvo é desenhado na margem do bloco correspondente, fornecendo feedback no corpo do livro.

### 3.7 Leitor — índice preciso

O índice antigo guardava somente o arquivo XHTML de destino. Isso era insuficiente: muitos EPUBs têm dezenas de itens do sumário apontando para o mesmo arquivo com fragmentos diferentes, por exemplo:

```text
index_split_001.html#page_52
```

Ao remover `#page_52`, todos esses itens se tornavam o mesmo destino. A correção foi:

1. preservar o fragmento como `ancora` ao ler o EPUB;
2. preservar IDs de blocos e de invólucros (`section`/`div`) ao extrair o XHTML;
3. associar a âncora do invólucro ao primeiro bloco real que ele produz;
4. navegar até a âncora exata;
5. calcular “Você está aqui” comparando a posição atual com os destinos do índice dentro do capítulo;
6. manter fallback por capítulo e deslocamento para arquivos que não declaram âncoras úteis.

Assim, dois itens que vivem no mesmo XHTML voltam a ser destinos diferentes.

### 3.8 Leitor — imagens fragmentadas

Alguns EPUBs gerados de PDF não guardam apenas figuras autônomas. Eles recortam a página em fatias e dependem do CSS editorial para remontá-la. Como o Mekora extrai o conteúdo e descarta esse CSS, uma fatia de `17 × 2174 px` ou `145 × 2560 px` aparecia como uma barra vertical gigantesca.

A investigação do arquivo real mostrou 298 imagens e pares claros entre:

- fatias estreitas de reconstrução;
- imagens completas da página ou da figura.

A regra adotada considera fragmento uma imagem com largura nativa de até 200 px e proporção vertical igual ou superior a 8:1. Ela:

- remove as tiras observadas no arquivo real;
- preserva páginas completas em retrato;
- preserva imagens panorâmicas e figuras convencionais;
- só é aplicada após `naturalWidth` e `naturalHeight` estarem disponíveis;
- está isolada em módulo puro e é testada pela mesma função usada em produção.

As regras anteriores de largura continuam válidas:

- imagem larga: no mínimo 900 px e proporção horizontal de pelo menos 1,4;
- imagem cheia: no mínimo 1600 px e proporção horizontal de pelo menos 2,2;
- nenhuma imagem é ampliada além da própria largura nativa.

### 3.9 Carrosséis da Mesa

O comportamento esperado não é trocar páginas de cartões nem recortar a faixa dentro do container editorial. É deslocar uma sequência contínua pelo espaço da tela.

A solução mantém duas geometrias diferentes:

- título e momento (“Ficaram prontos”, “Agora há pouco”) continuam alinhados ao container de conteúdo;
- o trilho de capas ocupa a largura da viewport.

No estado inicial, a primeira capa começa no alinhamento editorial. Durante a navegação, o conteúdo pode atravessar esse limite e chegar às bordas da tela, como uma esteira. O trilho oferece:

- arraste contínuo com mouse ou toque;
- prevenção de clique acidental depois de um arraste;
- setas esquerda/direita pelo teclado;
- cartões que não encolhem para “caber”;
- movimento por mola depois da soltura, com velocidade filtrada, projeção curta e desaceleração contínua;
- nenhuma regra de snap: uma posição entre capas é válida e não sofre correção brusca depois do gesto;
- barra de rolagem visualmente oculta, mantendo a rolagem funcional.

### 3.10 Nota, Kindle e organização do Kanban

- O cartão de nota passou a viver dentro da mesma superfície interativa da gaveta. Antes, o portal era desenhado visualmente sobre a tela, mas ficava fora do escopo de foco controlado pelo Vaul; o resultado era um campo aparentemente habilitado que não recebia digitação. A correção foi estrutural, não um `z-index` ou um clique forçado.
- O campo de nota ganhou rótulo visível, área de escrita maior, borda de controle, contraste de fundo, foco perceptível, texto de apoio e envio por formulário. `Ctrl/⌘ + Enter` continua salvando e `Esc` continua fechando.
- A importação de `My Clippings.txt` agora aparece também em **Dispositivos Kindle**, ao lado do fluxo de envio. A entrada já existente em Notas foi preservada; ambas reutilizam o mesmo componente e o mesmo contrato, evitando duas implementações divergentes.
- No Kanban, ações textuais repetidas de subir, descer e mover entre colunas foram removidas dos cartões. O arraste continua como interação primária; com foco no cartão, setas para cima/baixo reordenam e setas esquerda/direita mudam de coluna. A ação excepcional de concluir a leitura continua explícita porque altera o progresso do livro, não apenas sua organização.
- Regra aprendida: uma camada visualmente acima não está necessariamente dentro do escopo de interação correto. Modais e popovers precisam ser testados por foco real e digitação, não apenas por presença no DOM ou aparência na captura.
- Regra aprendida: descoberta deve acompanhar o modelo mental do objeto. Se o Kindle recebe livros e devolve notas, as duas direções precisam ser encontráveis na área do Kindle, mesmo que exista um segundo atalho contextual em Notas.

### 3.11 Microinteração do carrossel, ações do Canvas e acesso às notas

- A primeira versão contínua do carrossel ainda dependia do `scroll-behavior: smooth` e de `scroll-snap-type`. Ela não cortava mais o trilho no container, mas a soltura continuava parecendo uma correção mecânica: o navegador escolhia a curva e ainda puxava o conteúdo para o cartão mais próximo.
- A segunda versão trata o gesto como uma sequência legível: o conteúdo acompanha o ponteiro sem atraso; a velocidade recente é filtrada para não reagir a ruído; ao soltar, uma projeção curta conserva o embalo; uma mola criticamente amortecida aproxima a faixa do repouso. Os parâmetros têm nomes e ficam juntos em `MOVIMENTO_DA_FAIXA`, seguindo a disciplina de movimento do Interface Craft.
- O movimento não escolhe um “slide”. O destino é uma coordenada contínua, limitada apenas pelo começo e pelo fim do trilho. Em `prefers-reduced-motion`, a passagem animada é removida e o destino é aplicado imediatamente.
- A doca do Canvas escondia **Livro** e **Mídia** atrás de uma seta pequena anexada a **Nova nota**. A economia espacial era irrelevante perto do custo de descoberta e do alvo desalinhado. As três ações agora ficam sempre visíveis, com alvo de 48 px, ícones de 24 px, rótulos e alinhamento comuns.
- A barra de seleção repetia o mesmo problema em “Mais ações”: operações centrais só apareciam depois de abrir outro menu. Abrir, ligar, editar, criar seção, duplicar, organizar, ajustar, dissolver, retirar e enquadrar agora pertencem à mesma barra contextual. Quando não couberem, a faixa de ações rola horizontalmente; contagem e fechar permanecem fixos.
- Os ícones foram retirados da barra contextual porque apareciam apenas em parte das ações e criavam pesos visuais diferentes para verbos do mesmo nível. A doca de criação conserva ícones porque ali eles ajudam a diferenciar tipos de objeto, todos na mesma medida.
- As notas dentro de Estudos deixaram de ser apenas exposição. Cada nota agora leva à sua página; quando há livro, mantém o atalho de leitura; e pode ser apagada tanto dentro de um estudo quanto nos recortes **Todas as notas**, **Por pergunta** e **Fora de estudo**. A exclusão recarrega estudos porque livros e contagens são derivados das notas no servidor.
- O reaparecimento do Chrome de prova foi ligado ao ciclo de vida da bancada visual. O `finally` encerrava o processo em conclusões normais, mas não era executado quando um timeout enviava `SIGTERM`. O medidor agora intercepta saída, interrupção e término e encerra somente a instância que ele próprio criou com perfil temporário `medir-*`; o Chrome pessoal não é alvo.
- Regra aprendida: “suave” não é sinônimo de aplicar `smooth`. A qualidade do movimento depende da relação entre gesto, velocidade, destino e repouso, e precisa ser observada durante a transição.
- Regra aprendida: menus são adequados para exceções, não para esconder o vocabulário principal de uma ferramenta. Se a pessoa precisa usar a ação para compreender o produto, ela deve poder vê-la antes de clicar.

---

## 4. Erros importantes, causas e prevenção

| Sintoma | Causa real | Correção | Como evitar repetição |
|---|---|---|---|
| Tela próxima do print, mas desbalanceada | posições copiadas sem reconstruir containers | definir primeiro largura, eixo e respiro | medir estrutura antes de ajustar margens locais |
| Segurança com personagem errado | asset tratado como substituível | restaurar a bruxa das senhas | mapear asset por papel semântico, não por dimensão |
| E-mail e botão em duas linhas | container menor que o conteúdo real | ampliar coluna e impedir compressão indevida | testar textos reais e compridos |
| `cancel_requested is not defined` | variável usada fora do estado/escopo correto | corrigir contrato de cancelamento | executar o caminho real de falha e retry |
| `[object Object]` na tela | objeto convertido implicitamente em string | normalizar mensagens de erro | testar erros como string, objeto, resposta HTTP e exceção |
| Um arquivo exige rolagem até a fila | lote e unidade compartilhavam a mesma navegação | levar unidade direto à configuração | desenhar happy path por quantidade de itens |
| Guiado e personalizado quase iguais | distinção baseada em formulário, não em intenção | disponibilizar metadados no guiado | cada modo precisa de promessa funcional explícita |
| Estante 3D plana/falsa | presença de WebGL confundida com qualidade tridimensional | remover a feature | manter somente experiências cujo resultado visual cumpra a promessa |
| Gaveta do leitor abre no início | controles posicionados no fluxo do documento | portal/superfície flutuante | testar depois de rolar até metade do livro |
| Índice aponta para lugar errado | fragmento `#id` descartado | preservar âncora do EPUB ao DOM | testar dois itens do TOC no mesmo XHTML |
| “Você está aqui” impreciso | estado por capítulo, não pela posição visível | comparar viewport/deslocamento com destinos do TOC | provar seção anterior, atual e seguinte |
| Imagem vira barra vertical | fatia de reconstrução de PDF tratada como figura | filtrar fragmentos por dimensão/proporção | inspecionar dimensões nativas do arquivo real |
| Ocultar destaque esconde o texto | `opacity: 0` aplicado ao `<mark>` inteiro | tornar só fundo e decoração transparentes | conferir `color`, `background` e `text-decoration` computados |
| Destaque não pode ser removido | marca renderizada como saída, não como objeto interativo | menu contextual no próprio `<mark>` | testar mouse, Enter e Espaço |
| Marcador existe só no painel | persistência sem representação no texto | fita visual na margem do bloco | validar ação, persistência e feedback no corpo |
| Botões parecem de sistemas diferentes | padding e conteúdo determinavam alturas isoladamente | grade de ações com altura mínima comum | comparar botões irmãos, não cada botão sozinho |
| Carrossel “corta” no container | overflow e padding pertenciam ao container editorial | trilho na viewport, cabeçalho no container | testar início, meio, fim, arraste e teclado |
| Ícone de envio significa visualizar | escolha por semelhança gráfica | escolher ícone pela consequência da ação | nomear a ação antes de procurar o ícone |
| Carrossel ainda parece duro | `smooth` e snap delegavam a coreografia ao navegador | inércia curta e mola com destino contínuo | avaliar velocidade e repouso, não só posição inicial/final |
| Canvas exige abrir menus para ações básicas | compactação tratada como prioridade maior que descoberta | três criações e ações contextuais expostas | menu somente para exceções reais |
| Nota aparece em Estudos mas não abre | cartão tratado como relatório estático | link para a nota e para o livro | todo resumo de objeto precisa de porta para o objeto |
| Chrome de prova reaparece | processo filho sobrevive ao timeout do medidor | limpeza em `exit`, `SIGINT`, `SIGTERM` e `finally` | teste automatizado também precisa de ciclo de vida testável |

---

## 5. O que funcionou bem

### 5.1 Usar arquivos reais como evidência

O diagnóstico das imagens só ficou confiável quando o EPUB real foi aberto e suas dimensões foram enumeradas. Uma captura permitia afirmar que algo estava errado; o arquivo permitiu explicar por quê e escrever uma regra que preserva o restante.

### 5.2 Transformar decisões visuais em contratos

Largura de imagem, progresso, extração de texto, gavetas e navegação por teclado têm provas automatizadas. O ganho não é quantidade de testes: é tornar explícito o que não pode mudar por acidente.

### 5.3 Validar estados computados no navegador

Para “Ocultar destaques”, olhar a captura não era suficiente. A validação examinou estilo computado: fundo transparente, decoração transparente e texto ainda na cor da prosa.

### 5.4 Verificar o comportamento, não só a aparência inicial

As validações úteis ocorreram depois de:

- rolar o livro;
- abrir a gaveta na metade da leitura;
- saltar pelo índice;
- reabrir o índice e conferir o item atual;
- selecionar um destaque existente;
- alternar aparência;
- arrastar a faixa de capas.

### 5.5 Remover uma feature quando a promessa não se sustenta

Retirar a Estante 3D foi uma decisão de qualidade, não uma desistência. Uma tela sem função e sem acabamento prejudica mais a apresentação que sua ausência.

---

## 6. O que não funcionou e por quê

### 6.1 Declarar conclusão cedo demais

Compilar e passar testes de unidade não prova uma jornada. Vários erros persistiram porque a confirmação veio antes de repetir a ação descrita pelo usuário em estado real.

**Regra nova:** não afirmar que uma rodada terminou sem matriz de requisito, evidência e estado.

### 6.2 Corrigir o sintoma da captura

Mover um bloco alguns pixels pode fazer um print parecer melhor e piorar outras larguras. O problema recorrente era estrutural: container, eixo, fluxo ou hierarquia.

**Regra nova:** toda correção visual deve indicar qual regra de layout passou a governar o elemento.

### 6.3 Usar fallback como produto final

Fallback é necessário para arquivo incompleto, mas não pode esconder falha no caminho principal. Ilustrações genéricas, destinos por capítulo e mensagens vagas deram a impressão de completude enquanto informação real era descartada.

**Regra nova:** primeiro preservar o dado de origem; fallback só entra quando esse dado realmente não existe.

### 6.4 Testar apenas o estado inicial

Leitor, tradução, seleção e carrossel são sistemas de estado. Uma captura do primeiro frame não revela persistência, reentrada, foco, scroll ou erro tardio.

**Regra nova:** todo componente de estado precisa ser testado em entrada, alteração, saída e retorno.

### 6.5 Repetir regras dentro dos testes

Um teste que copia a implementação pode passar mesmo quando produção e contrato divergem.

**Regra nova:** funções puras relevantes devem viver em módulos importáveis tanto pelo componente quanto pela prova.

---

## 7. Protocolo de verificação para as próximas rodadas

### 7.1 Antes de alterar

1. Converter cada observação em requisito verificável.
2. Separar comportamento, estrutura, aparência e conteúdo.
3. Localizar o dado de origem: Figma, EPUB, API, estado local ou asset.
4. Identificar o container e o sistema de coordenadas responsável.
5. Registrar ambiguidades reais; não inventar decisões silenciosas.

### 7.2 Durante a implementação

1. Corrigir a causa no nível mais baixo que ainda representa o problema.
2. Preservar semântica e acessibilidade.
3. Evitar medidas mágicas sem comentário ou vínculo com grid.
4. Reutilizar componentes para ações de mesmo papel.
5. Isolar regras puras e testá-las diretamente.
6. Não substituir assets específicos por equivalentes genéricos.

### 7.3 Verificação funcional

- caminho feliz com dado real;
- estado vazio;
- título/e-mail longo;
- erro retornado como string e como objeto;
- retry;
- saída e retorno;
- persistência após recarregar;
- clique, teclado e foco;
- scroll profundo antes de abrir controles flutuantes;
- mais de um destino dentro do mesmo capítulo;
- imagem completa, panorâmica, pequena e fragmentada.

### 7.4 Verificação visual

- viewport larga e estreita;
- alinhamento do primeiro e último elemento;
- ritmo vertical entre seções;
- largura real do conteúdo, sem contar padding duas vezes;
- altura e linha de base de botões irmãos;
- texto sem quebra acidental;
- contraste em estado normal, selecionado, desabilitado e destacado;
- nenhuma tag, legenda ou controle competindo com o título principal;
- movimento observado durante a interação, não apenas antes e depois.

### 7.5 Portão de conclusão

Uma alteração só pode ser chamada de concluída quando cada requisito tiver:

| Campo | Pergunta |
|---|---|
| Implementação | a causa foi corrigida ou apenas mascarada? |
| Prova automática | existe teste proporcional ao risco? |
| Prova no navegador | o fluxo real foi repetido? |
| Prova visual | foi visto nas larguras relevantes? |
| Acessibilidade | teclado, foco, rótulo e contraste continuam válidos? |
| Regressão | caminhos vizinhos foram exercitados? |
| Limitação | algo ainda depende do arquivo ou do navegador? |

Se um campo não tiver evidência, o estado correto é **pendente de verificação**, não “pronto”.

---

## 8. Evidências específicas da rodada de 14/09

- O livro real analisado contém 298 imagens.
- Foram observadas fatias como `17 × 2174`, `17 × 1046`, `145 × 2560` e `146 × 2569`.
- Também existem imagens completas relacionadas, como `1875 × 1046` e `2162 × 2560`.
- No leitor, 26 fragmentos do recorte carregado foram ocultados e 92 imagens legítimas permaneceram visíveis.
- O destaque oculto manteve a cor de texto da prosa, com fundo e sublinhado transparentes.
- Um destaque existente abriu ações de editar nota, copiar e remover usando teclado.
- O índice marcou exatamente um item como atual.
- O destino `index_split_001.html#page_52` foi preservado e levou ao princípio 20.
- Ao reabrir o índice, “20 Take extra care of seniors” apareceu como “Você está aqui”.
- O trilho da Mesa ocupou a viewport inteira e alterou `scrollLeft` continuamente durante o arraste, preservando o cabeçalho no grid editorial.
- A construção de produção transformou 228 módulos e terminou sem erro; permanece apenas o aviso conhecido de chunk principal acima de 500 kB.
- A suíte completa do servidor terminou com **936 testes aprovados, 1 ignorado e nenhuma falha**.
- Os contratos de imagem, progresso e texto e as quatro provas unitárias do leitor/componentes terminaram sem falha.
- O verificador de CSS confirmou que nenhuma classe foi definida em dois arquivos e que nenhuma classe global nova invadiu o produto.

---

## 9. Mapa dos arquivos centrais desta fase

| Arquivo | Responsabilidade |
|---|---|
| `web/src/jornadas/Leitura.jsx` | composição do leitor, seleção, gavetas, índice, marcador e navegação |
| `web/src/jornadas/leitura.css` | superfície de leitura, paleta, destaques, marcador e responsividade |
| `web/src/leitor/epub.js` | leitura do pacote e preservação de destinos do sumário |
| `web/src/leitor/texto.js` | extração semântica de XHTML e preservação de IDs |
| `web/src/leitor/onde-parei.js` | posição semântica no livro |
| `web/src/leitor/aparencia.js` | preferências de leitura e visibilidade dos destaques |
| `web/src/leitor/imagem.js` | classificação de largura e fragmentos de imagem |
| `web/src/jornadas/MesaCheia.jsx` | interação contínua das faixas de capas |
| `web/src/jornadas/mesa-cheia.css` | relação entre container editorial e trilho na viewport |
| `web/src/jornadas/Canvas.jsx` | doca explícita e ações contextuais sem submenu |
| `web/src/jornadas/canvas.css` | régua de alvos, ícones e overflow das ações do Canvas |
| `web/src/jornadas/Estudos.jsx` | abertura, retorno à leitura e exclusão de notas nos recortes |
| `scripts/medir.mjs` | navegador de prova isolado e limpeza garantida ao interromper |
| `contrato/largura-imagem.teste.mjs` | contrato de dimensões, ampliação e fragmentos |
| `contrato/progresso.teste.mjs` | invariantes de progresso |
| `contrato/texto.teste.mjs` | regras da busca e normalização de texto |

---

## 10. Limitações conhecidas e dívida honesta

- A regra de fragmentos foi derivada e validada no arquivo real que revelou o problema. Outros conversores podem produzir mosaicos com geometria diferente; novos casos devem ampliar o contrato, não adicionar exceções silenciosas no componente.
- A precisão máxima do índice depende de o EPUB declarar fragmentos úteis. Quando ele não declara, o leitor mantém fallback por capítulo.
- O bundle principal ainda merece divisão para reduzir o aviso de tamanho emitido pela construção. Isso é desempenho e manutenção, não bloqueio funcional desta rodada.
- A remoção da Estante 3D é deliberada. Ela só deve voltar com protótipo que prove profundidade, interação e utilidade antes de integrar à navegação.
- O Project OS deve receber o resultado desta fase como registro de qualidade; o arquivo legado `para-o-project-os.md` continua contendo pendências históricas anteriores e não deve ser reescrito como se fossem desta rodada.

---

## 11. Checklist de apresentação para avaliação de UX

- [ ] A Mesa explica o estado dos arquivos sem exigir interpretação de status técnico.
- [ ] Um arquivo único abre configuração imediatamente.
- [ ] Conversão, tradução, retry e retorno produzem feedback correto.
- [ ] Segurança usa personagem, layout e hierarquia corretos.
- [ ] Nenhum e-mail ou ação importante quebra linha por container estreito.
- [ ] Ajuda e Atualizações obedecem ao grid e à hierarquia tipográfica.
- [ ] O leitor mantém 32 px de respiro e usa o restante da tela.
- [ ] Gavetas podem ser abertas depois de rolar o livro.
- [ ] O índice salta para a seção exata e mostra onde o usuário está.
- [ ] Imagens legítimas aparecem; fatias de reconstrução não.
- [ ] Selecionar texto permite destacar, anotar e copiar.
- [ ] Selecionar um destaque existente permite editar e remover.
- [ ] Ocultar destaques não oculta o texto.
- [ ] Marcar onde parou deixa sinal visível no corpo.
- [ ] Botões irmãos têm medidas coerentes.
- [ ] Carrosséis se deslocam continuamente pela viewport por arraste e teclado.
- [ ] Carrosséis desaceleram sem snap, salto ou correção perceptível ao soltar.
- [ ] Nota, Livro e Mídia são reconhecíveis no Canvas antes de qualquer clique.
- [ ] Todas as ações válidas da seleção estão visíveis, com fechar sempre alcançável.
- [ ] Uma nota em Estudos abre, volta ao livro quando possível e pode ser apagada.
- [ ] Encerrar uma prova não deixa navegador temporário em execução.
- [ ] Não há feature presente apenas para aparentar amplitude de produto.

---

## 12. Regra final para quem continuar

O histórico desta fase mostra que a maior fonte de erro não foi falta de esforço nem falta de detalhes fornecidos. Foi encerrar a investigação no primeiro nível plausível: “o CSS parece certo”, “o teste passou”, “o capítulo mudou”, “a imagem carregou”.

O padrão correto é continuar uma camada abaixo:

- qual container produziu essa posição?
- qual estado produziu essa mensagem?
- qual âncora produziu esse destino?
- que tipo de imagem produziu essa forma?
- o que acontece depois de rolar, sair, voltar ou usar o teclado?

Essa camada adicional é o que transforma uma interface parecida com o Figma em um produto coerente, defensável e apresentável.

---

## 13. Reabertura da auditoria após comparação visual direta

A conferência posterior com o produto aberto revelou quatro falsos positivos da
rodada anterior. Eles importam porque mostram como uma implementação pode estar
funcional, testada e ainda assim estruturalmente errada.

### 13.1 Atualizações: uma adaptação inventada substituiu uma medida deliberada

O código reduzia o tracking desktop da data de `23,8px` para `4px`. O comentário
afirmava que o valor do Figma era um alongamento acidental e que quebraria a
linha. Essa conclusão não havia sido provada na coluna correta. Ao medir o nó e
o produto com a mesma largura, ficou claro que:

- o conteúdo interno mede exatamente `888px`;
- a data usa `20/28`, itálico, caixa alta e tracking de `23,8px` para ocupar a
  régua horizontal inteira;
- a ilustração mede `472 × 467px`;
- a etiqueta vertical mede `67px` de largura física;
- a página pertence a uma gaveta Vaul sobre o canvas pontilhado, e não a uma
  folha comum empilhada no fluxo.

O erro foi evitado desta vez medindo o retângulo renderizado depois da mudança,
não apenas lendo as propriedades. A prova retornou `887,997px` para a coluna,
`471,989 × 466,989px` para a ilustração e `66,989px` para a etiqueta.

### 13.2 Livro: largura de página não é largura de leitura

O topo da ficha precisa dos `1222px` para acomodar capa, identidade e ações. Isso
não autoriza texto, destaques e metadados a usar a mesma medida. As seções
textuais passaram a uma coluna central de `888px`. Com isso:

- os trechos deixam de formar linhas excessivamente longas;
- filtros e busca pertencem ao mesmo grupo visual;
- cada nota recebe separação inferior e padding lateral consistente;
- ações secundárias deixam de competir com o conteúdo;
- “Escrever sobre o livro” mantém título e ilustração no cabeçalho, enquanto o
  campo ocupa a largura completa abaixo;
- “Este arquivo” usa a mesma largura de leitura, sem esticar seus pares de dado.

### 13.3 Leitura: `position: fixed` não bastava porque um painel não usava o portal

A barra principal já era renderizada no `body` e permanecia em `top: 32px` após
rolar. O caderno de notas, porém, era a exceção: apesar de ter
`position: fixed`, continuava filho da longa `.leitura-gaveta`. Depois de rolar
`5998px`, seu retângulo aparecia entre `-5965px` e `-3649px` — tecnicamente
existente, visualmente fora da janela.

O caderno passou pelo mesmo portal dos demais painéis. A nova prova, feita sem
voltar ao topo, registrou o painel em `top: 0`, `bottom: 981,8px`, filho direto
de `BODY`, enquanto a barra continuou em `top: 32px`. A regra para futuras
mudanças é simples: todo elemento cuja coordenada é relativa à viewport deve
ser testado depois de uma rolagem longa, com o ancestral real inspecionado.

### 13.4 Estudos: o mesmo componente não deve conservar o mesmo recipiente

O componente de estudo é reutilizado na lista e na página própria. O conteúdo é
o mesmo, mas o recipiente não: na lista, borda e fundo separam cartões vizinhos;
na página, essa mesma moldura agrupava título, livros e notas como se fossem um
único bloco. A página agora usa a largura estrutural de `1222px`, dividida em
trilha de `200px`, vão de `48px` e conteúdo de `974px`, e remove a moldura do
cartão no contexto de página. Separadores e vãos passam a indicar as seções
reais.

### 13.5 Regra de prevenção adicionada

Sempre que uma decisão divergir do Figma, o registro precisa conter três
evidências: a medida original, a medida renderizada e o caso real que exige a
divergência. Uma justificativa plausível sem essas três provas não substitui o
desenho. E sempre que um elemento se declarar flutuante, a prova deve acontecer
com a página rolada — testá-lo apenas em `scrollY = 0` não testa flutuação.

---

## 14. Fechamento de 15/09: descoberta, origem e gestos

Esta rodada corrigiu um conjunto de problemas que pareciam visuais, mas tinham
uma raiz comum: a interface não deixava claro **onde uma coisa vive, de onde a
pessoa veio e qual gesto cada superfície aceita**.

### 14.1 Notas viraram lugar primário

Deixar a entrada de Notas no fim de Estudos ou dentro das configurações fazia a
pessoa conhecer a existência do acervo inteiro antes de conseguir chegar nele.
Notas agora é um lugar primário do cabeçalho, entre Estante e Canvas, seguindo o
próprio arranjo já desenhado para a página de estudo.

A página também deixou de ser uma sucessão de linhas quase idênticas:

- o conteúdo é contido em `1222px`, em vez de se diluir na largura da janela;
- cada origem forma um grupo com capa real ou capa de reserva;
- notas do Canvas recebem ícone próprio e não fingem pertencer a um livro;
- o cabeçalho de cada grupo diz origem, título e quantidade;
- os itens usam superfície, espaçamento e rodapé de ações consistentes;
- notas sem trecho continuam identificáveis, em vez de produzirem um bloco vazio;
- a API passa a devolver a capa junto da nota, numa consulta de trabalhos única,
  sem criar uma chamada por livro.

O padrão reconhecido foi o da **identidade antes do conteúdo**. Quando há dezenas
de itens, começar pelo texto integral obriga a pessoa a reinterpretar cada nota.
Começar por capa, título e origem permite escolher o grupo antes de ler.

### 14.2 Voltar passou a respeitar a origem real

Um livro aberto dentro de um estudo carregava um link fixo para Estante. A rota
estava tecnicamente correta — o livro também existe na Estante —, mas quebrava o
fluxo que a pessoa estava realizando. O link de entrada agora transporta a rota
e o rótulo de retorno. A ficha usa esse contexto quando existe e conserva
`Estante` como fallback para entrada direta, favorito ou página recarregada.

Isso evita duas soluções erradas:

1. depender exclusivamente do histórico do navegador, que pode começar no
   próprio livro;
2. trocar o retorno fixo para Estudos, quebrando quem veio da Estante.

### 14.3 Canvas: ferramenta reconhecível, ação reconhecível

A barra de seleção deixou de ser uma frase longa de verbos com pesos visuais
iguais. Cada ação recebeu um ícone já existente no vocabulário do produto:
ligação, escrita, seção, duplicação, remoção e enquadramento. Todos os ícones usam
a mesma caixa de `20px`; o texto permanece visível para não transformar a barra
em um teste de memória.

O topo do Canvas também passou de `32px` para `16px` de padding vertical, a mesma
medida do cabeçalho das outras telas. A correção importante aqui não foi
“compactar”: foi retirar uma exceção sem função.

A inspeção em desktop confirmou que as seis ações de uma nota cabem numa única
barra, com contagem e fechamento separados, sem dropdown e sem seta ambígua.

### 14.4 Carrossel: gesto de percurso, não drag-and-drop

O carrossel já tinha captura de ponteiro, inércia e desaceleração contínua, mas a
imagem dentro do link continuava arrastável pelo navegador. O Chrome iniciava o
drag nativo da capa antes que o componente pudesse concluir o gesto; por isso
aparecia o fantasma da imagem e a interface parecia tentar mover o livro.

A prevenção foi aplicada em três camadas:

- `draggable={false}` no link;
- `draggable={false}` na imagem;
- cancelamento explícito de `dragstart`, com `-webkit-user-drag: none` como
  reforço visual do comportamento.

Assim o mesmo gesto passa integralmente para a faixa: o conteúdo acompanha o
ponteiro, recebe embalo ao soltar e pode parar entre capas. Não há reordenação na
Mesa, porque a Mesa não oferece esse modelo mental.

### 14.5 “Precisa de você” voltou a ser conteúdo, não estado escondido

O nó `895:9348` foi relido diretamente. Ele define uma abertura com título e
ilustração de `272 × 224px`, seguida de decisões em duas colunas: explicação e
ação de um lado, representação do arquivo do outro.

A seção agora reúne dois casos reais:

- arquivo protegido, com campo de senha e envio efêmero;
- livro sem capa, com capa proposta e acesso direto à conferência.

A ilustração foi baixada do ativo do próprio Figma, em vez de ser redesenhada ou
substituída por uma imagem parecida. Capas ausentes usam o mesmo componente de
reserva já utilizado pela Estante, o que elimina uma quarta interpretação do
mesmo estado.

### 14.6 Ajuda: resposta curta para reconhecer, resposta completa para resolver

As frases originais funcionavam como resumo, mas não como ajuda. Cada pergunta
agora usa divulgação progressiva:

- pergunta e resposta curta permanecem visíveis;
- abrir revela diagnóstico, consequência e ação recomendada;
- quando há um lugar do produto capaz de resolver, a resposta termina nele;
- a busca também indexa o conteúdo expandido, não apenas o resumo.

Foram aprofundados OCR, diferenças de formato, ordem de quadrinhos, tratamento
dos arquivos, progresso honesto, retomada do processamento, Kindle, senha,
capas, modos, organização manual e tradução. A prevenção para textos de ajuda é
testar a pergunta “depois de ler isto, a pessoa sabe qual ação executar?”. Se a
resposta for não, há descrição, mas não há suporte.

### 14.7 Preparo pronto: três decisões e uma explicação

A quarta ação, “Preparar outro”, quebrava a linha e repetia a entrada principal
da Mesa. A tela final passou a ter as três saídas referentes ao arquivo — enviar,
baixar e abrir — e um link separado para “O que foi feito neste arquivo”. Esse
link leva à seção de diagnóstico da ficha, em vez de abrir um painel vazio.

A largura externa passou a acompanhar os `1222px` da tela de preparo, mas o
texto não foi esticado artificialmente: largura de recipiente continua diferente
de largura de leitura.

### 14.8 Estudos e destaques: separação por agrupamento real

As notas cruas em Estudos passaram de `24px` para `40px` entre itens, e o aviso
de truncamento recebeu espaço próprio. Na ficha do livro, “O que ficou” ocupa a
coluna direita de aproximadamente `747px` dentro da estrutura de `1222px`; isso
preserva a relação do Figma sem reintroduzir a trilha que foi removida por
decisão de produto.

Os destaques abandonaram fundos e separadores inferiores redundantes. O filete
colorido identifica o tipo de marca, o conteúdo forma um grupo, e as ações ficam
depois da origem. A prova visual foi feita na ficha real com sete notas, não num
estado vazio.

### 14.9 Provas executadas nesta rodada

- build de produção do frontend: concluído;
- suíte do backend: `936` testes passaram e `1` foi ignorado;
- `git diff --check`: sem erro de whitespace;
- teste navegável Estudos → livro: retorno exibido como `← Estudos` e apontando
  para o estudo de origem;
- inspeção desktop da barra do Canvas: ícones uniformes e ações em uma linha;
- inspeção da Ajuda com resposta expandida;
- inspeção da Mesa com “Precisa de você” e capa proposta;
- inspeção da ficha real no trecho “O que ficou”.

Um comando de auditoria visual (`scripts/portao.js`) não deve ser chamado
diretamente pelo Node: ele depende de `document` e foi escrito para execução no
navegador. O erro dessa tentativa não indica defeito do produto; a prevenção é
executá-lo pelo invólucro de medição/browser apropriado e nunca registrar sua
execução crua como teste de frontend.

# Component Inventory

> **HISTÓRICO — não descreve o Mekora de hoje.**
>
> Este arquivo veio do `Kindle Local Tool` e foi preservado na fusão dos
> repositórios. Ele descreve uma árvore (`frontend/`, Vitest, `cd
> kindle-local-tool`) que **este repositório não tem**, e comandos daqui não
> funcionam. Serve como origem de uma ideia, nunca como fonte de regra em vigor
> — a mesma regra do `archive/`.
>
> O estado vigente está em [`../README.md`](../README.md).

Escopo: **nomes, responsabilidades, variantes, estados e dados**. Sem valores visuais (cores, tamanhos, radius) — esses ficam para o Figma.

## A. Foundations

Somente nomes conceituais. **Valores serão definidos no Figma** (ver `design-token-contract.md`).

- **color** — background, surface, text, border, action, feedback
- **typography** — family (sans, mono), size, weight, lineHeight, tracking
- **spacing** — escala consistente para padding, margin, gap
- **grid** — colunas, gutters, breakpoints
- **sizing** — larguras/alturas mínimas/máximas
- **border** — width
- **radius** — cantos arredondados
- **shadow** — elevação
- **motion** — duration, easing
- **breakpoint** — mobile/tablet/desktop
- **z-index** — camadas (base, sticky, sidebar, modal, toast)
- **iconography** — biblioteca de ícones (atualmente `lucide-react` — a definir no Figma se mantém)

## B. Primitivos

### Button
- **Responsabilidade**: ação principal/secundária.
- **Conteúdo**: label, opcional ícone à esquerda/direita.
- **Variantes**: primary, secondary, ghost, destructive, action-blue, action-green.
- **Tamanhos**: sm, md, lg.
- **Estados**: default, hover, active, focus, disabled, loading.
- **Comportamento**: `onClick`; quando `loading`, mostrar spinner e desabilitar.
- **Acessibilidade**: papel button, `aria-disabled` quando desabilitado, foco visível, texto acessível (`aria-label` para icon-only).
- **Telas que utilizam**: todas.
- **Dados**: —

### IconButton
- Como Button, apenas ícone; **sempre com `aria-label`**.

### Link
- **Variantes**: default, inline, breadcrumb.
- **Estados**: default, hover, visited, focus.
- **Acessibilidade**: papel link; distinção não só por cor.

### Input
- Text/number/email; label externo obrigatório; helper text opcional; error text abaixo.
- **Estados**: default, focus, disabled, error, readonly.
- **Acessibilidade**: `<label for>`, `aria-describedby` para helper/error.

### Textarea
- Como Input; suporta contador de caracteres.

### Select
- Nativo ou custom; label + helper + error.

### Checkbox
- Label associado; estados: checked, unchecked, indeterminate, disabled.

### Radio (group)
- Group com label; papel `radiogroup`.

### Switch
- Alternância on/off; label descrevendo o efeito (não só "ativado/desativado").

### Badge
- **Variantes**: neutral, info, success, warning, error, brand.
- **Uso**: status, tipo, contadores pequenos.

### Progress
- **Variantes**: determinate (0–100%), indeterminate (animação).
- **Conteúdo**: label + valor + tempo decorrido.
- **Regra**: nunca mostrar % em indeterminate.

### Spinner
- Loading contínuo sem barra.

### Tooltip
- Descrição curta ao hover/focus; **não** para conteúdo essencial.

### Divider
- Separador horizontal/vertical.

### Surface
- Container base (card/panel) com padding + borda + fundo neutro; sem lógica.

## C. Compostos

### AppShell
- **Responsabilidade**: layout raiz (sidebar + área principal).
- **Conteúdo**: `Sidebar`, `<main>`, `Toast` container, `KeyboardShortcutsHelp` modal.
- **Comportamento**: dispatcha eventos globais (`kindle:jobselect`) para sincronizar contexto.
- **Dados**: contexto de tema, i18n.

### Sidebar
- **Responsabilidade**: navegação principal + contexto de job ativo.
- **Conteúdo**: logo, seções (Conversão, Produção, Sistema), item de contexto de job.
- **Variantes**: sem job / com job document / com job comic.
- **Estados**: item ativo, item bloqueado (via `pipeline-state`), item desabilitado por ausência de job.
- **Comportamento**: gating de etapas comic via `useComicPipelineState`.
- **Dados**: `pipeline-state` + localStorage (`lastComicId/Type/Name`).

### JobContext
- **Responsabilidade**: indicador visual do job atual (no topo da seção Produção da Sidebar).
- **Conteúdo**: nome do arquivo, tipo, dica curta ("Pipeline de quadrinhos").
- **Estados**: nenhum job / documento / comic.
- **Dados**: `job.original_filename`, `processing_mode`.

### PageHeader
- **Responsabilidade**: cabeçalho de cada tela (título, subtítulo, badges de status, ações rápidas).
- **Variantes**: hero (Home/Metrics), padrão, breadcrumb.
- **Dados**: título + subtítulo + slots para ações.

### StepNavigation
- **Responsabilidade** (novo — hoje é feito via Sidebar): representar o pipeline comic como stepper visual.
- **Estados por etapa**: done, current, available, blocked, disabled.
- **Comportamento**: clique navega quando `available|done`; tooltip com motivo quando `blocked`.
- **Dados**: `pipeline-state`.

### Dropzone
- **Responsabilidade**: aceitar upload por drag-and-drop ou file picker.
- **Conteúdo**: instrução, formatos aceitos, botão "Selecionar Arquivos", "Selecionar Pasta".
- **Estados**: idle, dragging, uploading (com progress), success (redireciona), error.
- **Dados**: `KLT_UPLOAD_MAX_MB`, allowlist de extensões.

### FileSummary
- **Responsabilidade**: bloco resumo do arquivo (nome, tipo, tamanho, número de páginas, escaneado?).
- **Variantes**: documento / comic.
- **Dados**: `job` completo.

### DiagnosticSummary
- **Responsabilidade**: agrupar diagnósticos que a análise gerou (OCR necessário/feito/falhou, idioma detectado, etc.).
- **Variantes**: sem alertas / com avisos / com bloqueio.
- **Dados**: `job.is_scanned`, `job.ocr_status`, `job.error_message`.

### ProcessingCard
- **Responsabilidade**: cartão que agrupa uma etapa em andamento (título, spinner ou ProgressPanel, ação cancelar).
- **Variantes**: por operation_type.

### ProgressPanel
- **Responsabilidade**: renderizar `OperationProgress`.
- **Variantes**: known (%), indeterminate.
- **Conteúdo**: `stage`, `message`, `N/M` ou "sem estimativa", tempo decorrido, botão cancelar (se cooperativo).
- **Dados**: `OperationProgress`.

### ErrorPanel
- **Responsabilidade**: exibir erro humano + detalhes técnicos em `<details>` colapsável.
- **Variantes**: recoverable (com Retry), fatal.
- **Dados**: `code`, `message`, `details` (opcional).

### BlockedState
- **Responsabilidade**: motivar pré-requisito faltante.
- **Conteúdo**: ícone lock, motivo, CTA para a etapa que resolve.
- **Dados**: `pipeline-state.steps[i].blocked_reason/prerequisite_step`.

### EmptyState
- **Responsabilidade**: mensagem quando não há dado.
- **Conteúdo**: ilustração/ícone, texto, CTA principal.
- **Variantes**: Home sem job, Histórico vazio, Métricas sem dados, Batch sem itens correspondentes.

### DependencyStatus
- **Responsabilidade**: mostrar disponibilidade de dependências locais (Calibre, KCC, Tesseract, OCRmyPDF, Argos pacotes, NLLB modelo).
- **Variantes**: available, unavailable, degraded.
- **Dados**: `GET /translation/engines`, `GET /translation/models/status`, endpoints internos (KCC via `/comic-convert` 409).

### MetadataForm
- **Responsabilidade**: editar título, autor, idioma, nome final.
- **Estados**: dirty, saving, saved, error.
- **Dados**: `job.final_*`.

### CoverSelector
- **Responsabilidade**: escolher 1 de 5 miniaturas (documento).
- **Variantes**: sem thumbnails (não-PDF), 1–5 thumbnails.
- **Estados**: none, selected, error.
- **Dados**: `job.thumbnails`, `job.selected_cover_page`.

### PageThumbnail
- **Responsabilidade**: renderizar miniatura de página (com estado selecionado/badge/atalho).
- **Variantes**: cover option, comic page (com badges de variante/status), before/after.
- **Acessibilidade**: `alt` obrigatório com número da página; `aria-selected` quando aplicável.

### BeforeAfterPreview
- **Responsabilidade**: comparação lado-a-lado ou toggle.
- **Uso**: overlay/render, finish before/after.

### HistoryItem
- **Responsabilidade**: linha do Histórico (ícone tipo, nome, tipo, status badge, duração, ações).
- **Ações**: abrir, duplicar, aplicar preset, retry send (quando pending).

### BatchItem
- **Responsabilidade**: linha da tabela Batch (checkbox, nome, tipo, badges, resultado quando executado).

### MetricCard
- **Responsabilidade**: um KPI (ícone + label + valor + unidade).
- **Estados**: valor conhecido, sem dado ("—").

### ConfirmationDialog
- **Responsabilidade**: confirmar ação destrutiva/importante.
- **Conteúdo**: título, corpo, ação primária (destructive quando aplicável), ação secundária cancelar.

### Toast
- **Responsabilidade**: notificação transitória.
- **Variantes**: success, info, warning, error.
- **Acessibilidade**: `role="status"` para info; `role="alert"` para erro/warning.

## Componentes específicos do pipeline comic (compostos)

### VariantCard (Finalize)
- Grid card por variante (original/render_overlay/inpaint): thumbnail, badge selected, botão "Selecionar", badges (Manual/Auto).

### PresetSelector (Finish/Consistency)
- Lista de presets com descrição curta, chip do preset atual, ação preview/aplicar/resetar.

### RecommendedModePanel (Analysis)
- Painel do Modo Recomendado (preflight, resumo, confirmação).

### QuickKccBlock (Export)
- Seção colapsada "Conversão rápida do original — sem tradução".

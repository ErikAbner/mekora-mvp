# Screen & Route Inventory

Baseado em `frontend/src/App.tsx` e nos serviços que cada tela consome.

## Rotas atuais

| URL | Componente | Tipo de job |
|---|---|---|
| `/` | UploadPage | (nenhum ainda) |
| `/analyze/:id` | AnalysisPage | document / comic |
| `/review/:id` | ComicReviewPage | comic |
| `/overlay/:id` | ComicOverlayPage | comic |
| `/finalize/:id` | ComicFinalizePage | comic |
| `/finish/:id` | ComicFinishPage | comic |
| `/consistency/:id` | ComicConsistencyPage | comic |
| `/export/:id` | ComicExportPage | comic |
| `/batch` | BatchPage | qualquer |
| `/history` | HistoryPage | qualquer |
| `/metrics` | MetricsPage | qualquer |
| `/config` | ConfigPage | qualquer |
| `*` | redirect → `/` | — |

---

## `/` — UploadPage (Home / Converter)
- **Objetivo**: iniciar novo processamento.
- **Endpoint consumido**: `POST /upload`.
- **Informação exibida**: dropzone; toggle (Documento/Comic) visual para orientar o usuário; lista curta de formatos aceitos; fila recente de conversões (consulta `GET /history`).
- **Ação principal**: fazer upload de arquivo.
- **Ações secundárias**: navegar para Batch, Histórico, Métricas, Configurações via sidebar.
- **Pré-requisitos**: nenhum.
- **Etapa anterior**: N/A.
- **Etapa seguinte**: `/analyze/:id`.
- **Refresh**: mantém a tela; job ativo da sessão anterior pode aparecer na sidebar.
- **Sem job**: estado padrão.
- **Sem artefato**: N/A.
- **Erro**: mensagens do backend (400/413/409) exibidas em toast/banner.

## `/analyze/:id` — AnalysisPage
- **Objetivo**: revisar diagnóstico e disparar as ações principais do job (converter, traduzir, converter KCC, enviar).
- **Endpoints**: `GET /analyze/{id}` (dispara análise), `GET /jobs/{id}` (dados completos), `GET /jobs/{id}/status` (polling 3s com `progress` + `phase`), `POST /jobs/{id}/metadata`, `POST /jobs/{id}/cover`, `POST /jobs/{id}/translate`, `POST /jobs/{id}/comic-translate`, `POST /jobs/{id}/convert`, `POST /jobs/{id}/comic-convert`, `POST /jobs/{id}/send`, `POST /jobs/{id}/operations/{op}/cancel`, `GET /jobs/{id}/comic-quick-pipeline/preflight`, `POST /jobs/{id}/comic-quick-pipeline`, `PATCH /jobs/{id}/metadata` (flow_mode).
- **Informação exibida**: nome do arquivo, status, badges (formato/modo), metadados, capa (documento), painel Modo de Trabalho (comic), seção Tradução (documento e comic), Ações (Converter, KCC, Enviar/Ir para Exportar), banners de OCR e progresso.
- **Ação principal**: depende do estado do job e do tipo (converter documento OU disparar quick pipeline OU ir para /export).
- **Ações secundárias**: cancelar operação, editar metadados/capa, trocar modo de trabalho, expandir aviso do KCC rápido.
- **Pré-requisitos**: `job.id` válido.
- **Etapa anterior**: `/` (upload) OU `/history` (retomar).
- **Etapa seguinte**:
  - Documento: mesma tela até `send_status=sent` → volta ao Histórico.
  - Comic: `/review`, `/overlay`, `/finalize`, `/finish`, `/consistency`, `/export` conforme fluxo.
- **Refresh**: dispara `getJob` novamente; se 404, mostra banner de erro.
- **Sem job**: erro "não encontrado" com CTA voltar.
- **Sem artefato**: cada seção mostra o próprio estado (sem OCR / sem tradução / sem conversão).
- **Erro**: banners específicos por seção; polling continua tentando reconectar (v1.2.0).

## `/review/:id` — ComicReviewPage
- **Objetivo**: aprovar/editar/pular blocos de texto traduzidos por página.
- **Endpoints**: `GET /jobs/{id}/comic-translation/review`, `PATCH .../review`, `POST .../review/export`.
- **Informação**: navegação por página, blocos com original + tradução + campo editável, status por bloco.
- **Ação principal**: salvar edições em lote por página.
- **Ações secundárias**: exportar JSON/HTML/MD; ir para `/overlay`.
- **Pré-requisito**: `comic_translation.json` presente (409 se ausente).
- **Etapa anterior**: `/analyze` (após tradução comic).
- **Etapa seguinte**: `/overlay`.
- **Refresh**: recarrega sidecar.
- **Sem artefato**: banner "revisão não pronta" + CTA para `/analyze`.
- **Erro**: mensagem humana; ausência de OCR/tradução é o caso mais comum.

## `/overlay/:id` — ComicOverlayPage
- **Objetivo**: posicionar visualmente as bboxes dos blocos, gerar render e (opcional) inpaint.
- **Endpoints**: `GET/PATCH /jobs/{id}/comic-overlay`, `POST .../overlay/export`, `POST/GET /jobs/{id}/comic-render`, `POST/GET /jobs/{id}/comic-inpaint`.
- **Informação**: página com imagem + boxes arrastáveis; painel de estilo por bloco; painel de render (comparação antes/depois, downloads ZIP/CBZ); painel de inpaint.
- **Ação principal**: posicionar + renderizar.
- **Ações secundárias**: alterar estilo por bloco, exportar HTML preview, executar inpaint.
- **Pré-requisito**: tradução comic concluída (409 se não).
- **Etapa anterior**: `/review`.
- **Etapa seguinte**: `/finalize`.
- **Refresh**: recarrega manifest.
- **Sem artefato**: banner + CTA para etapa anterior.
- **Erro**: banners por operação (render/inpaint); mensagens humanas.

## `/finalize/:id` — ComicFinalizePage
- **Objetivo**: escolher variante por página (Curadoria Final) e exportar `final_pages/`.
- **Endpoints**: `POST/GET/PATCH /jobs/{id}/comic-finalize`, `POST .../export`, `POST .../apply-suggestions`, `GET /jobs/{id}/comic-suggestions`, `POST /jobs/{id}/comic-suggestions/recompute`.
- **Informação**: filtros (all/review_required/undecided/manual), grade de variantes por página (original / render_overlay / inpaint), badges (Manual/Auto/Sugestão), sumário do projeto, painel de export com downloads ZIP/CBZ/PDF.
- **Ação principal**: selecionar variante + exportar `final_pages/`.
- **Ações secundárias**: recomputar sugestões, aplicar em lote (pendentes/todas), forçar todas para uma variante, ir para Acabamento.
- **Pré-requisito**: manifest de overlay (404 se ausente → CTA init).
- **Etapa anterior**: `/overlay`.
- **Etapa seguinte**: `/finish` (opcional) OU `/export` diretamente.
- **Refresh**: recarrega manifest.
- **Sem artefato**: CTA "iniciar curadoria".
- **Erro**: por página (variante indisponível), por export (banner).

## `/finish/:id` — ComicFinishPage
- **Objetivo**: aplicar ajustes visuais (contrast/brightness/sharpness/saturation) globais e por página; opcional análise de layout.
- **Endpoints**: `POST/GET/PATCH /jobs/{id}/comic-finish`, `POST .../export`, `POST .../analyze`.
- **Informação**: score de qualidade, presets globais, controles por página, checklist de acabamento com issues + sugestões.
- **Ação principal**: aplicar preset + exportar `finished_pages/`.
- **Ações secundárias**: analisar layout, ajustes por página, toggle auto-fix.
- **Pré-requisito**: `comic_final_manifest.json` (404 se ausente).
- **Etapa anterior**: `/finalize`.
- **Etapa seguinte**: `/consistency` (opcional) OU `/export`.
- **Refresh**: recarrega manifest.
- **Sem artefato**: CTA "inicializar".
- **Erro**: por página (nenhuma pipeline em background falha aqui — export é síncrono).

## `/consistency/:id` — ComicConsistencyPage
- **Objetivo**: verificar consistência visual entre páginas (qualitativo, informacional).
- **Endpoints**: `GET /jobs/{id}/comic-consistency`, `POST .../analyze`, `POST .../analyze-visual`, `POST .../apply`, `PATCH .../page/{n}`, `GET/POST /jobs/{id}/comic-preset-recommendation*`.
- **Informação**: score geral (paramétrico + visual + combinado), painéis por dimensão (tipografia/posicionamento/visual/estrutura), lista de páginas outlier, recomendação de preset.
- **Ação principal**: analisar + (opcional) aplicar harmonização.
- **Ações secundárias**: recomendar/preview/aplicar preset; ajustes por página.
- **Pré-requisito**: nenhum estruturalmente (mostra vazio se nada foi analisado).
- **Etapa anterior**: `/finish`.
- **Etapa seguinte**: `/export`.
- **Refresh**: recarrega.
- **Sem artefato**: CTA "analisar".
- **Erro**: banners de análise.

## `/export/:id` — ComicExportPage
- **Objetivo**: gerar o EPUB final (com tradução visual quando aplicável) e enviar ao Kindle.
- **Endpoints**: `POST/GET /jobs/{id}/comic-export`, `GET /jobs/{id}/pipeline-state`, `POST /jobs/{id}/metadata`, `POST /jobs/{id}/send`, `POST /jobs/{id}/comic-convert` (seção secundária de conversão do original).
- **Informação**: resumo da fonte (`finished_pages` / `final_pages`), número de páginas, badge de estado da tradução (`full`/`partial`/`none`/`not_applicable`), formatos EPUB/CBZ, metadados editáveis, pré-requisito com CTA quando bloqueado, seção colapsada "Conversão rápida do original".
- **Ação principal**: gerar EPUB final + enviar ao Kindle.
- **Ações secundárias**: baixar CBZ, editar metadados, reconectar polling em soft-timeout, converter original via KCC.
- **Pré-requisito** (gating): fonte real completa; 409 estruturado com `next_step` se ausente.
- **Etapa anterior**: `/finalize` (mínimo) OU `/finish` (recomendado).
- **Etapa seguinte**: `/history` (após envio).
- **Refresh**: revalida job + pipeline-state; se 404, exibe erro humano.
- **Sem artefato**: card "Export bloqueado" com motivo e CTA para etapa pendente.
- **Erro**: 409 estruturado exibido como banner com CTA para o `next_step`.

## `/batch` — BatchPage
- **Objetivo**: aplicar ações em lote sobre múltiplos jobs.
- **Endpoints**: `GET /batch/jobs`, `POST /batch/apply-preset`, `POST /batch/export`, `POST /batch/apply-suggestions`, `POST /batch/retry-send`, `POST /batch/set-final-variant`, `GET /presets`, `GET/POST/PUT/DELETE /presets/*`.
- **Informação**: barra de filtros, tabela multi-seleção, painel de ações, painel de resultados.
- **Ação principal**: selecionar → escolher ação → executar → ver resultados.
- **Ações secundárias**: gerir presets (criar/editar/duplicar/apagar).
- **Pré-requisito**: nenhum.
- **Etapa anterior**: qualquer.
- **Etapa seguinte**: qualquer (usuário pode abrir job individual).
- **Refresh**: recarrega listagem.
- **Sem job**: tabela vazia com CTA para Histórico/Upload.
- **Erro**: por item (não aborta lote).

## `/history` — HistoryPage
- **Objetivo**: consultar e retomar jobs.
- **Endpoints**: `GET /history`, `POST /jobs/{id}/duplicate`, `POST /jobs/{id}/apply-preset`, `POST /pending-send/{id}/retry`.
- **Informação**: tabela com ID, arquivo, tipo, status, data, duração, ações.
- **Ação principal**: abrir job (redireciona para AnalysisPage).
- **Ações secundárias**: duplicar (reprocessar), aplicar preset, retry envio pendente, filtros (todos/documento/comic/concluído/em processamento/falhou), busca.
- **Pré-requisito**: nenhum.
- **Etapa anterior**: qualquer.
- **Etapa seguinte**: qualquer.
- **Refresh**: recarrega.
- **Sem job**: estado vazio com CTA upload.
- **Erro**: banner para falhas de operação.

## `/metrics` — MetricsPage
- **Objetivo**: observabilidade agregada.
- **Endpoints**: `GET /metrics/summary|stages|failures|usage|jobs/{id}`.
- **Informação**: cards KPI (throughput/tempo médio/taxa de sucesso/qualidade média), tabela por etapa (total/completed/failed/avg_ms/p95_ms/fail_pct), lista de falhas recentes.
- **Ação principal**: leitura.
- **Ações secundárias**: nenhuma editorial.
- **Pré-requisito**: nenhum.
- **Etapa anterior/seguinte**: nenhuma.
- **Refresh**: recarrega.
- **Sem dados**: estado vazio explícito.
- **Erro**: banner.

## `/config` — ConfigPage
- **Objetivo**: gerir configurações do app (não `.env`).
- **Endpoints**: `GET/PATCH /app-config`, `GET /config`, `POST /config/test-email`, `GET /translation/engines`, `GET /translation/models/status`.
- **Informação**: seções (idiomas OCR, retenção, tradução default, NLLB, perfil KCC, tema, idioma UI); status SMTP com senha mascarada; painel de engines/modelos.
- **Ação principal**: salvar configurações; testar SMTP.
- **Ações secundárias**: habilitar/desabilitar NLLB, escolher device (CPU/MPS/CUDA), verificar disponibilidade de modelos.
- **Pré-requisito**: nenhum.
- **Etapa anterior/seguinte**: qualquer.
- **Refresh**: recarrega.
- **Sem dados**: N/A.
- **Erro**: por seção; mensagens fixas para SMTP (v1.2.2).

---

## Inconsistências identificadas (para o Figma resolver)

1. **AnalysisPage acumula funções demais**: metadados + capa + tradução (documento) + tradução comic + ações de conversão + painel Modo Recomendado (comic) + envio. Precisa de decomposição visual clara entre "diagnóstico" e "ação".
2. **Sidebar de produção contextual só é útil se o usuário souber qual etapa está bloqueada**: hoje o gating por `pipeline-state` mostra `disabled` com tooltip; um Figma novo pode representar o pipeline como **stepper**, não como lista de links.
3. **`/finalize` mistura seleção por página + ação em lote + sumário do projeto + export**: caberia decompor em "seleção" e "resultado".
4. **`/finish` chama-se "Acabamento" mas o backend usa o nome `finish` — a etapa parece opcional, mas quando presente **tem prioridade** sobre `final_pages`** no export. Isso não é óbvio na tela atual.
5. **`/consistency` é opcional e nunca bloqueia o export**, mas sua posição no fluxo pode sugerir obrigatoriedade — reforçar visualmente que é qualitativo/informacional.
6. **`/export` tem uma seção secundária "Conversão rápida do original"** que, se mal posicionada, pode gerar a mesma confusão que a Home tinha antes da v1.2.0. Manter clara a separação entre "arquivo original via KCC" e "export com tradução".
7. **`/config` mistura**: configurações que exigem reinício (idiomas OCR, NLLB device) com configurações imediatas (tema, idioma UI) e credenciais só-leitura (SMTP). Merece separação visual clara.
8. **HistoryPage é o único lugar para "duplicar job"** — que é a forma real de reprocessar OCR quando falhou. Isso não é óbvio hoje.
9. **BatchPage tem alta densidade** (filtros + seleção + ações + resultados) numa única tela; pode virar 2 modos: "selecionar" e "executar".
10. **UploadPage não distingue visualmente o comportamento de PDF em modo comic** (que só é decidido via metadata depois). Merece revisão.

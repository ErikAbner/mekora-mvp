# User Flows v2

> **HISTÓRICO — não descreve o Mekora de hoje.**
>
> Este arquivo veio do `Kindle Local Tool` e foi preservado na fusão dos
> repositórios. Ele descreve uma árvore (`frontend/`, Vitest, `cd
> kindle-local-tool`) que **este repositório não tem**, e comandos daqui não
> funcionam. Serve como origem de uma ideia, nunca como fonte de regra em vigor
> — a mesma regra do `archive/`.
>
> O estado vigente está em [`../README.md`](../README.md).

Todos os fluxos referem-se ao comportamento **existente** em v1.2.3. Não descrevem intenção; descrevem código.

## Convenções
- **PDF** = documento; **CBZ/CBR/CB7/CBC** = quadrinho/mangá. `processing_mode` do job é derivado da extensão no upload (com override possível via metadata).
- **Artefatos** de comic (por job em `storage/output/{id}/`):
  - `pages/page_NNN.jpg` — **originais extraídos** do arquivo enviado
  - `rendered_pages/page_NNN.png` — **overlay renderizado** (Pillow) sobre a página original
  - `inpaint_pages/page_NNN.png` — **variante com inpainting** (opcional)
  - `final_pages/page_NNN.png` — **variante escolhida** por página (Curadoria Final)
  - `finished_pages/page_NNN.png` — **variante com ajustes visuais** (Acabamento)
  - `comic_export/{slug}.cbz` + `{slug}.epub` — **export final** (CBZ de staging + EPUB via KCC)
- **Estados do job (banco)**: `status ∈ {uploaded, analyzing, analyzed, converting, converted, sending, done, error}` + `*_status` específicos.

---

## A. Documento / Livro

### A0. Configuração inicial (uma vez)
- Instalar dependências locais: Calibre, Tesseract + idiomas, Ghostscript, OCRmyPDF.
- Preencher `.env` com SMTP + `KINDLE_EMAIL`.
- (Opcional) `ARGOS_PACKAGES_DIR` com pacotes de tradução.
- Autorizar o remetente SMTP em *Send-to-Kindle* na Amazon.

### A1. Novo upload
- **Entrada**: arquivo local do usuário
- **Pré-requisito**: extensão suportada
- **Ação principal**: `POST /upload` (streaming em chunks; magic bytes verificados; limite `KLT_UPLOAD_MAX_MB`)
- **Resultado**: `job.id`, `job.status = "uploaded"`, arquivo em `storage/input/{id}_{slug}`
- **Falhas recuperáveis**: 400 (formato/magic mismatch/nome inválido), 413 (grande demais), 409 (destino existe)
- **Saída**: redirecionar para AnalysisPage
- **Próxima etapa**: A2

### A2. Análise
- **Ação principal**: `GET /analyze/{id}` (agenda `_bg_analyze` em background)
- **Progresso**: polling `GET /jobs/{id}/status` (3s)
- **Resultado**: `status = "analyzed"`, metadados detectados (título/autor/idioma), `page_count`, `is_scanned`, thumbnails (5)
- **Falhas**: `status = "error"` + `error_message` humanizado
- **Próxima etapa**: A3 (se escaneado) ou A4

### A3. OCR (quando `is_scanned = True`)
- **Ação**: executada automaticamente dentro de `_bg_analyze` para PDFs escaneados
- **Resultado esperado**: `ocr_used = True`, `ocr_status = "done"`, `processed_pdf_path` com texto embutido
- **Falha recuperável**: `ocr_status = "failed"` + `error_message` acionável (dependência ausente / idioma faltando). Botão **Converter para EPUB fica bloqueado** (backend responde 422).
- **Recuperação**: instalar dependência ausente e **duplicar o job no Histórico** (`POST /jobs/{id}/duplicate`) — não há endpoint de "retry OCR" isolado.

### A4. Revisão de metadados e capa
- **Ação principal**: `POST /jobs/{id}/metadata` (título/autor/idioma/nome final) e `POST /jobs/{id}/cover` (índice 0–4)
- **Resultado**: os campos `final_*` alimentam o EPUB

### A5. Tradução opcional (documento)
- **Pré-requisito**: engine e par disponíveis (`GET /translation/engines`)
- **Ação**: `POST /jobs/{id}/translate` com `source_language`/`target_language`/`translator_engine`
- **Progresso**: `translation_status` + `progress` por chunk
- **Resultado**: `translated_artifact_path` (HTML) → usado na conversão A6

### A6. Conversão para EPUB
- **Pré-requisito**: `status = analyzed` (ou `converted`/`error` para retry); OCR bem-sucedido em PDFs escaneados
- **Ação**: `POST /jobs/{id}/convert` (dispara `_bg_convert` → `ebook-convert`)
- **Timeout**: `KLT_CALIBRE_TIMEOUT_SECONDS`
- **Resultado**: `epub_path` em `storage/output/{id}/`; `conversion_status = "done"`
- **Falha**: `conversion_status = "failed"` + `error_message` humano (via `subprocess_runner` com paths redigidos)

### A7. Download
- Link direto `/storage/output/{id}/{slug}.epub` (rota controlada, allowlist)

### A8. Envio ao Kindle
- **Pré-requisito**: `conversion_status = "done"` + `epub_path` existente + `send_status != "sent"`
- **Ação**: `POST /jobs/{id}/send` (checa SMTP alcançável antes → se não, marca `pending` e responde 503)
- **Resultado ok**: `send_status = "sent"`, `status = "done"`, `kindle_sent = True`
- **Falhas**:
  - Conectividade → `send_status = "pending"` (fila para retry manual)
  - Credencial / limite Amazon → `send_status = "failed"` (sem retry automático)
- **Recuperação**: A9

### A9. Fila / nova tentativa
- **Ação**: `POST /pending-send/{id}/retry`
- **Pré-requisito**: `send_status = "pending"`
- **Resultado**: mesmo diagrama de A8

### A10. Histórico
- **Ação**: `GET /history`
- **Uso**: filtrar por status/tipo, buscar por nome, duplicar job (A1 já ficou em disco), aplicar preset, ir para AnalysisPage do job

---

## B. Quadrinho / Mangá

### B1. Upload
- Mesma A1. `processing_mode = "comic"` derivado da extensão OU do metadata (PDF em comic mode).
- Job comic **novo** nasce com `flow_mode = "recommended"`.

### B2. Análise (comic)
- `_bg_analyze` marca `status = "analyzed"` sem análise textual (nem OCR/metadados). Não gera thumbnails.

### B3. Escolha do modo
- **Modo Recomendado** (default para jobs novos): B4→B5→B6→B7→B8 (quick pipeline)
- **Modo Avançado**: B4→B5→B6→B7 controlado manualmente + B9→B10 opcionais

### B4. Tradução comic
- **Pré-requisito**: `comic_translation_enabled = True` + par de idiomas disponível
- **Ação**: `POST /jobs/{id}/comic-translate` (OCR por página + tradução por bloco)
- **Progresso**: `comic_translate` com N/M páginas
- **Resultado**: `comic_translation.json` + `comic_translation.html`

### B5. Revisão (bloco a bloco)
- **Rota**: ComicReviewPage `/review/:id`
- **Ação**: `PATCH /jobs/{id}/comic-translation/review` para aprovar/editar/pular blocos
- **Modo Recomendado** aprova todos os blocos automaticamente após confirmação explícita.

### B6. Overlay visual
- **Rota**: ComicOverlayPage `/overlay/:id`
- **Ações**:
  - `GET /jobs/{id}/comic-overlay` (auto-inicializa se necessário; gera `pages/`)
  - Drag-and-drop de bbox + estilo por bloco → `PATCH .../comic-overlay`
  - `POST .../comic-render` → gera `rendered_pages/` (auto-fit de fonte quando não definida)
  - (Opcional) `POST .../comic-inpaint` → gera `inpaint_pages/`
  - (Opcional) `POST .../comic-overlay/export` → HTML preview

### B7. Curadoria Final
- **Rota**: ComicFinalizePage `/finalize/:id`
- **Ações**:
  - `POST /jobs/{id}/comic-finalize` (init manifest com defaults `selected_variant = original`)
  - `PATCH .../comic-finalize` (mudar variante por página) OU `POST .../apply-suggestions` (sugestões automáticas com score)
  - `POST .../comic-finalize/export` → gera `final_pages/`, `final_pages.zip/cbz/pdf`, `comic_final_export_manifest.json`

### B8. Export final (**etapa própria**)
- **Rota**: ComicExportPage `/export/:id`
- **Pré-requisito** (gating): `comic_final_manifest.json` com `exported_pages > 0` OU `comic_finish_manifest.json` completo
- **Preflight (síncrono)**: `resolve_export_source(...)` valida fonte real de páginas (`finished_pages` → `final_pages`) com PIL, ordem, duplicata lógica, extensões suportadas; 409 estruturado se ausente/incompleta
- **Ação**: `POST /jobs/{id}/comic-export` (body `{target: 'epub'|'cbz', force: bool}`)
- **Background**: monta CBZ de staging determinístico → KCC (com `-t/-a` título/autor) → validação de EPUB (mimetype, tamanho) → promoção atômica (`os.replace`) → manifest final
- **Manifest** com proveniência por página + `translation_state` ∈ {full, partial, none, not_applicable}
- **Resultado**: `comic_export_status = "done"`, `comic_export_path` = EPUB (ou CBZ se target=cbz)
- **Envio**: `POST /jobs/{id}/send` — política C do envio: **comic com tradução exige export final**, nunca envia o original

### B9. Acabamento (opcional, entre Curadoria e Export)
- **Rota**: ComicFinishPage `/finish/:id`
- **Pré-requisito**: `comic_final_manifest.json` (curadoria exportou)
- **Ações**: `POST /jobs/{id}/comic-finish` (init) + `PATCH` (presets + ajustes) + `POST .../export` (gera `finished_pages/`) + `POST .../analyze` (análise de layout)
- Quando presente e completo, o Export final usa `finished_pages` (tem prioridade sobre `final_pages`).

### B10. Consistência (opcional, informacional)
- **Rota**: ComicConsistencyPage `/consistency/:id`
- **Ações**: análises paramétrica + visual + recomendação de preset
- **Não bloqueia o Export**; é qualitativo.

### B11. Falhas recuperáveis (comic)
- Fonte de export ausente/incompleta → 409 estruturado com `next_step` (`finalize`/`finish`)
- Operação órfã (backend reiniciou) → `progress.status = "interrupted"` → limpar automaticamente e permitir nova tentativa
- Duplo clique → 409 `OPERATION_IN_PROGRESS`

---

## C. Caminho rápido (Recomendado)

### C1. Documento
Não existe orquestrador "quick pipeline" para documentos. O caminho rápido para documentos é literalmente:
1. Upload
2. Aguardar análise
3. (Se escaneado) esperar OCR automático dentro da análise
4. (Opcional) editar metadados
5. Converter para EPUB
6. Enviar ao Kindle

### C2. Comic
1. Upload → job comic nasce com `flow_mode = "recommended"`
2. AnalysisPage exibe painel Modo Recomendado com preflight
3. Usuário revisa preflight (idiomas, engine, dependências, etapas a rodar/reaproveitar) e **confirma explicitamente**
4. `POST /jobs/{id}/comic-quick-pipeline` executa: tradução → revisão auto-approved → overlay init → render → curadoria (`selected_variant='render_overlay'`) → export de `final_pages/`
5. **NÃO exporta EPUB automaticamente**: usuário confirma na ComicExportPage (B8)
6. Envia ao Kindle na mesma tela

**Não misturar** com automações de documentos ou de acabamento/consistência: o quick pipeline pula deliberadamente Acabamento e Consistência.

---

## D. Batch

### D1. Seleção
- `GET /batch/jobs` com filtros (status/tipo/enabled)
- Multi-seleção por checkbox

### D2. Elegibilidade
- Depende da ação escolhida:
  - Aplicar preset: qualquer job
  - Aplicar sugestões da Curadoria: precisa `comic_final_manifest.json` e `comic_suggestion_manifest.json`
  - Export: precisa `comic_final_manifest.json` completo
  - Retry send: precisa `send_status = "pending"`
  - Set final variant: precisa `comic_final_manifest.json` (marca warning quando variante indisponível para uma página)

### D3. Configuração
- Escolher ação → escolher parâmetros (preset ID / variante / etc.)

### D4. Processamento
- Iteração **sequencial** dos jobs (não paralela)
- Cada item: `BatchItemResult{job_id, status: success|error|skipped, message, action?, warnings?}`

### D5. Progresso
- Sem barra global (limitação atual); mostra spinner e os resultados chegam ao final

### D6. Resultados
- Painel exibe totais + item por item com status

### D7. Falhas parciais
- Um job com erro **não aborta** os outros; aparece como `error` na lista

### D8. Nova tentativa
- Refazer a ação em batch filtrando os que falharam

---

## E. Configuração inicial

### E1. Dependências locais
- Painel de status (ConfigPage) exibe presença/versão de: Calibre, KCC, Tesseract, OCRmyPDF, Ghostscript, `7zz`. **Somente leitura.**

### E2. SMTP
- Editar `.env` no disco (fora do app)
- Testar via `POST /config/test-email` (não envia mensagem, só faz login SMTP)
- Erros: mensagens fixas por categoria (v1.2.2), sem vazar host/user/senha

### E3. Kindle
- Configurar `KINDLE_EMAIL` no `.env`
- Autorizar o remetente SMTP na Amazon (fora do app)

### E4. Motores de tradução
- Argos: instalar pacotes via `argospm install translate-XX_YY` (ou baixar via UI se implementado)
- NLLB: baixar modelo via `scripts/setup_nllb.py` OU habilitar em ConfigPage e o serviço orienta

### E5. Privacidade
- Ler `product-vision-v2.md` seções 7–9 para entender quando o arquivo sai do computador

### E6. Armazenamento
- Retenção em dias configurável (`retention_days`) — `cleanup_service` roda no startup
- Diretórios locais: `storage/input`, `storage/output`, `storage/temp`, `storage/models`, `storage/logs`, `storage/covers`, `storage/backups`
- Nenhum desses é acessível por HTTP (v1.2.1 `files.py`)

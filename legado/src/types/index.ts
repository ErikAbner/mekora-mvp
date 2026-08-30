export interface UploadResponse {
  upload_id: number
  filename: string
  status: string
}

/** Resposta de GET /analyze/{id}, POST /jobs/{id}/metadata e POST /jobs/{id}/cover */
export interface JobResponse {
  upload_id: number
  original_filename: string
  status: string

  page_count: number | null
  is_scanned: boolean | null
  avg_chars_per_page: number | null

  detected_title: string
  detected_author: string
  detected_language: string

  final_title: string
  final_author: string
  final_language: string
  final_filename: string

  ocr_used: boolean
  ocr_status: string
  processed_pdf_path: string | null

  epub_path: string | null
  conversion_status: string
  send_status: string
  send_error: string | null
  kindle_sent?: boolean

  selected_cover_page: number | null
  cover_path: string | null
  thumbnails: string[]

  error_message: string | null

  // Multipformato e modo de processamento (Fase A)
  input_format: string
  processing_mode: string   // "document" | "comic"
  comic_mode: boolean
  manga_rtl: boolean

  // Tradução textual (Fase B)
  translation_enabled: boolean
  source_language: string
  target_language: string
  translation_status: string  // not_started | in_progress | done | failed | skipped
  translation_error: string | null
  translator_engine: string
  translated_artifact_path: string | null
  translated_artifact_format: string

  // Fase D — tradução experimental de quadrinhos
  comic_translation_enabled: boolean
  comic_translation_status: string
  comic_translation_error: string | null
  comic_translation_artifact_path: string | null
  comic_translation_artifact_format: string

  // Estabilização v1 — export final de quadrinhos
  comic_export_status?: string   // not_started | in_progress | done | failed
  comic_export_path?: string | null
  comic_export_source?: string   // finished_pages | final_pages | ""
  comic_export_error?: string | null
  flow_mode?: string             // advanced | recommended
  active_operation?: string | null

  created_at: string
  updated_at: string
}

export interface HistoryEntry {
  upload_id: number
  original_filename: string
  final_title: string
  final_author: string
  final_language: string
  status: string
  is_scanned: boolean | null
  ocr_used: boolean
  conversion_status: string
  send_status: string
  send_error: string | null
  kindle_sent: boolean
  error_message: string | null

  // Multipformato e modo de processamento (Fase A)
  input_format: string
  processing_mode: string

  // Fase K — campos extras para batch mode
  translation_enabled: boolean
  translation_status: string
  comic_translation_enabled: boolean
  comic_translation_status: string
  comic_mode: boolean
  manga_rtl: boolean

  created_at: string
  updated_at?: string
}

// ---------------------------------------------------------------------------
// Fase K — Presets e Modo Lote
// ---------------------------------------------------------------------------

export interface Preset {
  id: string
  name: string
  description: string
  is_system: boolean
  created_at: string | null
  updated_at: string | null
  processing_mode: string
  comic_mode: boolean
  manga_rtl: boolean
  translation_enabled: boolean
  source_language: string
  target_language: string
  translator_engine: string
  nllb_model_name: string
  nllb_device_preference: string
}

export interface PresetListResponse {
  presets: Preset[]
}

export interface PresetCreate {
  name: string
  description?: string
  processing_mode?: string
  comic_mode?: boolean
  manga_rtl?: boolean
  translation_enabled?: boolean
  source_language?: string
  target_language?: string
  translator_engine?: string
  nllb_model_name?: string
  nllb_device_preference?: string
}

export interface BatchItemResult {
  job_id: number
  status: 'success' | 'error' | 'skipped'
  message: string
  action?: string | null
  warnings?: string[] | null
}

export interface BatchResult {
  total: number
  succeeded: number
  failed: number
  skipped: number
  item_results: BatchItemResult[]
}

export interface BatchJobsResponse {
  jobs: HistoryEntry[]
  total: number
}

export interface Config {
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass_set: boolean
  kindle_email: string
}

export interface MetadataUpdate {
  final_title?: string
  final_author?: string
  final_language?: string
  final_filename?: string
  // Fase A
  comic_mode?: boolean
  manga_rtl?: boolean
  processing_mode?: string
  // Fase B
  translation_enabled?: boolean
  source_language?: string
  target_language?: string
  // Fase D
  comic_translation_enabled?: boolean
  // Estabilização v1 — P3
  flow_mode?: string
}

export interface TestEmailResponse {
  success: boolean
  message: string
}

export interface JobStatusResponse {
  upload_id: number
  status: string
  ocr_status: string
  conversion_status: string
  send_status: string
  translation_status: string
  comic_translation_status: string
  error_message: string | null
  send_error: string | null

  // Estabilização v1
  comic_export_status?: string
  comic_export_error?: string | null
  flow_mode?: string
  active_operation?: string | null
  progress?: OperationProgress | null
  phase?: string
}

// Estabilização v1 — progresso de operação (P4)
export interface OperationProgress {
  operation_id: string
  operation_type: string
  stage: string
  current: number
  total: number | null
  percent: number | null
  message: string | null
  started_at: string
  updated_at: string
  status: string // running | completed | failed | cancelled | interrupted
}

export interface AppConfig {
  ocr_languages: string[]
  retention_days: number
  polling_interval_ms: number
  ui_language: string
  ui_theme: string
  kcc_profile: string   // Fase A
  // Fase B — tradução
  translation_enabled_by_default: boolean
  preferred_source_language: string
  preferred_target_language: string
  translator_engine_default: string
  // Fase C — NLLB (motor premium local)
  nllb_enabled: boolean
  nllb_model_name: string
  nllb_device_preference: string
}

// ---------------------------------------------------------------------------
// Fase E — Revisão humana do sidecar de tradução de quadrinhos
// ---------------------------------------------------------------------------

export interface ReviewBlock {
  block_id: string
  original_text: string
  translated_text: string
  reviewed_text: string
  review_status: 'pending' | 'approved' | 'edited' | 'skipped'
  confidence: number | null
  bbox: number[] | null
}

export interface ReviewPage {
  page_number: number
  blocks: ReviewBlock[]
  error: string | null
}

export interface ReviewSidecar {
  job_id: number | null
  source_language: string
  target_language: string
  pages: ReviewPage[]
}

export interface ReviewStats {
  total: number
  pending: number
  approved: number
  edited: number
  skipped: number
}

export interface ComicReviewResponse {
  sidecar: ReviewSidecar
  stats: ReviewStats
}

export interface BlockPatch {
  block_id: string
  reviewed_text?: string
  review_status?: string
}

export interface ComicReviewExportResponse {
  json_path: string
  html_path: string
  md_path: string
}

// ---------------------------------------------------------------------------
// Fase F — Overlay visual experimental
// ---------------------------------------------------------------------------

export interface OverlayBlock {
  block_id: string
  original_text: string
  translated_text: string
  reviewed_text: string
  review_status: 'pending' | 'approved' | 'edited' | 'skipped'
  bbox: number[] | null            // [x, y, w, h] normalizado 0..1
  overlay_position: number[] | null // [x, y, w, h] — override do usuário (Fase G)
  overlay_style: Record<string, string | number> | null
  overlay_visibility: boolean
}

export interface OverlayPage {
  page_number: number
  image_path: string | null        // /storage/output/{id}/pages/page_NNN.jpg
  blocks: OverlayBlock[]
  error: string | null
}

export interface OverlaySidecar {
  job_id: number | null
  source_language: string
  target_language: string
  pages: OverlayPage[]
}

export interface OverlayResponse {
  sidecar: OverlaySidecar
  stats: ReviewStats
}

export interface OverlayPatch {
  block_id: string
  reviewed_text?: string
  review_status?: string
  overlay_position?: number[] | null
  overlay_visibility?: boolean
  overlay_style?: Record<string, string | number> | null
}

export interface OverlayExportResponse {
  json_path: string
  html_path: string
}

// ---------------------------------------------------------------------------
// Fase H — Renderização visual não destrutiva
// ---------------------------------------------------------------------------

export interface RenderPageResult {
  page_number: number
  rendered_path: string | null
  serve_path: string | null
  warnings: string[]
  error: string | null
}

export interface RenderManifest {
  job_id: number | null
  source_language: string
  target_language: string
  total_pages: number
  rendered_pages: number
  total_visible_blocks: number
  pages: RenderPageResult[]
  zip_path: string | null
  cbz_path: string | null
}

export interface RenderResponse {
  manifest: RenderManifest
}

// ---------------------------------------------------------------------------
// Fase I.A — Inpainting experimental não destrutivo
// ---------------------------------------------------------------------------

export interface InpaintParams {
  algorithm: string       // "telea" | "ns" | "blur"
  mask_padding: number
  inpaint_radius: number
  feather: number
}

export interface InpaintPageResult {
  page_number: number
  inpainted_path: string | null
  serve_path: string | null
  masked_blocks: number
  algorithm_used: string
  warnings: string[]
  error: string | null
}

export interface InpaintManifest {
  job_id: number | null
  source_language: string
  target_language: string
  total_pages: number
  inpainted_pages: number
  params: InpaintParams
  pages: InpaintPageResult[]
  zip_path: string | null
}

export interface InpaintResponse {
  manifest: InpaintManifest
}

// ---------------------------------------------------------------------------
// Fase I.B — Curadoria visual e export final derivado
// ---------------------------------------------------------------------------

export interface FinalPageEntry {
  page_number: number
  selected_variant: string            // "original" | "render_overlay" | "inpaint"
  available_variants: string[]
  notes: string | null
  updated_at: string | null
  serve_paths: Record<string, string> // variant → serve_path
  final_serve_path: string | null
  export_error: string | null
  selection_source: string            // "default" | "manual" | "auto"
}

export interface FinalManifest {
  job_id: number | null
  total_pages: number
  pages: FinalPageEntry[]
  summary: Record<string, number>     // {original: N, render_overlay: N, inpaint: N}
  exported_pages: number
  zip_path: string | null
  cbz_path: string | null
  pdf_path?: string | null            // Fase J.A — PDF derivado
}

export interface FinalResponse {
  manifest: FinalManifest
}

export interface FinalPagePatch {
  page_number: number
  selected_variant: string
  notes?: string | null
}

// ---------------------------------------------------------------------------
// Fase I.C — Curadoria semi-automática e operações em lote
// ---------------------------------------------------------------------------

export interface SuggestionPageEntry {
  page_number: number
  available_variants: string[]
  scores: Record<string, number>     // {original: 0.5, render_overlay: 0.85, ...}
  suggested_variant: string
  confidence_score: number           // 0.0 – 1.0
  reasons: string[]
  review_required: boolean
}

export interface SuggestionManifest {
  job_id: number | null
  total_pages: number
  computed_at: string | null
  pages: SuggestionPageEntry[]
}

export interface SuggestionResponse {
  manifest: SuggestionManifest
}

export interface ApplySuggestionsRequest {
  only_undecided: boolean
  min_confidence: number
}

export interface ApplySuggestionsResponse {
  manifest: FinalManifest
  applied_count: number
}

// ---------------------------------------------------------------------------
// Fase J.A — Pipeline de export final derivado controlado
// ---------------------------------------------------------------------------

export interface ExportPageResult {
  page_number: number
  selected_variant: string
  source_path: string | null
  final_path: string | null
  exported_at: string | null
  selection_source: string
  notes: string | null
  error: string | null
}

export interface ExportManifest {
  job_id: number | null
  exported_at: string | null
  total_pages: number
  pdf_path: string | null
  pages: ExportPageResult[]
}

export interface ExportResponse {
  manifest: ExportManifest
}

export interface TranslationEngine {
  id: string
  name: string
  available: boolean
  note: string | null
}

export interface TranslationEnginesResponse {
  engines: TranslationEngine[]
  default: string
}

export interface NllbModelStatus {
  torch_installed: boolean
  transformers_installed: boolean
  model_available: boolean
  model_name: string
  model_path: string
  setup_command: string
}

export interface TranslationModelsStatusResponse {
  nllb: NllbModelStatus
}

// ---------------------------------------------------------------------------
// Fase L — Métricas do pipeline
// ---------------------------------------------------------------------------

export interface MetricsSummary {
  total: number
  done: number
  error: number
  pending_send: number
  in_progress: number
}

export interface StageStats {
  stage: string
  total: number
  completed: number
  failed: number
  avg_ms: number | null
  p95_ms: number | null
  fail_pct: number
}

export interface FailureEntry {
  job_id: number
  stage: string
  error_type: string | null
  error_message: string | null
  created_at: string
}

export interface JobTimelineEntry {
  stage: string
  status: string
  duration_ms: number | null
  started_at: string | null
  error_type: string | null
}

// ---------------------------------------------------------------------------
// Fase N.A — Acabamento visual assistido (finished_pages)
// ---------------------------------------------------------------------------

export interface FinishAdjustments {
  contrast: number
  brightness: number
  sharpness: number
  saturation: number
}

export interface LayoutIssue {
  issue_type: string
  block_id: string
  severity: 'warning' | 'error'
  detail: string
}

export interface LayoutSuggestion {
  font_scale: number
  detail: string
  has_overflow: boolean
  has_low_contrast: boolean
}

export interface FinishPageEntry {
  page_number: number
  source_variant: string
  preset_override: string | null
  adjustments_override: FinishAdjustments | null
  source_path: string | null
  finished_path: string | null
  exported_at: string | null
  warnings: string[]
  layout_issues?: LayoutIssue[]
  suggested_adjustments?: LayoutSuggestion | null
  auto_adjustments_applied?: boolean
}

export interface FinishManifest {
  job_id: number
  global_preset: string
  global_adjustments: FinishAdjustments
  pages: FinishPageEntry[]
  zip_path: string | null
  cbz_path: string | null
  pdf_path: string | null
  auto_fix_layout?: boolean
  analyzed_at?: string | null
}

export interface FinishResponse {
  manifest: FinishManifest
  quality_score?: number | null
}

export interface FinishPagePatch {
  page_number: number
  preset_override?: string | null
  adjustments_override?: FinishAdjustments | null
}

export interface FinishGlobalPatch {
  global_preset?: string | null
  global_adjustments?: FinishAdjustments | null
  page_patches?: FinishPagePatch[]
  auto_fix_layout?: boolean
}

// ---------------------------------------------------------------------------
// Fase O — Consistência Visual Global
// ---------------------------------------------------------------------------

export interface ConsistencyStats {
  mean: number
  std: number
  min: number
  max: number
}

export interface ImageMetrics {
  mean_brightness: number
  rms_contrast: number
  histogram_entropy: number
  dark_fraction: number
  light_fraction: number
}

export interface ConsistencyPageEntry {
  page_number: number
  effective_adjustments: Record<string, number>
  is_outlier: boolean
  outlier_reasons: string[]
  is_manual_override: boolean
  excluded_from_harmonization: boolean
  harmonization_applied: boolean
  image_metrics?: ImageMetrics | null
  is_visual_outlier?: boolean
  visual_outlier_reasons?: string[]
  preview_path?: string | null
}

export interface ConsistencyManifest {
  job_id: number
  analyzed_at: string | null
  consistency_score: number
  page_count: number
  stat_distributions: Record<string, ConsistencyStats>
  preset_frequency: Record<string, number>
  suggested_global_style: Record<string, number> | null
  global_recommendations: string[]
  pages: ConsistencyPageEntry[]
  warnings: string[]
  harmonization_applied_at: string | null
  consistency_score_visual?: number | null
  consistency_score_combined?: number | null
  visual_analyzed_at?: string | null
  preview_generated_at?: string | null
}

export interface ConsistencyResponse {
  manifest: ConsistencyManifest
}

// ---------------------------------------------------------------------------
// Fase P.B — Recomendação de preset assistida
// ---------------------------------------------------------------------------

export interface PresetPreviewEntry {
  page_number: number
  preview_path: string | null
}

export interface PresetRecommendation {
  job_id: number
  recommended_preset: string
  alternatives: string[]
  reasons: string[]
  confidence_score: number
  page_level_exceptions: Array<{ page_number: number; reason: string }>
  applied_preset: string | null
  manual_overrides_present: boolean
  recommended_at: string | null
  applied_at: string | null
  preview_entries: PresetPreviewEntry[]
}

export interface PresetRecommendationResponse {
  recommendation: PresetRecommendation
}

export interface PresetApplyBody {
  preset: string
  mode: 'apply_to_all_eligible' | 'apply_to_filtered' | 'reset_to_previous'
  target_pages?: number[]
}

// ---------------------------------------------------------------------------
// Fase Q — Health check e repair de job
// ---------------------------------------------------------------------------

export interface JobHealthCheck {
  name: string
  ok: boolean
  detail: string
}

export interface JobHealthResponse {
  job_id: number
  is_healthy: boolean
  checks: JobHealthCheck[]
  manifests_present: string[]
  manifests_missing: string[]
  recommended_next_action: string
}

export interface JobRepairResponse {
  job_id: number
  repaired: string[]
  not_repaired: string[]
  health: JobHealthResponse
}

// ---------------------------------------------------------------------------
// Estabilização v1 — Export final de quadrinhos + pipeline state
// ---------------------------------------------------------------------------

export interface PipelineStep {
  id: string
  status: 'done' | 'available' | 'blocked'
  blocked_reason: string | null
  prerequisite_step: string | null
}

export interface PipelineStateResponse {
  job_id: number
  processing_mode: string
  render_done: boolean
  steps: PipelineStep[]
  current_step: string
}

export interface ComicExportPageEntry {
  file: string
  page_id: number
  selected_variant: string
  origin: string
  visual_translation_applied: boolean
  size: number
  mtime: number
}

export type TranslationState = 'full' | 'partial' | 'none' | 'not_applicable'

export interface ComicExportManifest {
  manifest_version: number
  job_id: number
  source: string
  source_dir: string
  page_count: number
  pages: ComicExportPageEntry[]
  pages_digest: string
  staging_cbz: string
  cbz_serve_path: string
  epub_path: string | null
  epub_serve_path: string | null
  epub_size_bytes: number | null
  size_warning: boolean
  title: string
  author: string
  language: string
  translation_included: boolean
  translation_state: TranslationState
  kcc_profile: string
  manga_rtl: boolean
  exported_at: string
  cached?: boolean
}

export interface ComicExportResponse {
  job_id: number
  comic_export_status: string
  comic_export_error: string | null
  manifest: ComicExportManifest | null
  epub_url: string | null
  cbz_url: string | null
}

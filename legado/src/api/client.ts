import axios from 'axios'
import type {
  AppConfig,
  BlockPatch,
  ComicReviewExportResponse,
  ComicReviewResponse,
  Config,
  HistoryEntry,
  JobResponse,
  JobStatusResponse,
  MetadataUpdate,
  OverlayExportResponse,
  OverlayPatch,
  OverlayResponse,
  TestEmailResponse,
  TranslationEnginesResponse,
  TranslationModelsStatusResponse,
  UploadResponse,
} from '../types'

export const API_BASE: string = import.meta.env.VITE_API_URL ?? ''

const api = axios.create({
  baseURL: API_BASE,
})

// ---------------------------------------------------------------------------
// Upload de PDF
// ---------------------------------------------------------------------------

export const uploadPdf = async (file: File): Promise<UploadResponse> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<UploadResponse>('/upload', form)
  return data
}

// ---------------------------------------------------------------------------
// Análise e edição
// ---------------------------------------------------------------------------

export const analyzeUpload = async (uploadId: number): Promise<JobResponse> => {
  const { data } = await api.get<JobResponse>(`/analyze/${uploadId}`)
  return data
}

export const getJob = async (jobId: number): Promise<JobResponse> => {
  const { data } = await api.get<JobResponse>(`/jobs/${jobId}`)
  return data
}

export const getJobStatus = async (jobId: number): Promise<JobStatusResponse> => {
  const { data } = await api.get<JobStatusResponse>(`/jobs/${jobId}/status`)
  return data
}

export const updateMetadata = async (
  jobId: number,
  update: MetadataUpdate,
): Promise<JobResponse> => {
  const { data } = await api.post<JobResponse>(`/jobs/${jobId}/metadata`, update)
  return data
}

export const sendToKindle = async (jobId: number): Promise<JobResponse> => {
  const { data } = await api.post<JobResponse>(`/jobs/${jobId}/send`)
  return data
}

export const retrySend = async (jobId: number): Promise<JobResponse> => {
  const { data } = await api.post<JobResponse>(`/pending-send/${jobId}/retry`)
  return data
}

export const convertJob = async (jobId: number): Promise<JobResponse> => {
  const { data } = await api.post<JobResponse>(`/jobs/${jobId}/convert`)
  return data
}

export const comicConvertJob = async (jobId: number): Promise<JobResponse> => {
  const { data } = await api.post<JobResponse>(`/jobs/${jobId}/comic-convert`)
  return data
}

export const translateJob = async (jobId: number): Promise<JobResponse> => {
  const { data } = await api.post<JobResponse>(`/jobs/${jobId}/translate`)
  return data
}

export const comicTranslateJob = async (
  jobId: number,
  params: { source_language?: string; target_language?: string; translator_engine?: string },
): Promise<JobResponse> => {
  const { data } = await api.post<JobResponse>(`/jobs/${jobId}/comic-translate`, params)
  return data
}

export const updateCover = async (jobId: number, page: number): Promise<JobResponse> => {
  const { data } = await api.post<JobResponse>(`/jobs/${jobId}/cover`, {
    selected_cover_page: page,
  })
  return data
}

// ---------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------

export const getHistory = async (): Promise<HistoryEntry[]> => {
  const { data } = await api.get<HistoryEntry[]>('/history')
  return data
}

// ---------------------------------------------------------------------------
// Configuração SMTP
// ---------------------------------------------------------------------------

export const getAppConfig = async (): Promise<AppConfig> => {
  const { data } = await api.get<AppConfig>('/app-config')
  return data
}

export const updateAppConfig = async (updates: Partial<AppConfig>): Promise<AppConfig> => {
  const { data } = await api.patch<AppConfig>('/app-config', updates)
  return data
}

export const getConfig = async (): Promise<Config> => {
  const { data } = await api.get<Config>('/config')
  return data
}

export const testEmail = async (): Promise<TestEmailResponse> => {
  const { data } = await api.post<TestEmailResponse>('/config/test-email')
  return data
}

// ---------------------------------------------------------------------------
// Estado das engines de tradução — Fase C
// ---------------------------------------------------------------------------

export const getTranslationEnginesStatus = async (): Promise<TranslationEnginesResponse> => {
  const { data } = await api.get<TranslationEnginesResponse>('/translation/engines')
  return data
}

export const getArgosAvailablePairs = async (): Promise<{ argos: { src: string; tgt: string }[] }> => {
  const { data } = await api.get<{ argos: { src: string; tgt: string }[] }>('/translation/engines/pairs')
  return data
}

export interface ComicToolsStatus {
  kcc: { available: boolean; path: string | null }
  argos: { library_installed: boolean; pairs: { src: string; tgt: string }[] }
}

export const getComicToolsStatus = async (): Promise<ComicToolsStatus> => {
  const { data } = await api.get<ComicToolsStatus>('/tools/comic-status')
  return data
}

export const getTranslationModelsStatus = async (): Promise<TranslationModelsStatusResponse> => {
  const { data } = await api.get<TranslationModelsStatusResponse>('/translation/models/status')
  return data
}

// ---------------------------------------------------------------------------
// Revisão humana do sidecar de quadrinhos — Fase E
// ---------------------------------------------------------------------------

export const getComicReview = async (jobId: number): Promise<ComicReviewResponse> => {
  const { data } = await api.get<ComicReviewResponse>(`/jobs/${jobId}/comic-translation/review`)
  return data
}

export const patchComicReview = async (
  jobId: number,
  patches: BlockPatch[],
): Promise<ComicReviewResponse> => {
  const { data } = await api.patch<ComicReviewResponse>(
    `/jobs/${jobId}/comic-translation/review`,
    { patches },
  )
  return data
}

export const exportComicReview = async (jobId: number): Promise<ComicReviewExportResponse> => {
  const { data } = await api.post<ComicReviewExportResponse>(
    `/jobs/${jobId}/comic-translation/review/export`,
  )
  return data
}

// ---------------------------------------------------------------------------
// Overlay visual experimental — Fase F
// ---------------------------------------------------------------------------

export const getComicOverlay = async (jobId: number): Promise<OverlayResponse> => {
  const { data } = await api.get<OverlayResponse>(`/jobs/${jobId}/comic-overlay`)
  return data
}

export const patchComicOverlay = async (
  jobId: number,
  patches: OverlayPatch[],
): Promise<OverlayResponse> => {
  const { data } = await api.patch<OverlayResponse>(
    `/jobs/${jobId}/comic-overlay`,
    { patches },
  )
  return data
}

export const exportComicOverlay = async (jobId: number): Promise<OverlayExportResponse> => {
  const { data } = await api.post<OverlayExportResponse>(
    `/jobs/${jobId}/comic-overlay/export`,
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase H — Renderização visual não destrutiva
// ---------------------------------------------------------------------------

export const renderComic = async (jobId: number): Promise<import('../types').RenderResponse> => {
  const { data } = await api.post<import('../types').RenderResponse>(
    `/jobs/${jobId}/comic-render`,
  )
  return data
}

export const getRenderManifest = async (
  jobId: number,
): Promise<import('../types').RenderResponse> => {
  const { data } = await api.get<import('../types').RenderResponse>(
    `/jobs/${jobId}/comic-render`,
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase I.A — Inpainting experimental não destrutivo
// ---------------------------------------------------------------------------

export const inpaintComic = async (
  jobId: number,
  params: { algorithm?: string; mask_padding?: number; inpaint_radius?: number; feather?: number },
): Promise<import('../types').InpaintResponse> => {
  const { data } = await api.post<import('../types').InpaintResponse>(
    `/jobs/${jobId}/comic-inpaint`,
    { params },
  )
  return data
}

export const getInpaintManifest = async (
  jobId: number,
): Promise<import('../types').InpaintResponse> => {
  const { data } = await api.get<import('../types').InpaintResponse>(
    `/jobs/${jobId}/comic-inpaint`,
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase I.B — Curadoria visual e export final derivado
// ---------------------------------------------------------------------------

export const initFinalManifest = async (
  jobId: number,
): Promise<import('../types').FinalResponse> => {
  const { data } = await api.post<import('../types').FinalResponse>(
    `/jobs/${jobId}/comic-finalize`,
  )
  return data
}

export const getFinalManifest = async (
  jobId: number,
): Promise<import('../types').FinalResponse> => {
  const { data } = await api.get<import('../types').FinalResponse>(
    `/jobs/${jobId}/comic-finalize`,
  )
  return data
}

export const patchFinalManifest = async (
  jobId: number,
  patches: import('../types').FinalPagePatch[],
): Promise<import('../types').FinalResponse> => {
  const { data } = await api.patch<import('../types').FinalResponse>(
    `/jobs/${jobId}/comic-finalize`,
    { patches },
  )
  return data
}

export const exportFinalPages = async (
  jobId: number,
): Promise<import('../types').FinalResponse> => {
  const { data } = await api.post<import('../types').FinalResponse>(
    `/jobs/${jobId}/comic-finalize/export`,
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase I.C — Curadoria semi-automática e operações em lote
// ---------------------------------------------------------------------------

export const getSuggestions = async (
  jobId: number,
): Promise<import('../types').SuggestionResponse> => {
  const { data } = await api.get<import('../types').SuggestionResponse>(
    `/jobs/${jobId}/comic-suggestions`,
  )
  return data
}

export const recomputeSuggestions = async (
  jobId: number,
): Promise<import('../types').SuggestionResponse> => {
  const { data } = await api.post<import('../types').SuggestionResponse>(
    `/jobs/${jobId}/comic-suggestions/recompute`,
  )
  return data
}

export const applySuggestions = async (
  jobId: number,
  body: import('../types').ApplySuggestionsRequest,
): Promise<import('../types').ApplySuggestionsResponse> => {
  const { data } = await api.post<import('../types').ApplySuggestionsResponse>(
    `/jobs/${jobId}/comic-finalize/apply-suggestions`,
    body,
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase J.A — Pipeline de export final derivado controlado
// ---------------------------------------------------------------------------

export const getExportManifest = async (
  jobId: number,
): Promise<import('../types').ExportResponse> => {
  const { data } = await api.get<import('../types').ExportResponse>(
    `/jobs/${jobId}/comic-finalize/export`,
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase K — Presets
// ---------------------------------------------------------------------------

export const getPresets = async (): Promise<import('../types').PresetListResponse> => {
  const { data } = await api.get<import('../types').PresetListResponse>('/presets')
  return data
}

export const createPreset = async (
  body: import('../types').PresetCreate,
): Promise<import('../types').Preset> => {
  const { data } = await api.post<import('../types').Preset>('/presets', body)
  return data
}

export const updatePreset = async (
  presetId: string,
  body: Partial<import('../types').PresetCreate>,
): Promise<import('../types').Preset> => {
  const { data } = await api.put<import('../types').Preset>(`/presets/${presetId}`, body)
  return data
}

export const deletePreset = async (presetId: string): Promise<void> => {
  await api.delete(`/presets/${presetId}`)
}

export const duplicatePreset = async (
  presetId: string,
  newName?: string,
): Promise<import('../types').Preset> => {
  const { data } = await api.post<import('../types').Preset>(
    `/presets/${presetId}/duplicate`,
    { new_name: newName },
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase K — Batch
// ---------------------------------------------------------------------------

export const getBatchJobs = async (params?: {
  status?: string
  processing_mode?: string
  input_format?: string
  send_pending?: boolean
  translation_enabled?: boolean
}): Promise<import('../types').BatchJobsResponse> => {
  const { data } = await api.get<import('../types').BatchJobsResponse>('/batch/jobs', { params })
  return data
}

export const batchApplyPreset = async (
  jobIds: number[],
  presetId: string,
): Promise<import('../types').BatchResult> => {
  const { data } = await api.post<import('../types').BatchResult>('/batch/apply-preset', {
    job_ids: jobIds,
    preset_id: presetId,
  })
  return data
}

export const batchExport = async (
  jobIds: number[],
): Promise<import('../types').BatchResult> => {
  const { data } = await api.post<import('../types').BatchResult>('/batch/export', {
    job_ids: jobIds,
  })
  return data
}

export const batchApplySuggestions = async (
  jobIds: number[],
  options?: { only_undecided?: boolean; min_confidence?: number },
): Promise<import('../types').BatchResult> => {
  const { data } = await api.post<import('../types').BatchResult>('/batch/apply-suggestions', {
    job_ids: jobIds,
    only_undecided: options?.only_undecided ?? true,
    min_confidence: options?.min_confidence ?? 0.0,
  })
  return data
}

export const batchRetrySend = async (
  jobIds: number[],
): Promise<import('../types').BatchResult> => {
  const { data } = await api.post<import('../types').BatchResult>('/batch/retry-send', {
    job_ids: jobIds,
  })
  return data
}

export const batchSetFinalVariant = async (
  jobIds: number[],
  variant: string,
): Promise<import('../types').BatchResult> => {
  const { data } = await api.post<import('../types').BatchResult>('/batch/set-final-variant', {
    job_ids: jobIds,
    variant,
  })
  return data
}

export const applyPresetToJob = async (
  jobId: number,
  presetId: string,
): Promise<import('../types').JobResponse> => {
  const { data } = await api.post<import('../types').JobResponse>(
    `/jobs/${jobId}/apply-preset`,
    { preset_id: presetId },
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase M — Duplicação de job
// ---------------------------------------------------------------------------

export const duplicateJob = async (jobId: number): Promise<import('../types').JobResponse> => {
  const { data } = await api.post<import('../types').JobResponse>(
    `/jobs/${jobId}/duplicate`,
    { mode: 'metadata_only' },
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase L — Métricas do pipeline
// ---------------------------------------------------------------------------

export const getMetricsSummary = async (): Promise<import('../types').MetricsSummary> => {
  const { data } = await api.get<import('../types').MetricsSummary>('/metrics/summary')
  return data
}

export const getMetricsStages = async (): Promise<import('../types').StageStats[]> => {
  const { data } = await api.get<import('../types').StageStats[]>('/metrics/stages')
  return data
}

export const getMetricsFailures = async (): Promise<import('../types').FailureEntry[]> => {
  const { data } = await api.get<import('../types').FailureEntry[]>('/metrics/failures')
  return data
}

export const getMetricsUsage = async (): Promise<Record<string, Record<string, number>>> => {
  const { data } = await api.get<Record<string, Record<string, number>>>('/metrics/usage')
  return data
}

export const getJobMetricsTimeline = async (
  jobId: number,
): Promise<import('../types').JobTimelineEntry[]> => {
  const { data } = await api.get<import('../types').JobTimelineEntry[]>(`/metrics/jobs/${jobId}`)
  return data
}

// ---------------------------------------------------------------------------
// Fase N.A — Acabamento visual assistido
// ---------------------------------------------------------------------------

export const getComicFinish = async (jobId: number): Promise<import('../types').FinishResponse> => {
  const { data } = await api.get<import('../types').FinishResponse>(
    `/jobs/${jobId}/comic-finish`,
  )
  return data
}

export const initComicFinish = async (jobId: number): Promise<import('../types').FinishResponse> => {
  const { data } = await api.post<import('../types').FinishResponse>(
    `/jobs/${jobId}/comic-finish`,
  )
  return data
}

export const patchComicFinish = async (
  jobId: number,
  body: import('../types').FinishGlobalPatch,
): Promise<import('../types').FinishResponse> => {
  const { data } = await api.patch<import('../types').FinishResponse>(
    `/jobs/${jobId}/comic-finish`,
    body,
  )
  return data
}

export const exportComicFinish = async (
  jobId: number,
): Promise<import('../types').FinishResponse> => {
  const { data } = await api.post<import('../types').FinishResponse>(
    `/jobs/${jobId}/comic-finish/export`,
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase O — Consistência Visual Global
// ---------------------------------------------------------------------------

export const getComicConsistency = async (
  jobId: number,
): Promise<import('../types').ConsistencyResponse> => {
  const { data } = await api.get<import('../types').ConsistencyResponse>(
    `/jobs/${jobId}/comic-consistency`,
  )
  return data
}

export const analyzeComicConsistency = async (
  jobId: number,
): Promise<import('../types').ConsistencyResponse> => {
  const { data } = await api.post<import('../types').ConsistencyResponse>(
    `/jobs/${jobId}/comic-consistency/analyze`,
  )
  return data
}

export const applyComicConsistency = async (
  jobId: number,
  body: { mode: 'apply' | 'reset' },
): Promise<import('../types').ConsistencyResponse> => {
  const { data } = await api.post<import('../types').ConsistencyResponse>(
    `/jobs/${jobId}/comic-consistency/apply`,
    body,
  )
  return data
}

export const patchConsistencyPage = async (
  jobId: number,
  pageNumber: number,
  body: { is_manual_override?: boolean; excluded_from_harmonization?: boolean },
): Promise<import('../types').ConsistencyResponse> => {
  const { data } = await api.patch<import('../types').ConsistencyResponse>(
    `/jobs/${jobId}/comic-consistency/page/${pageNumber}`,
    body,
  )
  return data
}

export const analyzeVisualConsistency = async (
  jobId: number,
): Promise<import('../types').ConsistencyResponse> => {
  const { data } = await api.post<import('../types').ConsistencyResponse>(
    `/jobs/${jobId}/comic-consistency/analyze-visual`,
  )
  return data
}

export const analyzeComicLayout = async (
  jobId: number,
): Promise<import('../types').FinishResponse> => {
  const { data } = await api.post<import('../types').FinishResponse>(
    `/jobs/${jobId}/comic-finish/analyze`,
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase P.B — Recomendação de preset
// ---------------------------------------------------------------------------

export const getPresetRecommendation = async (
  jobId: number,
): Promise<import('../types').PresetRecommendationResponse> => {
  const { data } = await api.get<import('../types').PresetRecommendationResponse>(
    `/jobs/${jobId}/comic-preset-recommendation`,
  )
  return data
}

export const recommendPreset = async (
  jobId: number,
): Promise<import('../types').PresetRecommendationResponse> => {
  const { data } = await api.post<import('../types').PresetRecommendationResponse>(
    `/jobs/${jobId}/comic-preset-recommendation/recommend`,
  )
  return data
}

export const applyPresetRecommendation = async (
  jobId: number,
  body: import('../types').PresetApplyBody,
): Promise<import('../types').PresetRecommendationResponse> => {
  const { data } = await api.post<import('../types').PresetRecommendationResponse>(
    `/jobs/${jobId}/comic-preset-recommendation/apply`,
    body,
  )
  return data
}

export const previewPreset = async (
  jobId: number,
  preset: string,
): Promise<import('../types').PresetRecommendationResponse> => {
  const { data } = await api.post<import('../types').PresetRecommendationResponse>(
    `/jobs/${jobId}/comic-preset-recommendation/preview`,
    null,
    { params: { preset } },
  )
  return data
}

// ---------------------------------------------------------------------------
// Fase Q — Health check e repair de job
// ---------------------------------------------------------------------------

export const getJobHealth = async (
  jobId: number,
): Promise<import('../types').JobHealthResponse> => {
  const { data } = await api.get<import('../types').JobHealthResponse>(
    `/jobs/${jobId}/health`,
  )
  return data
}

export const repairJob = async (
  jobId: number,
): Promise<import('../types').JobRepairResponse> => {
  const { data } = await api.post<import('../types').JobRepairResponse>(
    `/jobs/${jobId}/repair`,
  )
  return data
}

export default api

// ---------------------------------------------------------------------------
// Estabilização v1 — Export final de quadrinhos + pipeline state
// ---------------------------------------------------------------------------

export const getPipelineState = async (
  jobId: number,
): Promise<import('../types').PipelineStateResponse> => {
  const { data } = await api.get<import('../types').PipelineStateResponse>(
    `/jobs/${jobId}/pipeline-state`,
  )
  return data
}

export const startComicExport = async (
  jobId: number,
  body?: { target?: 'epub' | 'cbz'; force?: boolean },
): Promise<import('../types').ComicExportResponse> => {
  const { data } = await api.post<import('../types').ComicExportResponse>(
    `/jobs/${jobId}/comic-export`,
    body ?? {},
  )
  return data
}

export const getComicExport = async (
  jobId: number,
): Promise<import('../types').ComicExportResponse> => {
  const { data } = await api.get<import('../types').ComicExportResponse>(
    `/jobs/${jobId}/comic-export`,
  )
  return data
}

export const cancelOperation = async (
  jobId: number,
  operationId: string,
): Promise<{ job_id: number; operation_id: string; cancel_requested: boolean }> => {
  const { data } = await api.post(`/jobs/${jobId}/operations/${operationId}/cancel`)
  return data
}

// ---------------------------------------------------------------------------
// Estabilização v1 — P3: Modo Recomendado (quick pipeline)
// ---------------------------------------------------------------------------

export interface QuickPreflightCheck {
  id: string
  ok: boolean
  detail: string
  critical: boolean
}

export interface QuickPreflightResponse {
  job_id: number
  ok: boolean
  checks: QuickPreflightCheck[]
  plan: {
    translation_enabled: boolean
    source_language: string
    target_language: string
    engine: string
    steps_to_run: string[]
    steps_reused: string[]
    steps_skipped_by_design: string[]
    auto_approve_review: boolean
    final_artifact: string
    page_count: number
  }
}

export const getQuickPreflight = async (jobId: number): Promise<QuickPreflightResponse> => {
  const { data } = await api.get<QuickPreflightResponse>(
    `/jobs/${jobId}/comic-quick-pipeline/preflight`,
  )
  return data
}

export const startQuickPipeline = async (
  jobId: number,
): Promise<{ job_id: number; operation_id: string; started: boolean }> => {
  const { data } = await api.post(`/jobs/${jobId}/comic-quick-pipeline`)
  return data
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import { useParams, Link } from 'react-router-dom'
import {
  API_BASE,
  getComicConsistency,
  analyzeComicConsistency,
  analyzeVisualConsistency,
  applyComicConsistency,
  patchConsistencyPage,
  getPresetRecommendation,
  recommendPreset,
  applyPresetRecommendation,
  previewPreset,
} from '../api/client'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import type { ConsistencyManifest, ConsistencyPageEntry, PresetRecommendation } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    score >= 0.9 ? 'bg-green-500' : score >= 0.7 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-zinc-200 w-10 text-right">
        {pct}%
      </span>
    </div>
  )
}

function AdjBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 px-1.5 py-0.5 rounded font-mono">
      {label}={value.toFixed(2)}
    </span>
  )
}

const ADJ_LABELS: Record<string, string> = {
  contrast: 'C',
  brightness: 'B',
  sharpness: 'S',
  saturation: 'Sat',
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ComicConsistencyPage() {
  const { id } = useParams<{ id: string }>()
  const jobId = Number(id)
  const { t } = useTranslation()

  const [manifest, setManifest] = useState<ConsistencyManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzingVisual, setAnalyzingVisual] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opError, setOpError] = useState<string | null>(null)

  const [recommendation, setRecommendation] = useState<PresetRecommendation | null>(null)
  const [recommending, setRecommending] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [applyingPreset, setApplyingPreset] = useState(false)

  const [comparisonPage, setComparisonPage] = useState<number | null>(null)

  useEffect(() => {
    getComicConsistency(jobId)
      .then((r) => setManifest(r.manifest))
      .catch((e) => {
        if (e?.response?.status !== 404) setError(t('consistency.errorLoad'))
      })
      .finally(() => setLoading(false))
    getPresetRecommendation(jobId)
      .then((r) => setRecommendation(r.recommendation))
      .catch(() => {})
  }, [jobId, t])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError(null)
    setOpError(null)
    try {
      const r = await analyzeComicConsistency(jobId)
      setManifest(r.manifest)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404) setOpError(t('consistency.finishRequired'))
      else setError(t('consistency.errorLoad'))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleAnalyzeVisual = async () => {
    setAnalyzingVisual(true)
    setError(null)
    setOpError(null)
    try {
      const r = await analyzeVisualConsistency(jobId)
      setManifest(r.manifest)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404) setOpError(t('consistency.finishRequired'))
      else setError(t('consistency.errorLoad'))
    } finally {
      setAnalyzingVisual(false)
    }
  }

  const handleApply = async (mode: 'apply' | 'reset') => {
    setApplying(true)
    setOpError(null)
    try {
      const r = await applyComicConsistency(jobId, { mode })
      setManifest(r.manifest)
    } catch { setOpError(t('consistency.applyError')) }
    finally { setApplying(false) }
  }

  const handleRecommend = async () => {
    setRecommending(true)
    setOpError(null)
    try {
      const r = await recommendPreset(jobId)
      setRecommendation(r.recommendation)
    } catch { setOpError(t('consistency.applyError')) }
    finally { setRecommending(false) }
  }

  const handlePreviewPreset = async (preset: string) => {
    setPreviewing(true)
    setOpError(null)
    try {
      const r = await previewPreset(jobId, preset)
      setRecommendation(r.recommendation)
    } catch { setOpError(t('consistency.applyError')) }
    finally { setPreviewing(false) }
  }

  const handleApplyPreset = async (mode: 'apply_to_all_eligible' | 'reset_to_previous') => {
    if (!recommendation) return
    setApplyingPreset(true)
    setOpError(null)
    try {
      const r = await applyPresetRecommendation(jobId, {
        preset: mode === 'reset_to_previous' ? 'none' : recommendation.recommended_preset,
        mode,
      })
      setRecommendation(r.recommendation)
    } catch { setOpError(t('consistency.applyError')) }
    finally { setApplyingPreset(false) }
  }

  const handlePagePatch = async (
    pageNumber: number,
    patch: { is_manual_override?: boolean; excluded_from_harmonization?: boolean },
  ) => {
    try {
      const r = await patchConsistencyPage(jobId, pageNumber, patch)
      setManifest(r.manifest)
    } catch { /* silencioso */ }
  }

  // ---------------------------------------------------------------------------
  // Renders
  // ---------------------------------------------------------------------------

  if (!id) {
    return (
      <div className="max-w-3xl mx-auto mt-16 flex flex-col items-center gap-4 text-center">
        <BookOpen size={40} className="text-gray-300 dark:text-zinc-600" aria-hidden="true" />
        <p className="text-lg font-semibold text-gray-700 dark:text-zinc-300">{t('pipeline.emptyTitle')}</p>
        <p className="text-sm text-gray-400 dark:text-zinc-500 max-w-xs">{t('pipeline.emptyHint')}</p>
        <Link to="/" className="mt-2 text-sm text-brand dark:text-indigo-400 hover:underline">
          {t('pipeline.goToQueue')}
        </Link>
      </div>
    )
  }

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-zinc-400">{t('consistency.loading')}</p>
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
            {t('consistency.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            {t('consistency.subtitle')}
          </p>
        </div>
        <Link
          to={`/finish/${jobId}`}
          className="text-xs text-brand dark:text-indigo-400 hover:underline shrink-0 mt-1"
        >
          ← {t('finish.title')}
        </Link>
      </div>

      <Banner variant="info">
        <p className="text-xs">{t('consistency.derivedNote')}</p>
      </Banner>

      {opError && <Banner variant="error">{opError}</Banner>}

      {/* Score hero — full-width, protagonista */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
            {t('consistency.analysis')}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleAnalyze} disabled={analyzing} className="text-xs">
              {analyzing ? t('consistency.analyzing') : t('consistency.analyzeBtn')}
            </Button>
            <Button variant="secondary" onClick={handleAnalyzeVisual} disabled={analyzingVisual} className="text-xs">
              {analyzingVisual ? t('consistency.analyzing') : t('consistency.analyzeVisualBtn')}
            </Button>
            {manifest?.visual_analyzed_at && (
              <span className="text-xs text-gray-400 dark:text-zinc-500 font-mono">
                {manifest.visual_analyzed_at.slice(0, 19)}
              </span>
            )}
          </div>
        </div>

        {manifest ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                {t('consistency.parametric')}
              </p>
              <ScoreBar score={manifest.consistency_score} />
            </div>
            {manifest.consistency_score_visual != null && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                  {t('consistency.visual')}
                </p>
                <ScoreBar score={manifest.consistency_score_visual} />
              </div>
            )}
            {manifest.consistency_score_combined != null && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-700 dark:text-zinc-200">
                  {t('consistency.combined')}
                </p>
                <ScoreBar score={manifest.consistency_score_combined} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-zinc-500">
            {t('consistency.noAnalysis')}
          </p>
        )}
      </div>

      {/* Layout: sidebar (recomendações + preset + harmonização) + lista de páginas */}
      <div className="flex gap-6 items-start">

        {/* Sidebar esquerdo */}
        <aside className="w-64 shrink-0 sticky top-4 space-y-3">

          {/* Recomendações globais + estilo sugerido */}
          {manifest && (manifest.global_recommendations.length > 0 || manifest.suggested_global_style) && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
              {manifest.global_recommendations.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    {t('consistency.analysis')}
                  </p>
                  <ul className="space-y-1">
                    {manifest.global_recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-gray-600 dark:text-zinc-400 flex gap-2">
                        <span className="shrink-0 text-gray-300 dark:text-zinc-600">›</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {manifest.suggested_global_style && (
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">
                    {t('consistency.suggestedStyle')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(manifest.suggested_global_style).map(([k, v]) => (
                      <AdjBadge key={k} label={ADJ_LABELS[k] ?? k} value={v} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preset Recomendado (Fase P.B) */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                  {t('presetRec.title')}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                  {t('presetRec.subtitle')}
                </p>
              </div>
              <Button variant="secondary" onClick={handleRecommend} disabled={recommending} className="text-xs">
                {recommending ? t('presetRec.recommending') : t('presetRec.recommendBtn')}
              </Button>
            </div>

            {!recommendation && !recommending && (
              <p className="text-xs text-gray-400 dark:text-zinc-500">{t('presetRec.noRecommendationHint')}</p>
            )}

            {recommendation && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                      {recommendation.recommended_preset}
                    </span>
                    <span className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 border border-black/[0.06] dark:border-zinc-700 px-1.5 py-0.5 rounded">
                      {t('presetRec.confidence')}: {Math.round(recommendation.confidence_score * 100)}%
                    </span>
                  </div>
                  <ScoreBar score={recommendation.confidence_score} />
                </div>

                {recommendation.reasons.length > 0 && (
                  <ul className="space-y-0.5">
                    {recommendation.reasons.map((r, i) => (
                      <li key={i} className="text-xs text-gray-600 dark:text-zinc-400 flex gap-2">
                        <span className="shrink-0 text-gray-300 dark:text-zinc-600">›</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {recommendation.alternatives.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-gray-400 dark:text-zinc-500 w-full">{t('presetRec.alternatives')}:</span>
                    {recommendation.alternatives.map((alt) => (
                      <span key={alt} className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 px-1.5 py-0.5 rounded font-mono">
                        {alt}
                      </span>
                    ))}
                  </div>
                )}

                {recommendation.applied_preset && (
                  <Banner variant="success">
                    <p className="text-xs">
                      {t('presetRec.appliedBanner', { preset: recommendation.applied_preset })}
                      {recommendation.applied_at && (
                        <span className="font-mono ml-2">{recommendation.applied_at.slice(0, 19)}</span>
                      )}
                    </p>
                  </Banner>
                )}

                {recommendation.manual_overrides_present && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t('presetRec.exceptionNote', { count: recommendation.page_level_exceptions.length })}
                  </p>
                )}

                {recommendation.preview_entries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {recommendation.preview_entries.map((entry) => entry.preview_path && (
                      <a key={entry.page_number} href={entry.preview_path} target="_blank" rel="noreferrer"
                        className="shrink-0" title={`Preview p.${entry.page_number}`}>
                        <img
                          src={entry.preview_path}
                          alt={`Preview preset p.${entry.page_number}`}
                          className="h-14 rounded border border-gray-200 dark:border-zinc-700 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => handlePreviewPreset(recommendation.recommended_preset)}
                    disabled={previewing} className="text-xs">
                    {previewing ? t('presetRec.previewing') : t('presetRec.previewBtn')}
                  </Button>
                  {!recommendation.applied_preset && (
                    <Button onClick={() => handleApplyPreset('apply_to_all_eligible')} disabled={applyingPreset} className="text-xs">
                      {applyingPreset ? t('presetRec.applying') : t('presetRec.applyBtn')}
                    </Button>
                  )}
                  {recommendation.applied_preset && (
                    <Button variant="secondary" onClick={() => handleApplyPreset('reset_to_previous')}
                      disabled={applyingPreset} className="text-xs">
                      {t('presetRec.resetBtn')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Harmonização */}
          {manifest && manifest.suggested_global_style && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                {t('consistency.harmonization')}
              </p>

              {manifest.harmonization_applied_at && (
                <Banner variant="success">
                  <p className="text-xs">
                    {t('consistency.harmonizationApplied')}{' '}
                    <span className="font-mono">{manifest.harmonization_applied_at.slice(0, 19)}</span>
                  </p>
                </Banner>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleApply('apply')} disabled={applying} className="text-xs">
                  {applying ? '...' : t('consistency.applyBtn')}
                </Button>
                {manifest.harmonization_applied_at && (
                  <Button variant="secondary" onClick={() => handleApply('reset')} disabled={applying} className="text-xs">
                    {t('consistency.resetBtn')}
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-400 dark:text-zinc-500">
                {t('consistency.harmonizationNote')}
              </p>
            </div>
          )}

        </aside>

        {/* Área principal: lista de páginas */}
        <main className="flex-1 min-w-0">
          {manifest && manifest.pages.length > 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                  {t('finalize.pages', { defaultValue: 'Páginas' })} — {manifest.pages.length}
                </p>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-zinc-700">
                {manifest.pages.map((page: ConsistencyPageEntry) => (
                  <li
                    key={page.page_number}
                    className="flex flex-wrap items-start gap-2 px-4 py-3"
                  >
                    <span className="text-xs font-mono text-gray-500 dark:text-zinc-400 w-12 shrink-0 pt-0.5">
                      p. {page.page_number}
                    </span>

                    {/* Badges de estado */}
                    <div className="flex flex-wrap gap-1 flex-1">
                      {page.is_outlier && (
                        <span
                          className="text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded"
                          title={page.outlier_reasons.join('\n')}
                        >
                          {t('consistency.outlier')}
                        </span>
                      )}
                      {page.is_visual_outlier && (
                        <span
                          className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 rounded"
                          title={(page.visual_outlier_reasons ?? []).join('\n')}
                        >
                          {t('consistency.visualOutlier')}
                        </span>
                      )}
                      {recommendation?.page_level_exceptions.some(e => e.page_number === page.page_number) && (
                        <span className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded">
                          {t('presetRec.exception')}
                        </span>
                      )}
                      {page.is_manual_override && (
                        <span className="text-xs bg-brand/8 dark:bg-indigo-950/60 text-brand dark:text-indigo-300 border border-brand/25 dark:border-indigo-800 px-1.5 py-0.5 rounded">
                          {t('consistency.manualOverride')}
                        </span>
                      )}
                      {page.excluded_from_harmonization && (
                        <span className="text-xs bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                          {t('consistency.excluded')}
                        </span>
                      )}
                      {page.harmonization_applied && (
                        <span className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded">
                          {t('consistency.harmonized')}
                        </span>
                      )}

                      {/* Ajustes efetivos */}
                      <div className="flex flex-wrap gap-0.5">
                        {Object.entries(page.effective_adjustments).map(([k, v]) => (
                          <AdjBadge key={k} label={ADJ_LABELS[k] ?? k} value={v} />
                        ))}
                      </div>
                    </div>

                    {/* Preview + comparação */}
                    <div className="flex items-center gap-2 shrink-0">
                      {page.preview_path && (
                        <>
                          <a
                            href={page.preview_path}
                            target="_blank"
                            rel="noreferrer"
                            title={t('consistency.previewTitle')}
                          >
                            <img
                              src={page.preview_path}
                              alt={`Preview p.${page.page_number}`}
                              className="h-10 rounded border border-gray-200 dark:border-zinc-700 object-cover"
                            />
                          </a>
                          <button
                            onClick={() =>
                              setComparisonPage((prev) =>
                                prev === page.page_number ? null : page.page_number,
                              )
                            }
                            className="text-xs text-brand dark:text-indigo-400 underline"
                          >
                            {comparisonPage === page.page_number
                              ? t('consistency.closeComparison', { defaultValue: 'Fechar' })
                              : t('consistency.compareBeforeAfter', { defaultValue: 'Comparar' })}
                          </button>
                        </>
                      )}

                      {/* Controles por página */}
                      <button
                        onClick={() =>
                          handlePagePatch(page.page_number, {
                            is_manual_override: !page.is_manual_override,
                          })
                        }
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline"
                      >
                        {page.is_manual_override
                          ? t('consistency.unmarkManual')
                          : t('consistency.markManual')}
                      </button>
                      <button
                        onClick={() =>
                          handlePagePatch(page.page_number, {
                            excluded_from_harmonization: !page.excluded_from_harmonization,
                          })
                        }
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline"
                      >
                        {page.excluded_from_harmonization
                          ? t('consistency.includeInHarmonization')
                          : t('consistency.excludeFromHarmonization')}
                      </button>
                    </div>

                    {/* Comparação antes/depois inline (Fase Q) */}
                    {comparisonPage === page.page_number && page.preview_path && (
                      <div className="w-full mt-2 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">
                            {t('consistency.beforeLabel', { defaultValue: 'Antes' })}
                          </p>
                          <img
                            src={`${API_BASE}/storage/output/${jobId}/pages/page_${String(page.page_number).padStart(3, '0')}.jpg`}
                            alt={`Antes p.${page.page_number}`}
                            className="w-full rounded border border-gray-200 dark:border-zinc-700 object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">
                            {t('consistency.afterLabel', { defaultValue: 'Depois' })}
                          </p>
                          <img
                            src={`${API_BASE}${page.preview_path}`}
                            alt={`Depois p.${page.page_number}`}
                            className="w-full rounded border border-gray-200 dark:border-zinc-700 object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400 dark:text-zinc-500">
                {t('consistency.noAnalysis')}
              </p>
              <Button variant="secondary" onClick={handleAnalyze} disabled={analyzing} className="mt-4">
                {analyzing ? t('consistency.analyzing') : t('consistency.analyzeBtn')}
              </Button>
            </div>
          )}
        </main>

      </div>
    </div>
  )
}

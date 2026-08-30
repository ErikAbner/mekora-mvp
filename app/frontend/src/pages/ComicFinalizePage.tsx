import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  API_BASE,
  applySuggestions,
  exportFinalPages,
  getExportManifest,
  getFinalManifest,
  getSuggestions,
  initFinalManifest,
  patchFinalManifest,
  recomputeSuggestions,
} from '../api/client'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import type {
  ExportManifest,
  FinalManifest,
  FinalPageEntry,
  SuggestionManifest,
  SuggestionPageEntry,
} from '../types'

const VARIANTS = ['original', 'render_overlay', 'inpaint'] as const
type Variant = typeof VARIANTS[number]
type FilterMode = 'all' | 'review_required' | 'undecided' | 'manual'

export default function ComicFinalizePage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()

  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [notInitialized, setNotInitialized] = useState(false)
  const [manifest, setManifest]             = useState<FinalManifest | null>(null)
  const [currentPage, setCurrentPage]       = useState(0)
  const [initializing, setInitializing]     = useState(false)
  const [initError, setInitError]           = useState<string | null>(null)
  const [saveStatus, setSaveStatus]         = useState<'idle' | 'saved' | 'error'>('idle')
  const [exporting, setExporting]           = useState(false)
  const [exportError, setExportError]       = useState<string | null>(null)

  const [_exportManifest, setExportManifest] = useState<ExportManifest | null>(null)

  const [suggestions, setSuggestions]               = useState<SuggestionManifest | null>(null)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError]     = useState<string | null>(null)
  const [applyingBatch, setApplyingBatch]           = useState(false)
  const [batchStatus, setBatchStatus]               = useState<string | null>(null)
  const [filterMode, setFilterMode]                 = useState<FilterMode>('all')

  // ---------------------------------------------------------------------------
  // Load on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!id) return
    getFinalManifest(Number(id))
      .then((res) => setManifest(res.manifest))
      .catch((err: { response?: { status?: number } }) => {
        if (err?.response?.status === 404) {
          setNotInitialized(true)
        } else {
          setError(t('finalize.errorLoad'))
        }
      })
      .finally(() => setLoading(false))
  }, [id, t])

  useEffect(() => {
    if (!id) return
    getSuggestions(Number(id))
      .then((res) => setSuggestions(res.manifest))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id) return
    getExportManifest(Number(id))
      .then((res) => setExportManifest(res.manifest))
      .catch(() => {})
  }, [id])

  // ---------------------------------------------------------------------------
  // Derived state — todos os hooks ANTES dos early returns
  // ---------------------------------------------------------------------------

  const pages = manifest?.pages ?? []
  const totalPages = pages.length

  const suggestionMap: Record<number, SuggestionPageEntry> = useMemo(() => {
    const map: Record<number, SuggestionPageEntry> = {}
    for (const s of suggestions?.pages ?? []) {
      map[s.page_number] = s
    }
    return map
  }, [suggestions])

  const reviewRequiredCount = useMemo(
    () => (suggestions?.pages ?? []).filter((p) => p.review_required).length,
    [suggestions],
  )

  const filteredPages: FinalPageEntry[] = useMemo(() => {
    if (filterMode === 'all') return pages
    if (filterMode === 'review_required') {
      const rrSet = new Set(
        (suggestions?.pages ?? []).filter((p) => p.review_required).map((p) => p.page_number),
      )
      return pages.filter((p) => rrSet.has(p.page_number))
    }
    if (filterMode === 'undecided') {
      return pages.filter((p) => (p.selection_source ?? 'default') === 'default')
    }
    if (filterMode === 'manual') {
      return pages.filter((p) => p.selection_source === 'manual')
    }
    return pages
  }, [pages, filterMode, suggestions])

  const filteredTotal = filteredPages.length
  const pageEntry: FinalPageEntry | undefined = filteredPages[currentPage]

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
    return (
      <div className="max-w-3xl mx-auto mt-8 text-sm text-gray-500 dark:text-zinc-400">
        {t('finalize.loading')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-8 space-y-4">
        <Link to={id ? `/overlay/${id}` : '/'} className="text-sm text-brand dark:text-indigo-400 hover:underline block">
          {t('finalize.backToOverlay')}
        </Link>
        <Banner variant="error">{error}</Banner>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleInit = async () => {
    if (!id) return
    setInitializing(true)
    setInitError(null)
    try {
      const res = await initFinalManifest(Number(id))
      setManifest(res.manifest)
      setNotInitialized(false)
      setCurrentPage(0)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 409) setInitError(t('finalize.translateRequired'))
      else if (status === 404) setInitError(t('finalize.overlayRequired'))
      else setError(t('finalize.errorLoad'))
    } finally {
      setInitializing(false)
    }
  }

  const handleReinit = async () => {
    if (!id) return
    setInitializing(true)
    setInitError(null)
    try {
      const res = await initFinalManifest(Number(id))
      setManifest(res.manifest)
      setCurrentPage(0)
    } catch {
      setInitError(t('finalize.reinitError'))
    } finally {
      setInitializing(false)
    }
  }

  const handleSelectVariant = async (pageNumber: number, variant: Variant) => {
    if (!id) return
    setSaveStatus('idle')
    try {
      const res = await patchFinalManifest(Number(id), [
        { page_number: pageNumber, selected_variant: variant },
      ])
      setManifest(res.manifest)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  const handleExport = async () => {
    if (!id) return
    setExporting(true)
    setExportError(null)
    try {
      const res = await exportFinalPages(Number(id))
      setManifest(res.manifest)
      getExportManifest(Number(id))
        .then((er) => setExportManifest(er.manifest))
        .catch(() => {})
    } catch {
      setExportError(t('finalize.errorLoad'))
    } finally {
      setExporting(false)
    }
  }

  const handleRecompute = async () => {
    if (!id) return
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    setBatchStatus(null)
    try {
      const res = await recomputeSuggestions(Number(id))
      setSuggestions(res.manifest)
    } catch {
      setSuggestionsError(t('finalize.noSuggestions'))
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const handleApplySuggestions = async (onlyUndecided: boolean) => {
    if (!id || !suggestions) return
    setApplyingBatch(true)
    setBatchStatus(null)
    setSuggestionsError(null)
    try {
      const res = await applySuggestions(Number(id), {
        only_undecided: onlyUndecided,
        min_confidence: 0.0,
      })
      setManifest(res.manifest)
      setBatchStatus(t('finalize.appliedCount', { n: res.applied_count }))
    } catch {
      setSuggestionsError(t('finalize.errorLoad'))
    } finally {
      setApplyingBatch(false)
    }
  }

  const handleBatchSetVariant = async (variant: Variant) => {
    if (!id || !manifest) return
    setApplyingBatch(true)
    setBatchStatus(null)
    try {
      const patches = pages.map((p) => ({
        page_number: p.page_number,
        selected_variant: variant,
      }))
      const res = await patchFinalManifest(Number(id), patches)
      setManifest(res.manifest)
      setBatchStatus(t('finalize.appliedCount', { n: patches.length }))
    } catch {
      setSuggestionsError(t('finalize.errorLoad'))
    } finally {
      setApplyingBatch(false)
    }
  }

  const handleFilterChange = (mode: FilterMode) => {
    setFilterMode(mode)
    setCurrentPage(0)
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const variantLabel = (v: Variant): string => {
    if (v === 'original') return t('finalize.variantOriginal')
    if (v === 'render_overlay') return t('finalize.variantRenderOverlay')
    return t('finalize.variantInpaint')
  }

  const selectionSourceBadge = (source: string | undefined) => {
    if (source === 'manual') return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
        {t('finalize.selectionManual')}
      </span>
    )
    if (source === 'auto') return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-brand/8 text-brand dark:bg-indigo-950/60 dark:text-indigo-300">
        {t('finalize.selectionAuto')}
      </span>
    )
    return null
  }

  // ---------------------------------------------------------------------------
  // Not initialized state
  // ---------------------------------------------------------------------------

  if (notInitialized) {
    return (
      <div className="max-w-3xl mx-auto mt-8 space-y-4">
        <Link to={id ? `/overlay/${id}` : '/'} className="text-sm text-brand dark:text-indigo-400 hover:underline block">
          {t('finalize.backToOverlay')}
        </Link>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
          {t('finalize.title')}
        </h2>
        <Banner variant="info">{t('finalize.notInitialized')}</Banner>
        <p className="text-sm text-gray-500 dark:text-zinc-400">{t('finalize.initDesc')}</p>
        <Button onClick={handleInit} disabled={initializing}>
          {initializing ? t('finalize.initializing') : t('finalize.initBtn')}
        </Button>
        {initError && (
          <Banner variant="warning">
            {initError}{' '}
            {initError === t('finalize.translateRequired') && (
              <Link to={`/analyze/${id}`} className="underline font-medium">
                {t('review.backToAnalysis')}
              </Link>
            )}
            {initError === t('finalize.overlayRequired') && (
              <Link to={`/overlay/${id}`} className="underline font-medium">
                {t('finalize.backToOverlay')}
              </Link>
            )}
          </Banner>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const undecidedCount = pages.filter((p) => (p.selection_source ?? 'default') === 'default').length
  const manualCount = pages.filter((p) => p.selection_source === 'manual').length

  const filterLabel = (mode: FilterMode): string => {
    const base = t(`finalize.filter${mode.charAt(0).toUpperCase() + mode.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}` as Parameters<typeof t>[0])
    if (mode === 'review_required' && reviewRequiredCount > 0) return `${base} (${reviewRequiredCount})`
    if (mode === 'undecided') return `${base} (${undecidedCount})`
    if (mode === 'manual') return `${base} (${manualCount})`
    return base
  }

  return (
    <div className="max-w-6xl mx-auto">

      {/* Toolbar sticky */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-800 px-4 py-2 -mx-4 mb-4 flex flex-wrap items-center gap-2">
        <Link
          to={id ? `/overlay/${id}` : '/'}
          className="text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 shrink-0"
        >
          ← {t('finalize.backToOverlay')}
        </Link>
        <div className="w-px h-4 bg-gray-200 dark:bg-zinc-700 shrink-0" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 shrink-0">
          {t('finalize.title')}
        </h2>

        {/* Filtros */}
        <div className="flex gap-1 flex-wrap">
          {(['all', 'review_required', 'undecided', 'manual'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleFilterChange(mode)}
              className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                filterMode === mode
                  ? 'border-brand bg-brand/[0.05] text-brand dark:bg-brand/10 dark:text-indigo-300'
                  : 'border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              {filterLabel(mode)}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Page nav */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => { setCurrentPage((p) => Math.max(0, p - 1)); setSaveStatus('idle') }}
            disabled={currentPage === 0}
            className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            ◄
          </button>
          <span className="text-xs text-gray-600 dark:text-zinc-400 min-w-[5rem] text-center">
            {t('finalize.pageNav', { current: currentPage + 1, total: filteredTotal })}
            {filterMode !== 'all' && (
              <span className="ml-1 text-gray-400 dark:text-zinc-600">/ {totalPages}</span>
            )}
          </span>
          <button
            onClick={() => { setCurrentPage((p) => Math.min(filteredTotal - 1, p + 1)); setSaveStatus('idle') }}
            disabled={currentPage >= filteredTotal - 1}
            className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            ►
          </button>
        </div>

        <div className="w-px h-4 bg-gray-200 dark:bg-zinc-700 shrink-0" />

        {/* Status + reinit */}
        {saveStatus === 'saved' && (
          <span className="text-xs text-green-600 dark:text-green-400 shrink-0">{t('finalize.saved')}</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-xs text-red-600 dark:text-red-400 shrink-0">{t('finalize.saveError')}</span>
        )}
        <button
          onClick={handleReinit}
          disabled={initializing}
          className="text-xs px-2.5 py-1 rounded border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 shrink-0"
        >
          {initializing ? t('finalize.initializing') : t('finalize.reinitBtn')}
        </button>
      </div>

      {initError && (
        <p className="text-xs text-red-600 dark:text-red-400">{initError}</p>
      )}

      {/* Review required banner */}
      {suggestions && reviewRequiredCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2 mb-4">
          <span>⚠</span>
          <span>{t('finalize.reviewRequiredCount', { n: reviewRequiredCount })}</span>
        </div>
      )}

      {/* Layout: main + sidebar */}
      <div className="flex gap-6 items-start">

        {/* Main: variant cards */}
        <div className="flex-1 min-w-0">

          {filteredTotal === 0 && filterMode !== 'all' && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400 dark:text-zinc-500">
                {t('finalize.emptyFilter')}
              </p>
            </div>
          )}

          {pageEntry && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-4">

              {/* Page header */}
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                  {t('finalize.pageNav', { current: pageEntry.page_number, total: totalPages })}
                </p>
                {selectionSourceBadge(pageEntry.selection_source)}
                {suggestionMap[pageEntry.page_number]?.review_required && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                    {t('finalize.reviewRequired')}
                  </span>
                )}
              </div>

              {/* Variant grid */}
              <div className="grid grid-cols-3 gap-3">
                {VARIANTS.map((variant) => {
                  const isAvailable = pageEntry.available_variants.includes(variant)
                  const isSelected = pageEntry.selected_variant === variant
                  const servePath = pageEntry.serve_paths[variant]
                  const suggestion = suggestionMap[pageEntry.page_number]
                  const isSuggested = suggestion?.suggested_variant === variant
                  const score = suggestion?.scores?.[variant]
                  const confidence = suggestion?.confidence_score

                  return (
                    <div
                      key={variant}
                      className={`rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
                        isSelected
                          ? 'border-brand bg-brand/[0.05] dark:bg-brand/10'
                          : isSuggested && isAvailable
                          ? 'border-brand/40 dark:border-indigo-700'
                          : isAvailable
                          ? 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
                          : 'border-gray-100 dark:border-zinc-800 opacity-50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 w-full">
                        <p className="text-xs font-semibold text-gray-700 dark:text-zinc-300 text-center">
                          {variantLabel(variant)}
                        </p>
                        {isSuggested && isAvailable && confidence !== undefined && (
                          <span className="text-xs bg-brand/8 text-brand dark:bg-indigo-950/60 dark:text-indigo-300 rounded px-1.5 py-0.5">
                            {t('finalize.suggested')} {Math.round(confidence * 100)}%
                          </span>
                        )}
                        {score !== undefined && !isSuggested && isAvailable && (
                          <span className="text-xs text-gray-400 dark:text-zinc-500">
                            {Math.round(score * 100)}%
                          </span>
                        )}
                      </div>

                      {isAvailable && servePath ? (
                        <img
                          src={`${API_BASE}${servePath}`}
                          alt={variantLabel(variant)}
                          className="w-full rounded border border-gray-100 dark:border-zinc-700 object-cover"
                          style={{ maxHeight: '240px', objectFit: 'contain' }}
                        />
                      ) : (
                        <div className="w-full h-28 flex items-center justify-center bg-gray-50 dark:bg-zinc-800 rounded text-xs text-gray-400 dark:text-zinc-500 text-center px-2">
                          {t('finalize.variantNotAvailable')}
                        </div>
                      )}

                      {isSelected ? (
                        <span className="text-xs font-medium text-brand dark:text-indigo-400 py-1">
                          ✓ {t('finalize.selectedVariant')}
                        </span>
                      ) : isAvailable ? (
                        <button
                          onClick={() => handleSelectVariant(pageEntry.page_number, variant)}
                          aria-label={`${t('finalize.selectVariant')} ${variantLabel(variant)}`}
                          className="text-xs px-3 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors w-full"
                        >
                          {t('finalize.selectVariant')}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-zinc-600 py-1">—</span>
                      )}

                      {pageEntry.export_error && isSelected && (
                        <p className="text-xs text-red-500 text-center">{pageEntry.export_error}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Reasons */}
              {suggestionMap[pageEntry.page_number]?.reasons?.length > 0 && (
                <details className="text-xs text-gray-500 dark:text-zinc-400 cursor-pointer">
                  <summary className="hover:text-gray-700 dark:hover:text-zinc-300 select-none">
                    {t('finalize.reasons')}
                  </summary>
                  <ul className="mt-1 ml-4 list-disc space-y-0.5">
                    {suggestionMap[pageEntry.page_number].reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: resumo + ações em lote + export */}
        <aside className="w-60 shrink-0 sticky top-16 space-y-3">

          {/* Resumo */}
          {manifest && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                {t('finalize.summaryTitle')}
              </p>
              <div className="space-y-1 text-xs text-gray-600 dark:text-zinc-400">
                <p>{t('finalize.summaryOriginal', { n: manifest.summary.original ?? 0 })}</p>
                <p>{t('finalize.summaryRender', { n: manifest.summary.render_overlay ?? 0 })}</p>
                <p>{t('finalize.summaryInpaint', { n: manifest.summary.inpaint ?? 0 })}</p>
              </div>
            </div>
          )}

          {/* Ações em lote */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
              {t('finalize.batchTitle')}
            </p>

            <div className="space-y-2">
              <Button
                onClick={handleRecompute}
                disabled={suggestionsLoading}
                className="w-full text-xs"
              >
                {suggestionsLoading ? t('finalize.recomputing') : t('finalize.recompute')}
              </Button>
              <Button
                onClick={() => handleApplySuggestions(true)}
                disabled={applyingBatch || !suggestions}
                className="w-full text-xs"
              >
                {applyingBatch ? t('finalize.applying') : t('finalize.applyUndecided')}
              </Button>
              <Button
                onClick={() => handleApplySuggestions(false)}
                disabled={applyingBatch || !suggestions}
                className="w-full text-xs"
              >
                {applyingBatch ? t('finalize.applying') : t('finalize.applyAll')}
              </Button>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 space-y-1">
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 mb-1">Forçar todas para:</p>
              {(['original', 'render_overlay', 'inpaint'] as Variant[]).map((v) => (
                <button
                  key={v}
                  onClick={() => handleBatchSetVariant(v)}
                  disabled={applyingBatch}
                  className="w-full text-xs px-2 py-1 rounded border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 text-left"
                >
                  {t(
                    v === 'original'
                      ? 'finalize.batchSetOriginal'
                      : v === 'render_overlay'
                      ? 'finalize.batchSetRender'
                      : 'finalize.batchSetInpaint',
                  )}
                </button>
              ))}
            </div>

            {batchStatus && (
              <p className="text-xs text-green-600 dark:text-green-400">{batchStatus}</p>
            )}
            {suggestionsError && <Banner variant="error">{suggestionsError}</Banner>}
            {!suggestions && !suggestionsLoading && (
              <p className="text-xs text-gray-400 dark:text-zinc-500">{t('finalize.noSuggestions')}</p>
            )}
          </div>

          {/* Export */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
              {t('finalize.exportTitle')}
            </p>

            {manifest && (
              <div className="text-xs text-gray-500 dark:text-zinc-400 space-y-0.5">
                <p>{t('finalize.exportSummaryOriginal', { n: manifest.summary?.original ?? 0 })}</p>
                <p>{t('finalize.exportSummaryRender', { n: manifest.summary?.render_overlay ?? 0 })}</p>
                <p>{t('finalize.exportSummaryInpaint', { n: manifest.summary?.inpaint ?? 0 })}</p>
              </div>
            )}

            <Button onClick={handleExport} disabled={exporting} className="w-full">
              {exporting ? t('finalize.exporting') : t('finalize.exportBtn')}
            </Button>

            {exportError && <Banner variant="error">{exportError}</Banner>}

            {manifest && manifest.exported_pages > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {t('finalize.exportDone', { total: manifest.exported_pages })}
                </p>
                <div className="flex flex-col gap-1.5 text-xs">
                  {manifest.zip_path && (
                    <a
                      href={`${API_BASE}${manifest.zip_path}`}
                      download
                      className="text-brand dark:text-indigo-400 hover:underline"
                      aria-label={t('finalize.downloadZip')}
                    >
                      {t('finalize.downloadZip')}
                    </a>
                  )}
                  {manifest.cbz_path && (
                    <a
                      href={`${API_BASE}${manifest.cbz_path}`}
                      download
                      className="text-brand dark:text-indigo-400 hover:underline"
                      aria-label={t('finalize.downloadCbz')}
                    >
                      {t('finalize.downloadCbz')}
                    </a>
                  )}
                  {manifest.pdf_path && (
                    <a
                      href={`${API_BASE}${manifest.pdf_path}`}
                      download
                      className="text-brand dark:text-indigo-400 hover:underline"
                      aria-label={t('finalize.downloadPdf')}
                    >
                      {t('finalize.downloadPdf')}
                    </a>
                  )}
                </div>

                {manifest.pages.some((p) => p.export_error) && (
                  <div className="space-y-1 mt-1">
                    {manifest.pages
                      .filter((p) => p.export_error)
                      .map((p) => (
                        <p key={p.page_number} className="text-xs text-red-500">
                          {t('finalize.exportErrorPage', {
                            n: p.page_number,
                            msg: p.export_error,
                          })}
                        </p>
                      ))}
                  </div>
                )}

                {manifest.exported_pages > 0 && (
                  <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
                    <Link
                      to={`/finish/${id}`}
                      className="inline-flex items-center text-xs font-medium text-brand dark:text-indigo-400 hover:underline"
                    >
                      {t('finish.goFinish')} →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

        </aside>
      </div>
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import { useParams, Link } from 'react-router-dom'
import {
  getComicFinish,
  initComicFinish,
  patchComicFinish,
  exportComicFinish,
  analyzeComicLayout,
} from '../api/client'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import type { FinishAdjustments, FinishManifest, FinishPageEntry } from '../types'

// ---------------------------------------------------------------------------
// Score ring SVG
// ---------------------------------------------------------------------------

function QualityRing({ score }: { score: number }) {
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'
  const circumference = 2 * Math.PI * 15.9
  const dashLen = (score / 100) * circumference
  return (
    <svg viewBox="0 0 36 36" className="w-16 h-16" aria-label={`Score: ${score}%`}>
      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <circle
        cx="18" cy="18" r="15.9"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeDasharray={`${dashLen} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
      <text
        x="18" y="18"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="8"
        fontWeight="bold"
        fill={color}
      >
        {score}%
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Constantes de preset
// ---------------------------------------------------------------------------

const PRESET_NAMES = [
  'none',
  'clean_manga_bw',
  'manga_bw_high_contrast',
  'comic_caption_box',
  'soft_subtitle_box',
  'high_contrast_overlay',
  'subtitle_minimal',
  'dense_text_compact',
] as const

type PresetName = (typeof PRESET_NAMES)[number]

const PRESET_DEFAULTS: Record<PresetName, FinishAdjustments> = {
  none:                   { contrast: 1.0,  brightness: 1.0,  sharpness: 1.0, saturation: 1.0  },
  clean_manga_bw:         { contrast: 1.4,  brightness: 1.05, sharpness: 1.6, saturation: 0.0  },
  manga_bw_high_contrast: { contrast: 1.7,  brightness: 1.0,  sharpness: 1.8, saturation: 0.0  },
  comic_caption_box:      { contrast: 1.2,  brightness: 1.0,  sharpness: 1.3, saturation: 0.9  },
  soft_subtitle_box:      { contrast: 1.1,  brightness: 1.05, sharpness: 1.0, saturation: 1.0  },
  high_contrast_overlay:  { contrast: 1.6,  brightness: 0.95, sharpness: 1.8, saturation: 0.7  },
  subtitle_minimal:       { contrast: 1.05, brightness: 1.02, sharpness: 1.1, saturation: 1.0  },
  dense_text_compact:     { contrast: 1.3,  brightness: 1.0,  sharpness: 1.5, saturation: 0.85 },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADJ_KEYS: (keyof FinishAdjustments)[] = ['contrast', 'brightness', 'sharpness', 'saturation']

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-gray-500 dark:text-zinc-400 shrink-0">{label}</span>
      <input
        type="range"
        min={0}
        max={2}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-brand"
      />
      <span className="w-10 text-xs font-mono text-right text-gray-700 dark:text-zinc-300">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function ComicFinishPage() {
  const { id } = useParams<{ id: string }>()
  const jobId = Number(id)
  const { t } = useTranslation()

  const [manifest, setManifest] = useState<FinishManifest | null>(null)
  const [qualityScore, setQualityScore] = useState<number | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [opError, setOpError] = useState<string | null>(null)

  const [localAdj, setLocalAdj] = useState<FinishAdjustments>({ contrast: 1.0, brightness: 1.0, sharpness: 1.0, saturation: 1.0 })
  const [localPreset, setLocalPreset] = useState<string>('none')

  // Before/After preview state
  const [previewPageNum, setPreviewPageNum] = useState<number | null>(null)
  const [previewMode, setPreviewMode] = useState<'before' | 'after'>('before')

  const syncFromManifest = useCallback((m: FinishManifest) => {
    setLocalPreset(m.global_preset)
    setLocalAdj({ ...m.global_adjustments })
  }, [])

  useEffect(() => {
    getComicFinish(jobId)
      .then((r) => { setManifest(r.manifest); setQualityScore(r.quality_score ?? null); syncFromManifest(r.manifest) })
      .catch((e) => {
        if (e?.response?.status === 404) setManifest(null)
        else setError(t('finish.errorLoad'))
      })
      .finally(() => setLoading(false))
  }, [jobId, syncFromManifest, t])

  const handleInit = async () => {
    setInitializing(true)
    setInitError(null)
    try {
      const r = await initComicFinish(jobId)
      setManifest(r.manifest)
      setQualityScore(r.quality_score ?? null)
      syncFromManifest(r.manifest)
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 404) setInitError(t('finish.finalizeRequired'))
      else setError(t('finish.errorLoad'))
    } finally {
      setInitializing(false)
    }
  }

  const handlePresetChange = async (preset: string) => {
    setLocalPreset(preset)
    const adj = PRESET_DEFAULTS[preset as PresetName] ?? PRESET_DEFAULTS.none
    setLocalAdj({ ...adj })
    if (!manifest) return
    try {
      const r = await patchComicFinish(jobId, { global_preset: preset })
      setManifest(r.manifest)
    } catch { /* silencioso */ }
  }

  const handleAdjChange = (key: keyof FinishAdjustments, value: number) => {
    setLocalAdj((prev) => ({ ...prev, [key]: value }))
  }

  const handleAdjBlur = async () => {
    if (!manifest) return
    try {
      const r = await patchComicFinish(jobId, { global_adjustments: localAdj })
      setManifest(r.manifest)
    } catch { /* silencioso */ }
  }

  const handleResetAll = async () => {
    if (!manifest) return
    setOpError(null)
    try {
      const r = await patchComicFinish(jobId, {
        global_preset: 'none',
        global_adjustments: { contrast: 1.0, brightness: 1.0, sharpness: 1.0, saturation: 1.0 },
        page_patches: manifest.pages.map((p) => ({
          page_number: p.page_number,
          preset_override: null,
          adjustments_override: null,
        })),
      })
      setManifest(r.manifest)
      syncFromManifest(r.manifest)
    } catch { setOpError(t('finish.opError')) }
  }

  const handleResetPage = async (pageNum: number) => {
    if (!manifest) return
    try {
      const r = await patchComicFinish(jobId, {
        page_patches: [{ page_number: pageNum, preset_override: null, adjustments_override: null }],
      })
      setManifest(r.manifest)
    } catch { /* silencioso */ }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setOpError(null)
    try {
      const r = await analyzeComicLayout(jobId)
      setManifest(r.manifest)
      setQualityScore(r.quality_score ?? null)
    } catch { setOpError(t('finish.opError')) }
    finally { setAnalyzing(false) }
  }

  const handleAutoFixToggle = async (enabled: boolean) => {
    if (!manifest) return
    try {
      const r = await patchComicFinish(jobId, { auto_fix_layout: enabled })
      setManifest(r.manifest)
    } catch { /* silencioso */ }
  }

  const handleExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      const r = await exportComicFinish(jobId)
      setManifest(r.manifest)
      setQualityScore(r.quality_score ?? null)
    } catch {
      setExportError(t('finish.errorLoad'))
    } finally {
      setExporting(false)
    }
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
    return <p className="text-sm text-gray-500 dark:text-zinc-400">{t('finish.loading')}</p>
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
        {error}
      </div>
    )
  }

  if (!manifest) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">{t('finish.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400">{t('finish.subtitle')}</p>
        <Banner variant="info">
          <p className="text-sm">{t('finish.derivedNote')}</p>
        </Banner>
        <Button onClick={handleInit} disabled={initializing}>
          {initializing ? t('finish.initializing') : t('finish.initBtn')}
        </Button>
        {initError && (
          <Banner variant="warning">
            {initError}{' '}
            <Link to={`/finalize/${jobId}`} className="underline font-medium">
              ← {t('finish.backToCuration')}
            </Link>
          </Banner>
        )}
        {!initError && (
          <p className="text-xs text-gray-400 dark:text-zinc-500">
            <Link to={`/finalize/${jobId}`} className="text-brand dark:text-indigo-400 hover:underline">
              ← {t('finish.backToCuration')}
            </Link>
          </p>
        )}
      </div>
    )
  }

  const exportedCount = manifest.pages.filter((p) => p.finished_path).length

  return (
    <div className="max-w-5xl mx-auto">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">{t('finish.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{t('finish.subtitle')}</p>
        </div>
        <Link to={`/finalize/${jobId}`} className="text-xs text-brand dark:text-indigo-400 hover:underline shrink-0 mt-1">
          ← {t('finish.backToCuration')}
        </Link>
      </div>

      <div className="mb-4">
        <Banner variant="info">
          <p className="text-xs">{t('finish.derivedNote')}</p>
        </Banner>
      </div>

      {opError && (
        <div className="mb-4">
          <Banner variant="error">{opError}</Banner>
        </div>
      )}

      {/* Layout: painel de controles + lista de páginas */}
      <div className="flex gap-6 items-start">

        {/* Painel de controles — esquerdo, sticky */}
        <aside className="w-64 shrink-0 sticky top-4 space-y-3">

          {/* Preset + sliders */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                {t('finish.globalPreset')}
              </p>
              <button
                onClick={handleResetAll}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline"
              >
                {t('finish.resetAll')}
              </button>
            </div>

            <select
              value={localPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full text-xs border border-gray-200 dark:border-zinc-600 rounded-md px-2.5 py-1.5 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              {PRESET_NAMES.map((name) => (
                <option key={name} value={name}>
                  {t(`finish.presets.${name}`)}
                </option>
              ))}
            </select>

            <div className="space-y-2.5">
              {ADJ_KEYS.map((key) => (
                <SliderRow
                  key={key}
                  label={t(`finish.adjust${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                  value={localAdj[key]}
                  onChange={(v) => handleAdjChange(key, v)}
                />
              ))}
            </div>

            <Button variant="secondary" onClick={handleAdjBlur} className="w-full text-xs">
              {t('analyze.apply', { defaultValue: 'Aplicar ajustes' })}
            </Button>
          </div>

          {/* Análise de layout */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                {t('layout.title', { defaultValue: 'Layout' })}
              </p>
              <Button variant="secondary" onClick={handleAnalyze} disabled={analyzing} className="text-xs">
                {analyzing ? t('layout.analyzing') : t('layout.analyzeBtn')}
              </Button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={manifest.auto_fix_layout ?? false}
                onChange={(e) => handleAutoFixToggle(e.target.checked)}
                className="accent-brand"
              />
              <span className="text-xs text-gray-700 dark:text-zinc-200">{t('layout.autoFix')}</span>
            </label>
          </div>

          {/* Export */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
              Export
            </p>

            {exportError && (
              <Banner variant="error"><p className="text-xs">{exportError}</p></Banner>
            )}

            <Button onClick={handleExport} disabled={exporting} className="w-full">
              {exporting ? t('finish.exporting') : t('finish.exportBtn')}
            </Button>

            {exportedCount > 0 && (
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {t('finish.exportedPages', { n: exportedCount })}
              </p>
            )}

            {(manifest.zip_path || manifest.cbz_path || manifest.pdf_path) && (
              <div className="flex flex-col gap-1.5 pt-1">
                {manifest.zip_path && (
                  <a
                    href={manifest.zip_path}
                    download
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-brand/[0.07] border border-brand/25 text-brand hover:bg-brand/[0.12] dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
                  >
                    {t('finish.downloadZip')}
                  </a>
                )}
                {manifest.cbz_path && (
                  <a
                    href={manifest.cbz_path}
                    download
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-brand/[0.07] border border-brand/25 text-brand hover:bg-brand/[0.12] dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
                  >
                    {t('finish.downloadCbz')}
                  </a>
                )}
                {manifest.pdf_path && (
                  <a
                    href={manifest.pdf_path}
                    download
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-brand/[0.07] border border-brand/25 text-brand hover:bg-brand/[0.12] dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
                  >
                    {t('finish.downloadPdf')}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Score de qualidade */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
              {t('finish.qualityScore')}
            </p>
            {qualityScore == null ? (
              <p className="text-xs text-gray-400 dark:text-zinc-500">{t('finish.qualityNotAnalyzed')}</p>
            ) : (
              <div className="flex items-center gap-3">
                <QualityRing score={qualityScore} />
                <p className="text-xs text-gray-600 dark:text-zinc-300">
                  {qualityScore >= 80 ? '✓' : qualityScore >= 60 ? '⚠' : '✗'}&nbsp;
                  {qualityScore}%
                </p>
              </div>
            )}
          </div>

          {/* Link para Consistência */}
          <Link
            to={`/consistency/${jobId}`}
            className="block text-center text-sm text-brand dark:text-indigo-400 hover:underline"
          >
            {t('consistency.goConsistency')} →
          </Link>

        </aside>

        {/* Lista de páginas — área principal */}
        <main className="flex-1 min-w-0 space-y-4">

          {/* Pré-visualização Antes/Depois */}
          {previewPageNum !== null && (() => {
            const page = manifest.pages.find((p) => p.page_number === previewPageNum)
            if (!page) return null
            const imgSrc = previewMode === 'before'
              ? page.source_path
              : page.finished_path
            return (
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                    p. {previewPageNum} — {t('finish.previewPage')}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewMode('before')}
                      className={`text-xs px-2 py-0.5 rounded ${previewMode === 'before' ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                    >
                      {t('finish.before')}
                    </button>
                    <button
                      onClick={() => setPreviewMode('after')}
                      disabled={!page.finished_path}
                      title={!page.finished_path ? t('finish.noFinishedPath') : undefined}
                      className={`text-xs px-2 py-0.5 rounded disabled:opacity-40 ${previewMode === 'after' ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
                    >
                      {t('finish.after')}
                    </button>
                    <button
                      onClick={() => setPreviewPageNum(null)}
                      className="ml-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
                      aria-label="Fechar preview"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="p-4 flex justify-center bg-gray-50 dark:bg-zinc-800/30 min-h-[160px]">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={`Página ${previewPageNum} — ${previewMode === 'before' ? t('finish.before') : t('finish.after')}`}
                      className="max-h-64 max-w-full object-contain rounded"
                    />
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-zinc-500 self-center">
                      {t('finish.noFinishedPath')}
                    </p>
                  )}
                </div>
              </div>
            )
          })()}

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/60">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                {t('finalize.pages', { defaultValue: 'Páginas' })} — {manifest.pages.length}
              </p>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-zinc-700">
              {manifest.pages.map((page: FinishPageEntry) => (
                <li key={page.page_number} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  <span className="text-xs font-mono text-gray-500 dark:text-zinc-400 w-14 shrink-0">
                    p. {page.page_number}
                  </span>
                  <span className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 px-1.5 py-0.5 rounded font-mono">
                    {page.source_variant}
                  </span>
                  {page.preset_override && (
                    <span className="text-xs bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">
                      {t(`finish.presets.${page.preset_override}`, { defaultValue: page.preset_override })}
                    </span>
                  )}
                  {page.finished_path && (
                    <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                  )}
                  {(page.layout_issues?.length ?? 0) > 0 && (
                    <span
                      className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded"
                      title={page.layout_issues!.map((i) => i.detail).join('\n')}
                    >
                      ⚠ {page.layout_issues!.length}
                    </span>
                  )}
                  {page.auto_adjustments_applied && (
                    <span className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded">
                      {t('layout.autoApplied')}
                    </span>
                  )}
                  {page.warnings.length > 0 && (
                    <span
                      className="text-xs text-amber-600 dark:text-amber-400 ml-auto shrink-0"
                      title={page.warnings.join('\n')}
                    >
                      ⚠ {t('finish.warnings')}
                    </span>
                  )}
                  {page.source_path && (
                    <button
                      onClick={() => { setPreviewPageNum(page.page_number); setPreviewMode('before') }}
                      className="text-xs text-brand dark:text-indigo-400 hover:underline ml-auto shrink-0"
                      aria-label={`${t('finish.previewPage')} ${page.page_number}`}
                    >
                      {t('finish.previewPage')}
                    </button>
                  )}
                  {page.preset_override !== null && (
                    <button
                      onClick={() => handleResetPage(page.page_number)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline shrink-0"
                    >
                      {t('finish.resetPage')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </main>

      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  API_BASE,
  exportComicReview,
  getComicReview,
  patchComicReview,
} from '../api/client'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import type {
  BlockPatch,
  ComicReviewExportResponse,
  ReviewBlock,
  ReviewPage,
  ReviewSidecar,
  ReviewStats,
} from '../types'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function ComicReviewPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [prereqError, setPrereqError] = useState<string | null>(null)
  const [sidecar, setSidecar] = useState<ReviewSidecar | null>(null)
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [exporting, setExporting] = useState(false)
  const [exportLinks, setExportLinks] = useState<ComicReviewExportResponse | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Local edits per block before save: blockId → reviewed_text
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!id) return
    getComicReview(Number(id))
      .then((res) => {
        setSidecar(res.sidecar)
        setStats(res.stats)
      })
      .catch((e) => {
        if (e?.response?.status === 409) setPrereqError(t('review.notReady'))
        else setError(t('review.errorLoad'))
      })
      .finally(() => setLoading(false))
  }, [id, t])

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
        {t('review.loading')}
      </div>
    )
  }

  if (prereqError) {
    return (
      <div className="max-w-3xl mx-auto mt-8 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
          {t('review.blockedTitle')}
        </h2>
        <Banner variant="warning">{prereqError}</Banner>
        <div>
          <Link
            to={`/analyze/${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            {t('review.backToAnalysis')}
          </Link>
        </div>
      </div>
    )
  }

  if (error || !sidecar) {
    return (
      <div className="max-w-3xl mx-auto mt-8">
        <Link
          to={id ? `/analyze/${id}` : '/'}
          className="text-sm text-brand dark:text-indigo-400 hover:underline mb-4 block"
        >
          {t('review.backToAnalysis')}
        </Link>
        <Banner variant="error">{error || t('review.errorLoad')}</Banner>
      </div>
    )
  }

  const pages = sidecar.pages
  const totalPages = pages.length
  const page: ReviewPage | undefined = pages[currentPage]

  // ---------------------------------------------------------------------------
  // Salvar alterações da página atual
  // ---------------------------------------------------------------------------

  const savePage = async () => {
    if (!id || !page) return
    const patches: BlockPatch[] = Object.entries(localEdits).map(([block_id, reviewed_text]) => ({
      block_id,
      reviewed_text,
    }))
    if (patches.length === 0) return
    setSaveStatus('saving')
    try {
      const res = await patchComicReview(Number(id), patches)
      setSidecar(res.sidecar)
      setStats(res.stats)
      setLocalEdits({})
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
    }
  }

  // ---------------------------------------------------------------------------
  // Aprovar / ignorar bloco
  // ---------------------------------------------------------------------------

  const setBlockStatus = async (block: ReviewBlock, status: 'approved' | 'skipped') => {
    if (!id) return
    const patch: BlockPatch = { block_id: block.block_id, review_status: status }
    if (localEdits[block.block_id] !== undefined) {
      patch.reviewed_text = localEdits[block.block_id]
      setLocalEdits((prev) => {
        const next = { ...prev }
        delete next[block.block_id]
        return next
      })
    }
    try {
      const res = await patchComicReview(Number(id), [patch])
      setSidecar(res.sidecar)
      setStats(res.stats)
    } catch {
      // Erro silencioso — usuário pode tentar salvar manualmente
    }
  }

  // ---------------------------------------------------------------------------
  // Exportar
  // ---------------------------------------------------------------------------

  const handleExport = async () => {
    if (!id) return
    setExporting(true)
    setExportError(null)
    try {
      const res = await exportComicReview(Number(id))
      setExportLinks(res)
    } catch {
      setExportError(t('review.exportError'))
    } finally {
      setExporting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const progressPct = stats && stats.total > 0
    ? Math.round(((stats.approved + stats.edited + stats.skipped) / stats.total) * 100)
    : 0

  return (
    <div className="max-w-5xl mx-auto">

      {/* Cabeçalho — full width */}
      <div className="mb-5">
        <Link
          to={id ? `/analyze/${id}` : '/'}
          className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 mb-3"
        >
          ← {t('review.backToAnalysis')}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
              {t('review.title')}
            </h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
              {sidecar.source_language} → {sidecar.target_language}
            </p>
          </div>
          <Link
            to={id ? `/overlay/${id}` : '/'}
            className="text-xs text-brand dark:text-indigo-400 hover:underline shrink-0 mt-1"
          >
            {t('analysis.comicOverlayBtn')} →
          </Link>
        </div>
      </div>

      {/* Layout duas colunas */}
      <div className="flex gap-6 items-start">

        {/* Sidebar esquerdo — sticky */}
        <aside className="w-56 shrink-0 sticky top-4 space-y-3">

          {/* Progresso */}
          {stats && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                {t('review.statsTitle')}
              </p>
              <div className="space-y-1.5">
                <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 text-right">
                  {progressPct}%
                </p>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <span className="text-gray-500 dark:text-zinc-400">{t('review.statsTotal', { count: stats.total })}</span>
                <span className="text-amber-600 dark:text-amber-400">{t('review.statsPending', { count: stats.pending })}</span>
                <span className="text-green-600 dark:text-green-400">{t('review.statsApproved', { count: stats.approved })}</span>
                <span className="text-brand dark:text-indigo-400">{t('review.statsEdited', { count: stats.edited })}</span>
                <span className="text-gray-400 dark:text-zinc-500">{t('review.statsSkipped', { count: stats.skipped })}</span>
              </div>
            </div>
          )}

          {/* Navegação de página */}
          {totalPages > 0 && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                {t('review.pageNav', { current: currentPage + 1, total: totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => { setCurrentPage((p) => Math.max(0, p - 1)); setLocalEdits({}) }}
                  disabled={currentPage === 0}
                  className="flex-1 py-1.5 text-xs"
                >
                  ◄
                </Button>
                <Button
                  onClick={() => { setCurrentPage((p) => Math.min(totalPages - 1, p + 1)); setLocalEdits({}) }}
                  disabled={currentPage === totalPages - 1}
                  className="flex-1 py-1.5 text-xs"
                >
                  ►
                </Button>
              </div>
            </div>
          )}

          {/* Aviso + link overlay */}
          <div className="space-y-2">
            <Banner variant="warning">
              <p className="text-xs">{t('review.warningNotImage')}</p>
            </Banner>
          </div>

          {/* Export */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
              {t('review.exportSection')}
            </p>
            <Button onClick={handleExport} disabled={exporting} className="w-full">
              {exporting ? t('review.exporting') : t('review.exportBtn')}
            </Button>
            {exportError && (
              <p className="text-xs text-red-600 dark:text-red-400">{exportError}</p>
            )}
            {exportLinks && (
              <div className="flex flex-col gap-1.5 text-xs">
                <a
                  href={`${API_BASE}${exportLinks.json_path}`}
                  download
                  className="text-brand dark:text-indigo-400 hover:underline"
                >
                  {t('review.downloadJson')}
                </a>
                <a
                  href={`${API_BASE}${exportLinks.html_path}`}
                  download
                  className="text-brand dark:text-indigo-400 hover:underline"
                >
                  {t('review.downloadHtml')}
                </a>
                <a
                  href={`${API_BASE}${exportLinks.md_path}`}
                  download
                  className="text-brand dark:text-indigo-400 hover:underline"
                >
                  {t('review.downloadMd')}
                </a>
              </div>
            )}
          </div>

        </aside>

        {/* Área principal — blocos da página atual */}
        <main className="flex-1 min-w-0">
          {page ? (
            <div className="space-y-2">
              {page.error && (
                <Banner variant="error">{t('review.pageError', { error: page.error })}</Banner>
              )}
              {page.blocks.length === 0 && !page.error && (
                <p className="text-sm text-gray-400 dark:text-zinc-500">{t('review.noBlocks')}</p>
              )}

              {page.blocks.map((block) => {
                const status = block.review_status
                const borderColor =
                  status === 'approved' ? 'border-l-feedback-success' :
                  status === 'edited'   ? 'border-l-brand' :
                  status === 'skipped'  ? 'border-l-gray-200 opacity-60' :
                                          'border-l-amber-400'

                const localText = localEdits[block.block_id]
                const displayReviewed = localText !== undefined ? localText : block.reviewed_text

                return (
                  <div
                    key={block.block_id}
                    className={`bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 border-l-4 ${borderColor}`}
                  >
                    {/* Header do bloco */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-gray-400 dark:text-zinc-500">
                        {block.block_id}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        status === 'approved' ? 'bg-feedback-success-bg text-feedback-success dark:bg-emerald-950/50 dark:text-emerald-400' :
                        status === 'edited'   ? 'bg-brand/8 text-brand dark:bg-indigo-950/60 dark:text-indigo-300' :
                        status === 'skipped'  ? 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-zinc-500' :
                                                'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                      }`}>
                        {t(`review.status_${status}`)}
                      </span>
                    </div>

                    {/* Conteúdo: original + tradução compactos, revisão editável */}
                    <div className="grid grid-cols-2 gap-3 mb-2 text-xs">
                      <div>
                        <p className="text-gray-400 dark:text-zinc-500 mb-0.5">{t('review.blockOriginal')}</p>
                        <p className="text-gray-600 dark:text-zinc-400 leading-snug">{block.original_text}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 dark:text-zinc-500 mb-0.5">{t('review.blockTranslated')}</p>
                        <p className="text-gray-700 dark:text-zinc-300 leading-snug">{block.translated_text}</p>
                      </div>
                    </div>

                    <div className="mb-2">
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mb-0.5">{t('review.blockReviewed')}</p>
                      <textarea
                        rows={2}
                        value={displayReviewed}
                        placeholder={t('review.blockReviewedPlaceholder')}
                        onChange={(e) =>
                          setLocalEdits((prev) => ({ ...prev, [block.block_id]: e.target.value }))
                        }
                        className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                      />
                    </div>

                    {/* Ações do bloco */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBlockStatus(block, 'approved')}
                        className="text-xs px-2.5 py-1 rounded-lg border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                      >
                        {t('review.approve')}
                      </button>
                      <button
                        onClick={() => setBlockStatus(block, 'skipped')}
                        className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        {t('review.skip')}
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Salvar página */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-zinc-800 mt-2">
                <Button
                  variant="action-blue"
                  onClick={savePage}
                  disabled={saveStatus === 'saving' || Object.keys(localEdits).length === 0}
                >
                  {saveStatus === 'saving' ? t('review.saving') : t('review.savePage')}
                </Button>
                {saveStatus === 'saved' && (
                  <span className="text-xs text-green-600 dark:text-green-400">{t('review.saved')}</span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-xs text-red-600 dark:text-red-400">{t('review.saveError')}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-zinc-500">{t('review.noBlocks')}</p>
          )}
        </main>

      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  API_BASE,
  exportComicOverlay,
  getComicOverlay,
  inpaintComic,
  patchComicOverlay,
  renderComic,
} from '../api/client'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import type {
  InpaintManifest,
  OverlayBlock,
  OverlayExportResponse,
  OverlayPage,
  OverlaySidecar,
  RenderManifest,
  ReviewStats,
} from '../types'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type ViewMode = 'boxes' | 'boxes-text' | 'list'

// ---------------------------------------------------------------------------
// Fase Q — Presets de estilo de overlay
// ---------------------------------------------------------------------------

const OVERLAY_STYLE_PRESETS: Array<{
  name: string
  label: string
  style: Record<string, string | number>
}> = [
  { name: 'clean_black',   label: 'Texto Limpo',    style: { font_size: 0.85, text_align: 'center', bg_opacity: 0,    text_color: '#1a1a1a', border_color: '#f59e0b' } },
  { name: 'manga_white',   label: 'Manga Branco',   style: { font_size: 0.8,  text_align: 'center', bg_opacity: 0,    text_color: '#ffffff', border_color: '#000000' } },
  { name: 'caption_box',   label: 'Legenda Caixa',  style: { font_size: 0.75, text_align: 'left',   bg_opacity: 0.35, text_color: '#ffffff', border_color: '#1f2937' } },
  { name: 'high_contrast', label: 'Alto Contraste', style: { font_size: 0.9,  text_align: 'center', bg_opacity: 0.45, text_color: '#ffffff', border_color: '#ef4444' } },
  { name: 'soft_caption',  label: 'Legenda Suave',  style: { font_size: 0.8,  text_align: 'center', bg_opacity: 0.15, text_color: '#1a1a1a', border_color: '#d1d5db' } },
]

const statusBorderCls: Record<string, string> = {
  pending:  'border-amber-400',
  approved: 'border-green-500',
  edited:   'border-brand',
  skipped:  'border-gray-300',
}

export default function ComicOverlayPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()

  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)
  const [prereqError, setPrereqError]       = useState<string | null>(null)
  const [sidecar, setSidecar]               = useState<OverlaySidecar | null>(null)
  const [_stats, setStats]                  = useState<ReviewStats | null>(null)
  const [currentPage, setCurrentPage]       = useState(0)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [viewMode, setViewMode]             = useState<ViewMode>('boxes-text')
  const [localEdits, setLocalEdits]         = useState<Record<string, string>>({})
  const [localStyle, setLocalStyle]         = useState<Record<string, string | number>>({})
  const [saveStatus, setSaveStatus]         = useState<SaveStatus>('idle')
  const [exporting, setExporting]           = useState(false)
  const [exportLinks, setExportLinks]       = useState<OverlayExportResponse | null>(null)
  const [exportError, setExportError]       = useState<string | null>(null)
  const [rendering, setRendering]           = useState(false)
  const [renderError, setRenderError]       = useState<string | null>(null)
  const [renderManifest, setRenderManifest] = useState<RenderManifest | null>(null)
  const [inpainting, setInpainting]             = useState(false)
  const [inpaintError, setInpaintError]         = useState<string | null>(null)
  const [inpaintManifest, setInpaintManifest]   = useState<InpaintManifest | null>(null)
  const [inpaintAlgorithm, setInpaintAlgorithm] = useState('telea')
  const [inpaintPadding, setInpaintPadding]     = useState(2)
  const [inpaintRadius, setInpaintRadius]       = useState(3)
  const [inpaintFeather, setInpaintFeather]     = useState(0)

  // Drag state
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragState, setDragState] = useState<{
    blockId: string
    startX: number
    startY: number
    startPos: number[]
  } | null>(null)
  const [livePos, setLivePos] = useState<Record<string, number[]>>({})

  useEffect(() => {
    if (!id) return
    getComicOverlay(Number(id))
      .then((res) => {
        setSidecar(res.sidecar)
        setStats(res.stats)
      })
      .catch((e) => {
        if (e?.response?.status === 409) setPrereqError(t('overlay.translateRequired'))
        else setError(t('overlay.errorLoad'))
      })
      .finally(() => setLoading(false))
  }, [id, t])

  // Reset local style when selected block changes
  useEffect(() => {
    const page = sidecar?.pages[currentPage]
    const block = page?.blocks.find((b) => b.block_id === selectedBlockId)
    setLocalStyle(block?.overlay_style ?? {})
  }, [selectedBlockId, sidecar, currentPage])

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
        {t('overlay.loading')}
      </div>
    )
  }

  if (prereqError) {
    return (
      <div className="max-w-3xl mx-auto mt-8 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100">
          {t('overlay.blockedTitle')}
        </h2>
        <Banner variant="warning">{prereqError}</Banner>
        <div>
          <Link
            to={`/analyze/${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            {t('overlay.backToAnalysis')}
          </Link>
        </div>
      </div>
    )
  }

  if (error || !sidecar) {
    return (
      <div className="max-w-3xl mx-auto mt-8 space-y-4">
        <Link
          to={id ? `/review/${id}` : '/'}
          className="text-sm text-brand dark:text-indigo-400 hover:underline block"
        >
          {t('overlay.backToReview')}
        </Link>
        <Banner variant="error">{error || t('overlay.errorLoad')}</Banner>
      </div>
    )
  }

  const pages = sidecar.pages
  const totalPages = pages.length
  const page: OverlayPage | undefined = pages[currentPage]
  const selectedBlock: OverlayBlock | undefined = page?.blocks.find(
    (b) => b.block_id === selectedBlockId,
  )

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const effectivePos = (block: OverlayBlock) =>
    block.overlay_position ?? block.bbox ?? null

  const hasImage = Boolean(page?.image_path)
  const showOverlay = hasImage && viewMode !== 'list'

  const styleForBlock = (block: OverlayBlock): React.CSSProperties => {
    const s = block.overlay_style ?? {}
    return {
      borderColor: s.border_color as string | undefined,
      background: s.bg_opacity !== undefined
        ? `rgba(0,0,0,${s.bg_opacity})` : undefined,
      fontSize: s.font_size ? `${s.font_size}rem` : undefined,
      color: s.text_color as string | undefined,
      textAlign: s.text_align as 'left' | 'center' | 'right' | undefined,
    }
  }

  // -------------------------------------------------------------------------
  // Page navigation
  // -------------------------------------------------------------------------

  const handlePageNext = () => {
    setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
    setSelectedBlockId(null)
    setLocalEdits({})
    setLivePos({})
  }

  const handlePagePrev = () => {
    setCurrentPage((p) => Math.max(0, p - 1))
    setSelectedBlockId(null)
    setLocalEdits({})
    setLivePos({})
  }

  // -------------------------------------------------------------------------
  // Save block text
  // -------------------------------------------------------------------------

  const handleSaveBlock = async (block: OverlayBlock) => {
    if (!id) return
    const localText = localEdits[block.block_id]
    if (localText === undefined) return
    setSaveStatus('saving')
    try {
      const res = await patchComicOverlay(Number(id), [
        { block_id: block.block_id, reviewed_text: localText },
      ])
      setSidecar(res.sidecar)
      setStats(res.stats)
      setLocalEdits((prev) => {
        const next = { ...prev }
        delete next[block.block_id]
        return next
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
    }
  }

  // -------------------------------------------------------------------------
  // Toggle visibility
  // -------------------------------------------------------------------------

  const handleToggleVisibility = async (block: OverlayBlock) => {
    if (!id) return
    try {
      const res = await patchComicOverlay(Number(id), [
        { block_id: block.block_id, overlay_visibility: !block.overlay_visibility },
      ])
      setSidecar(res.sidecar)
      setStats(res.stats)
    } catch {
      // erro silencioso
    }
  }

  // -------------------------------------------------------------------------
  // Style operations
  // -------------------------------------------------------------------------

  const handleSaveStyle = async (block: OverlayBlock) => {
    if (!id) return
    try {
      const res = await patchComicOverlay(Number(id), [
        { block_id: block.block_id, overlay_style: localStyle },
      ])
      setSidecar(res.sidecar)
      setStats(res.stats)
    } catch {
      // erro silencioso
    }
  }

  const handleResetStyle = async (block: OverlayBlock) => {
    if (!id) return
    try {
      const res = await patchComicOverlay(Number(id), [
        { block_id: block.block_id, overlay_style: null },
      ])
      setSidecar(res.sidecar)
      setStats(res.stats)
    } catch {
      // erro silencioso
    }
  }

  const handleResetPosition = async (block: OverlayBlock) => {
    if (!id) return
    try {
      const res = await patchComicOverlay(Number(id), [
        { block_id: block.block_id, overlay_position: null },
      ])
      setSidecar(res.sidecar)
      setStats(res.stats)
    } catch {
      // erro silencioso
    }
  }

  // -------------------------------------------------------------------------
  // Drag handlers
  // -------------------------------------------------------------------------

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0) return
    const dx = (e.clientX - dragState.startX) / rect.width
    const dy = (e.clientY - dragState.startY) / rect.height
    const [ox, oy, ow, oh] = dragState.startPos
    setLivePos((prev) => ({
      ...prev,
      [dragState.blockId]: [ox + dx, oy + dy, ow, oh],
    }))
  }

  const handlePointerUp = async () => {
    if (!dragState || !id) return
    const newPos = livePos[dragState.blockId]
    const bidToSave = dragState.blockId
    setDragState(null)
    setLivePos({})
    if (newPos) {
      try {
        const res = await patchComicOverlay(Number(id), [
          { block_id: bidToSave, overlay_position: newPos },
        ])
        setSidecar(res.sidecar)
        setStats(res.stats)
      } catch {
        // erro silencioso
      }
    }
  }

  // -------------------------------------------------------------------------
  // Render (Fase H)
  // -------------------------------------------------------------------------

  const handleRender = async () => {
    if (!id) return
    setRendering(true)
    setRenderError(null)
    try {
      const res = await renderComic(Number(id))
      setRenderManifest(res.manifest)
    } catch {
      setRenderError(t('overlay.renderErrorLoad'))
    } finally {
      setRendering(false)
    }
  }

  // -------------------------------------------------------------------------
  // Inpainting (Fase I.A)
  // -------------------------------------------------------------------------

  const handleInpaint = async () => {
    if (!id) return
    setInpainting(true)
    setInpaintError(null)
    try {
      const res = await inpaintComic(Number(id), {
        algorithm: inpaintAlgorithm,
        mask_padding: inpaintPadding,
        inpaint_radius: inpaintRadius,
        feather: inpaintFeather,
      })
      setInpaintManifest(res.manifest)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setInpaintError(msg)
    } finally {
      setInpainting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  const handleExport = async () => {
    if (!id) return
    setExporting(true)
    setExportError(null)
    try {
      const res = await exportComicOverlay(Number(id))
      setExportLinks(res)
    } catch {
      setExportError(t('overlay.exportError'))
    } finally {
      setExporting(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-6xl mx-auto">

      {/* Toolbar sticky */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-zinc-800 px-4 py-2 -mx-4 mb-4 flex items-center gap-3">
        <Link
          to={id ? `/review/${id}` : '/'}
          className="text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 shrink-0"
        >
          ← {t('overlay.backToReview')}
        </Link>
        <div className="w-px h-4 bg-gray-200 dark:bg-zinc-700 shrink-0" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 shrink-0">
          {t('overlay.title')}
        </h2>
        <span className="text-xs text-gray-400 dark:text-zinc-500">
          {sidecar.source_language} → {sidecar.target_language}
        </span>
        <div className="flex-1" />

        {/* Navegação de página */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handlePagePrev}
            disabled={currentPage === 0}
            className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            ◄
          </button>
          <span className="text-xs text-gray-600 dark:text-zinc-400 min-w-[4rem] text-center">
            {t('overlay.pageNav', { current: currentPage + 1, total: totalPages })}
          </span>
          <button
            onClick={handlePageNext}
            disabled={currentPage === totalPages - 1}
            className="px-2 py-1 text-xs rounded border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            ►
          </button>
        </div>

        {/* Separador */}
        {hasImage && <div className="w-px h-4 bg-gray-200 dark:bg-zinc-700 shrink-0" />}

        {/* View mode */}
        {hasImage && (
          <div className="flex gap-0.5 shrink-0">
            {(['boxes', 'boxes-text', 'list'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  viewMode === mode
                    ? 'bg-brand text-white border-brand'
                    : 'border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
                }`}
              >
                {t(`overlay.view${mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', '')}` as 'overlay.viewBoxes')}
              </button>
            ))}
          </div>
        )}

        {/* Save status inline */}
        {saveStatus === 'saved' && (
          <span className="text-xs text-green-600 dark:text-green-400 shrink-0">{t('overlay.saved')}</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-xs text-red-600 dark:text-red-400 shrink-0">{t('overlay.saveError')}</span>
        )}
      </div>

      {/* Warning banner */}
      <Banner variant="warning" className="mb-4">{t('overlay.warningExperimental')}</Banner>

      {/* Layout editor: canvas + painel */}
      <div className="flex gap-4 items-start">

        {/* Área do canvas — protagonista */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Imagem com overlay */}
          {showOverlay && page && (
            <div
              ref={containerRef}
              data-testid="overlay-container"
              style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}
              className="border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden w-full"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <img
                src={`${API_BASE}${page.image_path}`}
                alt={t('overlay.pageAlt', { number: currentPage + 1 })}
                style={{ display: 'block', width: '100%' }}
              />
              {page.blocks.map((block) => {
                const pos = livePos[block.block_id] ?? effectivePos(block)
                if (!pos || !block.overlay_visibility) return null
                const isSelected = block.block_id === selectedBlockId
                const borderCls = statusBorderCls[block.review_status] ?? 'border-gray-400'
                const inlineStyle = styleForBlock(block)
                return (
                  <div
                    key={block.block_id}
                    onClick={() =>
                      setSelectedBlockId((prev) =>
                        prev === block.block_id ? null : block.block_id,
                      )
                    }
                    onPointerDown={(e) => {
                      e.preventDefault()
                      e.currentTarget.setPointerCapture(e.pointerId)
                      const currentLive = livePos[block.block_id] ?? effectivePos(block)
                      if (!currentLive) return
                      setDragState({
                        blockId: block.block_id,
                        startX: e.clientX,
                        startY: e.clientY,
                        startPos: currentLive,
                      })
                    }}
                    style={{
                      position: 'absolute',
                      left:   `${pos[0] * 100}%`,
                      top:    `${pos[1] * 100}%`,
                      width:  `${pos[2] * 100}%`,
                      height: `${pos[3] * 100}%`,
                      cursor: 'grab',
                      ...inlineStyle,
                    }}
                    className={`border-2 transition-all ${borderCls} ${
                      isSelected ? 'ring-2 ring-brand ring-offset-1' : ''
                    }`}
                    role="button"
                    aria-label={`bloco ${block.block_id}`}
                  >
                    {viewMode === 'boxes-text' && (
                      <span
                        style={{
                          fontSize: '.55rem',
                          lineHeight: 1.2,
                          display: 'block',
                          overflow: 'hidden',
                          padding: '1px',
                          background: 'rgba(255,255,255,0.85)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {block.reviewed_text || block.translated_text}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Mensagem sem imagem */}
          {!hasImage && (
            <p className="text-sm text-gray-400 dark:text-zinc-500 italic">
              {t('overlay.noImage')}
            </p>
          )}

          {/* Lista compacta de blocos */}
          {page && (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/60">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                  {page.blocks.length} {page.blocks.length === 1 ? 'bloco' : 'blocos'}
                </p>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                {page.blocks.map((block) => {
                  const isSelected = block.block_id === selectedBlockId
                  const borderCls = statusBorderCls[block.review_status] ?? 'border-gray-300'
                  const posExists = Boolean(effectivePos(block))
                  return (
                    <li
                      key={block.block_id}
                      onClick={() =>
                        setSelectedBlockId((prev) =>
                          prev === block.block_id ? null : block.block_id,
                        )
                      }
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-l-2 ${borderCls} ${
                        isSelected
                          ? 'bg-brand/[0.04] dark:bg-brand/10'
                          : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'
                      } ${!block.overlay_visibility ? 'opacity-50' : ''}`}
                      role="button"
                      aria-label={`bloco ${block.block_id}`}
                    >
                      <span className="text-xs font-mono text-gray-500 dark:text-zinc-400 shrink-0">
                        {block.block_id}
                        {posExists && (
                          <span className="ml-1 text-green-500 dark:text-green-400 text-[10px]">◉</span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-zinc-500 flex-1 truncate">
                        {t(`overlay.status_${block.review_status}` as 'overlay.status_pending')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleVisibility(block)
                        }}
                        className="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
                        aria-label={
                          block.overlay_visibility
                            ? t('overlay.toggleHide')
                            : t('overlay.toggleShow')
                        }
                      >
                        {block.overlay_visibility ? t('overlay.toggleHide') : t('overlay.toggleShow')}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Painel de propriedades — sempre visível */}
        <aside className="w-72 shrink-0 sticky top-16 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden self-start">
          {!selectedBlock ? (
            <div className="p-6 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <span className="text-gray-300 dark:text-zinc-600 text-xl">⊡</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-zinc-500">
                {t('overlay.selectBlockHint', { defaultValue: 'Clique em um bloco para editar' })}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">

              {/* Header do painel */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-mono font-semibold text-gray-600 dark:text-zinc-300">
                  {selectedBlock.block_id}
                </span>
                <button
                  onClick={() => setSelectedBlockId(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300"
                >
                  ✕
                </button>
              </div>

              {/* Conteúdo: texto original + tradução */}
              <div className="px-4 py-3 space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">
                    {t('overlay.blockOriginal')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 leading-snug">
                    {selectedBlock.original_text}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">
                    {t('overlay.blockTranslated')}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-zinc-300 leading-snug">
                    {selectedBlock.translated_text}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">
                    {t('overlay.blockReviewed')}
                  </p>
                  <textarea
                    rows={3}
                    value={localEdits[selectedBlock.block_id] ?? selectedBlock.reviewed_text}
                    placeholder={t('overlay.blockReviewedPlaceholder')}
                    onChange={(e) =>
                      setLocalEdits((prev) => ({
                        ...prev,
                        [selectedBlock.block_id]: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                  />
                </div>
                <Button
                  variant="action-blue"
                  onClick={() => handleSaveBlock(selectedBlock)}
                  disabled={
                    saveStatus === 'saving' ||
                    localEdits[selectedBlock.block_id] === undefined
                  }
                  className="w-full text-xs"
                >
                  {saveStatus === 'saving' ? t('overlay.saving') : t('overlay.saveBlock')}
                </Button>
              </div>

              {/* Seção de estilo */}
              <div className="px-4 py-3 space-y-3">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                  {t('overlay.styleTitle')}
                </p>

                {/* Presets */}
                <div className="flex flex-wrap gap-1">
                  {OVERLAY_STYLE_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => setLocalStyle((s) => ({ ...s, ...p.style }))}
                      className="px-2 py-0.5 text-[10px] rounded border border-gray-200 dark:border-zinc-600 text-gray-600 dark:text-zinc-400 hover:border-brand hover:text-brand dark:hover:text-indigo-400 transition-colors"
                    >
                      {t(`overlay.stylePresets.${p.name}` as 'overlay.stylePresets.clean_black', { defaultValue: p.label })}
                    </button>
                  ))}
                </div>

                {/* font_size */}
                <div>
                  <label className="text-[10px] text-gray-400 dark:text-zinc-500 block mb-1">
                    {t('overlay.styleFontSize')}: {((localStyle.font_size as number) ?? 0.6).toFixed(1)}rem
                  </label>
                  <input
                    type="range"
                    min="0.4"
                    max="1.6"
                    step="0.1"
                    value={(localStyle.font_size as number) ?? 0.6}
                    onChange={(e) =>
                      setLocalStyle((s) => ({ ...s, font_size: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-brand"
                    aria-label={t('overlay.styleFontSize')}
                  />
                </div>

                {/* text_align */}
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 mb-1">
                    {t('overlay.styleTextAlign')}
                  </p>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() =>
                          setLocalStyle((s) => ({ ...s, text_align: align }))
                        }
                        className={`flex-1 px-2 py-1 text-[10px] rounded border transition-colors ${
                          (localStyle.text_align ?? 'left') === align
                            ? 'bg-brand text-white border-brand'
                            : 'border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-zinc-400'
                        }`}
                        aria-label={t(`overlay.styleAlign${align.charAt(0).toUpperCase() + align.slice(1)}` as 'overlay.styleAlignLeft')}
                      >
                        {t(`overlay.styleAlign${align.charAt(0).toUpperCase() + align.slice(1)}` as 'overlay.styleAlignLeft')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* bg_opacity */}
                <div>
                  <label className="text-[10px] text-gray-400 dark:text-zinc-500 block mb-1">
                    {t('overlay.styleBgOpacity')}: {((localStyle.bg_opacity as number) ?? 0.15).toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.05"
                    value={(localStyle.bg_opacity as number) ?? 0.15}
                    onChange={(e) =>
                      setLocalStyle((s) => ({ ...s, bg_opacity: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-brand"
                    aria-label={t('overlay.styleBgOpacity')}
                  />
                </div>

                {/* Colors */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-gray-400 dark:text-zinc-500">
                      {t('overlay.styleTextColor')}
                    </label>
                    <input
                      type="color"
                      value={(localStyle.text_color as string) ?? '#1a1a1a'}
                      onChange={(e) =>
                        setLocalStyle((s) => ({ ...s, text_color: e.target.value }))
                      }
                      className="h-5 w-8 rounded border border-gray-200 dark:border-zinc-600 cursor-pointer"
                      aria-label={t('overlay.styleTextColor')}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] text-gray-400 dark:text-zinc-500">
                      {t('overlay.styleBorderColor')}
                    </label>
                    <input
                      type="color"
                      value={(localStyle.border_color as string) ?? '#f59e0b'}
                      onChange={(e) =>
                        setLocalStyle((s) => ({ ...s, border_color: e.target.value }))
                      }
                      className="h-5 w-8 rounded border border-gray-200 dark:border-zinc-600 cursor-pointer"
                      aria-label={t('overlay.styleBorderColor')}
                    />
                  </div>
                </div>

                {/* Style actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSaveStyle(selectedBlock)}
                    className="flex-1 text-xs"
                  >
                    {t('overlay.saveStyle')}
                  </Button>
                  <button
                    onClick={() => handleResetStyle(selectedBlock)}
                    className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {t('overlay.resetStyle')}
                  </button>
                </div>

                {/* Reset posição */}
                {effectivePos(selectedBlock) && (
                  <button
                    onClick={() => handleResetPosition(selectedBlock)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline w-full text-left"
                  >
                    {t('overlay.resetPosition')}
                  </button>
                )}
              </div>

            </div>
          )}
        </aside>

      </div>

      {/* Pipeline — colapsável */}
      <div className="mt-6 border-t border-gray-200 dark:border-zinc-700 pt-5 space-y-2">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
          Pipeline
        </p>

        {/* Export */}
        <details open className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
            <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t('overlay.exportSection')}
            </span>
            <span className="text-gray-400 text-xs group-open:rotate-90 transition-transform">▶</span>
          </summary>
          <div className="px-4 pb-4 pt-1 space-y-3">
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? t('overlay.exporting') : t('overlay.exportBtn')}
            </Button>
            {exportError && (
              <p className="text-xs text-red-600 dark:text-red-400">{exportError}</p>
            )}
            {exportLinks && (
              <div className="text-sm">
                <a
                  href={`${API_BASE}${exportLinks.html_path}`}
                  download
                  className="text-brand dark:text-indigo-400 hover:underline"
                >
                  {t('overlay.downloadHtml')}
                </a>
              </div>
            )}
          </div>
        </details>

        {/* Renderização visual — Fase H */}
        <details className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
            <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t('overlay.renderSection')}
            </span>
            <span className="text-gray-400 text-xs group-open:rotate-90 transition-transform">▶</span>
          </summary>
          <div className="px-4 pb-4 pt-1 space-y-3">
            <Banner variant="warning">{t('overlay.renderWarning')}</Banner>
            <div className="flex gap-2">
              <Button onClick={handleRender} disabled={rendering}>
                {rendering
                  ? t('overlay.rendering')
                  : renderManifest
                  ? t('overlay.rerenderBtn')
                  : t('overlay.renderBtn')}
              </Button>
            </div>
            {renderError && <Banner variant="error">{renderError}</Banner>}
            {renderManifest && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {t('overlay.renderStats', {
                    rendered: renderManifest.rendered_pages,
                    total: renderManifest.total_pages,
                  })}
                </p>
                {renderManifest.rendered_pages === 0 && (
                  <Banner variant="warning">{t('overlay.renderNoPages')}</Banner>
                )}
                {(renderManifest.zip_path || renderManifest.cbz_path) && (
                  <div className="flex flex-wrap gap-4 text-sm">
                    {renderManifest.zip_path && (
                      <a
                        href={`${API_BASE}${renderManifest.zip_path}`}
                        download
                        className="text-brand dark:text-indigo-400 hover:underline"
                        aria-label={t('overlay.downloadZip')}
                      >
                        {t('overlay.downloadZip')}
                      </a>
                    )}
                    {renderManifest.cbz_path && (
                      <a
                        href={`${API_BASE}${renderManifest.cbz_path}`}
                        download
                        className="text-brand dark:text-indigo-400 hover:underline"
                        aria-label={t('overlay.downloadCbz')}
                      >
                        {t('overlay.downloadCbz')}
                      </a>
                    )}
                  </div>
                )}
                {(() => {
                  const renderedPage = renderManifest.pages.find(
                    (p) => p.page_number === (page?.page_number ?? currentPage + 1),
                  )
                  const originalPath = page?.image_path
                  if (!renderedPage && !originalPath) return null
                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                        {t('overlay.compareTitle')}
                      </p>
                      {renderedPage?.error && (
                        <Banner variant="error">
                          {t('overlay.renderPageError', {
                            number: renderedPage.page_number,
                            error: renderedPage.error,
                          })}
                        </Banner>
                      )}
                      {renderedPage?.warnings.map((w, i) => (
                        <p key={i} className="text-xs text-amber-600 dark:text-amber-400">
                          {t('overlay.renderPageWarning', { warning: w })}
                        </p>
                      ))}
                      <div className="grid grid-cols-2 gap-3">
                        {originalPath && (
                          <div>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">
                              {t('overlay.compareOriginal')}
                            </p>
                            <img
                              src={`${API_BASE}${originalPath}`}
                              alt={t('overlay.compareOriginal')}
                              className="w-full rounded border border-gray-200 dark:border-zinc-700"
                            />
                          </div>
                        )}
                        {renderedPage?.serve_path && (
                          <div>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">
                              {t('overlay.compareRendered')}
                            </p>
                            <img
                              src={`${API_BASE}${renderedPage.serve_path}`}
                              alt={t('overlay.compareRendered')}
                              className="w-full rounded border border-gray-200 dark:border-zinc-700"
                              data-testid="rendered-page-img"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </details>

        {/* Inpainting — Fase I.A */}
        <details className="group bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none select-none hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors">
            <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t('overlay.inpaintTitle')}
            </span>
            <span className="text-gray-400 text-xs group-open:rotate-90 transition-transform">▶</span>
          </summary>
          <div className="px-4 pb-4 pt-1 space-y-3">
            <Banner variant="warning">{t('overlay.inpaintWarning')}</Banner>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                {t('overlay.inpaintAlgorithm')}
                <select
                  value={inpaintAlgorithm}
                  onChange={(e) => setInpaintAlgorithm(e.target.value)}
                  className="mt-1 block w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded px-2 py-1 text-xs"
                >
                  <option value="telea">Telea</option>
                  <option value="ns">NS</option>
                  <option value="blur">Blur</option>
                </select>
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                {t('overlay.inpaintPadding')}
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={inpaintPadding}
                  onChange={(e) => setInpaintPadding(Number(e.target.value))}
                  className="mt-1 block w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded px-2 py-1 text-xs"
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                {t('overlay.inpaintRadius')}
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={inpaintRadius}
                  onChange={(e) => setInpaintRadius(Number(e.target.value))}
                  className="mt-1 block w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded px-2 py-1 text-xs"
                />
              </label>
              <label className="text-xs text-gray-600 dark:text-zinc-400">
                {t('overlay.inpaintFeather')}
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={inpaintFeather}
                  onChange={(e) => setInpaintFeather(Number(e.target.value))}
                  className="mt-1 block w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded px-2 py-1 text-xs"
                />
              </label>
            </div>
            <Button onClick={handleInpaint} disabled={inpainting}>
              {inpainting ? t('overlay.inpainting') : t('overlay.inpaintBtn')}
            </Button>
            {inpaintError && <Banner variant="error">{inpaintError}</Banner>}
            {inpaintManifest && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {t('overlay.inpaintStats', {
                    inpainted: inpaintManifest.inpainted_pages,
                    total: inpaintManifest.total_pages,
                  })}
                </p>
                {inpaintManifest.zip_path && (
                  <a
                    href={`${API_BASE}${inpaintManifest.zip_path}`}
                    download
                    className="text-brand dark:text-indigo-400 hover:underline text-sm"
                    aria-label={t('overlay.downloadInpaintZip')}
                  >
                    {t('overlay.downloadInpaintZip')}
                  </a>
                )}
                {(() => {
                  const inpaintedPage = inpaintManifest.pages.find(
                    (p) => p.page_number === (page?.page_number ?? currentPage + 1),
                  )
                  if (!inpaintedPage?.serve_path) return null
                  const renderedPage = renderManifest?.pages.find(
                    (p) => p.page_number === inpaintedPage.page_number,
                  )
                  const originalPath = page?.image_path
                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">
                        {t('overlay.comparePage', { n: inpaintedPage.page_number })}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {originalPath && (
                          <div>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">
                              {t('overlay.compareOriginal')}
                            </p>
                            <img
                              src={`${API_BASE}${originalPath}`}
                              alt={t('overlay.compareOriginal')}
                              className="w-full rounded border border-gray-200 dark:border-zinc-700"
                            />
                          </div>
                        )}
                        {renderedPage?.serve_path && (
                          <div>
                            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">
                              {t('overlay.compareRendered')}
                            </p>
                            <img
                              src={`${API_BASE}${renderedPage.serve_path}`}
                              alt={t('overlay.compareRendered')}
                              className="w-full rounded border border-gray-200 dark:border-zinc-700"
                            />
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">
                            {t('overlay.compareInpainted')}
                          </p>
                          <img
                            src={`${API_BASE}${inpaintedPage.serve_path}`}
                            alt={t('overlay.compareInpainted')}
                            className="w-full rounded border border-gray-200 dark:border-zinc-700"
                            data-testid="inpainted-page-img"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </details>

      </div>
    </div>
  )
}

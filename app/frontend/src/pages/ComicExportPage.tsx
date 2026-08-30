import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileArchive,
  Loader2,
  Lock,
  Send,
} from 'lucide-react'
import {
  API_BASE,
  comicConvertJob,
  getComicExport,
  getJob,
  getJobStatus,
  getPipelineState,
  sendToKindle,
  startComicExport,
  updateMetadata,
} from '../api/client'
import type {
  ComicExportResponse,
  JobResponse,
  PipelineStateResponse,
  TranslationState,
} from '../types'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'

const POLL_INTERVAL_MS = 3000
const POLL_SOFT_TIMEOUT_MS = 10 * 60 * 1000 // 10 min — depois mostra "continua no backend"

const STEP_ROUTES: Record<string, (id: string) => string> = {
  analysis: (id) => `/analyze/${id}`,
  translation: (id) => `/analyze/${id}`,
  review: (id) => `/review/${id}`,
  overlay: (id) => `/overlay/${id}`,
  finalize: (id) => `/finalize/${id}`,
  finish: (id) => `/finish/${id}`,
  consistency: (id) => `/consistency/${id}`,
}

export default function ComicExportPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [job, setJob] = useState<JobResponse | null>(null)
  const [pipeline, setPipeline] = useState<PipelineStateResponse | null>(null)
  const [exportData, setExportData] = useState<ComicExportResponse | null>(null)

  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [pollTimedOut, setPollTimedOut] = useState(false)
  const pollStartRef = useRef<number>(0)

  const [sending, setSending] = useState(false)
  const [sendMessage, setSendMessage] = useState<{ kind: 'success' | 'warning' | 'error'; text: string } | null>(null)

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [metaSaved, setMetaSaved] = useState(false)

  const [quickKccOpen, setQuickKccOpen] = useState(false)
  const [quickKccBusy, setQuickKccBusy] = useState(false)
  const [quickKccMsg, setQuickKccMsg] = useState('')

  // ── Carga inicial ──────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setLoadError('')
    try {
      const [j, p] = await Promise.all([getJob(Number(id)), getPipelineState(Number(id))])
      setJob(j)
      setPipeline(p)
      setTitle(j.final_title || '')
      setAuthor(j.final_author || '')
      window.dispatchEvent(new CustomEvent('kindle:jobselect', {
        detail: { id: String(j.upload_id), type: j.processing_mode === 'comic' ? 'comic' : 'document', name: j.final_title || j.original_filename },
      }))
      try {
        const e = await getComicExport(Number(id))
        setExportData(e)
      } catch {
        setExportData(null) // 404 = nunca exportado — estado válido
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) setNotFound(true)
      else setLoadError(t('comicExport.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ── Polling do export em andamento ─────────────────────────────
  const isExportRunning = job?.comic_export_status === 'in_progress' || exporting
  useEffect(() => {
    if (!id || !isExportRunning) return
    if (!pollStartRef.current) pollStartRef.current = Date.now()
    const timer = setInterval(async () => {
      try {
        const s = await getJobStatus(Number(id))
        if (s.comic_export_status !== 'in_progress') {
          clearInterval(timer)
          setExporting(false)
          pollStartRef.current = 0
          setPollTimedOut(false)
          if (s.comic_export_status === 'failed') {
            setExportError(s.comic_export_error || t('comicExport.errorExport'))
          }
          await loadAll()
        } else if (Date.now() - pollStartRef.current > POLL_SOFT_TIMEOUT_MS) {
          // Honesto: backend pode continuar trabalhando — não declarar falha
          setPollTimedOut(true)
        }
      } catch {
        // Falha de rede no polling: manter tentativa, avisar via soft timeout
        if (Date.now() - pollStartRef.current > POLL_SOFT_TIMEOUT_MS) setPollTimedOut(true)
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [id, isExportRunning, loadAll, t])

  // ── Ações ──────────────────────────────────────────────────────
  const handleExport = async (force = false) => {
    if (!id) return
    setExportError('')
    setSendMessage(null)
    setExporting(true)
    pollStartRef.current = Date.now()
    try {
      await startComicExport(Number(id), { target: 'epub', force })
    } catch (err) {
      setExporting(false)
      const resp = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response
      const detail = resp?.data?.detail
      if (typeof detail === 'object' && detail !== null) {
        const d = detail as { message?: string }
        setExportError(d.message || t('comicExport.errorExport'))
      } else {
        setExportError(typeof detail === 'string' ? detail : t('comicExport.errorExport'))
      }
    }
  }

  const handleSend = async () => {
    if (!id) return
    setSending(true)
    setSendMessage(null)
    try {
      await sendToKindle(Number(id))
      setSendMessage({ kind: 'success', text: t('comicExport.sendSuccess') })
    } catch (err) {
      const resp = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response
      const detail = resp?.data?.detail
      const msg =
        typeof detail === 'object' && detail !== null
          ? (detail as { message?: string }).message || t('comicExport.sendError')
          : typeof detail === 'string' ? detail : t('comicExport.sendError')
      setSendMessage({ kind: resp?.status === 503 ? 'warning' : 'error', text: msg })
    } finally {
      setSending(false)
    }
  }

  const handleSaveMetadata = async () => {
    if (!id) return
    try {
      const j = await updateMetadata(Number(id), { final_title: title, final_author: author })
      setJob(j)
      setMetaSaved(true)
      setTimeout(() => setMetaSaved(false), 2000)
    } catch {
      setExportError(t('comicExport.errorMetadata'))
    }
  }

  const handleQuickKcc = async () => {
    if (!id) return
    setQuickKccBusy(true)
    setQuickKccMsg('')
    try {
      await comicConvertJob(Number(id))
      setQuickKccMsg(t('comicExport.quickKccStarted'))
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setQuickKccMsg(typeof detail === 'string' ? detail : t('comicExport.quickKccError'))
    } finally {
      setQuickKccBusy(false)
    }
  }

  // ── Estados derivados ──────────────────────────────────────────
  const exportStep = pipeline?.steps.find((s) => s.id === 'export')
  const finishDone = pipeline?.steps.find((s) => s.id === 'finish')?.status === 'done'
  const manifest = exportData?.manifest ?? null
  const exportDone = job?.comic_export_status === 'done' && manifest

  const translationBadge = (state: TranslationState) => {
    switch (state) {
      case 'full':
        return <Banner variant="success"><CheckCircle2 size={14} className="inline mr-1.5 -mt-0.5" />{t('comicExport.translationFull')}</Banner>
      case 'partial':
        return <Banner variant="warning"><AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />{t('comicExport.translationPartial')}</Banner>
      case 'none':
        return <Banner variant="warning"><AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />{t('comicExport.translationNone')}</Banner>
      default:
        return <p className="text-xs text-gray-500 dark:text-zinc-400">{t('comicExport.translationNotApplicable')}</p>
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 py-8">
          <Loader2 size={16} className="animate-spin" /> {t('comicExport.loading')}
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Banner variant="error">{t('comicExport.jobNotFound')}</Banner>
        <Link to="/" className="text-sm text-brand hover:underline">{t('comicExport.backHome')}</Link>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Banner variant="error">{loadError}</Banner>
        <Button variant="secondary" onClick={loadAll}>{t('comicExport.retry')}</Button>
      </div>
    )
  }

  if (job && job.processing_mode !== 'comic') {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Banner variant="info">{t('comicExport.notComic')}</Banner>
        <Link to={`/analyze/${id}`} className="text-sm text-brand hover:underline">
          {t('comicExport.goToAnalysis')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
          {t('comicExport.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
          {t('comicExport.subtitle')}
        </p>
      </div>

      {/* Bloqueado por pré-requisito */}
      {exportStep?.status === 'blocked' && (
        <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl p-5 shadow-card">
          <div className="flex items-start gap-3">
            <Lock size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                {t('comicExport.blockedTitle')}
              </p>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                {exportStep.blocked_reason || t('comicExport.blockedGeneric')}
              </p>
              {exportStep.prerequisite_step && id && (
                <Link
                  to={STEP_ROUTES[exportStep.prerequisite_step]?.(id) ?? `/analyze/${id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline mt-3"
                >
                  {t('comicExport.goToPrerequisite')} <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resumo do que será exportado */}
      {exportStep?.status !== 'blocked' && (
        <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl p-5 shadow-card space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            {t('comicExport.summaryTitle')}
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex justify-between border-b border-black/[0.04] dark:border-zinc-800 pb-1.5">
              <dt className="text-gray-500 dark:text-zinc-400">{t('comicExport.sourceLabel')}</dt>
              <dd className="font-medium text-gray-900 dark:text-zinc-100">
                {manifest
                  ? manifest.source === 'finished_pages'
                    ? t('comicExport.sourceFinished')
                    : t('comicExport.sourceFinal')
                  : finishDone
                    ? t('comicExport.sourceFinished')
                    : t('comicExport.sourceFinal')}
              </dd>
            </div>
            <div className="flex justify-between border-b border-black/[0.04] dark:border-zinc-800 pb-1.5">
              <dt className="text-gray-500 dark:text-zinc-400">{t('comicExport.formatLabel')}</dt>
              <dd className="font-medium text-gray-900 dark:text-zinc-100 font-mono-data">EPUB · CBZ</dd>
            </div>
            {manifest && (
              <>
                <div className="flex justify-between border-b border-black/[0.04] dark:border-zinc-800 pb-1.5">
                  <dt className="text-gray-500 dark:text-zinc-400">{t('comicExport.pagesLabel')}</dt>
                  <dd className="font-mono-data font-medium text-gray-900 dark:text-zinc-100">{manifest.page_count}</dd>
                </div>
                <div className="flex justify-between border-b border-black/[0.04] dark:border-zinc-800 pb-1.5">
                  <dt className="text-gray-500 dark:text-zinc-400">{t('comicExport.profileLabel')}</dt>
                  <dd className="font-mono-data font-medium text-gray-900 dark:text-zinc-100">{manifest.kcc_profile}</dd>
                </div>
              </>
            )}
          </dl>

          {/* Estado da tradução por proveniência real */}
          {manifest
            ? translationBadge(manifest.translation_state)
            : job?.comic_translation_status === 'done' && (
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {t('comicExport.translationPending')}
                </p>
              )}

          {/* Metadados */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-zinc-400">{t('comicExport.metaTitle')}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-gray-900 dark:text-zinc-100"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500 dark:text-zinc-400">{t('comicExport.metaAuthor')}</span>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-gray-900 dark:text-zinc-100"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={handleSaveMetadata}>
              {t('comicExport.saveMetadata')}
            </Button>
            {metaSaved && (
              <span className="text-xs text-feedback-success">{t('comicExport.metadataSaved')}</span>
            )}
          </div>

          {/* Ação principal */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-black/[0.05] dark:border-zinc-800">
            <Button
              variant="primary"
              onClick={() => handleExport(Boolean(exportDone))}
              disabled={isExportRunning}
            >
              {isExportRunning ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> {t('comicExport.exporting')}
                </span>
              ) : exportDone ? t('comicExport.reexport') : t('comicExport.startExport')}
            </Button>
            {isExportRunning && (
              <span className="text-xs text-gray-500 dark:text-zinc-400">
                {t('comicExport.exportingHint')}
              </span>
            )}
          </div>

          {pollTimedOut && isExportRunning && (
            <Banner variant="info">
              {t('comicExport.stillRunning')}{' '}
              <button className="underline" onClick={() => { pollStartRef.current = Date.now(); setPollTimedOut(false) }}>
                {t('comicExport.reconnect')}
              </button>
            </Banner>
          )}

          {exportError && (
            <Banner variant="error">
              <strong>{t('comicExport.errorTitle')}</strong> {exportError}
            </Banner>
          )}
        </div>
      )}

      {/* Resultado do export */}
      {exportDone && manifest && (
        <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl p-5 shadow-card space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-feedback-success" />
            {t('comicExport.resultTitle')}
          </h2>

          {manifest.size_warning && (
            <Banner variant="warning">{t('comicExport.sizeWarning')}</Banner>
          )}

          <div className="flex flex-wrap gap-3">
            {manifest.epub_serve_path && (
              <a
                href={`${API_BASE}${manifest.epub_serve_path}`}
                download
                className="inline-flex items-center gap-2 rounded-lg border border-brand/25 bg-brand/[0.07] px-4 py-2 text-sm font-medium text-brand hover:bg-brand/[0.12] dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300"
              >
                <Download size={14} /> {t('comicExport.downloadEpub')}
              </a>
            )}
            <a
              href={`${API_BASE}${manifest.cbz_serve_path}`}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
            >
              <FileArchive size={14} /> {t('comicExport.downloadCbz')}
            </a>
            <Button variant="action-green" onClick={handleSend} disabled={sending}>
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> {t('comicExport.sending')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Send size={14} /> {t('comicExport.sendToKindle')}
                </span>
              )}
            </Button>
          </div>

          {sendMessage && (
            <Banner variant={sendMessage.kind === 'success' ? 'success' : sendMessage.kind}>
              {sendMessage.text}
            </Banner>
          )}
        </div>
      )}

      {/* Conversão rápida do original — claramente separada */}
      <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl shadow-card">
        <button
          onClick={() => setQuickKccOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-left"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
            {t('comicExport.quickKccTitle')}
          </span>
          <span className="text-xs text-gray-400 dark:text-zinc-500">
            {quickKccOpen ? '−' : '+'}
          </span>
        </button>
        {quickKccOpen && (
          <div className="px-5 pb-4 space-y-3 border-t border-black/[0.05] dark:border-zinc-800 pt-3">
            <Banner variant="warning">{t('comicExport.quickKccWarning')}</Banner>
            <Button variant="secondary" size="sm" onClick={handleQuickKcc} disabled={quickKccBusy}>
              {quickKccBusy ? t('comicExport.quickKccBusy') : t('comicExport.quickKccAction')}
            </Button>
            {quickKccMsg && <p className="text-xs text-gray-500 dark:text-zinc-400">{quickKccMsg}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

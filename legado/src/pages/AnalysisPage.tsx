import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import {
  API_BASE,
  analyzeUpload,
  cancelOperation,
  comicConvertJob,
  comicTranslateJob,
  convertJob,
  getComicToolsStatus,
  getJob,
  getJobStatus,
  sendToKindle,
  translateJob,
  updateCover,
  updateMetadata,
} from '../api/client'
import type { ComicToolsStatus } from '../api/client'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import { RecommendedModePanel } from '../components/RecommendedModePanel'
import { StatusBadge } from '../components/StatusBadge'
import type { JobResponse, OperationProgress } from '../types'

const ACTIVE_STATUSES = ['analyzing', 'converting', 'sending']
const POLL_INTERVAL_MS = 3000
const TRANSLATE_TIMEOUT_MS = 20 * 60 * 1000 // 20 minutos

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<JobResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const [convertingKcc, setConvertingKcc] = useState(false)
  const [sending, setSending] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState<string | null>(null)
  const [comicTranslating, setComicTranslating] = useState(false)
  const [comicTranslateError, setComicTranslateError] = useState<string | null>(null)
  const [kccConvertError, setKccConvertError] = useState<string | null>(null)
  const [convertError, setConvertError] = useState<string | null>(null)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [comicTools, setComicTools] = useState<ComicToolsStatus | null>(null)
  const [elapsedTranslateSec, setElapsedTranslateSec] = useState(0)
  const [elapsedComicTranslateSec, setElapsedComicTranslateSec] = useState(0)
  const [elapsedConvertSec, setElapsedConvertSec] = useState(0)
  // P4 — progresso real da operação ativa + estado honesto de conexão/timeout
  const [opProgress, setOpProgress] = useState<OperationProgress | null>(null)
  const [activeOperation, setActiveOperation] = useState<string | null>(null)
  const [pollConnLost, setPollConnLost] = useState(false)
  const [pollStalled, setPollStalled] = useState<'translate' | 'comic_translate' | null>(null)
  const pollFailuresRef = useRef(0)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const translatePollStartRef = useRef<number | null>(null)
  const comicTranslatePollStartRef = useRef<number | null>(null)
  const convertStartRef = useRef<number | null>(null)
  const [form, setForm] = useState({
    final_title: '',
    final_author: '',
    final_language: 'por',
    final_filename: '',
  })
  const { t } = useTranslation()

  const langs = [
    { value: 'por', label: t('analysis.langs.por') },
    { value: 'eng', label: t('analysis.langs.eng') },
    { value: 'spa', label: t('analysis.langs.spa') },
  ]

  const translationLangs = [
    { value: 'por', label: t('analysis.langs.por') },
    { value: 'eng', label: t('analysis.langs.eng') },
    { value: 'spa', label: t('analysis.langs.spa') },
    { value: 'fra', label: t('analysis.langs.fra') },
    { value: 'deu', label: t('analysis.langs.deu') },
  ]

  useEffect(() => {
    if (!id) return
    analyzeUpload(Number(id))
      .then((result) => {
        setJob(result)
        setForm({
          final_title: result.final_title,
          final_author: result.final_author,
          final_language: result.final_language || 'por',
          final_filename: result.final_filename,
        })
      })
      .catch(() => setJob(null))
      .finally(() => setLoading(false))
    getComicToolsStatus()
      .then(setComicTools)
      .catch(() => setComicTools(null))
  }, [id])

  // Keep sidebar context in sync whenever job id or processing_mode changes
  useEffect(() => {
    if (!job) return
    window.dispatchEvent(new CustomEvent('kindle:jobselect', {
      detail: {
        id: String(job.upload_id),
        type: job.processing_mode as 'document' | 'comic',
        name: job.final_title || job.original_filename,
      },
    }))
  }, [job?.upload_id, job?.processing_mode])

  useEffect(() => () => { if (clearTimer.current) clearTimeout(clearTimer.current) }, [])

  useEffect(() => {
    const shouldPoll =
      job && (ACTIVE_STATUSES.includes(job.status) || job.translation_status === 'in_progress' || job.comic_translation_status === 'in_progress')
    if (!shouldPoll) return
    // Registrar momento de início para timeout
    if (job!.translation_status === 'in_progress' && translatePollStartRef.current === null) {
      translatePollStartRef.current = Date.now()
    }
    if (job!.comic_translation_status === 'in_progress' && comicTranslatePollStartRef.current === null) {
      comicTranslatePollStartRef.current = Date.now()
    }
    const timer = setInterval(async () => {
      try {
        const status = await getJobStatus(job!.upload_id)
        pollFailuresRef.current = 0
        setPollConnLost(false)
        // P4 — progresso real da operação ativa
        setOpProgress(status.progress ?? null)
        setActiveOperation(status.active_operation ?? null)
        // P4 — operação interrompida por restart do backend
        if (status.progress?.status === 'interrupted') {
          setComicTranslateError(null)
          setTranslateError(null)
        }
        // Timeout honesto: o backend pode continuar trabalhando — avisar,
        // manter último progresso, NÃO declarar falha falsa
        const now = Date.now()
        if (
          status.translation_status === 'in_progress' &&
          translatePollStartRef.current !== null &&
          now - translatePollStartRef.current > TRANSLATE_TIMEOUT_MS
        ) {
          setPollStalled('translate')
        }
        if (
          status.comic_translation_status === 'in_progress' &&
          comicTranslatePollStartRef.current !== null &&
          now - comicTranslatePollStartRef.current > TRANSLATE_TIMEOUT_MS
        ) {
          setPollStalled('comic_translate')
        }
        const stillActive =
          ACTIVE_STATUSES.includes(status.status) ||
          status.translation_status === 'in_progress' ||
          status.comic_translation_status === 'in_progress'
        if (!stillActive) {
          const full = await getJob(job!.upload_id)
          setJob(full)
          translatePollStartRef.current = null
          comicTranslatePollStartRef.current = null
          setPollStalled(null)
          setOpProgress(null)
          setActiveOperation(null)
          clearInterval(timer)
        } else {
          setJob((prev) =>
            prev
              ? {
                  ...prev,
                  status: status.status,
                  translation_status: status.translation_status,
                  comic_translation_status: status.comic_translation_status,
                }
              : prev,
          )
        }
      } catch {
        // Backend indisponível: manter polling e avisar (nunca spinner mudo)
        pollFailuresRef.current += 1
        if (pollFailuresRef.current >= 3) setPollConnLost(true)
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, job?.translation_status, job?.comic_translation_status])

  useEffect(() => {
    if (job?.translation_status !== 'in_progress') { setElapsedTranslateSec(0); return }
    const start = translatePollStartRef.current ?? Date.now()
    const timer = setInterval(() => setElapsedTranslateSec(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.translation_status])

  useEffect(() => {
    if (job?.comic_translation_status !== 'in_progress') { setElapsedComicTranslateSec(0); return }
    const start = comicTranslatePollStartRef.current ?? Date.now()
    const timer = setInterval(() => setElapsedComicTranslateSec(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.comic_translation_status])

  useEffect(() => {
    if (job?.status !== 'converting') { convertStartRef.current = null; setElapsedConvertSec(0); return }
    if (convertStartRef.current === null) convertStartRef.current = Date.now()
    const start = convertStartRef.current
    const timer = setInterval(() => setElapsedConvertSec(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [job?.status])

  const saveMetadata = async (extra?: Partial<typeof form & { comic_mode?: boolean; manga_rtl?: boolean; processing_mode?: string }>) => {
    if (!job) return
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const updated = await updateMetadata(job.upload_id, { ...form, ...extra })
      setJob(updated)
      setSaveStatus('success')
      clearTimer.current = setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as any)?.response?.data?.detail || t('analysis.errorSave')
      setSaveError(detail)
      setSaveStatus('error')
    }
  }

  const startSend = async () => {
    if (!job) return
    setSending(true)
    try {
      const updated = await sendToKindle(job.upload_id)
      setJob(updated)
    } catch {
      try {
        const updated = await getJob(job.upload_id)
        setJob(updated)
      } catch { /* ignore */ }
    } finally {
      setSending(false)
    }
  }

  const startConversion = async () => {
    if (!job) return
    setConverting(true)
    setConvertError(null)
    try {
      const updated = await convertJob(job.upload_id)
      setJob(updated)
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as any)?.response?.data?.detail || t('analysis.convertFailed')
      setConvertError(detail)
      try {
        const updated = await getJob(job.upload_id)
        setJob(updated)
      } catch { /* ignore */ }
    } finally {
      setConverting(false)
    }
  }

  const startTranslate = async () => {
    if (!job) return
    setTranslating(true)
    setTranslateError(null)
    try {
      const updated = await translateJob(job.upload_id)
      setJob(updated)
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as any)?.response?.data?.detail || t('analysis.translateFailed')
      setTranslateError(detail)
      try {
        const updated = await getJob(job.upload_id)
        setJob(updated)
      } catch { /* ignore */ }
    } finally {
      setTranslating(false)
    }
  }

  const startComicTranslate = async () => {
    if (!job) return
    setComicTranslating(true)
    setComicTranslateError(null)
    try {
      const updated = await comicTranslateJob(job.upload_id, {
        source_language: job.source_language || undefined,
        target_language: job.target_language || undefined,
        translator_engine: job.translator_engine || undefined,
      })
      setJob(updated)
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as any)?.response?.data?.detail || t('analysis.comicTranslateFailed')
      setComicTranslateError(detail)
    } finally {
      setComicTranslating(false)
    }
  }

  const startKccConversion = async () => {
    if (!job) return
    setConvertingKcc(true)
    setKccConvertError(null)
    try {
      const updated = await comicConvertJob(job.upload_id)
      setJob(updated)
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as any)?.response?.data?.detail || t('analysis.kccConvertFailed')
      setKccConvertError(detail)
      try {
        const updated = await getJob(job.upload_id)
        setJob(updated)
      } catch { /* ignore */ }
    } finally {
      setConvertingKcc(false)
    }
  }

  const selectCover = async (page: number) => {
    if (!job) return
    try {
      const updated = await updateCover(job.upload_id, page)
      setJob(updated)
    } catch {
      setCoverError(t('analysis.coverError'))
    }
  }

  // P4 — cancelamento cooperativo da operação ativa
  const handleCancelOperation = async () => {
    if (!job || !activeOperation) return
    const opId = activeOperation.split(':')[1]
    if (!opId) return
    try {
      await cancelOperation(job.upload_id, opId)
    } catch {
      // Operação já terminou — o próximo poll sincroniza o estado
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto mt-8 text-sm text-gray-500 dark:text-zinc-400">
        {t('analysis.loading')}
      </div>
    )
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto mt-8">
        <Banner variant="error">{t('analysis.errorLoad')}</Banner>
      </div>
    )
  }

  const isComic = job.processing_mode === 'comic'
  // P4 — qualquer operação ativa desabilita ações conflitantes
  const opBusy = Boolean(activeOperation ?? job.active_operation)
  const isPdf = job.input_format === 'pdf'
  const canAct = ['analyzed', 'converted', 'error'].includes(job.status)

  const comicSrcLang = job.source_language || 'por'
  const comicTgtLang = job.target_language || 'eng'
  const comicEngine = job.translator_engine || 'argos'
  const argosStatus = comicTools?.argos ?? null

  // Argos sem nenhum pacote instalado
  const isArgosNoPackages =
    comicEngine === 'argos' &&
    argosStatus !== null &&
    argosStatus.library_installed &&
    argosStatus.pairs.length === 0

  // Argos tem pacotes mas não tem o par selecionado
  const isArgosUnavailablePair =
    comicEngine === 'argos' &&
    argosStatus !== null &&
    argosStatus.library_installed &&
    argosStatus.pairs.length > 0 &&
    !argosStatus.pairs.some((p) => p.src === comicSrcLang && p.tgt === comicTgtLang)

  // Qualquer bloqueio de tradução
  const isTranslatePairBlocked = isArgosNoPackages || isArgosUnavailablePair

  // KCC indisponível
  const isKccUnavailable = comicTools !== null && !comicTools.kcc.available

  const isOcrBlockingConversion = !isComic && !!job.is_scanned && job.ocr_status === 'failed' && !job.ocr_used

  const fmtElapsed = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${s % 60}s`

  return (
    <div
      className="max-w-4xl mx-auto space-y-5"
      aria-busy={ACTIVE_STATUSES.includes(job.status)}
      aria-label={t('analysis.ariaLabel', { filename: job.original_filename })}
    >
      {/* Breadcrumb */}
      <Link
        to="/history"
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors"
      >
        ← {t('nav.jobs')}
      </Link>

      {/* P4 — backend indisponível durante polling (nunca spinner mudo) */}
      {pollConnLost && (
        <Banner variant="warning">{t('analysis.backendUnreachable')}</Banner>
      )}

      {/* Cabeçalho */}
      <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl px-5 py-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 truncate">
              {job.original_filename}
            </h1>
            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
              <StatusBadge status={job.status} />
              {job.input_format && (
                <span className="font-mono-data text-[11px] bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-md">
                  {job.input_format.toUpperCase()}
                </span>
              )}
              {job.page_count !== null && !isComic && (
                <span className="text-xs text-gray-400 dark:text-zinc-500">
                  {t('analysis.pageCount', { count: job.page_count })}
                </span>
              )}
              {isComic && (
                <span className="text-xs text-brand dark:text-indigo-400 font-medium">
                  {t('analysis.processingModeComic')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Override de modo para PDF */}
      {isPdf && (
        <section className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-brand"
              checked={isComic}
              onChange={(e) => saveMetadata({ processing_mode: e.target.checked ? 'comic' : 'document' })}
            />
            <span className="text-sm text-gray-700 dark:text-zinc-300">
              {t('analysis.overrideAsComic')}
            </span>
          </label>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 ml-7">
            {t('analysis.overrideAsComicHint')}
          </p>
        </section>
      )}

      {/* Banner de escaneamento (só documentos) */}
      {!isComic && job.is_scanned !== null && (
        <Banner variant={job.is_scanned ? 'warning' : 'success'}>
          {job.is_scanned ? (
            <>
              <strong>{t('analysis.scannedDetected')}</strong> {t('analysis.ocrNeeded')}
              <br />
              <span className="text-xs opacity-70">
                {t('analysis.avgChars', { count: job.avg_chars_per_page ?? 0 })}
              </span>
            </>
          ) : (
            <strong>{t('analysis.textPdf')}</strong>
          )}
        </Banner>
      )}

      {/* P3 — Modo Recomendado vs Avançado, logo após o cabeçalho (guia o fluxo) */}
      {isComic && (
        <RecommendedModePanel
          job={job}
          onJobRefresh={() => {
            getJob(job.upload_id).then(setJob).catch(() => { /* mantém estado atual */ })
          }}
        />
      )}

      {/* Banner de resultado do OCR (só documentos) */}
      {!isComic && job.is_scanned && job.ocr_status !== 'not_needed' && (
        <Banner variant={job.ocr_used ? 'success' : 'error'}>
          {job.ocr_used ? (
            <strong>{t('analysis.ocrSuccess')}</strong>
          ) : (
            <div className="space-y-1.5">
              <p>
                <strong>{t('analysis.ocrFailed')}</strong>{' '}
                {t('analysis.ocrFailedBlocked')}
              </p>
              <p className="text-xs opacity-90">{t('analysis.ocrFailedHowToFix')}</p>
              <p className="text-xs opacity-90">
                {t('analysis.ocrFailedRetry')}{' '}
                <Link to="/history" className="underline font-medium">
                  {t('analysis.ocrFailedRetryLink')}
                </Link>
              </p>
              {job.error_message && (
                <details className="text-xs opacity-70">
                  <summary className="cursor-pointer">{t('analysis.technicalDetails')}</summary>
                  <p className="mt-1 font-mono-data break-all">{job.error_message}</p>
                </details>
              )}
            </div>
          )}
        </Banner>
      )}

      {/* Erro de análise — suprimir se OCR já explica, ou quando é comic com OCR */}
      {job.error_message && !isOcrBlockingConversion && !(isComic && job.ocr_status === 'failed') && (
        <Banner variant="error">{job.error_message}</Banner>
      )}

      {/* Editor de metadados */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
          {t('analysis.metadataTitle')}
        </h3>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-5 space-y-4">
          <Field
            label={t('analysis.fieldTitle')}
            value={form.final_title}
            onChange={(v) => setForm({ ...form, final_title: v })}
          />
          <Field
            label={t('analysis.fieldAuthor')}
            value={form.final_author}
            onChange={(v) => setForm({ ...form, final_author: v })}
          />
          {!isComic && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">{t('analysis.fieldLanguage')}</label>
              <select
                value={form.final_language}
                onChange={(e) => setForm({ ...form, final_language: e.target.value })}
                className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {langs.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Field
            label={t('analysis.fieldFilename')}
            value={form.final_filename}
            onChange={(v) => setForm({ ...form, final_filename: v })}
          />

          {/* P7: CTA compacto e próximo do conteúdo (antes: w-full desproporcional) */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => saveMetadata()}
              disabled={saveStatus === 'saving'}
              size="sm"
              variant="secondary"
            >
              {saveStatus === 'saving' ? t('analysis.saving') : t('analysis.saveMetadata')}
            </Button>
            {saveStatus === 'success' && (
              <span className="text-xs text-green-600 dark:text-green-400">{t('analysis.metadataSaved')}</span>
            )}
          </div>

          {saveStatus === 'error' && (
            <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>
          )}
        </div>
      </section>

      {/* Seção de Tradução — documentos: controles; quadrinhos: aviso */}
      {!isComic ? (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
            {t('analysis.translateTitle')}
          </h3>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-5 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-blue-600"
                checked={!!job.translation_enabled}
                onChange={(e) => {
                  const enabled = e.target.checked
                  setJob({ ...job, translation_enabled: enabled })
                  updateMetadata(job.upload_id, { translation_enabled: enabled })
                    .then(setJob)
                    .catch(() => {})
                }}
              />
              <span className="text-sm text-gray-700 dark:text-zinc-300">{t('analysis.translateToggle')}</span>
            </label>
            <p className="text-xs text-gray-400 dark:text-zinc-500 ml-7">{t('analysis.translateToggleHint')}</p>

            {job.translation_enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">
                      {t('analysis.sourceLang')}
                    </label>
                    <select
                      value={job.source_language || 'por'}
                      onChange={(e) =>
                        updateMetadata(job.upload_id, { source_language: e.target.value })
                          .then(setJob)
                          .catch(() => {})
                      }
                      className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    >
                      {translationLangs.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">
                      {t('analysis.targetLang')}
                    </label>
                    <select
                      value={job.target_language || 'eng'}
                      onChange={(e) =>
                        updateMetadata(job.upload_id, { target_language: e.target.value })
                          .then(setJob)
                          .catch(() => {})
                      }
                      className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    >
                      {translationLangs.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {job.translation_status === 'in_progress' && (
                  opProgress && opProgress.operation_type === 'translate' ? (
                    <ProgressBar
                      progress={opProgress}
                      elapsedSec={elapsedTranslateSec}
                      onCancel={handleCancelOperation}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-brand dark:text-indigo-400">
                      <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>{t('analysis.translating')}</span>
                      {elapsedTranslateSec > 0 && (
                        <span className="text-xs opacity-60">({fmtElapsed(elapsedTranslateSec)})</span>
                      )}
                    </div>
                  )
                )}
                {pollStalled === 'translate' && job.translation_status === 'in_progress' && (
                  <Banner variant="info">
                    {t('analysis.stillProcessing')}{' '}
                    <button
                      className="underline"
                      onClick={() => { translatePollStartRef.current = Date.now(); setPollStalled(null) }}
                    >
                      {t('analysis.reconnect')}
                    </button>
                  </Banner>
                )}
                {job.translation_status === 'done' && (
                  <p className="text-sm text-green-600 dark:text-green-400">{t('analysis.translateDone')}</p>
                )}
                {job.translation_status === 'failed' && job.translation_error && (
                  <Banner variant="error">
                    <strong>{t('analysis.translateFailed')}</strong>{' '}
                    {/language pair|not available/i.test(job.translation_error)
                      ? t('analysis.translateErrorLangPair')
                      : /not installed|not found/i.test(job.translation_error)
                        ? t('analysis.translateErrorNotInstalled')
                        : t('analysis.translateErrorUnexpected')}
                  </Banner>
                )}
                {isArgosNoPackages && (
                  <Banner variant="warning">{t('analysis.argosNoPackages')}</Banner>
                )}
                {isArgosUnavailablePair && (
                  <Banner variant="warning">
                    {t('analysis.argosUnavailablePair', {
                      src: job.source_language || 'por',
                      tgt: job.target_language || 'eng',
                    })}
                  </Banner>
                )}
                {translateError && (
                  <Banner variant="error">{translateError}</Banner>
                )}

                <Button
                  variant="action-blue"
                  onClick={startTranslate}
                  disabled={translating || job.translation_status === 'in_progress' || isTranslatePairBlocked || opBusy}
                >
                  {translating || job.translation_status === 'in_progress'
                    ? t('analysis.translating')
                    : t('analysis.translateBtn')}
                </Button>
              </>
            )}
          </div>
        </section>
      ) : (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
            {t('analysis.translateTitle')}
          </h3>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-5 space-y-4">
            <Banner variant="warning">{t('analysis.comicTranslateExperimentalWarning')}</Banner>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="comic-src-lang" className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">
                  {t('analysis.sourceLang')}
                </label>
                <select
                  id="comic-src-lang"
                  value={job.source_language || 'por'}
                  onChange={(e) =>
                    updateMetadata(job.upload_id, { source_language: e.target.value })
                      .then(setJob)
                      .catch(() => {})
                  }
                  className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {translationLangs.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="comic-tgt-lang" className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">
                  {t('analysis.targetLang')}
                </label>
                <select
                  id="comic-tgt-lang"
                  value={job.target_language || 'eng'}
                  onChange={(e) =>
                    updateMetadata(job.upload_id, { target_language: e.target.value })
                      .then(setJob)
                      .catch(() => {})
                  }
                  className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                  {translationLangs.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {job.comic_translation_status === 'in_progress' && (
              opProgress && opProgress.operation_type === 'comic_translate' ? (
                <ProgressBar
                  progress={opProgress}
                  elapsedSec={elapsedComicTranslateSec}
                  onCancel={handleCancelOperation}
                />
              ) : (
                <div className="flex items-center gap-2 text-sm text-brand dark:text-indigo-400">
                  <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{t('analysis.comicTranslating')}</span>
                  {elapsedComicTranslateSec > 0 && (
                    <span className="text-xs opacity-60">({fmtElapsed(elapsedComicTranslateSec)})</span>
                  )}
                </div>
              )
            )}
            {pollStalled === 'comic_translate' && job.comic_translation_status === 'in_progress' && (
              <Banner variant="info">
                {t('analysis.stillProcessing')}{' '}
                <button
                  className="underline"
                  onClick={() => { comicTranslatePollStartRef.current = Date.now(); setPollStalled(null) }}
                >
                  {t('analysis.reconnect')}
                </button>
              </Banner>
            )}
            {opProgress?.status === 'interrupted' && (
              <Banner variant="warning">{opProgress.message || t('progress.interrupted')}</Banner>
            )}
            {job.comic_translation_status === 'done' && (
              <div className="space-y-3">
                <p className="text-sm text-green-600 dark:text-green-400">{t('analysis.comicTranslateDone')}</p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`${API_BASE}/storage/output/${job.upload_id}/comic_translation.json`}
                    download
                    className="text-sm text-brand dark:text-indigo-400 underline"
                  >
                    {t('analysis.comicTranslateDownloadJson')}
                  </a>
                  <a
                    href={`${API_BASE}/storage/output/${job.upload_id}/comic_translation.html`}
                    download
                    className="text-sm text-brand dark:text-indigo-400 underline"
                  >
                    {t('analysis.comicTranslateDownloadHtml')}
                  </a>
                </div>
                <Link
                  to={`/review/${job.upload_id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand dark:text-indigo-400 border border-brand/25 dark:border-indigo-800 rounded-lg px-4 py-2 hover:bg-brand/5 dark:hover:bg-indigo-950 transition-colors"
                >
                  {t('analysis.comicReviewBtn')}
                </Link>
              </div>
            )}
            {isArgosNoPackages && (
              <Banner variant="warning">
                {t('analysis.argosNoPackages')}
              </Banner>
            )}
            {isArgosUnavailablePair && (
              <Banner variant="warning">
                {t('analysis.argosUnavailablePair', { src: comicSrcLang, tgt: comicTgtLang })}
              </Banner>
            )}
            {job.comic_translation_status === 'failed' && (
              <Banner variant="error">
                {job.comic_translation_error || t('analysis.comicTranslateFailed')}
              </Banner>
            )}
            {comicTranslateError && <Banner variant="error">{comicTranslateError}</Banner>}

            <Button
              variant="action-blue"
              onClick={startComicTranslate}
              disabled={comicTranslating || job.comic_translation_status === 'in_progress' || isTranslatePairBlocked || opBusy}
            >
              {comicTranslating || job.comic_translation_status === 'in_progress'
                ? t('analysis.comicTranslating')
                : t('analysis.comicTranslateBtn')}
            </Button>
          </div>
        </section>
      )}

      {/* Seção KCC — quadrinhos/mangá */}
      {isComic && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
            {t('analysis.comicTitle')}
          </h3>
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-5 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-brand"
                checked={!!job.comic_mode}
                onChange={(e) => {
                  setJob({ ...job, comic_mode: e.target.checked })
                  updateMetadata(job.upload_id, { comic_mode: e.target.checked })
                    .then(setJob)
                    .catch(() => {})
                }}
              />
              <span className="text-sm text-gray-700 dark:text-zinc-300">{t('analysis.comicModeToggle')}</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-brand"
                checked={!!job.manga_rtl}
                onChange={(e) => {
                  setJob({ ...job, manga_rtl: e.target.checked })
                  updateMetadata(job.upload_id, { manga_rtl: e.target.checked })
                    .then(setJob)
                    .catch(() => {})
                }}
              />
              <span className="text-sm text-gray-700 dark:text-zinc-300">{t('analysis.comicRtlToggle')}</span>
            </label>
          </div>
        </section>
      )}

      {/* Seleção de capa (só documentos com thumbnails) */}
      {!isComic && job.thumbnails.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
            {t('analysis.coverTitle')}
          </h3>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mb-3">{t('analysis.coverHint')}</p>
          <div className="flex gap-3 flex-wrap">
            {job.thumbnails.map((url, i) => (
              <button
                key={i}
                onClick={() => selectCover(i)}
                className={`border-2 rounded-lg overflow-hidden transition-all ${
                  job.selected_cover_page === i
                    ? 'border-brand ring-2 ring-brand/30'
                    : 'border-gray-200 dark:border-zinc-600 hover:border-gray-400 dark:hover:border-zinc-400'
                }`}
              >
                <img
                  src={`${API_BASE}${url}`}
                  alt={t('analysis.pageAlt', { number: i + 1 })}
                  className="w-24 object-cover"
                />
                <p className="text-xs text-center py-1 text-gray-400 dark:text-zinc-500 dark:bg-zinc-800">
                  {t('analysis.pageLabel', { number: i + 1 })}
                </p>
              </button>
            ))}
          </div>
          {job.selected_cover_page !== null && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              {t('analysis.coverSelected', { number: job.selected_cover_page + 1 })}
            </p>
          )}
          {coverError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">{coverError}</p>
          )}
        </section>
      )}

      {/* Resultado da conversão */}
      {job.conversion_status === 'done' && job.send_status !== 'sent' && (
        <Banner variant="success">
          <strong>{t('analysis.epubReady')}</strong>{' '}
          <a
            href={`${API_BASE}/storage/output/${job.upload_id}/${job.final_filename}.epub`}
            download
            className="underline font-medium"
          >
            {t('analysis.downloadEpub')}
          </a>
        </Banner>
      )}

      {/* Resultado do envio */}
      {job.send_status === 'sent' && (
        <Banner variant="success">
          <strong>{t('analysis.sendSuccess')}</strong>
        </Banner>
      )}
      {job.send_status === 'pending' && (
        <Banner variant="warning">
          <strong>{t('analysis.sendPending')}</strong>{' '}
          {t('analysis.sendPendingHint')}
        </Banner>
      )}
      {job.send_status === 'failed' && job.send_error && (
        <Banner variant="error">
          <strong>{t('analysis.sendFailed')}</strong> {job.send_error}
        </Banner>
      )}

      {/* Ações */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
          {t('analysis.actionsTitle')}
        </h3>
        <div className="flex flex-wrap gap-3">
          {/* Conversão via Calibre — apenas documentos */}
          {!isComic && (
            <Button
              variant="action-blue"
              onClick={startConversion}
              disabled={converting || !canAct || isOcrBlockingConversion || opBusy}
            >
              {converting ? t('analysis.converting') : t('analysis.convert')}
            </Button>
          )}

          {/* Conversão via KCC — apenas quadrinhos (SEMPRE o arquivo original) */}
          {isComic && job.comic_translation_status === 'done' && (
            <Banner variant="warning">
              {t('analysis.kccUsesOriginal')}{' '}
              <Link to={`/export/${job.upload_id}`} className="underline font-medium">
                {t('analysis.goToExport')}
              </Link>
            </Banner>
          )}
          {isComic && (
            <Button
              variant="action-blue"
              onClick={startKccConversion}
              disabled={convertingKcc || !canAct || isKccUnavailable || opBusy}
              title={isKccUnavailable ? t('analysis.kccUnavailableHint') : undefined}
            >
              {convertingKcc ? t('analysis.convertingKCC') : t('analysis.convertKCCOriginal')}
            </Button>
          )}

          {/* Comic com tradução: envio acontece na etapa Exportar (política C) */}
          {isComic && job.comic_translation_status === 'done' ? (
            <Link
              to={`/export/${job.upload_id}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border bg-feedback-success-bg border-feedback-success-border text-feedback-success hover:bg-emerald-100 px-4 py-2 text-sm font-medium dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900"
            >
              {t('analysis.goToExportCta')}
            </Link>
          ) : (
            <Button
              variant="action-green"
              onClick={startSend}
              disabled={
                sending ||
                job.conversion_status !== 'done' ||
                job.send_status === 'sent'
              }
            >
              {sending ? t('analysis.sending') : t('analysis.sendToKindle')}
            </Button>
          )}
        </div>

        {/* Status de conversão — exibido durante job.status=converting */}
        {job.status === 'converting' && (
          <div className="flex items-center gap-2 mt-3 text-sm text-brand dark:text-indigo-400">
            <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>{isComic ? t('analysis.convertingKCC') : t('analysis.converting')}</span>
            {elapsedConvertSec > 0 && (
              <span className="text-xs opacity-60">({fmtElapsed(elapsedConvertSec)})</span>
            )}
          </div>
        )}
        {isOcrBlockingConversion && (
          <Banner variant="error" className="mt-3">
            {t('analysis.convertBlockedOcr')}
          </Banner>
        )}
        {convertError && !isOcrBlockingConversion && (
          <Banner variant="error" className="mt-3">
            {convertError}
          </Banner>
        )}
        {!canAct && (
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">{t('analysis.waitAnalysis')}</p>
        )}
        {isComic && isKccUnavailable && (
          <Banner variant="warning" className="mt-3">
            {t('analysis.kccUnavailable')}
          </Banner>
        )}
        {kccConvertError && (
          <Banner variant="error" className="mt-3">
            {kccConvertError}
          </Banner>
        )}
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Loader2, Sparkles, XCircle } from 'lucide-react'
import {
  cancelOperation,
  getJobStatus,
  getQuickPreflight,
  startQuickPipeline,
  updateMetadata,
} from '../api/client'
import type { QuickPreflightResponse } from '../api/client'
import type { JobResponse, OperationProgress } from '../types'
import { Banner } from './Banner'
import { Button } from './Button'
import { ProgressBar } from './ProgressBar'

const POLL_MS = 3000

const STEP_LABEL_KEYS: Record<string, string> = {
  translation: 'recommended.stepTranslation',
  review: 'recommended.stepReview',
  overlay: 'recommended.stepOverlay',
  render: 'recommended.stepRender',
  finalize: 'recommended.stepFinalize',
}

/**
 * P3 — Painel do Modo Recomendado (quick pipeline).
 * Mostra o preflight (o que será automatizado), exige confirmação explícita,
 * acompanha o progresso e leva à etapa Exportar (que pede nova confirmação).
 */
export function RecommendedModePanel({
  job,
  onJobRefresh,
}: {
  job: JobResponse
  onJobRefresh: () => void
}) {
  const { t } = useTranslation()
  const isRecommended = (job.flow_mode ?? 'advanced') === 'recommended'

  const [preflight, setPreflight] = useState<QuickPreflightResponse | null>(null)
  const [preflightError, setPreflightError] = useState('')
  const [loadingPreflight, setLoadingPreflight] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<OperationProgress | null>(null)
  const [runError, setRunError] = useState('')
  const [finished, setFinished] = useState(false)
  const [switching, setSwitching] = useState(false)
  const opIdRef = useRef<string | null>(null)

  const loadPreflight = useCallback(() => {
    if (!isRecommended || !job.comic_translation_enabled) return
    setLoadingPreflight(true)
    setPreflightError('')
    getQuickPreflight(job.upload_id)
      .then(setPreflight)
      .catch(() => setPreflightError(t('recommended.preflightError')))
      .finally(() => setLoadingPreflight(false))
  }, [job.upload_id, job.comic_translation_enabled, isRecommended, t])

  useEffect(() => {
    loadPreflight()
  }, [loadPreflight])

  // Retomada: operação quick_pipeline já ativa (refresh no meio da execução)
  useEffect(() => {
    if (job.active_operation?.startsWith('quick_pipeline:')) {
      opIdRef.current = job.active_operation.split(':')[1]
      setRunning(true)
    }
  }, [job.active_operation])

  // Polling do progresso enquanto roda
  useEffect(() => {
    if (!running) return
    const timer = setInterval(async () => {
      try {
        const s = await getJobStatus(job.upload_id)
        setProgress(s.progress ?? null)
        const stillRunning = s.active_operation?.startsWith('quick_pipeline:')
        if (!stillRunning) {
          clearInterval(timer)
          setRunning(false)
          if (s.progress?.status === 'failed') {
            setRunError(s.progress.message || t('recommended.runError'))
          } else if (s.progress?.status === 'cancelled') {
            setRunError('')
          } else if (s.progress?.status === 'interrupted') {
            setRunError(s.progress.message || '')
          } else {
            setFinished(true)
          }
          onJobRefresh()
          loadPreflight()
        }
      } catch {
        // mantém tentando; sem falha falsa
      }
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [running, job.upload_id, onJobRefresh, loadPreflight, t])

  const handleSwitchMode = async (mode: 'recommended' | 'advanced') => {
    setSwitching(true)
    try {
      await updateMetadata(job.upload_id, { flow_mode: mode })
      onJobRefresh()
    } catch {
      /* refresh cobre */
    } finally {
      setSwitching(false)
    }
  }

  const handleStart = async () => {
    setRunError('')
    setFinished(false)
    try {
      const r = await startQuickPipeline(job.upload_id)
      opIdRef.current = r.operation_id
      setRunning(true)
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      const msg =
        typeof detail === 'object' && detail !== null
          ? ((detail as { message?: string; failures?: string[] }).failures?.join(' ') ||
             (detail as { message?: string }).message)
          : typeof detail === 'string' ? detail : null
      setRunError(msg || t('recommended.runError'))
    }
  }

  const handleCancel = async () => {
    if (opIdRef.current) {
      try {
        await cancelOperation(job.upload_id, opIdRef.current)
      } catch { /* próximo poll sincroniza */ }
    }
  }

  const stepLabel = (s: string) => t(STEP_LABEL_KEYS[s] ?? s)

  return (
    <section className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl px-5 py-4 shadow-card space-y-3">
      {/* Toggle Recomendado / Avançado */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
          <Sparkles size={13} className="text-brand" />
          {t('recommended.title')}
        </h3>
        <div className="flex rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden text-xs" role="group" aria-label={t('recommended.modeToggle')}>
          {(['recommended', 'advanced'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleSwitchMode(mode)}
              disabled={switching}
              aria-pressed={(job.flow_mode ?? 'advanced') === mode}
              className={`px-3 py-1.5 font-medium transition-colors ${
                (job.flow_mode ?? 'advanced') === mode
                  ? 'bg-brand text-white'
                  : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              {mode === 'recommended' ? t('recommended.modeRecommended') : t('recommended.modeAdvanced')}
            </button>
          ))}
        </div>
      </div>

      {!isRecommended && (
        <p className="text-xs text-gray-500 dark:text-zinc-400">
          {t('recommended.advancedHint')}
        </p>
      )}

      {isRecommended && !job.comic_translation_enabled && (
        <Banner variant="info">{t('recommended.noTranslationHint')}</Banner>
      )}

      {isRecommended && job.comic_translation_enabled && (
        <>
          {loadingPreflight && (
            <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
              <Loader2 size={13} className="animate-spin" /> {t('recommended.loadingPreflight')}
            </p>
          )}
          {preflightError && (
            <Banner variant="error">
              {preflightError}{' '}
              <button className="underline" onClick={loadPreflight}>{t('recommended.retry')}</button>
            </Banner>
          )}

          {preflight && !running && !finished && (
            <div className="space-y-3">
              {/* Resumo do que será automatizado */}
              <div className="text-sm text-gray-700 dark:text-zinc-300 space-y-1">
                <p>
                  {t('recommended.summaryLine', {
                    pages: preflight.plan.page_count,
                    src: preflight.plan.source_language,
                    tgt: preflight.plan.target_language,
                    engine: preflight.plan.engine,
                  })}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {t('recommended.stepsToRun')}:{' '}
                  {preflight.plan.steps_to_run.map(stepLabel).join(' → ')}
                  {preflight.plan.steps_reused.length > 0 && (
                    <> · {t('recommended.stepsReused')}: {preflight.plan.steps_reused.map(stepLabel).join(', ')}</>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {t('recommended.willAutoApprove')}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {t('recommended.exportConfirmNote')}
                </p>
              </div>

              {/* Checks com falha */}
              {preflight.checks.filter((c) => !c.ok).map((c) => (
                <p key={c.id} className={`flex items-start gap-1.5 text-xs ${c.critical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  <XCircle size={13} className="shrink-0 mt-0.5" /> {c.detail}
                </p>
              ))}

              <Button
                variant="primary"
                onClick={handleStart}
                disabled={!preflight.ok || Boolean(job.active_operation)}
              >
                {t('recommended.confirmStart')}
              </Button>
            </div>
          )}

          {running && progress && (
            <ProgressBar progress={progress} onCancel={handleCancel} />
          )}
          {running && !progress && (
            <p className="flex items-center gap-2 text-sm text-brand dark:text-indigo-400">
              <Loader2 size={14} className="animate-spin" /> {t('recommended.starting')}
            </p>
          )}

          {runError && <Banner variant="error">{runError}</Banner>}

          {finished && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm text-feedback-success">
                <CheckCircle2 size={15} /> {t('recommended.finished')}
              </p>
              <Link
                to={`/export/${job.upload_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
              >
                {t('recommended.goToExport')} <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  )
}

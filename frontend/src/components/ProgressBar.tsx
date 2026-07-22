import { useTranslation } from 'react-i18next'
import type { OperationProgress } from '../types'

/**
 * Barra de progresso honesta (P4):
 * - determinate: percent real + "N de M" quando total é conhecido
 * - indeterminate: barra animada + mensagem real da etapa, sem percentual inventado
 */
export function ProgressBar({
  progress,
  elapsedSec,
  onCancel,
}: {
  progress: OperationProgress
  elapsedSec?: number
  onCancel?: () => void
}) {
  const { t } = useTranslation()
  const determinate = progress.total !== null && progress.total > 0

  return (
    <div className="space-y-1.5" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
        <span className="truncate">
          {progress.message || t('progress.working')}
        </span>
        <span className="font-mono-data shrink-0 ml-3">
          {determinate
            ? `${progress.current}/${progress.total} · ${progress.percent ?? 0}%`
            : t('progress.noEstimate')}
          {typeof elapsedSec === 'number' && elapsedSec > 0 && (
            <span className="ml-2 opacity-60">
              {elapsedSec < 60 ? `${elapsedSec}s` : `${Math.floor(elapsedSec / 60)}min ${elapsedSec % 60}s`}
            </span>
          )}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
        {determinate ? (
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${progress.percent ?? 0}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-brand animate-indeterminate" />
        )}
      </div>
      {onCancel && progress.status === 'running' && (
        <button
          onClick={onCancel}
          className="text-[11px] text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 underline"
        >
          {t('progress.cancel')}
        </button>
      )}
    </div>
  )
}

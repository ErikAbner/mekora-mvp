import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getJobHealth, repairJob } from '../api/client'
import type { JobHealthResponse, JobRepairResponse } from '../types'

interface JobHealthPanelProps {
  jobId: number
  autoLoad?: boolean
}

export function JobHealthPanel({ jobId, autoLoad = true }: JobHealthPanelProps) {
  const { t } = useTranslation()
  const [health, setHealth] = useState<JobHealthResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [repairResult, setRepairResult] = useState<JobRepairResponse | null>(null)

  useEffect(() => {
    if (autoLoad) {
      setLoading(true)
      getJobHealth(jobId)
        .then(setHealth)
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [jobId, autoLoad])

  const handleRepair = async () => {
    setRepairing(true)
    setRepairResult(null)
    try {
      const result = await repairJob(jobId)
      setRepairResult(result)
      setHealth(result.health)
    } catch {
      // silently ignore
    } finally {
      setRepairing(false)
    }
  }

  if (loading) {
    return (
      <div className="text-xs text-gray-400 dark:text-zinc-500 italic py-2">
        {t('health.title')}…
      </div>
    )
  }

  if (!health) return null

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            health.is_healthy
              ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
          }`}
        >
          {health.is_healthy ? '✓' : '!'}{' '}
          {health.is_healthy ? t('health.healthy') : t('health.attention')}
        </span>
        <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
          {t('health.title')}
        </span>
      </div>

      {/* Checks */}
      <ul className="space-y-1">
        {health.checks.map((check, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs">
            <span
              className={`shrink-0 font-bold ${
                check.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {check.ok ? '✓' : '✗'}
            </span>
            <span className="text-gray-700 dark:text-zinc-300">
              {check.name}
              {check.detail ? (
                <span className="text-gray-400 dark:text-zinc-500 ml-1">— {check.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {/* Manifestos ausentes */}
      {health.manifests_missing.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">
            {t('health.manifestsMissing')}
          </p>
          <ul className="space-y-0.5">
            {health.manifests_missing.map((m) => (
              <li key={m} className="text-xs text-red-600 dark:text-red-400 font-mono">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Próximo passo sugerido */}
      {health.recommended_next_action && (
        <p className="text-xs text-gray-500 dark:text-zinc-400 italic">
          <span className="font-medium not-italic text-gray-600 dark:text-zinc-300">
            {t('health.recommended')}:{' '}
          </span>
          {health.recommended_next_action}
        </p>
      )}

      {/* Botão de reparo */}
      <button
        onClick={handleRepair}
        disabled={repairing}
        className="text-xs text-blue-600 dark:text-blue-400 underline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {repairing ? t('health.repairing') : t('health.repairBtn')}
      </button>

      {/* Resultado do reparo */}
      {repairResult && (
        <div className="text-xs space-y-1">
          {repairResult.repaired.length > 0 ? (
            <p className="text-green-600 dark:text-green-400">
              {t('health.repairDone', { count: repairResult.repaired.length })}
            </p>
          ) : (
            <p className="text-gray-500 dark:text-zinc-400 italic">{t('health.nothingRepaired')}</p>
          )}
          {repairResult.repaired.map((r, i) => (
            <p key={i} className="text-gray-500 dark:text-zinc-400 pl-2 font-mono text-[10px]">
              {r}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

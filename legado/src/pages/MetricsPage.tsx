import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, BarChart3, CheckCircle2, Clock, TrendingUp, XCircle } from 'lucide-react'
import type { FailureEntry, MetricsSummary, StageStats } from '../types'
import { getMetricsFailures, getMetricsSummary, getMetricsStages } from '../api/client'

/** Minimal SVG donut chart (no external deps) */
function DonutChart({ value, max = 100, color = '#4338CA', size = 80 }: {
  value: number; max?: number; color?: string; size?: number
}) {
  const r = 30
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const dash = pct * circ
  const cx = size / 2
  const cy = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={8}
        className="text-gray-100 dark:text-zinc-800" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize="12" fontWeight="700" fill="currentColor"
        className="fill-gray-900 dark:fill-zinc-100">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

export default function MetricsPage() {
  const { t } = useTranslation()

  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [stages, setStages] = useState<StageStats[]>([])
  const [failures, setFailures] = useState<FailureEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([getMetricsSummary(), getMetricsStages(), getMetricsFailures()])
      .then(([s, st, f]) => {
        setSummary(s)
        setStages(st)
        setFailures(f)
      })
      .catch(() => setError(t('metrics.errorLoad')))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const successRate = summary && summary.total > 0
    ? Math.round((summary.done / summary.total) * 100)
    : 0

  const avgTimeMin = stages.length > 0
    ? (stages.reduce((acc, s) => acc + (s.avg_ms ?? 0), 0) / stages.length / 60000).toFixed(1)
    : '—'

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hero banner */}
      <div className="rounded-2xl bg-brand/[0.06] dark:bg-brand/10 border border-brand/20 px-6 py-5 flex items-center gap-5">
        <div className="w-12 h-12 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center shrink-0">
          <BarChart3 size={22} className="text-brand" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 dark:text-zinc-100">{t('metrics.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{t('metrics.subtitle')}</p>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-zinc-700 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4" role="alert">
          <XCircle size={16} /> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* KPI stats (PDF frame 11) */}
          <section aria-labelledby="kpi-heading">
            <h2 id="kpi-heading" className="sr-only">{t('metrics.summaryTitle')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  icon: <BarChart3 size={16} />,
                  label: t('metrics.totalJobs'),
                  value: summary?.total ?? 0,
                  unit: t('metrics.unitJobs'),
                },
                {
                  icon: <Clock size={16} />,
                  label: t('metrics.avgTime'),
                  value: avgTimeMin,
                  unit: t('metrics.unitMin'),
                },
                {
                  icon: <CheckCircle2 size={16} />,
                  label: t('metrics.successRate'),
                  value: `${successRate}%`,
                  unit: '',
                },
                {
                  icon: <TrendingUp size={16} />,
                  label: t('metrics.doneJobs'),
                  value: summary?.done ?? 0,
                  unit: t('metrics.unitJobs'),
                },
              ].map(({ icon, label, value, unit }) => (
                <div
                  key={label}
                  className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl p-4 shadow-card"
                >
                  <div className="flex items-center gap-1.5 mb-3 text-gray-400 dark:text-zinc-500">
                    {icon}
                    <span className="text-[11px] font-medium text-gray-400 dark:text-zinc-500">{label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100 font-mono-data leading-none">
                    {value}
                    {unit && <span className="text-sm font-normal text-gray-400 dark:text-zinc-500 ml-1">{unit}</span>}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Main content: stages table + distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stage performance table */}
            <section
              aria-labelledby="stages-heading"
              className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl overflow-hidden shadow-card"
            >
              <div className="px-5 py-4 border-b border-black/[0.05] dark:border-zinc-800">
                <h2 id="stages-heading" className="text-sm font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  <Activity size={15} className="text-indigo-500" />
                  {t('metrics.stagesTitle')}
                </h2>
              </div>
              {stages.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-400 dark:text-zinc-500">{t('metrics.noData')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/60">
                        {[t('metrics.colStage'), t('metrics.colTotal'), t('metrics.colAvgMs'), t('metrics.colP95Ms'), t('metrics.colFailPct')].map((h) => (
                          <th key={h} scope="col" className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04] dark:divide-zinc-800">
                      {stages.map((s) => (
                        <tr key={s.stage} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40">
                          <td className="px-5 py-3 font-mono-data text-gray-700 dark:text-zinc-300">{s.stage}</td>
                          <td className="px-5 py-3 text-right font-mono-data text-gray-600 dark:text-zinc-400">{s.total}</td>
                          <td className="px-5 py-3 text-right font-mono-data text-gray-600 dark:text-zinc-400">
                            {s.avg_ms !== null ? s.avg_ms.toFixed(0) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right font-mono-data text-gray-600 dark:text-zinc-400">
                            {s.p95_ms !== null ? s.p95_ms.toFixed(0) : '—'}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`font-mono-data font-semibold ${s.fail_pct > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {s.fail_pct.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Distribution donut */}
            <section
              aria-labelledby="dist-heading"
              className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl p-5 shadow-card flex flex-col"
            >
              <h2 id="dist-heading" className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-4">
                {t('metrics.distributionTitle')}
              </h2>
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <DonutChart value={successRate} color="#4338CA" size={100} />
                <div className="w-full space-y-2">
                  {[
                    { label: t('metrics.doneJobs'), value: summary?.done ?? 0, color: 'bg-indigo-500' },
                    { label: t('metrics.errorJobs'), value: summary?.error ?? 0, color: 'bg-red-500' },
                    { label: t('metrics.pendingSend'), value: summary?.pending_send ?? 0, color: 'bg-amber-500' },
                    { label: t('metrics.inProgress'), value: summary?.in_progress ?? 0, color: 'bg-cyan-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${color}`} />
                        <span className="text-gray-600 dark:text-zinc-400">{label}</span>
                      </div>
                      <span className="font-mono-data font-semibold text-gray-900 dark:text-zinc-100">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Recent failures */}
          {failures.length > 0 && (
            <section aria-labelledby="failures-heading" className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl overflow-hidden shadow-card">
              <div className="px-5 py-4 border-b border-black/[0.05] dark:border-zinc-800">
                <h2 id="failures-heading" className="text-sm font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  <XCircle size={15} className="text-red-500" />
                  {t('metrics.failuresTitle')}
                </h2>
              </div>
              <ul className="divide-y divide-black/[0.04] dark:divide-zinc-800">
                {failures.map((f, i) => (
                  <li key={i} className="px-5 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono-data text-gray-500 dark:text-zinc-400">
                        #{String(f.job_id).padStart(4, '0')}
                      </span>
                      <span className="text-gray-300 dark:text-zinc-600">·</span>
                      <span className="font-mono-data text-xs text-gray-600 dark:text-zinc-400">{f.stage}</span>
                      {f.error_type && (
                        <>
                          <span className="text-gray-300 dark:text-zinc-600">·</span>
                          <span className="text-red-600 dark:text-red-400 text-xs font-medium">{f.error_type}</span>
                        </>
                      )}
                      {f.created_at && (
                        <span className="ml-auto font-mono-data text-[11px] text-gray-400 dark:text-zinc-500">
                          {new Date(f.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                    {f.error_message && (
                      <p className="text-gray-500 dark:text-zinc-400 text-xs mt-0.5 truncate">{f.error_message}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {failures.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={15} />
              {t('metrics.noFailures')}
            </div>
          )}
        </>
      )}
    </div>
  )
}

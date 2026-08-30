import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, FileText, Layers, Search, SlidersHorizontal } from 'lucide-react'
import { duplicateJob, getHistory, retrySend } from '../api/client'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { QuickActions } from '../components/QuickActions'
import type { QuickAction } from '../components/QuickActions'
import { StatusBadge } from '../components/StatusBadge'
import type { HistoryEntry } from '../types'

type SortOrder = 'date_desc' | 'date_asc' | 'title_asc'
type TypeFilter = 'all' | 'document' | 'comic'

/** Derive a human-readable operation label from history entry */
function deriveOperation(entry: HistoryEntry, t: (k: string) => string): string {
  const parts: string[] = []
  if (entry.processing_mode === 'comic') parts.push(t('history.opComic'))
  else parts.push(t('history.opDocument'))
  if (entry.translation_status === 'done') parts.push(t('history.opTranslation'))
  if (entry.comic_translation_status === 'done') parts.push(t('history.opOverlay'))
  if (entry.status === 'error') return t('history.opFailed')
  if (parts.length === 1) {
    if (entry.conversion_status === 'done') return t('history.opFull')
    return t('history.opAnalyze')
  }
  return parts.slice(1).join(' + ')
}

/** Calculate duration string from created_at/updated_at */
function calcDuration(createdAt: string, updatedAt?: string): string {
  const start = new Date(createdAt).getTime()
  const end = updatedAt ? new Date(updatedAt).getTime() : Date.now()
  const diffMs = Math.max(0, end - start)
  const diffSec = Math.round(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s`
  const min = Math.floor(diffSec / 60)
  const sec = diffSec % 60
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getNextStep(entry: HistoryEntry, t: (key: string) => string): QuickAction | null {
  if (entry.status === 'error') {
    return { label: t('quickActions.reOpen'), href: `/analyze/${entry.upload_id}`, variant: 'secondary' }
  }
  if (entry.status === 'analyzed' && entry.conversion_status === 'not_started') {
    return { label: t('quickActions.convert'), href: `/analyze/${entry.upload_id}`, variant: 'action-blue' }
  }
  if (
    entry.conversion_status === 'done' &&
    entry.processing_mode === 'comic' &&
    entry.comic_translation_status === 'done'
  ) {
    return { label: t('quickActions.review'), href: `/review/${entry.upload_id}`, variant: 'action-blue' }
  }
  if (entry.conversion_status === 'done' && entry.processing_mode === 'comic') {
    return { label: t('quickActions.overlay'), href: `/overlay/${entry.upload_id}`, variant: 'action-blue' }
  }
  if (
    entry.conversion_status === 'done' &&
    entry.processing_mode !== 'comic' &&
    entry.send_status !== 'sent'
  ) {
    return { label: t('quickActions.sendKindle'), href: `/analyze/${entry.upload_id}`, variant: 'action-green' }
  }
  return null
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<Record<number, boolean>>({})
  const [retryErrors, setRetryErrors] = useState<Record<number, string>>({})
  const [duplicating, setDuplicating] = useState<Record<number, boolean>>({})
  const [duplicateError, setDuplicateError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('date_desc')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    getHistory()
      .then(setEntries)
      .catch(() => setError(t('history.errorLoad')))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRetry = async (jobId: number) => {
    setRetrying((prev) => ({ ...prev, [jobId]: true }))
    setRetryErrors((prev) => { const next = { ...prev }; delete next[jobId]; return next })
    try {
      const updated = await retrySend(jobId)
      setEntries((prev) =>
        prev.map((e) =>
          e.upload_id === jobId
            ? { ...e, send_status: updated.send_status, send_error: updated.send_error, kindle_sent: updated.kindle_sent ?? e.kindle_sent, status: updated.status }
            : e,
        ),
      )
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as any)?.response?.data?.detail || t('history.retryError')
      setRetryErrors((prev) => ({ ...prev, [jobId]: detail }))
      try { const all = await getHistory(); setEntries(all) } catch { /* ignore */ }
    } finally {
      setRetrying((prev) => ({ ...prev, [jobId]: false }))
    }
  }

  const handleDuplicate = useCallback(async (jobId: number) => {
    setDuplicating((prev) => ({ ...prev, [jobId]: true }))
    try { const newJob = await duplicateJob(jobId); navigate(`/analyze/${newJob.upload_id}`) }
    catch { setDuplicateError(t('quickActions.duplicateError')) }
    finally { setDuplicating((prev) => ({ ...prev, [jobId]: false })) }
  }, [navigate])

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let result = entries

    // Type filter
    if (typeFilter === 'document') result = result.filter((e) => e.processing_mode !== 'comic')
    else if (typeFilter === 'comic') result = result.filter((e) => e.processing_mode === 'comic')

    // Search
    if (q) {
      result = result.filter(
        (e) =>
          e.original_filename.toLowerCase().includes(q) ||
          (e.final_title ?? '').toLowerCase().includes(q),
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortOrder === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortOrder === 'title_asc') return (a.final_title ?? '').localeCompare(b.final_title ?? '')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return result
  }, [entries, searchQuery, sortOrder, typeFilter])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-700 rounded animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <Banner variant="error">{error}</Banner>
      </div>
    )
  }

  const pending = entries.filter((e) => e.send_status === 'pending')

  const TYPE_FILTERS: { key: TypeFilter; label: string; icon?: React.ReactNode }[] = [
    { key: 'all',      label: t('history.filterAll') },
    { key: 'document', label: t('history.filterDocuments'), icon: <FileText size={12} /> },
    { key: 'comic',    label: t('history.filterComics'),    icon: <Layers size={12} /> },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{t('history.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{t('history.subtitle')}</p>
      </div>

      {/* Pending sends banner */}
      {pending.length > 0 && (
        <Banner variant="warning">
          <p className="font-semibold mb-1">{t('history.pendingTitle')}</p>
          <p className="text-xs mb-3 opacity-80">{t('history.pendingHint')}</p>
          <ul className="space-y-2">
            {pending.map((job) => (
              <li key={job.upload_id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-sm font-medium truncate flex-1">{job.original_filename}</span>
                {retryErrors[job.upload_id] && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {t('history.retryError', { detail: retryErrors[job.upload_id] })}
                  </span>
                )}
                <Button variant="secondary" size="sm" onClick={() => handleRetry(job.upload_id)} disabled={retrying[job.upload_id]}>
                  {retrying[job.upload_id] ? t('history.retrying') : t('history.retryBtn')}
                </Button>
              </li>
            ))}
          </ul>
        </Banner>
      )}

      {/* Duplicate error */}
      {duplicateError && (
        <Banner variant="error">{duplicateError}</Banner>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search with icon */}
        <div className="relative flex-1 min-w-56">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('history.searchPlaceholder')}
            className="w-full rounded-lg border border-black/[0.08] dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {/* Sort — inline, minimal */}
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={13} className="text-gray-400 dark:text-zinc-500" aria-hidden="true" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="rounded-lg border border-black/[0.08] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-gray-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="date_desc">{t('history.sortDateDesc')}</option>
            <option value="date_asc">{t('history.sortDateAsc')}</option>
            <option value="title_asc">{t('history.sortTitleAsc')}</option>
          </select>
        </div>

        {/* Type filter chips */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-0.5 ml-auto">
          {TYPE_FILTERS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                typeFilter === key
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {(searchQuery || sortOrder !== 'date_desc' || typeFilter !== 'all') && (
          <button
            onClick={() => { setSearchQuery(''); setSortOrder('date_desc'); setTypeFilter('all') }}
            className="text-xs text-gray-400 hover:text-brand dark:hover:text-indigo-400 transition-colors"
          >
            {t('history.clearFilters')}
          </button>
        )}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-zinc-900 rounded-xl border border-black/[0.06] dark:border-zinc-800">
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
            <Clock size={22} className="text-gray-400 dark:text-zinc-500" />
          </div>
          <p className="text-sm text-gray-500 dark:text-zinc-400">{t('history.empty')}</p>
          <Link to="/" className="text-sm text-brand hover:underline">{t('history.sendFirst')}</Link>
        </div>
      )}

      {/* Table */}
      {entries.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl overflow-hidden shadow-card">
          <table className="w-full text-sm" aria-label={t('history.tableLabel')}>
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/60">
                {[
                  t('history.colId'),
                  t('history.colFile'),
                  t('history.colOperation'),
                  t('history.colDate'),
                  t('history.colDuration'),
                  t('history.colStatus'),
                  t('history.colActions'),
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-zinc-800">
              {filteredEntries.map((entry) => {
                const nextStep = getNextStep(entry, t)
                const rowActions: QuickAction[] = [
                  ...(nextStep ? [nextStep] : []),
                  {
                    label: duplicating[entry.upload_id] ? t('quickActions.duplicating') : t('quickActions.duplicate'),
                    onClick: () => handleDuplicate(entry.upload_id),
                    variant: 'secondary',
                    disabled: duplicating[entry.upload_id],
                  },
                ]
                const operation = deriveOperation(entry, t)
                const duration = calcDuration(entry.created_at, entry.updated_at)
                const dateStr = new Date(entry.created_at).toLocaleDateString('pt-BR', {
                  year: 'numeric', month: '2-digit', day: '2-digit',
                })
                const timeStr = new Date(entry.created_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit',
                })

                return (
                  <tr key={entry.upload_id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                    {/* ID */}
                    <td className="px-4 py-3">
                      <span className="font-mono-data text-gray-400 dark:text-zinc-500 text-xs">
                        JOB-{String(entry.upload_id).padStart(4, '0')}
                      </span>
                    </td>
                    {/* File */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          {entry.processing_mode === 'comic'
                            ? <Layers size={13} className="text-violet-500" />
                            : <FileText size={13} className="text-indigo-500" />
                          }
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/analyze/${entry.upload_id}`}
                            className="text-sm font-medium text-gray-900 dark:text-zinc-100 hover:text-brand truncate block max-w-[180px]"
                          >
                            {entry.final_title || entry.original_filename}
                          </Link>
                          <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate max-w-[180px]">
                            {entry.original_filename}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Operation */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-zinc-300">
                      {operation}
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-700 dark:text-zinc-300 font-mono-data">{dateStr}</p>
                      <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono-data">{timeStr}</p>
                    </td>
                    {/* Duration */}
                    <td className="px-4 py-3">
                      <span className="font-mono-data text-xs text-gray-500 dark:text-zinc-400">
                        {duration}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={entry.status} />
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <QuickActions actions={rowActions} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredEntries.length === 0 && (searchQuery || typeFilter !== 'all') && (
            <p className="text-center py-10 text-sm text-gray-400 dark:text-zinc-500">
              {t('history.empty')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CheckCircle, Download, FileText, Layers, Plus, Search, Send, SlidersHorizontal, Sparkles, Zap } from 'lucide-react'
import {
  getBatchJobs,
  getPresets,
  batchApplyPreset,
  batchExport,
  batchApplySuggestions,
  batchRetrySend,
} from '../api/client'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { StatusBadge } from '../components/StatusBadge'
import { useRecentPresets } from '../hooks/useRecentItems'
import type { BatchResult, HistoryEntry, Preset } from '../types'

export default function BatchPage() {
  const { t } = useTranslation()

  const [jobs, setJobs] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMode, setFilterMode] = useState('')
  const [filterSendPending, setFilterSendPending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [presets, setPresets] = useState<Preset[]>([])
  const [pendingPreset, setPendingPreset] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState('')
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<BatchResult | null>(null)
  const [execError, setExecError] = useState<string | null>(null)

  const { recentIds, addRecent } = useRecentPresets()

  const loadJobs = useCallback(() => {
    setLoading(true)
    const params: Record<string, string | boolean> = {}
    if (filterStatus) params.status = filterStatus
    if (filterMode) params.processing_mode = filterMode
    if (filterSendPending) params.send_pending = true
    getBatchJobs(params as Parameters<typeof getBatchJobs>[0])
      .then((r) => {
        setJobs(r.jobs)
        setSelected(new Set())
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [filterStatus, filterMode, filterSendPending])

  useEffect(() => { loadJobs() }, [loadJobs])

  useEffect(() => {
    getPresets().then((r) => setPresets(r.presets)).catch(() => {})
  }, [])

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter((j) => j.original_filename.toLowerCase().includes(q))
  }, [jobs, searchQuery])

  const toggleJob = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(filteredJobs.map((j) => j.upload_id)))
  const selectNone = () => setSelected(new Set())

  const selectedJobs = useMemo(
    () => filteredJobs.filter((j) => selected.has(j.upload_id)),
    [filteredJobs, selected],
  )

  const eligibility = useMemo(() => ({
    applyPreset:      selectedJobs.length > 0,
    export:           selectedJobs.some((j) => j.processing_mode === 'comic'),
    applySuggestions: selectedJobs.some((j) => j.processing_mode === 'comic'),
    retrySend:        selectedJobs.some((j) => j.send_status === 'pending'),
  }), [selectedJobs])

  const executeAction = async (actionId: string) => {
    if (selected.size === 0) return
    setExecuting(true)
    setResult(null)
    setExecError(null)
    const ids = Array.from(selected)
    try {
      let res: BatchResult
      if (actionId === 'apply-preset') {
        res = await batchApplyPreset(ids, selectedPreset)
        addRecent(selectedPreset)
        setPendingPreset(false)
        setSelectedPreset('')
      } else if (actionId === 'export') {
        res = await batchExport(ids)
      } else if (actionId === 'apply-suggestions') {
        res = await batchApplySuggestions(ids, { only_undecided: true })
      } else {
        res = await batchRetrySend(ids)
      }
      setResult(res)
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setExecError((e as any)?.response?.data?.detail || t('batch.execError'))
    } finally {
      setExecuting(false)
    }
  }

  const recentPresets = useMemo(
    () => presets.filter((p) => recentIds.includes(p.id)),
    [presets, recentIds],
  )

  // Local helper — always visible, disabled+tooltip when ineligible
  function ActionBtn({
    label, icon, eligible, tooltip, executing: isExecuting, onClick,
  }: {
    label: string
    icon: React.ReactNode
    eligible: boolean
    tooltip: string | undefined
    executing: boolean
    onClick: () => void
  }) {
    return (
      <button
        disabled={!eligible || isExecuting}
        title={!eligible && tooltip ? tooltip : undefined}
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
          eligible && !isExecuting
            ? 'bg-white text-brand hover:bg-white/90'
            : 'bg-white/20 text-white/60 cursor-not-allowed'
        }`}
      >
        {icon}{label}
      </button>
    )
  }

  // Derive stats from jobs
  const statsConverting = jobs.filter((j) => j.status === 'converting' || j.status === 'analyzing').length
  const statsQueued = jobs.filter((j) => j.status === 'uploaded').length
  const today = new Date().toDateString()
  const statsDoneToday = jobs.filter(
    (j) => j.status === 'done' && new Date(j.updated_at ?? j.created_at ?? '').toDateString() === today,
  ).length

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      {/* ── PAGE HEADER ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">{t('batch.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{t('batch.subtitle')}</p>
        </div>
        <Link to="/">
          <Button variant="primary" size="md">
            <Plus size={14} aria-hidden="true" />
            {t('batch.newBatch')}
          </Button>
        </Link>
      </div>

      {/* ── STATS ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Zap size={14} />,         value: statsConverting, label: t('batch.statConverting') },
          { icon: <Layers size={14} />,       value: statsQueued,    label: t('batch.statQueued') },
          { icon: <CheckCircle size={14} />,  value: statsDoneToday, label: t('batch.statDoneToday') },
        ].map(({ icon, value, label }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl px-3 py-2.5 shadow-card">
            <div className="flex items-center gap-1.5 mb-1.5 text-gray-400 dark:text-zinc-500">
              {icon}
              <span className="text-[11px] font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100 font-mono-data leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Warning */}
      <Banner variant="warning">
        <p className="text-sm">{t('batch.warningDestructive')}</p>
      </Banner>

      {/* ── SEARCH + FILTERS ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('batch.searchPlaceholder')}
            className="w-full rounded-lg border border-black/[0.08] dark:border-zinc-700 bg-white dark:bg-zinc-900 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={13} className="text-gray-400 dark:text-zinc-500" aria-hidden="true" />
          <select
            aria-label={t('batch.filterStatus')}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-black/[0.08] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-gray-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">{t('batch.statusAll')}</option>
            <option value="uploaded">{t('batch.status_uploaded')}</option>
            <option value="analyzed">{t('batch.status_analyzed')}</option>
            <option value="converted">{t('batch.status_converted')}</option>
            <option value="done">{t('batch.status_done')}</option>
            <option value="error">{t('batch.status_error')}</option>
          </select>
          <select
            aria-label={t('batch.filterMode')}
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="rounded-lg border border-black/[0.08] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-gray-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">{t('batch.filterMode')}: {t('batch.filterAll')}</option>
            <option value="document">document</option>
            <option value="comic">comic</option>
          </select>
        </div>
        {/* Send pending toggle */}
        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={filterSendPending} onChange={(e) => setFilterSendPending(e.target.checked)} className="rounded" />
          {t('batch.filterSendPending')}
        </label>
        {/* Select all/none */}
        <div className="ml-auto flex items-center gap-2 text-xs">
          <button onClick={selectAll} className="text-brand dark:text-indigo-400 hover:underline">{t('batch.selectAll')}</button>
          <span className="text-gray-300 dark:text-zinc-600">·</span>
          <button onClick={selectNone} className="text-gray-400 dark:text-zinc-500 hover:underline">{t('batch.selectNone')}</button>
        </div>
      </div>

      {/* ── JOB TABLE ────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400 dark:text-zinc-500">{t('history.loading')}</div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
              <FileText size={18} className="text-gray-400 dark:text-zinc-500" />
            </div>
            <p className="text-sm text-gray-400 dark:text-zinc-500">{t('batch.noJobs')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-black/[0.06] dark:border-zinc-800">
                <th className="pl-4 pr-2 py-2.5 w-8" />
                {[t('batch.colFile'), t('batch.colMode'), t('batch.colStatus'), t('batch.colDate')].map((h) => (
                  <th key={h} scope="col" className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-zinc-800">
              {filteredJobs.map((job) => {
                const isSelected = selected.has(job.upload_id)
                const isComic = job.processing_mode === 'comic'
                return (
                  <tr
                    key={job.upload_id}
                    className={`hover:bg-gray-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors ${isSelected ? 'bg-brand/[0.04] dark:bg-brand/10' : ''}`}
                    onClick={() => toggleJob(job.upload_id)}
                  >
                    <td className="pl-4 pr-2 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleJob(job.upload_id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded accent-brand"
                        aria-label={job.original_filename}
                      />
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="shrink-0">
                          {isComic
                            ? <Layers size={14} className="text-violet-400" />
                            : <FileText size={14} className="text-indigo-400" />}
                        </span>
                        <span className="font-medium text-gray-700 dark:text-zinc-200 truncate max-w-[220px]">
                          {job.original_filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
                        {isComic ? 'Comic' : 'Documento'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-3 text-xs font-mono-data text-gray-400 dark:text-zinc-500">
                      {new Date(job.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── FLOATING ACTION BAR (when items selected) ────── */}
      {selected.size > 0 && (
        <div className="sticky bottom-6 z-10">
          <div className="mx-auto max-w-3xl bg-brand dark:bg-indigo-600 rounded-2xl shadow-modal px-5 py-3 space-y-2">
            {/* Row 1: count + 4 action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-sm font-medium mr-auto">
                {t('batch.selectedCount', { n: selected.size })}
              </span>
              <ActionBtn
                label={t('batch.actionApplyPreset')}
                icon={<SlidersHorizontal size={13} />}
                eligible={eligibility.applyPreset}
                tooltip={undefined}
                executing={executing}
                onClick={() => { setPendingPreset(true); setResult(null) }}
              />
              <ActionBtn
                label={t('batch.actionExport')}
                icon={<Download size={13} />}
                eligible={eligibility.export}
                tooltip={t('batch.tooltipNoComic')}
                executing={executing}
                onClick={() => executeAction('export')}
              />
              <ActionBtn
                label={t('batch.actionApplySuggestions')}
                icon={<Sparkles size={13} />}
                eligible={eligibility.applySuggestions}
                tooltip={t('batch.tooltipNoComic')}
                executing={executing}
                onClick={() => executeAction('apply-suggestions')}
              />
              <ActionBtn
                label={t('batch.actionRetrySend')}
                icon={<Send size={13} />}
                eligible={eligibility.retrySend}
                tooltip={t('batch.tooltipNoPending')}
                executing={executing}
                onClick={() => executeAction('retry-send')}
              />
            </div>

            {/* Row 2: preset picker — visible when pendingPreset=true */}
            {pendingPreset && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/20 flex-wrap">
                <select
                  aria-label={t('batch.choosePreset')}
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="rounded-lg bg-white/20 border-0 text-white text-xs px-3 py-1.5 flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="" className="text-gray-900 bg-white">{t('batch.choosePreset')}</option>
                  {recentPresets.length > 0 && (
                    <optgroup label={t('batch.recentPresets')} className="text-gray-900 bg-white">
                      {recentPresets.map((p) => (
                        <option key={`recent-${p.id}`} value={p.id} className="text-gray-900 bg-white">{p.name}</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={t('batch.filterAll')} className="text-gray-900 bg-white">
                    {presets.map((p) => (
                      <option key={p.id} value={p.id} className="text-gray-900 bg-white">{p.name}</option>
                    ))}
                  </optgroup>
                </select>
                <button
                  disabled={!selectedPreset || executing}
                  onClick={() => executeAction('apply-preset')}
                  className="px-3 py-1.5 bg-white text-brand text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-white/90 transition-colors"
                >
                  {executing ? t('batch.executing') : t('batch.confirm')}
                </button>
                <button
                  onClick={() => { setPendingPreset(false); setSelectedPreset('') }}
                  className="px-3 py-1.5 bg-white/20 text-white text-xs font-semibold rounded-lg hover:bg-white/30 transition-colors"
                >
                  {t('batch.cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RESULTS ──────────────────────────────────────── */}
      {execError && <Banner variant="error"><p className="text-sm">{execError}</p></Banner>}

      {result && (
        <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-3">{t('batch.resultsTitle')}</p>
          <div className="flex gap-5 text-sm mb-4">
            <span className="text-feedback-success dark:text-green-400 font-medium">{t('batch.succeeded', { n: result.succeeded })}</span>
            <span className="text-feedback-error dark:text-red-400 font-medium">{t('batch.failed', { n: result.failed })}</span>
            <span className="text-gray-400 dark:text-zinc-500">{t('batch.skipped', { n: result.skipped })}</span>
          </div>
          <ul className="divide-y divide-black/[0.04] dark:divide-zinc-800 text-sm max-h-60 overflow-auto">
            {result.item_results.map((item, idx) => (
              <li key={idx} className="py-2 flex items-start gap-3">
                <span className={`shrink-0 font-medium text-xs ${
                  item.status === 'success' ? 'text-feedback-success dark:text-green-400'
                  : item.status === 'error' ? 'text-feedback-error dark:text-red-400'
                  : 'text-gray-400 dark:text-zinc-500'
                }`}>
                  {item.status === 'success' ? t('batch.resultSuccess') : item.status === 'error' ? t('batch.resultError') : t('batch.resultSkipped')}
                </span>
                <span className="text-gray-600 dark:text-zinc-300 text-xs">{t('batch.colFile')} #{item.job_id} — {item.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

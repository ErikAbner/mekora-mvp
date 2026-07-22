import { type DragEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  FileText,
  FolderOpen,
  Layers,
  Upload,
  Zap,
} from 'lucide-react'
import { getHistory, uploadPdf } from '../api/client'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { StatusBadge } from '../components/StatusBadge'
import type { HistoryEntry } from '../types'

type FileType = 'document' | 'comic'
type Mode = 'direto' | 'guiado'

const DOC_EXTENSIONS  = new Set(['.pdf', '.docx', '.odt', '.rtf', '.txt', '.html', '.htm', '.epub'])
const COMIC_EXTENSIONS = new Set(['.cbz', '.cbr', '.cb7', '.cbc'])

const DOC_ACCEPT   = '.pdf,.epub,.docx,.odt,.rtf,.txt,.html,.htm'
const COMIC_ACCEPT = '.cbz,.cbr,.cb7,.cbc,.pdf'

const ACTIVE_STATUSES = new Set(['uploaded', 'analyzing', 'converting', 'sending'])

function isAcceptedFile(filename: string, type: FileType): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  if (ext === '.pdf') return true
  return type === 'document' ? DOC_EXTENSIONS.has(ext) : COMIC_EXTENSIONS.has(ext)
}

export default function UploadPage() {
  const [fileType, setFileType] = useState<FileType>('document')
  const [mode, setMode]   = useState<Mode>('direto')
  const [dragging, setDragging]     = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [guiadoSuccess, setGuiadoSuccess] = useState(false)
  const [queue, setQueue]         = useState<HistoryEntry[]>([])
  const [queueLoading, setQueueLoading] = useState(true)
  const fileRef   = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const navigate  = useNavigate()
  const { t }     = useTranslation()

  const refreshQueue = useCallback(async () => {
    try {
      const entries = await getHistory()
      setQueue(entries.slice(0, 10))
      const hasActive = entries.some((e) => ACTIVE_STATUSES.has(e.status))
      if (!hasActive && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch {
      // queue is non-critical
    } finally {
      setQueueLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshQueue()
    pollRef.current = setInterval(refreshQueue, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [refreshQueue])

  const startPolling = useCallback(() => {
    if (!pollRef.current) pollRef.current = setInterval(refreshQueue, 4000)
  }, [refreshQueue])

  const handleFile = async (file: File) => {
    if (!isAcceptedFile(file.name, fileType)) {
      setError(t('upload.errorNotAccepted'))
      return
    }
    setError(null)
    setUploading(true)
    try {
      const result = await uploadPdf(file)
      await refreshQueue()
      startPolling()
      if (mode === 'direto') {
        navigate(`/analyze/${result.upload_id}`)
      } else {
        setGuiadoSuccess(true)
        setTimeout(() => setGuiadoSuccess(false), 5000)
      }
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as any)?.response?.data?.detail
      setError(detail || t('upload.errorUpload'))
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
      e.preventDefault()
      fileRef.current?.click()
    }
  }

  const accept = fileType === 'document' ? DOC_ACCEPT : COMIC_ACCEPT

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── TIPO DE ARQUIVO — decisão primária ─────────── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-3">
          {t('upload.typeLabel')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {([
            {
              type: 'document' as FileType,
              icon: <FileText size={20} />,
              titleKey: 'upload.typeDocument',
              formatsKey: 'upload.typeDocumentFormats',
              hintKey: 'upload.typeDocumentHint',
            },
            {
              type: 'comic' as FileType,
              icon: <Layers size={20} />,
              titleKey: 'upload.typeComic',
              formatsKey: 'upload.typeComicFormats',
              hintKey: 'upload.typeComicHint',
            },
          ]).map(({ type, icon, titleKey, formatsKey, hintKey }) => {
            const active = fileType === type
            return (
              <button
                key={type}
                onClick={() => {
                  setFileType(type)
                }}
                className={`flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-colors ${
                  active
                    ? 'border-brand bg-brand/[0.03] dark:bg-brand/10'
                    : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className={`mt-0.5 shrink-0 ${active ? 'text-brand' : 'text-gray-400 dark:text-zinc-500'}`}>
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${active ? 'text-gray-900 dark:text-zinc-100' : 'text-gray-600 dark:text-zinc-300'}`}>
                    {t(titleKey)}
                  </p>
                  <p className="text-[11px] font-mono-data text-gray-400 dark:text-zinc-500 mt-0.5">{t(formatsKey)}</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{t(hintKey)}</p>
                </div>
                {active && (
                  <div className="ml-auto shrink-0 w-4 h-4 rounded-full bg-brand flex items-center justify-center mt-0.5">
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden="true">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── DROPZONE ─────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        aria-label={t('upload.dropzoneLabel')}
        aria-disabled={uploading}
        className={`relative border-2 border-dashed rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand ${
          dragging
            ? 'border-brand bg-brand/[0.03] dark:bg-brand/10'
            : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-600'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        onKeyDown={handleKeyDown}
      >
        {/* Hidden file inputs */}
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          aria-hidden="true"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
        <input
          ref={folderRef}
          type="file"
          // @ts-expect-error – webkitdirectory is non-standard but widely supported
          webkitdirectory=""
          multiple
          accept={accept}
          aria-hidden="true"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />

        <div className="py-6 px-8 text-center">
          {uploading ? (
            <div className="flex flex-col items-center gap-3" aria-live="polite">
              <div className="w-9 h-9 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <p className="text-sm text-gray-500 dark:text-zinc-400">{t('upload.uploading')}</p>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 dark:bg-zinc-800 mb-4">
                <Upload size={24} className="text-gray-400 dark:text-zinc-500" aria-hidden="true" />
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-zinc-100 mb-1">
                {t('upload.dropzoneTitle')}
              </p>
              <p className="text-sm text-gray-400 dark:text-zinc-500 mb-5 max-w-xs mx-auto">
                {t('upload.dropzoneHint')}
              </p>

              <div
                className="flex items-center justify-center gap-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="primary" size="md" onClick={() => fileRef.current?.click()}>
                  <Upload size={14} aria-hidden="true" />
                  {t('upload.selectFiles')}
                </Button>
                <Button variant="secondary" size="md" onClick={() => folderRef.current?.click()}>
                  <FolderOpen size={14} aria-hidden="true" />
                  {t('upload.selectFolder')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modo Direto / Guiado — opção secundária */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-xs text-gray-400 dark:text-zinc-500">{t('upload.modeLabel')}:</span>
        {(['direto', 'guiado'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              mode === m
                ? 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-200 font-medium'
                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
            }`}
          >
            {m === 'direto' ? t('upload.modeDireto') : t('upload.modeGuiado')}
          </button>
        ))}
        {mode === 'guiado' && (
          <Zap size={11} className="text-brand" aria-hidden="true" />
        )}
      </div>
      <p className="text-[11px] text-gray-400 dark:text-zinc-500 px-1">
        {t(mode === 'direto' ? 'upload.modeDiretoHint' : 'upload.modeGuiadoHint')}
      </p>

      {/* Error / success */}
      {error && <Banner variant="error">{error}</Banner>}
      {guiadoSuccess && <Banner variant="success">{t('upload.guidedSuccess')}</Banner>}

      {/* ── CONVERSION QUEUE ─────────────────────────────── */}
      <ConversionQueue queue={queue} loading={queueLoading} t={t} />

    </div>
  )
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────────────────

interface ConversionQueueProps {
  queue: HistoryEntry[]
  loading: boolean
  t: (key: string) => string
}

function ConversionQueue({ queue, loading, t }: ConversionQueueProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl overflow-hidden shadow-card">
        <div className="px-5 py-3 border-b border-black/[0.05] dark:border-zinc-800">
          <div className="h-4 w-36 bg-gray-100 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="px-5 py-3.5 border-b border-black/[0.04] dark:border-zinc-800 flex gap-3">
            <div className="h-4 w-4 bg-gray-100 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="flex-1 h-4 bg-gray-100 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-14 bg-gray-100 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="h-4 w-10 bg-gray-100 dark:bg-zinc-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <section aria-labelledby="queue-heading">
      <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl overflow-hidden shadow-card">
        {/* Queue header */}
        <div className="px-5 py-3 border-b border-black/[0.05] dark:border-zinc-800 flex items-center justify-between">
          <h2
            id="queue-heading"
            className="text-sm font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2"
          >
            {t('upload.queueTitle')}
            {queue.length > 0 && (
              <span className="font-mono-data text-[10px] text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                {queue.length}
              </span>
            )}
          </h2>
          {queue.length > 0 && (
            <Link
              to="/history"
              className="text-xs text-gray-400 dark:text-zinc-500 hover:text-brand dark:hover:text-indigo-400 transition-colors"
            >
              {t('upload.queueSeeAll')} →
            </Link>
          )}
        </div>

        {/* Empty state */}
        {queue.length === 0 && (
          <div className="px-5 py-10 text-center">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 dark:bg-zinc-800 mb-3">
              <FileText size={16} className="text-gray-400 dark:text-zinc-500" />
            </div>
            <p className="text-sm text-gray-400 dark:text-zinc-500">
              {t('upload.queueEmpty')}
            </p>
          </div>
        )}

        {/* Queue table */}
        {queue.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-800/60 border-b border-black/[0.04] dark:border-zinc-800">
                  {[
                    t('upload.queueColFile'),
                    t('upload.queueColType'),
                    t('upload.queueColStatus'),
                    '',
                  ].map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={`px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 text-left ${i === 3 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-zinc-800">
                {queue.map((entry) => (
                  <QueueRow key={entry.upload_id} entry={entry} t={t} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function QueueRow({ entry, t }: { entry: HistoryEntry; t: (k: string) => string }) {
  const isComic  = entry.processing_mode === 'comic'
  const isActive = ACTIVE_STATUSES.has(entry.status)

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
      {/* File */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 text-gray-400 dark:text-zinc-500">
            {isComic
              ? <Layers size={14} aria-hidden="true" />
              : <FileText size={14} aria-hidden="true" />
            }
          </span>
          <span className="truncate max-w-[260px] text-sm font-medium text-gray-700 dark:text-zinc-300">
            {entry.final_title || entry.original_filename}
          </span>
          {isActive && (
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand animate-pulse" aria-hidden="true" />
          )}
        </div>
      </td>

      {/* Type */}
      <td className="px-5 py-3">
        <span className="text-[11px] font-medium text-gray-500 dark:text-zinc-400">
          {isComic ? t('upload.queueTypeComic') : t('upload.queueTypeDocument')}
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-3">
        <StatusBadge status={entry.status} />
      </td>

      {/* Action */}
      <td className="px-5 py-3 text-right">
        {isComic && entry.comic_translation_status === 'done' ? (
          <Link
            to={`/review/${entry.upload_id}`}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('kindle:jobselect', {
                detail: {
                  id: String(entry.upload_id),
                  type: 'comic',
                  name: entry.final_title || entry.original_filename,
                },
              }))
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand dark:text-indigo-400 hover:underline transition-colors"
          >
            {t('upload.queueActionReview')}
            <ArrowRight size={11} aria-hidden="true" />
          </Link>
        ) : (
          <Link
            to={`/analyze/${entry.upload_id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-zinc-500 hover:text-brand dark:hover:text-indigo-400 transition-colors"
          >
            {t('upload.queueActionView')}
            <ArrowRight size={11} aria-hidden="true" />
          </Link>
        )}
      </td>
    </tr>
  )
}

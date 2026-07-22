import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpFromLine,
  BarChart3,
  BookOpen,
  Boxes,
  CheckSquare,
  Clock,
  Download,
  FileText,
  Languages,
  Layers,
  LayoutDashboard,
  Settings,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useComicPipelineState } from '../hooks/useComicPipelineState'
import { getJobStatus } from '../api/client'

type JobType = 'document' | 'comic' | null

interface NavItem {
  path: string
  labelKey: string
  icon: ReactNode
  badge?: string
  disabled?: boolean
}

interface NavSection {
  titleKey: string
  items: NavItem[]
}

const COMIC_PATH_PREFIXES = ['/review/', '/overlay/', '/finalize/', '/finish/', '/consistency/', '/export/']

function extractJobId(pathname: string): string | null {
  const match = pathname.match(/\/(?:analyze|review|overlay|finalize|finish|consistency|export)\/(\d+)/)
  return match ? match[1] : null
}

function inferJobTypeFromPath(pathname: string): JobType {
  if (COMIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return 'comic'
  return null
}

// Mapeia item de navegação → id da etapa no pipeline-state (gating)
const NAV_STEP_IDS: Record<string, string> = {
  'nav.review': 'review',
  'nav.overlay': 'overlay',
  'nav.finalize': 'finalize',
  'nav.finish': 'finish',
  'nav.consistency': 'consistency',
  'nav.export': 'export',
}

function buildProductionItems(jobId: string | null, jobType: JobType): NavItem[] {
  if (!jobId) {
    return [
      { path: '/analyze', labelKey: 'nav.analysis', icon: <FileText size={14} />, disabled: true },
    ]
  }
  if (jobType === 'comic') {
    // Ordem canônica do pipeline comic (Estabilização v1):
    // Análise → Tradução → Revisão → Overlay → Curadoria → Acabamento → Consistência → Exportar
    return [
      { path: `/analyze/${jobId}`,     labelKey: 'nav.analysis',    icon: <FileText size={14} /> },
      { path: `/analyze/${jobId}`,     labelKey: 'nav.translation', icon: <Languages size={14} /> },
      { path: `/review/${jobId}`,      labelKey: 'nav.review',      icon: <BookOpen size={14} /> },
      { path: `/overlay/${jobId}`,     labelKey: 'nav.overlay',     icon: <Layers size={14} /> },
      { path: `/finalize/${jobId}`,    labelKey: 'nav.finalize',    icon: <Sparkles size={14} /> },
      { path: `/finish/${jobId}`,      labelKey: 'nav.finish',      icon: <Wand2 size={14} /> },
      { path: `/consistency/${jobId}`, labelKey: 'nav.consistency', icon: <CheckSquare size={14} /> },
      { path: `/export/${jobId}`,      labelKey: 'nav.export',      icon: <Download size={14} /> },
    ]
  }
  return [
    { path: `/analyze/${jobId}`, labelKey: 'nav.analysis', icon: <FileText size={14} /> },
  ]
}

function buildSections(jobId: string | null, jobType: JobType): NavSection[] {
  return [
    {
      titleKey: 'nav.sectionConversao',
      items: [
        { path: '/',      labelKey: 'nav.converter', icon: <ArrowUpFromLine size={14} /> },
        { path: '/batch', labelKey: 'nav.batch',     icon: <Boxes size={14} /> },
      ],
    },
    {
      titleKey: 'nav.sectionProducao',
      items: buildProductionItems(jobId, jobType),
    },
    {
      titleKey: 'nav.sectionSistema',
      items: [
        { path: '/history', labelKey: 'nav.jobs',     icon: <Clock size={14} /> },
        { path: '/metrics', labelKey: 'nav.metrics',  icon: <BarChart3 size={14} /> },
        { path: '/config',  labelKey: 'nav.settings', icon: <Settings size={14} /> },
      ],
    },
  ]
}

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showHelp, setShowHelp] = useState(false)

  const [lastJobId, setLastJobId] = useState<string | null>(() => {
    return extractJobId(pathname) ?? localStorage.getItem('lastComicId')
  })
  const [lastJobType, setLastJobType] = useState<JobType>(() => {
    return inferJobTypeFromPath(pathname) ?? (localStorage.getItem('lastJobType') as JobType)
  })
  const [lastJobName, setLastJobName] = useState<string | null>(() => {
    return localStorage.getItem('lastComicName')
  })

  useEffect(() => {
    const id = extractJobId(pathname)
    if (id) {
      const prevId = localStorage.getItem('lastComicId')
      if (prevId !== id) {
        // Navigated to a different job — clear stale name and type
        setLastJobName(null)
        setLastJobType(null)
        localStorage.removeItem('lastComicName')
        localStorage.removeItem('lastJobType')
      }
      setLastJobId(id)
      localStorage.setItem('lastComicId', id)

      const typeFromPath = inferJobTypeFromPath(pathname)
      if (typeFromPath) {
        setLastJobType(typeFromPath)
        localStorage.setItem('lastJobType', typeFromPath)
      }
    }
  }, [pathname])

  useEffect(() => {
    const jobSelectHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; type: JobType; name: string }>).detail
      setLastJobId(detail.id)
      setLastJobType(detail.type)
      setLastJobName(detail.name)
      localStorage.setItem('lastComicId', detail.id)
      if (detail.type) localStorage.setItem('lastJobType', detail.type)
      localStorage.setItem('lastComicName', detail.name)
    }
    // backwards compat: kindle:comicselect always means comic type
    const comicSelectHandler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string; name: string }>).detail
      setLastJobId(detail.id)
      setLastJobType('comic')
      setLastJobName(detail.name)
      localStorage.setItem('lastComicId', detail.id)
      localStorage.setItem('lastJobType', 'comic')
      localStorage.setItem('lastComicName', detail.name)
    }
    window.addEventListener('kindle:jobselect', jobSelectHandler)
    window.addEventListener('kindle:comicselect', comicSelectHandler)
    return () => {
      window.removeEventListener('kindle:jobselect', jobSelectHandler)
      window.removeEventListener('kindle:comicselect', comicSelectHandler)
    }
  }, [])

  // Validação do job em refresh/URL direta: 404 → limpa contexto fantasma
  useEffect(() => {
    if (!lastJobId) return
    getJobStatus(Number(lastJobId)).catch((err) => {
      if (err?.response?.status === 404) {
        setLastJobId(null)
        setLastJobType(null)
        setLastJobName(null)
        localStorage.removeItem('lastComicId')
        localStorage.removeItem('lastJobType')
        localStorage.removeItem('lastComicName')
      }
    })
  }, [lastJobId])

  // Gating por etapa (pipeline-state) — só para jobs comic
  const { pipelineState } = useComicPipelineState(lastJobId, lastJobType === 'comic')

  const shortcuts = useMemo(
    () => ({
      'g n': () => navigate('/'),
      'g h': () => navigate('/history'),
      'g b': () => navigate('/batch'),
      'g m': () => navigate('/metrics'),
      '?': () => setShowHelp(true),
    }),
    [navigate],
  )
  useKeyboardShortcuts(shortcuts)

  const sections = buildSections(lastJobId, lastJobType)

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <div className="min-h-screen bg-surface-muted dark:bg-zinc-950 flex">
      {/* ── SIDEBAR ──────────────────────────────────────── */}
      <nav
        className="w-56 bg-white dark:bg-zinc-900 border-r border-black/[0.07] dark:border-zinc-800 flex flex-col shrink-0"
        aria-label={t('nav.sidebar')}
      >
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-black/[0.06] dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shrink-0">
              <LayoutDashboard size={14} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 leading-none">
                Kindle Local Tool
              </p>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5 leading-none">
                Production Suite
              </p>
            </div>
          </div>
        </div>

        {/* Navigation sections */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {sections.map((section) => (
            <div key={section.titleKey} className="mb-4">
              <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-zinc-500 select-none">
                {t(section.titleKey)}
              </p>

              {/* ── CONTEXT INDICATOR — shown before Produção section ── */}
              {section.titleKey === 'nav.sectionProducao' && (
                <div className={`mx-0.5 mb-2 px-2.5 py-2 rounded-lg border ${lastJobId ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700/60' : 'bg-gray-50 dark:bg-zinc-800/60 border-black/[0.05] dark:border-zinc-700/60'}`}>
                  {lastJobId && lastJobName ? (
                    <>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mb-0.5">
                        {t('nav.jobContextLabel')}
                      </p>
                      <p
                        className="text-xs font-medium text-gray-800 dark:text-zinc-200 truncate leading-tight"
                        title={lastJobName}
                      >
                        {lastJobName}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1 leading-tight">
                        {lastJobType === 'comic'
                          ? t('nav.jobContextHintComic')
                          : t('nav.jobContextHintDocument')}
                      </p>
                    </>
                  ) : lastJobId ? (
                    <>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mb-0.5">
                        {t('nav.jobContextLabel')}
                      </p>
                      <p className="text-xs font-medium text-gray-800 dark:text-zinc-200 leading-tight font-mono-data">
                        #{lastJobId}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1 leading-tight">
                        {lastJobType === 'comic'
                          ? t('nav.jobContextHintComic')
                          : t('nav.jobContextHintDocument')}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 leading-tight">
                        {t('nav.jobContextNone')}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1 leading-tight">
                        {t('nav.jobContextHintNone')}
                      </p>
                    </>
                  )}
                </div>
              )}

              <ul className="space-y-0.5">
                {section.items.map(({ path, labelKey, icon, badge, disabled }) => {
                  const active = isActive(path)
                  const itemClass = `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors`
                  // Gating por pipeline-state: etapa bloqueada fica desabilitada
                  const stepId = NAV_STEP_IDS[labelKey]
                  const step = stepId && pipelineState
                    ? pipelineState.steps.find((s) => s.id === stepId)
                    : undefined
                  const stepBlocked = step?.status === 'blocked'
                  const disabledTitle = disabled
                    ? t('nav.pipelineDisabled')
                    : step?.blocked_reason || t('nav.pipelineDisabled')
                  return (
                    <li key={labelKey}>
                      {disabled || stepBlocked ? (
                        <span
                          title={disabledTitle}
                          aria-disabled="true"
                          className={`${itemClass} cursor-not-allowed opacity-40 text-gray-500 dark:text-zinc-400 select-none`}
                        >
                          <span className="shrink-0 text-gray-400 dark:text-zinc-500" aria-hidden="true">{icon}</span>
                          <span className="flex-1 truncate">{t(labelKey)}</span>
                        </span>
                      ) : (
                        <Link
                          to={path}
                          className={`${itemClass} ${
                            active
                              ? 'bg-brand text-white font-medium'
                              : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800'
                          }`}
                          aria-current={active ? 'page' : undefined}
                        >
                          <span
                            className={`shrink-0 ${active ? 'text-white/80' : 'text-gray-400 dark:text-zinc-500'}`}
                            aria-hidden="true"
                          >
                            {icon}
                          </span>
                          <span className="flex-1 truncate">{t(labelKey)}</span>
                          {badge && (
                            <span
                              className={`text-[10px] font-mono-data px-1.5 py-0.5 rounded-md ${
                                active
                                  ? 'bg-white/20 text-white'
                                  : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400'
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom: version + shortcuts */}
        <div className="px-3 py-3 border-t border-black/[0.06] dark:border-zinc-800 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono-data text-[10px] text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
              KL
            </span>
            <span className="text-[11px] text-gray-400 dark:text-zinc-500">
              v2.4.0
            </span>
          </div>
          <button
            onClick={() => setShowHelp(true)}
            className="text-[11px] text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
            aria-label={t('shortcuts.title')}
          >
            {t('nav.shortcuts')}
          </button>
        </div>
      </nav>

      {/* ── MAIN CONTENT ────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-6 lg:p-8 min-w-0">
        {children}
      </main>

      <KeyboardShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  )
}

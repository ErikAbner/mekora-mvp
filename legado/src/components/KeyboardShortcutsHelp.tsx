import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function KeyboardShortcutsHelp({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const shortcuts = [
    { key: 'g n', label: t('shortcuts.goNew') },
    { key: 'g h', label: t('shortcuts.goHistory') },
    { key: 'g b', label: t('shortcuts.goBatch') },
    { key: 'g m', label: t('shortcuts.goMetrics') },
    { key: '?', label: t('shortcuts.help') },
  ]

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Painel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('shortcuts.title')}
        className="fixed bottom-6 right-6 z-50 w-72 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            {t('shortcuts.title')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('shortcuts.close')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">
          {t('shortcuts.navigation')}
        </p>

        <ul className="space-y-1.5 mb-3">
          {shortcuts.map(({ key, label }) => (
            <li key={key} className="flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-300">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-mono text-xs border border-gray-200 dark:border-zinc-600">
                {key}
              </kbd>
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs text-gray-400 dark:text-zinc-500">{t('shortcuts.note')}</p>
      </div>
    </>
  )
}

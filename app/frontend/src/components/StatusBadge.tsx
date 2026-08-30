import { useTranslation } from 'react-i18next'

// 4 semantic tiers — calmo e legível
const STATUS_STYLE: Record<string, { dot: string; badge: string }> = {
  uploaded:   { dot: 'bg-gray-300 dark:bg-zinc-600',   badge: 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400' },
  analyzing:  { dot: 'bg-brand animate-pulse',          badge: 'bg-brand/8 text-brand dark:bg-indigo-950/60 dark:text-indigo-300' },
  analyzed:   { dot: 'bg-gray-300 dark:bg-zinc-600',   badge: 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400' },
  converting: { dot: 'bg-brand animate-pulse',          badge: 'bg-brand/8 text-brand dark:bg-indigo-950/60 dark:text-indigo-300' },
  converted:  { dot: 'bg-gray-300 dark:bg-zinc-600',   badge: 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400' },
  sending:    { dot: 'bg-brand animate-pulse',          badge: 'bg-brand/8 text-brand dark:bg-indigo-950/60 dark:text-indigo-300' },
  done:       { dot: 'bg-feedback-success',             badge: 'bg-feedback-success-bg text-feedback-success dark:bg-emerald-950/50 dark:text-emerald-400' },
  error:      { dot: 'bg-feedback-error',               badge: 'bg-feedback-error-bg text-feedback-error dark:bg-red-950/50 dark:text-red-400' },
}

const FALLBACK = { dot: 'bg-gray-300', badge: 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400' }

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const label = t(`status.${status}`, { defaultValue: status })
  const { dot, badge } = STATUS_STYLE[status] ?? FALLBACK

  return (
    <span
      aria-label={t('status.ariaLabel', { label })}
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
      {label}
    </span>
  )
}

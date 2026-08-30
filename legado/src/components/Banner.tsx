import type { ReactNode } from 'react'

export type BannerVariant = 'success' | 'warning' | 'error' | 'info'

const VARIANT_CLASS: Record<BannerVariant, string> = {
  success:
    'bg-feedback-success-bg border-feedback-success-border text-feedback-success dark:bg-green-950 dark:border-green-800 dark:text-green-400',
  warning:
    'bg-feedback-warning-bg border-feedback-warning-border text-feedback-warning dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400',
  error:
    'bg-feedback-error-bg border-feedback-error-border text-feedback-error dark:bg-red-950 dark:border-red-800 dark:text-red-400',
  info:
    'bg-feedback-info-bg border-feedback-info-border text-feedback-info dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400',
}

export function Banner({
  variant,
  children,
  className = '',
}: {
  variant: BannerVariant
  children: ReactNode
  className?: string
}) {
  const isAlert = variant === 'error' || variant === 'warning'
  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      className={`rounded-lg p-4 text-sm border ${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </div>
  )
}

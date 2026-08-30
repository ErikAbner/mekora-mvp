import type { ReactNode } from 'react'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'action-blue'
  | 'action-green'

type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-hover focus-visible:ring-brand dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-indigo-400',
  secondary:
    'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-400 dark:text-zinc-300 dark:hover:bg-zinc-800',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600',
  'action-blue':
    'border bg-brand/[0.07] border-brand/25 text-brand hover:bg-brand/[0.12] focus-visible:ring-brand dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950',
  'action-green':
    'border bg-feedback-success-bg border-feedback-success-border text-feedback-success hover:bg-emerald-100 focus-visible:ring-feedback-success dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  onClick,
  children,
  className = '',
  'aria-label': ariaLabel,
  title,
  type = 'button',
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
  'aria-label'?: string
  title?: string
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
    >
      {children}
    </button>
  )
}

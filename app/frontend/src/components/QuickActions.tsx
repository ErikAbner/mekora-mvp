import { Link } from 'react-router-dom'

type ActionVariant = 'secondary' | 'action-blue' | 'action-green'

const VARIANT_CLASS: Record<ActionVariant, string> = {
  secondary:
    'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
  'action-blue':
    'border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900',
  'action-green':
    'border bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900',
}

export interface QuickAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: ActionVariant
  disabled?: boolean
}

/**
 * Renderiza uma linha de ações rápidas como botões ou links pequenos.
 * Use `href` para navegação interna, `onClick` para ações imperativas.
 */
export function QuickActions({
  actions,
  className = '',
}: {
  actions: QuickAction[]
  className?: string
}) {
  if (actions.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {actions.map(({ label, href, onClick, variant = 'secondary', disabled }) => {
        const base = `inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${VARIANT_CLASS[variant]}`

        if (href && !disabled) {
          return (
            <Link key={label} to={href} className={base}>
              {label}
            </Link>
          )
        }

        return (
          <button
            key={label}
            onClick={onClick}
            disabled={disabled}
            className={`${base} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

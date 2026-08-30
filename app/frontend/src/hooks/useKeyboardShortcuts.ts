import { useEffect, useRef } from 'react'

/**
 * Registra atalhos de teclado globais.
 *
 * Suporta teclas simples ("?") e combos sequenciais ("g h").
 * Ignora eventos quando o foco está em input, textarea, select ou elemento editável.
 *
 * @param shortcuts - Mapa de tecla/combo → callback. Deve ser estável (useMemo no chamador).
 */
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>): void {
  const pendingRef = useRef<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName?.toLowerCase() ?? ''
        if (
          ['input', 'textarea', 'select'].includes(tag) ||
          target.isContentEditable
        ) {
          return
        }
      }

      const key = e.key
      const current = shortcutsRef.current

      // Tentar completar combo pendente
      if (pendingRef.current !== null) {
        const combo = `${pendingRef.current} ${key}`
        clearTimeout(timeoutRef.current)
        pendingRef.current = null
        if (current[combo]) {
          e.preventDefault()
          current[combo]()
          return
        }
      }

      // Atalho simples
      if (current[key]) {
        e.preventDefault()
        current[key]()
        return
      }

      // Iniciar combo potencial (ex: "g")
      const hasCombo = Object.keys(current).some((k) => k.startsWith(key + ' '))
      if (hasCombo) {
        pendingRef.current = key
        timeoutRef.current = setTimeout(() => {
          pendingRef.current = null
        }, 1000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeoutRef.current)
    }
  }, []) // shortcuts acessado via ref — sem re-registro
}

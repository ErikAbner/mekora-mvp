import { useCallback, useState } from 'react'

const RECENT_PRESETS_KEY = 'kindle_recent_presets'
const MAX_RECENT = 3

function readStorage(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as string[]
  } catch {
    return []
  }
}

/**
 * Mantém uma lista dos últimos presets usados em localStorage.
 * Máximo de MAX_RECENT (3) entradas, mais recente primeiro.
 */
export function useRecentPresets(): {
  recentIds: string[]
  addRecent: (presetId: string) => void
  clearRecent: () => void
} {
  const [recentIds, setRecentIds] = useState<string[]>(() =>
    readStorage(RECENT_PRESETS_KEY),
  )

  const addRecent = useCallback((presetId: string) => {
    setRecentIds((prev) => {
      const next = [presetId, ...prev.filter((id) => id !== presetId)].slice(0, MAX_RECENT)
      try {
        localStorage.setItem(RECENT_PRESETS_KEY, JSON.stringify(next))
      } catch { /* localStorage indisponível — silenciar */ }
      return next
    })
  }, [])

  const clearRecent = useCallback(() => {
    try { localStorage.removeItem(RECENT_PRESETS_KEY) } catch { /* ignorar */ }
    setRecentIds([])
  }, [])

  return { recentIds, addRecent, clearRecent }
}

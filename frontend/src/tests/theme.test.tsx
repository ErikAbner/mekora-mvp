import { renderHook, act } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'

// jsdom neste ambiente não expõe localStorage completo — usamos mock
let store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { store = {} },
}

beforeAll(() => {
  vi.stubGlobal('localStorage', localStorageMock)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  store = {}
  document.documentElement.classList.remove('dark')
})

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

describe('ThemeProvider + useTheme', () => {
  it('inicia com tema claro por padrão', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('aplica classe dark no documentElement ao setar tema escuro', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setTheme('dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('remove classe dark ao voltar para tema claro', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setTheme('dark'))
    act(() => result.current.setTheme('light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persiste tema escuro em localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setTheme('dark'))
    expect(store['ui_theme']).toBe('dark')
  })

  it('persiste tema claro em localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    act(() => result.current.setTheme('dark'))
    act(() => result.current.setTheme('light'))
    expect(store['ui_theme']).toBe('light')
  })

  it('lê tema inicial escuro do localStorage', () => {
    store['ui_theme'] = 'dark'
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('dark')
  })

  it('atualiza o estado interno ao alternar temas', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.theme).toBe('light')
    act(() => result.current.setTheme('dark'))
    expect(result.current.theme).toBe('dark')
    act(() => result.current.setTheme('light'))
    expect(result.current.theme).toBe('light')
  })
})

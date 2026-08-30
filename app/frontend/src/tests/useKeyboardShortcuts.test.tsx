import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'

function fireKey(key: string, target: EventTarget = window) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true })
  Object.defineProperty(event, 'target', { value: target, writable: false })
  window.dispatchEvent(event)
}

describe('useKeyboardShortcuts', () => {
  it('atalho simples dispara callback', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts({ '?': handler }))
    fireKey('?')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('atalho combo g+h dispara callback', async () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts({ 'g h': handler }))
    fireKey('g')
    fireKey('h')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('ignora quando input está focado', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts({ '?': handler }))
    const input = document.createElement('input')
    document.body.appendChild(input)
    const event = new KeyboardEvent('keydown', { key: '?', bubbles: true })
    Object.defineProperty(event, 'target', { value: input, writable: false })
    window.dispatchEvent(event)
    expect(handler).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('não dispara para atalho desconhecido', () => {
    const handler = vi.fn()
    renderHook(() => useKeyboardShortcuts({ '?': handler }))
    fireKey('z')
    expect(handler).not.toHaveBeenCalled()
  })
})

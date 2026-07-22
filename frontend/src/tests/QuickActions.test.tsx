import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { QuickActions } from '../components/QuickActions'

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('QuickActions', () => {
  it('renderiza links com href correto', () => {
    wrap(
      <QuickActions
        actions={[{ label: 'Abrir', href: '/analyze/1', variant: 'secondary' }]}
      />,
    )
    const link = screen.getByRole('link', { name: 'Abrir' })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/analyze/1')
  })

  it('renderiza botões e chama onClick', async () => {
    const handler = vi.fn()
    wrap(
      <QuickActions
        actions={[{ label: 'Duplicar', onClick: handler, variant: 'secondary' }]}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Duplicar' }))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('aplica variante action-green', () => {
    wrap(
      <QuickActions
        actions={[{ label: 'Enviar', href: '/analyze/2', variant: 'action-green' }]}
      />,
    )
    const link = screen.getByRole('link', { name: 'Enviar' })
    expect(link.className).toContain('green')
  })

  it('botão desabilitado não chama onClick', async () => {
    const handler = vi.fn()
    wrap(
      <QuickActions
        actions={[{ label: 'Ação', onClick: handler, disabled: true }]}
      />,
    )
    const btn = screen.getByRole('button', { name: 'Ação' })
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    expect(handler).not.toHaveBeenCalled()
  })
})

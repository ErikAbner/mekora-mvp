import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusBadge } from '../components/StatusBadge'

describe('StatusBadge', () => {
  it('exibe o label em português para status "done"', () => {
    render(<StatusBadge status="done" />)
    expect(screen.getByText('Concluído')).toBeInTheDocument()
  })

  it('exibe o label em português para status "analyzing"', () => {
    render(<StatusBadge status="analyzing" />)
    expect(screen.getByText('Analisando')).toBeInTheDocument()
  })

  it('exibe o label em português para status "error"', () => {
    render(<StatusBadge status="error" />)
    expect(screen.getByText('Erro')).toBeInTheDocument()
  })

  it('usa o valor bruto como fallback para status desconhecido', () => {
    render(<StatusBadge status="custom-status" />)
    expect(screen.getByText('custom-status')).toBeInTheDocument()
  })

  it('tem aria-label descritivo', () => {
    render(<StatusBadge status="done" />)
    const badge = screen.getByText('Concluído')
    expect(badge).toHaveAttribute('aria-label', 'Status: Concluído')
  })

  it('tem aria-label para status desconhecido', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('pending')).toHaveAttribute('aria-label', 'Status: pending')
  })
})

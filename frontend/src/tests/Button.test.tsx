import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../components/Button'

describe('Button', () => {
  it('renderiza o texto dos filhos', () => {
    render(<Button>Clique aqui</Button>)
    expect(screen.getByRole('button', { name: 'Clique aqui' })).toBeInTheDocument()
  })

  it('chama onClick ao clicar', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Enviar</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('não dispara onClick quando disabled', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>Bloqueado</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('botão desabilitado tem atributo disabled', () => {
    render(<Button disabled>Bloqueado</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('usa aria-label quando fornecido', () => {
    render(<Button aria-label="Fechar janela">×</Button>)
    expect(screen.getByRole('button', { name: 'Fechar janela' })).toBeInTheDocument()
  })

  it('variante action-blue renderiza corretamente', () => {
    render(<Button variant="action-blue">Converter</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeInTheDocument()
    expect(btn.className).toContain('text-brand')
  })
})

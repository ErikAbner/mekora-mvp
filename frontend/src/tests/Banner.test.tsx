import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Banner } from '../components/Banner'

describe('Banner', () => {
  it('renderiza o conteúdo passado como children', () => {
    render(<Banner variant="success">Operação concluída</Banner>)
    expect(screen.getByText('Operação concluída')).toBeInTheDocument()
  })

  it('variante error tem role="alert"', () => {
    render(<Banner variant="error">Algo deu errado</Banner>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('variante warning tem role="alert"', () => {
    render(<Banner variant="warning">Atenção</Banner>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('variante success tem role="status"', () => {
    render(<Banner variant="success">Salvo</Banner>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('variante info tem role="status"', () => {
    render(<Banner variant="info">Informação</Banner>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renderiza elementos filhos complexos', () => {
    render(
      <Banner variant="error">
        <strong>Erro:</strong> conexão recusada
      </Banner>,
    )
    expect(screen.getByText('Erro:')).toBeInTheDocument()
    expect(screen.getByText('conexão recusada')).toBeInTheDocument()
  })
})

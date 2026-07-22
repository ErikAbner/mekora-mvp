import { render, screen, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Layout from '../components/Layout'

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

let store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { store = {} },
}

beforeAll(() => { vi.stubGlobal('localStorage', localStorageMock) })
afterAll(() => { vi.unstubAllGlobals() })

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: vi.fn() }))

vi.mock('../components/KeyboardShortcutsHelp', () => ({
  KeyboardShortcutsHelp: () => null,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLayout(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Layout>
        <div data-testid="content">content</div>
      </Layout>
    </MemoryRouter>,
  )
}

function dispatchJobSelect(id: string, type: 'document' | 'comic', name: string) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('kindle:jobselect', { detail: { id, type, name } }),
    )
  })
}

function dispatchComicSelect(id: string, name: string) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('kindle:comicselect', { detail: { id, name } }),
    )
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Layout — job context indicator', () => {
  beforeEach(() => {
    store = {}
    vi.clearAllMocks()
  })

  it('shows "Nenhum job ativo" when no job context', () => {
    renderLayout('/')

    expect(screen.getByText('Nenhum job ativo')).toBeInTheDocument()
    expect(
      screen.getByText('Abra um job da fila para ver as etapas disponíveis.'),
    ).toBeInTheDocument()
  })

  it('shows job name after kindle:jobselect event (comic)', async () => {
    renderLayout('/')

    dispatchJobSelect('42', 'comic', 'Meu Comic Legal')

    await waitFor(() => {
      expect(screen.getByText('Meu Comic Legal')).toBeInTheDocument()
    })
    expect(screen.getByText('Job ativo')).toBeInTheDocument()
    expect(screen.getByText('Pipeline de quadrinhos.')).toBeInTheDocument()
  })

  it('shows job name after kindle:jobselect event (document)', async () => {
    renderLayout('/')

    dispatchJobSelect('10', 'document', 'Meu Livro')

    await waitFor(() => {
      expect(screen.getByText('Meu Livro')).toBeInTheDocument()
    })
    expect(screen.getByText('Job ativo')).toBeInTheDocument()
    expect(screen.getByText('Pipeline de documento.')).toBeInTheDocument()
  })

  it('truncates long job names with title attribute for tooltip', async () => {
    const longName = 'Este é um nome de comic muito longo que vai causar truncamento no layout da sidebar'
    renderLayout('/')
    dispatchJobSelect('7', 'comic', longName)

    await waitFor(() => {
      const nameEl = screen.getByTitle(longName)
      expect(nameEl).toBeInTheDocument()
      expect(nameEl).toHaveClass('truncate')
    })
  })

  it('shows job ID as fallback when context set from URL but no name', () => {
    store['lastComicId'] = '99'
    // No name stored

    renderLayout('/review/99')

    expect(screen.getByText('#99')).toBeInTheDocument()
  })

  it('persists job name, id and type in localStorage after kindle:jobselect', async () => {
    renderLayout('/')
    dispatchJobSelect('5', 'comic', 'Comic Persistido')

    await waitFor(() => {
      expect(store['lastComicName']).toBe('Comic Persistido')
      expect(store['lastComicId']).toBe('5')
      expect(store['lastJobType']).toBe('comic')
    })
  })

  it('production nav item is disabled when no job context', () => {
    renderLayout('/')

    const analysisEl = screen.getByText('Análise').closest('[aria-disabled="true"]')
    expect(analysisEl).toBeInTheDocument()
  })

  it('comic production links appear after comic job is selected', async () => {
    renderLayout('/')
    dispatchJobSelect('3', 'comic', 'Meu Comic')

    await waitFor(() => {
      const reviewLink = screen.getByRole('link', { name: /^review$/i })
      expect(reviewLink).toHaveAttribute('href', '/review/3')
    })
    // Tradução é visível na sidebar comic
    const translationLinks = screen.getAllByText(/^tradução$/i)
    expect(translationLinks.length).toBeGreaterThan(0)
    // Acabamento é etapa própria (não é o export)
    expect(screen.getByRole('link', { name: /^acabamento$/i })).toHaveAttribute('href', '/finish/3')
    // Exportar é o passo final, com página própria
    expect(screen.getByRole('link', { name: /^exportar$/i })).toHaveAttribute('href', '/export/3')
  })

  it('document job does not show comic-only links', async () => {
    renderLayout('/')
    dispatchJobSelect('8', 'document', 'Meu Livro')

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /análise/i })).toHaveAttribute('href', '/analyze/8')
    })
    expect(screen.queryByRole('link', { name: /^review$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /overlay/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^exportar$/i })).not.toBeInTheDocument()
  })

  it('backwards compat: kindle:comicselect sets type to comic', async () => {
    renderLayout('/')
    dispatchComicSelect('20', 'Comic Legado')

    await waitFor(() => {
      expect(screen.getByText('Comic Legado')).toBeInTheDocument()
      expect(screen.getByText('Pipeline de quadrinhos.')).toBeInTheDocument()
    })
    expect(store['lastJobType']).toBe('comic')
  })

  it('updates job name when a different job is selected', async () => {
    renderLayout('/')

    dispatchJobSelect('1', 'comic', 'Comic A')
    await waitFor(() => expect(screen.getByText('Comic A')).toBeInTheDocument())

    dispatchJobSelect('2', 'comic', 'Comic B')
    await waitFor(() => expect(screen.getByText('Comic B')).toBeInTheDocument())
    expect(screen.queryByText('Comic A')).not.toBeInTheDocument()
  })

  it('context indicator is always visible (no mode toggle to hide it)', () => {
    renderLayout('/')
    // Context indicator is always rendered in the Produção section
    expect(screen.getByText('Nenhum job ativo')).toBeInTheDocument()
    // No mode toggle buttons should exist
    expect(screen.queryByRole('button', { name: /^documento$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^comic$/i })).not.toBeInTheDocument()
  })
})

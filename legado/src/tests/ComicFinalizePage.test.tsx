import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicFinalizePage from '../pages/ComicFinalizePage'
import type { FinalManifest, FinalResponse } from '../types'

// ---------------------------------------------------------------------------
// Mocks da API
// ---------------------------------------------------------------------------

const mockGetFinalManifest      = vi.fn()
const mockInitFinalManifest     = vi.fn()
const mockPatchFinalManifest    = vi.fn()
const mockExportFinalPages      = vi.fn()
const mockGetSuggestions        = vi.fn()
const mockRecomputeSuggestions  = vi.fn()
const mockApplySuggestions      = vi.fn()
const mockGetExportManifest     = vi.fn()

vi.mock('../api/client', () => ({
  getFinalManifest:     (...args: unknown[]) => mockGetFinalManifest(...args),
  initFinalManifest:    (...args: unknown[]) => mockInitFinalManifest(...args),
  patchFinalManifest:   (...args: unknown[]) => mockPatchFinalManifest(...args),
  exportFinalPages:     (...args: unknown[]) => mockExportFinalPages(...args),
  getSuggestions:       (...args: unknown[]) => mockGetSuggestions(...args),
  recomputeSuggestions: (...args: unknown[]) => mockRecomputeSuggestions(...args),
  applySuggestions:     (...args: unknown[]) => mockApplySuggestions(...args),
  getExportManifest:    (...args: unknown[]) => mockGetExportManifest(...args),
  API_BASE: '',
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useParams: () => ({ id: '42' }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeFinalManifest(overrides: Partial<FinalManifest> = {}): FinalManifest {
  return {
    job_id: 42,
    total_pages: 1,
    pages: [
      {
        page_number: 1,
        selected_variant: 'original',
        available_variants: ['original', 'render_overlay'],
        selection_source: 'default',
        notes: null,
        updated_at: '2026-03-28T11:00:00+00:00',
        serve_paths: {
          original: '/storage/output/42/pages/page_001.jpg',
          render_overlay: '/storage/output/42/rendered_pages/page_001.png',
        },
        final_serve_path: null,
        export_error: null,
      },
    ],
    summary: { original: 1, render_overlay: 0, inpaint: 0 },
    exported_pages: 0,
    zip_path: null,
    cbz_path: null,
    ...overrides,
  }
}

function makeFinalResponse(overrides: Partial<FinalManifest> = {}): FinalResponse {
  return { manifest: makeFinalManifest(overrides) }
}

function renderPage() {
  return render(<MemoryRouter><ComicFinalizePage /></MemoryRouter>)
}

// ---------------------------------------------------------------------------
// Testes — Fase I.B
// ---------------------------------------------------------------------------

describe('ComicFinalizePage — Fase I.B (curadoria final)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Sugestões retornam 404 por padrão (não computadas)
    mockGetSuggestions.mockRejectedValue({ response: { status: 404 } })
    // Export manifest retorna 404 por padrão (export ainda não realizado)
    mockGetExportManifest.mockRejectedValue({ response: { status: 404 } })
  })

  it('exibe botão de inicializar quando manifesto não existe (404)', async () => {
    mockGetFinalManifest.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Inicializar curadoria/i })).toBeInTheDocument()
    })
  })

  it('exibe cards de variante após inicializar', async () => {
    mockGetFinalManifest.mockRejectedValue({ response: { status: 404 } })
    mockInitFinalManifest.mockResolvedValue(makeFinalResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Inicializar curadoria/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Inicializar curadoria/i }))
    await waitFor(() => {
      // Variante "Render overlay" é única na tela — confirma que os cards estão visíveis
      expect(screen.getByText('Render overlay')).toBeInTheDocument()
    })
  })

  it('selecionar variante chama patchFinalManifest', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockPatchFinalManifest.mockResolvedValue(
      makeFinalResponse({ pages: [{ ...makeFinalManifest().pages[0], selected_variant: 'render_overlay' }] })
    )
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Selecionar Render overlay/i }),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Selecionar Render overlay/i }))
    await waitFor(() => {
      expect(mockPatchFinalManifest).toHaveBeenCalledWith(
        42,
        [{ page_number: 1, selected_variant: 'render_overlay' }],
      )
    })
  })

  it('exibe "Não disponível" para variante inpaint quando ausente', async () => {
    // available_variants não contém 'inpaint'
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByText(/Não disponível/i).length).toBeGreaterThan(0)
    })
  })

  it('botão exportar chama exportFinalPages', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockExportFinalPages.mockResolvedValue(
      makeFinalResponse({
        exported_pages: 1,
        zip_path: '/storage/output/42/final_pages.zip',
        cbz_path: '/storage/output/42/final_pages.cbz',
      })
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exportar páginas finais/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Exportar páginas finais/i }))
    await waitFor(() => {
      expect(mockExportFinalPages).toHaveBeenCalledWith(42)
    })
  })

  it('exibe links de download ZIP e CBZ após exportação', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockExportFinalPages.mockResolvedValue(
      makeFinalResponse({
        exported_pages: 1,
        zip_path: '/storage/output/42/final_pages.zip',
        cbz_path: '/storage/output/42/final_pages.cbz',
      })
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exportar páginas finais/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Exportar páginas finais/i }))
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Baixar ZIP final/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Baixar CBZ final/i })).toBeInTheDocument()
    })
  })
})

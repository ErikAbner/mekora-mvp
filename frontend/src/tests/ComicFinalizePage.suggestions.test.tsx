import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicFinalizePage from '../pages/ComicFinalizePage'
import type { FinalManifest, FinalResponse, SuggestionManifest, SuggestionResponse, ApplySuggestionsResponse } from '../types'

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

function makeFinalPage(overrides: Partial<FinalManifest['pages'][0]> = {}): FinalManifest['pages'][0] {
  return {
    page_number: 1,
    selected_variant: 'original',
    available_variants: ['original', 'render_overlay'],
    notes: null,
    updated_at: '2026-03-28T11:00:00+00:00',
    serve_paths: {
      original: '/storage/output/42/pages/page_001.jpg',
      render_overlay: '/storage/output/42/rendered_pages/page_001.png',
    },
    final_serve_path: null,
    export_error: null,
    selection_source: 'default',
    ...overrides,
  }
}

function makeFinalManifest(overrides: Partial<FinalManifest> = {}): FinalManifest {
  return {
    job_id: 42,
    total_pages: 1,
    pages: [makeFinalPage()],
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

function makeSuggestionManifest(overrides: Partial<SuggestionManifest> = {}): SuggestionManifest {
  return {
    job_id: 42,
    total_pages: 1,
    computed_at: '2026-03-28T11:00:00+00:00',
    pages: [
      {
        page_number: 1,
        available_variants: ['original', 'render_overlay'],
        scores: { original: 0.5, render_overlay: 0.8 },
        suggested_variant: 'render_overlay',
        confidence_score: 0.8,
        reasons: ['Renderização sem erros', '0/0 blocos revisados/aprovados'],
        review_required: false,
      },
    ],
    ...overrides,
  }
}

function makeSuggestionResponse(overrides: Partial<SuggestionManifest> = {}): SuggestionResponse {
  return { manifest: makeSuggestionManifest(overrides) }
}

function renderPage() {
  return render(<MemoryRouter><ComicFinalizePage /></MemoryRouter>)
}

// ---------------------------------------------------------------------------
// Testes — Fase I.C (curadoria semi-automática)
// ---------------------------------------------------------------------------

describe('ComicFinalizePage — Fase I.C (sugestões e lote)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Por padrão, sugestões retornam 404 (não computadas)
    mockGetSuggestions.mockRejectedValue({ response: { status: 404 } })
    // Export manifest retorna 404 por padrão (export ainda não realizado)
    mockGetExportManifest.mockRejectedValue({ response: { status: 404 } })
  })

  it('exibe badge "Sugerido" na variante recomendada', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockGetSuggestions.mockResolvedValue(makeSuggestionResponse())
    renderPage()
    await waitFor(() => {
      // "Sugerido 80%" deve aparecer na variante render_overlay
      expect(screen.getByText(/Sugerido 80%/i)).toBeInTheDocument()
    })
  })

  it('exibe indicador de revisão necessária quando review_required=true', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockGetSuggestions.mockResolvedValue(
      makeSuggestionResponse({
        pages: [
          {
            page_number: 1,
            available_variants: ['original', 'render_overlay'],
            scores: { original: 0.5, render_overlay: 0.52 },
            suggested_variant: 'render_overlay',
            confidence_score: 0.52,
            reasons: ['Gap de score pequeno'],
            review_required: true,
          },
        ],
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Revisar/i)).toBeInTheDocument()
    })
  })

  it('exibe contagem de páginas que requerem revisão', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockGetSuggestions.mockResolvedValue(
      makeSuggestionResponse({
        pages: [
          {
            page_number: 1,
            available_variants: ['original'],
            scores: { original: 0.4 },
            suggested_variant: 'original',
            confidence_score: 0.4,
            reasons: ['Score baixo'],
            review_required: true,
          },
        ],
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/1 página\(s\) requerem revisão/i)).toBeInTheDocument()
    })
  })

  it('botão "Recomputar sugestões" chama recomputeSuggestions', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockRecomputeSuggestions.mockResolvedValue(makeSuggestionResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Recomputar sugestões/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Recomputar sugestões/i }))
    await waitFor(() => {
      expect(mockRecomputeSuggestions).toHaveBeenCalledWith(42)
    })
  })

  it('botão "Aplicar sugestões (pendentes)" chama applySuggestions com only_undecided=true', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockGetSuggestions.mockResolvedValue(makeSuggestionResponse())
    mockApplySuggestions.mockResolvedValue({
      manifest: makeFinalManifest(),
      applied_count: 1,
    } as ApplySuggestionsResponse)
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Aplicar sugestões \(pendentes\)/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Aplicar sugestões \(pendentes\)/i }))
    await waitFor(() => {
      expect(mockApplySuggestions).toHaveBeenCalledWith(42, {
        only_undecided: true,
        min_confidence: 0.0,
      })
    })
  })

  it('botão "Aplicar sugestões (todas)" chama applySuggestions com only_undecided=false', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockGetSuggestions.mockResolvedValue(makeSuggestionResponse())
    mockApplySuggestions.mockResolvedValue({
      manifest: makeFinalManifest(),
      applied_count: 1,
    } as ApplySuggestionsResponse)
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Aplicar sugestões \(todas\)/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Aplicar sugestões \(todas\)/i }))
    await waitFor(() => {
      expect(mockApplySuggestions).toHaveBeenCalledWith(42, {
        only_undecided: false,
        min_confidence: 0.0,
      })
    })
  })

  it('exibe "n página(s) atualizadas" após aplicar sugestões', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockGetSuggestions.mockResolvedValue(makeSuggestionResponse())
    mockApplySuggestions.mockResolvedValue({
      manifest: makeFinalManifest(),
      applied_count: 1,
    } as ApplySuggestionsResponse)
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Aplicar sugestões \(pendentes\)/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Aplicar sugestões \(pendentes\)/i }))
    await waitFor(() => {
      expect(screen.getByText(/1 página\(s\) atualizadas/i)).toBeInTheDocument()
    })
  })

  it('badge "Manual" é exibido quando selection_source=manual', async () => {
    mockGetFinalManifest.mockResolvedValue(
      makeFinalResponse({
        pages: [makeFinalPage({ selection_source: 'manual' })],
      }),
    )
    renderPage()
    await waitFor(() => {
      // O botão de filtro exibe "Manual (N)" no redesign; o badge exibe "Manual"
      const manualElements = screen.getAllByText(/^Manual/)
      expect(manualElements.length).toBeGreaterThanOrEqual(2)
      // pelo menos um deles é um <span> (badge)
      expect(manualElements.some((el) => el.tagName === 'SPAN')).toBe(true)
    })
  })

  it('badge "Auto" é exibido quando selection_source=auto', async () => {
    mockGetFinalManifest.mockResolvedValue(
      makeFinalResponse({
        pages: [makeFinalPage({ selection_source: 'auto' })],
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Auto')).toBeInTheDocument()
    })
  })
})

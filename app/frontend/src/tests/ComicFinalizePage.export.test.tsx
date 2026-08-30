import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicFinalizePage from '../pages/ComicFinalizePage'
import type { ExportManifest, ExportResponse, FinalManifest, FinalResponse } from '../types'

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
        notes: null,
        updated_at: '2026-03-28T11:00:00+00:00',
        serve_paths: {
          original: '/storage/output/42/pages/page_001.jpg',
          render_overlay: '/storage/output/42/rendered_pages/page_001.png',
        },
        final_serve_path: null,
        export_error: null,
        selection_source: 'default',
      },
    ],
    summary: { original: 1, render_overlay: 0, inpaint: 0 },
    exported_pages: 0,
    zip_path: null,
    cbz_path: null,
    pdf_path: null,
    ...overrides,
  }
}

function makeFinalResponse(overrides: Partial<FinalManifest> = {}): FinalResponse {
  return { manifest: makeFinalManifest(overrides) }
}

function makeExportManifest(overrides: Partial<ExportManifest> = {}): ExportManifest {
  return {
    job_id: 42,
    exported_at: '2026-03-28T12:00:00+00:00',
    total_pages: 1,
    pdf_path: null,
    pages: [
      {
        page_number: 1,
        selected_variant: 'original',
        source_path: '/storage/output/42/pages/page_001.jpg',
        final_path: '/storage/output/42/final_pages/page_001.png',
        exported_at: '2026-03-28T12:00:00+00:00',
        selection_source: 'default',
        notes: null,
        error: null,
      },
    ],
    ...overrides,
  }
}

function makeExportResponse(overrides: Partial<ExportManifest> = {}): ExportResponse {
  return { manifest: makeExportManifest(overrides) }
}

function renderPage() {
  return render(<MemoryRouter><ComicFinalizePage /></MemoryRouter>)
}

// ---------------------------------------------------------------------------
// Testes — Fase J.A
// ---------------------------------------------------------------------------

describe('ComicFinalizePage — Fase J.A (export pipeline)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSuggestions.mockRejectedValue({ response: { status: 404 } })
    mockGetExportManifest.mockRejectedValue({ response: { status: 404 } })
  })

  it('exibe sumário de variantes antes de exportar', async () => {
    mockGetFinalManifest.mockResolvedValue(
      makeFinalResponse({ summary: { original: 2, render_overlay: 3, inpaint: 1 } })
    )
    renderPage()
    await waitFor(() => {
      // J.A export summary usa "página(s)" — distinto do "Resumo do projeto" que usa "páginas"
      expect(screen.getByText(/Original: 2 página\(s\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Render overlay: 3 página\(s\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Inpaint: 1 página\(s\)/i)).toBeInTheDocument()
    })
  })

  it('exibe link PDF após export quando pdf_path retornado', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockExportFinalPages.mockResolvedValue(
      makeFinalResponse({
        exported_pages: 1,
        zip_path: '/storage/output/42/final_pages.zip',
        cbz_path: '/storage/output/42/final_pages.cbz',
        pdf_path: '/storage/output/42/final_pages.pdf',
      })
    )
    mockGetExportManifest.mockResolvedValue(makeExportResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exportar páginas finais/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Exportar páginas finais/i }))
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Baixar PDF final/i })).toBeInTheDocument()
    })
  })

  it('não exibe link PDF quando pdf_path é null', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockExportFinalPages.mockResolvedValue(
      makeFinalResponse({
        exported_pages: 1,
        zip_path: '/storage/output/42/final_pages.zip',
        cbz_path: '/storage/output/42/final_pages.cbz',
        pdf_path: null,
      })
    )
    mockGetExportManifest.mockResolvedValue(makeExportResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exportar páginas finais/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Exportar páginas finais/i }))
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /Baixar PDF final/i })).not.toBeInTheDocument()
    })
  })

  it('getExportManifest 404 não quebra a página', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    mockGetExportManifest.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => {
      // Página carrega normalmente mesmo sem export anterior
      expect(screen.getByRole('button', { name: /Exportar páginas finais/i })).toBeInTheDocument()
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
    mockGetExportManifest.mockResolvedValue(makeExportResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exportar páginas finais/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Exportar páginas finais/i }))
    await waitFor(() => {
      expect(mockExportFinalPages).toHaveBeenCalledWith(42)
    })
  })

  it('getExportManifest é chamado ao montar a página', async () => {
    mockGetFinalManifest.mockResolvedValue(makeFinalResponse())
    renderPage()
    await waitFor(() => {
      expect(mockGetExportManifest).toHaveBeenCalledWith(42)
    })
  })
})

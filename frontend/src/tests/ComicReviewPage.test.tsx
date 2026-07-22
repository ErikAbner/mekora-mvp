import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ComicReviewPage from '../pages/ComicReviewPage'
import type { ComicReviewExportResponse, ComicReviewResponse } from '../types'

// ---------------------------------------------------------------------------
// Mocks da API
// ---------------------------------------------------------------------------

const mockGetComicReview = vi.fn()
const mockPatchComicReview = vi.fn()
const mockExportComicReview = vi.fn()

vi.mock('../api/client', () => ({
  getComicReview: (...args: unknown[]) => mockGetComicReview(...args),
  patchComicReview: (...args: unknown[]) => mockPatchComicReview(...args),
  exportComicReview: (...args: unknown[]) => mockExportComicReview(...args),
  API_BASE: '',
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeReviewResponse(overrides: Partial<ComicReviewResponse> = {}): ComicReviewResponse {
  return {
    sidecar: {
      job_id: 1,
      source_language: 'por',
      target_language: 'eng',
      pages: [
        {
          page_number: 1,
          blocks: [
            {
              block_id: 'p1_b0',
              original_text: 'texto original',
              translated_text: 'translated text',
              reviewed_text: '',
              review_status: 'pending',
              confidence: null,
              bbox: null,
            },
            {
              block_id: 'p1_b1',
              original_text: 'outro texto',
              translated_text: 'other text',
              reviewed_text: 'revisado manualmente',
              review_status: 'edited',
              confidence: null,
              bbox: null,
            },
          ],
          error: null,
        },
        {
          page_number: 2,
          blocks: [],
          error: null,
        },
      ],
    },
    stats: {
      total: 2,
      pending: 1,
      approved: 0,
      edited: 1,
      skipped: 0,
    },
    ...overrides,
  }
}

function makeExportResponse(): ComicReviewExportResponse {
  return {
    json_path: '/storage/output/1/comic_review.json',
    html_path: '/storage/output/1/comic_review.html',
    md_path: '/storage/output/1/comic_review.md',
  }
}

function renderPage() {
  return render(<ComicReviewPage />)
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('ComicReviewPage — Fase E', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mostra estado de carregamento inicialmente', () => {
    mockGetComicReview.mockReturnValue(new Promise(() => {})) // nunca resolve
    renderPage()
    expect(screen.getByText(/Carregando revisão/i)).toBeInTheDocument()
  })

  it('exibe lista de blocos após carregamento', async () => {
    mockGetComicReview.mockResolvedValue(makeReviewResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('texto original')).toBeInTheDocument()
    })
    expect(screen.getByText('translated text')).toBeInTheDocument()
    expect(screen.getByText('revisado manualmente')).toBeInTheDocument()
  })

  it('exibe aviso de que nenhuma imagem é alterada', async () => {
    mockGetComicReview.mockResolvedValue(makeReviewResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma imagem do quadrinho é alterada/i)).toBeInTheDocument()
    })
  })

  it('exibe estatísticas de progresso', async () => {
    mockGetComicReview.mockResolvedValue(makeReviewResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/2 blocos/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/1 pendentes/i)).toBeInTheDocument()
    expect(screen.getByText(/1 editados/i)).toBeInTheDocument()
  })

  it('clicar em Aprovar chama patchComicReview com review_status=approved', async () => {
    mockGetComicReview.mockResolvedValue(makeReviewResponse())
    mockPatchComicReview.mockResolvedValue(makeReviewResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Aprovar/i })).toHaveLength(2)
    })
    fireEvent.click(screen.getAllByRole('button', { name: /Aprovar/i })[0])
    await waitFor(() => {
      expect(mockPatchComicReview).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ block_id: 'p1_b0', review_status: 'approved' }),
        ]),
      )
    })
  })

  it('editar textarea e salvar chama patchComicReview com reviewed_text', async () => {
    mockGetComicReview.mockResolvedValue(makeReviewResponse())
    mockPatchComicReview.mockResolvedValue(makeReviewResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText(/Edite a tradução/i)).toBeTruthy()
    })
    const textareas = screen.getAllByPlaceholderText(/Edite a tradução/i)
    fireEvent.change(textareas[0], { target: { value: 'nova tradução' } })
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }))
    await waitFor(() => {
      expect(mockPatchComicReview).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ block_id: 'p1_b0', reviewed_text: 'nova tradução' }),
        ]),
      )
    })
  })

  it('botão de próxima página avança para a página 2', async () => {
    mockGetComicReview.mockResolvedValue(makeReviewResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('►')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('►'))
    await waitFor(() => {
      expect(screen.getByText(/Página 2 de 2/i)).toBeInTheDocument()
    })
  })

  it('botão exportar chama exportComicReview e exibe links de download', async () => {
    mockGetComicReview.mockResolvedValue(makeReviewResponse())
    mockExportComicReview.mockResolvedValue(makeExportResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exportar revisão/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Exportar revisão/i }))
    await waitFor(() => {
      expect(screen.getByText(/JSON revisado/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/HTML revisado/i)).toBeInTheDocument()
    expect(screen.getByText(/Markdown revisado/i)).toBeInTheDocument()
  })

  it('exibe erro quando carregamento falha', async () => {
    mockGetComicReview.mockRejectedValue(new Error('Network error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Não foi possível carregar a revisão/i)).toBeInTheDocument()
    })
  })

  it('exibe mensagem de tradução obrigatória quando API retorna 409', async () => {
    mockGetComicReview.mockRejectedValue({ response: { status: 409 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/tradução de quadrinhos precisa ser concluída/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /Voltar à análise/i })).toBeInTheDocument()
  })

  it('exibe título "Tradução necessária" no estado prereqError', async () => {
    mockGetComicReview.mockRejectedValue({ response: { status: 409 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Tradução necessária/i)).toBeInTheDocument()
    })
  })
})

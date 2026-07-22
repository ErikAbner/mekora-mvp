import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicOverlayPage from '../pages/ComicOverlayPage'
import type { OverlayExportResponse, OverlayResponse } from '../types'

// ---------------------------------------------------------------------------
// Mocks da API
// ---------------------------------------------------------------------------

const mockGetComicOverlay = vi.fn()
const mockPatchComicOverlay = vi.fn()
const mockExportComicOverlay = vi.fn()

vi.mock('../api/client', () => ({
  getComicOverlay: (...args: unknown[]) => mockGetComicOverlay(...args),
  patchComicOverlay: (...args: unknown[]) => mockPatchComicOverlay(...args),
  exportComicOverlay: (...args: unknown[]) => mockExportComicOverlay(...args),
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

function makeOverlayResponse(overrides: Partial<OverlayResponse> = {}): OverlayResponse {
  return {
    sidecar: {
      job_id: 1,
      source_language: 'por',
      target_language: 'eng',
      pages: [
        {
          page_number: 1,
          image_path: null,  // sem imagem → modo lista
          blocks: [
            {
              block_id: 'p1_b0',
              original_text: 'texto original',
              translated_text: 'translated text',
              reviewed_text: '',
              review_status: 'pending',
              bbox: null,
              overlay_position: null,
              overlay_style: null,
              overlay_visibility: true,
            },
            {
              block_id: 'p1_b1',
              original_text: 'outro texto',
              translated_text: 'other text',
              reviewed_text: 'revisado manualmente',
              review_status: 'edited',
              bbox: [0.1, 0.2, 0.3, 0.1],
              overlay_position: null,
              overlay_style: null,
              overlay_visibility: true,
            },
          ],
          error: null,
        },
        {
          page_number: 2,
          image_path: '/storage/output/1/pages/page_002.jpg',
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

function makeExportResponse(): OverlayExportResponse {
  return {
    json_path: '/storage/output/1/comic_overlay.json',
    html_path: '/storage/output/1/comic_overlay.html',
  }
}

function renderPage() {
  return render(<MemoryRouter><ComicOverlayPage /></MemoryRouter>)
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('ComicOverlayPage — Fase F', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mostra estado de carregamento inicialmente', () => {
    mockGetComicOverlay.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/Carregando overlay/i)).toBeInTheDocument()
  })

  it('exibe lista de blocos quando página não tem imagem', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('p1_b0')).toBeInTheDocument()
    })
    expect(screen.getByText('p1_b1')).toBeInTheDocument()
  })

  it('clicar em bloco exibe painel lateral com detalhes', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /bloco p1_b0/i })).toBeTruthy()
    })
    fireEvent.click(screen.getAllByRole('button', { name: /bloco p1_b0/i })[0])
    await waitFor(() => {
      expect(screen.getByText('translated text')).toBeInTheDocument()
    })
  })

  it('editar textarea no painel chama patchComicOverlay com reviewed_text', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockPatchComicOverlay.mockResolvedValue(makeOverlayResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /bloco p1_b0/i })).toBeTruthy()
    })
    // Abrir painel
    fireEvent.click(screen.getAllByRole('button', { name: /bloco p1_b0/i })[0])
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Edite a tradução/i)).toBeInTheDocument()
    })
    // Editar
    fireEvent.change(screen.getByPlaceholderText(/Edite a tradução/i), {
      target: { value: 'nova tradução' },
    })
    // Salvar
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }))
    await waitFor(() => {
      expect(mockPatchComicOverlay).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ block_id: 'p1_b0', reviewed_text: 'nova tradução' }),
        ]),
      )
    })
  })

  it('ocultar bloco chama patchComicOverlay com overlay_visibility=false', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockPatchComicOverlay.mockResolvedValue(makeOverlayResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Ocultar/i })).toBeTruthy()
    })
    fireEvent.click(screen.getAllByRole('button', { name: /Ocultar/i })[0])
    await waitFor(() => {
      expect(mockPatchComicOverlay).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ block_id: 'p1_b0', overlay_visibility: false }),
        ]),
      )
    })
  })

  it('botão exportar chama exportComicOverlay e exibe link HTML', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockExportComicOverlay.mockResolvedValue(makeExportResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exportar HTML visual/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Exportar HTML visual/i }))
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /HTML visual/i })).toBeInTheDocument()
    })
    expect(mockExportComicOverlay).toHaveBeenCalledWith(1)
  })

  it('exibe erro quando carregamento falha', async () => {
    mockGetComicOverlay.mockRejectedValue(new Error('Network error'))
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/Não foi possível carregar o overlay visual/i),
      ).toBeInTheDocument()
    })
  })

  it('exibe mensagem de tradução obrigatória quando API retorna 409', async () => {
    mockGetComicOverlay.mockRejectedValue({ response: { status: 409 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/tradução de quadrinhos precisa ser concluída antes do overlay/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /Voltar à análise/i })).toBeInTheDocument()
  })

  it('exibe título "Tradução necessária" no estado prereqError', async () => {
    mockGetComicOverlay.mockRejectedValue({ response: { status: 409 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Tradução necessária/i)).toBeInTheDocument()
    })
  })

  it('botão de próxima página avança para página 2', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('►')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('►'))
    await waitFor(() => {
      expect(screen.getByText(/Página 2 de 2/i)).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Fase G — estilo e reset de posição
  // ---------------------------------------------------------------------------

  it('painel de estilo é exibido quando bloco está selecionado', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /bloco p1_b0/i })).toBeTruthy()
    })
    fireEvent.click(screen.getAllByRole('button', { name: /bloco p1_b0/i })[0])
    await waitFor(() => {
      expect(screen.getByText(/Estilo do overlay/i)).toBeInTheDocument()
    })
  })

  it('salvar estilo chama patchComicOverlay com overlay_style', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockPatchComicOverlay.mockResolvedValue(makeOverlayResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /bloco p1_b0/i })).toBeTruthy()
    })
    // Abrir painel
    fireEvent.click(screen.getAllByRole('button', { name: /bloco p1_b0/i })[0])
    await waitFor(() => {
      expect(screen.getByText(/Estilo do overlay/i)).toBeInTheDocument()
    })
    // Alterar font_size via range
    const fontRange = screen.getByRole('slider', { name: /Tamanho da fonte/i })
    fireEvent.change(fontRange, { target: { value: '1.2' } })
    // Salvar estilo
    fireEvent.click(screen.getByRole('button', { name: /Salvar estilo/i }))
    await waitFor(() => {
      expect(mockPatchComicOverlay).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ block_id: 'p1_b0', overlay_style: expect.objectContaining({ font_size: 1.2 }) }),
        ]),
      )
    })
  })

  it('resetar estilo chama patchComicOverlay com overlay_style=null', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockPatchComicOverlay.mockResolvedValue(makeOverlayResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /bloco p1_b0/i })).toBeTruthy()
    })
    fireEvent.click(screen.getAllByRole('button', { name: /bloco p1_b0/i })[0])
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resetar estilo/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Resetar estilo/i }))
    await waitFor(() => {
      expect(mockPatchComicOverlay).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ block_id: 'p1_b0', overlay_style: null }),
        ]),
      )
    })
  })

  it('resetar posição chama patchComicOverlay com overlay_position=null', async () => {
    // p1_b1 tem bbox=[0.1,0.2,0.3,0.1] — effectivePos não é null
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockPatchComicOverlay.mockResolvedValue(makeOverlayResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /bloco p1_b1/i })).toBeTruthy()
    })
    fireEvent.click(screen.getAllByRole('button', { name: /bloco p1_b1/i })[0])
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Resetar posição/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Resetar posição/i }))
    await waitFor(() => {
      expect(mockPatchComicOverlay).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ block_id: 'p1_b1', overlay_position: null }),
        ]),
      )
    })
  })
})

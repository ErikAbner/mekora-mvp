import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicOverlayPage from '../pages/ComicOverlayPage'
import type { InpaintManifest, InpaintResponse, OverlayResponse } from '../types'

// ---------------------------------------------------------------------------
// Mocks da API
// ---------------------------------------------------------------------------

const mockGetComicOverlay = vi.fn()
const mockPatchComicOverlay = vi.fn()
const mockExportComicOverlay = vi.fn()
const mockRenderComic = vi.fn()
const mockInpaintComic = vi.fn()

vi.mock('../api/client', () => ({
  getComicOverlay: (...args: unknown[]) => mockGetComicOverlay(...args),
  patchComicOverlay: (...args: unknown[]) => mockPatchComicOverlay(...args),
  exportComicOverlay: (...args: unknown[]) => mockExportComicOverlay(...args),
  renderComic: (...args: unknown[]) => mockRenderComic(...args),
  inpaintComic: (...args: unknown[]) => mockInpaintComic(...args),
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

function makeOverlayResponse(): OverlayResponse {
  return {
    sidecar: {
      job_id: 42,
      source_language: 'jpn',
      target_language: 'por',
      pages: [
        {
          page_number: 1,
          image_path: '/storage/output/42/pages/page_001.jpg',
          blocks: [
            {
              block_id: 'p1_b0',
              original_text: 'texto original',
              translated_text: 'translated text',
              reviewed_text: 'texto revisado',
              review_status: 'edited',
              bbox: [0.1, 0.1, 0.5, 0.2],
              overlay_position: null,
              overlay_style: null,
              overlay_visibility: true,
            },
          ],
          error: null,
        },
      ],
    },
    stats: { total: 1, pending: 0, approved: 0, edited: 1, skipped: 0 },
  }
}

function makeInpaintResponse(overrides: Partial<InpaintManifest> = {}): InpaintResponse {
  return {
    manifest: {
      job_id: 42,
      source_language: 'jpn',
      target_language: 'por',
      total_pages: 1,
      inpainted_pages: 1,
      params: { algorithm: 'blur', mask_padding: 2, inpaint_radius: 3, feather: 0 },
      pages: [
        {
          page_number: 1,
          inpainted_path: '/tmp/inpaint_pages/page_001.png',
          serve_path: '/storage/output/42/inpaint_pages/page_001.png',
          masked_blocks: 1,
          algorithm_used: 'blur',
          warnings: [],
          error: null,
        },
      ],
      zip_path: '/storage/output/42/inpaint_pages.zip',
      ...overrides,
    },
  }
}

function renderPage() {
  return render(<MemoryRouter><ComicOverlayPage /></MemoryRouter>)
}

// ---------------------------------------------------------------------------
// Testes — Fase I.A
// ---------------------------------------------------------------------------

describe('ComicOverlayPage — Fase I.A (inpainting)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe botão "Gerar inpainting"', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Gerar inpainting/i }),
      ).toBeInTheDocument()
    })
  })

  it('clicar no botão chama inpaintComic com o jobId correto', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockInpaintComic.mockResolvedValue(makeInpaintResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Gerar inpainting/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Gerar inpainting/i }))
    await waitFor(() => {
      expect(mockInpaintComic).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ algorithm: 'telea' }),
      )
    })
  })

  it('exibe imagem inpaintada após execução bem-sucedida', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockInpaintComic.mockResolvedValue(makeInpaintResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Gerar inpainting/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Gerar inpainting/i }))
    await waitFor(() => {
      expect(screen.getByTestId('inpainted-page-img')).toBeInTheDocument()
    })
    const img = screen.getByTestId('inpainted-page-img') as HTMLImageElement
    expect(img.src).toContain('/storage/output/42/inpaint_pages/page_001.png')
  })

  it('exibe link de download ZIP após execução bem-sucedida', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockInpaintComic.mockResolvedValue(makeInpaintResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Gerar inpainting/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Gerar inpainting/i }))
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /Baixar ZIP \(inpainting\)/i }),
      ).toBeInTheDocument()
    })
  })
})

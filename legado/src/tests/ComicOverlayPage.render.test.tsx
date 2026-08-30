import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicOverlayPage from '../pages/ComicOverlayPage'
import type { OverlayResponse, RenderManifest, RenderResponse } from '../types'

// ---------------------------------------------------------------------------
// Mocks da API
// ---------------------------------------------------------------------------

const mockGetComicOverlay = vi.fn()
const mockPatchComicOverlay = vi.fn()
const mockExportComicOverlay = vi.fn()
const mockRenderComic = vi.fn()

vi.mock('../api/client', () => ({
  getComicOverlay: (...args: unknown[]) => mockGetComicOverlay(...args),
  patchComicOverlay: (...args: unknown[]) => mockPatchComicOverlay(...args),
  exportComicOverlay: (...args: unknown[]) => mockExportComicOverlay(...args),
  renderComic: (...args: unknown[]) => mockRenderComic(...args),
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

function makeOverlayResponse(): OverlayResponse {
  return {
    sidecar: {
      job_id: 1,
      source_language: 'por',
      target_language: 'eng',
      pages: [
        {
          page_number: 1,
          image_path: '/storage/output/1/pages/page_001.jpg',
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

function makeRenderResponse(
  overrides: Partial<RenderManifest> = {},
): RenderResponse {
  return {
    manifest: {
      job_id: 1,
      source_language: 'por',
      target_language: 'eng',
      total_pages: 1,
      rendered_pages: 1,
      total_visible_blocks: 1,
      pages: [
        {
          page_number: 1,
          rendered_path: '/tmp/rendered_pages/page_001.png',
          serve_path: '/storage/output/1/rendered_pages/page_001.png',
          warnings: [],
          error: null,
        },
      ],
      zip_path: '/storage/output/1/rendered_pages.zip',
      cbz_path: '/storage/output/1/rendered_pages.cbz',
      ...overrides,
    },
  }
}

function renderPage() {
  return render(<MemoryRouter><ComicOverlayPage /></MemoryRouter>)
}

// ---------------------------------------------------------------------------
// Testes — Fase H
// ---------------------------------------------------------------------------

describe('ComicOverlayPage — Fase H (renderização)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe botão "Renderizar preview visual"', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Renderizar preview visual/i }),
      ).toBeInTheDocument()
    })
  })

  it('clicar em renderizar chama renderComic com o jobId correto', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockRenderComic.mockResolvedValue(makeRenderResponse())
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Renderizar preview visual/i }),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Renderizar preview visual/i }))
    await waitFor(() => {
      expect(mockRenderComic).toHaveBeenCalledWith(1)
    })
  })

  it('exibe imagem renderizada após renderização bem-sucedida', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockRenderComic.mockResolvedValue(makeRenderResponse())
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Renderizar preview visual/i }),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Renderizar preview visual/i }))
    await waitFor(() => {
      expect(screen.getByTestId('rendered-page-img')).toBeInTheDocument()
    })
    const img = screen.getByTestId('rendered-page-img') as HTMLImageElement
    expect(img.src).toContain('/storage/output/1/rendered_pages/page_001.png')
  })

  it('exibe links de download ZIP e CBZ após renderização', async () => {
    mockGetComicOverlay.mockResolvedValue(makeOverlayResponse())
    mockRenderComic.mockResolvedValue(makeRenderResponse())
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Renderizar preview visual/i }),
      ).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Renderizar preview visual/i }))
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /Baixar ZIP/i }),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /Baixar CBZ/i })).toBeInTheDocument()
  })
})

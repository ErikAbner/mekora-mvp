import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicFinishPage from '../pages/ComicFinishPage'
import type { FinishManifest, FinishResponse } from '../types'

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

const mockGetComicFinish    = vi.fn()
const mockInitComicFinish   = vi.fn()
const mockPatchComicFinish  = vi.fn()
const mockExportComicFinish = vi.fn()
const mockAnalyzeComicLayout = vi.fn()

vi.mock('../api/client', () => ({
  getComicFinish:     (...args: unknown[]) => mockGetComicFinish(...args),
  initComicFinish:    (...args: unknown[]) => mockInitComicFinish(...args),
  patchComicFinish:   (...args: unknown[]) => mockPatchComicFinish(...args),
  exportComicFinish:  (...args: unknown[]) => mockExportComicFinish(...args),
  analyzeComicLayout: (...args: unknown[]) => mockAnalyzeComicLayout(...args),
  API_BASE: '',
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useParams: () => ({ id: '42' }),
  }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeManifest(overrides: Partial<FinishManifest> = {}): FinishManifest {
  return {
    job_id: 42,
    global_preset: 'none',
    global_adjustments: { contrast: 1.0, brightness: 1.0, sharpness: 1.0, saturation: 1.0 },
    pages: [
      {
        page_number: 1,
        source_variant: 'original',
        preset_override: null,
        adjustments_override: null,
        source_path: '/storage/output/42/pages/page_001.jpg',
        finished_path: null,
        exported_at: null,
        warnings: [],
      },
    ],
    zip_path: null,
    cbz_path: null,
    pdf_path: null,
    ...overrides,
  }
}

function makeResponse(overrides: Partial<FinishManifest> = {}): FinishResponse {
  return { manifest: makeManifest(overrides) }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ComicFinishPage />
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ComicFinishPage — Fase N.A', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exibe botão de inicializar quando manifesto não existe (404)', async () => {
    mockGetComicFinish.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Inicializar acabamento/i })).toBeTruthy()
    })
  })

  it('exibe seletor de preset e sliders após init', async () => {
    mockGetComicFinish.mockRejectedValue({ response: { status: 404 } })
    mockInitComicFinish.mockResolvedValue(makeResponse())
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /Inicializar acabamento/i }))
    fireEvent.click(screen.getByRole('button', { name: /Inicializar acabamento/i }))
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeTruthy()
    })
  })

  it('mudança de preset global chama patchComicFinish com novo preset', async () => {
    mockGetComicFinish.mockResolvedValue(makeResponse())
    mockPatchComicFinish.mockResolvedValue(
      makeResponse({ global_preset: 'clean_manga_bw', global_adjustments: { contrast: 1.4, brightness: 1.05, sharpness: 1.6, saturation: 0.0 } }),
    )
    renderPage()
    await waitFor(() => screen.getByRole('combobox'))

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'clean_manga_bw' } })
    await waitFor(() => {
      expect(mockPatchComicFinish).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ global_preset: 'clean_manga_bw' }),
      )
    })
  })

  it('botão export dispara exportComicFinish e exibe links de download', async () => {
    mockGetComicFinish.mockResolvedValue(makeResponse())
    mockExportComicFinish.mockResolvedValue(
      makeResponse({
        pages: [{
          page_number: 1,
          source_variant: 'original',
          preset_override: null,
          adjustments_override: null,
          source_path: '/storage/output/42/pages/page_001.jpg',
          finished_path: '/storage/output/42/finished_pages/page_001.png',
          exported_at: '2026-03-28T12:00:00+00:00',
          warnings: [],
        }],
        zip_path: '/storage/output/42/finished_pages.zip',
        cbz_path: '/storage/output/42/finished_pages.cbz',
        pdf_path: null,
      }),
    )
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /Gerar páginas finalizadas/i }))
    fireEvent.click(screen.getByRole('button', { name: /Gerar páginas finalizadas/i }))
    await waitFor(() => {
      expect(mockExportComicFinish).toHaveBeenCalledWith(42)
      expect(screen.getByText(/Baixar ZIP finalizado/i)).toBeTruthy()
    })
  })

  it('botão redefinir tudo chama patchComicFinish com preset none', async () => {
    mockGetComicFinish.mockResolvedValue(makeResponse({ global_preset: 'high_contrast_overlay' }))
    mockPatchComicFinish.mockResolvedValue(makeResponse())
    renderPage()
    await waitFor(() => screen.getByText(/Redefinir tudo/i))
    fireEvent.click(screen.getByText(/Redefinir tudo/i))
    await waitFor(() => {
      expect(mockPatchComicFinish).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ global_preset: 'none' }),
      )
    })
  })

  it('exibe mensagem "ainda não analisado" quando quality_score é null', async () => {
    mockGetComicFinish.mockResolvedValue({ ...makeResponse(), quality_score: null })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Score de qualidade/i)).toBeInTheDocument()
      expect(screen.getByText(/Execute.*calcular o score/i)).toBeInTheDocument()
    })
  })

  it('exibe anel SVG de score quando quality_score está presente', async () => {
    mockGetComicFinish.mockResolvedValue({ ...makeResponse(), quality_score: 85 })
    renderPage()
    await waitFor(() => {
      // O anel SVG tem aria-label "Score: 85%"
      expect(screen.getByLabelText('Score: 85%')).toBeInTheDocument()
    })
  })

  it('botão "Pré-visualizar" aparece para páginas com source_path', async () => {
    mockGetComicFinish.mockResolvedValue(makeResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pré-visualizar 1/i })).toBeInTheDocument()
    })
  })

  it('clicar em "Pré-visualizar" abre painel com botões Antes/Depois', async () => {
    mockGetComicFinish.mockResolvedValue(makeResponse())
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /Pré-visualizar 1/i }))
    fireEvent.click(screen.getByRole('button', { name: /Pré-visualizar 1/i }))
    await waitFor(() => {
      expect(screen.getByText('Antes')).toBeInTheDocument()
      expect(screen.getByText('Depois')).toBeInTheDocument()
    })
  })
})

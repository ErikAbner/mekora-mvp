import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicConsistencyPage from '../pages/ComicConsistencyPage'
import type { ConsistencyManifest, ConsistencyResponse } from '../types'

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

const mockGetComicConsistency      = vi.fn()
const mockAnalyzeComicConsistency  = vi.fn()
const mockApplyComicConsistency    = vi.fn()
const mockPatchConsistencyPage     = vi.fn()
const mockGetPresetRecommendation  = vi.fn()
const mockRecommendPreset          = vi.fn()
const mockApplyPresetRecommendation = vi.fn()
const mockPreviewPreset            = vi.fn()

vi.mock('../api/client', () => ({
  getComicConsistency:       (...args: unknown[]) => mockGetComicConsistency(...args),
  analyzeComicConsistency:   (...args: unknown[]) => mockAnalyzeComicConsistency(...args),
  analyzeVisualConsistency:  vi.fn().mockRejectedValue({ response: { status: 404 } }),
  applyComicConsistency:     (...args: unknown[]) => mockApplyComicConsistency(...args),
  patchConsistencyPage:      (...args: unknown[]) => mockPatchConsistencyPage(...args),
  getPresetRecommendation:   (...args: unknown[]) => mockGetPresetRecommendation(...args),
  recommendPreset:           (...args: unknown[]) => mockRecommendPreset(...args),
  applyPresetRecommendation: (...args: unknown[]) => mockApplyPresetRecommendation(...args),
  previewPreset:             (...args: unknown[]) => mockPreviewPreset(...args),
  API_BASE: '',
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useParams: () => ({ id: '7' }),
  }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeManifest(overrides: Partial<ConsistencyManifest> = {}): ConsistencyManifest {
  return {
    job_id: 7,
    analyzed_at: '2026-03-30T12:00:00+00:00',
    consistency_score: 0.85,
    page_count: 2,
    stat_distributions: {
      contrast:   { mean: 1.2, std: 0.05, min: 1.15, max: 1.25 },
      brightness: { mean: 1.0, std: 0.02, min: 0.98, max: 1.02 },
      sharpness:  { mean: 1.3, std: 0.03, min: 1.27, max: 1.33 },
      saturation: { mean: 0.9, std: 0.01, min: 0.89, max: 0.91 },
    },
    preset_frequency: { none: 2 },
    suggested_global_style: { contrast: 1.2, brightness: 1.0, sharpness: 1.3, saturation: 0.9 },
    global_recommendations: ['Consistência visual boa — harmonização opcional.'],
    pages: [
      {
        page_number: 1,
        effective_adjustments: { contrast: 1.2, brightness: 1.0, sharpness: 1.3, saturation: 0.9 },
        is_outlier: false,
        outlier_reasons: [],
        is_manual_override: false,
        excluded_from_harmonization: false,
        harmonization_applied: false,
      },
      {
        page_number: 2,
        effective_adjustments: { contrast: 1.8, brightness: 1.0, sharpness: 1.3, saturation: 0.9 },
        is_outlier: true,
        outlier_reasons: ['contrast=1.80 fora do intervalo esperado'],
        is_manual_override: false,
        excluded_from_harmonization: false,
        harmonization_applied: false,
      },
    ],
    warnings: [],
    harmonization_applied_at: null,
    ...overrides,
  }
}

function makeResponse(overrides: Partial<ConsistencyManifest> = {}): ConsistencyResponse {
  return { manifest: makeManifest(overrides) }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ComicConsistencyPage />
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ComicConsistencyPage — Fase O', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPresetRecommendation.mockRejectedValue({ response: { status: 404 } })
  })

  it('exibe botão "Analisar consistência" quando sem manifesto (404)', async () => {
    mockGetComicConsistency.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Analisar consist/i })[0]).toBeTruthy()
    })
  })

  it('exibe opError de acabamento obrigatório quando analyze retorna 404', async () => {
    mockGetComicConsistency.mockRejectedValue({ response: { status: 404 } })
    mockAnalyzeComicConsistency.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    await waitFor(() => screen.getAllByRole('button', { name: /Analisar consist/i })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /Analisar consist/i })[0])
    await waitFor(() => {
      expect(screen.getByText(/Acabamento precisa ser concluída/i)).toBeInTheDocument()
    })
  })

  it('exibe consistency_score após análise', async () => {
    mockGetComicConsistency.mockRejectedValue({ response: { status: 404 } })
    mockAnalyzeComicConsistency.mockResolvedValue(makeResponse({ consistency_score: 0.85 }))
    renderPage()
    await waitFor(() => screen.getAllByRole('button', { name: /Analisar consist/i })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /Analisar consist/i })[0])
    await waitFor(() => {
      // 85% displayed (0.85 * 100)
      expect(screen.getByText('85%')).toBeTruthy()
    })
  })

  it('exibe badge de outlier para páginas is_outlier=true', async () => {
    mockGetComicConsistency.mockResolvedValue(makeResponse())
    renderPage()
    await waitFor(() => {
      // Página 2 é outlier
      expect(screen.getByText(/Outlier/i)).toBeTruthy()
    })
  })

  it('botão "Aplicar harmonização" chama applyComicConsistency com mode=apply', async () => {
    mockGetComicConsistency.mockResolvedValue(makeResponse())
    mockApplyComicConsistency.mockResolvedValue(
      makeResponse({ harmonization_applied_at: '2026-03-30T13:00:00+00:00' }),
    )
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /Aplicar harmoni/i }))
    fireEvent.click(screen.getByRole('button', { name: /Aplicar harmoni/i }))
    await waitFor(() => {
      expect(mockApplyComicConsistency).toHaveBeenCalledWith(7, { mode: 'apply' })
    })
  })

  it('toggle manual_override chama patchConsistencyPage', async () => {
    mockGetComicConsistency.mockResolvedValue(makeResponse())
    mockPatchConsistencyPage.mockResolvedValue(
      makeResponse({
        pages: [
          {
            page_number: 1,
            effective_adjustments: { contrast: 1.2, brightness: 1.0, sharpness: 1.3, saturation: 0.9 },
            is_outlier: false,
            outlier_reasons: [],
            is_manual_override: true,
            excluded_from_harmonization: false,
            harmonization_applied: false,
          },
          makeManifest().pages[1],
        ],
      }),
    )
    renderPage()
    // Aguarda botões "Marcar manual"
    const markBtns = await waitFor(() => screen.getAllByText(/Marcar manual/i))
    fireEvent.click(markBtns[0])
    await waitFor(() => {
      expect(mockPatchConsistencyPage).toHaveBeenCalledWith(
        7,
        1,
        expect.objectContaining({ is_manual_override: true }),
      )
    })
  })
})

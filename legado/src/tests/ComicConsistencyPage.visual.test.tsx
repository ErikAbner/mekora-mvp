import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicConsistencyPage from '../pages/ComicConsistencyPage'
import type { ConsistencyManifest, ConsistencyResponse } from '../types'

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

const mockGetComicConsistency       = vi.fn()
const mockAnalyzeComicConsistency   = vi.fn()
const mockAnalyzeVisualConsistency  = vi.fn()
const mockApplyComicConsistency     = vi.fn()
const mockPatchConsistencyPage      = vi.fn()
const mockGetPresetRecommendation   = vi.fn()
const mockRecommendPreset           = vi.fn()
const mockApplyPresetRecommendation = vi.fn()
const mockPreviewPreset             = vi.fn()

vi.mock('../api/client', () => ({
  getComicConsistency:       (...args: unknown[]) => mockGetComicConsistency(...args),
  analyzeComicConsistency:   (...args: unknown[]) => mockAnalyzeComicConsistency(...args),
  analyzeVisualConsistency:  (...args: unknown[]) => mockAnalyzeVisualConsistency(...args),
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
  return { ...actual, useParams: () => ({ id: '5' }) }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeManifest(overrides: Partial<ConsistencyManifest> = {}): ConsistencyManifest {
  return {
    job_id: 5,
    analyzed_at: '2026-03-30T12:00:00+00:00',
    consistency_score: 0.82,
    page_count: 2,
    stat_distributions: {
      contrast:   { mean: 1.2, std: 0.05, min: 1.15, max: 1.25 },
      brightness: { mean: 1.0, std: 0.02, min: 0.98, max: 1.02 },
      sharpness:  { mean: 1.3, std: 0.03, min: 1.27, max: 1.33 },
      saturation: { mean: 0.9, std: 0.01, min: 0.89, max: 0.91 },
    },
    preset_frequency: { none: 2 },
    suggested_global_style: { contrast: 1.2, brightness: 1.0, sharpness: 1.3, saturation: 0.9 },
    global_recommendations: ['Consistência boa.'],
    pages: [
      {
        page_number: 1,
        effective_adjustments: { contrast: 1.2, brightness: 1.0, sharpness: 1.3, saturation: 0.9 },
        is_outlier: false,
        outlier_reasons: [],
        is_manual_override: false,
        excluded_from_harmonization: false,
        harmonization_applied: false,
        image_metrics: null,
        is_visual_outlier: false,
        visual_outlier_reasons: [],
        preview_path: null,
      },
      {
        page_number: 2,
        effective_adjustments: { contrast: 1.2, brightness: 1.0, sharpness: 1.3, saturation: 0.9 },
        is_outlier: false,
        outlier_reasons: [],
        is_manual_override: false,
        excluded_from_harmonization: false,
        harmonization_applied: false,
        image_metrics: null,
        is_visual_outlier: false,
        visual_outlier_reasons: [],
        preview_path: null,
      },
    ],
    warnings: [],
    harmonization_applied_at: null,
    consistency_score_visual: null,
    consistency_score_combined: null,
    visual_analyzed_at: null,
    preview_generated_at: null,
    ...overrides,
  }
}

function makeResponse(overrides: Partial<ConsistencyManifest> = {}): ConsistencyResponse {
  return { manifest: makeManifest(overrides) }
}

function renderPage() {
  return render(<MemoryRouter><ComicConsistencyPage /></MemoryRouter>)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ComicConsistencyPage — Visual (Fase P.A)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPresetRecommendation.mockRejectedValue({ response: { status: 404 } })
  })

  it('botão "Analisar visualmente" chama analyzeVisualConsistency', async () => {
    mockGetComicConsistency.mockResolvedValue(makeResponse())
    mockAnalyzeVisualConsistency.mockResolvedValue(makeResponse())
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /Analisar visualmente/i }))
    fireEvent.click(screen.getByRole('button', { name: /Analisar visualmente/i }))
    await waitFor(() => {
      expect(mockAnalyzeVisualConsistency).toHaveBeenCalledWith(5)
    })
  })

  it('exibe score visual após análise visual', async () => {
    mockGetComicConsistency.mockResolvedValue(
      makeResponse({
        consistency_score_visual: 0.75,
        consistency_score_combined: 0.785,
        visual_analyzed_at: '2026-03-30T13:00:00+00:00',
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeTruthy()
      expect(screen.getByText('79%')).toBeTruthy()  // combined 0.785 → 79%
    })
  })

  it('exibe badge de outlier visual para páginas is_visual_outlier=true', async () => {
    mockGetComicConsistency.mockResolvedValue(
      makeResponse({
        pages: [
          {
            page_number: 1,
            effective_adjustments: { contrast: 1.2, brightness: 1.0, sharpness: 1.3, saturation: 0.9 },
            is_outlier: false,
            outlier_reasons: [],
            is_manual_override: false,
            excluded_from_harmonization: false,
            harmonization_applied: false,
            image_metrics: { mean_brightness: 240, rms_contrast: 5, histogram_entropy: 1, dark_fraction: 0, light_fraction: 0.95 },
            is_visual_outlier: true,
            visual_outlier_reasons: ['mean_brightness=240.00 fora do intervalo'],
            preview_path: null,
          },
          makeManifest().pages[1],
        ],
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Outlier visual/i)).toBeTruthy()
    })
  })

  it('exibe thumbnail de preview quando preview_path disponível', async () => {
    mockGetComicConsistency.mockResolvedValue(
      makeResponse({
        pages: [
          {
            ...makeManifest().pages[0],
            preview_path: '/storage/output/5/consistency_previews/page_001_preview.jpg',
          },
          makeManifest().pages[1],
        ],
      }),
    )
    renderPage()
    await waitFor(() => {
      const img = screen.getByAltText(/Preview p\.1/i)
      expect(img).toBeTruthy()
      expect((img as HTMLImageElement).src).toContain('page_001_preview.jpg')
    })
  })

  it('score combinado exibido quando consistency_score_combined disponível', async () => {
    mockGetComicConsistency.mockResolvedValue(
      makeResponse({
        consistency_score: 0.8,
        consistency_score_visual: 0.6,
        consistency_score_combined: 0.7,
      }),
    )
    renderPage()
    await waitFor(() => {
      // 70% from combined score
      expect(screen.getByText('70%')).toBeTruthy()
    })
  })
})

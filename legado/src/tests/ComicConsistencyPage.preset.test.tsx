import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicConsistencyPage from '../pages/ComicConsistencyPage'
import type { ConsistencyManifest, ConsistencyResponse, PresetRecommendation, PresetRecommendationResponse } from '../types'

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

const mockGetComicConsistency      = vi.fn()
const mockAnalyzeComicConsistency  = vi.fn()
const mockAnalyzeVisualConsistency = vi.fn()
const mockApplyComicConsistency    = vi.fn()
const mockPatchConsistencyPage     = vi.fn()
const mockGetPresetRecommendation  = vi.fn()
const mockRecommendPreset          = vi.fn()
const mockApplyPresetRecommendation = vi.fn()
const mockPreviewPreset            = vi.fn()

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
  return { ...actual, useParams: () => ({ id: '9' }) }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeManifest(overrides: Partial<ConsistencyManifest> = {}): ConsistencyManifest {
  return {
    job_id: 9,
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
        is_outlier: false, outlier_reasons: [],
        is_manual_override: false, excluded_from_harmonization: false, harmonization_applied: false,
        image_metrics: null, is_visual_outlier: false, visual_outlier_reasons: [], preview_path: null,
      },
      {
        page_number: 2,
        effective_adjustments: { contrast: 1.2, brightness: 1.0, sharpness: 1.3, saturation: 0.9 },
        is_outlier: false, outlier_reasons: [],
        is_manual_override: false, excluded_from_harmonization: false, harmonization_applied: false,
        image_metrics: null, is_visual_outlier: false, visual_outlier_reasons: [], preview_path: null,
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

function makeRec(overrides: Partial<PresetRecommendation> = {}): PresetRecommendation {
  return {
    job_id: 9,
    recommended_preset: 'clean_manga_bw',
    alternatives: ['manga_bw_high_contrast', 'subtitle_minimal'],
    reasons: ['saturação média=0.05 < 0.15 (provável manga PB)'],
    confidence_score: 0.85,
    page_level_exceptions: [],
    applied_preset: null,
    manual_overrides_present: false,
    recommended_at: '2026-03-30T12:00:00+00:00',
    applied_at: null,
    preview_entries: [],
    ...overrides,
  }
}

function makeRecResponse(overrides: Partial<PresetRecommendation> = {}): PresetRecommendationResponse {
  return { recommendation: makeRec(overrides) }
}

function renderPage() {
  return render(<MemoryRouter><ComicConsistencyPage /></MemoryRouter>)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ComicConsistencyPage — Preset Recomendado (Fase P.B)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetComicConsistency.mockResolvedValue(makeResponse())
    mockGetPresetRecommendation.mockRejectedValue({ response: { status: 404 } })
  })

  it('botão "Recomendar preset" chama recommendPreset com jobId correto', async () => {
    mockRecommendPreset.mockResolvedValue(makeRecResponse())
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /Recomendar preset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Recomendar preset/i }))
    await waitFor(() => {
      expect(mockRecommendPreset).toHaveBeenCalledWith(9)
    })
  })

  it('exibe preset recomendado, score e lista de razões após recomendação', async () => {
    mockGetPresetRecommendation.mockResolvedValue(makeRecResponse())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('clean_manga_bw')).toBeTruthy()
      expect(screen.getByText('85%')).toBeTruthy()
      expect(screen.getByText(/saturação média/i)).toBeTruthy()
    })
  })

  it('botão "Aplicar preset" chama applyPresetRecommendation com mode=apply_to_all_eligible', async () => {
    mockGetPresetRecommendation.mockResolvedValue(makeRecResponse())
    mockApplyPresetRecommendation.mockResolvedValue(makeRecResponse({ applied_preset: 'clean_manga_bw' }))
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /Aplicar preset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Aplicar preset/i }))
    await waitFor(() => {
      expect(mockApplyPresetRecommendation).toHaveBeenCalledWith(9, {
        preset: 'clean_manga_bw',
        mode: 'apply_to_all_eligible',
      })
    })
  })

  it('exibe banner "Preset aplicado" quando applied_preset != null', async () => {
    mockGetPresetRecommendation.mockResolvedValue(
      makeRecResponse({ applied_preset: 'clean_manga_bw', applied_at: '2026-03-30T13:00:00+00:00' }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Preset aplicado: clean_manga_bw/i)).toBeTruthy()
    })
  })

  it('botão "Resetar preset" chama applyPresetRecommendation com mode=reset_to_previous', async () => {
    mockGetPresetRecommendation.mockResolvedValue(
      makeRecResponse({ applied_preset: 'clean_manga_bw' }),
    )
    mockApplyPresetRecommendation.mockResolvedValue(makeRecResponse({ applied_preset: null }))
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /Resetar preset/i }))
    fireEvent.click(screen.getByRole('button', { name: /Resetar preset/i }))
    await waitFor(() => {
      expect(mockApplyPresetRecommendation).toHaveBeenCalledWith(9, {
        preset: 'none',
        mode: 'reset_to_previous',
      })
    })
  })
})

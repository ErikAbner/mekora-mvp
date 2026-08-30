import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicFinishPage from '../pages/ComicFinishPage'
import type { FinishManifest, FinishResponse, LayoutIssue } from '../types'

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

const mockGetComicFinish      = vi.fn()
const mockInitComicFinish     = vi.fn()
const mockPatchComicFinish    = vi.fn()
const mockExportComicFinish   = vi.fn()
const mockAnalyzeComicLayout  = vi.fn()

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

const OVERFLOW_ISSUE: LayoutIssue = {
  issue_type: 'overflow',
  block_id: 'b1',
  severity: 'warning',
  detail: '~5 linhas estimadas (80px) vs box_height=60px.',
}

function makeManifest(overrides: Partial<FinishManifest> = {}): FinishManifest {
  return {
    job_id: 42,
    global_preset: 'none',
    global_adjustments: { contrast: 1.0, brightness: 1.0, sharpness: 1.0, saturation: 1.0 },
    auto_fix_layout: false,
    pages: [
      {
        page_number: 1,
        source_variant: 'render_overlay',
        preset_override: null,
        adjustments_override: null,
        source_path: '/storage/output/42/rendered_pages/page_001.png',
        finished_path: null,
        exported_at: null,
        warnings: [],
        layout_issues: [],
        suggested_adjustments: null,
        auto_adjustments_applied: false,
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

describe('ComicFinishPage — Layout (Fase N.B)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('botão "Analisar layout" chama analyzeComicLayout', async () => {
    mockGetComicFinish.mockResolvedValue(makeResponse())
    mockAnalyzeComicLayout.mockResolvedValue(makeResponse())
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /Analisar layout/i }))
    fireEvent.click(screen.getByRole('button', { name: /Analisar layout/i }))
    await waitFor(() => {
      expect(mockAnalyzeComicLayout).toHaveBeenCalledWith(42)
    })
  })

  it('exibe badge de issues quando página tem layout_issues', async () => {
    mockGetComicFinish.mockResolvedValue(
      makeResponse({
        pages: [{
          page_number: 1,
          source_variant: 'render_overlay',
          preset_override: null,
          adjustments_override: null,
          source_path: '/storage/output/42/rendered_pages/page_001.png',
          finished_path: null,
          exported_at: null,
          warnings: [],
          layout_issues: [OVERFLOW_ISSUE],
          suggested_adjustments: { font_scale: 0.75, detail: 'reduzir fonte', has_overflow: true, has_low_contrast: false },
          auto_adjustments_applied: false,
        }],
      }),
    )
    renderPage()
    await waitFor(() => {
      // Badge with issue count "⚠ 1"
      expect(screen.getByText(/⚠\s*1/)).toBeTruthy()
    })
  })

  it('toggle auto_fix chama patchComicFinish com auto_fix_layout=true', async () => {
    mockGetComicFinish.mockResolvedValue(makeResponse({ auto_fix_layout: false }))
    mockPatchComicFinish.mockResolvedValue(makeResponse({ auto_fix_layout: true }))
    renderPage()
    const checkbox = await waitFor(() => screen.getByRole('checkbox'))
    fireEvent.click(checkbox)
    await waitFor(() => {
      expect(mockPatchComicFinish).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ auto_fix_layout: true }),
      )
    })
  })

  it('badge "Auto-corrigido" aparece quando auto_adjustments_applied=true', async () => {
    mockGetComicFinish.mockResolvedValue(
      makeResponse({
        pages: [{
          page_number: 1,
          source_variant: 'render_overlay',
          preset_override: null,
          adjustments_override: null,
          source_path: '/storage/output/42/rendered_pages/page_001.png',
          finished_path: '/storage/output/42/finished_pages/page_001.png',
          exported_at: '2026-03-28T12:00:00+00:00',
          warnings: [],
          layout_issues: [OVERFLOW_ISSUE],
          suggested_adjustments: null,
          auto_adjustments_applied: true,
        }],
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Auto-corrigido/i)).toBeTruthy()
    })
  })

  it('sem issues → nenhum badge de issue exibido', async () => {
    mockGetComicFinish.mockResolvedValue(makeResponse())
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /Analisar layout/i }))
    // Não deve exibir badge de issues
    const badge = screen.queryByText(/⚠\s*\d+/)
    expect(badge).toBeNull()
  })
})

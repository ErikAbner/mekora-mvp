import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { RecommendedModePanel } from '../components/RecommendedModePanel'
import type { JobResponse } from '../types'

const mockGetQuickPreflight = vi.fn()
const mockStartQuickPipeline = vi.fn()
const mockGetJobStatus = vi.fn()
const mockUpdateMetadata = vi.fn()
const mockCancelOperation = vi.fn()

vi.mock('../api/client', () => ({
  getQuickPreflight: (...a: unknown[]) => mockGetQuickPreflight(...a),
  startQuickPipeline: (...a: unknown[]) => mockStartQuickPipeline(...a),
  getJobStatus: (...a: unknown[]) => mockGetJobStatus(...a),
  updateMetadata: (...a: unknown[]) => mockUpdateMetadata(...a),
  cancelOperation: (...a: unknown[]) => mockCancelOperation(...a),
  API_BASE: '',
}))

function makeJob(overrides: Partial<JobResponse> = {}): JobResponse {
  return {
    upload_id: 42,
    original_filename: 'manga.cbz',
    status: 'analyzed',
    page_count: null,
    is_scanned: null,
    avg_chars_per_page: null,
    detected_title: '',
    detected_author: '',
    detected_language: '',
    final_title: 'Meu Mangá',
    final_author: '',
    final_language: 'por',
    final_filename: '',
    ocr_used: false,
    ocr_status: 'not_needed',
    processed_pdf_path: null,
    epub_path: null,
    conversion_status: 'not_started',
    send_status: 'not_started',
    send_error: null,
    selected_cover_page: null,
    cover_path: null,
    thumbnails: [],
    error_message: null,
    input_format: 'cbz',
    processing_mode: 'comic',
    comic_mode: true,
    manga_rtl: false,
    translation_enabled: false,
    source_language: 'eng',
    target_language: 'por',
    translation_status: 'not_started',
    translation_error: null,
    translator_engine: 'argos',
    translated_artifact_path: null,
    translated_artifact_format: '',
    comic_translation_enabled: true,
    comic_translation_status: 'not_started',
    comic_translation_error: null,
    comic_translation_artifact_path: null,
    comic_translation_artifact_format: '',
    flow_mode: 'recommended',
    active_operation: null,
    created_at: '2026-07-01T00:00:00',
    updated_at: '2026-07-01T00:00:00',
    ...overrides,
  }
}

function makePreflight(ok = true) {
  return {
    job_id: 42,
    ok,
    checks: ok ? [] : [{ id: 'engine', ok: false, detail: 'Engine indisponível', critical: true }],
    plan: {
      translation_enabled: true,
      source_language: 'eng',
      target_language: 'por',
      engine: 'argos',
      steps_to_run: ['translation', 'review', 'overlay', 'render', 'finalize'],
      steps_reused: [],
      steps_skipped_by_design: ['inpaint', 'finish', 'consistency'],
      auto_approve_review: true,
      final_artifact: 'final_pages/',
      page_count: 12,
    },
  }
}

function renderPanel(job = makeJob(), onRefresh = vi.fn()) {
  return render(
    <MemoryRouter>
      <RecommendedModePanel job={job} onJobRefresh={onRefresh} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetQuickPreflight.mockResolvedValue(makePreflight())
})

describe('RecommendedModePanel — P3', () => {
  it('exibe resumo do preflight e exige confirmação explícita', async () => {
    renderPanel()
    expect(await screen.findByText(/12 página\(s\)/)).toBeInTheDocument()
    expect(screen.getByText(/aprovada automaticamente/i)).toBeInTheDocument()
    expect(screen.getByText(/Nada será exportado sem a sua confirmação/i)).toBeInTheDocument()
    // Nada roda sem clique
    expect(mockStartQuickPipeline).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Confirmar e executar pipeline/i })).toBeEnabled()
  })

  it('preflight com falha crítica desabilita a execução e mostra o motivo', async () => {
    mockGetQuickPreflight.mockResolvedValue(makePreflight(false))
    renderPanel()
    expect(await screen.findByText(/Engine indisponível/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar e executar pipeline/i })).toBeDisabled()
  })

  it('confirmação dispara o pipeline', async () => {
    mockStartQuickPipeline.mockResolvedValue({ job_id: 42, operation_id: 'abc', started: true })
    mockGetJobStatus.mockResolvedValue({
      upload_id: 42, status: 'analyzed', ocr_status: 'not_needed',
      conversion_status: 'not_started', send_status: 'not_started',
      translation_status: 'not_started', comic_translation_status: 'in_progress',
      error_message: null, send_error: null,
      active_operation: 'quick_pipeline:abc',
      progress: {
        operation_id: 'abc', operation_type: 'quick_pipeline', stage: 'quick_pipeline',
        current: 1, total: 5, percent: 20, message: 'Etapa 1/5', status: 'running',
        started_at: '', updated_at: '',
      },
    })
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar e executar pipeline/i }))
    await waitFor(() => expect(mockStartQuickPipeline).toHaveBeenCalledWith(42))
  })

  it('modo avançado mostra dica e preserva trabalho (sem preflight)', async () => {
    renderPanel(makeJob({ flow_mode: 'advanced' }))
    expect(await screen.findByText(/nunca apaga seu trabalho/i)).toBeInTheDocument()
    expect(mockGetQuickPreflight).not.toHaveBeenCalled()
  })

  it('sem tradução habilitada indica o caminho KCC', async () => {
    renderPanel(makeJob({ comic_translation_enabled: false }))
    expect(await screen.findByText(/conversão rápida via KCC/i)).toBeInTheDocument()
  })

  it('alternar modo chama updateMetadata com flow_mode', async () => {
    mockUpdateMetadata.mockResolvedValue(makeJob({ flow_mode: 'advanced' }))
    renderPanel()
    fireEvent.click(await screen.findByRole('button', { name: /^Avançado$/i }))
    await waitFor(() =>
      expect(mockUpdateMetadata).toHaveBeenCalledWith(42, { flow_mode: 'advanced' }),
    )
  })
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import BatchPage from '../pages/BatchPage'
import type { BatchResult, BatchJobsResponse, PresetListResponse } from '../types'

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

const mockGetBatchJobs          = vi.fn()
const mockGetPresets            = vi.fn()
const mockBatchApplyPreset      = vi.fn()
const mockBatchExport           = vi.fn()
const mockBatchApplySuggestions = vi.fn()
const mockBatchRetrySend        = vi.fn()

vi.mock('../api/client', () => ({
  getBatchJobs:          (...args: unknown[]) => mockGetBatchJobs(...args),
  getPresets:            (...args: unknown[]) => mockGetPresets(...args),
  batchApplyPreset:      (...args: unknown[]) => mockBatchApplyPreset(...args),
  batchExport:           (...args: unknown[]) => mockBatchExport(...args),
  batchApplySuggestions: (...args: unknown[]) => mockBatchApplySuggestions(...args),
  batchRetrySend:        (...args: unknown[]) => mockBatchRetrySend(...args),
  API_BASE: '',
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeJob(overrides: Partial<BatchJobsResponse['jobs'][0]> = {}, index = 0): BatchJobsResponse['jobs'][0] {
  return {
    upload_id: index + 1,
    original_filename: `file_${index + 1}.pdf`,
    final_title: `Title ${index + 1}`,
    final_author: '',
    final_language: 'por',
    status: 'analyzed',
    is_scanned: false,
    ocr_used: false,
    conversion_status: 'not_started',
    send_status: 'not_sent',
    send_error: null,
    kindle_sent: false,
    error_message: null,
    input_format: 'pdf',
    processing_mode: 'document',
    translation_enabled: false,
    translation_status: 'not_started',
    comic_translation_enabled: false,
    comic_translation_status: 'not_started',
    comic_mode: false,
    manga_rtl: false,
    created_at: '2026-03-28T10:00:00+00:00',
    ...overrides,
  }
}

function makeJobsResponse(count = 2): BatchJobsResponse {
  return {
    total: count,
    jobs: Array.from({ length: count }, (_, i) => makeJob({}, i)),
  }
}

function makeComicJobsResponse(): BatchJobsResponse {
  return {
    total: 1,
    jobs: [makeJob({ processing_mode: 'comic', input_format: 'cbz', original_filename: 'comic_1.cbz' }, 0)],
  }
}

function makePresetsResponse(): PresetListResponse {
  return {
    presets: [
      {
        id: 'system-doc-pt-en-argos',
        name: 'PT → EN (Argos)',
        description: '',
        is_system: true,
        created_at: null,
        updated_at: null,
        processing_mode: 'document',
        comic_mode: false,
        manga_rtl: false,
        translation_enabled: true,
        source_language: 'por',
        target_language: 'eng',
        translator_engine: 'argos',
        nllb_model_name: '',
        nllb_device_preference: 'auto',
      },
    ],
  }
}

function makeBatchResult(overrides: Partial<BatchResult> = {}): BatchResult {
  return {
    total: 1,
    succeeded: 1,
    failed: 0,
    skipped: 0,
    item_results: [{ job_id: 1, status: 'success', message: 'ok' }],
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BatchPage />
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockGetBatchJobs.mockResolvedValue(makeJobsResponse())
  mockGetPresets.mockResolvedValue(makePresetsResponse())
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BatchPage', () => {
  it('renders title and subtitle', async () => {
    renderPage()
    // i18n resolves to PT: batch.title = "Conversão em Lote"
    expect(await screen.findByText('Conversão em Lote')).toBeInTheDocument()
  })

  it('displays loaded jobs in the table', async () => {
    renderPage()
    expect(await screen.findByText('file_1.pdf')).toBeInTheDocument()
    expect(screen.getByText('file_2.pdf')).toBeInTheDocument()
    expect(mockGetBatchJobs).toHaveBeenCalledOnce()
  })

  it('toggles job selection with checkbox', async () => {
    renderPage()
    const checkbox = await screen.findByLabelText('file_1.pdf')
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('selectAll selects all visible jobs; selectNone clears', async () => {
    renderPage()
    await screen.findByText('file_1.pdf')

    // "Selecionar todos" = t('batch.selectAll')
    fireEvent.click(screen.getByText('Selecionar todos'))
    // Only check job checkboxes (have aria-label = filename, not filter checkboxes)
    const jobBoxes = [
      screen.getByLabelText('file_1.pdf'),
      screen.getByLabelText('file_2.pdf'),
    ]
    jobBoxes.forEach((cb) => expect(cb).toBeChecked())

    // "Limpar seleção" = t('batch.selectNone')
    fireEvent.click(screen.getByText('Limpar seleção'))
    jobBoxes.forEach((cb) => expect(cb).not.toBeChecked())
  })

  it('botões de export e apply-suggestions ficam desabilitados quando apenas doc jobs selecionados', async () => {
    // makeJobsResponse creates document jobs — export/apply-suggestions require comic jobs
    renderPage()
    await screen.findByText('file_1.pdf')
    fireEvent.click(screen.getByLabelText('file_1.pdf'))

    const exportBtn = screen.getByRole('button', { name: /Exportar/i })
    expect(exportBtn).toBeDisabled()
    expect(exportBtn.title).toMatch(/quadrinho/i)

    const suggestionsBtn = screen.getByRole('button', { name: /Aplicar sugestões/i })
    expect(suggestionsBtn).toBeDisabled()
  })

  it('executes batchApplyPreset and shows result', async () => {
    mockBatchApplyPreset.mockResolvedValue(makeBatchResult())
    renderPage()
    await screen.findByText('file_1.pdf')

    // Select job 1
    fireEvent.click(screen.getByLabelText('file_1.pdf'))

    // Click "Aplicar preset" button to open inline preset picker
    fireEvent.click(screen.getByRole('button', { name: /Aplicar preset/i }))

    // Choose preset from the inline picker
    await waitFor(() => expect(screen.getByLabelText('Escolha um preset...')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Escolha um preset...'), {
      target: { value: 'system-doc-pt-en-argos' },
    })

    // Click "Confirmar" = t('batch.confirm')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(mockBatchApplyPreset).toHaveBeenCalledWith([1], 'system-doc-pt-en-argos'),
    )
    // "Resultado" = t('batch.resultsTitle')
    expect(await screen.findByText('Resultado')).toBeInTheDocument()
    // "1 com sucesso" = t('batch.succeeded', {n:1})
    expect(screen.getByText('1 com sucesso')).toBeInTheDocument()
  })

  it('executes batchExport and shows result', async () => {
    mockBatchExport.mockResolvedValue(makeBatchResult())
    mockGetBatchJobs.mockResolvedValue(makeComicJobsResponse())
    renderPage()
    await screen.findByText('comic_1.cbz')

    // Select the comic job and click the export button directly
    fireEvent.click(screen.getByLabelText('comic_1.cbz'))
    fireEvent.click(screen.getByRole('button', { name: /Exportar/i }))

    await waitFor(() => expect(mockBatchExport).toHaveBeenCalledWith([1]))
    expect(await screen.findByText('Resultado')).toBeInTheDocument()
  })

  it('botão "Aplicar preset" abre picker inline; cancel fecha o picker', async () => {
    renderPage()
    await screen.findByText('file_1.pdf')
    fireEvent.click(screen.getByLabelText('file_1.pdf'))

    // Picker not visible yet
    expect(screen.queryByLabelText('Escolha um preset...')).toBeNull()

    // Click preset button → picker appears
    fireEvent.click(screen.getByRole('button', { name: /Aplicar preset/i }))
    await waitFor(() => expect(screen.getByLabelText('Escolha um preset...')).toBeInTheDocument())

    // Click cancel → picker disappears
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByLabelText('Escolha um preset...')).toBeNull())
  })

  it('calls getBatchJobs with status param when status filter changes', async () => {
    renderPage()
    await screen.findByText('file_1.pdf')

    // aria-label="Status" = t('batch.filterStatus')
    const statusSelect = screen.getByLabelText('Status')
    fireEvent.change(statusSelect, { target: { value: 'done' } })

    await waitFor(() =>
      expect(mockGetBatchJobs).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'done' }),
      ),
    )
  })
})

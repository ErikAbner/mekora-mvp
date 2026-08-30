import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AnalysisPage from '../pages/AnalysisPage'
import type { JobResponse, JobStatusResponse } from '../types'

// ---------------------------------------------------------------------------
// Mocks da API
// ---------------------------------------------------------------------------

const mockTranslateJob = vi.fn()
const mockUpdateMetadata = vi.fn()
const mockGetJob = vi.fn()
const mockGetJobStatus = vi.fn()
const mockAnalyzeUpload = vi.fn()

vi.mock('../api/client', () => ({
  analyzeUpload: (...args: unknown[]) => mockAnalyzeUpload(...args),
  getJob: (...args: unknown[]) => mockGetJob(...args),
  getJobStatus: (...args: unknown[]) => mockGetJobStatus(...args),
  translateJob: (...args: unknown[]) => mockTranslateJob(...args),
  updateMetadata: (...args: unknown[]) => mockUpdateMetadata(...args),
  updateCover: vi.fn(),
  convertJob: vi.fn(),
  comicConvertJob: vi.fn(),
  comicTranslateJob: vi.fn(),
  sendToKindle: vi.fn(),
  getComicToolsStatus: vi.fn().mockResolvedValue({ kcc: { available: true, path: "/venv/bin/kcc-c2e" }, argos: { library_installed: true, pairs: [{ src: 'por', tgt: 'eng' }] } }),
  API_BASE: '',
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
  }
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeJob(overrides: Partial<JobResponse> = {}): JobResponse {
  return {
    upload_id: 1,
    original_filename: 'livro.pdf',
    status: 'analyzed',
    page_count: 10,
    is_scanned: false,
    avg_chars_per_page: 500,
    detected_title: 'Livro',
    detected_author: 'Autor',
    detected_language: 'por',
    final_title: 'Livro',
    final_author: 'Autor',
    final_language: 'por',
    final_filename: 'livro',
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
    input_format: 'pdf',
    processing_mode: 'document',
    comic_mode: false,
    manga_rtl: false,
    translation_enabled: false,
    source_language: 'por',
    target_language: 'eng',
    translation_status: 'not_started',
    translation_error: null,
    translator_engine: '',
    translated_artifact_path: null,
    translated_artifact_format: '',
    comic_translation_enabled: false,
    comic_translation_status: 'not_started',
    comic_translation_error: null,
    comic_translation_artifact_path: null,
    comic_translation_artifact_format: '',
    created_at: '2024-01-01T00:00:00',
    updated_at: '2024-01-01T00:00:00',
    ...overrides,
  }
}

function makeStatus(overrides: Partial<JobStatusResponse> = {}): JobStatusResponse {
  return {
    upload_id: 1,
    status: 'analyzed',
    ocr_status: 'not_needed',
    conversion_status: 'not_started',
    send_status: 'not_started',
    translation_status: 'not_started',
    comic_translation_status: 'not_started',
    error_message: null,
    send_error: null,
    ...overrides,
  }
}

function renderAnalysisPage() {
  return render(
    <MemoryRouter initialEntries={['/analyze/1']}>
      <Routes>
        <Route path="/analyze/:id" element={<AnalysisPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('AnalysisPage — seção de tradução', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateMetadata.mockResolvedValue(makeJob())
    mockGetJob.mockResolvedValue(makeJob())
    mockGetJobStatus.mockResolvedValue(makeStatus())
  })

  it('exibe seção de tradução para documentos', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ processing_mode: 'document' }))
    renderAnalysisPage()
    await waitFor(() => {
      expect(screen.getByText(/Tradução/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/Traduzir documento/i)).toBeInTheDocument()
  })

  it('exibe UI experimental de quadrinhos em vez de controles de tradução de documento', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    renderAnalysisPage()
    await waitFor(() => {
      expect(screen.getByText(/Funcionalidade experimental/i)).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/Traduzir documento/i)).not.toBeInTheDocument()
  })

  it('mostra seletores de idioma ao habilitar tradução', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ translation_enabled: false }))
    mockUpdateMetadata.mockResolvedValue(makeJob({ translation_enabled: true }))
    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/Traduzir documento/i)).toBeInTheDocument()
    })

    // Ativar o toggle
    const toggle = screen.getByLabelText(/Traduzir documento/i)
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(mockUpdateMetadata).toHaveBeenCalledWith(1, { translation_enabled: true })
    })
  })

  it('botão Traduzir chama translateJob com o ID correto', async () => {
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({ translation_enabled: true, source_language: 'por', target_language: 'eng' }),
    )
    mockTranslateJob.mockResolvedValue(
      makeJob({ translation_status: 'in_progress', translation_enabled: true }),
    )
    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Traduzir/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Traduzir/i }))

    await waitFor(() => {
      expect(mockTranslateJob).toHaveBeenCalledWith(1)
    })
  })

  it('exibe mensagem de tradução concluída', async () => {
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({ translation_enabled: true, translation_status: 'done' }),
    )
    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/Tradução concluída com sucesso/i)).toBeInTheDocument()
    })
  })

  it('exibe erro de tradução quando status é failed (erro genérico)', async () => {
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({
        translation_enabled: true,
        translation_status: 'failed',
        translation_error: 'Internal server error',
      }),
    )
    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/Falha na tradução/i)).toBeInTheDocument()
      expect(screen.getByText(/Erro inesperado na tradução/i)).toBeInTheDocument()
    })
  })

  it('exibe mensagem humanizada quando translation_error indica par de idiomas', async () => {
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({
        translation_enabled: true,
        translation_status: 'failed',
        translation_error: 'Language pair not available',
      }),
    )
    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/Par de idiomas não instalado/i)).toBeInTheDocument()
    })
  })

  it('botão Traduzir fica desabilitado quando translation_status=in_progress', async () => {
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({ translation_enabled: true, translation_status: 'in_progress' }),
    )
    renderAnalysisPage()

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Traduzindo/i })
      expect(btn).toBeDisabled()
    })
  })

  it('exibe spinner animado quando translation_status=in_progress', async () => {
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({ translation_enabled: true, translation_status: 'in_progress' }),
    )
    renderAnalysisPage()
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  it('exibe mensagem de timeout após 20 minutos de polling em in_progress', async () => {
    vi.useFakeTimers()
    const startTime = Date.now()
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({ translation_enabled: true, translation_status: 'in_progress' }),
    )
    mockGetJobStatus.mockResolvedValue(makeStatus({ translation_status: 'in_progress' }))
    renderAnalysisPage()

    // Aguardar renderização inicial com act
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    expect(screen.getByRole('button', { name: /Traduzindo/i })).toBeDisabled()

    // Saltar o relógio para 21 minutos no futuro e disparar um tick do intervalo
    await act(async () => {
      vi.setSystemTime(startTime + 21 * 60 * 1000)
      await vi.advanceTimersByTimeAsync(3100)
    })

    // P4: timeout honesto — não declara falha falsa; informa que o backend
    // continua processando e oferece reconexão
    expect(screen.getByText(/processamento continua no backend/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuar acompanhando/i })).toBeInTheDocument()
    vi.useRealTimers()
  }, 15000)
})

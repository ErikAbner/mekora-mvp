import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AnalysisPage from '../pages/AnalysisPage'
import type { JobResponse, JobStatusResponse } from '../types'

// ---------------------------------------------------------------------------
// Mocks da API
// ---------------------------------------------------------------------------

const mockAnalyzeUpload = vi.fn()
const mockGetJob = vi.fn()
const mockGetJobStatus = vi.fn()
const mockComicTranslateJob = vi.fn()
const mockUpdateMetadata = vi.fn()

vi.mock('../api/client', () => ({
  analyzeUpload: (...args: unknown[]) => mockAnalyzeUpload(...args),
  getJob: (...args: unknown[]) => mockGetJob(...args),
  getJobStatus: (...args: unknown[]) => mockGetJobStatus(...args),
  comicTranslateJob: (...args: unknown[]) => mockComicTranslateJob(...args),
  updateMetadata: (...args: unknown[]) => mockUpdateMetadata(...args),
  translateJob: vi.fn(),
  updateCover: vi.fn(),
  convertJob: vi.fn(),
  comicConvertJob: vi.fn(),
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
    original_filename: 'manga.cbz',
    status: 'analyzed',
    page_count: 5,
    is_scanned: false,
    avg_chars_per_page: 0,
    detected_title: 'Manga',
    detected_author: 'Autor',
    detected_language: 'por',
    final_title: 'Manga',
    final_author: 'Autor',
    final_language: 'por',
    final_filename: 'manga',
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

function renderPage() {
  return render(<MemoryRouter><AnalysisPage /></MemoryRouter>)
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('AnalysisPage — tradução experimental de quadrinhos (Fase D)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetJobStatus.mockResolvedValue(makeStatus())
    mockUpdateMetadata.mockResolvedValue(makeJob())
  })

  it('exibe banner experimental quando isComic=true', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob())
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Funcionalidade experimental/i)).toBeInTheDocument()
    })
  })

  it('exibe botão "Traduzir quadrinhos" quando isComic=true', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob())
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Traduzir quadrinhos/i })).toBeInTheDocument()
    })
  })

  it('não exibe botão "Traduzir quadrinhos" quando isComic=false', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ processing_mode: 'document' }))
    renderPage()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Traduzir quadrinhos/i })).toBeNull()
    })
  })

  it('clicar no botão chama comicTranslateJob com os parâmetros corretos', async () => {
    const job = makeJob()
    mockAnalyzeUpload.mockResolvedValue(job)
    mockComicTranslateJob.mockResolvedValue({ ...job, comic_translation_status: 'in_progress' })
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Traduzir quadrinhos/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Traduzir quadrinhos/i }))
    await waitFor(() => {
      expect(mockComicTranslateJob).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ source_language: 'por', target_language: 'eng' }),
      )
    })
  })

  it('exibe spinner animado quando comic_translation_status=in_progress', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ comic_translation_status: 'in_progress' }))
    renderPage()
    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  it('botão fica desabilitado quando comic_translation_status=in_progress', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ comic_translation_status: 'in_progress' }))
    renderPage()
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Traduzindo/i })
      expect(btn).toBeDisabled()
    })
  })

  it('exibe links de download quando comic_translation_status=done', async () => {
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({
        comic_translation_status: 'done',
        comic_translation_artifact_path: '/storage/output/1/comic_translation.json',
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Baixar sidecar JSON/i)).toBeInTheDocument()
      expect(screen.getByText(/Baixar sidecar HTML/i)).toBeInTheDocument()
    })
  })

  it('exibe banner de erro quando comic_translation_status=failed', async () => {
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({
        comic_translation_status: 'failed',
        comic_translation_error: 'pytesseract não está instalado',
      }),
    )
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/pytesseract não está instalado/i)).toBeInTheDocument()
    })
  })

  it('exibe comicTranslateFailed após erro de rede no botão', async () => {
    const job = makeJob()
    mockAnalyzeUpload.mockResolvedValue(job)
    mockComicTranslateJob.mockRejectedValue(new Error('Network error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Traduzir quadrinhos/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Traduzir quadrinhos/i }))
    await waitFor(() => {
      expect(screen.getByText(/Falha na tradução de quadrinhos/i)).toBeInTheDocument()
    })
  })
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ComicExportPage from '../pages/ComicExportPage'
import type {
  ComicExportManifest,
  ComicExportResponse,
  JobResponse,
  PipelineStateResponse,
} from '../types'

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

const mockGetJob = vi.fn()
const mockGetJobStatus = vi.fn()
const mockGetPipelineState = vi.fn()
const mockGetComicExport = vi.fn()
const mockStartComicExport = vi.fn()
const mockSendToKindle = vi.fn()
const mockUpdateMetadata = vi.fn()
const mockComicConvertJob = vi.fn()

vi.mock('../api/client', () => ({
  getJob: (...a: unknown[]) => mockGetJob(...a),
  getJobStatus: (...a: unknown[]) => mockGetJobStatus(...a),
  getPipelineState: (...a: unknown[]) => mockGetPipelineState(...a),
  getComicExport: (...a: unknown[]) => mockGetComicExport(...a),
  startComicExport: (...a: unknown[]) => mockStartComicExport(...a),
  sendToKindle: (...a: unknown[]) => mockSendToKindle(...a),
  updateMetadata: (...a: unknown[]) => mockUpdateMetadata(...a),
  comicConvertJob: (...a: unknown[]) => mockComicConvertJob(...a),
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

function makeJob(overrides: Partial<JobResponse> = {}): JobResponse {
  return {
    upload_id: 42,
    original_filename: 'manga.cbz',
    status: 'analyzed',
    page_count: 2,
    is_scanned: null,
    avg_chars_per_page: null,
    detected_title: '',
    detected_author: '',
    detected_language: '',
    final_title: 'Meu Mangá',
    final_author: 'Autora',
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
    source_language: '',
    target_language: '',
    translation_status: 'not_started',
    translation_error: null,
    translator_engine: '',
    translated_artifact_path: null,
    translated_artifact_format: '',
    comic_translation_enabled: true,
    comic_translation_status: 'done',
    comic_translation_error: null,
    comic_translation_artifact_path: null,
    comic_translation_artifact_format: 'json',
    comic_export_status: 'not_started',
    comic_export_path: null,
    comic_export_source: '',
    comic_export_error: null,
    flow_mode: 'advanced',
    active_operation: null,
    created_at: '2026-07-01T00:00:00',
    updated_at: '2026-07-01T00:00:00',
    ...overrides,
  }
}

function makePipeline(exportStatus: 'done' | 'available' | 'blocked'): PipelineStateResponse {
  return {
    job_id: 42,
    processing_mode: 'comic',
    render_done: true,
    current_step: 'export',
    steps: [
      { id: 'analysis', status: 'done', blocked_reason: null, prerequisite_step: null },
      { id: 'translation', status: 'done', blocked_reason: null, prerequisite_step: null },
      { id: 'review', status: 'done', blocked_reason: null, prerequisite_step: null },
      { id: 'overlay', status: 'done', blocked_reason: null, prerequisite_step: null },
      { id: 'finalize', status: exportStatus === 'blocked' ? 'available' : 'done', blocked_reason: null, prerequisite_step: null },
      { id: 'finish', status: 'available', blocked_reason: null, prerequisite_step: null },
      { id: 'consistency', status: 'blocked', blocked_reason: 'x', prerequisite_step: 'finish' },
      {
        id: 'export',
        status: exportStatus,
        blocked_reason: exportStatus === 'blocked' ? 'O export final exige a curadoria final exportada.' : null,
        prerequisite_step: exportStatus === 'blocked' ? 'finalize' : null,
      },
    ],
  }
}

function makeManifest(overrides: Partial<ComicExportManifest> = {}): ComicExportManifest {
  return {
    manifest_version: 1,
    job_id: 42,
    source: 'final_pages',
    source_dir: '/x/final_pages',
    page_count: 2,
    pages: [],
    pages_digest: 'abc',
    staging_cbz: '/x/comic_export/meu-manga.cbz',
    cbz_serve_path: '/storage/output/42/comic_export/meu-manga.cbz',
    epub_path: '/x/comic_export/meu-manga.epub',
    epub_serve_path: '/storage/output/42/comic_export/meu-manga.epub',
    epub_size_bytes: 1000,
    size_warning: false,
    title: 'Meu Mangá',
    author: 'Autora',
    language: 'por',
    translation_included: true,
    translation_state: 'full',
    kcc_profile: 'KPW5',
    manga_rtl: false,
    exported_at: '2026-07-22T00:00:00Z',
    ...overrides,
  }
}

function makeExportResponse(overrides: Partial<ComicExportResponse> = {}): ComicExportResponse {
  return {
    job_id: 42,
    comic_export_status: 'done',
    comic_export_error: null,
    manifest: makeManifest(),
    epub_url: '/storage/output/42/comic_export/meu-manga.epub',
    cbz_url: '/storage/output/42/comic_export/meu-manga.cbz',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/export/42']}>
      <ComicExportPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetJob.mockResolvedValue(makeJob())
  mockGetPipelineState.mockResolvedValue(makePipeline('available'))
  mockGetComicExport.mockRejectedValue({ response: { status: 404 } })
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('ComicExportPage — Estabilização v1', () => {
  it('renderiza resumo com fonte e CTA de export quando disponível', async () => {
    renderPage()
    expect(await screen.findByText('O que será exportado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gerar EPUB final/i })).toBeInTheDocument()
  })

  it('estado bloqueado mostra motivo e CTA para o pré-requisito', async () => {
    mockGetPipelineState.mockResolvedValue(makePipeline('blocked'))
    renderPage()
    expect(await screen.findByText('Export bloqueado por pré-requisito')).toBeInTheDocument()
    expect(
      screen.getByText(/exige a curadoria final exportada/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ir para a etapa pendente/i })).toBeInTheDocument()
    // sem CTA de export
    expect(screen.queryByRole('button', { name: /Gerar EPUB final/i })).not.toBeInTheDocument()
  })

  it('job inexistente mostra erro e link para o início', async () => {
    mockGetJob.mockRejectedValue({ response: { status: 404 } })
    mockGetPipelineState.mockRejectedValue({ response: { status: 404 } })
    renderPage()
    expect(await screen.findByText(/Este job não existe mais/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar ao início/i })).toBeInTheDocument()
  })

  it('erro de rede encerra loading e oferece retry (sem spinner infinito)', async () => {
    mockGetJob.mockRejectedValue(new Error('network'))
    mockGetPipelineState.mockRejectedValue(new Error('network'))
    renderPage()
    expect(
      await screen.findByText(/Não foi possível carregar o estado do export/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument()
    expect(screen.queryByText(/Carregando estado do export/i)).not.toBeInTheDocument()
  })

  it('export concluído: downloads, envio e badge de tradução completa', async () => {
    mockGetJob.mockResolvedValue(makeJob({ comic_export_status: 'done' }))
    mockGetComicExport.mockResolvedValue(makeExportResponse())
    renderPage()
    expect(await screen.findByText('Export concluído')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Baixar EPUB/i })).toHaveAttribute(
      'href', '/storage/output/42/comic_export/meu-manga.epub',
    )
    expect(screen.getByRole('link', { name: /Baixar CBZ/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar ao Kindle/i })).toBeInTheDocument()
    expect(
      screen.getByText(/Tradução visual incluída em todas as páginas/i),
    ).toBeInTheDocument()
  })

  it('translation_state=partial mostra aviso de tradução parcial', async () => {
    mockGetJob.mockResolvedValue(makeJob({ comic_export_status: 'done' }))
    mockGetComicExport.mockResolvedValue(
      makeExportResponse({ manifest: makeManifest({ translation_state: 'partial' }) }),
    )
    renderPage()
    expect(
      await screen.findByText(/Tradução parcialmente incluída/i),
    ).toBeInTheDocument()
  })

  it('translation_state=none mostra aviso de páginas originais', async () => {
    mockGetJob.mockResolvedValue(makeJob({ comic_export_status: 'done' }))
    mockGetComicExport.mockResolvedValue(
      makeExportResponse({ manifest: makeManifest({ translation_state: 'none' }) }),
    )
    renderPage()
    expect(await screen.findByText(/Sem tradução visual/i)).toBeInTheDocument()
  })

  it('POST de export com 409 estruturado exibe mensagem humana', async () => {
    mockStartComicExport.mockRejectedValue({
      response: {
        status: 409,
        data: { detail: { code: 'EXPORT_SOURCE_MISSING', message: 'Nenhuma fonte final consistente encontrada.' } },
      },
    })
    renderPage()
    const btn = await screen.findByRole('button', { name: /Gerar EPUB final/i })
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma fonte final consistente/i)).toBeInTheDocument()
    })
  })

  it('envio bloqueado (409 COMIC_EXPORT_REQUIRED) exibe mensagem estruturada', async () => {
    mockGetJob.mockResolvedValue(makeJob({ comic_export_status: 'done' }))
    mockGetComicExport.mockResolvedValue(makeExportResponse())
    mockSendToKindle.mockRejectedValue({
      response: {
        status: 409,
        data: { detail: { code: 'COMIC_EXPORT_REQUIRED', message: 'Conclua a etapa Exportar antes de enviar.' } },
      },
    })
    renderPage()
    const btn = await screen.findByRole('button', { name: /Enviar ao Kindle/i })
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByText(/Conclua a etapa Exportar/i)).toBeInTheDocument()
    })
  })

  it('seção do KCC rápido é claramente rotulada como original sem tradução', async () => {
    renderPage()
    const toggle = await screen.findByText(/Conversão rápida do original/i)
    fireEvent.click(toggle)
    expect(
      screen.getByText(/a tradução visual NÃO será incluída/i),
    ).toBeInTheDocument()
  })
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AnalysisPage from '../pages/AnalysisPage'
import type { JobResponse, JobStatusResponse } from '../types'

// ---------------------------------------------------------------------------
// Mocks da API
// ---------------------------------------------------------------------------

const mockAnalyzeUpload = vi.fn()
const mockGetJob = vi.fn()
const mockGetJobStatus = vi.fn()
const mockComicConvertJob = vi.fn()
const mockUpdateMetadata = vi.fn()
const mockGetComicToolsStatus = vi.fn()

const kccAvailable = { kcc: { available: true, path: '/venv/bin/kcc-c2e' }, argos: { library_installed: true, pairs: [] } }
const kccUnavailable = { kcc: { available: false, path: null }, argos: { library_installed: true, pairs: [] } }

vi.mock('../api/client', () => ({
  analyzeUpload: (...args: unknown[]) => mockAnalyzeUpload(...args),
  getJob: (...args: unknown[]) => mockGetJob(...args),
  getJobStatus: (...args: unknown[]) => mockGetJobStatus(...args),
  comicConvertJob: (...args: unknown[]) => mockComicConvertJob(...args),
  updateMetadata: (...args: unknown[]) => mockUpdateMetadata(...args),
  getComicToolsStatus: (...args: unknown[]) => mockGetComicToolsStatus(...args),
  translateJob: vi.fn(),
  updateCover: vi.fn(),
  convertJob: vi.fn(),
  comicTranslateJob: vi.fn(),
  sendToKindle: vi.fn(),
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
    original_filename: 'manga.pdf',
    status: 'analyzed',
    page_count: 10,
    is_scanned: true,
    avg_chars_per_page: 0,
    detected_title: 'Manga',
    detected_author: '',
    detected_language: 'por',
    final_title: 'Manga',
    final_author: '',
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
    input_format: 'pdf',
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

describe('AnalysisPage — kindle:jobselect dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetJobStatus.mockResolvedValue(makeStatus())
    mockGetComicToolsStatus.mockResolvedValue(kccAvailable)
  })

  it('dispatches kindle:jobselect on load with correct type', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ processing_mode: 'comic', final_title: 'Manga Test' }))
    const events: CustomEvent[] = []
    const handler = (e: Event) => events.push(e as CustomEvent)
    window.addEventListener('kindle:jobselect', handler)

    renderAnalysisPage()

    await waitFor(() => {
      expect(events.length).toBeGreaterThan(0)
    })
    expect(events[0].detail).toMatchObject({ id: '1', type: 'comic', name: 'Manga Test' })
    window.removeEventListener('kindle:jobselect', handler)
  })

  it('re-dispatches kindle:jobselect when processing_mode changes to document', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    mockUpdateMetadata.mockResolvedValue(makeJob({ processing_mode: 'document' }))

    const events: CustomEvent[] = []
    const handler = (e: Event) => events.push(e as CustomEvent)
    window.addEventListener('kindle:jobselect', handler)

    renderAnalysisPage()

    await waitFor(() => expect(events.length).toBeGreaterThan(0))
    expect(events[0].detail.type).toBe('comic')

    const toggle = screen.getByRole('checkbox', { name: /tratar como quadrinho/i })
    fireEvent.click(toggle)

    await waitFor(() => {
      const last = events[events.length - 1]
      expect(last.detail.type).toBe('document')
    })
    window.removeEventListener('kindle:jobselect', handler)
  })
})

describe('AnalysisPage — modo comic (bug fixes)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateMetadata.mockResolvedValue(makeJob())
    mockGetJobStatus.mockResolvedValue(makeStatus())
    mockGetComicToolsStatus.mockResolvedValue(kccAvailable)
  })

  it('banner de OCR oculto em modo comic quando ocr_status=failed', async () => {
    const ocrMessage = 'OCR falhou: Could not find program \'gs\' on the PATH'
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({ processing_mode: 'comic', ocr_status: 'failed', error_message: ocrMessage }),
    )
    mockGetJob.mockResolvedValue(
      makeJob({ processing_mode: 'comic', ocr_status: 'failed', error_message: ocrMessage }),
    )

    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.queryByText(/Could not find program/i)).not.toBeInTheDocument()
    })
  })

  it('banner de OCR exibido em modo document quando ocr_status=failed (erro raw suprimido)', async () => {
    const ocrMessage = 'OCR falhou: Could not find program \'gs\' on the PATH'
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({ processing_mode: 'document', ocr_status: 'failed', error_message: ocrMessage }),
    )
    mockGetJob.mockResolvedValue(
      makeJob({ processing_mode: 'document', ocr_status: 'failed', error_message: ocrMessage }),
    )

    renderAnalysisPage()

    await waitFor(() => {
      // Banner de OCR falhou é exibido com mensagem de bloqueio
      expect(screen.getAllByText(/OCR falhou/i).length).toBeGreaterThan(0)
      // P5: mensagem raw técnica NÃO é o alerta principal — fica em área
      // secundária recolhida (<details>), não como banner primário
      const raw = screen.getByText(/Could not find program/i)
      expect(raw.closest('details')).not.toBeNull()
    })
  })

  it('botão Converter para EPUB fica desabilitado quando OCR falhou em PDF escaneado', async () => {
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({ processing_mode: 'document', is_scanned: true, ocr_status: 'failed', ocr_used: false }),
    )
    mockGetJob.mockResolvedValue(
      makeJob({ processing_mode: 'document', is_scanned: true, ocr_status: 'failed', ocr_used: false }),
    )

    renderAnalysisPage()

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Converter para EPUB/i })
      expect(btn).toBeDisabled()
    })
  })

  it('botão de converter KCC visível em modo comic', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    mockGetJob.mockResolvedValue(makeJob({ processing_mode: 'comic' }))

    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/Converter original via KCC/i)).toBeInTheDocument()
    })
  })

  it('comicConvertJob chamado ao clicar em converter KCC', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    mockGetJob.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    mockComicConvertJob.mockResolvedValue(makeJob({ processing_mode: 'comic', conversion_status: 'done' }))

    renderAnalysisPage()

    const btn = await screen.findByText(/Converter original via KCC/i)
    fireEvent.click(btn)

    await waitFor(() => {
      expect(mockComicConvertJob).toHaveBeenCalledWith(1)
    })
  })

  it('exibe banner de erro KCC quando comicConvertJob lança exceção', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    mockGetJob.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    mockComicConvertJob.mockRejectedValue({ response: { data: { detail: 'KCC não encontrado' } } })

    renderAnalysisPage()

    const btn = await screen.findByText(/Converter original via KCC/i)
    fireEvent.click(btn)

    await waitFor(() => {
      expect(screen.getByText(/KCC não encontrado/i)).toBeInTheDocument()
    })
  })

  it('banner de erro KCC não duplica quando detalhe não disponível', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    mockGetJob.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    // Sem response.data.detail — fallback i18n será usado
    mockComicConvertJob.mockRejectedValue(new Error('network error'))

    renderAnalysisPage()

    const btn = await screen.findByText(/Converter original via KCC/i)
    fireEvent.click(btn)

    await waitFor(() => {
      // A mensagem de erro deve aparecer apenas uma vez (sem duplicar "Falha ao converter com KCC Falha ao converter com KCC")
      const banners = document.querySelectorAll('[role="alert"]')
      const texts = Array.from(banners).map((b) => b.textContent ?? '')
      const duplicated = texts.some((t) => {
        const half = t.slice(0, Math.floor(t.length / 2))
        return half.length > 5 && t === half + half
      })
      expect(duplicated).toBe(false)
    })
  })

  it('aviso de par Argos indisponível bloqueia botão de tradução comic', async () => {
    const job = makeJob({
      processing_mode: 'comic',
      source_language: 'por',
      target_language: 'spa',
      translator_engine: 'argos',
    })
    mockAnalyzeUpload.mockResolvedValue(job)
    mockGetJob.mockResolvedValue(job)
    // Argos tem pares mas por→spa não está instalado
    mockGetComicToolsStatus.mockResolvedValue({
      kcc: { available: true, path: '/venv/bin/kcc-c2e' },
      argos: { library_installed: true, pairs: [{ src: 'por', tgt: 'eng' }] },
    })

    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/por→spa/i)).toBeInTheDocument()
    })

    const translateBtn = screen.getByRole('button', { name: /Traduzir quadrinhos/i })
    expect(translateBtn).toBeDisabled()
  })

  it('aviso de zero pacotes Argos bloqueia botão de tradução comic', async () => {
    const job = makeJob({ processing_mode: 'comic', translator_engine: 'argos' })
    mockAnalyzeUpload.mockResolvedValue(job)
    mockGetJob.mockResolvedValue(job)
    // Argos instalado mas sem nenhum pacote de idioma
    mockGetComicToolsStatus.mockResolvedValue({
      kcc: { available: true, path: '/venv/bin/kcc-c2e' },
      argos: { library_installed: true, pairs: [] },
    })

    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/Nenhum pacote de idioma Argos/i)).toBeInTheDocument()
    })

    const translateBtn = screen.getByRole('button', { name: /Traduzir quadrinhos/i })
    expect(translateBtn).toBeDisabled()
  })

  it('KCC indisponível desabilita botão de conversão e mostra aviso', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    mockGetJob.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    mockGetComicToolsStatus.mockResolvedValue(kccUnavailable)

    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/kcc-c2e não encontrado/i)).toBeInTheDocument()
    })

    const convertBtn = screen.getByRole('button', { name: /Converter original via KCC/i })
    expect(convertBtn).toBeDisabled()
  })

  it('KCC disponível habilita botão de conversão', async () => {
    mockAnalyzeUpload.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    mockGetJob.mockResolvedValue(makeJob({ processing_mode: 'comic' }))
    mockGetComicToolsStatus.mockResolvedValue(kccAvailable)

    renderAnalysisPage()

    await waitFor(() => {
      const convertBtn = screen.getByRole('button', { name: /Converter original via KCC/i })
      expect(convertBtn).not.toBeDisabled()
    })
  })

  it('exibe aviso de rascunho no botão KCC quando tradução foi concluída', async () => {
    mockAnalyzeUpload.mockResolvedValue(
      makeJob({ processing_mode: 'comic', comic_translation_status: 'done' }),
    )
    mockGetJob.mockResolvedValue(
      makeJob({ processing_mode: 'comic', comic_translation_status: 'done' }),
    )

    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByText(/KCC converte o arquivo original/i)).toBeInTheDocument()
    })
  })
})

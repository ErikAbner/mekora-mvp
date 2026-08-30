import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import UploadPage from '../pages/UploadPage'

// Mock do cliente de API
vi.mock('../api/client', () => ({
  uploadPdf: vi.fn(),
  getHistory: vi.fn().mockResolvedValue([]),
  API_BASE: '',
}))

// Mock do useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderUploadPage() {
  return render(
    <MemoryRouter>
      <UploadPage />
    </MemoryRouter>,
  )
}

describe('UploadPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza a área de upload', () => {
    renderUploadPage()
    expect(screen.getByRole('button', { name: /área de upload/i })).toBeInTheDocument()
  })

  it('exibe erro ao selecionar arquivo com formato não suportado', async () => {
    renderUploadPage()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'documento.xyz', { type: 'application/octet-stream' })
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/formato não suportado/i)).toBeInTheDocument()
    })
  })

  it('chama uploadPdf ao selecionar arquivo PDF válido', async () => {
    const { uploadPdf } = await import('../api/client')
    const mockUploadPdf = vi.mocked(uploadPdf)
    mockUploadPdf.mockResolvedValue({ upload_id: 42, filename: 'livro.pdf', status: 'uploaded' })

    renderUploadPage()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['%PDF-1.4'], 'livro.pdf', { type: 'application/pdf' })
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    await waitFor(() => {
      expect(mockUploadPdf).toHaveBeenCalledWith(file)
    })
  })

  it('navega para /analyze/{id} após upload bem-sucedido', async () => {
    const { uploadPdf } = await import('../api/client')
    vi.mocked(uploadPdf).mockResolvedValue({ upload_id: 7, filename: 'livro.pdf', status: 'uploaded' })

    renderUploadPage()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['%PDF-1.4'], 'livro.pdf', { type: 'application/pdf' })
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/analyze/7')
    })
  })

  it('área de upload é ativável por teclado (Enter)', () => {
    renderUploadPage()
    const dropzone = screen.getByRole('button', { name: /área de upload/i })
    expect(dropzone).toHaveAttribute('tabIndex', '0')
  })

  it('rejeita .zip no modo comic', async () => {
    renderUploadPage()

    fireEvent.click(screen.getByText('Comic / Mangá'))

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'quadrinhos.zip', { type: 'application/zip' })
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/formato não suportado/i)).toBeInTheDocument()
    })
  })

  it('file picker no modo comic tem accept incluindo .cbz e .pdf', () => {
    renderUploadPage()
    fireEvent.click(screen.getByText('Comic / Mangá'))
    const input = document.querySelector('input[type="file"]:not([multiple])') as HTMLInputElement
    const accept = input.getAttribute('accept') ?? ''
    expect(accept).toContain('.cbz')
    expect(accept).toContain('.cbr')
    expect(accept).toContain('.pdf')
  })

  it('folder picker tem atributo accept no modo comic', () => {
    renderUploadPage()
    fireEvent.click(screen.getByText('Comic / Mangá'))
    // O folder picker é o segundo input[type=file] (tem o atributo multiple)
    const inputs = document.querySelectorAll('input[type="file"]')
    const folderPicker = Array.from(inputs).find((el) => el.hasAttribute('multiple')) as HTMLInputElement | undefined
    expect(folderPicker).toBeDefined()
    const accept = folderPicker!.getAttribute('accept') ?? ''
    expect(accept).toContain('.cbz')
    expect(accept).toContain('.pdf')
  })

  it('aceita .cbz no modo comic', async () => {
    const { uploadPdf } = await import('../api/client')
    const mockUploadPdf = vi.mocked(uploadPdf)
    mockUploadPdf.mockResolvedValue({ upload_id: 11, filename: 'manga.cbz', status: 'uploaded' })

    renderUploadPage()
    fireEvent.click(screen.getByText('Comic / Mangá'))

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['PK\x03\x04'], 'manga.cbz', { type: 'application/zip' })
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    await waitFor(() => {
      expect(mockUploadPdf).toHaveBeenCalledWith(file)
    })
  })

  it('aceita .pdf no modo comic', async () => {
    const { uploadPdf } = await import('../api/client')
    const mockUploadPdf = vi.mocked(uploadPdf)
    mockUploadPdf.mockResolvedValue({ upload_id: 10, filename: 'arte.pdf', status: 'uploaded' })

    renderUploadPage()

    fireEvent.click(screen.getByText('Comic / Mangá'))

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['%PDF-1.4'], 'arte.pdf', { type: 'application/pdf' })
    Object.defineProperty(input, 'files', { value: [file] })
    fireEvent.change(input)

    await waitFor(() => {
      expect(mockUploadPdf).toHaveBeenCalledWith(file)
    })
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import HistoryPage from '../pages/HistoryPage'
import type { HistoryEntry } from '../types'

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

const mockGetHistory = vi.fn()
const mockRetrySend = vi.fn()
const mockDuplicateJob = vi.fn()

vi.mock('../api/client', () => ({
  getHistory:    (...args: unknown[]) => mockGetHistory(...args),
  retrySend:     (...args: unknown[]) => mockRetrySend(...args),
  duplicateJob:  (...args: unknown[]) => mockDuplicateJob(...args),
  API_BASE: '',
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    upload_id: 1,
    original_filename: 'livro.pdf',
    final_title: 'Meu Livro',
    final_author: '',
    final_language: 'por',
    status: 'done',
    is_scanned: false,
    ocr_used: false,
    conversion_status: 'done',
    send_status: 'sent',
    send_error: null,
    kindle_sent: true,
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

const entries: HistoryEntry[] = [
  makeEntry({ upload_id: 1, original_filename: 'romance.pdf', final_title: 'Grande Romance' }),
  makeEntry({ upload_id: 2, original_filename: 'tecnico.pdf', final_title: 'Manual Técnico' }),
  makeEntry({ upload_id: 3, original_filename: 'quadrinhos.cbz', final_title: 'HQ Volume 1', processing_mode: 'comic', conversion_status: 'done', send_status: 'not_sent', status: 'error' }),
]

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HistoryPage — busca e filtros', () => {
  beforeEach(() => {
    mockGetHistory.mockResolvedValue(entries)
  })

  it('busca filtra por nome de arquivo', async () => {
    wrap(<HistoryPage />)
    await waitFor(() => screen.getByText('romance.pdf'))

    const input = screen.getByPlaceholderText(/buscar/i)
    await userEvent.type(input, 'tecnico')

    expect(screen.queryByText('romance.pdf')).toBeNull()
    expect(screen.getByText('tecnico.pdf')).toBeTruthy()
  })

  it('busca filtra por título', async () => {
    wrap(<HistoryPage />)
    await waitFor(() => screen.getByText('romance.pdf'))

    const input = screen.getByPlaceholderText(/buscar/i)
    await userEvent.type(input, 'HQ Volume')

    expect(screen.queryByText('romance.pdf')).toBeNull()
    expect(screen.getByText('quadrinhos.cbz')).toBeTruthy()
  })

  it('busca vazia mostra todos os registros', async () => {
    wrap(<HistoryPage />)
    await waitFor(() => screen.getByText('romance.pdf'))

    expect(screen.getByText('romance.pdf')).toBeTruthy()
    expect(screen.getByText('tecnico.pdf')).toBeTruthy()
    expect(screen.getByText('quadrinhos.cbz')).toBeTruthy()
  })

  it('CTA Re-abrir aparece para job em erro', async () => {
    wrap(<HistoryPage />)
    await waitFor(() => screen.getByText('quadrinhos.cbz'))

    // Job com status=error deve ter CTA "Re-abrir"
    expect(screen.getByRole('link', { name: /re-abrir/i })).toBeTruthy()
  })
})

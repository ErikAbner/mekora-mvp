import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import MetricsPage from '../pages/MetricsPage'
import type { FailureEntry, MetricsSummary, StageStats } from '../types'

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

const mockGetMetricsSummary = vi.fn()
const mockGetMetricsStages = vi.fn()
const mockGetMetricsFailures = vi.fn()

vi.mock('../api/client', () => ({
  getMetricsSummary: (...args: unknown[]) => mockGetMetricsSummary(...args),
  getMetricsStages:  (...args: unknown[]) => mockGetMetricsStages(...args),
  getMetricsFailures: (...args: unknown[]) => mockGetMetricsFailures(...args),
  API_BASE: '',
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockSummary: MetricsSummary = {
  total: 10,
  done: 7,
  error: 2,
  pending_send: 1,
  in_progress: 0,
}

const mockStages: StageStats[] = [
  {
    stage: 'analyze',
    total: 5,
    completed: 4,
    failed: 1,
    avg_ms: 350.0,
    p95_ms: 600.0,
    fail_pct: 20.0,
  },
]

const mockFailures: FailureEntry[] = [
  {
    job_id: 3,
    stage: 'convert',
    error_type: 'ConversionFailedError',
    error_message: 'ebook-convert não encontrado',
    created_at: '2026-03-28T10:00:00',
  },
]

function setup() {
  return render(
    <MemoryRouter>
      <MetricsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetMetricsSummary.mockResolvedValue(mockSummary)
  mockGetMetricsStages.mockResolvedValue(mockStages)
  mockGetMetricsFailures.mockResolvedValue(mockFailures)
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('MetricsPage', () => {
  it('renderiza título', async () => {
    setup()
    expect(await screen.findByRole('heading', { name: 'Métricas' })).toBeInTheDocument()
  })

  it('exibe cards de resumo com valores corretos', async () => {
    setup()
    // Aguarda carregamento
    await screen.findByRole('heading', { name: 'Métricas' })
    expect(screen.getByText('10')).toBeInTheDocument()          // total
    expect(screen.getAllByText('7').length).toBeGreaterThan(0)  // done (KPI + distribuição)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)  // error (distribuição)
  })

  it('exibe tabela de etapas', async () => {
    setup()
    await screen.findByText('Desempenho por etapa')
    expect(screen.getByText('analyze')).toBeInTheDocument()
    expect(screen.getByText('350')).toBeInTheDocument()  // avg_ms rounded
  })

  it('exibe falhas recentes', async () => {
    setup()
    await screen.findByText('Falhas recentes')
    expect(screen.getByText('ConversionFailedError')).toBeInTheDocument()
    expect(screen.getByText(/ebook-convert/)).toBeInTheDocument()
  })

  it('exibe mensagem quando sem falhas', async () => {
    mockGetMetricsFailures.mockResolvedValue([])
    setup()
    // No redesign, o cabeçalho "Falhas recentes" só aparece quando há falhas
    expect(await screen.findByText('Nenhuma falha recente.')).toBeInTheDocument()
  })

  it('exibe mensagem quando sem dados de etapas', async () => {
    mockGetMetricsStages.mockResolvedValue([])
    setup()
    await screen.findByText('Desempenho por etapa')
    expect(screen.getByText(/Sem dados ainda/)).toBeInTheDocument()
  })
})

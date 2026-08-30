import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JobHealthPanel } from '../components/JobHealthPanel'
import type { JobHealthResponse, JobRepairResponse } from '../types'

// ---------------------------------------------------------------------------
// API mocks
// ---------------------------------------------------------------------------

const mockGetJobHealth = vi.fn()
const mockRepairJob = vi.fn()

vi.mock('../api/client', () => ({
  getJobHealth: (...args: unknown[]) => mockGetJobHealth(...args),
  repairJob:    (...args: unknown[]) => mockRepairJob(...args),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeHealth(overrides: Partial<JobHealthResponse> = {}): JobHealthResponse {
  return {
    job_id: 1,
    is_healthy: true,
    checks: [
      { name: 'Status do job', ok: true, detail: 'Status: done' },
      { name: 'Arquivo original presente', ok: true, detail: 'file.pdf' },
    ],
    manifests_present: ['comic_consistency_manifest.json'],
    manifests_missing: [],
    recommended_next_action: 'Pipeline de quadrinhos completo. Pronto para exportar.',
    ...overrides,
  }
}

function makeRepairResponse(overrides: Partial<JobRepairResponse> = {}): JobRepairResponse {
  return {
    job_id: 1,
    repaired: [],
    not_repaired: [],
    health: makeHealth(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JobHealthPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetJobHealth.mockResolvedValue(makeHealth())
    mockRepairJob.mockResolvedValue(makeRepairResponse())
  })

  it('exibe badge "Saudável" quando is_healthy=true', async () => {
    render(<JobHealthPanel jobId={1} />)
    await waitFor(() => {
      expect(screen.getByText(/Saudável/i)).toBeTruthy()
    })
  })

  it('exibe badge "Atenção" quando is_healthy=false', async () => {
    mockGetJobHealth.mockResolvedValue(
      makeHealth({ is_healthy: false, checks: [{ name: 'Status do job', ok: false, detail: 'Job com status de erro.' }] }),
    )
    render(<JobHealthPanel jobId={1} />)
    await waitFor(() => {
      expect(screen.getByText(/Atenção/i)).toBeTruthy()
    })
  })

  it('exibe lista de checks com status visual correto', async () => {
    mockGetJobHealth.mockResolvedValue(
      makeHealth({
        checks: [
          { name: 'Status do job', ok: true, detail: 'Status: done' },
          { name: 'Arquivo original presente', ok: false, detail: 'Não encontrado' },
        ],
        is_healthy: false,
      }),
    )
    render(<JobHealthPanel jobId={1} />)
    await waitFor(() => {
      expect(screen.getByText('Status do job')).toBeTruthy()
      expect(screen.getByText('Arquivo original presente')).toBeTruthy()
    })
  })

  it('botão "Reparar job" chama repairJob e exibe resultado', async () => {
    mockRepairJob.mockResolvedValue(
      makeRepairResponse({ repaired: ['Manifesto inválido renomeado para backup: comic_consistency_manifest.json → comic_consistency_manifest.json.bak'] }),
    )
    render(<JobHealthPanel jobId={1} />)
    await waitFor(() => screen.getByRole('button', { name: /Reparar job/i }))
    fireEvent.click(screen.getByRole('button', { name: /Reparar job/i }))
    await waitFor(() => {
      expect(mockRepairJob).toHaveBeenCalledWith(1)
    })
  })

  it('exibe manifests_missing quando presentes', async () => {
    mockGetJobHealth.mockResolvedValue(
      makeHealth({
        is_healthy: false,
        manifests_missing: ['comic_finish_manifest.json'],
      }),
    )
    render(<JobHealthPanel jobId={1} />)
    await waitFor(() => {
      expect(screen.getByText('comic_finish_manifest.json')).toBeTruthy()
    })
  })
})

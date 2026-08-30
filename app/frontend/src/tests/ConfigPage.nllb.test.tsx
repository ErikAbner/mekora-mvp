import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ConfigPage from '../pages/ConfigPage'
import type { AppConfig, Config, NllbModelStatus } from '../types'

// ---------------------------------------------------------------------------
// Mocks da API
// ---------------------------------------------------------------------------

const mockGetConfig = vi.fn()
const mockGetAppConfig = vi.fn()
const mockUpdateAppConfig = vi.fn()
const mockGetTranslationModelsStatus = vi.fn()

vi.mock('../api/client', () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
  getAppConfig: (...args: unknown[]) => mockGetAppConfig(...args),
  updateAppConfig: (...args: unknown[]) => mockUpdateAppConfig(...args),
  testEmail: vi.fn(),
  getTranslationEnginesStatus: vi.fn(),
  getTranslationModelsStatus: (...args: unknown[]) => mockGetTranslationModelsStatus(...args),
  API_BASE: '',
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeConfig(): Config {
  return {
    smtp_host: 'smtp.test',
    smtp_port: 587,
    smtp_user: 'user@test.com',
    smtp_pass_set: true,
    kindle_email: 'kindle@test.com',
  }
}

function makeAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    ocr_languages: ['por', 'eng'],
    retention_days: 30,
    polling_interval_ms: 3000,
    ui_language: 'pt',
    ui_theme: 'light',
    kcc_profile: 'KPW5',
    translation_enabled_by_default: false,
    preferred_source_language: 'por',
    preferred_target_language: 'eng',
    translator_engine_default: 'argos',
    nllb_enabled: false,
    nllb_model_name: 'facebook/nllb-200-distilled-600M',
    nllb_device_preference: 'auto',
    ...overrides,
  }
}

function makeNllbStatus(overrides: Partial<NllbModelStatus> = {}): NllbModelStatus {
  return {
    torch_installed: true,
    transformers_installed: true,
    model_available: true,
    model_name: 'facebook/nllb-200-distilled-600M',
    model_path: '/storage/models/nllb',
    setup_command: 'python scripts/setup_nllb.py',
    ...overrides,
  }
}

function renderConfigPage() {
  return render(
    <MemoryRouter>
      <ConfigPage />
    </MemoryRouter>,
  )
}

async function navigateToNllb() {
  await waitFor(() => expect(screen.getByRole('button', { name: /Motor NLLB/i })).toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: /Motor NLLB/i }))
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('ConfigPage — painel NLLB (Fase C)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetConfig.mockResolvedValue(makeConfig())
    mockGetAppConfig.mockResolvedValue(makeAppConfig())
    mockGetTranslationModelsStatus.mockResolvedValue({ nllb: makeNllbStatus() })
    mockUpdateAppConfig.mockResolvedValue(makeAppConfig())
  })

  it('renderiza o toggle NLLB desmarcado quando nllb_enabled=false', async () => {
    renderConfigPage()
    await navigateToNllb()
    await waitFor(() => {
      expect(screen.getByLabelText(/Habilitar motor NLLB/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/Habilitar motor NLLB/i)).not.toBeChecked()
  })

  it('não exibe seletores de modelo e device quando NLLB desabilitado', async () => {
    renderConfigPage()
    await navigateToNllb()
    await waitFor(() => {
      expect(screen.getByLabelText(/Habilitar motor NLLB/i)).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/Modelo NLLB/i)).toBeNull()
    expect(screen.queryByLabelText(/Dispositivo de processamento/i)).toBeNull()
  })

  it('exibe seletores de modelo e device quando nllb_enabled=true', async () => {
    mockGetAppConfig.mockResolvedValue(makeAppConfig({ nllb_enabled: true }))
    renderConfigPage()
    await navigateToNllb()
    await waitFor(() => {
      expect(screen.getByLabelText(/Modelo NLLB/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/Dispositivo de processamento/i)).toBeInTheDocument()
  })

  it('ativar o toggle exibe os seletores de modelo e device', async () => {
    renderConfigPage()
    await navigateToNllb()
    await waitFor(() => {
      expect(screen.getByLabelText(/Habilitar motor NLLB/i)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByLabelText(/Habilitar motor NLLB/i))
    await waitFor(() => {
      expect(screen.getByLabelText(/Modelo NLLB/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/Dispositivo de processamento/i)).toBeInTheDocument()
  })

  it('exibe painel de status sem banner de aviso quando modelo está disponível', async () => {
    mockGetAppConfig.mockResolvedValue(makeAppConfig({ nllb_enabled: true }))
    mockGetTranslationModelsStatus.mockResolvedValue({ nllb: makeNllbStatus({ model_available: true }) })
    renderConfigPage()
    await navigateToNllb()
    await waitFor(() => {
      expect(screen.getByText(/Status do NLLB/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/modelo não está disponível/i)).toBeNull()
  })

  it('exibe banner de aviso quando NLLB habilitado mas modelo indisponível', async () => {
    mockGetAppConfig.mockResolvedValue(makeAppConfig({ nllb_enabled: true }))
    mockGetTranslationModelsStatus.mockResolvedValue({ nllb: makeNllbStatus({ model_available: false }) })
    renderConfigPage()
    await navigateToNllb()
    await waitFor(() => {
      expect(screen.getByText(/modelo não está disponível/i)).toBeInTheDocument()
    })
  })

  it('exibe o comando de setup quando modelo não está instalado', async () => {
    mockGetAppConfig.mockResolvedValue(makeAppConfig({ nllb_enabled: true }))
    mockGetTranslationModelsStatus.mockResolvedValue({
      nllb: makeNllbStatus({ model_available: false, setup_command: 'python scripts/setup_nllb.py' }),
    })
    renderConfigPage()
    await navigateToNllb()
    await waitFor(() => {
      expect(screen.getByText('python scripts/setup_nllb.py')).toBeInTheDocument()
    })
  })

  it('salvar envia nllb_enabled, nllb_model_name e nllb_device_preference ao updateAppConfig', async () => {
    const cfg = makeAppConfig({
      nllb_enabled: true,
      nllb_model_name: 'facebook/nllb-200-distilled-1.3B',
      nllb_device_preference: 'cpu',
    })
    mockGetAppConfig.mockResolvedValue(cfg)
    mockUpdateAppConfig.mockResolvedValue(cfg)
    renderConfigPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Salvar configurações/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /Salvar configurações/i }))
    await waitFor(() => {
      expect(mockUpdateAppConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          nllb_enabled: true,
          nllb_model_name: 'facebook/nllb-200-distilled-1.3B',
          nllb_device_preference: 'cpu',
        }),
      )
    })
  })
})

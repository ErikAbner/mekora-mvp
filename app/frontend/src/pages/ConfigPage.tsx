import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getAppConfig, getConfig, getTranslationModelsStatus, testEmail, updateAppConfig } from '../api/client'
import { useTheme } from '../contexts/ThemeContext'
import type { AppConfig, Config, NllbModelStatus } from '../types'

type Section = 'geral' | 'saida' | 'processamento' | 'traducao' | 'nllb'

export default function ConfigPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [savingAppConfig, setSavingAppConfig] = useState(false)
  const [appConfigSaved, setAppConfigSaved] = useState(false)
  const [nllbStatus, setNllbStatus] = useState<NllbModelStatus | null>(null)
  const [activeSection, setActiveSection] = useState<Section>('geral')
  const { t, i18n } = useTranslation()
  const { setTheme } = useTheme()

  const OCR_LANG_OPTIONS = [
    { value: 'por', label: t('config.ocrLangPor') },
    { value: 'eng', label: t('config.ocrLangEng') },
    { value: 'spa', label: t('config.ocrLangSpa') },
    { value: 'fra', label: t('config.ocrLangFra') },
    { value: 'deu', label: t('config.ocrLangDeu') },
  ]

  useEffect(() => {
    Promise.all([
      getConfig(),
      getAppConfig(),
      getTranslationModelsStatus().catch(() => null),
    ])
      .then(([cfg, appCfg, modelsStatus]) => {
        setConfig(cfg)
        setAppConfig(appCfg)
        if (modelsStatus) setNllbStatus(modelsStatus.nllb)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSaveAppConfig = async () => {
    if (!appConfig) return
    setSavingAppConfig(true)
    setAppConfigSaved(false)
    try {
      const updated = await updateAppConfig(appConfig)
      setAppConfig(updated)
      setAppConfigSaved(true)
      setTimeout(() => setAppConfigSaved(false), 3000)
    } finally {
      setSavingAppConfig(false)
    }
  }

  const toggleOcrLang = (lang: string) => {
    if (!appConfig) return
    const langs = appConfig.ocr_languages.includes(lang)
      ? appConfig.ocr_languages.filter((l) => l !== lang)
      : [...appConfig.ocr_languages, lang]
    setAppConfig({ ...appConfig, ocr_languages: langs })
  }

  const handleTestEmail = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testEmail()
      setTestResult(result)
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (e as any)?.response?.data?.detail || 'Erro ao testar conexão SMTP.'
      setTestResult({ success: false, message: detail })
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-zinc-400">{t('config.title')}...</p>

  const NAV_SECTIONS: { id: Section; labelKey: string }[] = [
    { id: 'geral', labelKey: 'config.sectionGeral' },
    { id: 'saida', labelKey: 'config.sectionSaida' },
    { id: 'processamento', labelKey: 'config.sectionProcessamento' },
    { id: 'traducao', labelKey: 'config.sectionTraducao' },
    { id: 'nllb', labelKey: 'config.sectionNllb' },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{t('config.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
          {t('config.envHintBefore')}{' '}
          <code className="bg-gray-100 dark:bg-zinc-700 dark:text-zinc-200 px-1 py-0.5 rounded text-xs">.env</code>{' '}
          {t('config.envHintAfter')}
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar nav */}
        <nav className="w-44 shrink-0 space-y-1" aria-label={t('config.title')}>
          {NAV_SECTIONS.map(({ id, labelKey }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                activeSection === id
                  ? 'bg-brand text-white font-medium'
                  : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </nav>

        {/* Right content */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Seção: Geral */}
          {activeSection === 'geral' && appConfig && (
            <>
              <SectionTitle>{t('config.sectionGeral')}</SectionTitle>
              <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl p-5 space-y-5">
                {/* Idioma da interface */}
                <div>
                  <label htmlFor="ui-language" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    {t('config.uiLangLabel')}
                  </label>
                  <select
                    id="ui-language"
                    value={appConfig.ui_language ?? 'pt'}
                    onChange={(e) => {
                      const lang = e.target.value
                      setAppConfig({ ...appConfig, ui_language: lang })
                      i18n.changeLanguage(lang)
                    }}
                    className="w-40 border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    <option value="pt">{t('config.langPt')}</option>
                    <option value="en">{t('config.langEn')}</option>
                  </select>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{t('config.uiLangHint')}</p>
                </div>

                {/* Tema da interface */}
                <div>
                  <label htmlFor="ui-theme" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    {t('config.uiThemeLabel')}
                  </label>
                  <select
                    id="ui-theme"
                    value={appConfig.ui_theme ?? 'light'}
                    onChange={(e) => {
                      const val = e.target.value as 'light' | 'dark'
                      setAppConfig({ ...appConfig, ui_theme: val })
                      setTheme(val)
                    }}
                    className="w-40 border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    <option value="light">{t('config.themeLight')}</option>
                    <option value="dark">{t('config.themeDark')}</option>
                  </select>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{t('config.uiThemeHint')}</p>
                </div>
              </div>
              <SaveBar saving={savingAppConfig} saved={appConfigSaved} onSave={handleSaveAppConfig} t={t} />
            </>
          )}

          {/* Seção: Saída / E-mail */}
          {activeSection === 'saida' && (
            <>
              <SectionTitle>{t('config.sectionSaida')}</SectionTitle>

              {/* Config atual */}
              {config && (
                <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl divide-y divide-black/[0.04] dark:divide-zinc-800">
                  <ConfigRow label={t('config.rowSmtpHost')} value={config.smtp_host} />
                  <ConfigRow label={t('config.rowSmtpPort')} value={String(config.smtp_port)} />
                  <ConfigRow label={t('config.rowSmtpUser')} value={config.smtp_user} />
                  <ConfigRow
                    label={t('config.rowSmtpPass')}
                    value={config.smtp_pass_set ? t('config.passSet') : t('config.passNotSet')}
                    warn={!config.smtp_pass_set}
                  />
                  <ConfigRow
                    label={t('config.rowKindleEmail')}
                    value={config.kindle_email || t('config.notConfigured')}
                    warn={!config.kindle_email}
                  />
                </div>
              )}

              {/* Testar conexão SMTP */}
              <div>
                <button
                  onClick={handleTestEmail}
                  disabled={testing}
                  aria-busy={testing}
                  className="px-4 py-2 text-sm rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand"
                >
                  {testing ? t('config.testing') : t('config.testSmtp')}
                </button>
                {testResult && (
                  <div
                    className={`mt-3 rounded-lg p-3 text-sm border ${
                      testResult.success
                        ? 'bg-feedback-success-bg dark:bg-green-950 border-feedback-success-border dark:border-green-800 text-feedback-success dark:text-green-400'
                        : 'bg-feedback-error-bg dark:bg-red-950 border-feedback-error-border dark:border-red-800 text-feedback-error dark:text-red-400'
                    }`}
                  >
                    {testResult.message}
                  </div>
                )}
              </div>

              {/* Instruções */}
              <div className="bg-gray-50 dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl p-4 text-sm text-gray-600 dark:text-zinc-300">
                <p className="font-medium mb-2 dark:text-zinc-100">{t('config.howToTitle')}</p>
                <p className="text-xs mb-2">
                  {t('config.howToDescBefore')}{' '}
                  <code className="bg-gray-100 dark:bg-zinc-700 dark:text-zinc-200 px-1 rounded">.env</code>{' '}
                  {t('config.howToDescAfter')}
                </p>
                <pre className="text-xs bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto leading-relaxed">
                  {`SMTP_HOST=smtp.gmail.com\nSMTP_PORT=587\nSMTP_USER=seu@gmail.com\nSMTP_PASS=sua_senha_de_app\nKINDLE_EMAIL=seu@kindle.com`}
                </pre>
                <p className="mt-3 text-xs text-gray-500 dark:text-zinc-400">{t('config.gmailHint')}</p>
              </div>
            </>
          )}

          {/* Seção: Processamento */}
          {activeSection === 'processamento' && appConfig && (
            <>
              <SectionTitle>{t('config.sectionProcessamento')}</SectionTitle>
              <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl p-5 space-y-5">
                {/* Idiomas OCR */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">
                    {t('config.ocrLangsLabel')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {OCR_LANG_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-700 dark:text-zinc-300"
                      >
                        <input
                          type="checkbox"
                          checked={appConfig.ocr_languages.includes(opt.value)}
                          onChange={() => toggleOcrLang(opt.value)}
                          className="rounded"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{t('config.ocrLangsHint')}</p>
                </div>

                {/* Retenção de arquivos */}
                <div>
                  <label htmlFor="retention-days" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    {t('config.retentionLabel')}
                  </label>
                  <input
                    id="retention-days"
                    type="number"
                    min={1}
                    max={365}
                    value={appConfig.retention_days}
                    onChange={(e) => setAppConfig({ ...appConfig, retention_days: Number(e.target.value) })}
                    className="w-32 border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{t('config.retentionHint')}</p>
                </div>

                {/* Perfil KCC */}
                <div>
                  <label htmlFor="kcc-profile" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    {t('config.kccProfileLabel')}
                  </label>
                  <select
                    id="kcc-profile"
                    value={appConfig.kcc_profile ?? 'KPW5'}
                    onChange={(e) => setAppConfig({ ...appConfig, kcc_profile: e.target.value })}
                    className="w-64 border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    <option value="KPW5">Kindle PW 5/6/7 (1648×1236)</option>
                    <option value="KV">Kindle Voyage / PW 3 (1448×1072)</option>
                    <option value="KO">Kindle Oasis (1264×954)</option>
                    <option value="KOBO">Kobo (1448×1072)</option>
                  </select>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{t('config.kccProfileHint')}</p>
                </div>
              </div>
              <SaveBar saving={savingAppConfig} saved={appConfigSaved} onSave={handleSaveAppConfig} t={t} />
            </>
          )}

          {/* Seção: Tradução */}
          {activeSection === 'traducao' && appConfig && (
            <>
              <SectionTitle>{t('config.sectionTraducao')}</SectionTitle>
              <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl p-5 space-y-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={!!appConfig.translation_enabled_by_default}
                    onChange={(e) => setAppConfig({ ...appConfig, translation_enabled_by_default: e.target.checked })}
                    className="rounded"
                  />
                  {t('config.translationEnabledLabel')}
                </label>
                <p className="text-xs text-gray-400 dark:text-zinc-500">{t('config.translationEnabledHint')}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">
                      {t('config.sourceLangLabel')}
                    </label>
                    <select
                      value={appConfig.preferred_source_language ?? 'por'}
                      onChange={(e) => setAppConfig({ ...appConfig, preferred_source_language: e.target.value })}
                      className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    >
                      {OCR_LANG_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">
                      {t('config.targetLangLabel')}
                    </label>
                    <select
                      value={appConfig.preferred_target_language ?? 'eng'}
                      onChange={(e) => setAppConfig({ ...appConfig, preferred_target_language: e.target.value })}
                      className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    >
                      {OCR_LANG_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-zinc-500">{t('config.translatorEngineInfo')}</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500">{t('config.translationPkgHint')}</p>
              </div>
              <SaveBar saving={savingAppConfig} saved={appConfigSaved} onSave={handleSaveAppConfig} t={t} />
            </>
          )}

          {/* Seção: Motor NLLB */}
          {activeSection === 'nllb' && appConfig && (
            <>
              <SectionTitle>{t('config.sectionNllb')}</SectionTitle>
              <div className="rounded-lg p-3 text-sm border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400">
                {t('config.nllbAdvancedNote')}
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 rounded-xl p-5 space-y-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-gray-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={!!appConfig.nllb_enabled}
                    onChange={(e) => setAppConfig({ ...appConfig, nllb_enabled: e.target.checked })}
                    className="rounded"
                  />
                  {t('config.nllbEnabledLabel')}
                </label>
                <p className="text-xs text-gray-400 dark:text-zinc-500">{t('config.nllbEnabledHint')}</p>

                {appConfig.nllb_enabled && (
                  <div className="space-y-3">
                    {/* Seletor de modelo */}
                    <div>
                      <label htmlFor="nllb-model" className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">
                        {t('config.nllbModelLabel')}
                      </label>
                      <select
                        id="nllb-model"
                        value={appConfig.nllb_model_name ?? 'facebook/nllb-200-distilled-600M'}
                        onChange={(e) => setAppConfig({ ...appConfig, nllb_model_name: e.target.value })}
                        className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                      >
                        <option value="facebook/nllb-200-distilled-600M">600M — rápido (~2.4 GB)</option>
                        <option value="facebook/nllb-200-distilled-1.3B">1.3B — melhor qualidade (~5.5 GB)</option>
                      </select>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{t('config.nllbModelHint')}</p>
                    </div>

                    {/* Seletor de device */}
                    <div>
                      <label htmlFor="nllb-device" className="block text-xs text-gray-500 dark:text-zinc-400 mb-1">
                        {t('config.nllbDeviceLabel')}
                      </label>
                      <select
                        id="nllb-device"
                        value={appConfig.nllb_device_preference ?? 'auto'}
                        onChange={(e) => setAppConfig({ ...appConfig, nllb_device_preference: e.target.value })}
                        className="w-full border border-gray-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                      >
                        <option value="auto">{t('config.nllbDeviceAuto')}</option>
                        <option value="cpu">{t('config.nllbDeviceCpu')}</option>
                        <option value="mps">MPS (Apple Silicon)</option>
                        <option value="cuda">{t('config.nllbDeviceCuda')}</option>
                      </select>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{t('config.nllbDeviceHint')}</p>
                    </div>

                    {/* Painel de status */}
                    {nllbStatus && (
                      <div className="rounded-lg border border-black/[0.06] dark:border-zinc-700 p-3">
                        <p className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-2">
                          {t('config.nllbStatusTitle')}
                        </p>
                        <ul className="space-y-1">
                          <NllbStatusItem label={t('config.nllbStatusTorch')} ok={nllbStatus.torch_installed} />
                          <NllbStatusItem label={t('config.nllbStatusTransformers')} ok={nllbStatus.transformers_installed} />
                          <NllbStatusItem label={t('config.nllbStatusModel')} ok={nllbStatus.model_available} />
                        </ul>
                        {!nllbStatus.model_available && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 dark:text-zinc-400">{t('config.nllbSetupCmd')}</p>
                            <code className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 px-2 py-0.5 rounded block mt-1">
                              {nllbStatus.setup_command}
                            </code>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Banner de aviso quando habilitado sem modelo */}
                    {nllbStatus && !nllbStatus.model_available && (
                      <div className="rounded-lg p-3 text-sm border bg-feedback-warning-bg dark:bg-yellow-950 border-feedback-warning-border dark:border-yellow-800 text-feedback-warning dark:text-yellow-400">
                        {t('config.nllbWarnNotReady')}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <SaveBar saving={savingAppConfig} saved={appConfigSaved} onSave={handleSaveAppConfig} t={t} />
            </>
          )}

        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">{children}</h2>
  )
}

function SaveBar({
  saving,
  saved,
  onSave,
  t,
}: {
  saving: boolean
  saved: boolean
  onSave: () => void
  t: (key: string) => string
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onSave}
        disabled={saving}
        aria-busy={saving}
        className="px-4 py-2 text-sm rounded-lg bg-brand text-white hover:bg-brand-hover disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand"
      >
        {saving ? t('config.saving') : t('config.save')}
      </button>
      {saved && (
        <p className="text-xs text-feedback-success dark:text-green-400" role="status" aria-live="polite">
          {t('config.saved')}
        </p>
      )}
    </div>
  )
}

function NllbStatusItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className={ok ? 'text-feedback-success dark:text-green-400' : 'text-feedback-error dark:text-red-400'}>
        {ok ? '✓' : '✗'}
      </span>
      <span className="text-gray-600 dark:text-zinc-400">{label}</span>
    </li>
  )
}

function ConfigRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="px-5 py-3 flex justify-between items-center">
      <span className="text-sm text-gray-500 dark:text-zinc-400">{label}</span>
      <span
        className={`text-sm font-medium font-mono-data ${
          warn ? 'text-feedback-error dark:text-red-400' : value ? 'text-gray-900 dark:text-zinc-100' : 'text-gray-400 dark:text-zinc-500'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

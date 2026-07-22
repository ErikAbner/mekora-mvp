import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes } from 'react-router-dom'
import { getAppConfig } from './api/client'
import { useTheme } from './contexts/ThemeContext'
import Layout from './components/Layout'
import AnalysisPage from './pages/AnalysisPage'
import ComicReviewPage from './pages/ComicReviewPage'
import ComicOverlayPage from './pages/ComicOverlayPage'
import ComicFinalizePage from './pages/ComicFinalizePage'
import ComicFinishPage from './pages/ComicFinishPage'
import ComicConsistencyPage from './pages/ComicConsistencyPage'
import ComicExportPage from './pages/ComicExportPage'
import ConfigPage from './pages/ConfigPage'
import HistoryPage from './pages/HistoryPage'
import BatchPage from './pages/BatchPage'
import MetricsPage from './pages/MetricsPage'
import UploadPage from './pages/UploadPage'

export default function App() {
  const { i18n } = useTranslation()
  const { setTheme } = useTheme()

  useEffect(() => {
    getAppConfig()
      .then((cfg) => {
        if (cfg.ui_language) i18n.changeLanguage(cfg.ui_language)
        if (cfg.ui_theme === 'dark' || cfg.ui_theme === 'light') setTheme(cfg.ui_theme)
      })
      .catch(() => {})
  }, [i18n, setTheme])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/analyze/:id" element={<AnalysisPage />} />
        <Route path="/review/:id" element={<ComicReviewPage />} />
        <Route path="/overlay/:id" element={<ComicOverlayPage />} />
        <Route path="/finalize/:id" element={<ComicFinalizePage />} />
        <Route path="/finish/:id" element={<ComicFinishPage />} />
        <Route path="/consistency/:id" element={<ComicConsistencyPage />} />
        <Route path="/export/:id" element={<ComicExportPage />} />
        <Route path="/batch" element={<BatchPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

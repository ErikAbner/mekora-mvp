import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getPipelineState } from '../api/client'
import type { PipelineStateResponse } from '../types'

/**
 * Estado do pipeline comic para gating da sidebar e das páginas de etapa.
 * Refaz o fetch ao trocar de rota (etapas concluídas mudam o estado).
 * Retorna null enquanto carrega ou se o job não existe/não é comic.
 */
export function useComicPipelineState(jobId: string | null, isComic: boolean) {
  const { pathname } = useLocation()
  const [state, setState] = useState<PipelineStateResponse | null>(null)
  const [notFound, setNotFound] = useState(false)

  const refresh = useCallback(() => {
    if (!jobId || !isComic) {
      setState(null)
      return
    }
    getPipelineState(Number(jobId))
      .then((s) => {
        setState(s)
        setNotFound(false)
      })
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true)
        setState(null)
      })
  }, [jobId, isComic])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, pathname])

  return { pipelineState: state, jobNotFound: notFound, refresh }
}

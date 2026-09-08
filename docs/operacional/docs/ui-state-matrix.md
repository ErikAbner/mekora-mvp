# UI State Matrix

> **HISTÓRICO — não descreve o Mekora de hoje.**
>
> Este arquivo veio do `Kindle Local Tool` e foi preservado na fusão dos
> repositórios. Ele descreve uma árvore (`frontend/`, Vitest, `cd
> kindle-local-tool`) que **este repositório não tem**, e comandos daqui não
> funcionam. Serve como origem de uma ideia, nunca como fonte de regra em vigor
> — a mesma regra do `archive/`.
>
> O estado vigente está em [`../README.md`](../README.md).

Todos os estados que superfícies assíncronas precisam representar. Uma tela **completa** trata os estados aplicáveis; quando um estado não faz sentido, marcar N/A com justificativa.

## Vocabulário de estados

| Estado | Significado |
|---|---|
| `initial` | Antes de qualquer requisição (mount). |
| `loading` | Requisição em andamento; ainda não sabemos se vai ter dado. |
| `queued` | Operação registrada mas ainda não começou (raro; no atual `progress_service` só existe `running`). |
| `processing` | Operação em execução. |
| `progress-known` | `progress.total` conhecido → mostrar percentual e "N/M". |
| `progress-indeterminate` | `progress.total = null` → barra animada + mensagem real; **sem inventar percentual**. |
| `success` | Operação concluída, artefato válido. |
| `partial-success` | Operação terminou mas com avisos/páginas com erro (registrados no manifest). |
| `empty` | Dado esperado inexistente (histórico vazio, sem métricas etc.). |
| `blocked` | Pré-requisito faltante — CTA para a etapa que resolve. |
| `warning` | Estado normal com aviso não bloqueante. |
| `recoverable-error` | Erro que o usuário pode contornar (retry, mudar parâmetro, instalar dep). |
| `fatal-error` | Erro que exige intervenção fora do app (banco corrompido etc.). |
| `cancelled` | Usuário cancelou a operação (cooperativo). |
| `interrupted` | Backend reiniciou durante a operação; artefatos parciais preservados. Nunca 409 eterno. |
| `dependency-missing` | Dependência local ausente (KCC, Tesseract, Ghostscript, Argos package etc.). |
| `offline` | Sem SMTP alcançável / sem rede quando aplicável. |

## Convenções para todas as superfícies assíncronas

- **Nunca inventar percentual**: `progress-indeterminate` obrigatoriamente sem número.
- **Mensagens**: humanas, com o que aconteceu + próxima ação. Sem stack trace.
- **CTA**: sempre presente em `blocked`, `recoverable-error`, `dependency-missing`, `interrupted`, `pending`.
- **Cancelamento**: disponível apenas quando `active_operation` existe E a operação é cooperativa (não KCC/Calibre/OCR externos).
- **Retry**: disponível em `recoverable-error` e `interrupted`; em `fatal-error` só sugerir contato/procedimento externo.
- **Dados mínimos exigidos do backend**: `phase` derivada + `progress` opcional + `error_message` humanizado.

---

## Matrizes por superfície

### AnalysisPage — bloco Tradução (documento e comic)

| Estado | Aplica | Mensagem | Info mínima | CTA | Cancelar? | Retry? | Próxima ação | Dados backend |
|---|---|---|---|---|---|---|---|---|
| initial | ✓ | "Escolha o par de idiomas." | idiomas suportados por engine | "Iniciar tradução" | — | — | disparar | `GET /translation/engines` |
| loading | ✓ | "Verificando disponibilidade…" | spinner | — | — | — | — | idem |
| processing | ✓ | "Traduzindo…" | tempo decorrido | — | ✓ | — | aguardar | `progress` do polling |
| progress-known | ✓ | "Traduzindo página X de N" | N/M + % | — | ✓ | — | aguardar | `progress.current/total/percent` |
| progress-indeterminate | ✓ (chunks de doc) | "Processando (sem estimativa)" | tempo decorrido | — | ✓ | — | aguardar | `progress.total=null` |
| success | ✓ | "Tradução concluída." | link de download HTML | "Continuar" | — | — | seguir para conversão | `translated_artifact_path` |
| partial-success | N/A | (o loop trata erros por página como registros; sem estado próprio) | — | — | — | — | — | — |
| blocked | ✓ | "Par de idiomas indisponível — instale o pacote." | par escolhido | "Ver instruções" (docs) | — | — | resolver dep | `engines.pairs` |
| recoverable-error | ✓ | mensagem humana (engine falhou/timeout do polling) | banner | "Tentar novamente" | — | ✓ | — | `translation_error` |
| interrupted | ✓ | "O processamento foi interrompido pela reinicialização do aplicativo. Você pode tentar novamente." | — | "Tentar novamente" | — | ✓ | — | `progress.status="interrupted"` |
| dependency-missing | ✓ | "Argos/NLLB não instalado." | qual dep | "Ver Configurações" | — | — | ConfigPage | `engines.installed` |
| offline | N/A | (tradução é local) | — | — | — | — | — | — |

### AnalysisPage — bloco Conversão (documento)

| Estado | Aplica | Mensagem | Info mínima | CTA | Cancelar? | Retry? | Próxima ação | Dados backend |
|---|---|---|---|---|---|---|---|---|
| initial | ✓ | "Converter para EPUB" | — | "Converter" | — | — | disparar | `job.status` |
| processing | ✓ | "Convertendo via Calibre (sem estimativa)" | tempo decorrido | — | — (externo) | — | aguardar | `progress` indeterminado |
| success | ✓ | "EPUB pronto." | link download | "Enviar ao Kindle" | — | — | envio | `epub_path`, `conversion_status="done"` |
| blocked (OCR falhou) | ✓ | "Conversão bloqueada: o OCR falhou. Sem OCR o EPUB sairia sem texto pesquisável." | como resolver | "Ver Histórico → duplicar job" | — | — | duplicar | `ocr_status="failed"`, `is_scanned=true`, `ocr_used=false` |
| recoverable-error | ✓ | mensagem pública do subprocess_runner | detalhe em <details> | "Tentar novamente" | — | ✓ | — | `error_message` |
| dependency-missing | ✓ | "Calibre não encontrado." | como instalar | "Ver Configurações" | — | — | ConfigPage | (v1.2.2 helper devolve TOOL_NOT_FOUND) |

### AnalysisPage — bloco Tradução comic

| Estado | Aplica | Mensagem | Info mínima | CTA | Cancelar? | Retry? |
|---|---|---|---|---|---|---|
| initial | ✓ | "Selecione par e comece." | idiomas + aviso experimental | "Iniciar tradução" | — | — |
| processing (com progress) | ✓ | "Traduzindo página X de N" | N/M | — | ✓ | — |
| success | ✓ | "Tradução concluída." | download JSON/HTML + CTA Revisão | "Ir para Revisão" | — | — |
| dependency-missing (tesseract/argos) | ✓ | conforme dep | qual dep | "Ver Configurações" | — | — |
| interrupted | ✓ | mensagem padrão | — | "Tentar novamente" | — | ✓ |

### AnalysisPage — painel Modo Recomendado (comic)

| Estado | Aplica | Mensagem | Info mínima | CTA | Cancelar? |
|---|---|---|---|---|---|
| initial | ✓ | resumo do preflight | idiomas, engine, etapas a rodar/reaproveitar, aviso auto-approve, nota "nada será exportado sem confirmação" | "Confirmar e executar pipeline" | — |
| blocked (preflight crítico falhou) | ✓ | lista de checks com `critical=true` que falharam | motivos | corrigir cada dep e reabrir preflight | — |
| processing | ✓ | mensagem da etapa (`quick_pipeline`) | etapa 1/5 … 5/5 | — | ✓ |
| success | ✓ | "Pipeline concluído! Páginas prontas para exportar." | resumo | "Revisar e exportar" (→ /export) | — |
| recoverable-error | ✓ | mensagem humana | — | "Tentar novamente" | — |
| interrupted | ✓ | padrão | — | "Tentar novamente" | — |

### ComicReviewPage

| Estado | Aplica | Mensagem | CTA |
|---|---|---|---|
| loading | ✓ | spinner | — |
| success | ✓ | lista de blocos | Salvar / Exportar |
| blocked | ✓ | "Revisão não disponível — tradução comic não foi concluída." | "Ir para tradução" |
| recoverable-error | ✓ | banner | "Tentar novamente" |
| empty | ✓ | "Sem blocos detectados nesta página." | continuar |

### ComicOverlayPage

| Estado | Aplica | Mensagem | CTA |
|---|---|---|---|
| loading | ✓ | spinner + skeleton | — |
| processing (render/inpaint) | ✓ | "Renderizando página X de N" (progress-known) | — |
| success | ✓ | comparação antes/depois | Baixar ZIP/CBZ / Ir para Curadoria |
| blocked | ✓ | "Requer tradução comic concluída." | CTA anterior |
| dependency-missing (OpenCV para inpaint) | ✓ | "Inpaint em modo blur (OpenCV não instalado)" | continuar (fallback ok) ou instalar |
| recoverable-error | ✓ | banner | "Tentar novamente" |

### ComicFinalizePage

| Estado | Aplica | Mensagem | CTA |
|---|---|---|---|
| initial | ✓ | grade sem seleção | "Inicializar curadoria" (POST) |
| processing (export) | ✓ | "Exportando N páginas…" | — |
| success | ✓ | "N páginas exportadas." | Baixar ZIP/CBZ/PDF / Ir para Acabamento / Ir para Exportar |
| partial-success | ✓ | "Exportadas X de N; Y páginas com erro." | ver erros por página |
| warning (variante indisponível na página) | ✓ | badge por página | escolher outra variante |
| blocked | ✓ | "Requer overlay inicializado." | CTA anterior |

### ComicFinishPage

| Estado | Aplica | Mensagem | CTA |
|---|---|---|---|
| initial | ✓ | preset padrão | "Inicializar acabamento" |
| processing (export) | ✓ | "Aplicando ajustes…" | — |
| success | ✓ | "Páginas finalizadas." | Continuar → Consistência ou Exportar |
| warning (análise de layout) | ✓ | lista de issues | corrigir por página / auto-fix |
| blocked | ✓ | "Requer Curadoria Final exportada." | CTA anterior |

### ComicConsistencyPage

| Estado | Aplica | Mensagem | CTA |
|---|---|---|---|
| initial | ✓ | "Nada analisado ainda." | "Analisar" |
| processing | ✓ | "Analisando páginas…" | — |
| success | ✓ | scores por dimensão | aplicar harmonização (opcional) |
| warning (outliers) | ✓ | badges | ajustar/excluir da harmonização |
| empty | ✓ | "Sem páginas para analisar." | — |

### ComicExportPage

| Estado | Aplica | Mensagem | Info mínima | CTA | Retry? |
|---|---|---|---|---|---|
| loading | ✓ | spinner + skeleton do resumo | — | — | — |
| initial (fonte pronta, sem export) | ✓ | "Gerar EPUB final" | resumo (fonte + páginas + translation_state + metadados) | "Gerar EPUB final" | — |
| processing | ✓ | "Montando CBZ / Convertendo via KCC" | tempo decorrido | — (KCC externo) | — |
| success | ✓ | "Export concluído." | downloads EPUB/CBZ + botão "Enviar ao Kindle" | Enviar | — |
| warning (>50 MB) | ✓ | "O EPUB passou de 50 MB — envio ao Kindle pode ser rejeitado." | tamanho | continuar | — |
| blocked | ✓ | "Export bloqueado por pré-requisito." | motivo + `next_step` | "Ir para etapa pendente" | — |
| recoverable-error (409 estruturado) | ✓ | payload.message | — | seguir `next_step` | — |
| interrupted | ✓ | "Processamento continua no backend." | último progresso | "Reconectar" | ✓ (soft) |
| dependency-missing (KCC) | ✓ | "KCC não encontrado no PATH." | como instalar | "Ver Configurações" | — |
| notComic | ✓ | "Este job não está em modo quadrinhos." | — | "Ir para Análise" | — |
| jobNotFound (404) | ✓ | "Este job não existe mais." | — | "Voltar ao início" | — |

### ComicExportPage — envio ao Kindle

| Estado | Mensagem | CTA |
|---|---|---|
| success | "Enviado ao Kindle com sucesso!" | — |
| warning (503 pending) | "Sem conexão SMTP — arquivo em envios pendentes." | Ver Histórico |
| recoverable-error (409 COMIC_EXPORT_REQUIRED) | payload.message | — |
| fatal-error (credencial 500) | mensagem fixa | Ver Configurações |

### HistoryPage

| Estado | Aplica | Mensagem | CTA |
|---|---|---|---|
| loading | ✓ | spinner | — |
| success | ✓ | tabela | por linha: abrir/duplicar/retry send/aplicar preset |
| empty | ✓ | "Sem jobs ainda." | "Novo upload" |
| recoverable-error | ✓ | banner | "Tentar novamente" |

### BatchPage

| Estado | Aplica | Mensagem | CTA |
|---|---|---|---|
| initial | ✓ | filtros + lista vazia | — |
| loading | ✓ | spinner na tabela | — |
| processing | ✓ | "Executando ação em N itens…" | — |
| partial-success | ✓ | "X sucesso, Y erros, Z ignorados." | ver detalhes por item |
| empty | ✓ | "Nenhum job corresponde aos filtros." | ajustar filtros |
| recoverable-error | ✓ | banner por item | reexecutar filtrando erros |

### MetricsPage

| Estado | Aplica | Mensagem |
|---|---|---|
| loading | ✓ | skeleton dos cards |
| success | ✓ | KPIs + tabela + falhas |
| empty | ✓ | "Sem dados ainda. Complete uma conversão para ver métricas aqui." |
| recoverable-error | ✓ | banner |

### ConfigPage

| Estado | Aplica | Mensagem |
|---|---|---|
| loading | ✓ | skeleton |
| success (por seção) | ✓ | forma editável / status |
| success (teste SMTP) | ✓ | "Autenticação SMTP bem-sucedida." |
| recoverable-error (SMTP) | ✓ | mensagem fixa por categoria (401/502/503/400) |
| dependency-missing (NLLB modelo) | ✓ | "Modelo não encontrado. Rode setup_nllb.py." |

---

## Estados globais (aplicáveis a qualquer tela)

| Estado | Superfície | Comportamento |
|---|---|---|
| Polling connection lost | AnalysisPage, ComicExportPage | Após 3 falhas seguidas: banner amarelo "Sem resposta do backend. Reconectando…"; polling continua tentando. |
| Job fantasma no localStorage | Layout/Sidebar | Ao carregar, validar via `GET /jobs/{id}/status`; se 404, limpar `lastComicId/lastJobType/lastComicName`. |
| Operação órfã pós-restart | Todas | `check_active_operation` marca como `interrupted`; UI mostra mensagem padrão + Retry. |
| Toast de confirmação | Todas | Para ações destrutivas (delete/reset) e para envios ao Kindle bem-sucedidos. |

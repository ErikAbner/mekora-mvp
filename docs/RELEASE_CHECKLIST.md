# Release Checklist — Kindle Local Tool

Checklist de validação manual ponta a ponta antes de marcar como Release Candidate.

Marque cada item com `[x]` após validar. Um item `[ ]` indica bloqueador se for crítico, ou apenas nota se for opcional.

---

## A. Setup e Infraestrutura

- [ ] `./install.sh` executa sem erros em macOS limpo
- [ ] `./install.sh` instala `sevenzip` (`7zz`) automaticamente quando ausente
- [ ] `./start.sh` sobe backend (8000) + frontend (5173) sem erros
- [ ] `./start.sh --prod` compila frontend e serve tudo em 8000
- [ ] `docker compose up --build` sobe e responde em `http://localhost:8000`
- [ ] `GET /health` retorna `{"status": "ok"}`
- [ ] Interface carrega em PT-BR por padrão
- [ ] Trocar idioma para EN-US funciona e persiste no reload
- [ ] Trocar tema claro↔escuro funciona e persiste no reload

---

## B. Pipeline de Documentos

- [ ] Upload de PDF textual (não escaneado) funciona
- [ ] Análise detecta corretamente `is_scanned=false` e exibe metadados
- [ ] Upload de PDF escaneado: análise detecta `is_scanned=true`
- [ ] OCR executa e cria `processed_pdf_path`
- [ ] Edição de metadados (título, autor, idioma) salva corretamente
- [ ] Seleção de capa por thumbnail funciona
- [ ] Conversão PDF → EPUB executa e cria `epub_path`
- [ ] Download do EPUB está disponível após conversão
- [ ] Envio ao Kindle via SMTP funciona (requer `.env` configurado)
- [ ] Envio pendente é criado quando sem conectividade SMTP
- [ ] Retry de envio pendente funciona

---

## C. Tradução de Documentos

- [ ] Tradução com Argos Translate executa (requer `pip install argostranslate`)
- [ ] Tradução com NLLB-200 executa (requer modelo baixado)
- [ ] Seletor de motor (argos/nllb) na página de análise funciona
- [ ] Status de modelos NLLB exibe corretamente em Configurações

---

## D. Pipeline de Quadrinhos — Tradução

- [ ] Upload de PDF comic + toggle "Tratar como quadrinho" → `processing_mode=comic`
- [ ] Upload de CBZ/CBR nativo → `processing_mode=comic` automático (sem toggle)
- [ ] Upload de CBZ converte via KCC sem erro "7zz is missing" (requer `brew install sevenzip`)
- [ ] `POST /jobs/{id}/comic-translation` executa OCR+tradução por página
- [ ] Link "Ir para Revisão" aparece após tradução
- [ ] Sidebar contextual mostra etapas de produção (Review/Overlay/etc.) após job aberto
- [ ] Sidebar sem job ativo mostra "Nenhum job ativo" e etapas desabilitadas
- [ ] Trocar de job document → comic → document atualiza a sidebar corretamente

---

## E. Revisão Humana da Tradução

- [ ] `ComicReviewPage` carrega sidecar com blocos `pending`
- [ ] Edição de texto traduzido salva com status `edited`
- [ ] Botões approve/skip funcionam
- [ ] Barra de progresso reflete estado de revisão
- [ ] Export JSON+HTML da revisão disponível

---

## F/G. Overlay Visual

- [ ] `ComicOverlayPage` renderiza imagens de página com caixas posicionadas
- [ ] Drag-and-drop repositiona bloco corretamente
- [ ] Painel de estilo: font_size, text_align, bg_opacity, text_color, border_color salvam
- [ ] 5 presets de estilo rápido (Texto Limpo, Manga Branco, etc.) aplicam ao bloco selecionado
- [ ] Toggle de visibilidade de bloco funciona
- [ ] Export HTML navegável disponível

---

## H. Renderização

- [ ] `POST /jobs/{id}/comic-render` cria PNGs em `rendered_pages/`
- [ ] Comparação lado a lado original × renderizado visível na página
- [ ] Re-renderização após ajuste de estilo funciona
- [ ] Originais **não** modificados (`pages/` intactos)

---

## I. Inpainting + Curadoria

- [ ] `POST /jobs/{id}/comic-inpaint` executa (com PIL fallback se sem OpenCV)
- [ ] Comparação 3 vias (original | render | inpaint) visível
- [ ] `ComicFinalizePage` carrega e exibe variantes por página
- [ ] Seleção manual de variante por página salva
- [ ] Sugestões automáticas exibem score de confiança e motivos
- [ ] "Aplicar sugestões" em lote funciona
- [ ] Export ZIP + CBZ do finalize disponível
- [ ] Manifesto `comic_final_export_manifest.json` gerado após export

---

## J. Batch e Presets

- [ ] `BatchPage` lista jobs com filtros (status, modo)
- [ ] Multi-seleção e ação em lote (aplicar preset, export) funcionam
- [ ] CRUD de presets: criar, editar, duplicar, deletar
- [ ] 6 presets do sistema listados e não deletáveis
- [ ] Presets recentes visíveis como chips no BatchPage

---

## K. Acabamento Visual (Finish)

- [ ] `ComicFinishPage` carrega com dropdown de presets
- [ ] 8 presets disponíveis (none, clean_manga_bw, manga_bw_high_contrast, comic_caption_box, soft_subtitle_box, high_contrast_overlay, subtitle_minimal, dense_text_compact)
- [ ] Ajuste manual por página (sliders contrast/brightness/sharpness/saturation) salva
- [ ] Export ZIP/CBZ/PDF de `finished_pages/` disponível
- [ ] Originais e `final_pages/` **não** modificados

---

## L. Consistência Visual

- [ ] `ComicConsistencyPage` carrega com `GET /jobs/{id}/comic-consistency`
- [ ] "Analisar consistência" gera `consistency_score` e lista de páginas
- [ ] Score paramétrico exibido (barra colorida)
- [ ] "Analisar visualmente" (Fase P.A) gera `consistency_score_visual` e `consistency_score_combined`
- [ ] Outliers paramétricos marcados com badge vermelho
- [ ] Outliers visuais marcados com badge laranja
- [ ] Harmonização aplica `suggested_global_style` nas páginas não-outlier
- [ ] Toggle "Marcar manual" / "Excluir da harmonização" por página funciona
- [ ] Preview miniatura visível quando `preview_path` disponível
- [ ] Botão "Comparar antes/depois" abre comparação inline (Fase Q)

---

## M. Recomendação de Preset

- [ ] "Recomendar preset" chama heurística e exibe preset + motivos + confidence
- [ ] Alternativas exibidas como chips
- [ ] "Aplicar preset" seta `global_preset` e exibe banner "Preset aplicado"
- [ ] "Resetar preset" reverte para `none`
- [ ] Páginas com override manual listadas como exceções

---

## N. Health e Repair

- [ ] `GET /jobs/{id}/health` retorna checks, manifests_present, recommended_next_action
- [ ] Job com erro retorna `is_healthy=false`
- [ ] `POST /jobs/{id}/repair` remove locks vazios e renomeia JSONs inválidos
- [ ] `JobHealthPanel` exibe resultado visualmente

---

## O. Métricas

- [ ] `MetricsPage` carrega e exibe cards de resumo
- [ ] Tabela de desempenho por etapa (avg, p95) visível
- [ ] Lista de falhas recentes visível

---

## P. Histórico e Ergonomia

- [ ] `HistoryPage` lista todos os jobs com busca e ordenação
- [ ] CTA inteligente por linha (botão correto por estado do job)
- [ ] Duplicar job cria novo com status `uploaded`
- [ ] Atalhos de teclado `g h/n/b/m` navegam entre páginas
- [ ] `?` abre painel de atalhos
- [ ] `Esc` fecha painel de atalhos

---

## Q. Testes Automatizados

- [ ] `pytest backend/tests/ -q` → ~393 passed, 0 errors
- [ ] `cd frontend && npm test` → ~167 passed, 0 errors
- [ ] `cd frontend && npm run build` → 0 TypeScript errors

---

## R. Documentação

- [ ] `README.md` reflete todas as fases implementadas
- [ ] `docs/TROUBLESHOOTING.md` cobre problemas conhecidos
- [ ] `docs/SMOKE_TESTS.md` lista cenários mínimos de validação
- [ ] `RELEASE_NOTES.md` resume capacidades e limitações
- [ ] `CHANGELOG.md` está atualizado até Fase R
- [ ] `http://localhost:8000/docs` lista todos os endpoints esperados

---

## Critério de RC

O projeto pode ser considerado **Release Candidate** quando:
- Todos os itens da seção Q (testes automatizados) estão marcados
- Todos os itens críticos das seções A–C (infraestrutura + documento) estão marcados
- Pelo menos os itens críticos das seções D–M (quadrinhos) funcionam sem erros fatais
- `docs/` completo e README atualizado

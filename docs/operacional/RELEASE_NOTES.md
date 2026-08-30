# Release Notes — Kindle Local Tool v1.1.0

**Data:** 2026-04-03
**Status:** Release Final

---

## Resumo do produto

Kindle Local Tool é uma ferramenta local de uso pessoal para:

1. **Documentos textuais** — Converter PDFs (incluindo escaneados via OCR) em EPUB e enviar diretamente ao Kindle físico via SMTP.

2. **Quadrinhos e mangás** — Pipeline completo de processamento: OCR por página, tradução automática (Argos/NLLB), revisão humana assistida, overlay visual interativo, renderização não-destrutiva, inpainting, curadoria de variantes, acabamento visual com presets, análise de consistência, recomendação de preset, e export em múltiplos formatos (ZIP/CBZ/PDF).

Sem IA generativa. Sem nuvem. Sem modificação de originais. Completamente reversível.

---

## Principais capacidades

### Documentos
- Upload + análise automática de PDF
- OCR com Tesseract via OCRmyPDF (para scans)
- Conversão PDF → EPUB via Calibre
- Tradução: Argos Translate (offline) ou NLLB-200 (600M / 1.3B)
- Envio direto ao Kindle via SMTP com detecção de conectividade

### Quadrinhos / Mangá
- OCR por página com extração de bboxes via pytesseract
- Tradução automática bloco a bloco
- Revisão humana com status por bloco (pending/approved/edited/skipped)
- Overlay visual com drag-and-drop, edição de estilo, 5 presets rápidos
- Renderização não-destrutiva em `rendered_pages/`
- Inpainting: OpenCV TELEA/NS com fallback PIL
- Curadoria: seleção de variante por página (original/render_overlay/inpaint)
- Sugestões automáticas com score de confiança explicável
- Export: ZIP, CBZ, PDF
- Acabamento visual: 8 presets PIL (contrast/brightness/sharpness/saturation)
- Análise de consistência: score paramétrico + visual + combinado
- Recomendação de preset por heurística explicável (saturação, contraste, brilho)
- Harmonização não-destrutiva de ajustes entre páginas

### Infraestrutura
- Operações em lote com filtros e ações
- CRUD de presets (6 presets de sistema + presets de usuário)
- Observabilidade: métricas de pipeline por etapa (avg, p95, falhas recentes)
- Duplicação de job, CTA inteligente por estado
- Atalhos de teclado globais (g h/n/b/m, ?, Esc)
- Health check + repair seguro por job
- Internacionalização PT-BR / EN-US
- Tema claro/escuro persistido
- Docker com volume persistente

---

## Mudanças desta versão (desde RC)

### Fechamento da pendência de ambiente
- **`sevenzip` (`7zz`) agora instalado automaticamente pelo `install.sh`** — KCC v9+ no macOS requer o binário `7zz` para extrair CBZ/CBR/CB7/CBC; o pacote `p7zip` (`7z`) não é suficiente
- CBZ nativo validado de ponta a ponta: upload → `processing_mode=comic` automático → análise → conversão KCC → EPUB gerado ✓

### UX unificada (pipeline contextual)
- **Removido toggle Documento/Comic** da sidebar — navegação é agora contextual por job ativo
- Sidebar mostra apenas etapas relevantes para o tipo de job (documento: só Análise; comic: pipeline completo)
- Indicador "Job ativo" sempre visível na seção Produção
- Troca de contexto entre jobs atualiza a sidebar imediatamente

### Correções de bug
- PDF aceito no modo comic do upload (alinhado com backend)
- `.zip` removido dos formatos comic aceitos no frontend (backend nunca aceitou)
- Mensagem de erro do KCC agora inclui o motivo real do processo (stdout)
- `processing_mode` toggle em AnalysisPage atualiza a sidebar sem necessitar de refresh

---

## Cobertura de testes

| Camada | Testes | Status |
|---|---|---|
| Backend (pytest) | ~393 | Todos passando |
| Frontend (Vitest) | ~173 | Todos passando |
| TypeScript build | 0 erros | ✓ |

---

## Limitações conhecidas e fora de escopo nesta versão

### Limitações técnicas
- **50 MB** máximo por arquivo (limite Amazon Send-to-Kindle)
- **Single-user** — sem autenticação, pensado para uso local pessoal
- Inpainting avançado requer OpenCV instalado separadamente (`pip install opencv-python`)
- NLLB-200 requer ~2–5 GB de espaço em disco para o modelo
- KCC (Kindle Comic Creator) deve ser instalado separadamente para conversão Kindle de quadrinhos
- Pipeline de quadrinhos otimizado para PDFs com páginas de imagem; PDFs mistos podem ter resultados variáveis

### Explicitamente fora de escopo
- IA generativa (sem GPT, sem difusão, sem embeddings)
- Presets de overlay de texto com propriedades avançadas (border_radius, max_width, line_height) — sistema separado para Fase Q+
- Agrupamento semântico de páginas por assinatura visual
- Presets de usuário para ajuste visual nomeado (CRUD de presets de imagem)
- Interface multi-usuário ou autenticação
- Telemetria externa ou analytics

---

## Fases implementadas (B–R)

| Fase | Capacidade |
|---|---|
| B | Tradução automática Argos/NLLB |
| C | Configuração NLLB no frontend |
| D | Tradução de quadrinhos OCR por página |
| E | Revisão humana assistida |
| F/G | Overlay visual + drag-drop + estilo |
| H | Renderização não-destrutiva |
| I.A | Inpainting experimental |
| I.B | Curadoria visual + export final |
| I.C | Sugestões automáticas explicáveis |
| J.A | Manifesto de rastreabilidade de export |
| K | Batch + CRUD de presets |
| L | Observabilidade e métricas |
| M | Ergonomia: duplicação, CTAs, atalhos |
| N.A | Acabamento visual: presets PIL |
| N.B | Acabamento layout-aware |
| O | Consistência visual global |
| P.A | Consistência visual por imagem real |
| P.B | Recomendação de preset explicável |
| Q | Health/repair, before/after inline, presets overlay |
| R | Docs, checklist, smoke tests, RC |

---

## Como validar esta RC

```bash
# 1. Setup
./start.sh --prod

# 2. Testes automatizados
source .venv/bin/activate
pytest backend/tests/ -q           # ~393 passed
cd frontend && npm test             # ~167 passed
npm run build                      # 0 errors

# 3. Smoke tests manuais
# Ver: docs/SMOKE_TESTS.md

# 4. Checklist de release
# Ver: docs/RELEASE_CHECKLIST.md
```

---

## Próximos passos (pós-RC)

- Presets de overlay avançados (border_radius, max_width, line_height)
- Interface multi-idioma expandida (espanhol, japonês)
- Agrupamento semântico de páginas
- Presets de ajuste visual nomeados e gerenciáveis pelo usuário
- Comparação histórica de runs de análise de consistência

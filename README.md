# Kindle Local Tool

Ferramenta local para converter PDFs em EPUB e enviá-los ao Kindle físico, com pipeline completo para **documentos textuais** e para **quadrinhos/mangás** (OCR + tradução + overlay visual + export).

---

## Modos de uso

### Modo Documento
Upload → Análise → (OCR) → Conversão EPUB → Envio Kindle

### Modo Quadrinhos/Mangá
Ordem canônica (v1.2.0): Upload → Análise → Tradução → Revisão → Overlay → Curadoria Final → Acabamento → Consistência → **Exportar** (etapa própria em `/export/{id}`).

Dois caminhos:
- **Recomendado** (padrão para jobs novos): preflight validado + confirmação → tradução, revisão auto-aprovada, overlay, render e curadoria automáticos → confirmação final na etapa Exportar. Alternar para o Avançado nunca perde trabalho.
- **Avançado**: controle manual completo de todas as etapas (revisão bloco a bloco, drag-and-drop de overlay, inpainting, curadoria por página, acabamento, consistência).

O export final monta um CBZ validado a partir das páginas visuais finalizadas (`finished_pages`/`final_pages`) e gera o EPUB via KCC com metadados — **nunca** usa o arquivo original como fallback. O envio ao Kindle de um comic com tradução exige o export final concluído (o EPUB do original não é enviado).

---

## Funcionalidades

### Pipeline de Documentos
- Upload de PDF via interface web
- Detecção automática de PDFs escaneados + OCR (Tesseract via OCRmyPDF)
- Conversão PDF → EPUB (Calibre)
- Edição de metadados (título, autor, idioma, nome do arquivo)
- Seleção de capa a partir das primeiras páginas
- Envio do EPUB ao Kindle por e-mail (SMTP + STARTTLS)
- Tradução automática: Argos Translate (offline) ou NLLB-200 (600M / 1.3B)

### Pipeline de Quadrinhos/Mangá
- Tradução OCR por página com extração de bboxes (pytesseract opcional)
- Revisão humana assistida bloco a bloco com status (pending/approved/edited/skipped)
- Overlay visual interativo com drag-and-drop e edição de estilo por bloco
- 5 presets rápidos de estilo de overlay (Texto Limpo, Manga Branco, Legenda Caixa, Alto Contraste, Legenda Suave)
- Renderização não-destrutiva das páginas com overlay traduzido (Pillow)
- Inpainting experimental (OpenCV TELEA/NS ou PIL fallback)
- Curadoria semi-automática: seleção de variante por página (original/render_overlay/inpaint)
- Sugestões automáticas explicáveis com score de confiança
- Export ZIP + CBZ + PDF (por etapa) e **Export final EPUB+CBZ** com manifest de proveniência por página (`translation_state`: full/partial/none/not_applicable)
- Modo Recomendado com preflight (engine, idiomas, OCR, KCC, disco, operação ativa) e progresso por página
- Acabamento visual: 8 presets de ajuste (contrast/brightness/sharpness/saturation), aplicação por página ou global
- Análise de consistência visual global: score paramétrico + score visual por PIL + score combinado
- Recomendação de preset visual explicável por heurística (sem IA)
- Comparação antes/depois inline por página

### Infraestrutura e Ergonomia
- Histórico completo com busca e ordenação
- Operações em lote (batch) com filtros e ações
- CRUD de presets reutilizáveis (6 presets de sistema + presets de usuário)
- Observabilidade: métricas de pipeline por etapa (avg, p95, falhas)
- Duplicação de job, CTA inteligente por estado, atalhos de teclado
- Health check e repair por job (`GET /jobs/{id}/health`, `POST /jobs/{id}/repair`)
- Envios pendentes com retry (detecta conectividade SMTP antes de falhar)
- Internacionalização PT-BR / EN-US, tema claro/escuro
- Docker com volume persistente

---

## Requisitos

| Dependência | Versão mínima | Instalação (macOS) |
|---|---|---|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| Calibre | qualquer | `brew install calibre` |
| Tesseract | 5+ | `brew install tesseract tesseract-lang` |
| Ghostscript | qualquer | `brew install ghostscript` |
| sevenzip (`7zz`) | qualquer | `brew install sevenzip` — **obrigatório para CBZ/CBR nativos** |

> **Atenção macOS:** KCC requer o binário `7zz` (pacote `sevenzip`), não `7z` (pacote `p7zip`). São pacotes diferentes. O `install.sh` instala o correto automaticamente. PDFs em modo comic **não** precisam de `7zz`.

**Opcionais (melhoram o pipeline de quadrinhos):**
- `pip install argostranslate` — tradução offline sem rede
- Modelo NLLB-200: baixado automaticamente na primeira tradução se habilitado em Configurações
- KCC (Kindle Comic Creator): `pip install kindlecomicconverter` — necessário para conversão de quadrinhos
- OpenCV (`pip install opencv-python`): melhora qualidade do inpainting

---

## Instalação rápida (macOS, sem Docker)

```bash
chmod +x install.sh
./install.sh
```

O script verifica e instala Calibre, Tesseract, Ghostscript e `sevenzip` (`7zz`) via Homebrew, configura o `.venv`, compila o frontend e cria o alias `kindle-tool`.

Após a instalação (em novo terminal):
```bash
kindle-tool   # inicia em http://localhost:8000
```

## Docker

```bash
cp .env.example .env   # configure com suas credenciais SMTP
docker compose up --build
```

Acesse em: **http://localhost:8000** — arquivos persistidos em `./storage`.

## Modo desenvolvimento

```bash
cp .env.example .env
chmod +x start.sh
./start.sh
# Backend: http://localhost:8000/docs
# Frontend: http://localhost:5173
```

## Modo produção (servidor único)

```bash
./start.sh --prod   # build + serve na porta 8000
```

---

## Configuração

### Arquivo `.env`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu@gmail.com
SMTP_PASS=sua_senha_de_app
KINDLE_EMAIL=seu@kindle.com
```

Para Gmail: gere uma **senha de app** em Conta Google → Segurança → Senhas de app.
Certifique-se de que o endereço Gmail está aprovado como remetente no painel Amazon Kindle.

### `storage/config.json` (via interface em Configurações)

```json
{
  "ocr_languages": ["por", "eng"],
  "retention_days": 30,
  "ui_language": "pt",
  "ui_theme": "light"
}
```

---

## Arquitetura resumida

```
kindle-local-tool/
├── backend/
│   ├── app/
│   │   ├── api/          # 18 routers FastAPI
│   │   ├── services/     # lógica pura de negócio (20+ serviços)
│   │   ├── models/       # ORM SQLAlchemy (ProcessingJob, StageMetric, Preset)
│   │   └── schemas/      # Pydantic schemas
│   └── tests/            # pytest (~393 testes)
├── frontend/
│   ├── src/
│   │   ├── pages/        # 11 páginas React
│   │   ├── components/   # Button, Banner, StatusBadge, Layout, JobHealthPanel, ...
│   │   ├── api/          # client.ts (axios, ~70 funções)
│   │   ├── types/        # index.ts (todos os tipos TypeScript)
│   │   └── locales/      # pt + en (i18n)
│   └── tests/            # Vitest (~167 testes)
├── storage/              # output/, input/, temp/, covers/, logs/
├── docs/                 # checklist, smoke tests, troubleshooting
└── start.sh / install.sh / docker-compose.yml
```

**Stack:** FastAPI + SQLite + SQLAlchemy | React + Vite + TypeScript + Tailwind + React Router | Pillow + OCRmyPDF + Calibre

---

## Endpoints da API

Documentação interativa completa em: **`http://localhost:8000/docs`**

Grupos principais:

| Grupo | Prefixo | Descrição |
|---|---|---|
| Core | `/upload`, `/analyze`, `/jobs` | Upload, análise, status, metadados |
| Tradução | `/jobs/{id}/translate`, `/translation` | Argos, NLLB, status de modelos |
| Quadrinhos — tradução | `/jobs/{id}/comic-translation` | OCR+tradução por página |
| Quadrinhos — revisão | `/jobs/{id}/comic-translation/review` | Revisão humana |
| Quadrinhos — overlay | `/jobs/{id}/comic-overlay` | Overlay visual, estilo, drag-drop |
| Quadrinhos — render | `/jobs/{id}/comic-render` | Renderização não-destrutiva |
| Quadrinhos — inpaint | `/jobs/{id}/comic-inpaint` | Inpainting experimental |
| Quadrinhos — curadoria | `/jobs/{id}/comic-finalize`, `/comic-suggestions` | Seleção de variante |
| Acabamento | `/jobs/{id}/comic-finish` | Presets visuais, export |
| Consistência | `/jobs/{id}/comic-consistency` | Score, outliers, harmonização |
| Preset rec. | `/jobs/{id}/comic-preset-recommendation` | Recomendação explicável |
| Batch | `/batch/*` | Operações em lote |
| Presets | `/presets` | CRUD presets reutilizáveis |
| Métricas | `/metrics/*` | Observabilidade do pipeline |
| Health | `/health`, `/jobs/{id}/health`, `/jobs/{id}/repair` | Status + repair |
| Config | `/app-config`, `/config` | Configurações |

---

## Executar testes

```bash
# Backend (393 testes)
cd kindle-local-tool
source .venv/bin/activate
pytest backend/tests/ -q

# Frontend (167 testes)
cd frontend
npm test
```

---

## Fases implementadas

| Fase | Descrição |
|---|---|
| 1–3 | Estrutura base, upload, análise de PDF, metadados |
| 4 | OCR automático (OCRmyPDF + Tesseract) |
| 5 | Conversão PDF → EPUB (Calibre) |
| 6 | Envio EPUB ao Kindle (SMTP) |
| 7 | Processamento assíncrono, polling, limpeza |
| 8 | Build unificado, pytest, packaging |
| 9 | Design system, acessibilidade, Docker |
| 10–11 | i18n PT-BR/EN-US, tema claro/escuro |
| 12 | Detecção de conectividade SMTP, envios pendentes |
| B | Tradução automática (Argos Translate / NLLB-200) |
| C | Painel de configuração NLLB no frontend |
| D | Pipeline de tradução de quadrinhos (OCR+tradução por página) |
| E | Revisão humana assistida da tradução |
| F | Overlay visual experimental (viewer + drag-and-drop) |
| G | Posicionamento visual interativo, painel de estilo por bloco |
| H | Renderização não-destrutiva (Pillow) |
| I.A | Inpainting experimental (OpenCV TELEA/NS + PIL fallback) |
| I.B | Curadoria visual + export final (ZIP/CBZ) |
| I.C | Sugestões automáticas com score explicável |
| J.A | Manifesto de rastreabilidade de export |
| K | CRUD de presets + operações em lote avançadas |
| L | Observabilidade: métricas de pipeline por etapa |
| M | Ergonomia: duplicação, CTA inteligente, atalhos de teclado |
| N.A | Acabamento visual: 8 presets PIL, export ZIP/CBZ/PDF |
| N.B | Acabamento layout-aware com análise heurística |
| O | Consistência visual global: score paramétrico, outliers Tukey |
| P.A | Consistência visual por imagem real (PIL histograma) |
| P.B | Recomendação de preset explicável (heurística, sem IA) |
| Q | Health check + repair, comparação before/after, presets overlay |
| R | Release candidate: docs, checklist, smoke tests, saneamento |

---

## Limitações conhecidas

- Tamanho máximo por arquivo: **50 MB** (limite Send-to-Kindle Amazon)
- Ferramenta **single-user** para uso local — sem autenticação
- Inpainting OpenCV requer instalação separada (`pip install opencv-python`)
- NLLB-200 requer download do modelo (~2–5 GB) na primeira utilização
- KCC (conversão Kindle de quadrinhos) deve ser instalado separadamente
- Pipeline de quadrinhos assume PDFs com páginas individuais de imagem
- Cancelamento de operações é cooperativo (entre páginas); processos externos (KCC, Calibre, OCRmyPDF) não são interrompidos no meio
- Progresso de conversões externas (Calibre/KCC/OCR) é indeterminado (sem percentual inventado)

---

## Troubleshooting rápido

Ver guia completo em **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)**.

| Problema | Solução rápida |
|---|---|
| Nada no localhost | `./start.sh` ou `./start.sh --prod` |
| Build falha | `cd frontend && npm install && npm run build` |
| Dependência Python faltando | `source .venv/bin/activate && pip install -r backend/requirements.txt` |
| Modelo NLLB ausente | Habilite em Configurações → NLLB e clique em "Baixar modelo" |
| Manifesto corrompido | `GET /jobs/{id}/health` + `POST /jobs/{id}/repair` |
| OCR não funciona | `brew install tesseract tesseract-lang` |

---

## Links úteis

- Documentação interativa da API: `http://localhost:8000/docs`
- Checklist de release: [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)
- Smoke tests: [docs/SMOKE_TESTS.md](docs/SMOKE_TESTS.md)
- Troubleshooting: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- Release notes: [RELEASE_NOTES.md](RELEASE_NOTES.md)

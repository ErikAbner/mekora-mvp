# Smoke Tests — Kindle Local Tool

Cenários mínimos de validação manual. Cada smoke test deve ser executável em menos de 5 minutos e confirmar que o fluxo principal funciona sem erros fatais.

**Como usar:** Execute os cenários em ordem. Se um cenário falhar, registre em **Como reportar falha** ao final deste documento.

---

## Pré-requisitos

```bash
./start.sh --prod        # ou ./start.sh em dois terminais
# Verificar:
curl http://localhost:8000/health
# Esperado: {"status": "ok", "service": "kindle-local-tool"}
```

---

## ST-01 — Upload e Análise de PDF Textual

**Objetivo:** Confirmar que o pipeline básico de documento funciona.

**Passos:**
1. Abrir `http://localhost:8000` (ou `:5173` em dev)
2. Fazer upload de um PDF textual pequeno (< 5 MB)
3. Aguardar análise completar

**Resultado esperado:**
- Status muda de `analyzing` → `analyzed`
- Metadados detectados exibidos (título, autor se disponíveis)
- Contagem de páginas e `avg_chars_per_page` exibidos
- Nenhum erro vermelho na tela

**Falha se:** Status trava em `analyzing` por mais de 60s, ou erro 500.

---

## ST-02 — Conversão para EPUB

**Objetivo:** Confirmar conversão funciona.

**Pré-requisito:** ST-01 concluído.

**Passos:**
1. Na página de análise do job, clicar "Converter para EPUB"
2. Aguardar `conversion_status = done`

**Resultado esperado:**
- Link de download do EPUB disponível
- Arquivo `.epub` existe em `storage/output/{id}/`

**Falha se:** Status trava em `converting` por mais de 120s, ou erro.

---

## ST-03 — Histórico e Busca

**Objetivo:** Confirmar que o histórico exibe jobs e a busca filtra.

**Passos:**
1. Ir para `/history`
2. Verificar que o job criado em ST-01 aparece
3. Digitar parte do nome do arquivo na busca
4. Verificar que filtra corretamente

**Resultado esperado:**
- Job listado com CTA correto para seu estado
- Busca filtra sem recarregar a página

---

## ST-04 — Upload de PDF Comic e Tradução OCR

**Objetivo:** Confirmar que o modo comic inicia corretamente.

**Passos:**
1. Fazer upload de um PDF com páginas de imagem (ex: scan de quadrinho, qualquer PDF de página única de imagem)
2. Na análise, marcar o toggle **"Tratar como quadrinho/mangá (usar KCC)"**
3. Confirmar e aguardar análise
4. Clicar em "Traduzir quadrinhos"
5. Aguardar `comic_translation_status = done`

**Resultado esperado:**
- Sidecar `comic_translation.json` gerado em `storage/output/{id}/`
- Link "Ir para Revisão" disponível
- Sidebar de navegação mostra etapas de produção (Review, Overlay, etc.)

**Falha se:** Erro 500, ou status trava sem mensagem.

**Nota:** Se pytesseract não estiver instalado, os bboxes não serão extraídos mas o pipeline continua com blocos sem posição — isso é esperado.

---

## ST-11 — Upload de CBZ/CBR Nativo e Conversão KCC

**Objetivo:** Confirmar que arquivos de quadrinhos nativos funcionam de ponta a ponta.

**Pré-requisito:** `sevenzip` instalado (`brew install sevenzip`, confirmar com `which 7zz`).

**Passos:**
1. Preparar um arquivo `.cbz` ou `.cbr` válido (qualquer arquivo ZIP renomeado com páginas JPEG/PNG)
2. Ir para a Home e fazer upload do arquivo
3. Verificar que o upload é aceito (sem erro "formato não suportado")
4. Verificar que `processing_mode = comic` é definido automaticamente (sem toggle manual)
5. Verificar que a sidebar mostra as etapas de produção (Review, Overlay, etc.)
6. Na análise, clicar em "Converter via KCC"
7. Aguardar `conversion_status = done`

**Resultado esperado:**
- Upload aceito sem erro
- `input_format: cbz` (ou cbr)
- `processing_mode: comic` automático
- Arquivo `.epub` gerado em `storage/output/{id}/`
- Nenhuma mensagem de erro sobre `7z` ou `7zz`

**Falha se:** Erro "7zz is missing", "formato não suportado" no upload, ou conversão falha.

**Se falhar com "7zz is missing":** `brew install sevenzip` e tentar novamente.

---

## ST-05 — Overlay Visual

**Objetivo:** Confirmar que o overlay carrega e o estilo salva.

**Pré-requisito:** ST-04 concluído.

**Passos:**
1. Ir para `/overlay/{id}`
2. Verificar que as caixas aparecem sobre a imagem da página
3. Clicar em uma caixa
4. No painel lateral, clicar em um preset de estilo (ex: "Manga Branco")
5. Clicar em "Salvar estilo"

**Resultado esperado:**
- Caixa selecionada destaca na imagem
- Preset aplica todos os valores de estilo de uma vez
- Mensagem "Salvo" aparece brevemente

---

## ST-06 — Consistency Score

**Objetivo:** Confirmar que análise de consistência retorna scores.

**Pré-requisito:** ST-04 ou qualquer job comic com `comic_finish_manifest.json`.

**Nota:** Para criar o manifesto de finish, acesse `/finish/{id}` e clique em "Exportar". Ou use um job que já passou pelo pipeline de quadrinhos.

**Passos:**
1. Ir para `/consistency/{id}`
2. Clicar em "Analisar consistência"
3. Aguardar resultado

**Resultado esperado:**
- `consistency_score` exibido como porcentagem com barra colorida
- Lista de páginas com badges de outlier se houver
- Botão "Aplicar harmonização" disponível

---

## ST-07 — Health Check e Repair

**Objetivo:** Confirmar que os endpoints de health funcionam.

**Passos:**
1. Com qualquer `JOB_ID` existente:
```bash
curl http://localhost:8000/jobs/{JOB_ID}/health | python3 -m json.tool
```
2. Verificar que a resposta inclui `is_healthy`, `checks`, `recommended_next_action`
3. Executar repair (seguro, idempotente):
```bash
curl -X POST http://localhost:8000/jobs/{JOB_ID}/repair | python3 -m json.tool
```

**Resultado esperado:**
- GET retorna JSON válido com `checks` lista e `recommended_next_action`
- POST retorna `repaired: []` (sem nada a reparar em job limpo)

---

## ST-08 — Batch com Filtros

**Objetivo:** Confirmar que o BatchPage filtra e exibe corretamente.

**Passos:**
1. Ir para `/batch`
2. Verificar que jobs aparecem na tabela
3. Usar filtro de status para mostrar apenas `analyzed`
4. Selecionar 1 job e verificar que o painel de ação aparece

**Resultado esperado:**
- Filtro reduz a lista imediatamente
- Painel de ação mostra opções para o job selecionado

---

## ST-09 — Métricas do Pipeline

**Objetivo:** Confirmar que a página de métricas carrega dados.

**Passos:**
1. Ir para `/metrics`
2. Verificar que cards de resumo carregam (jobs, taxa de sucesso, etc.)

**Resultado esperado:**
- Página carrega sem erro
- Valores numéricos exibidos (podem ser zero se sem jobs processados)

---

## ST-10 — Testes Automatizados

**Objetivo:** Confirmar que a suíte de testes passa.

```bash
# Backend
source .venv/bin/activate
pytest backend/tests/ -q
# Esperado: ~393 passed

# Frontend
cd frontend
npm test
# Esperado: ~173 passed (inclui testes de UX unificada e CBZ/PDF comic)

# Build TypeScript
npm run build
# Esperado: ✓ built in <N>ms, 0 errors
```

**Resultado esperado:** Todas as contagens acima correspondem, sem falhas.

---

## Como reportar uma falha

Ao encontrar uma falha em um smoke test, registre:

```
ST-XX — [Nome do teste]
Data: 2026-XX-XX
Ambiente: macOS / Docker / Linux
Versão Node: X.X
Versão Python: 3.XX

Passos para reproduzir:
1. ...
2. ...

Resultado obtido:
- ...

Resultado esperado:
- ...

Logs relevantes:
- [cole o trecho do terminal ou console do browser]
```

Abra uma issue no repositório ou registre em `storage/logs/` se disponível.

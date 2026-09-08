# Troubleshooting — Kindle Local Tool

> **HISTÓRICO — não descreve o Mekora de hoje.**
>
> Este arquivo veio do `Kindle Local Tool` e foi preservado na fusão dos
> repositórios. Ele descreve uma árvore (`frontend/`, Vitest, `cd
> kindle-local-tool`) que **este repositório não tem**, e comandos daqui não
> funcionam. Serve como origem de uma ideia, nunca como fonte de regra em vigor
> — a mesma regra do `archive/`.
>
> O estado vigente está em [`../README.md`](../README.md).

Guia de diagnóstico e recuperação para problemas comuns.

---

## 1. A aplicação não aparece no localhost

**Sintoma:** Navegar para `http://localhost:8000` ou `http://localhost:5173` retorna "connection refused" ou página em branco.

**Diagnóstico:**
```bash
# Verificar se há processos rodando
lsof -ti:8000
lsof -ti:5173
```

**Soluções:**

*Modo produção (recomendado):*
```bash
./start.sh --prod
# Acesse: http://localhost:8000
```

*Modo desenvolvimento (dois processos):*
```bash
./start.sh
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
```

*Via Docker:*
```bash
docker compose up
```

---

## 2. Build do frontend falha

**Sintoma:** `npm run build` ou `./start.sh --prod` retornam erros TypeScript.

**Diagnóstico:**
```bash
cd frontend
npm run build 2>&1 | grep "error TS"
```

**Soluções:**
```bash
# Reinstalar dependências
cd frontend
rm -rf node_modules
npm install
npm run build
```

Se ainda falhar, verifique:
- Node.js versão 18+: `node --version`
- `frontend/src/vite-env.d.ts` existe com conteúdo `/// <reference types="vite/client" />`

---

## 3. Dependência Python faltando

**Sintoma:** Erro `ModuleNotFoundError` ao iniciar o backend.

**Solução:**
```bash
cd kindle-local-tool
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Se `.venv` não existir:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

---

## 4. Calibre não encontrado (`ebook-convert`)

**Sintoma:** Conversão PDF → EPUB falha com "command not found" ou similar.

**macOS:**
```bash
brew install calibre
# Verificar:
ebook-convert --version
```

**Linux:**
```bash
sudo apt-get install calibre
```

**Docker:** já incluso no Dockerfile.

---

## 5. Tesseract / OCR não funciona

**Sintoma:** "OCR não disponível" ou PDF escaneado não processa.

**macOS:**
```bash
brew install tesseract tesseract-lang
# Verificar:
tesseract --version
tesseract --list-langs
```

Para idiomas específicos:
```bash
brew install tesseract-lang
# ou instalar pack individual, ex: por (português)
```

Em Configurações → Avançadas, verifique `ocr_languages` inclui o idioma desejado.

---

## 6. Modelo NLLB-200 ausente

**Sintoma:** Tradução NLLB falha com "modelo não encontrado" ou erro de download.

**Solução via interface:**
1. Acesse **Configurações → NLLB**
2. Habilite NLLB e selecione o modelo (600M recomendado)
3. Clique em "Status" — se não disponível, o modelo será baixado automaticamente

**Solução manual:**
```bash
source .venv/bin/activate
python -c "from transformers import AutoModelForSeq2SeqLM; AutoModelForSeq2SeqLM.from_pretrained('facebook/nllb-200-distilled-600M')"
```

Requer ~2 GB de espaço em disco e conexão com internet.

---

## 7. Argos Translate não disponível

**Sintoma:** Opção "Argos" não aparece ou falha na tradução.

**Solução:**
```bash
source .venv/bin/activate
pip install argostranslate
```

Após instalar, baixe os pacotes de idioma na primeira utilização (requer internet).

---

## 8. KCC (Kindle Comic Creator) ausente

**Sintoma:** Conversão de quadrinhos falha com "kcc-c2e not found" ou `409 Conflict`.

**Solução:**
```bash
source .venv/bin/activate
pip install kindlecomicconverter
# Verificar:
kcc-c2e -h
```

KCC é necessário apenas para conversão de quadrinhos via pipeline KCC. Não é necessário para o resto do produto.

---

## 8b. KCC falha ao processar CBZ/CBR — "7z is missing" ou "7zz is missing"

**Sintoma:** Conversão de arquivo `.cbz`, `.cbr`, `.cb7` ou `.cbc` falha com erro `ERROR: 7z is missing!` ou mensagem equivalente.

**Causa:** KCC v9+ no macOS requer o executável `7zz` (fornecido pelo pacote `sevenzip`). O pacote `p7zip` (que fornece `7z`) **não** é suficiente — o nome do binário é diferente.

**Solução (macOS):**
```bash
brew install sevenzip
# Verificar:
7zz i
```

**Nota importante:** `brew install p7zip` instala `7z`, não `7zz`. Apenas `sevenzip` resolve este problema.

**Verificar se está resolvido:**
```bash
which 7zz          # deve retornar /opt/homebrew/bin/7zz
kcc-c2e arquivo.cbz --output /tmp/teste --profile KPW5 --format EPUB
```

**Nota:** PDFs em modo comic **não** exigem 7zz — apenas arquivos de arquivo nativo (CBZ/CBR/CB7/CBC).

---

## 9. OpenCV não disponível (inpainting degradado)

**Sintoma:** Inpainting usa PIL GaussianBlur (fallback) em vez de TELEA/NS.

**Nota:** O pipeline funciona normalmente com o fallback. Para qualidade superior:
```bash
source .venv/bin/activate
pip install opencv-python
```

---

## 10. Manifesto corrompido / artefato ausente

**Sintoma:** Página de consistência, acabamento ou curadoria retorna 404 ou erro inesperado.

**Diagnóstico via API:**
```bash
# Verificar saúde do job
curl http://localhost:8000/jobs/{JOB_ID}/health | python3 -m json.tool
```

**Reparo seguro (não-destrutivo):**
```bash
# Remove locks vazios e renomeia JSONs inválidos para .bak
curl -X POST http://localhost:8000/jobs/{JOB_ID}/repair | python3 -m json.tool
```

Ou pelo painel **Saúde do Job** (`JobHealthPanel`) na interface.

Após o repair, re-execute a etapa que gerou o manifesto.

---

## 11. Envio ao Kindle falha

**Sintoma:** `POST /jobs/{id}/send` retorna 503 ou erro SMTP.

**Verificações:**
1. `.env` tem `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `KINDLE_EMAIL`
2. Para Gmail: use **Senha de App** (não a senha da conta)
3. O endereço de e-mail está aprovado como remetente no painel Amazon Kindle
4. Arquivo EPUB tem menos de 50 MB

**Testar conexão SMTP:**
```bash
curl -X POST http://localhost:8000/config/test-email
```

**Envio pendente:** Se o envio falhou por falta de conectividade, aparece em **Histórico → Envios Pendentes**. Clique em "Reenviar" quando a internet estiver disponível.

---

## 12. Banco de dados corrompido

**Sintoma:** Backend não sobe, erro `SQLite` ou `table not found`.

**Solução:**
```bash
# Localizar o banco
find storage -name "*.db" -o -name "*.sqlite"
# Fazer backup e recriar
cp storage/jobs.db storage/jobs.db.bak
rm storage/jobs.db
# Reiniciar o backend — o banco é recriado automaticamente
./start.sh --prod
```

**Atenção:** Jobs anteriores serão perdidos, mas artefatos em `storage/output/` permanecem intactos.

---

## 13. Porta 8000 já em uso

**Sintoma:** "Address already in use" ao iniciar o backend.

```bash
# Encontrar e encerrar o processo
lsof -ti:8000 | xargs kill -9
./start.sh --prod
```

---

## 14. Testes falhando

**Backend:**
```bash
source .venv/bin/activate
pytest backend/tests/ -v --tb=short
# Esperado: ~393 passed
```

**Frontend:**
```bash
cd frontend
npm test -- --reporter=verbose
# Esperado: ~167 passed
```

Se algum teste falhar, verifique se as dependências estão atualizadas:
```bash
pip install -r backend/requirements.txt
npm install
```

## 15. Export final de quadrinhos responde 409

**Sintoma:** `POST /jobs/{id}/comic-export` (ou o botão "Gerar EPUB final") retorna 409 com `EXPORT_SOURCE_MISSING` ou `EXPORT_SOURCE_INCOMPLETE`.

**Causa:** o export final NUNCA usa o arquivo original. Ele exige páginas finais consistentes: `finished_pages/` (Acabamento) completas ou, na ausência, `final_pages/` (Curadoria Final) completas — todas as páginas presentes, legíveis e sem duplicata lógica (ex.: `page_001.png` E `page_001.jpg`).

**Solução:** siga o `next_step` retornado no erro — execute o export da Curadoria Final (`/finalize/{id}` → "Exportar páginas finais") ou re-execute o Acabamento. No modo Recomendado, o pipeline faz isso automaticamente.

## 16. Envio ao Kindle responde 409 COMIC_EXPORT_REQUIRED

**Sintoma:** enviar um quadrinho com tradução (ou com curadoria/acabamento iniciados) retorna 409.

**Causa:** política de envio da v1.2.0 — comics com pipeline visual nunca enviam o EPUB do arquivo original; o envio exige o export final concluído.

**Solução:** conclua a etapa Exportar (`/export/{id}`) e envie a partir dela.

## 17. OCRmyPDF ausente / OCR falhou

**Sintoma:** PDF escaneado com banner "OCR falhou" e conversão bloqueada (422).

**Solução:** `pip install ocrmypdf` no `.venv` do projeto (Tesseract e Ghostscript via `brew install tesseract ghostscript`). Idiomas: `eng`/`por` acompanham o Tesseract; `spa` opcional (baixe `spa.traineddata` de tessdata_fast para `/opt/homebrew/share/tessdata/`). Depois de instalar, duplique o job no Histórico para reprocessar a análise+OCR.

## 18. Tradução falha com "Unable to open file 'model.bin'"

**Sintoma:** tradução Argos falha citando `model.bin` ausente no pacote.

**Causa:** pacote Argos incompleto/corrompido em `storage/models/argos-packages/`.

**Solução:** re-baixe o par de idiomas: `ARGOS_PACKAGES_DIR=$PWD/storage/models/argos-packages .venv/bin/python -c "import argostranslate.package as p; p.update_package_index(); t=[x for x in p.get_available_packages() if x.from_code=='en' and x.to_code=='pt'][0]; p.install_from_path(t.download())"` (ajuste os códigos de idioma).

## 19. Operação "interrompida pela reinicialização"

**Sintoma:** após reiniciar o backend no meio de uma operação, o progresso mostra "O processamento foi interrompido pela reinicialização do aplicativo."

**Comportamento esperado:** a operação órfã é liberada automaticamente (sem 409 eterno); artefatos completos são preservados e você pode tentar novamente. Etapas já concluídas são reaproveitadas no modo Recomendado.

## 20. Limitação: cancelamento de processos externos

O botão "Cancelar operação" interrompe cooperativamente as etapas em Python (tradução por página, quick pipeline) entre uma página e outra. Processos externos (KCC, ebook-convert/Calibre, OCRmyPDF) NÃO são interrompidos no meio — a operação é encerrada quando o processo externo termina. Sair da tela é seguro: o progresso persiste no backend.

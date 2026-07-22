# Product Backlog v2

Derivado da `product-vision-v2.md` e da `capability-matrix.md`. Nada aqui está implementado. Este arquivo alimenta o Figma e as próximas rodadas de trabalho.

## PRÓXIMO APÓS A UI

### 1. Modos simples para documentos
- **Valor**: paridade com o Modo Recomendado do comic; hoje só existe orquestrador para comic.
- **Dependências**: nova UI (Home/Análise), backend novo endpoint `POST /jobs/{id}/quick-pipeline-document` (upload → OCR → convert → send opcional, com confirmação).
- **Risco**: baixo — reaproveita `subprocess_runner`, `progress_service` e as políticas de envio.
- **Métrica de sucesso**: usuário chega a "EPUB pronto" em ≤ 3 cliques a partir do upload em jobs comuns.
- **Por que não entra agora**: entra depois da UI final para não desperdiçar iteração de fluxo.

### 2. Diagnóstico legível
- **Valor**: usuário entende a saúde do arquivo antes de gastar tempo.
- **Dependências**: consolidar dados que já existem (is_scanned, ocr_status, page_count, densidade textual) num `GET /jobs/{id}/diagnostic` estruturado + UI que renderiza como cartão.
- **Risco**: baixo.
- **Métrica**: redução de jobs iniciados que travam por dependência ausente.
- **Por que não entra agora**: a UI final precisa desenhar o cartão.

### 3. Configuração avançada escondida
- **Valor**: reduzir carga cognitiva na Análise sem esconder capacidades.
- **Dependências**: UI (colapsáveis + persistência de preferência), sem backend.
- **Risco**: nenhum.
- **Métrica**: telas com menos elementos em foco inicial.
- **Por que não entra agora**: depende do Figma.

### 4. Reaproveitamento dos perfis existentes do KCC
- **Valor**: preset por dispositivo (KV/KO/KPW5/KOBO) fica selecionável no `/export/:id`, não apenas em `/config`.
- **Dependências**: expor `KCC_PROFILES` no manifest do export; pequena mudança no `POST /jobs/{id}/comic-export` para aceitar `profile` no body.
- **Risco**: baixo.
- **Métrica**: usuário troca perfil sem sair da Exportar.
- **Por que não entra agora**: precisa desenho na tela Exportar (Figma).

### 5. Prévia em poucas páginas
- **Valor**: ver o resultado provável antes de exportar.
- **Dependências**: reusar `_render_page` já existente para 2–3 páginas amostrais + endpoint dedicado + tela.
- **Risco**: baixo (Pillow, sem novas deps).
- **Métrica**: taxa de re-exports após primeira visualização.
- **Por que não entra agora**: depende do Figma da tela Exportar.

### 6. Relatório baseado em métricas reais
- **Valor**: substituir "quality_score" isolado por um relatório consolidado por job (páginas OK, blocos aprovados/editados/pulados, outliers visuais, tempo por etapa).
- **Dependências**: agregação sobre dados já registrados por `metrics_service` + `comic_finish/consistency_service`.
- **Risco**: baixo.
- **Métrica**: relatório presente em 100% dos jobs comic concluídos.
- **Por que não entra agora**: depende do Figma da tela de resultado.

---

## PESQUISA POSTERIOR (documento)

Esta seção existe para deixar claro que **não** está implementado. Cada item pode virar um projeto futuro — não deve aparecer no Figma como funcionalidade existente.

### 7. Detecção de inclinação (deskew) fora do OCR
- **Valor**: preservar leitura de PDFs escaneados tortos sem depender só do OCRmyPDF.
- **Risco**: médio (envolve heurística ou dependência OpenCV).

### 8. Detecção e ajuste de margens
- **Valor**: EPUB com áreas de leitura melhores.
- **Risco**: médio.

### 9. Detecção de colunas
- **Valor**: melhor extração de texto de artigos em 2+ colunas.
- **Risco**: alto (heurístico + validação manual).

### 10. Cabeçalhos e rodapés (remoção)
- **Valor**: EPUB sem repetição inútil.
- **Risco**: médio.

### 11. Reconstrução de parágrafos
- **Valor**: quebrar/unir linhas quebradas por layout.
- **Risco**: médio.

### 12. Hifenização
- **Valor**: text-flow melhor no Kindle.
- **Risco**: baixo, mas depende de dicionário por idioma.

### 13. Capítulos e Sumário (TOC)
- **Valor**: navegação no Kindle.
- **Risco**: médio (heurística + revisão).

### 14. Tabelas
- **Valor**: preservar dados tabulares em EPUB.
- **Risco**: alto.

### 15. Classificação automática de documento
- **Valor**: sugerir "modo comic" para PDF-mangá que veio como PDF; "modo documento" para EPUB de romance etc.
- **Risco**: médio (heurística sobre densidade textual + presença de imagens).

---

## FASE ONLINE (só se houver hospedagem futura)

Nada disso faz sentido enquanto a ferramenta é local single-user. Ficam registrados porque o `product-vision-v2.md` menciona a distinção local/externo.

### 16. Autenticação
- Login, sessão, expiração.

### 17. Autorização
- Papéis, escopos, permissões por endpoint.

### 18. Isolamento por usuário
- Diretórios de storage por conta; queries com `owner_id`.

### 19. Rate limiting
- Por usuário e por endpoint.

### 20. HTTPS
- Terminação TLS + HSTS + redirect 80→443.

### 21. Consentimento
- Termos, política de privacidade, retenção.

### 22. Analytics
- Só com opt-in explícito; anônimo por padrão.

### 23. Retenção
- Política formal de expiração de dados por conta.

### 24. Exclusão
- Fluxo de "apagar minha conta" com confirmação, prazos e limpeza real.

### 25. Políticas de privacidade
- Documento legal + páginas dedicadas.

---

## O que NÃO entra em nenhum item deste backlog

- Fila global de jobs paralelos.
- Cancelamento forçado de processos externos (Calibre/KCC/OCR).
- Atualização em massa de dependências.
- Substituição de banco (SQLite).
- Substituição do frontend por outra stack diferente da atual.
- Adição de novos formatos de entrada (`.mobi`, `.azw`, etc.) sem justificativa concreta.

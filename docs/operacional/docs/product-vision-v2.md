# Product Vision v2 — Kindle Local Tool

> **HISTÓRICO — não descreve o Mekora de hoje.**
>
> Este arquivo veio do `Kindle Local Tool` e foi preservado na fusão dos
> repositórios. Ele descreve uma árvore (`frontend/`, Vitest, `cd
> kindle-local-tool`) que **este repositório não tem**, e comandos daqui não
> funcionam. Serve como origem de uma ideia, nunca como fonte de regra em vigor
> — a mesma regra do `archive/`.
>
> O estado vigente está em [`../README.md`](../README.md).

## Posicionamento
Uma ferramenta local que analisa, recomenda, prepara e envia documentos para uma leitura mais confortável no Kindle.

## 1. Problema do usuário
Quem lê no Kindle enfrenta hoje um caminho manual, fragmentado e frágil quando o arquivo de origem não está pronto para o dispositivo: PDFs escaneados sem OCR, documentos em formatos que o Kindle não abre bem, quadrinhos/mangás com texto na imagem em idioma que o leitor não domina, ausência de metadados corretos, capas ausentes e nenhum caminho claro entre "arquivo baixado" e "livro legível no dispositivo".

## 2. Público inicial
Uma pessoa por instância — leitor pessoal que usa a ferramenta no próprio computador (macOS/Linux) e envia ao próprio Kindle via e-mail (Send-to-Kindle). Não há multi-usuário, autenticação, isolamento por conta ou compartilhamento entre pessoas.

## 3. Resultado esperado
Ao final de um job, o leitor tem um arquivo pronto para o Kindle (EPUB ou CBZ derivado), com metadados coerentes, e a opção de enviar por e-mail sem sair da ferramenta.

## 4. Proposta de valor
- Diagnóstico do arquivo antes de gastar tempo em conversão.
- Caminho recomendado para casos comuns; caminho avançado quando o material exigir.
- Tradução de texto opcional em documentos e experimental em quadrinhos, respeitando o layout original.
- Envio ao Kindle a partir da própria tela, com fila para tentativas quando SMTP falhar.
- Todos os passos, arquivos intermediários e artefatos ficam na máquina do usuário.

## 5. Diferenciais
- Pipeline de quadrinhos com curadoria por página (variantes: original / render com overlay / inpaint) e export final derivado das páginas visualmente finalizadas, não do arquivo original.
- Modo Recomendado com preflight (valida engine de tradução, OCR, KCC, espaço em disco, operação ativa) e confirmação explícita antes de iniciar.
- Progresso por operação com `operation_id`, heartbeat e recuperação de operações órfãs após restart.
- Política de envio ao Kindle sem fallback silencioso ao arquivo original quando há tradução ou pipeline visual iniciado.

## 6. Limitações conhecidas
- Requer dependências locais instaladas (Calibre, Tesseract, Ghostscript, OCRmyPDF, KCC, `7zz`); ausência de qualquer uma bloqueia o fluxo correspondente.
- OCR de PDF escaneado depende do Tesseract e dos idiomas instalados; sem idioma correspondente, o resultado é ruim.
- Tradução por Argos exige o pacote de idioma instalado localmente; pares indisponíveis não podem ser prometidos.
- Tradução visual de quadrinhos é experimental — depende da qualidade do OCR e do bbox detectado; blocos-lixo do OCR podem precisar de revisão manual.
- Cancelamento de operações é cooperativo (interrompe entre iterações Python); processos externos (Calibre, KCC, OCRmyPDF) não são interrompidos no meio.
- Concorrência: uma operação por job. Sem fila global ou limite de jobs paralelos.
- Envio ao Kindle está sujeito ao limite de tamanho da Amazon (~50 MB) e às regras do e-mail configurado.
- Nenhuma métrica de qualidade é entregue como percentual sem base numérica no código.

## 7. Promessa de privacidade
Uploads, artefatos intermediários, banco SQLite, modelos de tradução e capas ficam apenas no diretório `storage/` da instalação local do usuário. Nada é enviado a serviços externos por padrão.

## 8. O que significa processamento local
- O servidor HTTP escuta somente em `127.0.0.1` (via `start.sh`); no Docker, `docker-compose.yml` publica `127.0.0.1:8000:8000`.
- Não há CORS credencial-permissivo além das origens locais.
- O acesso a arquivos por HTTP passa por uma allowlist controlada (`/storage/output/{id}/…` com validação de tipo, tamanho de path e symlinks).
- O banco, `.env`, backups e uploads não são acessíveis por HTTP.

## 9. Quando o arquivo sai do computador
Apenas em duas situações, cada uma acionada explicitamente pelo usuário:

1. Ao clicar em **Enviar ao Kindle**: um e-mail via SMTP configurado no `.env` é enviado ao endereço `KINDLE_EMAIL`, contendo o EPUB como anexo. O SMTP é conectado com STARTTLS.
2. Ao iniciar o download de um pacote de tradução Argos ou modelo NLLB: a biblioteca correspondente baixa o pacote do índice público quando o par de idiomas não está presente localmente. Esse download acontece a pedido do usuário (ação de configuração).

Fora desses pontos, nenhum dado do usuário deixa a máquina.

## 10. Princípios do produto (obrigatórios)
1. **Resultado de leitura acima do formato**: o objetivo é ler no Kindle, não converter arquivos.
2. **Automação com possibilidade de revisão**: o Modo Recomendado automatiza, mas o Modo Avançado sempre existe.
3. **Modos simples antes das opções técnicas**: a superfície principal apresenta o mínimo; controles avançados ficam acessíveis, não expostos por padrão.
4. **Diagnósticos honestos**: números vêm de métricas reais; ausência de dado é comunicada como ausência.
5. **Nenhuma confiança falsa**: barras de progresso indeterminadas quando não há total conhecido; nenhum percentual inventado.
6. **Processamento local por padrão**: nenhum envio externo sem ação explícita.
7. **Envio externo somente por ação explícita**: e-mail ao Kindle e downloads de modelos são as únicas exceções documentadas.
8. **Limites configuráveis para estabilidade**: upload, arquivo compactado, páginas, imagens e timeouts têm limites centrais com override por env.
9. **Separação entre documento e quadrinho**: pipelines, telas e artefatos são diferentes; não misturar.
10. **Caminho rápido sem eliminar o avançado**: Modo Recomendado é sugestão, nunca imposição.

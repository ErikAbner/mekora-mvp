# Accessibility & Content Contract

> **HISTÓRICO — não descreve o Mekora de hoje.**
>
> Este arquivo veio do `Kindle Local Tool` e foi preservado na fusão dos
> repositórios. Ele descreve uma árvore (`frontend/`, Vitest, `cd
> kindle-local-tool`) que **este repositório não tem**, e comandos daqui não
> funcionam. Serve como origem de uma ideia, nunca como fonte de regra em vigor
> — a mesma regra do `archive/`.
>
> O estado vigente está em [`../README.md`](../README.md).

Requisitos que a UI final no Figma precisa refletir. Não são "boas intenções" — são regras.

## Acessibilidade

### Ordem de foco
- Ordem lógica: cabeçalho → navegação principal → contexto do job → conteúdo → ações → rodapé.
- Skip link "Pular para o conteúdo" no topo do AppShell.
- Modais recebem foco na abertura; devolvem ao elemento que os disparou ao fechar.
- Toast de erro anuncia por `role="alert"` mas **não** rouba foco.

### Navegação por teclado
- Toda ação clicável deve ser acionável por `Enter` e (se `<button>`) por `Space`.
- Componentes personalizados (dropdowns, sliders) devem seguir o padrão ARIA correspondente.
- Atalhos globais existem hoje (ver `KeyboardShortcutsHelp`); manter a lista visível via `?`.
- Sidebar navegável por `Tab`; setas para percorrer itens dentro de um grupo.

### Foco visível
- Anel de foco sempre presente para elementos interativos.
- Nunca `outline: none` sem substituto.
- Contraste mínimo do foco: 3:1 contra o background adjacente.

### Labels
- Todo `input`/`select`/`textarea` tem `<label for>` associado.
- `IconButton` exige `aria-label` descritivo.
- `Progress` tem `aria-valuenow/min/max` quando determinate; `aria-busy` quando indeterminate.
- `Sidebar` usa `aria-label` no `<nav>`.

### Descrições de campo
- Ao lado do label: helper text opcional.
- Erro do campo: `aria-describedby` apontando para o texto de erro.
- Placeholder **não substitui** label.

### Mensagens de erro associadas
- Cada mensagem de erro é ancorada ao campo pelo `aria-describedby`.
- Erros de página inteira usam `role="alert"` no banner.

### Progresso anunciado
- `Progress` determinate: `aria-valuenow` atualiza; VoiceOver anuncia "X por cento".
- `Progress` indeterminate: `aria-live="polite"` na mensagem textual ("Traduzindo página 12 de 24"); nunca ler "%".
- Anúncio de conclusão: toast com `role="status"`.

### Modais
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` (título).
- `Esc` fecha (exceto em ações destrutivas em andamento).
- Backdrop clicável para fechar (opcional; sempre com botão explícito).

### Contraste a validar no Figma
- Texto normal: 4.5:1 contra o fundo (WCAG AA).
- Texto grande (≥24px ou ≥19px negrito): 3:1.
- Ícone informacional/CTA: 3:1.
- Anel de foco: 3:1 contra adjacente.
- Testar os pares mais críticos: badge, banner de erro, botões primary/destructive, texto secundário em surface.

### Redução de movimento
- Respeitar `prefers-reduced-motion: reduce`:
  - Sem animação de entrada em painéis.
  - Sem barra "indeterminate" com pulso agressivo; usar spinner discreto.
  - Sem transições longas de sidebar.

### Thumbnails com descrição
- Cada thumbnail (capa, página comic) tem `alt` descritivo: `"Página 3"`, `"Miniatura da página 0 (candidata a capa)"`.
- Botões "Selecionar" têm `aria-label` completo: `"Selecionar Render overlay para página 3"`.

### Ações destrutivas com confirmação
- Ações que destroem dado (apagar job, resetar manifesto) exigem `ConfirmationDialog` explícito, com botão primário `variant="destructive"` e verbo forte ("Excluir permanentemente").

---

## Microcopy — Princípios

### Linguagem humana
- 1ª pessoa do plural quando falar do sistema ("Estamos preparando o EPUB…") — evitar.
- Preferir voz ativa e sujeito claro: **"Convertendo via Calibre"** (não "Conversão em andamento pelo Calibre").
- Instruir com verbos: "Envie ao Kindle", "Confirme e execute".

### Sem stack trace
- Nunca colar `str(exc)` no banner principal.
- Detalhes técnicos ficam em `<details>` colapsados, rotulados "Detalhes técnicos".

### Explicar o problema
- Formato: `[o que aconteceu]. [por quê]. [o que fazer].`
- Exemplo: "Conversão bloqueada. O OCR falhou neste PDF escaneado, e sem OCR o EPUB sairia sem texto pesquisável. Verifique se o Tesseract está instalado."

### Explicar o próximo passo
- Todo estado bloqueado tem CTA para a etapa que resolve.
- Todo estado com erro recuperável tem CTA "Tentar novamente".
- Todo estado pendente (envio) tem CTA "Retentar envio" no local certo.

### Evitar jargão sem explicação
- "OCR" → primeira ocorrência em uma sessão pode expandir: "OCR (reconhecimento de texto em imagens)".
- "KCC" → sempre com contexto: "conversão via KCC (Kindle Comic Converter)".
- "CBZ/CBR/CB7/CBC" → padrão comic; ok abreviar após uma explicação inicial em UI de upload.
- "Manifest", "sidecar", "operation_id" — **evitar** na UI; só em log/detalhes técnicos.

### Não prometer resultado incerto
- **Não** dizer "conversão perfeita".
- **Não** exibir percentual quando não há total.
- **Não** garantir compatibilidade universal com Kindle — mencionar que arquivos acima de 50 MB podem ser rejeitados pela Amazon.

### Distinguir processamento local de envio externo
- Ao mostrar tradução: "Traduzindo localmente com Argos" (não "traduzindo na nuvem").
- Ao enviar ao Kindle: rótulo do botão + confirmação explícita: "Enviar ao Kindle por e-mail". Nunca só "Enviar".
- Ao baixar pacote Argos/NLLB: rótulo diz explicitamente "Baixar modelo (rede)".

### Tempo e progresso
- Tempo decorrido sempre em unidades legíveis: `"12s"`, `"3min 4s"`.
- Progresso conhecido: `"Traduzindo página 12 de 24"`.
- Progresso indeterminado: `"Convertendo via KCC (sem estimativa)"`.
- Timeout de polling: `"O processamento continua no backend."` + CTA "Continuar acompanhando".

### Confirmações
- Sucesso destacado por Toast (não bloqueante).
- Erro persistente por Banner (bloqueante quando exige ação).

### Nome dos artefatos na UI
- "EPUB final" (comic com tradução) — não "final_pages EPUB".
- "Páginas finalizadas" — não "finished_pages".
- "Original via KCC" — não "kcc-convert do input_path".
- Termos internos ficam em documentação e logs.

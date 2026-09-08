# Information Architecture

> **HISTÓRICO — não descreve o Mekora de hoje.**
>
> Este arquivo veio do `Kindle Local Tool` e foi preservado na fusão dos
> repositórios. Ele descreve uma árvore (`frontend/`, Vitest, `cd
> kindle-local-tool`) que **este repositório não tem**, e comandos daqui não
> funcionam. Serve como origem de uma ideia, nunca como fonte de regra em vigor
> — a mesma regra do `archive/`.
>
> O estado vigente está em [`../README.md`](../README.md).

Proposta conceitual para o Figma organizar a UI final **sem esconder estados importantes**. Não é implementação — é a taxonomia de navegação.

## Nível 0 — Camadas conceituais

O app é organizado em 5 camadas horizontais:

1. **Início** — a superfície de entrada; onde o usuário decide o que fazer.
2. **Trabalho atual** — a bancada do job em andamento (o "job ativo").
3. **Biblioteca** — o que já foi feito (histórico + envios pendentes).
4. **Lote** — trabalho em vários jobs ao mesmo tempo.
5. **Sistema** — métricas e configurações.

A UI final pode expressar essas camadas como grupos na Sidebar, ou como abas — o importante é que o usuário sempre saiba **em qual camada** ele está.

## Nível 1 — Superfícies da navegação principal

### Início / Novo processamento
- Home / Converter (upload novo).
- Referência ao trabalho ativo se existir (link para retomar).

### Trabalho atual (só quando há job ativo)
- **Análise & Diagnóstico** — sempre presente; ponto de partida do job.
- **Preparação** (para comic): Revisão → Overlay → Curadoria → Acabamento → Consistência.
- **Exportar** — etapa própria; é o único caminho para o envio de comic com tradução.
- **Enviar ao Kindle** — subcaminho de Exportar (comic) ou botão em Análise (documento simples).

### Biblioteca
- **Histórico** — todos os jobs; filtros + duplicar + retry send.
- **Envios pendentes** — subseção do Histórico com jobs em `send_status="pending"`.

### Lote
- **Batch** — seleção + ação + resultados.

### Sistema
- **Métricas** — observabilidade agregada.
- **Configurações** — app, motores, SMTP (só-leitura), retenção.

## Nível 2 — Resoluções conceituais que o Figma precisa desenhar

### 2.1 Diferença entre "novo upload" e "job ativo"
Hoje, quando o usuário sobe um arquivo e depois vai à Home, não fica óbvio que há um job em andamento em outra tela. Duas soluções compatíveis:
- **Indicador persistente do job ativo** (mesmo estilo de um "chip" no topo), sempre visível fora da Análise; clique retoma.
- **Home mostra "Trabalho ativo" no topo** quando há um job em curso, além do dropzone para "Novo upload".

### 2.2 Documento vs Comic na navegação
Não são pipelines equivalentes — o comic tem 6 etapas de preparação; documento tem 1. A Sidebar deve refletir isso:
- Documento: **1 item** (Análise) + Enviar ao Kindle.
- Comic: **stepper** (Análise → Revisão → Overlay → Curadoria → Acabamento → Consistência → Exportar), com etapas bloqueadas visualmente distintas (não somente `disabled` cinza).

Regra: **etapa bloqueada mostra motivo**, não fica silenciosamente inerte.

### 2.3 Etapas principais vs avançadas
No comic, dentro do fluxo Recomendado:
- **Principal (visível por padrão)**: Análise → Tradução → Exportar.
- **Avançado (visível quando ativado)**: Revisão, Overlay, Curadoria, Acabamento, Consistência.

O Figma pode oferecer:
- **Um toggle "Ver etapas avançadas"** no stepper.
- Ou colapsar por padrão as etapas avançadas quando `flow_mode="recommended"`.

### 2.4 Caminho rápido vs caminho completo
- **Recomendado (comic)** = quick pipeline no backend + confirmação explícita antes do export.
- **Recomendado (documento)** = literalmente "Converter → Enviar" (não há orquestrador).
- **Avançado** = manter todas as etapas visíveis; o usuário controla cada uma.

O Figma pode representar como um par de cartões grandes na Análise, com "Escolha o modo" — nunca esconder o Avançado.

### 2.5 Ações intermediárias vs Export final
Etapas de preparação geram artefatos (`final_pages.zip`, `finished_pages.zip`, etc.). Elas podem ser baixadas separadamente, mas **não são o produto final**. O Figma precisa comunicar:
- Downloads intermediários = "estados intermediários salvos" (compare com "salvar rascunho").
- **Exportar** = etapa final; produz o EPUB pronto para o Kindle.

Sugestão: separar visualmente esses tipos de download (ícone + label + descrição curta "somente para inspeção").

### 2.6 Configurações gerais vs configurações do job
- **Gerais** (`/config`): SMTP (só-leitura), idiomas OCR, retenção, engine padrão, NLLB, perfil KCC padrão, tema, idioma UI.
- **Do job** (`/analyze/:id` e `/export/:id`): metadados (título/autor/idioma), capa, par de tradução, perfil KCC do export específico, modo de trabalho.

O Figma pode:
- Reservar `/config` para "preferências globais".
- Manter as opções específicas do job dentro das telas do job.
- Mostrar clara **prioridade**: a configuração do job vence a global quando definida.

## Nível 3 — Padrões de navegação obrigatórios

- **Breadcrumb**: sempre em telas de etapa comic (mostra a etapa atual e leva à etapa anterior).
- **Voltar contextual**: cada tela de comic tem link visível para a etapa anterior.
- **CTA principal por tela**: 1 primário, no máximo 2 secundários.
- **Ações destrutivas**: exigem confirmação (`ConfirmationDialog`).
- **Toasts** para operações que terminam rápido; **banners** para estados persistentes.

## Nível 4 — Fluxos-chave em mapa

```
NOVO CAMINHO (comic) — Recomendado
Home → Upload → Análise (preflight + confirmar) → [quick pipeline] → Exportar (revisão + confirmar) → Enviar

NOVO CAMINHO (comic) — Avançado
Home → Upload → Análise → Tradução → Revisão → Overlay → Curadoria → (Acabamento) → (Consistência) → Exportar → Enviar

NOVO CAMINHO (documento simples)
Home → Upload → Análise → (OCR automático) → (Metadados/Capa) → Converter → Enviar

RETOMAR
Histórico → linha do job → Análise (o resto do fluxo aplica-se ao tipo)

RETRY DE ENVIO
Histórico → envios pendentes → Retry
```

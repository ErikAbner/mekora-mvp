# Design Token Contract

Este documento é um **contrato de taxonomia**. Não contém valores.

## Regras absolutas

1. O usuário criará **Variables** e **Styles** no Figma; o Figma é a **fonte de verdade** dos valores.
2. Os valores serão convertidos futuramente em **CSS custom properties** (`--color-…`, `--space-…`) na UI final.
3. A UI final usará **CSS Modules** por componente; **Tailwind não será usado**.
4. Claude **não inventa valores ausentes**: qualquer token cujo valor não foi definido no Figma deve ser solicitado explicitamente ao usuário.
5. Qualquer token novo pedido por um componente futuro precisa ser aprovado antes de aparecer no Figma.
6. Aliases (referências entre tokens) são permitidas no Figma, mas devem preservar a hierarquia da taxonomia deste documento.

## Taxonomia

### color.background.*
Cores de plano de fundo (páginas, seções amplas).
- `color.background.default`
- `color.background.muted`
- `color.background.subtle`
- `color.background.inverted`

### color.surface.*
Cores de superfícies elevadas (cards, panels, dropdowns).
- `color.surface.default`
- `color.surface.raised`
- `color.surface.overlay`
- `color.surface.sunken`

### color.text.*
Cores de tipografia.
- `color.text.primary`
- `color.text.secondary`
- `color.text.tertiary`
- `color.text.inverted`
- `color.text.link`
- `color.text.linkHover`
- `color.text.disabled`
- `color.text.onAction`
- `color.text.onFeedback.success`
- `color.text.onFeedback.warning`
- `color.text.onFeedback.error`
- `color.text.onFeedback.info`

### color.border.*
- `color.border.default`
- `color.border.strong`
- `color.border.subtle`
- `color.border.focus`
- `color.border.action`
- `color.border.feedback.success`
- `color.border.feedback.warning`
- `color.border.feedback.error`
- `color.border.feedback.info`

### color.action.*
Cores para ações (botões, chips ativos, seleção).
- `color.action.primary.default`
- `color.action.primary.hover`
- `color.action.primary.active`
- `color.action.primary.disabled`
- `color.action.secondary.default`
- `color.action.secondary.hover`
- `color.action.secondary.active`
- `color.action.secondary.disabled`
- `color.action.destructive.default`
- `color.action.destructive.hover`
- `color.action.destructive.active`
- `color.action.destructive.disabled`
- `color.action.ghost.hover`
- `color.action.ghost.active`

### color.feedback.*
Cores semânticas por estado.
- `color.feedback.success.default`
- `color.feedback.success.bg`
- `color.feedback.success.border`
- `color.feedback.warning.default`
- `color.feedback.warning.bg`
- `color.feedback.warning.border`
- `color.feedback.error.default`
- `color.feedback.error.bg`
- `color.feedback.error.border`
- `color.feedback.info.default`
- `color.feedback.info.bg`
- `color.feedback.info.border`
- `color.feedback.neutral.default`
- `color.feedback.neutral.bg`
- `color.feedback.neutral.border`

### typography.family.*
- `typography.family.sans`
- `typography.family.mono`

### typography.size.*
- `typography.size.xs`
- `typography.size.sm`
- `typography.size.base`
- `typography.size.md`
- `typography.size.lg`
- `typography.size.xl`
- `typography.size.2xl`
- `typography.size.3xl`

### typography.weight.*
- `typography.weight.regular`
- `typography.weight.medium`
- `typography.weight.semibold`
- `typography.weight.bold`

### typography.lineHeight.*
- `typography.lineHeight.tight`
- `typography.lineHeight.normal`
- `typography.lineHeight.relaxed`

### spacing.*
Escala consistente para padding/margin/gap.
- `spacing.0`
- `spacing.1`
- `spacing.2`
- `spacing.3`
- `spacing.4`
- `spacing.5`
- `spacing.6`
- `spacing.8`
- `spacing.10`
- `spacing.12`
- `spacing.16`
- `spacing.24`

### size.*
- `size.control.sm`
- `size.control.md`
- `size.control.lg`
- `size.icon.sm`
- `size.icon.md`
- `size.icon.lg`
- `size.avatar.sm`
- `size.avatar.md`
- `size.avatar.lg`

### grid.*
- `grid.columns.mobile`
- `grid.columns.tablet`
- `grid.columns.desktop`
- `grid.gutter.mobile`
- `grid.gutter.tablet`
- `grid.gutter.desktop`
- `grid.maxWidth.content`
- `grid.maxWidth.wide`
- `grid.sidebar.width`

### radius.*
- `radius.none`
- `radius.sm`
- `radius.md`
- `radius.lg`
- `radius.xl`
- `radius.pill`
- `radius.circle`

### border.*
- `border.width.hairline`
- `border.width.thin`
- `border.width.thick`

### shadow.*
- `shadow.none`
- `shadow.sm`
- `shadow.md`
- `shadow.lg`
- `shadow.overlay`

### motion.duration.*
- `motion.duration.instant`
- `motion.duration.fast`
- `motion.duration.base`
- `motion.duration.slow`

### motion.easing.*
- `motion.easing.linear`
- `motion.easing.out`
- `motion.easing.inOut`
- `motion.easing.emphasized`

### breakpoint.*
- `breakpoint.sm`
- `breakpoint.md`
- `breakpoint.lg`
- `breakpoint.xl`

### zIndex.*
- `zIndex.base`
- `zIndex.sticky`
- `zIndex.sidebar`
- `zIndex.dropdown`
- `zIndex.modal`
- `zIndex.toast`
- `zIndex.tooltip`

## Regras de nomeação

- Estrutura: `<category>.<subcategory?>.<variant?>`.
- Sempre em `camelCase` para segmentos compostos.
- Tokens específicos de estado usam sufixos: `.default`, `.hover`, `.active`, `.disabled`, `.focus`.
- Cores por feedback separam `default` (uso em texto/ícone), `bg` (fundo), `border`.
- **Não** criar `color.brand.*` como categoria separada — usar `color.action.primary.*`.

## O que o usuário resolve no Figma

- Todos os valores por token acima.
- Aliases (por exemplo, `color.action.primary.default = color.brand.500`).
- Modos (light / dark) por meio de `Variables Modes`.
- Componentes visuais dos primitivos e compostos (baseados no `component-inventory.md`).
- Estados por componente (uma **Variant** por estado).
- Grid responsivo por breakpoint.
- Nome final da família tipográfica (Inter/JetBrains Mono ou outra escolha).
- Se manter `lucide-react` ou substituir por outra biblioteca de ícones.

## O que fica proibido para Claude neste momento

- Escolher qualquer valor visual.
- Adicionar tokens fora desta taxonomia sem pedir ao usuário.
- Alterar CSS/Tailwind existente.
- Criar componentes visuais fora do que já existe.
- Alterar espaçamentos ou tipografias no código atual.

# Styles — orientation for a fresh session

`src/styles` is a hand-rolled SCSS 7-1 architecture. Single dark theme,
no CSS/component framework, no light mode. Vite compiles it live; entry
point is `src/styles/main.scss`, imported once from `src/main.ts`.

Read this file first, then only open the specific partial(s) you need —
you don't need to read the whole tree for most tasks.

## Load order (`main.scss`)

```scss
@use "abstracts"; // variables, mixins, functions — no CSS output
@use "base"; // :root custom properties, reset, element defaults
@use "components"; // reusable classes: buttons, forms, skeleton
@use "layout"; // app shell: header, sidebar, shell grid
@use "pages"; // one partial per page/feature that needs page-specific CSS
@use "themes"; // dark (no-op), accent colors, font/density overrides
```

Each folder has an `_index.scss` that just does `@forward 'partial-name';`
for everything in that folder — that's the file to edit when you add a
new partial, so it actually gets compiled in.

```
abstracts/_index.scss   → variables, mixins, functions
base/_index.scss        → reset, base, typography
components/_index.scss  → buttons, forms, skeleton
layout/_index.scss      → shell, header, sidebar
pages/_index.scss       → auth, error, language-theme-settings,
                           Institute_Setup/institute-profile
themes/_index.scss      → dark, accents, fonts
```

## Design tokens — `abstracts/_variables.scss`

All plain Sass variables. Reuse an existing token instead of hardcoding
a value — if nothing fits, add a new token here rather than inlining one.

**Surfaces**
| Token | Value |
|---|---|
| `$color-bg` | `#0d0f13` — app background |
| `$color-surface` | `#15181e` — cards, panels, sidebar |
| `$color-surface-alt` | `#1b1f27` — elevated surfaces (dropdowns, popovers) |
| `$color-surface-hover` | `#21262f` — hover state on rows / nav items |

**Borders**
| Token | Value |
|---|---|
| `$color-border` | `#262b33` |
| `$color-border-strong` | `#363c46` |

**Text**
| Token | Value |
|---|---|
| `$color-text` | `#e8eaed` |
| `$color-text-secondary` | `#aeb4bd` |
| `$color-text-muted` | `#767d87` |
| `$color-text-disabled` | `#4b5058` |
| `$color-text-inverse` | `#0d0f13` — text on filled brand surfaces |

**Brand**
| Token | Value |
|---|---|
| `$color-primary` | `#6366f1` |
| `$color-primary-hover` | `#7679f6` |
| `$color-primary-active` | `#4f46e5` |
| `$color-primary-muted` | `rgba(99,102,241,.16)` |

**Semantic status** — each has base / `-hover` / `-muted` (rgba .16)
| Token | Base |
|---|---|
| `$color-success` | `#22c55e` |
| `$color-warning` | `#eab308` |
| `$color-danger` | `#ef4444` |
| `$color-info` | `#38bdf8` |

**Forms / inputs**
| Token | Value |
|---|---|
| `$color-input-bg` | `$color-surface` |
| `$color-input-border` | `$color-border` |
| `$color-input-border-focus` | `$color-primary` |
| `$color-input-placeholder` | `$color-text-muted` |
| `$color-input-disabled-bg` | `$color-surface-alt` |

**Elevation & motion**
| Token | Value |
|---|---|
| `$shadow-sm` | `0 1px 2px rgba(0,0,0,.35)` |
| `$shadow-card` | `0 4px 16px rgba(0,0,0,.45)` |
| `$transition-fast` | `120ms ease` |
| `$transition-base` | `200ms ease` |

**Spacing scale** — `$space-1` `.25rem` · `$space-2` `.5rem` ·
`$space-3` `.75rem` · `$space-4` `1rem` · `$space-6` `1.5rem` ·
`$space-8` `2rem`

**Radius** — `$radius-sm` `6px` · `$radius-md` `8px` · `$radius-lg` `12px`

**Breakpoints** (used only via the `respond-to` mixin, min-width) —
`$breakpoint-sm` `640px` · `$breakpoint-md` `768px` ·
`$breakpoint-lg` `1024px` · `$breakpoint-xl` `1280px`

**Typography**
| Token | Value |
|---|---|
| `$font-family-base` | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |
| `$font-size-base` | `1rem` |
| `$line-height-base` | `1.5` |
| `$font-family-en-inter/roboto/open-sans/lato/ibm-plex-sans` | alt English UI fonts (selectable, Language & Theme settings) |
| `$font-family-bn-hind-siliguri/kalpurush/noto-sans-bengali` | Bengali UI fonts (Hind Siliguri is default) |
| `$font-scale-small/medium/large` | `.9375` / `1` / `1.0625` |

## Mixins — `abstracts/_mixins.scss`

- **`respond-to($breakpoint)`** — `sm | md | lg | xl`. Emits
  `@media (min-width: ...)` at that token's breakpoint. Mobile-first:
  write the small-screen styles as the default, then override inside
  `@include respond-to(...) { }` for larger screens.
  ```scss
  .sidebar-brand {
    gap: $space-2;
  }
  @include respond-to(lg) {
    gap: $space-4;
  }
  ```
- **`flex($direction: row, $align: stretch, $justify: flex-start, $gap: 0)`**
  — shorthand for `display: flex` + the four axis properties. Used
  everywhere instead of writing flex properties by hand, e.g.
  `@include flex(column, stretch, flex-start, $space-4);`.
- **`card`** — standard panel: `background: $color-surface`,
  `1px solid $color-border`, `$radius-lg`, `$shadow-card`, `$space-4`
  padding. Used for any card-like block (`.card`, `.lts-section`,
  `.ipf-section`, `.ipf-preview`, savebar strips, etc).
- **`truncate`** — `overflow: hidden; white-space: nowrap; text-overflow: ellipsis;`
  for single-line ellipsis (nav labels, profile name/email).

## Functions — `abstracts/_functions.scss`

- **`rem($px, $base: 16)`** — px → rem conversion (`math.div($px, $base) * 1rem`).
- **`to-rgba($color, $alpha)`** — thin wrapper over `rgba()`.

Both exist but are rarely called in practice — most sizing in the
partials is written as literal `rem`/`px`, and translucency almost
always uses a pre-computed `$color-*-muted` token instead of calling
`to-rgba` inline. Safe to use directly when you need an ad-hoc size or
alpha that has no existing token.

## Base — `base/`

- **`_reset.scss`** — universal `box-sizing: border-box` + margin/padding
  reset; media elements `display: block; max-width: 100%`; form controls
  inherit `font`/`color`; anchors lose default color/underline; lists lose
  markers.
- **`_base.scss`** — declares every color/shadow/transition/typography
  token as a `:root` **CSS custom property** (`--color-primary`,
  `--shadow-card`, `--font-family-en`, `--font-scale`, etc — same names
  as the Sass tokens, kebab-case, prefixed `--`), sets `color-scheme: dark`,
  and applies `html { font-size: calc(100% * var(--font-scale)); }` plus
  `html, body, #app { min-height: 100vh; }`. This is the file that makes
  runtime theme switching possible (see the CSS vars vs Sass vars note
  below).
- **`_typography.scss`** — `body` sets `font-family: var(--font-family-en)`
  (swapped to `var(--font-family-bn)` under `html[lang='bn']`), base font
  size/line-height/color/background. `h1` `1.875rem`, `h2` `1.5rem`,
  `h3` `1.25rem`, all `font-weight: 700; line-height: 1.2`. `small` is
  `.85rem` muted. Links use `$color-primary` / `$color-primary-hover`.

## Components — `components/`

### Buttons (`_buttons.scss`)

`.btn` base: `$space-2 $space-4` padding, `$radius-md`, transparent
1px border, `font-weight: 600`, transitions bg/border/opacity;
`:disabled` → `opacity: .5; cursor: not-allowed`.

Variant modifiers (all Sass-var colors, not CSS vars — see note below):
| Class | Background | Notes |
|---|---|---|
| `.btn--primary` | `$color-primary` → hover `$color-primary-hover` → active `$color-primary-active`; text `#fff` |
| `.btn--secondary` | `$color-surface-alt`, `$color-border` border, `$color-text`; hover → `$color-surface-hover` |
| `.btn--success` | `$color-success`; text `$color-text-inverse`; hover → `$color-success-hover` |
| `.btn--warning` | `$color-warning`; text `$color-text-inverse`; hover → `$color-warning-hover` |
| `.btn--danger` | `$color-danger`; text `#fff`; hover → `$color-danger-hover` |
| `.btn--ghost` | transparent; text `$color-text-secondary`; hover → bg `$color-surface-hover`, text `$color-text` |

`BaseButton.vue` (`components/ui/`) is the Vue wrapper: props
`variant` (`primary|secondary|success|warning|danger|ghost`, default
`primary`), `type` (default `button`), `disabled`. Renders
`<button :class="['btn', 'btn--'+variant]"><slot /></button>`.

### Forms (`_forms.scss`)

- `.card` — just `@include card`.
- `.form-field` — column flex, `$space-2` gap; `label` `.9rem` bold
  secondary text; `.form-hint` `.8rem` muted; `.form-error` `.8rem`
  `$color-danger`.
- Bare `input, select, textarea` — themed globally (no class needed):
  `$color-input-bg/border`, `$radius-md`, focus → border
  `$color-input-border-focus`, `:disabled` → `$color-input-disabled-bg`
  bg + `$color-text-disabled` text, `.has-error` → danger border.
- `table` — collapsed borders, `th` bold secondary text on
  `$color-surface-alt`, row hover → `$color-surface-hover`.
- `.switch` — toggle switch, `role="switch"`, state via `.is-on`.
  CSS-var sized (`--switch-w: 2.5rem`, `--switch-h: 1.5rem` — these
  two are **local** custom props for the pill/knob math, not the
  global theme tokens). Off = muted/border grey; `.is-on` → primary
  bg/border, knob translates via `calc(--switch-w - --switch-h)`.
  `:disabled` → `opacity: .5`.
- `.badge` + `.badge--success/warning/danger/info` — small pill,
  `$space-1 $space-2` padding, `$radius-sm`, `.75rem` bold, colored via
  the matching `$color-*-muted` bg / `$color-*` text pair.

### Skeleton (`_skeleton.scss`)

`.skeleton` — shimmering loading placeholder block. Animated gradient
(`$color-surface-alt` → `$color-surface-hover` → `$color-surface-alt`,
`background-size: 400% 100%`) via `@keyframes skeleton-shimmer`
(1.4s ease infinite). This file only owns the shimmer look — actual
width/height per placeholder comes from a page-specific modifier class
(see `pages/Institute_Setup/_institute-profile.scss` → `.ipf-skel-*`
for the full pattern of building a skeleton state that mirrors a real
page's layout).

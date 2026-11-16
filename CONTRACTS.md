# Build contracts (internal, for the people and agents building this repo)

Client: a non-developer who will maintain this alone, part time. Favor plain,
readable, well-commented code over clever code. Minimal dependencies: do not
add an npm package without a stated reason; prefer a short script.

## Phase 1 rules (hard)
- Structure and plumbing only. NO visual polish, NO color or type decisions,
  NO written copy. The neutral `base` theme is deliberately plain.
- Never invent copy. Any slot without client-supplied text holds a string of
  the form `[PLACEHOLDER: what goes here, length]`. Placeholder images are
  plain grey SVGs labelled PLACEHOLDER.
- Client-supplied text (site.config.ts identity fields, resume v5 in
  `_source/resume-v5.txt`) is used VERBATIM. Do not rewrite, trim or improve.
- Never use the claim "$7M+ incremental funding" anywhere.
- No em dashes in any user-facing string or doc.

## Three layers, never mixed
1. Content: `content/**`, `site.config.ts`, `public/**`. All words and images.
2. Theme: `tokens.json`, `src/styles/theme.<name>.css`. All looks.
3. Layout: `src/components`, `src/layouts`, `src/pages`. Structure only.

Rules that enforce the seam:
- Components/layouts/pages contain NO user-facing strings. Words come from
  `site.config.ts` (import { site } from "@config") or content collections.
- Components/layouts/pages contain NO raw design values: no hex/rgb/hsl
  colors, no font names, no px/rem/em lengths, no numeric font-weight, no
  durations. Only `var(--token)`. Allowed raw values: 0, 100%, auto,
  fractions (1fr), unitless grid spans, `calc()` over tokens, aspect-ratio.
  Use Astro scoped `<style>` blocks. No Tailwind, no CSS framework.
- Nothing personal to the client (name, email, domain, employer) appears
  outside layer 1.

## CSS variables (generated from tokens.json by scripts/build-tokens.mjs)
Naming: `--<group>-<key>` from tokens.json `base`, e.g.
`--color-bg --color-surface --color-ink --color-ink-muted --color-line
--color-accent --color-placeholder`, `--font-display --font-body --font-mono`,
`--weight-regular --weight-medium --weight-bold`, `--text-xs .. --text-3xl`,
`--leading-tight --leading-normal`, `--space-1 2 3 4 6 8 12 16 24`,
`--radius-none --radius-sm --radius-md`, `--border-width`,
`--grid-columns --grid-gutter --grid-margin --grid-max --grid-measure`,
`--motion-duration --motion-ease`.
Output: `src/styles/tokens.css` (generated, never hand-edited, committed):
`:root { base }` then `:root[data-theme="<name>"] { overrides }` per other
top-level group in tokens.json. `<html data-theme={site.theme}>`.

## Style files (theme agent owns)
- `src/styles/tokens.css` generated
- `src/styles/global.css` reset + bare element defaults, tokens only; imports
  tokens.css, then the active theme files, then print.css
- `src/styles/theme.base.css`, `src/styles/theme.will.css`: non-token theme
  rules (font loading, the section-label device). Both near-empty in phase 1.
- `src/styles/print.css` resume print rules

## Content (see src/content.config.ts for exact schemas)
- `content/work/<slug>.md` case studies; `content/writing/<slug>.md` posts
- `content/home.yaml` (entry id `home`), `content/resume.json` (id `resume`)
- `content/library/captions.yaml` list of `{ id, image, alt, caption, order }`
- Images: `public/work/<slug>/`, `public/library/`, `public/portrait.*`

## Routes
`/` (six numbered sections from site.sections), `/work`, `/work/[slug]`
(not built for draft:true), `/resume`, `/contact`, `/writing`.

## The device seam
Every home section renders through `Section.astro` (props: index, id, label).
A future visual device restyles the label/number via the theme file only.

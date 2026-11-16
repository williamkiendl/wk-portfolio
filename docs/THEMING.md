# Theming

How the look of the site is stored, and what to edit to change it.

## The two places a look lives

**`tokens.json`** holds every simple value: colors, font stacks, type sizes,
weights, spacing steps, radii, the grid, motion timing. Each one is a token.

**`src/styles/theme.<name>.css`** holds what a single value cannot express:
loading font files with `@font-face`, any special rule such as a hover
treatment, and the section label device: each home page section marks its
title with `data-section-label` and its number with `data-section-index`,
and the theme file styles those two hooks.

Rule of thumb: if it is one value, it is a token. If it needs a selector, it
goes in the theme file.

## To restyle the whole site, edit only these

1. `tokens.json`: change values in the group for your theme.
2. `src/styles/theme.<name>.css`: font loading and special rules.
3. `site.config.ts`: set `theme` to the theme name.

Then run `npm run tokens` (it also runs on `npm run dev` and `npm run build`).

Never edit `src/styles/tokens.css`. It is generated from `tokens.json` and is
overwritten on every run. You should not need to edit `global.css`, `print.css`
or anything in `src/components`, `src/layouts` or `src/pages` to change a look.

## How tokens.json is organized

- `base` is the neutral theme and the full list of tokens.
- Every other top-level group, such as `will`, is a theme. It lists only the
  tokens it changes. Everything else falls through to `base`.
- A theme can only change a token that exists in `base`. To add a new token,
  add it to `base` first, then override it in the theme if needed.
- Names become CSS variables by joining the path with hyphens:
  `base > color > ink-muted` is `--color-ink-muted`.
- A value can point at another token: `"{color.ink}"`.

Example override:

```json
"will": {
  "color": { "accent": { "$type": "color", "$value": "#0000ee" } }
}
```

## Adding a new theme

1. In `tokens.json`, add a top-level group with the theme name (lowercase
   letters, numbers, hyphens). List only the tokens that differ from `base`.
2. Copy `src/styles/theme.will.css` to `src/styles/theme.<name>.css` and
   start every selector with `:root[data-theme="<name>"]`.
3. In `src/styles/global.css`, add `@import "./theme.<name>.css";` after the
   other theme imports and before `print.css`.
4. In `site.config.ts`, set `theme: "<name>"`.
5. Run `npm run tokens`, then `npm run check`. The check fails, with file
   and line, if a layout file holds a raw value in place of `var(--token)`.

## Figma (Tokens Studio)

`tokens.json` is in the W3C Design Tokens format, which the Tokens Studio
plugin for Figma reads. In the plugin, load `tokens.json` from file (or
connect the GitHub repo) with the W3C DTCG format turned on.

- `base` and `will` each appear as a token set. Turn on `base`, then turn on
  `will` above it to see the overrides applied.
- This goes one direction only. The repo is the source. Change a value in
  `tokens.json`, then load it into Figma again. Do not push from Figma.

## Resume PDF and CV

The resume PDF is the `/resume` page printed (`npm run pdf`), so it uses the
same tokens as the site. Change a font or size token and the PDF follows on
the next build. `src/styles/print.css` holds the paper-only rules: page size
and margins, black on white, hidden navigation. A CV built the same way, as
a printed route, inherits the tokens with no extra work.

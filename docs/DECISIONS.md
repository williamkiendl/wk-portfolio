# Decisions

A short log of the choices behind this repo, so nobody has to guess later.
Each entry is the decision and the one-line reason. Add new ones at the
bottom with a date.

## Architecture

| Decision | Reason |
| --- | --- |
| Astro, not Next.js | The site is pages of words and images. Astro ships plain HTML with no JavaScript by default and has built-in checked content folders. Next.js adds a React runtime and server concepts this site never uses. |
| Vercel, not GitHub Pages | Vercel gives every branch a preview link with no setup, which is the whole review workflow for a solo owner. GitHub Pages only publishes one branch. |
| Plain scoped CSS with CSS variables, not Tailwind | One less dependency, styles stay readable next to the markup, and the token check stays simple: it only has to look for raw values in `<style>` blocks. |
| A short script for tokens, not Style Dictionary | `scripts/build-tokens.mjs` turns `tokens.json` into CSS variables with no packages. Same reason as above: fewer packages to keep updated. Style Dictionary is the upgrade path if tokens ever need to feed other platforms. |
| Markdown first, MDX when needed | Markdown is editable by anyone in the GitHub web editor. MDX is installed for the rare case study that needs a custom component, and is opt-in per file. |
| Resume PDF generated outside the Vercel build | Making a PDF needs a real browser, and Vercel's build machines cannot reliably run one. The PDF is made locally or by a GitHub Action and committed as a normal file. |
| CMS deferred | The GitHub web editor is enough for one part-time editor. Keystatic or Sveltia can be added later, because both read and write the same files in `content/` and need no database. |

## Repo and deploy

| Decision | Reason |
| --- | --- |
| No Vercel adapter | The site is fully static. Vercel detects Astro and serves the `dist/` folder with zero configuration. An adapter is only needed for server features. |
| `vercel.json` holds one setting, `trailingSlash: false` | Framework, build command and output folder are detected automatically, so stating them would be noise. Without this one setting, `/resume` and `/resume/` both work, which search engines read as duplicate pages. `cleanUrls` is left out because Astro already writes `resume/index.html`, so there is no `.html` to hide. |
| Playwright is not in `package.json` | It is only needed to make the PDF. Installing it on demand keeps `npm install` and every Vercel build small. |
| The PDF workflow opens a pull request, not a direct commit | A resume is worth one look before it goes live, and the pull request gets a preview link. The cost is one repo setting and no Check line on that pull request. |
| Actions pinned by major version (`@v7`) | Gets security fixes automatically without surprise breaking changes, and needs no upkeep from a solo owner. |
| The fork check parses `site.config.ts` as text | No TypeScript tooling needed, so the script has zero dependencies and runs anywhere Node runs. |

## What could be obsolete in two years, and the fallback

- Astro changes its content or config format in a major version. Fallback:
  stay on the current major (the lockfile pins it) until there is time to
  follow the official upgrade guide. The content is plain Markdown, YAML and
  JSON and moves to any other static site tool unchanged.
- Vercel changes or limits its free tier. Fallback: the build output is a
  plain folder of files (`dist/`). Netlify, Cloudflare Pages and GitHub Pages
  can all host it. Only `vercel.json` and the DNS records change.
- GitHub Actions versions used here are retired (GitHub removes old Node
  runtimes every couple of years). Fallback: raise the number after `@` in
  the two workflow files to the newest major version. The site still deploys
  without Actions, since Vercel builds on its own.
- Playwright or its Chromium download changes how it installs. Fallback:
  open `/resume` in any browser, choose Print, then Save as PDF, Letter size,
  and commit the file as `public/resume.pdf`. The print styles do the work.
- The hand-written token script is outgrown (multiple brands, design tool
  sync, native apps). Fallback: replace it with Style Dictionary. The
  `tokens.json` shape and the `--group-key` variable names were chosen so
  that swap does not touch any component.

# williamkiendl.me

This repo is the source for the personal site at williamkiendl.me. It is a
static site built with Astro, stored on GitHub and published by Vercel.
Whatever is on the `main` branch is the live site, and every other branch
gets its own private preview link.

## The three layers

The site is split into three layers that never mix. Pick the layer, edit
only those files.

| You want to change | Layer | Files you edit |
| --- | --- | --- |
| Words and images | Content | `content/`, `public/`, `site.config.ts` |
| Looks (color, type, spacing) | Theme | `tokens.json`, `src/styles/theme.<name>.css` |
| Structure (what goes where) | Layout | `src/components/`, `src/layouts/`, `src/pages/` |

Most weeks you will only touch the first row. Details:
[docs/CONTENT.md](docs/CONTENT.md) for words and images,
[docs/THEMING.md](docs/THEMING.md) for looks,
[docs/DECISIONS.md](docs/DECISIONS.md) for why it is built this way.

## One-time setup

1. Create the GitHub repo. On github.com click **+** > **New repository**.
   Name it, choose **Private** or **Public**, and do not add a README or
   license. Click **Create repository**.
2. Push this folder to it. GitHub shows the exact lines under "push an
   existing repository from the command line". Paste them into Terminal
   from inside this folder.
3. Let the PDF workflow open pull requests. In the repo: **Settings** >
   **Actions** > **General** > **Workflow permissions** > tick **Allow
   GitHub Actions to create and approve pull requests** > **Save**.
4. Connect Vercel. At vercel.com sign up with **Continue with GitHub**
   (the free Hobby plan is enough). Click **Add New** > **Project**, find
   the repo, click **Import**. Vercel detects Astro on its own. Change
   nothing and click **Deploy**.
5. Add the domain. In the Vercel project: **Settings** > **Domains** >
   **Add Domain**, type `williamkiendl.me`, and accept the suggestion to
   add `www.williamkiendl.me` as a redirect.
6. Point the domain at Vercel. Vercel now shows two DNS records: an `A`
   record for `@` and a `CNAME` record for `www`. Log in where the domain
   was bought, open its DNS settings, and add both records with the exact
   values Vercel shows. Remove any older `A` or `CNAME` records for `@`
   and `www`. Vercel shows **Valid Configuration** once it sees them,
   usually within an hour, and sets up HTTPS for you.

## Day to day, in the GitHub web editor

1. Open the file on github.com and click the pencil icon.
2. Make the edit. Click **Commit changes**, choose **Create a new branch
   and start a pull request**, then **Propose changes** and **Create pull
   request**.
3. Wait about a minute. Two things appear on the pull request: a Vercel
   comment with a **Preview** link, and a **Check** line that turns green.
4. Open the preview link and look at your change on the real site.
5. If it looks right and the check is green, click **Merge pull request**.
   The live site updates in about a minute. Then **Delete branch**.

For several edits at once, press the `.` key on the repo page. That opens
the full editor in your browser. Create a branch there first (bottom left
corner), then commit from the Source Control panel.

## The four commands, if you work on your own computer

You need Node.js 22 or newer from nodejs.org. Run these in Terminal from
inside this folder.

| Command | What it does |
| --- | --- |
| `npm install` | Downloads the packages the site needs. Run once, and again after pulling changes. |
| `npm run dev` | Starts a live preview at the address it prints. Updates as you save. |
| `npm run build` | Builds the finished site into `dist/`, exactly as Vercel does. |
| `git push` | Sends your committed changes to GitHub, which starts a deploy. |

One more that is worth knowing: `npm run check` runs the same checks as
the green tick on GitHub.

## When a deploy fails

Nothing breaks for visitors. A failed build never replaces the live site.

Where to look: on the pull request (or on the repo's front page, next to
the latest commit) there is a red X. Click it, then **Details**. Scroll to
the bottom of the step with the red X and read the last 20 lines. The
message names the file and usually the line.

The three most common causes:

1. A missing frontmatter field. The message names a file in `content/`
   and a field marked "Required". Frontmatter is the block between the
   `---` lines at the top of a content file. Add the field. The full list
   is in docs/CONTENT.md.
2. A raw value flagged by the token check. A color, size or font was
   typed straight into a component. Put the value in `tokens.json` and
   refer to it as `var(--token-name)`. See docs/THEMING.md.
3. A personal string flagged by the fork check. A name, email, phone
   number or domain was typed into a layout or tooling file. Move it to
   `site.config.ts` and use `site.name`, `site.contact.email` and so on.

Fix the file on the same branch. The check runs again by itself. If you
are stuck, close the pull request without merging. The live site is
unchanged.

## Regenerating the resume PDF

The **Download PDF** link serves `public/resume.pdf`, a normal file in
this repo. It is made from the `/resume` page, so the two always match.

The easy way: when the resume content or the theme changes on `main`,
the **Resume PDF** workflow opens a pull request called "Update resume
PDF". Open its preview link, add `/resume.pdf` to the address, check the
page breaks, and merge. To run it by hand: **Actions** tab > **Resume
PDF** > **Run workflow**. This pull request shows no Check line, which is
expected.

On your own computer:

```
npm run build
npm install --no-save playwright && npx playwright install chromium
npm run pdf
```

The middle line installs the PDF tool. If Google Chrome is already
installed, `npm install --no-save playwright` alone is enough. The PDF is
never built on Vercel, because Vercel's build machines cannot reliably
run a browser.

## How to fork this for someone else

Copy the repo (**Use this template** or **Fork** on GitHub), then change
exactly these five things:

1. `site.config.ts`: name, links, navigation, section titles, labels.
2. `tokens.json`: colors, fonts, sizes, spacing.
3. `src/styles/theme.<name>.css`: add a theme file with the new name and
   set `theme` in `site.config.ts` to match.
4. `content/`: replace every file with the new person's words.
5. `public/`: replace the images, favicon and `resume.pdf`.

Then connect Vercel and add the domain, as in "One-time setup" above.

Run `npm run check` when you are done. The fork check confirms that no
trace of the previous owner is left in the layout or tooling files, and
nothing in `src/components`, `src/layouts` or `src/pages` should have
needed an edit.

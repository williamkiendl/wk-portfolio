# Editing content

In GitHub: open a file, click the pencil, edit, click "Commit changes". The site rebuilds in a minute or two.

## Where things live

| What | File or folder |
| --- | --- |
| Name, title, location, email, links, nav and section labels | `site.config.ts` |
| Home page copy (greeting, value prop, section intros, contact headline) | `content/home.yaml` |
| Case studies and smaller projects | `content/work/`, one `.md` file each |
| Posts | `content/writing/`, one `.md` file each |
| Resume (also feeds Career history on the home page) | `content/resume.json` |
| Reference library captions | `content/library/captions.yaml` |
| Images | `public/` (`public/work/<file-name>/`, `public/library/`) |

Text reading `[PLACEHOLDER: ...]` awaits final copy. Replace it all, keep the quotes.

## Add a case study

1. In `content/work/`, click "Add file", then "Create new file".
2. Name it in lowercase with hyphens, e.g. `my-project.md`. The name becomes the web address.
3. Paste the template below and fill it in.
4. Upload images to `public/work/my-project/` ("Add file", then "Upload files").
5. Write the page text under the second `---` line. Start headings with `## `.
6. Commit. Leave `draft: true` until it is ready to be seen.

```
---
title: "[PLACEHOLDER: case study title, 2-8 words]"
company: "[PLACEHOLDER: company]"
role: "[PLACEHOLDER: role, 2-6 words]"
years: "[PLACEHOLDER: years, e.g. YYYY to YYYY]"
outcome: "[PLACEHOLDER: work card outcome, 60-110 chars]"
hero: "/work/my-project/hero.jpg"
heroAlt: "[PLACEHOLDER: hero image description, 5-15 words]"
gallery:
  - src: "/work/my-project/one.jpg"
    alt: "[PLACEHOLDER: gallery image description, 5-15 words]"
featured: true
order: 1
draft: true
---

Page text goes here.
```

`hero`, `heroAlt` and `gallery` are optional. Every other line is required.

## Add a post

Create `content/writing/my-post.md` with this at the top, then write below it:

```
---
title: "[PLACEHOLDER: post title]"
date: 2026-01-31
summary: "[PLACEHOLDER: one line summary, optional]"
draft: false
---
```

Then set `writingInNav: true` in `site.config.ts` to show Writing in the nav.

## Draft, featured and order

- `featured: true` shows the project as a large card under Selected work.
  `featured: false` shows it as a row under Additional work.
- `order` sets the position within its own list. 1 comes first.
- `draft: true` on a work file shows a "Coming soon" row and builds no page.
  On a post it hides the post completely. `draft: false` makes either live.

## Length guide

| Slot | Length |
| --- | --- |
| Hero greeting | 2-6 words |
| Title + location | 30-70 chars |
| Value prop | 60-110 chars |
| Work card outcome | 60-110 chars |
| Additional work title | 2-6 words |
| Section intro | 0-160 chars |
| Contact headline | 3 words to 40 chars |
| Case study title | 2-8 words |
| Library caption | 3 words to 60 chars |

## If the build fails

GitHub shows a red X next to your commit. Click it, then "Details". A message
like `data does not match collection schema` or `invalid frontmatter` means the
block between the `---` lines of the named file has a problem. Usual causes:

- A required line is missing. See the template above.
- Text is missing its quotation marks, or has a `"` inside it. Use `'` inside.
- `featured`, `draft` or `order` has quotes around it. They take none.
- The indentation changed. Use spaces, never tabs, and match the template.
- One of the two `---` lines was deleted.

Fix the file and commit again. The live site stays on the last good version.

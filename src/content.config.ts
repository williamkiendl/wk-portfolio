/**
 * Content schemas. These define what fields each kind of content file must
 * have. If a build fails with "invalid frontmatter", the answer is here.
 * A future CMS (Keystatic or Sveltia) mirrors this file; no content moves.
 */
import { defineCollection } from "astro:content";
import { glob, file } from "astro/loaders";
import { z } from "astro/zod";

const work = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./content/work" }),
  schema: z.object({
    title: z.string(),
    company: z.string(),
    role: z.string(),
    years: z.string(),
    outcome: z.string(), // one line, 60-110 chars, shown on cards
    hero: z.string().optional(), // path under /work/<slug>/, e.g. "/work/my-slug/hero.jpg"
    heroAlt: z.string().optional(),
    gallery: z
      .array(z.object({ src: z.string(), alt: z.string() }))
      .default([]),
    featured: z.boolean(), // true = Selected work card, false = Additional work row
    order: z.number(),
    draft: z.boolean().default(false), // true = "Coming soon" row, no page built
    tags: z.array(z.string()).default([]),
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./content/writing" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// content/home.yaml -> one entry with id "home"
const home = defineCollection({
  loader: glob({ pattern: "home.yaml", base: "./content" }),
  schema: z.object({
    hero: z.object({
      greeting: z.string(),
      valueProp: z.string(),
      portrait: z.string().optional(),
      portraitAlt: z.string().optional(),
    }),
    intros: z
      .object({
        work: z.string().optional(),
        more: z.string().optional(),
        library: z.string().optional(),
        career: z.string().optional(),
      })
      .default({}),
    contact: z.object({ headline: z.string() }),
    workIndex: z.object({ intro: z.string().optional() }).default({}),
  }),
});

const resumeEntry = z.object({
  org: z.string(),
  orgNote: z.string().optional(),
  role: z.string(),
  location: z.string().optional(),
  start: z.string(), // "YYYY" or "YYYY-MM"
  end: z.string(), // "YYYY", "YYYY-MM" or "present"
  bullets: z.array(z.string()).default([]),
  showOnHome: z.boolean().default(true),
});

// content/resume.json -> one entry with id "resume"
const resume = defineCollection({
  loader: glob({ pattern: "resume.json", base: "./content" }),
  schema: z.object({
    headline: z.string(),
    summary: z.string(),
    experience: z.array(resumeEntry),
    education: z.array(
      z.object({ school: z.string(), detail: z.string() }),
    ),
    skills: z.array(z.string()),
    tools: z.array(z.string()),
  }),
});

// content/library/captions.yaml -> list of { id, image, caption }
const library = defineCollection({
  loader: file("./content/library/captions.yaml"),
  schema: z.object({
    image: z.string(), // path under /library/, e.g. "/library/01.jpg"
    alt: z.string(),
    caption: z.string().optional(),
    order: z.number().default(0),
  }),
});

export const collections = { work, writing, home, resume, library };

/**
 * site.config.ts
 * Every name, link, nav label, handle and section title on the site lives here.
 * To make this site someone else's: edit this file, tokens.json, the theme file,
 * and replace the content/ and public/ folders. Nothing else.
 *
 * Strings marked [PLACEHOLDER: ...] are waiting on the copy doc.
 */

export const site = {
  // Identity
  name: "William Kiendl",
  shortName: "Will Kiendl",
  title: "Design Program Lead, Wearables Brand Design at Meta Reality Labs",
  location: "Los Angeles, CA",
  tagline:
    "Creative and design leader who takes first-of-their-kind products from brief to keynote.",
  headerLines: ["First-of-their-kind products,", "from brief to keynote."],

  // Technical
  url: "https://williamkiendl.me",
  locale: "en-US",
  theme: "base", // "base" (neutral) or "will". Matches src/styles/theme.<name>.css

  // Contact. Shown in the contact section, /contact and the resume header.
  contact: {
    email: "williamkiendl@gmail.com",
    phone: "[PLACEHOLDER: phone number, or delete this line]",
    linkedin: {
      label: "LinkedIn",
      href: "[PLACEHOLDER: LinkedIn profile URL]",
    },
    resume: { label: "Resume", href: "/resume" },
    resumePdf: { label: "Download PDF", href: "/resume.pdf" },
  },

  // Navigation. `href` starting with "/#" is an anchor on the home page.
  nav: [
    { label: "Work", href: "/#work" },
    { label: "Library", href: "/#library" },
    { label: "Career", href: "/#career" },
    { label: "Resume", href: "/resume" },
    { label: "Contact", href: "/#contact" },
  ],

  // Home page sections, in order. `id` is the anchor; `label` is the visible
  // section title; the number shown beside it comes from the order here.
  sections: [
    { id: "hero", label: "Introduction" },
    { id: "work", label: "Selected work" },
    { id: "more", label: "Additional work" },
    { id: "library", label: "Reference library" },
    { id: "career", label: "Career history" },
    { id: "contact", label: "Contact" },
  ],

  // Feature switches
  features: {
    writingInNav: false, // flip to true once the first post exists
    pageviews: null as null | { provider: "goatcounter"; code: string },
  },

  // Small interface labels, so no word is ever hardcoded in a component.
  labels: {
    comingSoon: "Coming soon",
    viewCaseStudy: "View case study",
    allWork: "All work",
    previous: "Previous",
    next: "Next",
    present: "Present",
    skills: "Skills",
    tools: "Tools",
    experience: "Experience",
    education: "Education",
    summary: "Summary",
    skipToContent: "Skip to content",
    writingEmpty: "[PLACEHOLDER: writing empty state, 40-80 chars]",
    emailLabel: "Email",
    phoneLabel: "Phone",
    // Word between two dates, as in "2018 to 2020".
    rangeSeparator: "to",
    // Goes between the page name and your name in the browser tab.
    titleSeparator: " | ",
    // Page names and headings used by the layout.
    writing: "Writing",
    contact: "Contact",
    expertise: "Expertise",
    notFound: "Page not found",
    backHome: "Back to home",
    // Names read aloud by screen readers for the two navigation areas.
    mainNav: "Main",
    caseStudyNav: "Case studies",
  },
} as const;

export type SiteConfig = typeof site;

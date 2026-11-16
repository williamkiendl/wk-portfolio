// scripts/fork-check.mjs
//
// The "fork check". It proves this repo is a reusable template.
//
// Rule: anything personal to the site owner (name, email, phone, domain) may
// live ONLY in site.config.ts, content/, public/ and the docs. It must never
// be typed into the layout or tooling code. If that rule holds, someone else
// can make this site theirs by editing a handful of files.
//
// How it works: it reads the personal strings out of site.config.ts as plain
// text, then searches the code folders for them. No packages needed.
//
// Run it with:  node scripts/fork-check.mjs   (also runs in `npm run check`)

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Where personal strings are NOT allowed.
const SCAN_FOLDERS = ["src", "scripts", ".github"];
const SCAN_FILES = ["astro.config.mjs", "package.json", "vercel.json", "tsconfig.json"];

// Everything else (site.config.ts, content/, public/, README.md, docs/,
// _source/, node_modules/, dist/) is never opened, because it is not listed
// above. These names are skipped if they ever appear inside a scanned folder.
const SKIP_NAMES = new Set(["node_modules", "dist", ".astro", ".vercel", ".git"]);

// ---------------------------------------------------------------------------
// 1. Read the personal strings from site.config.ts
// ---------------------------------------------------------------------------

function fail(message) {
  console.error(`\nFork check could not run.\n${message}\n`);
  process.exit(1);
}

const configPath = join(root, "site.config.ts");
if (!existsSync(configPath)) {
  fail("site.config.ts is missing from the top folder of the repo.");
}
const config = readFileSync(configPath, "utf8");

// Finds a line like   name: "Some Value",   and returns Some Value.
function readField(field) {
  const match = config.match(new RegExp(`^\\s*${field}:\\s*["'\`]([^"'\`]*)["'\`]`, "m"));
  const value = match ? match[1].trim() : "";
  // A slot still waiting on real text is not personal.
  return value.startsWith("[PLACEHOLDER") ? "" : value;
}

const name = readField("name");
const shortName = readField("shortName");
const email = readField("email");
const phone = readField("phone");
const url = readField("url");

if (!name || !url) {
  fail('Could not find `name: "..."` and `url: "..."` in site.config.ts.');
}

let hostname = "";
try {
  hostname = new URL(url).hostname.replace(/^www\./, "");
} catch {
  fail(`The url in site.config.ts is not a valid web address: ${url}`);
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Each entry: what we call it in the report, and the pattern to look for.
const needles = [];
function addNeedle(label, text, { wholeWord = false } = {}) {
  if (!text || text.length < 3) return; // too short to search for safely
  const body = wholeWord ? `(?<![A-Za-z0-9])${escape(text)}(?![A-Za-z0-9])` : escape(text);
  needles.push({ label, regex: new RegExp(body, "i") });
}

addNeedle("the full name", name);
addNeedle("the short name", shortName);
// The surname alone, as a whole word so a short surname does not match
// inside ordinary words.
addNeedle("the surname", name.split(/\s+/).pop(), { wholeWord: true });
addNeedle("the email address", email);
// The part of the email before the @, if it is long enough to be distinctive.
const emailUser = email.split("@")[0];
if (emailUser.length >= 6) addNeedle("the email user name", emailUser);
addNeedle("the domain", hostname);
// The domain without its ending (example.com -> example), if distinctive.
const domainLabel = hostname.split(".")[0];
if (domainLabel.length >= 6) addNeedle("the domain name", domainLabel);

// Phone: match the last ten digits with any punctuation or spaces between.
const phoneDigits = phone.replace(/\D/g, "").slice(-10);
if (phoneDigits.length >= 7) {
  needles.push({
    label: "the phone number",
    regex: new RegExp(phoneDigits.split("").join("[^0-9\\n]{0,3}")),
  });
}

// ---------------------------------------------------------------------------
// 2. Collect the files to scan
// ---------------------------------------------------------------------------

function listFiles(folder) {
  if (!existsSync(folder)) return [];
  const found = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (SKIP_NAMES.has(entry.name)) continue;
    const full = join(folder, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(full));
    else if (entry.isFile()) found.push(full);
  }
  return found;
}

const files = [
  ...SCAN_FOLDERS.flatMap((folder) => listFiles(join(root, folder))),
  ...SCAN_FILES.map((file) => join(root, file)).filter((file) => existsSync(file)),
];

// ---------------------------------------------------------------------------
// 3. Search every line
// ---------------------------------------------------------------------------

const hits = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  if (text.includes("\u0000")) continue; // an image or other binary file
  const path = relative(root, file).split("\\").join("/");

  text.split("\n").forEach((line, index) => {
    // The package name is allowed to carry the project name.
    if (path === "package.json" && /^\s*"name"\s*:/.test(line)) return;

    const matched = needles.filter((needle) => needle.regex.test(line));
    if (matched.length === 0) return;
    hits.push({
      where: `${path}:${index + 1}`,
      what: matched.map((needle) => needle.label).join(", "),
      line: line.trim().slice(0, 120),
    });
  });
}

// ---------------------------------------------------------------------------
// 4. Report
// ---------------------------------------------------------------------------

if (hits.length === 0) {
  console.log(`OK fork-check: no personal strings in ${files.length} layout and tooling files.`);
  process.exit(0);
}

console.error(`\nFork check failed: ${hits.length} line(s) contain personal details.\n`);
for (const hit of hits) {
  console.error(`  ${hit.where}  contains ${hit.what}`);
  console.error(`      ${hit.line}`);
}
console.error(`
What this means: a name, email, phone number or domain from site.config.ts
was typed directly into a layout or tooling file. Those details belong in
site.config.ts only, so the site can be handed to someone else by editing
one file.

How to fix it: open each file listed above, go to the line number after the
colon, and replace the typed-in value with the matching field from
site.config.ts. In a component that looks like:

    import { site } from "@config";
    ... {site.name} ... {site.contact.email} ...
`);
process.exit(1);

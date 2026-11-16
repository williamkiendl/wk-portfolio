#!/usr/bin/env node
/**
 * check-tokens.mjs
 *
 * WHAT THIS DOES
 * Guards the rule that keeps the site easy to restyle: the layout files
 * (src/components, src/layouts, src/pages) must never contain a design value
 * typed in directly. Every color, font, size, weight and duration has to be a
 * token, written as var(--something). This script reads those files and
 * lists every place the rule is broken.
 *
 * HOW TO RUN IT
 *   npm run check
 * It exits with an error (code 1) if it finds anything, which also stops the
 * automated checks on GitHub.
 *
 * WHAT IT LOOKS AT
 * Only CSS, in three places:
 *   1. inside <style> ... </style> blocks in .astro files
 *   2. inside style="..." attributes in .astro files
 *   3. whole .css files
 * In .ts files it only looks inside quoted text, for colors and lengths.
 * Ordinary page text and code are never inspected.
 *
 * WHAT IS ALLOWED
 *   var(--token), 0, 100%, auto, 1fr, vw and vh, unitless numbers such as
 *   grid-column: span 6 or aspect-ratio: 4 / 3, and calc() over tokens.
 * The condition of an @media or @container rule, for example
 * (min-width: 40rem), is not checked, because CSS does not allow var() there.
 *
 * THE ESCAPE HATCH
 * Put the comment  token-check-ignore  on a line (inside a CSS comment) and
 * that line is skipped. Use it rarely, and say why next to it.
 *
 * FOR TESTING ONLY
 *   node scripts/check-tokens.mjs some/folder some/file.css
 * checks those paths instead of the three default folders.
 *
 * This script uses nothing but Node itself. There is no package to install.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, resolve, relative, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_FOLDERS = ["src/components", "src/layouts", "src/pages"];
const FILE_TYPES = new Set([".astro", ".css", ".ts"]);
const IGNORE_MARKER = "token-check-ignore";

const args = process.argv.slice(2);
const targets = args.length
  ? args.map((arg) => resolve(arg))
  : DEFAULT_FOLDERS.map((folder) => resolve(repoRoot, folder));

// ---------------------------------------------------------------------------
// The patterns that count as a raw design value.
// ---------------------------------------------------------------------------

// #fff, #ffff, #ffffff, #ffffffff
const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;

// rgb(...), hsl(...), oklch(...) and friends. color-mix() is allowed, since
// it mixes tokens; whatever sits inside it is still checked.
const COLOR_FUNCTION = /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;

// A number followed by a fixed unit: 12px, 1.5rem, 2em, 10pt, 200ms, 0.3s...
// The look-behind stops it matching inside words and names (h1, span-2).
const LENGTH = /(?<![\w.#-])-?(\d*\.?\d+)(px|rem|em|pt|pc|cm|mm|in|ch|ex|ms|s)(?![\w-])/gi;

// Color words. Only checked on properties that take a color.
const NAMED_COLORS = new Set(
  ("black white red green blue yellow orange purple pink gray grey silver maroon navy teal aqua " +
    "cyan magenta fuchsia lime olive brown gold beige ivory coral crimson indigo violet khaki " +
    "salmon tan turquoise tomato orchid plum lavender whitesmoke gainsboro lightgray lightgrey " +
    "darkgray darkgrey dimgray dimgrey slategray slategrey rebeccapurple hotpink skyblue " +
    "royalblue steelblue firebrick darkred darkblue darkgreen midnightblue").split(" ")
);
const COLOR_PROPERTY = /color|background|border|outline|fill|stroke|shadow|decoration|caret|accent|column-rule/;

// Words that are fine in font-family and the font shorthand.
const FONT_KEYWORDS = new Set([
  "inherit", "initial", "unset", "revert", "revert-layer",
  "normal", "italic", "oblique", "small-caps",
]);

// What to tell the reader for each kind of problem.
const ADVICE = {
  color: "use a color token, for example var(--color-ink)",
  font: "use a font token, for example var(--font-body)",
  length: "use a token, for example var(--space-4) or var(--text-md)",
  duration: "use var(--motion-duration)",
  weight: "use a weight token, for example var(--weight-bold)",
};

// ---------------------------------------------------------------------------
// Collecting problems.
// ---------------------------------------------------------------------------

const problems = [];
let filesChecked = 0;

/** Work out the line number of a character position in a file. */
function lineOf(fileText, position) {
  let line = 1;
  for (let i = 0; i < position && i < fileText.length; i++) {
    if (fileText[i] === "\n") line++;
  }
  return line;
}

/** Record one problem, unless its line carries the ignore comment. */
function report(file, position, found, kind) {
  const line = lineOf(file.text, position);
  if (file.lines[line - 1].includes(IGNORE_MARKER)) return;
  const key = line + "|" + found + "|" + kind;
  if (file.seen.has(key)) return; // never list the same thing twice
  file.seen.add(key);
  problems.push({ path: file.shortPath, line, found: found.trim(), kind });
}

/** Replace a stretch of text with spaces, keeping line breaks in place. */
function blank(text) {
  return text.replace(/[^\n]/g, " ");
}

// ---------------------------------------------------------------------------
// Checking CSS.
// ---------------------------------------------------------------------------

/**
 * Check a piece of CSS. `offset` is where this piece starts inside the file,
 * so reported line numbers match what you see in your editor.
 */
function checkCss(file, cssText, offset) {
  // Hide the things that are not design values: comments, quoted text
  // (it gets its own font check below) and the inside of url(...).
  let css = cssText
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/url\([^)]*\)/gi, (match) => "url(" + blank(match.slice(4, -1)) + ")")
    .replace(/"[^"\n]*"|'[^'\n]*'/g, (match) => match[0] + "_".repeat(match.length - 2) + match[0]);

  // Walk through the CSS one piece at a time. A piece that ends at "{" is a
  // selector or an @media condition: skipped. A piece that ends at ";" or
  // "}" is a declaration such as "color: red": checked.
  let start = 0;
  for (let i = 0; i <= css.length; i++) {
    const character = i < css.length ? css[i] : ";"; // treat the end as a ";"
    if (character === "{") {
      start = i + 1;
    } else if (character === ";" || character === "}") {
      checkDeclaration(file, css.slice(start, i), offset + start);
      start = i + 1;
    }
  }
}

/** Check one "property: value" pair. */
function checkDeclaration(file, declaration, offset) {
  const colon = declaration.indexOf(":");
  if (colon === -1) return;
  const property = declaration.slice(0, colon).trim().toLowerCase();
  if (property === "" || property.startsWith("@")) return; // @import, @charset...

  const valueOffset = offset + colon + 1;
  // Hide token names so the digits in --space-4 are not read as numbers.
  // Whatever else is inside var(...), such as a fallback value, stays visible.
  const value = declaration.slice(colon + 1).replace(/--[\w-]+/g, blank);

  for (const match of value.matchAll(HEX_COLOR)) {
    report(file, valueOffset + match.index, match[0], "color");
  }
  for (const match of value.matchAll(COLOR_FUNCTION)) {
    report(file, valueOffset + match.index, match[0] + "...)", "color");
  }
  for (const match of value.matchAll(LENGTH)) {
    if (Number(match[1]) === 0) continue; // 0px and 0s are just zero
    const kind = /^m?s$/i.test(match[2]) ? "duration" : "length";
    report(file, valueOffset + match.index, match[0], kind);
  }

  if (COLOR_PROPERTY.test(property)) {
    for (const match of value.matchAll(/(?<![\w-])[a-zA-Z]+(?![\w(-])/g)) {
      if (NAMED_COLORS.has(match[0].toLowerCase())) {
        report(file, valueOffset + match.index, match[0], "color");
      }
    }
  }

  if (property === "font-weight") {
    for (const match of value.matchAll(/(?<![\w.-])(\d+|bold|bolder|lighter)(?![\w-])/gi)) {
      report(file, valueOffset + match.index, match[0], "weight");
    }
  }

  if (property === "font-family" || property === "font") {
    // Take away the tokens and see whether a font name is left over.
    const leftovers = value
      .replace(/var\(\s*\)/g, blank)
      .replace(/calc\([^;]*\)/g, blank);
    for (const match of leftovers.matchAll(/"[^"]*"|'[^']*'|[a-zA-Z][\w-]*/g)) {
      if (FONT_KEYWORDS.has(match[0].toLowerCase())) continue;
      if (/^var$/i.test(match[0])) continue;
      report(file, valueOffset + match.index, "font name in " + property, "font");
      break; // one report per declaration is enough
    }
    if (property === "font") {
      for (const match of value.matchAll(/(?<![\w.-])[1-9]00(?![\w.%-])/g)) {
        report(file, valueOffset + match.index, match[0], "weight");
      }
    }
  }
}

/** A lighter check for text that is not full CSS (style={...}, .ts strings). */
function checkLoose(file, text, offset) {
  for (const match of text.matchAll(HEX_COLOR)) {
    report(file, offset + match.index, match[0], "color");
  }
  for (const match of text.matchAll(COLOR_FUNCTION)) {
    report(file, offset + match.index, match[0] + "...)", "color");
  }
  for (const match of text.replace(/--[\w-]+/g, blank).matchAll(LENGTH)) {
    if (Number(match[1]) === 0) continue;
    const kind = /^m?s$/i.test(match[2]) ? "duration" : "length";
    report(file, offset + match.index, match[0], kind);
  }
}

// ---------------------------------------------------------------------------
// Checking each kind of file.
// ---------------------------------------------------------------------------

function checkAstro(file) {
  let template = file.text;

  // 1. <style> blocks: full CSS check.
  template = template.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (whole, open, css, close, index) => {
    checkCss(file, css, index + open.length);
    return blank(whole);
  });

  // The code fence at the top (between the two --- lines) and <script>
  // blocks are code, not markup, so they are hidden before step 2.
  template = template.replace(/^---[\s\S]*?\n---/, blank);
  template = template.replace(/<script\b[\s\S]*?<\/script>/gi, blank);
  template = template.replace(/<!--[\s\S]*?-->/g, blank);

  // 2. style="..." and style='...' attributes: full CSS check.
  for (const match of template.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const css = match[1] ?? match[2];
    checkCss(file, css, match.index + match[0].length - css.length - 1);
  }

  // 3. style={...} attributes (a value built in code): lighter check.
  for (const match of template.matchAll(/\sstyle\s*=\s*\{/gi)) {
    const begin = match.index + match[0].length;
    let depth = 1;
    let end = begin;
    while (end < template.length && depth > 0) {
      if (template[end] === "{") depth++;
      if (template[end] === "}") depth--;
      end++;
    }
    checkLoose(file, template.slice(begin, end - 1), begin);
  }
}

function checkTypeScript(file) {
  // Only quoted text is inspected, so numbers in ordinary code never match.
  const withoutComments = file.text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, (match, before) => before + blank(match.slice(before.length)));
  for (const match of withoutComments.matchAll(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g)) {
    checkLoose(file, match[0], match.index);
  }
}

function checkFile(path) {
  const text = readFileSync(path, "utf8");
  const rel = relative(repoRoot, path);
  const file = {
    text,
    lines: text.split("\n"),
    shortPath: rel.startsWith("..") ? path : rel,
    seen: new Set(),
  };
  filesChecked++;

  const type = extname(path);
  if (type === ".astro") checkAstro(file);
  if (type === ".css") checkCss(file, text, 0);
  if (type === ".ts") checkTypeScript(file);
}

/** Visit a file, or every matching file inside a folder. */
function visit(path) {
  if (!existsSync(path)) return; // a missing folder is fine: nothing to check
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path).sort()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      visit(join(path, name));
    }
  } else if (FILE_TYPES.has(extname(path))) {
    checkFile(path);
  }
}

// ---------------------------------------------------------------------------
// Run, then print the result.
// ---------------------------------------------------------------------------

for (const target of targets) visit(target);

// List problems in reading order: by file, then by line.
problems.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);

if (problems.length === 0) {
  console.log("Token check OK: no raw design values (" + filesChecked + " files checked).");
  process.exit(0);
}

console.error("\nToken check failed: " + problems.length + " raw design value(s) found in layout files.\n");
for (const problem of problems) {
  console.error(
    "  " + problem.path + ":" + problem.line + "  " + problem.found + "  ->  " + ADVICE[problem.kind]
  );
}
console.error(`
Why this matters: layout files describe structure only. Every color, font,
size, weight and duration lives in tokens.json, so the whole site can be
restyled from one place.

How to fix each line above:
  1. Replace the value with a token, for example  color: var(--color-ink);
     The full list of tokens is in src/styles/tokens.css.
  2. If no token fits, add one to the "base" group in tokens.json, run
     \`npm run tokens\`, then use the new var(--...) name.
  3. If the value truly is not a design decision, add the comment
     /* ${IGNORE_MARKER} */ to the end of that line, with a short reason.

More detail: docs/THEMING.md
`);
process.exit(1);

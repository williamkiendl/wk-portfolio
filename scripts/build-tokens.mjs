#!/usr/bin/env node
/**
 * build-tokens.mjs
 *
 * WHAT THIS DOES
 * Reads tokens.json (the single list of design values: colors, fonts, sizes,
 * spacing) and writes src/styles/tokens.css, which is the same list in the
 * form a browser understands (CSS variables such as --color-ink).
 *
 * HOW TO RUN IT
 *   npm run tokens
 * It also runs automatically before `npm run dev` and `npm run build`.
 *
 * HOW tokens.json IS READ
 * - The top-level group called "base" is the full set of tokens. It becomes
 *     :root { --color-ink: #111111; ... }
 *   The variable name is the path to the token joined with hyphens, so
 *   base > color > ink-muted becomes --color-ink-muted.
 * - Every other top-level group (for example "will") is a theme. A theme
 *   lists only the tokens it changes. It becomes
 *     :root[data-theme="will"] { --color-ink: ...; }
 * - Any key that starts with "$" ($description, $type, ...) is a note for
 *   people and tools. Only "$value" ends up in the CSS.
 *
 * FOR TESTING ONLY
 *   node scripts/build-tokens.mjs some/other/tokens.json            (prints the CSS, writes nothing)
 *   node scripts/build-tokens.mjs some/other/tokens.json out.css    (writes to out.css)
 *
 * This script uses nothing but Node itself. There is no package to install.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

// The repo root is one folder up from this script, wherever it is run from.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Optional arguments: [path to a tokens file] [path for the CSS output].
const [inputArg, outputArg] = process.argv.slice(2);
const inputPath = inputArg ? resolve(inputArg) : resolve(repoRoot, "tokens.json");
// With a custom input and no output path we only print, so a test run can
// never overwrite the real src/styles/tokens.css by accident.
const printOnly = Boolean(inputArg) && !outputArg;
const outputPath = outputArg
  ? resolve(outputArg)
  : resolve(repoRoot, "src/styles/tokens.css");

/** Stop with a readable message instead of a wall of code. */
function fail(message) {
  console.error("\nToken build failed.\n");
  console.error(message);
  console.error("\nNothing was written. Fix " + shortPath(inputPath) + " and run `npm run tokens` again.\n");
  process.exit(1);
}

/** Show paths relative to the repo so messages stay short. */
function shortPath(path) {
  const rel = relative(repoRoot, path);
  return rel.startsWith("..") ? path : rel;
}

// ---------------------------------------------------------------------------
// 1. Read the file and make sure it is valid JSON.
// ---------------------------------------------------------------------------

let rawText;
try {
  rawText = readFileSync(inputPath, "utf8");
} catch {
  fail("Could not find or open " + shortPath(inputPath) + ".");
}

let tokens;
try {
  tokens = JSON.parse(rawText);
} catch (error) {
  fail(
    shortPath(inputPath) + " is not valid JSON, so it cannot be read.\n" +
      "The usual causes are a missing comma between two lines, a comma after the\n" +
      "last item in a group, or a missing quote mark.\n" +
      "What the parser said: " + error.message
  );
}

if (tokens === null || typeof tokens !== "object" || Array.isArray(tokens)) {
  fail("The top level of the tokens file must be a group in curly braces { }.");
}
if (!isGroup(tokens.base)) {
  fail('The tokens file needs a top-level group called "base". It holds the full set of tokens.');
}

// ---------------------------------------------------------------------------
// 2. Helpers that walk the nested groups and collect the tokens.
// ---------------------------------------------------------------------------

/** True for a { } group, false for text, numbers and lists. */
function isGroup(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Turn a nested group into a flat list of tokens.
 * { color: { ink: { $value: "#111" } } }  becomes  [{ path: ["color","ink"], value: "#111" }]
 */
function flatten(group, themeName, path = []) {
  const found = [];
  for (const [key, child] of Object.entries(group)) {
    if (key.startsWith("$")) continue; // notes such as $description
    const here = [...path, key];
    const label = themeName + "." + here.join(".");

    if (!/^[A-Za-z0-9_-]+$/.test(key)) {
      fail('The name "' + label + '" can only use letters, numbers, hyphens and underscores.');
    }
    if (!isGroup(child)) {
      fail(
        '"' + label + '" is not written as a token.\n' +
          'A token looks like this:  "' + key + '": { "$type": "color", "$value": "#111111" }'
      );
    }
    if ("$value" in child) {
      found.push({ path: here, value: child.$value, type: child.$type });
    } else {
      found.push(...flatten(child, themeName, here));
    }
  }
  return found;
}

/** ["color", "ink-muted"] becomes "--color-ink-muted". */
function variableName(path) {
  return "--" + path.join("-");
}

/**
 * Turn a token value into CSS text.
 * Most values are already plain text or a number and pass straight through.
 * The token format also allows a few structured shapes, handled here.
 */
function cssValue(token, label, baseNames) {
  const value = token.value;
  let text;

  if (typeof value === "string" || typeof value === "number") {
    text = String(value);
  } else if (Array.isArray(value) && token.type === "cubicBezier") {
    // [0.2, 0, 0, 1] becomes cubic-bezier(0.2, 0, 0, 1)
    text = "cubic-bezier(" + value.join(", ") + ")";
  } else if (Array.isArray(value)) {
    // A list of font names. Names with spaces need quote marks in CSS.
    text = value
      .map((name) => (/\s/.test(name) && !/^["']/.test(name) ? '"' + name + '"' : name))
      .join(", ");
  } else if (isGroup(value) && "value" in value && "unit" in value) {
    // { "value": 1.5, "unit": "rem" } becomes 1.5rem
    text = String(value.value) + String(value.unit);
  } else {
    fail('"' + label + '" has a $value this script does not understand. Use plain text or a number.');
  }

  if (text.trim() === "") fail('"' + label + '" has an empty $value.');
  // A value like "{color.ink}" points at another token. It becomes
  // var(--color-ink) so the two always stay in step.
  text = text.replace(/\{([^{}]+)\}/g, (_, reference) => {
    const name = variableName(reference.trim().split("."));
    if (!baseNames.has(name)) {
      fail('"' + label + '" points at {' + reference + "}, but there is no such token in base.");
    }
    return "var(" + name + ")";
  });

  if (/[;{}]/.test(text)) {
    fail('"' + label + '" has a $value containing ; or { or }. Those characters would break the CSS file.');
  }

  return text;
}

// ---------------------------------------------------------------------------
// 3. Build the CSS text.
// ---------------------------------------------------------------------------

const baseTokens = flatten(tokens.base, "base");
const baseNames = new Set(baseTokens.map((token) => variableName(token.path)));

const lines = [
  "/*",
  " * GENERATED FILE. DO NOT EDIT.",
  " * This file is rebuilt from tokens.json every time the site runs or builds,",
  " * so any change made here by hand will be lost.",
  " * To change a value: edit tokens.json, then run `npm run tokens`.",
  " * Made by scripts/build-tokens.mjs.",
  " */",
  "",
  "/* base: the full set of tokens. Every theme starts from these. */",
  ":root {",
  ...baseTokens.map(
    (token) =>
      "  " + variableName(token.path) + ": " +
      cssValue(token, "base." + token.path.join("."), baseNames) + ";"
  ),
  "}",
];

// Every top-level group other than "base" is a theme.
const themeNames = Object.keys(tokens).filter((key) => key !== "base" && !key.startsWith("$"));

for (const themeName of themeNames) {
  if (!/^[a-z0-9-]+$/.test(themeName)) {
    fail('The theme name "' + themeName + '" can only use lowercase letters, numbers and hyphens.');
  }
  if (!isGroup(tokens[themeName])) {
    fail('The theme "' + themeName + '" must be a group in curly braces { }.');
  }

  const overrides = flatten(tokens[themeName], themeName);

  // A theme may only change tokens that base already has. This catches typos
  // (for example "ink-mute" instead of "ink-muted") that would otherwise
  // silently do nothing.
  for (const token of overrides) {
    const name = variableName(token.path);
    if (!baseNames.has(name)) {
      fail(
        'The theme "' + themeName + '" changes "' + token.path.join(".") +
          '", but base has no token with that name.\n' +
          "Check the spelling, or add the token to base first. Every token must exist in base\n" +
          "so that every theme has a complete set."
      );
    }
  }

  lines.push("");
  lines.push("/* " + themeName + ": only the tokens this theme changes. */");
  lines.push(':root[data-theme="' + themeName + '"] {');
  if (overrides.length === 0) {
    lines.push("  /* No overrides yet. This theme looks the same as base. */");
  }
  for (const token of overrides) {
    lines.push(
      "  " + variableName(token.path) + ": " +
        cssValue(token, themeName + "." + token.path.join("."), baseNames) + ";"
    );
  }
  lines.push("}");
}

const css = lines.join("\n") + "\n";

// ---------------------------------------------------------------------------
// 4. Write the file (or print it, in a test run).
// ---------------------------------------------------------------------------

if (printOnly) {
  process.stdout.write(css);
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, css);
  const themeSummary = themeNames.length ? themeNames.join(", ") : "none";
  console.log(
    "Tokens OK: wrote " + shortPath(outputPath) + " (" + baseTokens.length +
      " base tokens; themes: " + themeSummary + ")."
  );
}

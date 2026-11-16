// scripts/build-pdf.mjs
//
// Turns the built /resume page into public/resume.pdf.
//
// It opens the page in a real (invisible) Chrome browser and uses the
// browser's own "Save as PDF", so the PDF always matches the print styles in
// src/styles/print.css.
//
// This runs on your computer or in the "Resume PDF" GitHub Action. It does
// NOT run during the Vercel build, because Vercel's build machines cannot
// reliably run a browser. The finished PDF is committed like any other file.
//
// Usage:
//   npm run build        (first, so the dist/ folder exists)
//   npm run pdf
//
// Optional, mostly for testing:
//   node scripts/build-pdf.mjs <built-site-folder> <output-file> <page-path>
//   defaults:                  dist                public/resume.pdf  /resume

import { createServer } from "node:http";
import { existsSync, statSync, readFileSync, mkdirSync } from "node:fs";
import { join, resolve, extname, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(process.argv[2] ?? join(root, "dist"));
const outFile = resolve(process.argv[3] ?? join(root, "public", "resume.pdf"));
const pagePath = process.argv[4] ?? "/resume";

const INSTALL_COMMAND = "npm install --no-save playwright && npx playwright install chromium";

function fail(message) {
  console.error(`\nResume PDF was not created.\n\n${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Check the site has been built
// ---------------------------------------------------------------------------

if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  fail(
    `The built site folder was not found:\n  ${distDir}\n\n` +
      "Run this first, then try again:\n  npm run build",
  );
}

// ---------------------------------------------------------------------------
// 2. A tiny web server for the built site (so fonts and images load normally)
// ---------------------------------------------------------------------------

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
};

// Finds the file for a web path the same way a static host does:
// /resume -> dist/resume/index.html, or dist/resume.html, or dist/resume
function findFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  const target = resolve(join(distDir, clean));
  // Never serve anything outside the built site folder.
  if (target !== distDir && !target.startsWith(distDir + sep)) return null;

  const candidates = [target, join(target, "index.html"), `${target}.html`];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const server = createServer((request, response) => {
  let file = null;
  try {
    file = findFile(request.url ?? "/");
  } catch {
    file = null; // a malformed address
  }
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }
  const type = CONTENT_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
  response.writeHead(200, { "Content-Type": type });
  response.end(readFileSync(file));
});

// ---------------------------------------------------------------------------
// 3. Print the page to PDF
// ---------------------------------------------------------------------------

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    fail(
      "The PDF tool (Playwright) is not installed. It is left out of the\n" +
        "normal install on purpose, to keep the site build small.\n\n" +
        `Install it with this one line, then run \`npm run pdf\` again:\n  ${INSTALL_COMMAND}`,
    );
  }
}

// Tries Playwright's own browser first, then a copy of Google Chrome that is
// already installed on this computer.
async function launchBrowser(chromium) {
  const reasons = [];
  for (const options of [{}, { channel: "chrome" }]) {
    try {
      return await chromium.launch(options);
    } catch (error) {
      reasons.push(String(error.message).split("\n")[0]);
    }
  }
  fail(
    "No browser could be started to print the page.\n\n" +
      `Install one with this line, then run \`npm run pdf\` again:\n  npx playwright install chromium\n\n` +
      `Technical detail:\n  ${reasons.join("\n  ")}`,
  );
}

async function main() {
  if (!findFile(pagePath)) {
    fail(
      `The page ${pagePath} does not exist in the built site:\n  ${distDir}\n\n` +
        "Run `npm run build` again and check that it finishes without errors.",
    );
  }

  const { chromium } = await loadPlaywright();

  // Port 0 asks the computer for any free port.
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const address = `http://127.0.0.1:${server.address().port}${pagePath}`;

  const browser = await launchBrowser(chromium);
  try {
    const page = await browser.newPage();
    // Use the print styles, exactly as if you chose File > Print.
    await page.emulateMedia({ media: "print" });

    const reply = await page.goto(address, { waitUntil: "networkidle" });
    if (!reply || !reply.ok()) {
      fail(`The page ${pagePath} could not be opened (status ${reply ? reply.status() : "unknown"}).`);
    }
    // Wait for web fonts, so the PDF does not use a fallback font.
    await page.evaluate(() => document.fonts.ready);

    mkdirSync(dirname(outFile), { recursive: true });
    await page.pdf({
      path: outFile,
      format: "Letter", // US Letter, 8.5 x 11 inches
      printBackground: true,
      // If print.css sets its own page size or margins (@page), respect them.
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
    server.close();
  }

  const kilobytes = Math.round(statSync(outFile).size / 1024);
  console.log(`OK resume PDF written: ${outFile} (${kilobytes} KB)`);
  console.log("Open it and check the page breaks before you commit it.");
}

main().catch((error) => {
  server.close();
  fail(`Something unexpected went wrong while printing.\n\nTechnical detail:\n  ${error.message}`);
});

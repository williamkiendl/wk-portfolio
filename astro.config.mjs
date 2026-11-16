// Astro configuration. You should rarely need to touch this file.
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { site } from "./site.config.ts";

export default defineConfig({
  site: site.url,
  output: "static",
  trailingSlash: "never", // matches vercel.json so /resume/ and /resume agree
  integrations: [mdx(), sitemap()],
});

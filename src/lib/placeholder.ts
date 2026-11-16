/**
 * Placeholder helper.
 *
 * Any content string that starts with "[PLACEHOLDER" is still waiting on
 * real copy. The Text component uses this to mark it so it cannot be missed.
 */
export function isPlaceholder(value: unknown): boolean {
  return typeof value === "string" && value.trim().startsWith("[PLACEHOLDER");
}

/**
 * The same marker for finished HTML (the body of a Markdown page).
 * Any paragraph, heading, list item or quote whose text starts with
 * "[PLACEHOLDER" gets class="placeholder". Prose.astro runs this at build
 * time, so nothing is sent to the browser. With final copy it changes nothing.
 */
export function markPlaceholders(html: string): string {
  return html.replace(
    /<(p|h[1-6]|li|blockquote)(\s[^>]*)?>(\s*\[PLACEHOLDER)/g,
    (whole, tag: string, attributes: string = "", text: string) =>
      attributes.includes("class=") ? whole : `<${tag}${attributes} class="placeholder">${text}`,
  );
}

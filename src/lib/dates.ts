/**
 * Date helpers. All wording (the word for "present", the word between two
 * dates) and the locale come from site.config.ts, never from this file.
 */
import { site } from "@config";

/**
 * Turns a resume date into display text.
 *   "2021"     stays the year
 *   "2021-06"  becomes month and year in the site locale
 *   "present"  becomes site.labels.present
 * Anything else is shown exactly as written.
 */
export function formatDate(value: string): string {
  const text = value.trim();
  if (text.toLowerCase() === "present") return site.labels.present;

  const yearMonth = text.match(/^(\d{4})-(\d{2})$/);
  if (yearMonth) {
    const date = new Date(Date.UTC(Number(yearMonth[1]), Number(yearMonth[2]) - 1, 1));
    return new Intl.DateTimeFormat(site.locale, {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
  return text;
}

/** A start and end date joined by the separator label, e.g. 2018 to 2020. */
export function formatRange(start: string, end: string): string {
  const from = formatDate(start);
  const until = formatDate(end);
  if (from === until) return from;
  return [from, site.labels.rangeSeparator, until].join(" ");
}

/** A full calendar date for posts, in the site locale. */
export function formatPostDate(date: Date): string {
  return new Intl.DateTimeFormat(site.locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** The machine-readable form of a date, for the <time datetime> attribute. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

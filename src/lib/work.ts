/**
 * Work helpers. One place that decides the order of case studies, so the
 * home page, the All work page and the previous/next links always agree.
 */
import { getCollection, type CollectionEntry } from "astro:content";

export type WorkEntry = CollectionEntry<"work">;

/** Featured entries first, then by the `order` field, lowest first. */
function byFeaturedThenOrder(a: WorkEntry, b: WorkEntry): number {
  if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
  return a.data.order - b.data.order;
}

/** Every work file, sorted. Includes drafts. */
export async function getAllWork(): Promise<WorkEntry[]> {
  const entries = await getCollection("work");
  return entries.sort(byFeaturedThenOrder);
}

/** Only the entries that get their own page (draft: false). */
export async function getLiveWork(): Promise<WorkEntry[]> {
  return (await getAllWork()).filter((entry) => !entry.data.draft);
}

/** The web address of a case study page. */
export function workHref(entry: WorkEntry): string {
  return `/work/${entry.id}`;
}

/** The shape WorkList.astro expects for one row. */
export function toWorkRow(entry: WorkEntry) {
  return {
    title: entry.data.title,
    company: entry.data.company,
    years: entry.data.years,
    href: entry.data.draft ? undefined : workHref(entry),
    comingSoon: entry.data.draft,
  };
}

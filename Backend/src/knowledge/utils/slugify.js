/**
 * URL-safe slug helper for Knowledge Base entities.
 */
export function slugify(value, maxLen = 120) {
  if (!value || typeof value !== "string") return "";
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim()
    .slice(0, maxLen);
}

export async function uniqueSlug(Model, base, extraFilter = {}) {
  const root = slugify(base) || "item";
  let candidate = root;
  let i = 0;
  while (await Model.exists({ slug: candidate, ...extraFilter })) {
    i += 1;
    candidate = `${root}-${i}`;
  }
  return candidate;
}

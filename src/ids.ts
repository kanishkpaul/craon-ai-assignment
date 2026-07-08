export function createId(prefix: string, value: string = new Date().toISOString()) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${base || "item"}-${suffix}`;
}

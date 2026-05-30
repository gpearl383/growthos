export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function uniqueSlug(base: string, suffix: string) {
  const slug = slugify(base);
  if (!slug) {
    return suffix.slice(0, 48);
  }
  return `${slug}-${suffix}`.slice(0, 48);
}

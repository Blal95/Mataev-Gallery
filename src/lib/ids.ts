import { ulid } from "ulid"

export function newId(): string {
  return ulid()
}

export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "")
  return base || `photo-${ulid().slice(-6).toLowerCase()}`
}

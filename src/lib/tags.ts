export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^#+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function parseTags(input: string): string[] {
  const parts = input.split("#").slice(1).flatMap((p) => p.split(/\s{2,}|,/))
  const out: string[] = []
  for (const p of parts) {
    const t = normalizeTag(p)
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

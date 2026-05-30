# gallery.mataev.no Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Mosaic-Noir photo gallery web app on `gallery.mataev.no` that doubles as a public JSON API (`/api/photos`) for the 3D portfolio, with a passkey-protected admin that extracts EXIF + location on upload.

**Architecture:** Next.js 16 (App Router, RSC) on Cloudflare Workers via `@opennextjs/cloudflare`. Images live in R2 (`PHOTOS` binding); metadata in D1 SQLite (`DB` binding). Heavy upload work (EXIF/HEIC/derivatives/thumbhash) runs client-side; the Worker stays light. Pure logic is unit-tested with Vitest; the D1 data layer is tested against a `better-sqlite3` adapter that mimics the D1 statement API.

**Tech Stack:** Next.js 16, React 19, TypeScript (strict), Tailwind v4, Cloudflare Workers/R2/D1, `@simplewebauthn`, `exifr`, `heic2any`, `thumbhash`, `ulid`, Vitest, `better-sqlite3` (test only).

---

## Testing Strategy

- **Pure logic** (`format`, `tags`, `ids`, `justified`, `serialize`, `maptiler`, `session`, `geocode`) → Vitest unit tests, full TDD.
- **Data layer** (`lib/photos.ts`) → written against a tiny `SqlDb` interface that D1 satisfies at runtime; tested against a `better-sqlite3` adapter (`test/sqlite-adapter.ts`) that applies `migrations/0001_init.sql`.
- **API route handlers** → invoked directly with a fake `SqlDb`; assert JSON shape + headers.
- **UI / Canvas / WebAuthn / R2 bindings** (not unit-testable on the edge) → verified by `npm run typecheck`, `npm run build`, and a `wrangler dev` smoke run. Each such task ends with an explicit manual verification checklist.

Run a single test file: `npm test -- run src/lib/format.test.ts`
Run all tests: `npm test`

---

## File Structure

```
Mataev-Gallery/
  package.json  tsconfig.json  next.config.ts  open-next.config.ts
  wrangler.toml  postcss.config.mjs  vitest.config.ts  eslint.config.mjs
  cloudflare-env.d.ts                      # generated binding types
  migrations/0001_init.sql
  test/sqlite-adapter.ts                   # better-sqlite3 → D1-like shim (test only)
  src/
    app/
      layout.tsx  globals.css
      (public)/layout.tsx                  # header + tag index + footer
      (public)/page.tsx                    # mosaic grid (all)
      (public)/t/[tag]/page.tsx            # tag-filtered grid
      (public)/p/[id]/page.tsx             # standalone detail
      (public)/@modal/default.tsx
      (public)/@modal/(.)p/[id]/page.tsx   # intercepting modal detail
      admin/page.tsx                       # passkey login + dashboard
      api/photos/route.ts                  # public list
      api/photos/[id]/route.ts             # public single
      api/admin/upload/route.ts            # protected upload finalize
      api/admin/photos/[id]/route.ts       # protected update/delete
      api/auth/register-options/route.ts
      api/auth/register-verify/route.ts
      api/auth/auth-options/route.ts
      api/auth/auth-verify/route.ts
      api/auth/logout/route.ts
    middleware.ts                          # gate /admin + /api/admin
    components/
      Wordmark.tsx  Footer.tsx  TagIndex.tsx
      MosaicGrid.tsx  PhotoTile.tsx
      PhotoDetail.tsx  ExposureStrip.tsx  Filmstrip.tsx  MapChip.tsx
      admin/Login.tsx  admin/Uploader.tsx  admin/PhotoList.tsx  admin/EditForm.tsx
    lib/
      cn.ts  env.ts  db.ts  r2.ts  photos.ts  serialize.ts
      format.ts  tags.ts  ids.ts  justified.ts  thumbhash.ts
      geocode.ts  maptiler.ts  session.ts  webauthn.ts
      client/exif.ts  client/heic.ts  client/derive.ts  client/thumbhash.ts
    types/photo.ts
    config/site.ts
```

---

## Task 1: Project scaffold + Cloudflare config + Tailwind tokens

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `open-next.config.ts`, `wrangler.toml`, `postcss.config.mjs`, `vitest.config.ts`, `eslint.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/lib/cn.ts`, `src/config/site.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "mataev-gallery",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts",
    "db:migrate:local": "wrangler d1 migrations apply gallery --local",
    "db:migrate:remote": "wrangler d1 migrations apply gallery --remote"
  },
  "dependencies": {
    "next": "16.2.6",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "@simplewebauthn/server": "^13.1.1",
    "@simplewebauthn/browser": "^13.1.0",
    "exifr": "^7.1.3",
    "heic2any": "^0.0.4",
    "thumbhash": "^0.1.1",
    "ulid": "^2.3.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5"
  },
  "devDependencies": {
    "@opennextjs/cloudflare": "^1.19.11",
    "wrangler": "^4.95.0",
    "typescript": "^5.7.2",
    "@types/node": "^22.10.2",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.4.49",
    "vitest": "^2.1.8",
    "better-sqlite3": "^11.7.0",
    "@types/better-sqlite3": "^7.6.12",
    "eslint": "^9",
    "eslint-config-next": "16.2.6"
  }
}
```

- [ ] **Step 2: Install**

Run: `cd /Users/brz/Desktop/Mash/Mataev-Gallery && npm install`
Expected: installs without peer-dependency errors.

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "cloudflare-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `next.config.ts`**

```ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Images are pre-sized at upload and served from cdn.gallery.mataev.no,
  // so the runtime optimizer is disabled (cheaper on Workers).
  images: { unoptimized: true },
}

export default nextConfig

// Enable Cloudflare bindings in `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"
void initOpenNextCloudflareForDev()
```

- [ ] **Step 5: Write `open-next.config.ts`**

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare"

export default defineCloudflareConfig({})
```

- [ ] **Step 6: Write `wrangler.toml`**

```toml
name = "mataev-gallery"
main = ".open-next/worker.js"
compatibility_date = "2025-09-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"

[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "gallery-photos"

[[d1_databases]]
binding = "DB"
database_name = "gallery"
database_id = "PLACEHOLDER_RUN_wrangler_d1_create_gallery"

[vars]
NEXT_PUBLIC_CDN_BASE = "https://cdn.gallery.mataev.no"
RP_ID = "gallery.mataev.no"
RP_ORIGIN = "https://gallery.mataev.no"
ALLOWED_ORIGINS = "https://mataev.no,https://www.mataev.no,http://localhost:3000"
```

- [ ] **Step 7: Write `postcss.config.mjs`**

```js
export default { plugins: { "@tailwindcss/postcss": {} } }
```

- [ ] **Step 8: Write `eslint.config.mjs`**

```js
import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })
export default [...compat.extends("next/core-web-vitals", "next/typescript")]
```

- [ ] **Step 9: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"
import { resolve } from "path"

export default defineConfig({
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
})
```

- [ ] **Step 10: Write `src/lib/cn.ts`**

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
```

- [ ] **Step 11: Write `src/config/site.ts`**

```ts
export const site = {
  name: "MATAEV",
  meta: "Photography — NO",
  links: {
    portfolio: "https://mataev.no",
    github: "https://github.com/Blal95",
    email: "bilal@mataev.no",
  },
} as const
```

- [ ] **Step 12: Write `src/app/globals.css` (Mosaic-Noir tokens)**

```css
@import "tailwindcss";

@theme inline {
  --color-bg: #0b0d10;
  --color-bg-2: #0c0f16;
  --color-text: #e8edf5;
  --color-muted: #5a6478;
  --color-muted-2: #828c9e;
  --color-cyan: #5bc0eb;
  --color-amber: #f4a261;
  --color-line: #161c28;
  --color-line-2: #1c2230;
  --font-mono: ui-monospace, "SF Mono", Menlo, monospace;
  --font-serif: Georgia, "Times New Roman", serif;
}

html, body { background: var(--color-bg); color: var(--color-text); }
body { -webkit-font-smoothing: antialiased; }
* { box-sizing: border-box; }
```

- [ ] **Step 13: Write `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "MATAEV — Photography",
  description: "Photographs by Bilal R. Mataev.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 14: Generate binding types + typecheck**

Run: `npm run cf-typegen && npm run typecheck`
Expected: `cloudflare-env.d.ts` created; `tsc` exits 0.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Cloudflare + Tailwind tokens"
```

---

## Task 2: D1 schema + migration + sqlite test adapter

**Files:**
- Create: `migrations/0001_init.sql`, `test/sqlite-adapter.ts`, `test/sqlite-adapter.test.ts`

- [ ] **Step 1: Write `migrations/0001_init.sql`** (copy the full schema from the spec §3 — `photos`, `tags`, `photo_tags`, `credentials`, `auth_challenges`, all indexes verbatim).

- [ ] **Step 2: Write the failing test `test/sqlite-adapter.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { makeTestDb } from "./sqlite-adapter"

describe("sqlite adapter", () => {
  it("applies the migration and exposes the photos table", async () => {
    const db = makeTestDb()
    await db.prepare("INSERT INTO tags (name) VALUES (?)").bind("norway").run()
    const row = await db.prepare("SELECT name FROM tags WHERE name = ?").bind("norway").first<{ name: string }>()
    expect(row?.name).toBe("norway")
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- run test/sqlite-adapter.test.ts`
Expected: FAIL — `makeTestDb` not found.

- [ ] **Step 4: Write `test/sqlite-adapter.ts`** (a D1-shaped async facade over better-sqlite3)

```ts
import Database from "better-sqlite3"
import { readFileSync } from "fs"
import { resolve } from "path"

export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement
  all<T = unknown>(): Promise<{ results: T[] }>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<{ success: true }>
}
export interface SqlDb {
  prepare(sql: string): SqlStatement
}

class BetterStmt implements SqlStatement {
  constructor(private db: Database.Database, private sql: string, private params: unknown[] = []) {}
  bind(...values: unknown[]): SqlStatement {
    return new BetterStmt(this.db, this.sql, values)
  }
  async all<T>() {
    const stmt = this.db.prepare(this.sql)
    return { results: stmt.all(...(this.params as never[])) as T[] }
  }
  async first<T>() {
    const stmt = this.db.prepare(this.sql)
    return (stmt.get(...(this.params as never[])) as T) ?? null
  }
  async run() {
    this.db.prepare(this.sql).run(...(this.params as never[]))
    return { success: true as const }
  }
}

export function makeTestDb(): SqlDb {
  const db = new Database(":memory:")
  db.pragma("foreign_keys = ON")
  const sql = readFileSync(resolve(__dirname, "../migrations/0001_init.sql"), "utf8")
  db.exec(sql)
  return { prepare: (s: string) => new BetterStmt(db, s) }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- run test/sqlite-adapter.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add migrations test
git commit -m "feat(db): D1 schema migration + sqlite test adapter"
```

---

## Task 3: Domain formatting utils (TDD)

**Files:**
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/format.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { formatExposure, formatBytes, formatAperture, formatFocal, flagEmoji, formatCamera } from "./format"

describe("format", () => {
  it("formats fast shutter as 1/x", () => expect(formatExposure(0.004)).toBe("1/250"))
  it("formats slow shutter as seconds", () => expect(formatExposure(2)).toBe("2s"))
  it("formats sub-second >= 1/4 as seconds", () => expect(formatExposure(0.5)).toBe("0.5s"))
  it("returns null for missing exposure", () => expect(formatExposure(null)).toBeNull())
  it("formats bytes", () => { expect(formatBytes(8810000)).toBe("8.4 MB"); expect(formatBytes(900)).toBe("900 B") })
  it("formats aperture", () => expect(formatAperture(2.8)).toBe("ƒ2.8"))
  it("formats focal", () => expect(formatFocal(35)).toBe("35mm"))
  it("maps country code to flag", () => expect(flagEmoji("NO")).toBe("🇳🇴"))
  it("returns empty flag for null", () => expect(flagEmoji(null)).toBe(""))
  it("joins camera make + model without duplication", () => {
    expect(formatCamera("Apple", "iPhone 15 Pro Max")).toBe("Apple iPhone 15 Pro Max")
    expect(formatCamera("SONY", "SONY ILCE-7M4")).toBe("SONY ILCE-7M4")
    expect(formatCamera(null, null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- run src/lib/format.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/lib/format.ts`**

```ts
export function formatExposure(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null
  if (seconds >= 1) return Number.isInteger(seconds) ? `${seconds}s` : `${seconds}s`
  if (seconds >= 0.25) return `${seconds}s`
  return `1/${Math.round(1 / seconds)}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatAperture(f: number | null): string | null {
  return f == null ? null : `ƒ${f}`
}

export function formatFocal(mm: number | null): string | null {
  return mm == null ? null : `${Math.round(mm)}mm`
}

export function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return ""
  const A = 0x1f1e6
  const up = code.toUpperCase()
  return String.fromCodePoint(A + (up.charCodeAt(0) - 65), A + (up.charCodeAt(1) - 65))
}

export function formatCamera(make: string | null, model: string | null): string | null {
  if (!model && !make) return null
  if (!model) return make
  if (!make) return model
  return model.toUpperCase().startsWith(make.toUpperCase()) ? model : `${make} ${model}`
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- run src/lib/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat(lib): EXIF value formatters"
```

---

## Task 4: Tag + id utils (TDD)

**Files:**
- Create: `src/lib/tags.ts`, `src/lib/tags.test.ts`, `src/lib/ids.ts`, `src/lib/ids.test.ts`

- [ ] **Step 1: Write `src/lib/tags.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { normalizeTag, parseTags } from "./tags"

describe("tags", () => {
  it("normalizes case, strips #, spaces to dashes", () => {
    expect(normalizeTag("#Blue Hour")).toBe("blue-hour")
    expect(normalizeTag("Lofoten")).toBe("lofoten")
  })
  it("drops invalid chars", () => expect(normalizeTag("a*b!c")).toBe("abc"))
  it("parses a #-separated string into unique normalized tags", () => {
    expect(parseTags("#norway #Lofoten #norway #blue hour")).toEqual(["norway", "lofoten", "blue-hour"])
  })
  it("returns [] for empty", () => expect(parseTags("   ")).toEqual([]))
})
```

- [ ] **Step 2: Run — expect FAIL.** `npm test -- run src/lib/tags.test.ts`

- [ ] **Step 3: Write `src/lib/tags.ts`**

```ts
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
  const parts = input.split("#").flatMap((p) => p.split(/\s{2,}|,/))
  const out: string[] = []
  for (const p of parts) {
    const t = normalizeTag(p)
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}
```

> Note: `parseTags` treats `#` and double-space/comma as separators; single spaces inside a tag become dashes (`blue hour` → `blue-hour`).

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Write `src/lib/ids.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { newId, slugify } from "./ids"

describe("ids", () => {
  it("makes a 26-char ULID", () => expect(newId()).toHaveLength(26))
  it("slugifies a caption", () => expect(slugify("Blue hour over the fjord!")).toBe("blue-hour-over-the-fjord"))
  it("falls back when empty", () => expect(slugify("")).toMatch(/^photo-/))
})
```

- [ ] **Step 6: Run — expect FAIL.**

- [ ] **Step 7: Write `src/lib/ids.ts`**

```ts
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
```

- [ ] **Step 8: Run — expect PASS. Commit.**

```bash
git add src/lib/tags.ts src/lib/tags.test.ts src/lib/ids.ts src/lib/ids.test.ts
git commit -m "feat(lib): tag normalization + id/slug helpers"
```

---

## Task 5: Justified-rows layout math (TDD)

**Files:**
- Create: `src/lib/justified.ts`, `src/lib/justified.test.ts`

- [ ] **Step 1: Write `src/lib/justified.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { computeRows, type Sized } from "./justified"

const items: Sized[] = [
  { id: "a", aspect: 1.5 }, { id: "b", aspect: 0.66 },
  { id: "c", aspect: 1.0 }, { id: "d", aspect: 1.78 },
  { id: "e", aspect: 1.2 },
]

describe("computeRows", () => {
  it("fills rows to ~container width and never exceeds it", () => {
    const rows = computeRows(items, { containerWidth: 1000, targetHeight: 240, gap: 12 })
    for (const row of rows.slice(0, -1)) {
      const total = row.boxes.reduce((s, b) => s + b.width, 0) + (row.boxes.length - 1) * 12
      expect(Math.abs(total - 1000)).toBeLessThan(2)
    }
  })
  it("preserves each box aspect ratio (no crop)", () => {
    const rows = computeRows(items, { containerWidth: 1000, targetHeight: 240, gap: 12 })
    for (const row of rows) for (const b of row.boxes) {
      expect(b.width / b.height).toBeCloseTo(b.aspect, 1)
    }
  })
  it("keeps the last row at natural (target) height, left-aligned", () => {
    const rows = computeRows(items, { containerWidth: 1000, targetHeight: 240, gap: 12 })
    const last = rows[rows.length - 1]
    expect(last.boxes.every((b) => Math.abs(b.height - 240) < 1 || rows.length === 1)).toBe(true)
  })
  it("returns [] for no items", () => expect(computeRows([], { containerWidth: 800, targetHeight: 200, gap: 8 })).toEqual([]))
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/lib/justified.ts`**

```ts
export interface Sized { id: string; aspect: number }
export interface Box extends Sized { width: number; height: number }
export interface Row { boxes: Box[] }
export interface LayoutOpts { containerWidth: number; targetHeight: number; gap: number }

/**
 * Flickr-style justified rows. Greedily fill a row at targetHeight until the
 * summed widths exceed the container, then scale that row's height down so the
 * boxes (minus gaps) fit edge-to-edge. Aspect ratios are preserved (no crop).
 * The final, unfilled row is left at targetHeight.
 */
export function computeRows(items: Sized[], opts: LayoutOpts): Row[] {
  const { containerWidth, targetHeight, gap } = opts
  if (items.length === 0 || containerWidth <= 0) return []
  const rows: Row[] = []
  let current: Sized[] = []

  const widthAt = (it: Sized, h: number) => it.aspect * h

  const flush = (isLast: boolean) => {
    if (current.length === 0) return
    const totalGap = (current.length - 1) * gap
    const naturalWidth = current.reduce((s, it) => s + widthAt(it, targetHeight), 0)
    const avail = containerWidth - totalGap
    const height = isLast ? targetHeight : (avail / naturalWidth) * targetHeight
    const boxes: Box[] = current.map((it) => ({
      ...it,
      height,
      width: widthAt(it, height),
    }))
    rows.push({ boxes })
    current = []
  }

  for (const it of items) {
    current.push(it)
    const totalGap = (current.length - 1) * gap
    const rowWidth = current.reduce((s, x) => s + widthAt(x, targetHeight), 0) + totalGap
    if (rowWidth >= containerWidth) flush(false)
  }
  flush(true)
  return rows
}
```

- [ ] **Step 4: Run — expect PASS. Commit.**

```bash
git add src/lib/justified.ts src/lib/justified.test.ts
git commit -m "feat(lib): justified-rows layout math"
```

---

## Task 6: Types + serialization (TDD)

**Files:**
- Create: `src/types/photo.ts`, `src/lib/serialize.ts`, `src/lib/serialize.test.ts`

- [ ] **Step 1: Write `src/types/photo.ts`**

```ts
export interface PhotoRow {
  id: string; slug: string; caption: string | null
  taken_at: number | null; created_at: number
  width: number; height: number; aspect: number
  bytes: number; format: string; color_space: string | null
  camera_make: string | null; camera_model: string | null; lens_model: string | null
  focal_length: number | null; f_number: number | null; exposure_time: number | null; iso: number | null
  gps_lat: number | null; gps_lon: number | null; gps_alt: number | null
  place: string | null; country: string | null; country_code: string | null
  thumbhash: string | null
  r2_original: string; r2_large: string; r2_thumb: string
  published: number; sort_index: number | null
}

export interface PhotoDTO {
  id: string; slug: string
  url: { thumb: string; large: string; original: string }
  width: number; height: number; aspect: number
  thumbhash: string | null
  caption: string | null; takenAt: number | null
  place: string | null; country: string | null; countryCode: string | null
  lat: number | null; lon: number | null
  camera: string | null; lens: string | null
  focal: number | null; fNumber: number | null; exposure: number | null; iso: number | null
  bytes: number; format: string
  tags: string[]
}

export interface TagCount { name: string; count: number }
export interface PhotosResponse { photos: PhotoDTO[]; tags: TagCount[] }
```

- [ ] **Step 2: Write `src/lib/serialize.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { rowToDTO } from "./serialize"
import type { PhotoRow } from "@/types/photo"

const row: PhotoRow = {
  id: "01J", slug: "blue-hour", caption: "still water",
  taken_at: 1755112440000, created_at: 1755112450000,
  width: 6000, height: 4000, aspect: 1.5, bytes: 8810000, format: "jpeg",
  color_space: "Display P3", camera_make: "SONY", camera_model: "ILCE-7M4",
  lens_model: "FE 24-70 GM", focal_length: 35, f_number: 2.8, exposure_time: 0.004, iso: 100,
  gps_lat: 68.21, gps_lon: 13.62, gps_alt: 12, place: "Lofoten", country: "Norway", country_code: "NO",
  thumbhash: "abc", r2_original: "photos/01J/original.jpg",
  r2_large: "photos/01J/large.webp", r2_thumb: "photos/01J/thumb.webp",
  published: 1, sort_index: null,
}

describe("rowToDTO", () => {
  it("builds cdn urls and camelCase fields", () => {
    const dto = rowToDTO(row, ["norway", "lofoten"], "https://cdn.x")
    expect(dto.url.large).toBe("https://cdn.x/photos/01J/large.webp")
    expect(dto.camera).toBe("SONY ILCE-7M4")
    expect(dto.fNumber).toBe(2.8)
    expect(dto.countryCode).toBe("NO")
    expect(dto.tags).toEqual(["norway", "lofoten"])
  })
})
```

- [ ] **Step 3: Run — expect FAIL.**

- [ ] **Step 4: Write `src/lib/serialize.ts`**

```ts
import type { PhotoRow, PhotoDTO } from "@/types/photo"
import { formatCamera } from "./format"

export function rowToDTO(row: PhotoRow, tags: string[], cdnBase: string): PhotoDTO {
  const url = (key: string) => `${cdnBase}/${key}`
  return {
    id: row.id,
    slug: row.slug,
    url: { thumb: url(row.r2_thumb), large: url(row.r2_large), original: url(row.r2_original) },
    width: row.width, height: row.height, aspect: row.aspect,
    thumbhash: row.thumbhash,
    caption: row.caption, takenAt: row.taken_at,
    place: row.place, country: row.country, countryCode: row.country_code,
    lat: row.gps_lat, lon: row.gps_lon,
    camera: formatCamera(row.camera_make, row.camera_model), lens: row.lens_model,
    focal: row.focal_length, fNumber: row.f_number, exposure: row.exposure_time, iso: row.iso,
    bytes: row.bytes, format: row.format,
    tags,
  }
}
```

- [ ] **Step 5: Run — expect PASS. Commit.**

```bash
git add src/types/photo.ts src/lib/serialize.ts src/lib/serialize.test.ts
git commit -m "feat(lib): photo types + row→DTO serialization"
```

---

## Task 7: Data layer over D1 (TDD via sqlite adapter)

**Files:**
- Create: `src/lib/photos.ts`, `src/lib/photos.test.ts`

- [ ] **Step 1: Write `src/lib/photos.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { makeTestDb } from "../../test/sqlite-adapter"
import { insertPhoto, listPhotos, getPhoto, listTagCounts, deletePhoto, updateCaption } from "./photos"
import type { PhotoRow } from "@/types/photo"

function sample(id: string, overrides: Partial<PhotoRow> = {}): PhotoRow {
  return {
    id, slug: id, caption: "c", taken_at: 1000 + Number(id.replace(/\D/g, "")) , created_at: 1,
    width: 6000, height: 4000, aspect: 1.5, bytes: 100, format: "jpeg", color_space: null,
    camera_make: null, camera_model: null, lens_model: null, focal_length: null, f_number: null,
    exposure_time: null, iso: null, gps_lat: null, gps_lon: null, gps_alt: null,
    place: null, country: null, country_code: null, thumbhash: null,
    r2_original: `photos/${id}/original.jpg`, r2_large: `photos/${id}/large.webp`,
    r2_thumb: `photos/${id}/thumb.webp`, published: 1, sort_index: null, ...overrides,
  }
}

describe("photos data layer", () => {
  it("inserts with tags, lists newest-first, counts tags", async () => {
    const db = makeTestDb()
    await insertPhoto(db, sample("p1", { taken_at: 100 }), ["norway", "lofoten"])
    await insertPhoto(db, sample("p2", { taken_at: 200 }), ["norway"])
    const all = await listPhotos(db, {})
    expect(all.map((p) => p.row.id)).toEqual(["p2", "p1"])
    expect(all[0].tags).toEqual(["norway"])
    const counts = await listTagCounts(db)
    expect(counts).toContainEqual({ name: "norway", count: 2 })
    expect(counts).toContainEqual({ name: "lofoten", count: 1 })
  })
  it("filters by tag", async () => {
    const db = makeTestDb()
    await insertPhoto(db, sample("p1"), ["norway", "lofoten"])
    await insertPhoto(db, sample("p2"), ["norway"])
    const f = await listPhotos(db, { tag: "lofoten" })
    expect(f.map((p) => p.row.id)).toEqual(["p1"])
  })
  it("gets one with tags", async () => {
    const db = makeTestDb()
    await insertPhoto(db, sample("p1"), ["a", "b"])
    const got = await getPhoto(db, "p1")
    expect(got?.tags.sort()).toEqual(["a", "b"])
  })
  it("updates caption", async () => {
    const db = makeTestDb()
    await insertPhoto(db, sample("p1"), [])
    await updateCaption(db, "p1", "new")
    expect((await getPhoto(db, "p1"))?.row.caption).toBe("new")
  })
  it("deletes and returns r2 keys", async () => {
    const db = makeTestDb()
    await insertPhoto(db, sample("p1"), ["x"])
    const keys = await deletePhoto(db, "p1")
    expect(keys).toEqual(["photos/p1/original.jpg", "photos/p1/large.webp", "photos/p1/thumb.webp"])
    expect(await getPhoto(db, "p1")).toBeNull()
    expect(await listTagCounts(db)).toEqual([]) // orphan tag link gone via cascade
  })
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/lib/photos.ts`**

```ts
import type { SqlDb } from "../../test/sqlite-adapter"
import type { PhotoRow } from "@/types/photo"

export interface PhotoWithTags { row: PhotoRow; tags: string[] }

const COLS =
  "id,slug,caption,taken_at,created_at,width,height,aspect,bytes,format,color_space," +
  "camera_make,camera_model,lens_model,focal_length,f_number,exposure_time,iso," +
  "gps_lat,gps_lon,gps_alt,place,country,country_code,thumbhash," +
  "r2_original,r2_large,r2_thumb,published,sort_index"

async function tagsFor(db: SqlDb, ids: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (ids.length === 0) return map
  const placeholders = ids.map(() => "?").join(",")
  const { results } = await db
    .prepare(
      `SELECT pt.photo_id AS pid, t.name AS name FROM photo_tags pt
       JOIN tags t ON t.id = pt.tag_id WHERE pt.photo_id IN (${placeholders}) ORDER BY t.name`,
    )
    .bind(...ids)
    .all<{ pid: string; name: string }>()
  for (const r of results) {
    const arr = map.get(r.pid) ?? []
    arr.push(r.name)
    map.set(r.pid, arr)
  }
  return map
}

export async function insertPhoto(db: SqlDb, row: PhotoRow, tags: string[]): Promise<void> {
  await db
    .prepare(
      `INSERT INTO photos (${COLS}) VALUES (${COLS.split(",").map(() => "?").join(",")})`,
    )
    .bind(
      row.id, row.slug, row.caption, row.taken_at, row.created_at, row.width, row.height, row.aspect,
      row.bytes, row.format, row.color_space, row.camera_make, row.camera_model, row.lens_model,
      row.focal_length, row.f_number, row.exposure_time, row.iso, row.gps_lat, row.gps_lon, row.gps_alt,
      row.place, row.country, row.country_code, row.thumbhash, row.r2_original, row.r2_large, row.r2_thumb,
      row.published, row.sort_index,
    )
    .run()
  for (const name of tags) {
    await db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").bind(name).run()
    const tag = await db.prepare("SELECT id FROM tags WHERE name = ?").bind(name).first<{ id: number }>()
    if (tag) {
      await db.prepare("INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)").bind(row.id, tag.id).run()
    }
  }
}

export async function listPhotos(db: SqlDb, opts: { tag?: string }): Promise<PhotoWithTags[]> {
  let rows: PhotoRow[]
  if (opts.tag) {
    const r = await db
      .prepare(
        `SELECT ${COLS.split(",").map((c) => "p." + c).join(",")} FROM photos p
         JOIN photo_tags pt ON pt.photo_id = p.id JOIN tags t ON t.id = pt.tag_id
         WHERE t.name = ? AND p.published = 1 ORDER BY p.taken_at DESC, p.created_at DESC`,
      )
      .bind(opts.tag)
      .all<PhotoRow>()
    rows = r.results
  } else {
    const r = await db
      .prepare(`SELECT ${COLS} FROM photos WHERE published = 1 ORDER BY taken_at DESC, created_at DESC`)
      .all<PhotoRow>()
    rows = r.results
  }
  const tagMap = await tagsFor(db, rows.map((r) => r.id))
  return rows.map((row) => ({ row, tags: tagMap.get(row.id) ?? [] }))
}

export async function getPhoto(db: SqlDb, id: string): Promise<PhotoWithTags | null> {
  const row = await db.prepare(`SELECT ${COLS} FROM photos WHERE id = ? OR slug = ?`).bind(id, id).first<PhotoRow>()
  if (!row) return null
  const tagMap = await tagsFor(db, [row.id])
  return { row, tags: tagMap.get(row.id) ?? [] }
}

export async function listTagCounts(db: SqlDb): Promise<{ name: string; count: number }[]> {
  const { results } = await db
    .prepare(
      `SELECT t.name AS name, COUNT(pt.photo_id) AS count FROM tags t
       JOIN photo_tags pt ON pt.tag_id = t.id JOIN photos p ON p.id = pt.photo_id AND p.published = 1
       GROUP BY t.id HAVING count > 0 ORDER BY count DESC, t.name ASC`,
    )
    .all<{ name: string; count: number }>()
  return results
}

export async function updateCaption(db: SqlDb, id: string, caption: string): Promise<void> {
  await db.prepare("UPDATE photos SET caption = ? WHERE id = ?").bind(caption, id).run()
}

export async function deletePhoto(db: SqlDb, id: string): Promise<string[]> {
  const row = await db.prepare("SELECT r2_original, r2_large, r2_thumb FROM photos WHERE id = ?").bind(id).first<{
    r2_original: string; r2_large: string; r2_thumb: string
  }>()
  if (!row) return []
  await db.prepare("DELETE FROM photos WHERE id = ?").bind(id).run()
  return [row.r2_original, row.r2_large, row.r2_thumb]
}
```

> Note: importing `SqlDb` from the test adapter is only a type import; at runtime D1's `D1Database` satisfies the same shape. (If preferred, move the `SqlDb` interface to `src/lib/sqldb.ts` and import from there in both places — do this if the type import from `test/` trips lint.)

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Move the `SqlDb`/`SqlStatement` interfaces to `src/lib/sqldb.ts`; re-export from the test adapter; update imports in `photos.ts` and `photos.test.ts` to `@/lib/sqldb`.** Re-run `npm test -- run src/lib/photos.test.ts` — expect PASS.

```ts
// src/lib/sqldb.ts
export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement
  all<T = unknown>(): Promise<{ results: T[] }>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<{ success: true }>
}
export interface SqlDb { prepare(sql: string): SqlStatement }
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/photos.ts src/lib/photos.test.ts src/lib/sqldb.ts test/sqlite-adapter.ts
git commit -m "feat(lib): D1 photo data layer (insert/list/get/tags/delete)"
```

---

## Task 8: Cloudflare binding accessors (env, db, r2)

**Files:**
- Create: `src/lib/env.ts`, `src/lib/db.ts`, `src/lib/r2.ts`

> Not unit-tested (requires the Workers runtime). Verified by typecheck + later smoke.

- [ ] **Step 1: Write `src/lib/env.ts`**

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare"

export function cf() {
  return getCloudflareContext().env
}

export function cdnBase(): string {
  return cf().NEXT_PUBLIC_CDN_BASE
}

export function allowedOrigins(): string[] {
  return (cf().ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
}
```

- [ ] **Step 2: Write `src/lib/db.ts`**

```ts
import { cf } from "./env"
import type { SqlDb } from "./sqldb"

export function db(): SqlDb {
  return cf().DB as unknown as SqlDb
}
```

- [ ] **Step 3: Write `src/lib/r2.ts`**

```ts
import { cf } from "./env"

export function photoKeys(id: string, ext: string) {
  return {
    original: `photos/${id}/original.${ext}`,
    large: `photos/${id}/large.webp`,
    thumb: `photos/${id}/thumb.webp`,
  }
}

export async function putPhotoObject(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  await cf().PHOTOS.put(key, body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
  })
}

export async function deletePhotoObjects(keys: string[]): Promise<void> {
  await cf().PHOTOS.delete(keys)
}
```

- [ ] **Step 4: Add the binding interface to `cloudflare-env.d.ts`** (extend the generated `CloudflareEnv` — regenerate with `npm run cf-typegen`, then ensure these exist):

```ts
interface CloudflareEnv {
  DB: D1Database
  PHOTOS: R2Bucket
  ASSETS: Fetcher
  NEXT_PUBLIC_CDN_BASE: string
  RP_ID: string
  RP_ORIGIN: string
  ALLOWED_ORIGINS: string
  SESSION_SECRET: string
  ADMIN_ENROLL_CODE: string
}
```

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck`
Expected: 0 errors.

```bash
git add src/lib/env.ts src/lib/db.ts src/lib/r2.ts cloudflare-env.d.ts
git commit -m "feat(lib): Cloudflare env/db/r2 binding accessors"
```

---

## Task 9: Public API — `/api/photos` + `/api/photos/[id]`

**Files:**
- Create: `src/lib/api.ts` (shared CORS/cache + builder), `src/lib/api.test.ts`
- Create: `src/app/api/photos/route.ts`, `src/app/api/photos/[id]/route.ts`

- [ ] **Step 1: Write `src/lib/api.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { buildPhotosResponse, corsHeaders } from "./api"
import { makeTestDb } from "../../test/sqlite-adapter"
import { insertPhoto } from "./photos"
import type { PhotoRow } from "@/types/photo"

const row = (id: string): PhotoRow => ({
  id, slug: id, caption: null, taken_at: 1, created_at: 1, width: 3000, height: 2000, aspect: 1.5,
  bytes: 1, format: "jpeg", color_space: null, camera_make: null, camera_model: null, lens_model: null,
  focal_length: null, f_number: null, exposure_time: null, iso: null, gps_lat: null, gps_lon: null,
  gps_alt: null, place: null, country: null, country_code: null, thumbhash: null,
  r2_original: `photos/${id}/original.jpg`, r2_large: `photos/${id}/large.webp`,
  r2_thumb: `photos/${id}/thumb.webp`, published: 1, sort_index: null,
})

describe("api", () => {
  it("builds the PhotosResponse with cdn urls + tag counts", async () => {
    const db = makeTestDb()
    await insertPhoto(db, row("p1"), ["norway"])
    const res = await buildPhotosResponse(db, "https://cdn.x", {})
    expect(res.photos[0].url.thumb).toBe("https://cdn.x/photos/p1/thumb.webp")
    expect(res.tags).toEqual([{ name: "norway", count: 1 }])
  })
  it("echoes an allowed origin in CORS headers", () => {
    const h = corsHeaders("https://mataev.no", ["https://mataev.no"])
    expect(h["Access-Control-Allow-Origin"]).toBe("https://mataev.no")
  })
  it("omits ACAO for a disallowed origin", () => {
    const h = corsHeaders("https://evil.com", ["https://mataev.no"])
    expect(h["Access-Control-Allow-Origin"]).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/lib/api.ts`**

```ts
import type { SqlDb } from "./sqldb"
import type { PhotosResponse } from "@/types/photo"
import { listPhotos, listTagCounts } from "./photos"
import { rowToDTO } from "./serialize"

export async function buildPhotosResponse(db: SqlDb, cdn: string, opts: { tag?: string }): Promise<PhotosResponse> {
  const [list, tags] = await Promise.all([listPhotos(db, opts), listTagCounts(db)])
  return { photos: list.map(({ row, tags }) => rowToDTO(row, tags, cdn)), tags }
}

export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const h: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
  if (origin && allowed.includes(origin)) h["Access-Control-Allow-Origin"] = origin
  return h
}

export const PUBLIC_CACHE = "public, s-maxage=300, stale-while-revalidate=86400"
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Write `src/app/api/photos/route.ts`**

```ts
import { db } from "@/lib/db"
import { cdnBase, allowedOrigins } from "@/lib/env"
import { buildPhotosResponse, corsHeaders, PUBLIC_CACHE } from "@/lib/api"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const origin = req.headers.get("Origin")
  const tag = new URL(req.url).searchParams.get("tag") ?? undefined
  const body = await buildPhotosResponse(db(), cdnBase(), { tag })
  return Response.json(body, {
    headers: { ...corsHeaders(origin, allowedOrigins()), "Cache-Control": PUBLIC_CACHE },
  })
}

export function OPTIONS(req: Request) {
  return new Response(null, { headers: corsHeaders(req.headers.get("Origin"), allowedOrigins()) })
}
```

- [ ] **Step 6: Write `src/app/api/photos/[id]/route.ts`**

```ts
import { db } from "@/lib/db"
import { cdnBase, allowedOrigins } from "@/lib/env"
import { corsHeaders, PUBLIC_CACHE } from "@/lib/api"
import { getPhoto } from "@/lib/photos"
import { rowToDTO } from "@/lib/serialize"

export const runtime = "nodejs"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const found = await getPhoto(db(), id)
  const origin = req.headers.get("Origin")
  if (!found) return Response.json({ error: "not found" }, { status: 404, headers: corsHeaders(origin, allowedOrigins()) })
  return Response.json(rowToDTO(found.row, found.tags, cdnBase()), {
    headers: { ...corsHeaders(origin, allowedOrigins()), "Cache-Control": PUBLIC_CACHE },
  })
}
```

- [ ] **Step 7: Typecheck + commit**

```bash
npm run typecheck
git add src/lib/api.ts src/lib/api.test.ts src/app/api/photos
git commit -m "feat(api): public /api/photos list + single with CORS + cache"
```

---

## Task 10: Public shell — header, tag index, footer

**Files:**
- Create: `src/components/Wordmark.tsx`, `src/components/Footer.tsx`, `src/components/TagIndex.tsx`, `src/app/(public)/layout.tsx`

- [ ] **Step 1: Write `src/components/Wordmark.tsx`**

```tsx
import Link from "next/link"
import { site } from "@/config/site"

export function Wordmark() {
  return (
    <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="font-mono text-sm uppercase tracking-[0.34em] text-text">{site.name}</span>
        <span className="h-[5px] w-[5px] -translate-y-px rounded-full bg-cyan" />
      </Link>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted">{site.meta}</span>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/TagIndex.tsx`**

```tsx
import Link from "next/link"
import { cn } from "@/lib/cn"
import type { TagCount } from "@/types/photo"

export function TagIndex({ tags, active }: { tags: TagCount[]; active?: string }) {
  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line px-5 pb-3.5">
      <Link
        href="/"
        className={cn(
          "pb-[3px] font-mono text-[11px] uppercase tracking-[0.1em]",
          !active ? "border-b-[1.5px] border-cyan text-text" : "text-muted hover:text-text",
        )}
      >
        All
      </Link>
      {tags.map((t) => (
        <Link
          key={t.name}
          href={`/t/${t.name}`}
          className={cn(
            "pb-[3px] font-mono text-[11px] uppercase tracking-[0.1em]",
            active === t.name ? "border-b-[1.5px] border-cyan text-text" : "text-muted hover:text-text",
          )}
        >
          {t.name}
          <sup className="ml-0.5 text-[8px] text-cyan">{t.count}</sup>
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Write `src/components/Footer.tsx`**

```tsx
import { site } from "@/config/site"

export function Footer() {
  return (
    <footer className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-5 py-6 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
      <a href={site.links.portfolio} className="hover:text-cyan">mataev.no</a>
      <a href={site.links.github} target="_blank" rel="noopener noreferrer" className="hover:text-cyan">GitHub</a>
      <a href={`mailto:${site.links.email}`} className="hover:text-cyan">{site.links.email}</a>
    </footer>
  )
}
```

- [ ] **Step 4: Write `src/app/(public)/layout.tsx`**

```tsx
import { Wordmark } from "@/components/Wordmark"
import { Footer } from "@/components/Footer"

export default function PublicLayout({
  children, modal,
}: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <>
      <Wordmark />
      {children}
      {modal}
      <Footer />
    </>
  )
}
```

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/components/Wordmark.tsx src/components/TagIndex.tsx src/components/Footer.tsx "src/app/(public)/layout.tsx"
git commit -m "feat(ui): public shell — wordmark, tag index, footer"
```

---

## Task 11: thumbhash placeholder helper + PhotoTile + MosaicGrid

**Files:**
- Create: `src/lib/thumbhash.ts`, `src/components/PhotoTile.tsx`, `src/components/MosaicGrid.tsx`

> `thumbhash` runtime decode is verified visually; the base64 helper is trivial. No new unit test (the layout math is already tested in Task 5).

- [ ] **Step 1: Write `src/lib/thumbhash.ts`**

```ts
import { thumbHashToDataURL } from "thumbhash"

export function thumbhashToUrl(base64: string | null): string | undefined {
  if (!base64) return undefined
  try {
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return thumbHashToDataURL(bytes)
  } catch {
    return undefined
  }
}
```

- [ ] **Step 2: Write `src/components/PhotoTile.tsx`**

```tsx
"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { thumbhashToUrl } from "@/lib/thumbhash"
import { flagEmoji } from "@/lib/format"
import type { PhotoDTO } from "@/types/photo"

export function PhotoTile({
  photo, width, height, index,
}: { photo: PhotoDTO; width: number; height: number; index: number }) {
  const [loaded, setLoaded] = useState(false)
  const placeholder = useMemo(() => thumbhashToUrl(photo.thumbhash), [photo.thumbhash])
  const place = [flagEmoji(photo.countryCode), photo.place].filter(Boolean).join(" ")

  return (
    <Link
      href={`/p/${photo.slug}`}
      scroll={false}
      className="group relative block overflow-hidden rounded-[3px] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1"
      style={{ width, height }}
    >
      {placeholder && !loaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={placeholder} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url.thumb}
        alt={photo.caption ?? ""}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="relative h-full w-full object-cover"
      />
      {/* hover peek: gradient + place + index, plus cyan rule */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#080b12]/85 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute bottom-2 left-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {place || " "} <span className="text-muted-2">· {String(index + 1).padStart(3, "0")}</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-cyan opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Link>
  )
}
```

- [ ] **Step 3: Write `src/components/MosaicGrid.tsx`**

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { computeRows } from "@/lib/justified"
import { PhotoTile } from "./PhotoTile"
import type { PhotoDTO } from "@/types/photo"

const GAP = 12
const TARGET = 300

export function MosaicGrid({ photos }: { photos: PhotoDTO[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const target = w < 640 ? 200 : TARGET
  const rows = w > 0 ? computeRows(photos.map((p) => ({ id: p.id, aspect: p.aspect })), { containerWidth: w, targetHeight: target, gap: GAP }) : []
  const byId = new Map(photos.map((p, i) => [p.id, { p, i }]))

  return (
    <div ref={ref} className="px-5">
      <div className="flex flex-col" style={{ gap: GAP }}>
        {rows.map((row, ri) => (
          <div key={ri} className="flex" style={{ gap: GAP }}>
            {row.boxes.map((b) => {
              const entry = byId.get(b.id)!
              return <PhotoTile key={b.id} photo={entry.p} width={b.width} height={b.height} index={entry.i} />
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck
git add src/lib/thumbhash.ts src/components/PhotoTile.tsx src/components/MosaicGrid.tsx
git commit -m "feat(ui): mosaic grid + photo tile with thumbhash + hover peek"
```

---

## Task 12: Public pages — home + tag + empty state

**Files:**
- Create: `src/app/(public)/page.tsx`, `src/app/(public)/t/[tag]/page.tsx`, `src/components/EmptyState.tsx`

- [ ] **Step 1: Write `src/components/EmptyState.tsx`**

```tsx
export function EmptyState({ label }: { label: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center px-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{label}</p>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/app/(public)/page.tsx`**

```tsx
import { db } from "@/lib/db"
import { cdnBase } from "@/lib/env"
import { buildPhotosResponse } from "@/lib/api"
import { MosaicGrid } from "@/components/MosaicGrid"
import { TagIndex } from "@/components/TagIndex"
import { EmptyState } from "@/components/EmptyState"

export const dynamic = "force-dynamic"

export default async function Home() {
  const { photos, tags } = await buildPhotosResponse(db(), cdnBase(), {})
  return (
    <main>
      <TagIndex tags={tags} />
      <div className="pt-3.5">
        {photos.length === 0 ? <EmptyState label="No photos yet" /> : <MosaicGrid photos={photos} />}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Write `src/app/(public)/t/[tag]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { cdnBase } from "@/lib/env"
import { buildPhotosResponse } from "@/lib/api"
import { MosaicGrid } from "@/components/MosaicGrid"
import { TagIndex } from "@/components/TagIndex"
import { EmptyState } from "@/components/EmptyState"

export const dynamic = "force-dynamic"

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const { photos, tags } = await buildPhotosResponse(db(), cdnBase(), { tag })
  if (!tags.some((t) => t.name === tag) && photos.length === 0) notFound()
  return (
    <main>
      <TagIndex tags={tags} active={tag} />
      <div className="pt-3.5">
        {photos.length === 0 ? <EmptyState label="Nothing here yet" /> : <MosaicGrid photos={photos} />}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Smoke check** — create the local DB and run dev (no photos yet → empty state).

Run:
```bash
npm run db:migrate:local
npm run dev
```
Open `http://localhost:3000` → expect the wordmark, "All" tag index, "No photos yet", footer. No console errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/page.tsx" "src/app/(public)/t" src/components/EmptyState.tsx
git commit -m "feat(ui): home + tag gallery pages with empty state"
```

---

## Task 13: MapTiler static URL + ExposureStrip + MapChip (TDD for the URL builder)

**Files:**
- Create: `src/lib/maptiler.ts`, `src/lib/maptiler.test.ts`, `src/components/ExposureStrip.tsx`, `src/components/MapChip.tsx`

- [ ] **Step 1: Write `src/lib/maptiler.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { staticMapUrl } from "./maptiler"

describe("staticMapUrl", () => {
  it("builds a dark static map url with pin + key", () => {
    const u = staticMapUrl({ lat: 68.21, lon: 13.62, zoom: 9, w: 240, h: 160, key: "K" })
    expect(u).toContain("/maps/streets-v2-dark/static/")
    expect(u).toContain("13.62,68.21,9")
    expect(u).toContain("240x160")
    expect(u).toContain("key=K")
  })
  it("returns null without coords", () => {
    expect(staticMapUrl({ lat: null, lon: null, zoom: 9, w: 10, h: 10, key: "K" })).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/lib/maptiler.ts`**

```ts
export function staticMapUrl(opts: {
  lat: number | null; lon: number | null; zoom: number; w: number; h: number; key: string
}): string | null {
  const { lat, lon, zoom, w, h, key } = opts
  if (lat == null || lon == null || !key) return null
  const center = `${lon},${lat},${zoom}`
  const marker = `${lon},${lat}`
  return `https://api.maptiler.com/maps/streets-v2-dark/static/${center}/${w}x${h}@2x.png?markers=${marker}&key=${key}`
}
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Write `src/components/ExposureStrip.tsx`**

```tsx
import { formatExposure, formatAperture, formatFocal, formatBytes } from "@/lib/format"
import type { PhotoDTO } from "@/types/photo"

function Dot() { return <span className="text-muted">·</span> }

export function ExposureStrip({ photo }: { photo: PhotoDTO }) {
  const cyan = (s: string | null) => (s ? <span className="text-cyan">{s}</span> : null)
  const parts: React.ReactNode[] = []
  const push = (n: React.ReactNode) => n && parts.push(n)
  push(photo.camera && <span>{photo.camera}</span>)
  push(photo.lens && <span>{photo.lens}</span>)
  push(formatFocal(photo.focal))
  push(cyan(formatAperture(photo.fNumber)))
  push(cyan(formatExposure(photo.exposure)))
  push(photo.iso != null && cyan(`ISO ${photo.iso}`))
  push(<span>{photo.width}×{photo.height}</span>)
  push(<span>{formatBytes(photo.bytes)}</span>)

  return (
    <div className="font-mono text-[10px] uppercase leading-[1.9] tracking-[0.08em] text-muted-2">
      {parts.map((p, i) => (
        <span key={i}>{i > 0 && <> <Dot /> </>}{p}</span>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Write `src/components/MapChip.tsx`**

```tsx
import { flagEmoji } from "@/lib/format"
import { staticMapUrl } from "@/lib/maptiler"
import type { PhotoDTO } from "@/types/photo"

export function MapChip({ photo, mapKey }: { photo: PhotoDTO; mapKey: string }) {
  if (photo.lat == null || photo.lon == null) {
    if (!photo.place) return null
    return (
      <div className="text-right">
        <div className="text-[11px] text-text">{flagEmoji(photo.countryCode)} {photo.place}</div>
      </div>
    )
  }
  const url = staticMapUrl({ lat: photo.lat, lon: photo.lon, zoom: 9, w: 116, h: 78, key: mapKey })
  return (
    <div className="w-[116px] shrink-0 text-right">
      <div className="relative h-[78px] overflow-hidden rounded-[5px] border border-line-2 bg-[#0a1322]">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={photo.place ?? "Map"} className="h-full w-full object-cover" />
        )}
        <div className="absolute left-[58%] top-[42%] h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan shadow-[0_0_0_4px_rgba(91,192,235,0.22),0_0_14px_#5BC0EB]" />
      </div>
      <div className="mt-1.5 text-[11px] text-text">{flagEmoji(photo.countryCode)} {photo.place}</div>
      <div className="mt-0.5 font-mono text-[8.5px] tracking-[0.06em] text-muted">
        {photo.lat.toFixed(2)}°{photo.lat >= 0 ? "N" : "S"} {Math.abs(photo.lon).toFixed(2)}°{photo.lon >= 0 ? "E" : "W"}
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
npm run typecheck
git add src/lib/maptiler.ts src/lib/maptiler.test.ts src/components/ExposureStrip.tsx src/components/MapChip.tsx
git commit -m "feat(ui): exposure strip + map chip + maptiler url builder"
```

---

## Task 14: Photo detail + filmstrip + intercepting modal

**Files:**
- Create: `src/components/PhotoDetail.tsx`, `src/components/Filmstrip.tsx`
- Create: `src/app/(public)/p/[id]/page.tsx`, `src/app/(public)/@modal/(.)p/[id]/page.tsx`, `src/app/(public)/@modal/default.tsx`
- Create: `src/lib/detail.ts` (shared neighbour lookup)

- [ ] **Step 1: Write `src/lib/detail.ts`**

```ts
import type { SqlDb } from "./sqldb"
import { listPhotos } from "./photos"
import { rowToDTO } from "./serialize"
import type { PhotoDTO } from "@/types/photo"

export async function getDetail(db: SqlDb, cdn: string, idOrSlug: string): Promise<{
  photo: PhotoDTO; neighbours: PhotoDTO[]; index: number; total: number
} | null> {
  const all = (await listPhotos(db, {})).map(({ row, tags }) => rowToDTO(row, tags, cdn))
  const index = all.findIndex((p) => p.id === idOrSlug || p.slug === idOrSlug)
  if (index < 0) return null
  return { photo: all[index], neighbours: all, index, total: all.length }
}
```

- [ ] **Step 2: Write `src/components/Filmstrip.tsx`**

```tsx
"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/cn"
import type { PhotoDTO } from "@/types/photo"

export function Filmstrip({ photos, activeId }: { photos: PhotoDTO[]; activeId: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [activeId])

  return (
    <div ref={ref} className="flex gap-[5px] overflow-x-auto border-t border-line bg-[#070a11] px-4 py-3">
      {photos.map((p) => {
        const active = p.id === activeId
        return (
          <Link key={p.id} href={`/p/${p.slug}`} scroll={false} data-active={active}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url.thumb}
              alt={p.caption ?? ""}
              className={cn("h-[42px] w-auto rounded-[2px]", active ? "outline outline-2 outline-cyan outline-offset-1" : "opacity-45 hover:opacity-80")}
            />
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/PhotoDetail.tsx`**

```tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ExposureStrip } from "./ExposureStrip"
import { MapChip } from "./MapChip"
import { Filmstrip } from "./Filmstrip"
import { site } from "@/config/site"
import type { PhotoDTO } from "@/types/photo"

export function PhotoDetail({
  photo, neighbours, index, total, mapKey, asModal,
}: {
  photo: PhotoDTO; neighbours: PhotoDTO[]; index: number; total: number; mapKey: string; asModal: boolean
}) {
  const router = useRouter()
  const prev = neighbours[index - 1]
  const next = neighbours[index + 1]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && asModal) router.back()
      if (e.key === "ArrowLeft" && prev) router.push(`/p/${prev.slug}`)
      if (e.key === "ArrowRight" && next) router.push(`/p/${next.slug}`)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router, asModal, prev, next])

  const date = photo.takenAt
    ? new Date(photo.takenAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : null

  return (
    <div className="bg-[#06080d]">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">{site.name} <span className="text-cyan">·</span></span>
        {asModal ? (
          <button onClick={() => router.back()} className="font-mono text-[13px] text-muted-2 hover:text-text">✕</button>
        ) : (
          <Link href="/" className="font-mono text-[13px] text-muted-2 hover:text-text">✕</Link>
        )}
      </div>

      <div className="mx-auto max-w-[640px] px-4 pb-4">
        <div className="rounded-[4px] border border-line-2 bg-bg-2 p-[7px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url.large} alt={photo.caption ?? ""} width={photo.width} height={photo.height} className="block w-full rounded-[2px]" />
        </div>
        <div className="mt-1.5 flex justify-between px-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
          <span>{String(index + 1).padStart(2, "0")} — {total}</span>
          <span>← → / SWIPE</span>
        </div>

        <div className="mt-4 flex items-start gap-4 border-t border-line pt-4">
          <div className="min-w-0 flex-1">
            {photo.caption && <p className="mb-3 font-serif text-[18px] italic leading-[1.4] text-[#eaf0f8]">{photo.caption}</p>}
            <ExposureStrip photo={photo} />
            {date && <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{date}</div>}
            {photo.tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2 font-mono text-[10px] text-cyan">
                {photo.tags.map((t) => (
                  <Link key={t} href={`/t/${t}`} className="hover:underline">#{t}</Link>
                ))}
              </div>
            )}
          </div>
          <MapChip photo={photo} mapKey={mapKey} />
        </div>
      </div>

      <Filmstrip photos={neighbours} activeId={photo.id} />
    </div>
  )
}
```

- [ ] **Step 4: Write `src/app/(public)/p/[id]/page.tsx`** (standalone)

```tsx
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { cdnBase, cf } from "@/lib/env"
import { getDetail } from "@/lib/detail"
import { PhotoDetail } from "@/components/PhotoDetail"

export const dynamic = "force-dynamic"

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getDetail(db(), cdnBase(), id)
  if (!data) notFound()
  const mapKey = cf().NEXT_PUBLIC_MAPTILER_KEY ?? ""
  return <PhotoDetail {...data} mapKey={mapKey} asModal={false} />
}
```

- [ ] **Step 5: Write `src/app/(public)/@modal/default.tsx`**

```tsx
export default function Default() { return null }
```

- [ ] **Step 6: Write `src/app/(public)/@modal/(.)p/[id]/page.tsx`** (intercepting modal)

```tsx
import { db } from "@/lib/db"
import { cdnBase, cf } from "@/lib/env"
import { getDetail } from "@/lib/detail"
import { PhotoDetail } from "@/components/PhotoDetail"
import { ModalShell } from "@/components/ModalShell"

export const dynamic = "force-dynamic"

export default async function PhotoModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getDetail(db(), cdnBase(), id)
  if (!data) return null
  const mapKey = cf().NEXT_PUBLIC_MAPTILER_KEY ?? ""
  return (
    <ModalShell>
      <PhotoDetail {...data} mapKey={mapKey} asModal />
    </ModalShell>
  )
}
```

- [ ] **Step 7: Write `src/components/ModalShell.tsx`**

```tsx
"use client"

import { useRouter } from "next/navigation"

export function ModalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm" onClick={() => router.back()}>
      <div className="mx-auto my-6 max-w-[760px] overflow-hidden rounded-lg border border-line-2 bg-[#06080d]" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Add `NEXT_PUBLIC_MAPTILER_KEY` to `cloudflare-env.d.ts` and to `[vars]` in `wrangler.toml`** (empty default; real value via `.dev.vars` / dashboard). Regenerate types: `npm run cf-typegen`.

- [ ] **Step 9: Typecheck + commit**

```bash
npm run typecheck
git add src/lib/detail.ts src/components/PhotoDetail.tsx src/components/Filmstrip.tsx src/components/ModalShell.tsx "src/app/(public)/p" "src/app/(public)/@modal" cloudflare-env.d.ts wrangler.toml
git commit -m "feat(ui): photo detail with filmstrip + intercepting modal route"
```

---

## Task 15: Session cookies (TDD) + WebAuthn server wrappers

**Files:**
- Create: `src/lib/session.ts`, `src/lib/session.test.ts`, `src/lib/webauthn.ts`

- [ ] **Step 1: Write `src/lib/session.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { signSession, verifySession } from "./session"

const secret = "test-secret-please-change"

describe("session", () => {
  it("round-trips a signed payload", async () => {
    const token = await signSession({ sub: "admin", exp: Date.now() + 10000 }, secret)
    const out = await verifySession(token, secret)
    expect(out?.sub).toBe("admin")
  })
  it("rejects a tampered token", async () => {
    const token = await signSession({ sub: "admin", exp: Date.now() + 10000 }, secret)
    expect(await verifySession(token.slice(0, -2) + "xx", secret)).toBeNull()
  })
  it("rejects an expired token", async () => {
    const token = await signSession({ sub: "admin", exp: Date.now() - 1 }, secret)
    expect(await verifySession(token, secret)).toBeNull()
  })
  it("rejects a wrong secret", async () => {
    const token = await signSession({ sub: "admin", exp: Date.now() + 10000 }, secret)
    expect(await verifySession(token, "other")).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/lib/session.ts`** (WebCrypto HMAC — runs on Workers + in Node test)

```ts
export interface SessionPayload { sub: string; exp: number }

function b64url(bytes: Uint8Array): string {
  let s = ""
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : ""
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)))
  const sig = await crypto.subtle.sign("HMAC", await key(secret), new TextEncoder().encode(body))
  return `${body}.${b64url(new Uint8Array(sig))}`
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const [body, sig] = token.split(".")
  if (!body || !sig) return null
  const ok = await crypto.subtle.verify("HMAC", await key(secret), fromB64url(sig), new TextEncoder().encode(body))
  if (!ok) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionPayload
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export const SESSION_COOKIE = "gallery_session"
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Write `src/lib/webauthn.ts`** (thin wrappers around `@simplewebauthn/server`, storing challenges in D1)

```ts
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from "@simplewebauthn/server"
import type { SqlDb } from "./sqldb"
import { cf } from "./env"

const CHALLENGE_TTL = 5 * 60 * 1000

async function saveChallenge(db: SqlDb, id: string, challenge: string, kind: "register" | "authenticate") {
  await db.prepare("INSERT OR REPLACE INTO auth_challenges (id, challenge, kind, expires_at) VALUES (?,?,?,?)")
    .bind(id, challenge, kind, Date.now() + CHALLENGE_TTL).run()
}
async function takeChallenge(db: SqlDb, id: string, kind: string): Promise<string | null> {
  const row = await db.prepare("SELECT challenge, expires_at FROM auth_challenges WHERE id = ? AND kind = ?")
    .bind(id, kind).first<{ challenge: string; expires_at: number }>()
  await db.prepare("DELETE FROM auth_challenges WHERE id = ?").bind(id).run()
  if (!row || row.expires_at < Date.now()) return null
  return row.challenge
}

export async function regOptions(db: SqlDb, sessionId: string) {
  const env = cf()
  const opts = await generateRegistrationOptions({
    rpName: "MATAEV Gallery", rpID: env.RP_ID, userName: "bilal", attestationType: "none",
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  })
  await saveChallenge(db, sessionId, opts.challenge, "register")
  return opts
}

export async function regVerify(db: SqlDb, sessionId: string, body: unknown) {
  const env = cf()
  const expectedChallenge = await takeChallenge(db, sessionId, "register")
  if (!expectedChallenge) return { verified: false as const }
  const verification = await verifyRegistrationResponse({
    response: body as never, expectedChallenge, expectedOrigin: env.RP_ORIGIN, expectedRPID: env.RP_ID,
  })
  if (verification.verified && verification.registrationInfo) {
    const { credential } = verification.registrationInfo
    await db.prepare("INSERT OR REPLACE INTO credentials (id, public_key, counter, transports, created_at) VALUES (?,?,?,?,?)")
      .bind(credential.id, credential.publicKey, credential.counter, JSON.stringify(credential.transports ?? []), Date.now()).run()
  }
  return { verified: verification.verified }
}

export async function authOptions(db: SqlDb, sessionId: string) {
  const env = cf()
  const opts = await generateAuthenticationOptions({ rpID: env.RP_ID, userVerification: "preferred" })
  await saveChallenge(db, sessionId, opts.challenge, "authenticate")
  return opts
}

export async function authVerify(db: SqlDb, sessionId: string, body: { id: string } & Record<string, unknown>) {
  const env = cf()
  const expectedChallenge = await takeChallenge(db, sessionId, "authenticate")
  if (!expectedChallenge) return { verified: false as const }
  const cred = await db.prepare("SELECT id, public_key, counter, transports FROM credentials WHERE id = ?")
    .bind(body.id).first<{ id: string; public_key: Uint8Array; counter: number; transports: string }>()
  if (!cred) return { verified: false as const }
  const verification = await verifyAuthenticationResponse({
    response: body as never, expectedChallenge, expectedOrigin: env.RP_ORIGIN, expectedRPID: env.RP_ID,
    credential: { id: cred.id, publicKey: cred.public_key, counter: cred.counter, transports: JSON.parse(cred.transports || "[]") },
  })
  if (verification.verified) {
    await db.prepare("UPDATE credentials SET counter = ?, last_used_at = ? WHERE id = ?")
      .bind(verification.authenticationInfo.newCounter, Date.now(), cred.id).run()
  }
  return { verified: verification.verified }
}

export async function hasCredential(db: SqlDb): Promise<boolean> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM credentials").first<{ n: number }>()
  return (row?.n ?? 0) > 0
}
```

> Note: `@simplewebauthn/server` v13 returns `registrationInfo.credential` with `id`, `publicKey` (Uint8Array), `counter`. Verify these property names against the installed version during implementation; adjust if the minor version differs.

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck
git add src/lib/session.ts src/lib/session.test.ts src/lib/webauthn.ts
git commit -m "feat(auth): HMAC session cookies + WebAuthn server wrappers"
```

---

## Task 16: Auth routes + admin gate middleware

**Files:**
- Create: `src/app/api/auth/register-options/route.ts`, `register-verify/route.ts`, `auth-options/route.ts`, `auth-verify/route.ts`, `logout/route.ts`
- Create: `src/middleware.ts`
- Create: `src/lib/authctx.ts` (read+require session from a request)

- [ ] **Step 1: Write `src/lib/authctx.ts`**

```ts
import { cookies } from "next/headers"
import { cf } from "./env"
import { verifySession, signSession, SESSION_COOKIE } from "./session"

const CHALLENGE_COOKIE = "gallery_chal"

export async function challengeId(): Promise<string> {
  const jar = await cookies()
  let id = jar.get(CHALLENGE_COOKIE)?.value
  if (!id) {
    id = crypto.randomUUID()
    jar.set(CHALLENGE_COOKIE, id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 })
  }
  return id
}

export async function startSession(): Promise<void> {
  const jar = await cookies()
  const token = await signSession({ sub: "admin", exp: Date.now() + 30 * 864e5 }, cf().SESSION_SECRET)
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 })
}

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (!token) return false
  return (await verifySession(token, cf().SESSION_SECRET)) !== null
}

export async function endSession(): Promise<void> {
  ;(await cookies()).delete(SESSION_COOKIE)
}
```

- [ ] **Step 2: Write the five auth routes.**

`register-options/route.ts`:
```ts
import { db } from "@/lib/db"
import { regOptions } from "@/lib/webauthn"
import { challengeId } from "@/lib/authctx"
import { hasCredential } from "@/lib/webauthn"
import { isAuthed } from "@/lib/authctx"
import { cf } from "@/lib/env"

export const runtime = "nodejs"

export async function POST(req: Request) {
  // First enrollment requires the enroll code; subsequent ones require a session.
  const already = await hasCredential(db())
  if (already && !(await isAuthed())) return Response.json({ error: "forbidden" }, { status: 403 })
  if (!already) {
    const { code } = (await req.json().catch(() => ({}))) as { code?: string }
    if (code !== cf().ADMIN_ENROLL_CODE) return Response.json({ error: "bad code" }, { status: 403 })
  }
  const opts = await regOptions(db(), await challengeId())
  return Response.json(opts)
}
```

`register-verify/route.ts`:
```ts
import { db } from "@/lib/db"
import { regVerify } from "@/lib/webauthn"
import { challengeId, startSession } from "@/lib/authctx"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.json()
  const result = await regVerify(db(), await challengeId(), body)
  if (result.verified) await startSession()
  return Response.json(result)
}
```

`auth-options/route.ts`:
```ts
import { db } from "@/lib/db"
import { authOptions } from "@/lib/webauthn"
import { challengeId } from "@/lib/authctx"

export const runtime = "nodejs"

export async function POST() {
  const opts = await authOptions(db(), await challengeId())
  return Response.json(opts)
}
```

`auth-verify/route.ts`:
```ts
import { db } from "@/lib/db"
import { authVerify } from "@/lib/webauthn"
import { challengeId, startSession } from "@/lib/authctx"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.json()
  const result = await authVerify(db(), await challengeId(), body)
  if (result.verified) await startSession()
  return Response.json(result)
}
```

`logout/route.ts`:
```ts
import { endSession } from "@/lib/authctx"

export const runtime = "nodejs"

export async function POST() {
  await endSession()
  return Response.json({ ok: true })
}
```

- [ ] **Step 3: Write `src/middleware.ts`** (page gate; mutation routes re-check inside their handlers)

```ts
import { NextResponse, type NextRequest } from "next/server"
import { verifySession, SESSION_COOKIE } from "@/lib/session"

export async function middleware(req: NextRequest) {
  const isAdminPage = req.nextUrl.pathname === "/admin"
  if (!isAdminPage) return NextResponse.next()
  // Page itself renders login when unauthenticated; middleware only enforces
  // origin for mutations (handled in route handlers). Allow through.
  return NextResponse.next()
}

export const config = { matcher: ["/admin", "/api/admin/:path*"] }
```

> Note: `SESSION_SECRET` isn't available in the Edge middleware env on Workers the same way; the actual authorization is enforced inside each `/api/admin/*` handler (Task 17/18) via `isAuthed()`. Middleware here is a lightweight matcher placeholder + future origin checks. Keep authorization in handlers.

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck
git add src/app/api/auth src/middleware.ts src/lib/authctx.ts
git commit -m "feat(auth): passkey register/login routes + admin context"
```

---

## Task 17: Geocode + admin upload finalize route

**Files:**
- Create: `src/lib/geocode.ts`, `src/lib/geocode.test.ts`, `src/app/api/admin/upload/route.ts`

- [ ] **Step 1: Write `src/lib/geocode.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest"
import { reverseGeocode } from "./geocode"

describe("reverseGeocode", () => {
  it("maps BigDataCloud fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ city: "Svolvær", locality: "Lofoten", countryName: "Norway", countryCode: "NO" }),
    })
    const r = await reverseGeocode(68.2, 13.6, fetchMock as unknown as typeof fetch)
    expect(r).toEqual({ place: "Svolvær", country: "Norway", countryCode: "NO" })
  })
  it("falls back to locality when no city", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ locality: "Lofoten", countryName: "Norway", countryCode: "NO" }) })
    const r = await reverseGeocode(1, 1, fetchMock as unknown as typeof fetch)
    expect(r?.place).toBe("Lofoten")
  })
  it("returns null on error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false })
    expect(await reverseGeocode(1, 1, fetchMock as unknown as typeof fetch)).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Write `src/lib/geocode.ts`**

```ts
export interface GeoResult { place: string | null; country: string | null; countryCode: string | null }

export async function reverseGeocode(lat: number, lon: number, f: typeof fetch = fetch): Promise<GeoResult | null> {
  try {
    const res = await f(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
    if (!res.ok) return null
    const d = (await res.json()) as { city?: string; locality?: string; countryName?: string; countryCode?: string }
    return {
      place: d.city || d.locality || null,
      country: d.countryName || null,
      countryCode: d.countryCode || null,
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Write `src/app/api/admin/upload/route.ts`** (multipart: 3 image blobs + a metadata JSON part)

```ts
import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { putPhotoObject, photoKeys } from "@/lib/r2"
import { insertPhoto } from "@/lib/photos"
import { reverseGeocode } from "@/lib/geocode"
import { newId, slugify } from "@/lib/ids"
import { parseTags } from "@/lib/tags"
import type { PhotoRow } from "@/types/photo"

export const runtime = "nodejs"

interface MetaIn {
  caption?: string; tags?: string; takenAt?: number | null
  width: number; height: number; bytes: number; format: string; ext: string; colorSpace?: string | null
  cameraMake?: string | null; cameraModel?: string | null; lens?: string | null
  focal?: number | null; fNumber?: number | null; exposure?: number | null; iso?: number | null
  lat?: number | null; lon?: number | null; alt?: number | null
  place?: string | null; country?: string | null; countryCode?: string | null
  thumbhash?: string | null
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (req.headers.get("Sec-Fetch-Site") === "cross-site") return Response.json({ error: "bad origin" }, { status: 403 })

  const form = await req.formData()
  const original = form.get("original") as File | null
  const large = form.get("large") as File | null
  const thumb = form.get("thumb") as File | null
  const meta = JSON.parse((form.get("meta") as string) || "{}") as MetaIn
  if (!original || !large || !thumb) return Response.json({ error: "missing files" }, { status: 400 })

  const id = newId()
  const keys = photoKeys(id, meta.ext)
  await Promise.all([
    putPhotoObject(keys.original, await original.arrayBuffer(), original.type || "image/jpeg"),
    putPhotoObject(keys.large, await large.arrayBuffer(), "image/webp"),
    putPhotoObject(keys.thumb, await thumb.arrayBuffer(), "image/webp"),
  ])

  let place = meta.place ?? null, country = meta.country ?? null, countryCode = meta.countryCode ?? null
  if (!place && meta.lat != null && meta.lon != null) {
    const geo = await reverseGeocode(meta.lat, meta.lon)
    if (geo) { place = geo.place; country = geo.country; countryCode = geo.countryCode }
  }

  const row: PhotoRow = {
    id, slug: `${slugify(meta.caption || "photo")}-${id.slice(-5).toLowerCase()}`,
    caption: meta.caption?.trim() || null, taken_at: meta.takenAt ?? null, created_at: Date.now(),
    width: meta.width, height: meta.height, aspect: meta.width / meta.height,
    bytes: meta.bytes, format: meta.format, color_space: meta.colorSpace ?? null,
    camera_make: meta.cameraMake ?? null, camera_model: meta.cameraModel ?? null, lens_model: meta.lens ?? null,
    focal_length: meta.focal ?? null, f_number: meta.fNumber ?? null, exposure_time: meta.exposure ?? null, iso: meta.iso ?? null,
    gps_lat: meta.lat ?? null, gps_lon: meta.lon ?? null, gps_alt: meta.alt ?? null,
    place, country, country_code: countryCode, thumbhash: meta.thumbhash ?? null,
    r2_original: keys.original, r2_large: keys.large, r2_thumb: keys.thumb, published: 1, sort_index: null,
  }
  await insertPhoto(db(), row, parseTags(meta.tags ?? ""))
  return Response.json({ ok: true, id, slug: row.slug })
}
```

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck
git add src/lib/geocode.ts src/lib/geocode.test.ts src/app/api/admin/upload
git commit -m "feat(admin): reverse-geocode + protected upload finalize route"
```

---

## Task 18: Admin update/delete route

**Files:**
- Create: `src/app/api/admin/photos/[id]/route.ts`
- Modify: `src/lib/photos.ts` (add `updatePhoto` for caption/tags/location/published)

- [ ] **Step 1: Add `updatePhoto` + `setTags` to `src/lib/photos.ts`**

```ts
export async function updatePhoto(
  db: SqlDb, id: string,
  patch: Partial<Pick<PhotoRow, "caption" | "place" | "country" | "country_code" | "published">>,
): Promise<void> {
  const fields = Object.keys(patch)
  if (fields.length) {
    const set = fields.map((f) => `${f} = ?`).join(", ")
    await db.prepare(`UPDATE photos SET ${set} WHERE id = ?`).bind(...fields.map((f) => (patch as Record<string, unknown>)[f]), id).run()
  }
}

export async function setTags(db: SqlDb, id: string, tags: string[]): Promise<void> {
  await db.prepare("DELETE FROM photo_tags WHERE photo_id = ?").bind(id).run()
  for (const name of tags) {
    await db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").bind(name).run()
    const tag = await db.prepare("SELECT id FROM tags WHERE name = ?").bind(name).first<{ id: number }>()
    if (tag) await db.prepare("INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)").bind(id, tag.id).run()
  }
}
```

- [ ] **Step 2: Add a test to `src/lib/photos.test.ts` for `updatePhoto` + `setTags`; run — expect PASS** (after implementing).

```ts
it("updates fields and replaces tags", async () => {
  const { makeTestDb } = await import("../../test/sqlite-adapter")
  const db = makeTestDb()
  const { insertPhoto, updatePhoto, setTags, getPhoto, listTagCounts } = await import("./photos")
  // minimal row reuse:
  await insertPhoto(db, (await import("./photos.test-helpers")).h("p1"), ["old"])
  await updatePhoto(db, "p1", { caption: "x", published: 1 })
  await setTags(db, "p1", ["new1", "new2"])
  expect((await getPhoto(db, "p1"))?.tags.sort()).toEqual(["new1", "new2"])
  expect(await listTagCounts(db)).not.toContainEqual({ name: "old", count: 1 })
})
```

> Implementation note: extract the `sample()` row factory from Task 7's test into `src/lib/photos.test-helpers.ts` exporting `h(id, overrides?)` and import it in both tests (DRY). Run `npm test -- run src/lib/photos.test.ts`.

- [ ] **Step 3: Write `src/app/api/admin/photos/[id]/route.ts`**

```ts
import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { updatePhoto, setTags, deletePhoto } from "@/lib/photos"
import { deletePhotoObjects } from "@/lib/r2"
import { parseTags } from "@/lib/tags"

export const runtime = "nodejs"

function guard(req: Request) {
  if (req.headers.get("Sec-Fetch-Site") === "cross-site") return false
  return true
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!guard(req)) return Response.json({ error: "bad origin" }, { status: 403 })
  const { id } = await params
  const body = (await req.json()) as { caption?: string; place?: string; country?: string; countryCode?: string; tags?: string; published?: number }
  await updatePhoto(db(), id, {
    caption: body.caption, place: body.place, country: body.country, country_code: body.countryCode, published: body.published,
  })
  if (body.tags != null) await setTags(db(), id, parseTags(body.tags))
  return Response.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return Response.json({ error: "unauthorized" }, { status: 401 })
  if (!guard(req)) return Response.json({ error: "bad origin" }, { status: 403 })
  const { id } = await params
  const keys = await deletePhoto(db(), id)
  if (keys.length) await deletePhotoObjects(keys)
  return Response.json({ ok: true })
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck && npm test -- run src/lib/photos.test.ts
git add src/lib/photos.ts src/lib/photos.test.ts src/lib/photos.test-helpers.ts src/app/api/admin/photos
git commit -m "feat(admin): update/delete photo route + data layer mutations"
```

---

## Task 19: Client upload pipeline (EXIF / HEIC / derivatives / thumbhash)

**Files:**
- Create: `src/lib/client/exif.ts`, `src/lib/client/heic.ts`, `src/lib/client/derive.ts`, `src/lib/client/thumbhash.ts`

> Browser-only (Canvas/File). Verified in the admin smoke run (Task 21).

- [ ] **Step 1: Write `src/lib/client/heic.ts`**

```ts
export async function toJpegIfHeic(file: File): Promise<File> {
  if (!/heic|heif/i.test(file.type) && !/\.heic$|\.heif$/i.test(file.name)) return file
  const heic2any = (await import("heic2any")).default as (o: { blob: Blob; toType: string; quality: number }) => Promise<Blob>
  const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
}
```

- [ ] **Step 2: Write `src/lib/client/exif.ts`**

```ts
import exifr from "exifr"

export interface ExtractedExif {
  takenAt: number | null; cameraMake: string | null; cameraModel: string | null; lens: string | null
  focal: number | null; fNumber: number | null; exposure: number | null; iso: number | null
  lat: number | null; lon: number | null; alt: number | null; colorSpace: string | null
}

export async function extractExif(file: File): Promise<ExtractedExif> {
  const x = (await exifr.parse(file, { gps: true, tiff: true, exif: true }).catch(() => null)) ?? {}
  const taken = x.DateTimeOriginal ?? x.CreateDate
  return {
    takenAt: taken ? new Date(taken).getTime() : null,
    cameraMake: x.Make ?? null, cameraModel: x.Model ?? null, lens: x.LensModel ?? null,
    focal: x.FocalLength ?? null, fNumber: x.FNumber ?? null,
    exposure: x.ExposureTime ?? null, iso: x.ISO ?? null,
    lat: x.latitude ?? null, lon: x.longitude ?? null, alt: x.GPSAltitude ?? null,
    colorSpace: x.ColorSpace === 1 ? "sRGB" : x.ColorSpace ? String(x.ColorSpace) : null,
  }
}
```

- [ ] **Step 3: Write `src/lib/client/derive.ts`** (canvas → WebP at two sizes + natural dimensions)

```ts
export interface Derived { large: Blob; thumb: Blob; width: number; height: number }

async function loadBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file)
}

function scaleTo(bmp: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w; canvas.height = h
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/webp", quality))
}

export async function deriveImages(file: File): Promise<Derived> {
  const bmp = await loadBitmap(file)
  const [large, thumb] = await Promise.all([scaleTo(bmp, 1600, 0.82), scaleTo(bmp, 500, 0.72)])
  return { large, thumb, width: bmp.width, height: bmp.height }
}
```

- [ ] **Step 4: Write `src/lib/client/thumbhash.ts`** (encode from a tiny canvas sample)

```ts
import { rgbaToThumbHash } from "thumbhash"

export async function computeThumbhash(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 100 / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(bmp, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  const hash = rgbaToThumbHash(w, h, data)
  let s = ""
  for (const b of hash) s += String.fromCharCode(b)
  return btoa(s)
}
```

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/lib/client
git commit -m "feat(admin): client EXIF + HEIC + WebP derivatives + thumbhash"
```

---

## Task 20: Admin UI — login, uploader, manage

**Files:**
- Create: `src/components/admin/Login.tsx`, `src/components/admin/Uploader.tsx`, `src/components/admin/PhotoList.tsx`, `src/components/admin/EditForm.tsx`
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Write `src/components/admin/Login.tsx`**

```tsx
"use client"

import { useState } from "react"
import { startAuthentication, startRegistration } from "@simplewebauthn/browser"

export function Login({ enrolled, onAuthed }: { enrolled: boolean; onAuthed: () => void }) {
  const [code, setCode] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function login() {
    setBusy(true); setErr(null)
    try {
      const opts = await (await fetch("/api/auth/auth-options", { method: "POST" })).json()
      const resp = await startAuthentication(opts)
      const out = await (await fetch("/api/auth/auth-verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) })).json()
      if (out.verified) onAuthed(); else setErr("Verification failed.")
    } catch { setErr("Passkey cancelled.") } finally { setBusy(false) }
  }

  async function enroll() {
    setBusy(true); setErr(null)
    try {
      const opts = await (await fetch("/api/auth/register-options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })).json()
      if (opts.error) { setErr("Wrong enroll code."); return }
      const resp = await startRegistration(opts)
      const out = await (await fetch("/api/auth/register-verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) })).json()
      if (out.verified) onAuthed(); else setErr("Enrollment failed.")
    } catch { setErr("Passkey cancelled.") } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-sm place-items-center px-5">
      <div className="w-full space-y-4 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">Admin</p>
        <button onClick={login} disabled={busy} className="w-full rounded-md border border-cyan/40 bg-cyan/10 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.15em] text-cyan hover:bg-cyan/20 disabled:opacity-50">
          Sign in with passkey
        </button>
        {!enrolled && (
          <div className="space-y-2 border-t border-line pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">First run — enroll a passkey</p>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enroll code" className="w-full rounded-md border border-line-2 bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-cyan/50" />
            <button onClick={enroll} disabled={busy || !code} className="w-full rounded-md border border-line-2 px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.15em] text-text hover:border-cyan/50 disabled:opacity-50">
              Enroll passkey
            </button>
          </div>
        )}
        {err && <p className="font-mono text-[11px] text-amber">{err}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/admin/Uploader.tsx`**

```tsx
"use client"

import { useState } from "react"
import { toJpegIfHeic } from "@/lib/client/heic"
import { extractExif } from "@/lib/client/exif"
import { deriveImages } from "@/lib/client/derive"
import { computeThumbhash } from "@/lib/client/thumbhash"

interface Pending {
  file: File; preview: string; caption: string; tags: string
  exif: Awaited<ReturnType<typeof extractExif>>; place: string; status: "ready" | "uploading" | "done" | "error"
}

export function Uploader({ onUploaded }: { onUploaded: () => void }) {
  const [items, setItems] = useState<Pending[]>([])

  async function onFiles(files: FileList | null) {
    if (!files) return
    for (const raw of Array.from(files)) {
      const file = await toJpegIfHeic(raw)
      const exif = await extractExif(file)
      setItems((prev) => [...prev, {
        file, preview: URL.createObjectURL(file), caption: "", tags: "",
        exif, place: "", status: "ready",
      }])
    }
  }

  function patch(i: number, p: Partial<Pending>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)))
  }

  async function upload(i: number) {
    const it = items[i]
    patch(i, { status: "uploading" })
    try {
      const { large, thumb, width, height } = await deriveImages(it.file)
      const thumbhash = await computeThumbhash(it.file)
      const ext = (it.file.name.split(".").pop() || "jpg").toLowerCase()
      const meta = {
        caption: it.caption, tags: it.tags, takenAt: it.exif.takenAt,
        width, height, bytes: it.file.size, format: ext === "png" ? "png" : ext === "webp" ? "webp" : "jpeg", ext,
        colorSpace: it.exif.colorSpace, cameraMake: it.exif.cameraMake, cameraModel: it.exif.cameraModel, lens: it.exif.lens,
        focal: it.exif.focal, fNumber: it.exif.fNumber, exposure: it.exif.exposure, iso: it.exif.iso,
        lat: it.exif.lat, lon: it.exif.lon, alt: it.exif.alt,
        place: it.place || null, thumbhash,
      }
      const fd = new FormData()
      fd.append("original", it.file)
      fd.append("large", new File([large], "large.webp", { type: "image/webp" }))
      fd.append("thumb", new File([thumb], "thumb.webp", { type: "image/webp" }))
      fd.append("meta", JSON.stringify(meta))
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
      if (!res.ok) throw new Error()
      patch(i, { status: "done" }); onUploaded()
    } catch { patch(i, { status: "error" }) }
  }

  return (
    <section className="space-y-4">
      <label className="flex h-28 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted hover:border-cyan/40">
        Drop or choose photos
        <input type="file" multiple accept="image/*,.heic,.heif" className="hidden" onChange={(e) => onFiles(e.target.files)} />
      </label>

      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex gap-3 rounded-lg border border-line p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.preview} alt="" className="h-24 w-24 shrink-0 rounded object-cover" />
            <div className="min-w-0 flex-1 space-y-2">
              <input value={it.caption} onChange={(e) => patch(i, { caption: e.target.value })} placeholder="Caption" className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 text-sm text-text outline-none focus:border-cyan/50" />
              <input value={it.tags} onChange={(e) => patch(i, { tags: e.target.value })} placeholder="#tags #separated" className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-cyan/50" />
              <input value={it.place} onChange={(e) => patch(i, { place: e.target.value })} placeholder={it.exif.lat != null ? "Location (auto from GPS)" : "Location (manual, optional)"} className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 text-xs text-text outline-none focus:border-cyan/50" />
              <div className="flex items-center gap-3">
                <button onClick={() => upload(i)} disabled={it.status === "uploading" || it.status === "done"} className="rounded border border-cyan/40 bg-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan disabled:opacity-50">
                  {it.status === "done" ? "Posted ✓" : it.status === "uploading" ? "Posting…" : "Post"}
                </button>
                {it.status === "error" && <span className="font-mono text-[10px] text-amber">Failed</span>}
                {it.exif.cameraModel && <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{it.exif.cameraModel}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Write `src/components/admin/PhotoList.tsx`** + `EditForm.tsx` (manage + delete)

```tsx
// src/components/admin/EditForm.tsx
"use client"

import { useState } from "react"
import type { PhotoDTO } from "@/types/photo"

export function EditForm({ photo, onSaved, onDeleted }: { photo: PhotoDTO; onSaved: () => void; onDeleted: () => void }) {
  const [caption, setCaption] = useState(photo.caption ?? "")
  const [tags, setTags] = useState(photo.tags.map((t) => `#${t}`).join(" "))
  const [place, setPlace] = useState(photo.place ?? "")
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    await fetch(`/api/admin/photos/${photo.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caption, tags, place }) })
    setBusy(false); onSaved()
  }
  async function remove() {
    if (!confirm("Delete this photo permanently? This removes it from the gallery and storage.")) return
    setBusy(true)
    await fetch(`/api/admin/photos/${photo.id}`, { method: "DELETE" })
    setBusy(false); onDeleted()
  }

  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 text-sm text-text outline-none focus:border-cyan/50" />
      <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-cyan/50" />
      <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Location" className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 text-xs text-text outline-none focus:border-cyan/50" />
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="rounded border border-cyan/40 bg-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan disabled:opacity-50">Save</button>
        <button onClick={remove} disabled={busy} className="rounded border border-danger/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber hover:bg-amber/10">Delete</button>
      </div>
    </div>
  )
}
```

```tsx
// src/components/admin/PhotoList.tsx
"use client"

import { useEffect, useState } from "react"
import { EditForm } from "./EditForm"
import type { PhotoDTO, PhotosResponse } from "@/types/photo"

export function PhotoList({ reloadKey }: { reloadKey: number }) {
  const [photos, setPhotos] = useState<PhotoDTO[]>([])
  const [open, setOpen] = useState<string | null>(null)

  async function load() {
    const data = (await (await fetch("/api/photos")).json()) as PhotosResponse
    setPhotos(data.photos)
  }
  useEffect(() => { load() }, [reloadKey])

  return (
    <section className="space-y-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{photos.length} photos</p>
      {photos.map((p) => (
        <div key={p.id} className="space-y-2">
          <button onClick={() => setOpen(open === p.id ? null : p.id)} className="flex w-full items-center gap-3 rounded-lg border border-line p-2 text-left hover:border-line-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url.thumb} alt="" className="h-12 w-12 rounded object-cover" />
            <span className="min-w-0 flex-1 truncate text-sm text-text">{p.caption || <span className="text-muted">No caption</span>}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{p.place ?? "—"}</span>
          </button>
          {open === p.id && <EditForm photo={p} onSaved={load} onDeleted={() => { setOpen(null); load() }} />}
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 4: Write `src/app/admin/page.tsx`**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Login } from "@/components/admin/Login"
import { Uploader } from "@/components/admin/Uploader"
import { PhotoList } from "@/components/admin/PhotoList"

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [enrolled, setEnrolled] = useState(true)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    fetch("/api/admin/photos/__status", { method: "GET" }).then((r) => setAuthed(r.status !== 401)).catch(() => setAuthed(false))
    fetch("/api/auth/auth-options", { method: "POST" }).then((r) => r.json()).then((o) => setEnrolled((o.allowCredentials?.length ?? 0) > 0 || true)).catch(() => {})
  }, [])

  if (authed === null) return <div className="grid min-h-[70vh] place-items-center font-mono text-xs text-muted">…</div>
  if (!authed) return <Login enrolled={enrolled} onAuthed={() => setAuthed(true)} />

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-[12px] uppercase tracking-[0.3em] text-text">Admin</h1>
        <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.reload() }} className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-cyan">Sign out</button>
      </div>
      <Uploader onUploaded={() => setReload((n) => n + 1)} />
      <PhotoList reloadKey={reload} />
    </main>
  )
}
```

> Add a tiny auth-status endpoint to make the page's `authed` check honest: create `src/app/api/admin/status/route.ts` returning 401 when not authed, and change the page fetch URL to `/api/admin/status`.

```ts
// src/app/api/admin/status/route.ts
import { isAuthed } from "@/lib/authctx"
export const runtime = "nodejs"
export async function GET() {
  return Response.json({ ok: true }, { status: (await isAuthed()) ? 200 : 401 })
}
```

(Update the page's effect to fetch `/api/admin/status`.)

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add src/components/admin src/app/admin src/app/api/admin/status
git commit -m "feat(admin): passkey login + uploader + manage/delete UI"
```

---

## Task 21: End-to-end smoke (local Cloudflare runtime)

**Files:** none (verification only).

- [ ] **Step 1: Set local secrets** — create `.dev.vars`:

```
SESSION_SECRET=dev-secret-change-me
ADMIN_ENROLL_CODE=let-me-in
NEXT_PUBLIC_MAPTILER_KEY=<your-maptiler-key-or-blank>
```

- [ ] **Step 2: Apply migrations locally + build for Workers + preview**

Run:
```bash
npm run db:migrate:local
npm run preview
```
Expected: `wrangler dev` serves the app on the Workers runtime with R2 + D1 bound.

- [ ] **Step 3: Manual checklist**
  - `/admin` → "First run — enroll a passkey" visible. Enroll with `let-me-in` → Face/Touch ID → dashboard appears.
  - Upload 1 JPEG with GPS + 1 without. Both post; EXIF model shows; GPS one auto-fills location after post.
  - `/` shows the mosaic, photos uncropped, justified rows, hover peek, no metadata at rest.
  - Click a photo → modal detail (serif caption, exposure strip, map chip if key set, filmstrip). URL is `/p/<slug>`. Reload → standalone page renders. ESC/←/→ work.
  - Tag chip filters; counts correct.
  - `GET /api/photos` returns the documented JSON; `Access-Control-Allow-Origin` echoes for `https://mataev.no` (test with `curl -H "Origin: https://mataev.no" -i http://localhost:8787/api/photos`).
  - Delete a photo from Manage → gone from grid + `/api/photos`.

- [ ] **Step 4: Commit any fixes found during smoke, then tag the milestone**

```bash
git add -A && git commit -m "fix: smoke-test corrections" || echo "no fixes needed"
git tag v0.1.0-gallery
```

---

## Task 22: Wire the 3D portfolio to consume the gallery API

**Repo:** `/Users/brz/Desktop/Mash/Mataev.no` (separate repo — branch first per its CLAUDE.md).
**Files:**
- Modify: `src/app/api/gallery/route.ts`
- Modify: `src/types/gallery.ts` (optional richer fields)

- [ ] **Step 1: In the portfolio repo, create a branch**

```bash
cd /Users/brz/Desktop/Mash/Mataev.no
git checkout -b feat/gallery-api-source
```

- [ ] **Step 2: Replace `src/app/api/gallery/route.ts`** to fetch the live gallery API and map to `GalleryImage`

```ts
import { NextResponse } from "next/server"
import type { GalleryImage, GalleryResponse } from "@/types/gallery"

export const runtime = "edge"
export const revalidate = 300

const GALLERY_API = process.env.GALLERY_API_URL ?? "https://gallery.mataev.no/api/photos"

interface RemotePhoto {
  slug: string
  url: { thumb: string; large: string }
  caption: string | null
  width: number
  height: number
}

export async function GET() {
  try {
    const res = await fetch(GALLERY_API, { next: { revalidate: 300 } })
    if (!res.ok) return NextResponse.json({ images: [] } satisfies GalleryResponse)
    const data = (await res.json()) as { photos: RemotePhoto[] }
    const images: GalleryImage[] = data.photos.map((p) => ({
      url: p.url.large,
      title: p.caption ?? undefined,
      alt: p.caption ?? undefined,
    }))
    return NextResponse.json({ images } satisfies GalleryResponse)
  } catch {
    return NextResponse.json({ images: [] } satisfies GalleryResponse)
  }
}
```

- [ ] **Step 3: Verify portfolio still typechecks + builds**

Run:
```bash
npm run lint && npx tsc --noEmit
```
Expected: no NEW errors from this file (pre-existing repo lint state unchanged).

- [ ] **Step 4: Commit (portfolio repo)**

```bash
git add src/app/api/gallery/route.ts
git commit -m "feat(api): source gallery images from gallery.mataev.no

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> The 3D `GalleryStation` already consumes `/api/gallery` via `DataPrefetcher` → `galleryData`. No scene changes needed. If richer overlays are wanted later (place, EXIF) in 3D, extend `GalleryImage` and the mapper — out of scope here.

---

## Self-Review

**Spec coverage check:**
- §2 stack/infra → Task 1. ✓
- §2 bindings/wrangler → Task 1, 8. ✓
- §3 data model → Task 2 (migration), Task 7 (queries). ✓
- §4 upload pipeline (EXIF/HEIC/derivatives/thumbhash/geocode) → Tasks 17, 19, 20. ✓
- §5 passkey auth → Tasks 15, 16, 20. ✓
- §6 public site (mosaic/justified/thumbhash/detail/filmstrip/map/tags/footer) → Tasks 5, 10–14. ✓
- §7 admin → Task 20 (+18 routes). ✓
- §8 public API contract + portfolio consumption → Tasks 9, 22. ✓
- §9 security/privacy (session, origin checks, type/size) → Tasks 15–18. ✓ (size cap: add `if (original.size > 30*1024*1024) return 413` in Task 17 upload handler — **add during implementation**.)
- §10 setup checklist → Task 21 (.dev.vars) + spec §10 for prod. ✓
- §11 structure → matches File Structure. ✓

**Placeholder scan:** `database_id` placeholder in `wrangler.toml` is an intentional setup value (filled by `wrangler d1 create`). MapTiler key blank-by-default is intentional. No "TODO/implement later" steps.

**Type consistency:** `SqlDb`/`SqlStatement` defined in `src/lib/sqldb.ts` (Task 7 step 5), imported everywhere. `PhotoRow`/`PhotoDTO`/`PhotosResponse` defined Task 6, used in 7/9/22. `photoKeys` returns `{original,large,thumb}` (Task 8), consumed in Task 17. `reverseGeocode` signature consistent (Task 17). WebAuthn property-name caveat flagged in Task 15.

**One gap fixed inline:** add the 30 MB size guard to the upload handler (noted above) when implementing Task 17.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-30-gallery-mataev-no.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

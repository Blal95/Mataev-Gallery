# Video Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add video upload and playback to the gallery so videos appear inline with photos — same grid, tags, atlas, and detail UI.

**Architecture:** Extend the existing `photos` table with `media_type` and `duration` columns. Videos store the raw file as `r2_original`; poster frames (WebP) are derived client-side and stored as `r2_large`/`r2_thumb`, exactly like photo thumbnails. All existing queries, pagination, tag filtering, and atlas code work unchanged.

**Tech Stack:** Next.js 14 (App Router), Cloudflare Workers + R2 + D1, Vitest, TypeScript, Tailwind CSS

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `migrations/0003_video.sql` | Add `media_type` + `duration` columns |
| Modify | `src/types/photo.ts` | Add new fields to `PhotoRow` + `PhotoDTO` |
| Modify | `src/lib/photos.ts` | Update `COLS` constant + `insertPhoto` bindings |
| Modify | `src/lib/serialize.ts` | Map `media_type`/`duration` in `rowToDTO` |
| Modify | `src/lib/photos.test-helpers.ts` | Add new fields to test factory |
| Modify | `src/lib/serialize.test.ts` | Test new DTO fields for both photo and video rows |
| Create | `src/lib/client/poster.ts` | Extract poster frame + duration from a video file |
| Modify | `src/components/admin/Uploader.tsx` | Video upload: poster extraction, preview, form |
| Modify | `src/app/api/admin/upload/route.ts` | Raise size limit, accept `mediaType`/`duration` |
| Modify | `src/components/PhotoTile.tsx` | Play badge overlay for video tiles |
| Modify | `src/components/PhotoDetail.tsx` | Video player with autoplay, click-to-pause |

---

## Task 1: DB Migration

**Files:**
- Create: `migrations/0003_video.sql`

- [ ] **Step 1: Create migration file**

```sql
-- migrations/0003_video.sql
ALTER TABLE photos ADD COLUMN media_type TEXT NOT NULL DEFAULT 'photo';
ALTER TABLE photos ADD COLUMN duration    REAL;  -- seconds, null for photos
```

- [ ] **Step 2: Verify test suite still passes**

The `makeTestDb()` in `test/sqlite-adapter.ts` auto-runs all migration files in lexicographic order. Adding `0003_video.sql` means the test DB will have the new columns with defaults, so existing tests should pass without changes.

Run: `npm test`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add migrations/0003_video.sql
git commit -m "feat: add media_type and duration columns to photos table"
```

---

## Task 2: Types + Data Layer

**Files:**
- Modify: `src/types/photo.ts`
- Modify: `src/lib/photos.ts`
- Modify: `src/lib/serialize.ts`
- Modify: `src/lib/photos.test-helpers.ts`
- Modify: `src/lib/serialize.test.ts`

- [ ] **Step 1: Write failing serialize test for new fields**

In `src/lib/serialize.test.ts`, add two test cases after the existing one:

```typescript
it("sets mediaType to 'photo' and duration null by default", () => {
  const dto = rowToDTO({ ...row, media_type: "photo", duration: null }, [], "https://cdn.x")
  expect(dto.mediaType).toBe("photo")
  expect(dto.duration).toBeNull()
})

it("maps video row to mediaType video and duration", () => {
  const dto = rowToDTO({ ...row, media_type: "video", duration: 12.4 }, [], "https://cdn.x")
  expect(dto.mediaType).toBe("video")
  expect(dto.duration).toBe(12.4)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- serialize`
Expected: TypeScript errors — `media_type` and `duration` don't exist on `PhotoRow` yet

- [ ] **Step 3: Update `src/types/photo.ts`**

Add two fields to `PhotoRow` and `PhotoDTO`:

```typescript
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
  media_type: string        // 'photo' | 'video'
  duration: number | null   // seconds; null for photos
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
  published: boolean
  tags: string[]
  mediaType: 'photo' | 'video'
  duration: number | null
}

export interface TagCount { name: string; count: number }
export interface PhotosResponse { photos: PhotoDTO[]; tags: TagCount[]; nextOffset?: number | null }
```

- [ ] **Step 4: Update `src/lib/photos.ts`**

Append `media_type,duration` to `COLS`:

```typescript
const COLS =
  "id,slug,caption,taken_at,created_at,width,height,aspect,bytes,format,color_space," +
  "camera_make,camera_model,lens_model,focal_length,f_number,exposure_time,iso," +
  "gps_lat,gps_lon,gps_alt,place,country,country_code,thumbhash," +
  "r2_original,r2_large,r2_thumb,published,sort_index,media_type,duration"
```

In `insertPhoto`, append the two new values at the end of the `.bind(...)` call (after `row.sort_index`):

```typescript
.bind(
  row.id, row.slug, row.caption, row.taken_at, row.created_at, row.width, row.height, row.aspect,
  row.bytes, row.format, row.color_space, row.camera_make, row.camera_model, row.lens_model,
  row.focal_length, row.f_number, row.exposure_time, row.iso, row.gps_lat, row.gps_lon, row.gps_alt,
  row.place, row.country, row.country_code, row.thumbhash, row.r2_original, row.r2_large, row.r2_thumb,
  row.published, row.sort_index, row.media_type, row.duration,
)
```

- [ ] **Step 5: Update `src/lib/serialize.ts`**

Add `mediaType` and `duration` to the returned DTO in `rowToDTO`:

```typescript
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
    published: row.published === 1,
    tags,
    mediaType: row.media_type === 'video' ? 'video' : 'photo',
    duration: row.duration,
  }
}
```

- [ ] **Step 6: Update `src/lib/photos.test-helpers.ts`**

Add the two new fields with defaults to the factory function `h()`:

```typescript
import type { PhotoRow } from "@/types/photo"

export function h(id: string, overrides: Partial<PhotoRow> = {}): PhotoRow {
  return {
    id, slug: id, caption: "c", taken_at: 1000 + Number(id.replace(/\D/g, "")), created_at: 1,
    width: 6000, height: 4000, aspect: 1.5, bytes: 100, format: "jpeg", color_space: null,
    camera_make: null, camera_model: null, lens_model: null, focal_length: null, f_number: null,
    exposure_time: null, iso: null, gps_lat: null, gps_lon: null, gps_alt: null,
    place: null, country: null, country_code: null, thumbhash: null,
    r2_original: `photos/${id}/original.jpg`, r2_large: `photos/${id}/large.webp`,
    r2_thumb: `photos/${id}/thumb.webp`, published: 1, sort_index: null,
    media_type: "photo", duration: null,
    ...overrides,
  }
}
```

- [ ] **Step 7: Run all tests to verify they pass**

Run: `npm test`
Expected: all tests pass including the two new serialize tests

- [ ] **Step 8: Commit**

```bash
git add src/types/photo.ts src/lib/photos.ts src/lib/serialize.ts \
        src/lib/photos.test-helpers.ts src/lib/serialize.test.ts
git commit -m "feat: add mediaType and duration to PhotoRow, PhotoDTO, serialize, and data layer"
```

---

## Task 3: Client-Side Poster Extraction

**Files:**
- Create: `src/lib/client/poster.ts`

No unit test — browser APIs (`HTMLVideoElement`, `canvas`) are not available in vitest/node. Manual verification happens in Task 5.

- [ ] **Step 1: Create `src/lib/client/poster.ts`**

```typescript
export interface PosterResult {
  blob: Blob      // full-resolution WebP of first usable frame
  width: number
  height: number
  duration: number  // seconds
}

export function extractPoster(file: File): Promise<PosterResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    const objectUrl = URL.createObjectURL(file)
    video.preload = "metadata"
    video.muted = true
    video.src = objectUrl

    video.addEventListener("loadedmetadata", () => {
      // Seek a bit in so we get a real frame; clamp for very short clips
      video.currentTime = Math.min(0.5, video.duration * 0.1)
    })

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext("2d")!.drawImage(video, 0, 0)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl)
          if (!blob) { reject(new Error("canvas blob failed")); return }
          resolve({ blob, width: video.videoWidth, height: video.videoHeight, duration: video.duration })
        },
        "image/webp",
        0.85,
      )
    })

    video.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("video load failed"))
    })
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/client/poster.ts
git commit -m "feat: add client-side video poster frame extractor"
```

---

## Task 4: Upload API Route — Size Limit + Video Meta

**Files:**
- Modify: `src/app/api/admin/upload/route.ts`

- [ ] **Step 1: Update the route**

Replace the full file content with the version below. Key changes:
- `MAX_BYTES` constant replaces the inline `30 * 1024 * 1024`
- `MetaIn` gains `mediaType` and `duration`
- `PhotoRow` construction uses the new fields

```typescript
import { db } from "@/lib/db"
import { isAuthed } from "@/lib/authctx"
import { putPhotoObject, photoKeys } from "@/lib/r2"
import { insertPhoto } from "@/lib/photos"
import { reverseGeocode } from "@/lib/geocode"
import { newId, slugify } from "@/lib/ids"
import { parseTags } from "@/lib/tags"
import type { PhotoRow } from "@/types/photo"

export const runtime = "nodejs"

// Raise to 500 * 1024 * 1024 when longer video clips are needed
const MAX_BYTES = 100 * 1024 * 1024

interface MetaIn {
  caption?: string; tags?: string; takenAt?: number | null
  width: number; height: number; bytes: number; format: string; ext: string; colorSpace?: string | null
  cameraMake?: string | null; cameraModel?: string | null; lens?: string | null
  focal?: number | null; fNumber?: number | null; exposure?: number | null; iso?: number | null
  lat?: number | null; lon?: number | null; alt?: number | null
  place?: string | null; country?: string | null; countryCode?: string | null
  thumbhash?: string | null
  mediaType?: string | null
  duration?: number | null
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

  if (original.size > MAX_BYTES) return Response.json({ error: "file too large" }, { status: 413 })

  const id = newId()
  const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif", "mp4", "mov", "webm"]
  const ext = ALLOWED_EXT.includes((meta.ext || "").toLowerCase()) ? meta.ext.toLowerCase() : "jpg"
  const keys = photoKeys(id, ext)
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
    media_type: meta.mediaType === "video" ? "video" : "photo",
    duration: meta.duration ?? null,
  }
  await insertPhoto(db(), row, parseTags(meta.tags ?? ""))
  return Response.json({ ok: true, id, slug: row.slug })
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/upload/route.ts
git commit -m "feat: raise upload limit to 100MB and accept video mediaType/duration"
```

---

## Task 5: Admin Uploader — Video Support

**Files:**
- Modify: `src/components/admin/Uploader.tsx`

- [ ] **Step 1: Replace full file content**

```typescript
"use client"

import { useEffect, useRef, useState } from "react"
import { toJpegIfHeic } from "@/lib/client/heic"
import { extractExif } from "@/lib/client/exif"
import { deriveImages } from "@/lib/client/derive"
import { computeThumbhash } from "@/lib/client/thumbhash"
import { extractPoster } from "@/lib/client/poster"

interface Pending {
  file: File
  preview: string          // object URL — for <img> (photos) or <video> (videos)
  caption: string
  tags: string
  exif: Awaited<ReturnType<typeof extractExif>> | null  // null for videos
  place: string
  status: "ready" | "uploading" | "done" | "error"
  mediaType: "photo" | "video"
  duration: number | null  // seconds; null for photos
  posterBlob: Blob | null  // full-res poster frame for videos; null for photos
}

export function Uploader({ onUploaded }: { onUploaded: () => void }) {
  const [items, setItems] = useState<Pending[]>([])
  const itemsRef = useRef<Pending[]>([])
  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => () => { itemsRef.current.forEach((it) => URL.revokeObjectURL(it.preview)) }, [])

  async function onFiles(files: FileList | null) {
    if (!files) return
    let nextIdx = itemsRef.current.length
    for (const raw of Array.from(files)) {
      const isVideo = raw.type.startsWith("video/")
      const idx = nextIdx++

      if (isVideo) {
        // Add placeholder immediately so the user sees something
        setItems((prev) => [...prev, {
          file: raw, preview: URL.createObjectURL(raw), caption: "", tags: "",
          exif: null, place: "", status: "ready",
          mediaType: "video", duration: null, posterBlob: null,
        }])
        // Extract poster + duration in the background
        extractPoster(raw)
          .then(({ blob, duration }) => {
            setItems((prev) => prev.map((it, i) =>
              i === idx ? { ...it, duration, posterBlob: blob } : it,
            ))
          })
          .catch(() => {})
      } else {
        const exif = await extractExif(raw)
        const file = await toJpegIfHeic(raw)
        setItems((prev) => [...prev, {
          file, preview: URL.createObjectURL(file), caption: "", tags: "",
          exif, place: "", status: "ready",
          mediaType: "photo", duration: null, posterBlob: null,
        }])
        if (exif.lat != null && exif.lon != null) {
          fetch(`/api/admin/geocode?lat=${exif.lat}&lon=${exif.lon}`)
            .then((r) => r.json())
            .then((data) => {
              const typed = data as { result?: { place?: string | null; country?: string | null } }
              const r = typed.result
              if (!r) return
              const label = [r.place, r.country].filter(Boolean).join(", ")
              if (label) setItems((prev) => prev.map((it, i) => i === idx ? { ...it, place: label } : it))
            })
            .catch(() => {})
        }
      }
    }
  }

  function patch(i: number, p: Partial<Pending>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)))
  }

  async function upload(i: number) {
    const it = items[i]
    patch(i, { status: "uploading" })
    try {
      let large: Blob, thumb: Blob, width: number, height: number, thumbhash: string

      if (it.mediaType === "video") {
        // Use the cached poster blob; fall back to re-extracting if somehow missing
        const posterBlob = it.posterBlob ?? (await extractPoster(it.file)).blob
        const posterFile = new File([posterBlob], "poster.webp", { type: "image/webp" })
        const derived = await deriveImages(posterFile)
        large = derived.large; thumb = derived.thumb
        width = derived.width; height = derived.height
        thumbhash = await computeThumbhash(posterFile)
      } else {
        const derived = await deriveImages(it.file)
        large = derived.large; thumb = derived.thumb
        width = derived.width; height = derived.height
        thumbhash = await computeThumbhash(it.file)
      }

      const ext = it.mediaType === "video"
        ? (it.file.name.split(".").pop() || "mp4").toLowerCase()
        : (it.file.name.split(".").pop() || "jpg").toLowerCase()

      const meta = {
        caption: it.caption,
        tags: it.tags,
        takenAt: it.exif?.takenAt ?? it.file.lastModified,
        width, height,
        bytes: it.file.size,
        format: it.mediaType === "video" ? ext : (ext === "png" ? "png" : ext === "webp" ? "webp" : "jpeg"),
        ext,
        colorSpace: it.exif?.colorSpace ?? null,
        cameraMake: it.exif?.cameraMake ?? null,
        cameraModel: it.exif?.cameraModel ?? null,
        lens: it.exif?.lens ?? null,
        focal: it.exif?.focal ?? null,
        fNumber: it.exif?.fNumber ?? null,
        exposure: it.exif?.exposure ?? null,
        iso: it.exif?.iso ?? null,
        lat: it.exif?.lat ?? null,
        lon: it.exif?.lon ?? null,
        alt: it.exif?.alt ?? null,
        place: it.place || null,
        thumbhash,
        mediaType: it.mediaType,
        duration: it.duration,
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

  const readyCount = items.filter((it) => it.status === "ready").length

  async function uploadAll() {
    for (let i = 0; i < items.length; i++) {
      if (items[i].status === "ready") await upload(i)
    }
  }

  function formatDuration(s: number | null): string {
    if (s == null) return ""
    const m = Math.floor(s / 60), sec = Math.round(s % 60)
    return `${m}:${String(sec).padStart(2, "0")}`
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="flex h-28 flex-1 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted hover:border-cyan/40">
          Drop or choose photos & videos
          <input
            type="file"
            multiple
            accept="image/*,.heic,.heif,video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
        {readyCount > 1 && (
          <button
            onClick={uploadAll}
            className="shrink-0 rounded border border-cyan/40 bg-cyan/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan hover:bg-cyan/15"
          >
            Post all ({readyCount})
          </button>
        )}
      </div>

      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="flex gap-3 rounded-lg border border-line p-3">
            {it.mediaType === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={it.preview} className="h-24 w-24 shrink-0 rounded object-cover" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.preview} alt="" className="h-24 w-24 shrink-0 rounded object-cover" />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <input value={it.caption} onChange={(e) => patch(i, { caption: e.target.value })} placeholder="Caption" className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 text-sm text-text outline-none focus:border-cyan/50" />
              <input value={it.tags} onChange={(e) => patch(i, { tags: e.target.value })} placeholder="#tags #separated" className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-cyan/50" />
              <input value={it.place} onChange={(e) => patch(i, { place: e.target.value })} placeholder="Location" className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 text-xs text-text outline-none focus:border-cyan/50" />
              <div className="flex items-center gap-3">
                <button onClick={() => upload(i)} disabled={it.status === "uploading" || it.status === "done"} className="rounded border border-cyan/40 bg-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan disabled:opacity-50">
                  {it.status === "done" ? "Posted ✓" : it.status === "uploading" ? "Posting…" : "Post"}
                </button>
                {it.status === "error" && <span className="font-mono text-[10px] text-amber">Failed</span>}
                {it.mediaType === "video" && it.duration != null && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                    ▶ {formatDuration(it.duration)}
                  </span>
                )}
                {it.mediaType === "photo" && it.exif?.cameraModel && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{it.exif.cameraModel}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/Uploader.tsx
git commit -m "feat: video upload support in admin — poster extraction, preview, form"
```

---

## Task 6: Gallery Tile — Play Badge

**Files:**
- Modify: `src/components/PhotoTile.tsx`

- [ ] **Step 1: Add play badge for video tiles**

In `PhotoTile.tsx`, add the `photo.mediaType` prop destructure check and a centered play badge. The badge sits above the hover scrim so it's always visible.

Find the block after `{/* persistent archival frame number */}` and before `{/* registration ticks */}`, and add the badge after the frame number span:

```tsx
{/* video play badge */}
{photo.mediaType === "video" && (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg/50 backdrop-blur-sm ring-1 ring-amber/40">
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 translate-x-0.5 text-amber/90" aria-hidden>
        <path d="M8 5v14l11-7z" />
      </svg>
    </div>
  </div>
)}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/PhotoTile.tsx
git commit -m "feat: play badge overlay on video tiles in gallery grid"
```

---

## Task 7: Detail View — Video Player

**Files:**
- Modify: `src/components/PhotoDetail.tsx`

- [ ] **Step 1: Replace the stage image block with a media switcher**

`PhotoDetail` currently renders one `<img>`. Replace it with a conditional block. Also add `videoRef`, `canPlay` state, and autoplay logic.

Make the following changes to `PhotoDetail.tsx`:

**Add imports / refs / state at the top of the component body** (after the existing `useState` lines):

```tsx
const videoRef = useRef<HTMLVideoElement>(null)
const [canPlay, setCanPlay] = useState(false)
const isVideo = photo.mediaType === "video"
```

**Add the autoplay effect** (after the existing `useEffect` for keyboard):

```tsx
// Autoplay video 1s after it signals canplay
useEffect(() => {
  if (!isVideo || !canPlay) return
  const t = setTimeout(() => { videoRef.current?.play().catch(() => {}) }, 1000)
  return () => clearTimeout(t)
}, [isVideo, canPlay])

// Pause + reset canPlay when navigating to a different item
useEffect(() => {
  if (!isVideo) return
  videoRef.current?.pause()
  setCanPlay(false)
}, [photo.id, isVideo])
```

**Replace the `<img>` inside the stage `div`** with a conditional:

```tsx
{isVideo ? (
  <video
    ref={videoRef}
    src={photo.url.original}
    loop
    muted
    playsInline
    onCanPlay={() => setCanPlay(true)}
    onLoad={() => setTransitioning(false)}
    onClick={() => {
      const v = videoRef.current
      if (!v) return
      if (v.paused) v.play().catch(() => {})
      else v.pause()
    }}
    className={`pointer-events-auto max-h-full max-w-full cursor-pointer object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] transition-opacity duration-200 ${transitioning ? "opacity-30" : "opacity-100"}`}
  />
) : (
  <img
    src={photo.url.large}
    alt={photo.caption ?? `Frame ${index + 1}`}
    width={photo.width}
    height={photo.height}
    onClick={() => setInfo((v) => !v)}
    onLoad={() => setTransitioning(false)}
    className={`pointer-events-auto max-h-full max-w-full cursor-zoom-in object-contain shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] transition-opacity duration-200 ${transitioning ? "opacity-30" : "opacity-100"}`}
  />
)}
```

Note: `useRef` is already imported from React in this file. Confirm `useRef` is in the import line — add it if missing:
```tsx
import { useEffect, useRef, useState } from "react"
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/PhotoDetail.tsx
git commit -m "feat: video player in detail view with 1s autoplay and click-to-pause"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run typecheck + tests**

```bash
npm run typecheck && npm test
```
Expected: no errors, all tests green

- [ ] **Step 2: Manual smoke test**

1. Start dev server: `npm run dev`
2. Open `/admin`
3. Upload a short `.mp4` file — verify:
   - Preview shows video thumbnail
   - Duration shows in footer (e.g. `▶ 0:12`)
   - Location auto-fills if video has GPS metadata
   - "Post" succeeds without error
4. Open `/` — verify video tile shows play badge over poster frame
5. Click tile → detail view opens, video autoplays after ~1s
6. Click video → pauses; click again → plays
7. Navigate to prev/next frame — video pauses
8. Press `I` → info panel shows (caption, tags, location, exposure strip all render fine with null camera fields)
9. Upload a HEIC photo after the video to confirm photo upload still works

- [ ] **Step 3: Commit any final fixes**

```bash
git add -p
git commit -m "fix: video support smoke test corrections"
```

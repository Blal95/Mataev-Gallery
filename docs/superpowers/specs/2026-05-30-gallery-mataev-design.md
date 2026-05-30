# gallery.mataev.no — Design Spec

**Date:** 2026-05-30
**Status:** Approved (design) — pending spec review
**Location:** `/Users/brz/Desktop/Mash/Mataev-Gallery`

---

## 1. Overview

A photo gallery web app on `gallery.mataev.no` that plays two roles:

1. **Public gallery** — a minimalist, original, "Mosaic Noir" site where people browse Bilal's photography.
2. **Headless API** — `GET /api/photos` returns JSON consumed by the existing 3D portfolio (`mataev.no`, its `/api/gallery` route) and any other client.

It includes a passkey-protected **admin** for posting, editing, and deleting photos. On upload, EXIF + location are extracted automatically; new photos appear in the public grid and the API immediately.

### Goals
- Photos shown **uncropped** at true aspect ratio, in a tidy **justified-rows** mosaic with varied sizes.
- **No metadata at rest** on the grid; full metadata (caption, EXIF, location) on a slick click-through detail view.
- Auto-extract camera, lens, focal length, aperture, shutter, ISO, resolution, file size, capture date, and GPS → place/country.
- Distinct visual identity (explicitly **not** a clone of abdul.no).
- Passwordless **passkey** admin. No passwords handled in code.
- Cheap, on the existing **Cloudflare** stack (Workers + R2 + D1).

### Non-Goals (v1)
- Multi-user / public uploads (single owner only).
- Comments, likes, social features.
- Bilingual chrome (English-only v1; content is language-neutral).
- Runtime server-side image optimization (derivatives are pre-generated at upload).
- Albums as a separate concept (tags double as collections/filters).

---

## 2. Stack & Infrastructure

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, RSC), React 19, TypeScript strict |
| Styling | Tailwind CSS v4 (`@theme inline` tokens) |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` |
| Object storage | Cloudflare **R2** bucket `gallery-photos` (originals + WebP derivatives) |
| Metadata DB | Cloudflare **D1** (SQLite) `gallery` |
| Auth | WebAuthn passkeys (`@simplewebauthn/server` + `/browser`) |
| EXIF | `exifr` (client-side, browser) |
| HEIC decode | `heic2any` (client-side, for iPhone HEIC → JPEG) |
| Placeholder | `thumbhash` (client-side, blur-up) |
| Reverse geocode | BigDataCloud free client endpoint (no key) — called server-side |
| Static map | MapTiler dark static maps (domain-restricted public token) |

### DNS / domains
- `gallery.mataev.no` → the Worker (app + API + admin).
- `cdn.gallery.mataev.no` → R2 bucket public custom domain, immutable cache. All image URLs are served from here.

### Wrangler bindings (`wrangler.toml`)
```toml
name = "mataev-gallery"
main = ".open-next/worker.js"
compatibility_date = "2025-09-01"
compatibility_flags = ["nodejs_compat"]

[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "gallery-photos"

[[d1_databases]]
binding = "DB"
database_name = "gallery"
database_id = "<filled after `wrangler d1 create gallery`>"

[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

---

## 3. Data Model (D1 / SQLite)

```sql
CREATE TABLE photos (
  id            TEXT PRIMARY KEY,           -- ULID
  slug          TEXT UNIQUE NOT NULL,       -- short url-safe id
  caption       TEXT,
  taken_at      INTEGER,                    -- epoch ms (EXIF DateTimeOriginal), nullable
  created_at    INTEGER NOT NULL,           -- epoch ms (upload time)
  width         INTEGER NOT NULL,
  height        INTEGER NOT NULL,
  aspect        REAL    NOT NULL,           -- width / height (for layout, no image load)
  bytes         INTEGER NOT NULL,           -- original file size
  format        TEXT    NOT NULL,           -- 'jpeg' | 'png' | 'webp'
  color_space   TEXT,                       -- 'Display P3' | 'sRGB' | ...
  camera_make   TEXT,
  camera_model  TEXT,
  lens_model    TEXT,
  focal_length  REAL,                       -- mm
  f_number      REAL,                       -- aperture (f/x)
  exposure_time REAL,                       -- seconds (UI formats as 1/x)
  iso           INTEGER,
  gps_lat       REAL,
  gps_lon       REAL,
  gps_alt       REAL,
  place         TEXT,                       -- locality/city
  country       TEXT,
  country_code  TEXT,                       -- ISO 3166-1 alpha-2 (for flag emoji)
  thumbhash     TEXT,                       -- base64 thumbhash (blur-up placeholder)
  r2_original   TEXT NOT NULL,              -- R2 key
  r2_large      TEXT NOT NULL,              -- R2 key (~1600w WebP)
  r2_thumb      TEXT NOT NULL,              -- R2 key (~500w WebP)
  published     INTEGER NOT NULL DEFAULT 1,
  sort_index    INTEGER                     -- optional manual order; default sort = taken_at desc
);
CREATE INDEX idx_photos_taken     ON photos(taken_at DESC);
CREATE INDEX idx_photos_published ON photos(published);

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL                 -- normalized: lowercase, no '#', [a-z0-9-]
);

CREATE TABLE photo_tags (
  photo_id TEXT    NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (photo_id, tag_id)
);
CREATE INDEX idx_phototags_tag ON photo_tags(tag_id);

-- WebAuthn
CREATE TABLE credentials (
  id           TEXT PRIMARY KEY,            -- base64url credential ID
  public_key   BLOB NOT NULL,
  counter      INTEGER NOT NULL,
  transports   TEXT,                        -- JSON array
  device_label TEXT,
  created_at   INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE TABLE auth_challenges (
  id         TEXT PRIMARY KEY,              -- temp id stored in short-lived cookie
  challenge  TEXT NOT NULL,
  kind       TEXT NOT NULL,                 -- 'register' | 'authenticate'
  expires_at INTEGER NOT NULL
);
```

### R2 key convention
```
photos/<id>/original.<ext>     # untouched upload (post-HEIC-conversion)
photos/<id>/large.webp         # ~1600px long edge, quality ~82
photos/<id>/thumb.webp         # ~500px long edge, quality ~72
```
Public URL: `https://cdn.gallery.mataev.no/photos/<id>/large.webp`.

---

## 4. Upload Pipeline

Heavy work runs **client-side** in the admin browser (keeps the Worker light and handles HEIC without WASM on the edge):

1. Admin drops files. For each:
   - If HEIC/HEIF → convert to JPEG via `heic2any`.
   - Extract **EXIF** via `exifr`: make, model, lensModel, focalLength, fNumber, exposureTime, iso, width/height, DateTimeOriginal, colorSpace, GPS lat/lon/alt.
   - Generate WebP **derivatives** via `<canvas>`: `large` (~1600w), `thumb` (~500w).
   - Compute **thumbhash** from a tiny canvas sample.
   - Show a per-photo form: caption, tags (`#a #b` → chips), location (auto-filled, editable), date (auto, editable), publish toggle.
2. On submit, client uploads `original + large + thumb` to R2 through a **protected admin route** (session-verified), and posts the metadata JSON.
3. Server:
   - If `gps_lat/lon` present and `place` not manually set → **reverse-geocode** via BigDataCloud (`/data/reverse-geocode-client?latitude=..&longitude=..`), store `place`, `country`, `country_code`.
   - Normalize tags (lowercase, strip `#`), upsert into `tags`, link `photo_tags`.
   - Insert `photos` row. Return the created record.

**Validation:** type allowlist (`image/jpeg|png|webp|heic|heif`), per-file size cap (e.g. 30 MB original), max dimensions sanity check.

---

## 5. Authentication — Passkey (WebAuthn)

- Library: `@simplewebauthn/server` (verify on Worker via WebCrypto) + `@simplewebauthn/browser`. RP ID = `gallery.mataev.no`, origin = `https://gallery.mataev.no`.
- **Enrollment** (`/admin`, first run): requires the one-time `ADMIN_ENROLL_CODE` secret (set by owner via `wrangler secret put`). After ≥1 credential exists, further enrollment requires an existing authenticated session. Stores credential in `credentials`.
- **Login:** passkey assertion → server verifies signature + counter → issues a signed **httpOnly session cookie** (HMAC/JWT with `SESSION_SECRET`; `Secure`, `SameSite=Lax`, ~30-day sliding expiry).
- **Protection:** middleware verifies the session cookie for all `/admin/*` (pages) and `/api/admin/*` (mutations). Mutations also check `Origin`/`Sec-Fetch-Site` for CSRF defense.
- Owner enrolls their own passkey on their own device; synced across iPhone + Mac via iCloud Keychain. No password is created or stored by the app.

---

## 6. Public Site

### Design language — "Mosaic Noir"
- Background `#0b0d10` (near-black, faint blue cast); text `#E8EDF5`; muted `#5a6478`; accent aurora-cyan `#5BC0EB` (amber `#F4A261` secondary). Hairlines `#161c28`.
- Type: monospace for labels/meta/UI, a serif (Georgia/Fraunces) for the editorial photo caption. Generous letter-spacing on the wordmark.
- Wordmark: flat `MATAEV` + a single cyan dot + right-aligned mono meta (`PHOTOGRAPHY — NO`). **No circular emblem.**
- Tags as an **editorial text-index** (underlined active, count as small superscript) — **not pills**.

### Routes
- `/` — **justified-rows mosaic** (uncropped, true aspect ratios from stored `aspect`, generous gaps ~12px, thumbhash blur-up, lazy-load). Hover = lift + place/index peek + thin cyan rule. Tag filter via the text-index (`/` shows All).
- `/t/<tag>` — tag-filtered gallery.
- `/p/<id>` — **photo detail**: an *intercepting route* renders it as a modal overlay over the grid; direct load / share renders the standalone page (for SEO + OG). Layout: large uncropped image with a subtle film-rebate frame; **editorial plate below** (serif caption; single inline exposure strip `CAMERA · LENS · FOCAL · ƒ · SHUTTER · ISO · W×H · BYTES · DATE` with ƒ/shutter/ISO in cyan; tags); compact **map chip** (MapTiler dark static + cyan pin + 🇳🇴 flag + place + coords); **filmstrip** of neighbours for nav (current = cyan outline; ←/→/swipe). Missing fields hide.
- Footer (every page): links to `mataev.no`, GitHub (`github.com/Blal95`), `bilal@mataev.no`.

### Layout engine
Justified rows computed from each photo's stored `aspect` (no image load needed → zero CLS). A row targets a height; widths derive from aspect ratios so the row fills the container edge-to-edge with no cropping. Last row left-aligned at natural height.

### Performance
- Grid uses `thumb`; detail uses `large`; `original` available on demand.
- Plain `<img>` with explicit `width`/`height` (from DB) + `srcset` (thumb/large) + `loading="lazy"` + thumbhash placeholder. No runtime image optimizer (avoids OpenNext optimizer cost).
- Images immutable-cached on `cdn.gallery.mataev.no`. API responses cached with revalidation.

---

## 7. Admin

- `/admin`:
  - **Unauthenticated:** "Sign in with passkey" (Face/Touch ID). First-run shows an enroll panel requiring `ADMIN_ENROLL_CODE`.
  - **Authenticated dashboard:**
    - **Upload** — multi-file drag-drop; per-photo caption + tags + auto location/date (editable); publish.
    - **Manage** — list/grid of photos; edit caption/tags/location/published; **delete** (explicit confirm; removes D1 row + all three R2 objects). Optional drag-reorder (`sort_index`).
- Admin mutation routes under `/api/admin/*`; auth routes under `/api/auth/*`.

> Deletion is owner-only, behind passkey + an explicit confirm dialog, and operates on the owner's own content.

---

## 8. Public API Contract

`GET /api/photos` (optionally `?tag=<name>`):
```jsonc
{
  "photos": [
    {
      "id": "01J...",
      "slug": "blue-hour-fjord",
      "url": {
        "thumb":    "https://cdn.gallery.mataev.no/photos/01J.../thumb.webp",
        "large":    "https://cdn.gallery.mataev.no/photos/01J.../large.webp",
        "original": "https://cdn.gallery.mataev.no/photos/01J.../original.jpg"
      },
      "width": 6000, "height": 4000, "aspect": 1.5,
      "thumbhash": "1QcSHQRnh493V4dIh4eXh1h4kJUI",
      "caption": "Blue hour over the fjord — the water went completely still.",
      "takenAt": 1755112440000,
      "place": "Lofoten", "country": "Norway", "countryCode": "NO",
      "lat": 68.21, "lon": 13.62,
      "camera": "Sony α7 IV", "lens": "FE 24-70 GM",
      "focal": 35, "fNumber": 2.8, "exposure": 0.004, "iso": 100,
      "bytes": 8810000, "format": "jpeg",
      "tags": ["norway", "lofoten", "bluehour", "film"]
    }
  ],
  "tags": [ { "name": "norway", "count": 24 }, { "name": "lofoten", "count": 8 } ]
}
```
- `GET /api/photos/<id>` — single photo (same shape, one object).
- **Caching:** `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`; revalidated on admin mutation (purge/version).
- **CORS:** allow `https://mataev.no`, `https://www.mataev.no`, `http://localhost:3000`.

**Portfolio consumption (separate change in `Mataev.no`, documented here):** its `/api/gallery` route fetches `https://gallery.mataev.no/api/photos`, maps each to the existing `GalleryImage` (`url` = `url.large`, `title` = caption, `alt` = caption). Richer fields available if the 3D gallery wants them later.

---

## 9. Security & Privacy

- Admin pages + mutations gated by verified passkey session; mutations also enforce same-site `Origin`.
- Upload type allowlist + size cap; filenames are server-generated (no path traversal).
- GPS coordinates are shown publicly **by explicit owner choice**. (If ever reconsidered, hiding is a single output toggle.)
- Secrets (`SESSION_SECRET`, `ADMIN_ENROLL_CODE`, MapTiler key) set by the owner via `wrangler secret put` / `.dev.vars`; never committed, never seen by the assistant. MapTiler public token is domain-restricted.
- R2 originals/derivatives are public (meant to be viewed) via the cdn domain; mutations require auth.

---

## 10. Environment & Setup Checklist (owner tasks)

1. `wrangler r2 bucket create gallery-photos`; attach custom domain `cdn.gallery.mataev.no`.
2. `wrangler d1 create gallery` → paste `database_id` into `wrangler.toml`; run migrations.
3. `wrangler secret put SESSION_SECRET` (random 32+ bytes).
4. `wrangler secret put ADMIN_ENROLL_CODE` (one-time enroll code).
5. Create MapTiler account → domain-restricted key → `NEXT_PUBLIC_MAPTILER_KEY` (`.dev.vars` + Cloudflare var).
6. DNS: `gallery.mataev.no` → worker; `cdn.gallery.mataev.no` → R2.
7. Deploy, open `/admin`, enroll passkey with the code.

---

## 11. Project Structure (proposed)

```
Mataev-Gallery/
  src/
    app/
      (public)/page.tsx              # mosaic grid
      (public)/t/[tag]/page.tsx
      (public)/p/[id]/page.tsx       # standalone detail
      @modal/(.)p/[id]/page.tsx      # intercepting modal
      admin/page.tsx                 # login + dashboard
      api/photos/route.ts            # public API (list)
      api/photos/[id]/route.ts       # public API (single)
      api/admin/upload/route.ts      # protected
      api/admin/photos/[id]/route.ts # protected update/delete
      api/auth/**                    # webauthn challenge/verify/logout
    components/ (grid, justified layout, detail plate, filmstrip, map chip, admin/*)
    lib/ (db, r2, exif-format, geocode, tags, session, webauthn, thumbhash, cn)
    config/ (site links, tokens)
    middleware.ts                    # admin session gate
  migrations/0001_init.sql
  wrangler.toml
  docs/superpowers/specs/2026-05-30-gallery-mataev-design.md
```

---

## 12. Future / Optional
- Dynamic OG image per photo (`/og/<id>`); v1 uses `large` as `og:image`.
- BlurHash↔thumbhash choice already settled (thumbhash).
- Manual album grouping beyond tags.
- Bilingual chrome (nb/en) if desired later.
- Download original button (currently view-only).

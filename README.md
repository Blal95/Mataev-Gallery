# MATAEV Gallery

A standalone photography platform — and the **public photo API** behind it — built
by Bilal R. Mataev. Live at **[gallery.mataev.no](https://gallery.mataev.no)**.

It's both a site you can browse and an API other apps consume. Notably, the
explorable 3D portfolio at **[mataev.no](https://mataev.no)** pulls its in-cabin
photo wall straight from this API (see [Consumers](#consumers)).

## Stack

- **Next.js** (App Router) deployed on **Cloudflare Workers** via `@opennextjs/cloudflare`
- **D1** (SQLite) for photo metadata — EXIF, place/coords, tags
- **R2** for image storage (original / large / thumb derivatives), served via CDN
- **WebAuthn** (passkeys, `@simplewebauthn`) for admin auth
- EXIF parsing (`exifr`), HEIC conversion, thumbhash placeholders

## Public API

Base: `https://gallery.mataev.no`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/photos` | List published photos. Query: `?tag=`, `?limit=`, `?offset=`. |
| `GET` | `/api/photos/:id` | Single photo + neighbours (for prev/next nav). |

CORS is restricted to an allowlist (`ALLOWED_ORIGINS`), which includes
`mataev.no`. Public responses are cached at the edge.

### `GET /api/photos` (shape, subset)

```jsonc
{
  "photos": [
    {
      "slug": "white-nights",
      "url": { "thumb": "…", "large": "…", "original": "…" },
      "caption": "…",
      "width": 1600, "height": 2400,
      "place": "Lofoten", "country": "Norway", "countryCode": "NO",
      "lat": 68.21, "lon": 13.62,
      "camera": "…", "lens": "…", "focal": "…",
      "fNumber": 2.8, "exposure": "1/250", "iso": 200,
      "takenAt": 1717000000000,
      "tags": ["winter", "aurora"]
    }
  ],
  "tags": [{ "name": "winter", "count": 4 }],
  "nextOffset": 24
}
```

## Consumers

- **mataev.no** — the 3D cabin's photo wall + gallery panel fetch this API.
  Its `/api/gallery` route proxies `GET https://gallery.mataev.no/api/photos`
  (override in dev with `GALLERY_API_URL`), maps it to the wall's shape, and
  caches for 5 min. One backend, two front ends.

## Development

```bash
npm run dev              # next dev
npm run typecheck        # tsc --noEmit
npm run test             # vitest
npm run db:migrate:local # apply D1 migrations locally
npm run preview          # opennextjs-cloudflare build + preview
npm run deploy           # build + wrangler deploy
```

Maps on the photo detail page use **Leaflet + CARTO** free dark raster tiles —
no API key required.

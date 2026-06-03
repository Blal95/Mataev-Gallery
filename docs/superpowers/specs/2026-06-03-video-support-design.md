# Video Support — Design Spec
Date: 2026-06-03

## Overview

Add video upload and playback to the gallery. Videos integrate as first-class citizens: same grid, same detail view, same tags, atlas, and info panel as photos. The only visible difference is a play badge on tiles and a `<video>` player in the detail view.

## Approach

Extend the existing `photos` table with two columns (`media_type`, `duration`). All existing queries, pagination, tag filtering, and atlas mapping work unchanged. Videos reuse the same R2 key pattern — poster frames are stored as `large.webp` / `thumb.webp`, the raw video as `original.{ext}`.

## Data Layer

### Migration: `migrations/0003_video.sql`
```sql
ALTER TABLE photos ADD COLUMN media_type TEXT NOT NULL DEFAULT 'photo';
ALTER TABLE photos ADD COLUMN duration    REAL;  -- seconds, null for photos
```

### Type changes
- `PhotoRow`: add `media_type: string`, `duration: number | null`
- `PhotoDTO`: add `mediaType: 'photo' | 'video'`, `duration: number | null`
- `serialize.ts` (`toDTO`): map both new fields

## Upload Pipeline

### File picker
Accept: `image/*,.heic,.heif,video/mp4,video/quicktime,video/webm`

Detect by `file.type.startsWith('video/')`.

### New: `src/lib/client/poster.ts`
- Load file into offscreen `<video>` element (no DOM append needed — just `URL.createObjectURL`)
- Wait for `loadedmetadata`, seek to `0.5s` (or `0` if duration < 0.5s)
- Wait for `seeked`, draw to `<canvas>`, export WebP blob
- Return `{ blob, width, height, duration }`
- Feed blob through existing `deriveImages` + `computeThumbhash` pipeline

### `Uploader.tsx` changes
- Detect video files, add `mediaType: 'photo' | 'video'` and `duration: number | null` to `Pending`
- For video: skip `extractExif`, use `file.lastModified` for `takenAt`, call `poster.ts`
- Preview: `<video>` element instead of `<img>`
- Footer row: show duration (formatted as `0:12`) instead of camera model
- Upload: send poster blobs as `large`/`thumb`, raw video as `original`, include `mediaType` + `duration` in meta JSON

### Upload route (`/api/admin/upload`)
- Size limit raised from 30MB → **100MB** (single constant `MAX_BYTES`)
- Accept `mediaType` and `duration` from meta
- Write `media_type` and `duration` into the DB row
- No other changes — same R2 writes, same geocode logic

## UI

### `PhotoTile.tsx`
- If `mediaType === 'video'`: render same tile layout + play triangle badge
- Badge: absolute top-right, `▶` in amber/70, same mix-blend-screen + drop-shadow treatment as frame number
- Poster frame is already in `photo.url.thumb` — no change to image rendering

### `PhotoDetail.tsx`
- Branch on `mediaType`:
  - `'photo'`: existing `<img>` (unchanged)
  - `'video'`: `<video src={photo.url.original} loop playsInline muted className={...}>` with same sizing/transition classes
- Autoplay logic (video only): `useRef` on `<video>`, `onCanPlay` callback sets a flag, `useEffect` fires `setTimeout(1000, () => video.play())` once flag is true. Cleared on unmount/nav.
- Click on video area: toggle play/pause (same `onClick` handler as photo's info toggle, but for video it plays/pauses instead)
- Info panel, filmstrip, atlas, comments — **no changes**

### `ExposureStrip.tsx`
- Already guards each field with null checks — works fine for videos (all camera fields are null). No changes needed.

## Expandability Notes

- `MAX_BYTES` constant in upload route — bump to 500MB+ when needed
- `duration` column ready for longer videos
- Poster extraction in its own module — can swap for server-side ffmpeg later
- `media_type` is a plain string not an enum — adding `'gif'` or other types requires no migration

## Out of Scope

- Transcoding / adaptive bitrate (HLS)
- Cloudflare Stream integration
- Video-specific EXIF/metadata (codec, bitrate)
- Edit form changes for videos (same form works)

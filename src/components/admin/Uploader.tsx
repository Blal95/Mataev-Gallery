"use client"

import { useEffect, useRef, useState } from "react"
import { toJpegIfHeic } from "@/lib/client/heic"
import { extractExif } from "@/lib/client/exif"
import { deriveImages } from "@/lib/client/derive"
import { computeThumbhash } from "@/lib/client/thumbhash"
import { extractPoster } from "@/lib/client/poster"
import { readVideoMeta } from "@/lib/client/videoGps"
import { LocationSearchInput, type PickedLocation } from "./LocationSearchInput"

interface Pending {
  file: File
  preview: string          // object URL — for <img> (photos) or <video> (videos)
  caption: string
  tags: string
  exif: Awaited<ReturnType<typeof extractExif>> | null  // GPS/date-only shape for videos
  place: string
  country: string          // from reverse geocode; kept separate so flags work
  countryCode: string
  pickedLat: number | null // coords chosen via search — EXIF GPS wins when present
  pickedLon: number | null
  address: string | null   // full address line of a picked search hit
  status: "ready" | "uploading" | "done" | "error"
  errorMsg: string | null
  mediaType: "photo" | "video"
  duration: number | null  // seconds; null for photos
  posterBlob: Blob | null  // full-res poster frame for videos; null for photos
  posterUrl: string | null // object URL for video thumbnail preview
}

export function Uploader({ onUploaded }: { onUploaded: () => void }) {
  const [items, setItems] = useState<Pending[]>([])
  const itemsRef = useRef<Pending[]>([])
  useEffect(() => { itemsRef.current = items }, [items])
  useEffect(() => () => {
    itemsRef.current.forEach((it) => {
      URL.revokeObjectURL(it.preview)
      if (it.posterUrl) URL.revokeObjectURL(it.posterUrl)
    })
  }, [])

  const MAX_ITEMS = 10

  /** Reverse geocode in the background and prefill empty location fields. */
  function prefillPlace(idx: number, lat: number, lon: number) {
    fetch(`/api/admin/geocode?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((data) => {
        const typed = data as { result?: { place?: string | null; country?: string | null; countryCode?: string | null } }
        const r = typed.result
        if (!r) return
        setItems((prev) => prev.map((it, i) => i === idx ? {
          ...it,
          place: it.place || r.place || "",
          country: r.country ?? "",
          countryCode: r.countryCode ?? "",
        } : it))
      })
      .catch(() => {})
  }

  async function onFiles(files: FileList | null) {
    if (!files) return
    const slots = MAX_ITEMS - itemsRef.current.length
    if (slots <= 0) return
    const incoming = Array.from(files).slice(0, slots)
    let nextIdx = itemsRef.current.length
    for (const raw of incoming) {
      const isVideo = raw.type.startsWith("video/")
      const idx = nextIdx++

      if (isVideo) {
        // Add placeholder immediately so the user sees something
        setItems((prev) => [...prev, {
          file: raw, preview: URL.createObjectURL(raw), caption: "", tags: "",
          exif: null, place: "", country: "", countryCode: "", pickedLat: null, pickedLon: null, address: null, status: "ready", errorMsg: null,
          mediaType: "video", duration: null, posterBlob: null, posterUrl: null,
        }])
        // Extract poster + duration in the background
        extractPoster(raw)
          .then(({ blob, duration }) => {
            const posterUrl = URL.createObjectURL(blob)
            setItems((prev) => prev.map((it, i) =>
              i === idx ? { ...it, duration, posterBlob: blob, posterUrl } : it,
            ))
          })
          .catch(() => {})
        // QuickTime location + capture time (exifr can't read video containers)
        readVideoMeta(raw)
          .then(({ gps, takenAt }) => {
            if (!gps && !takenAt) return
            setItems((prev) => prev.map((it, i) => i === idx ? {
              ...it,
              exif: {
                takenAt, cameraMake: null, cameraModel: null, lens: null,
                focal: null, fNumber: null, exposure: null, iso: null,
                lat: gps?.lat ?? null, lon: gps?.lon ?? null, alt: gps?.alt ?? null, colorSpace: null,
              },
            } : it))
            if (gps) prefillPlace(idx, gps.lat, gps.lon)
          })
          .catch(() => {})
      } else {
        const exif = await extractExif(raw)
        let file: File
        try {
          file = await toJpegIfHeic(raw)
        } catch (err) {
          const msg = err instanceof Error ? (err.message || err.name) : String(err)
          setItems((prev) => [...prev, {
            file: raw, preview: URL.createObjectURL(raw), caption: "", tags: "",
            exif, place: "", country: "", countryCode: "", pickedLat: null, pickedLon: null, address: null, status: "error", errorMsg: msg,
            mediaType: "photo", duration: null, posterBlob: null, posterUrl: null,
          }])
          continue
        }
        setItems((prev) => [...prev, {
          file, preview: URL.createObjectURL(file), caption: "", tags: "",
          exif, place: "", country: "", countryCode: "", pickedLat: null, pickedLon: null, address: null, status: "ready", errorMsg: null,
          mediaType: "photo", duration: null, posterBlob: null, posterUrl: null,
        }])
        if (exif.lat != null && exif.lon != null) prefillPlace(idx, exif.lat, exif.lon)
      }
    }
  }

  function patch(i: number, p: Partial<Pending>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)))
  }

  function locationOf(it: Pending): PickedLocation {
    return {
      place: it.place,
      country: it.country,
      countryCode: it.countryCode,
      lat: it.exif?.lat ?? it.pickedLat,
      lon: it.exif?.lon ?? it.pickedLon,
      address: it.address,
    }
  }

  function setLocation(i: number, v: PickedLocation) {
    patch(i, {
      place: v.place,
      country: v.country,
      countryCode: v.countryCode,
      pickedLat: v.lat,
      pickedLon: v.lon,
      address: v.address,
    })
  }

  /** Copy one item's location onto every other pending item (same shoot). */
  function applyLocationToAll(i: number) {
    const src = itemsRef.current[i]
    if (!src) return
    const loc = locationOf(src)
    setItems((prev) => prev.map((it, idx) => {
      if (idx === i || it.status === "done" || it.status === "uploading") return it
      return {
        ...it,
        place: loc.place,
        country: loc.country,
        countryCode: loc.countryCode,
        address: loc.address,
        // own EXIF GPS stays authoritative; copied coords only fill gaps
        pickedLat: it.exif?.lat != null ? it.pickedLat : loc.lat,
        pickedLon: it.exif?.lon != null ? it.pickedLon : loc.lon,
      }
    }))
  }

  async function upload(i: number) {
    const it = items[i]
    patch(i, { status: "uploading" })
    try {
      let large: Blob, thumb: Blob, width: number, height: number, thumbhash: string

      let originalFile: File

      if (it.mediaType === "video") {
        // Use the cached poster blob; fall back to re-extracting if somehow missing
        const posterBlob = it.posterBlob ?? (await extractPoster(it.file)).blob
        const posterFile = new File([posterBlob], "poster.webp", { type: "image/webp" })
        const derived = await deriveImages(posterFile)
        large = derived.large; thumb = derived.thumb
        width = derived.width; height = derived.height
        thumbhash = await computeThumbhash(posterFile)
        originalFile = it.file
      } else {
        const derived = await deriveImages(it.file)
        large = derived.large; thumb = derived.thumb
        width = derived.width; height = derived.height
        thumbhash = await computeThumbhash(it.file)
        // Large originals (ProRAW, high-res HEIC) would cause 503 in the Worker.
        // Use the 2400px archive WebP instead — still high quality but fits in memory.
        originalFile = derived.archive
          ? new File([derived.archive], "original.webp", { type: "image/webp" })
          : it.file
      }

      const isArchived = originalFile !== it.file
      const ext = it.mediaType === "video"
        ? (it.file.name.split(".").pop() || "mp4").toLowerCase()
        : isArchived ? "webp" : (it.file.name.split(".").pop() || "jpg").toLowerCase()

      const meta = {
        caption: it.caption,
        tags: it.tags,
        takenAt: it.exif?.takenAt ?? it.file.lastModified,
        width, height,
        bytes: originalFile.size,
        format: it.mediaType === "video" ? ext : (isArchived ? "webp" : ext === "png" ? "png" : ext === "webp" ? "webp" : "jpeg"),
        ext,
        colorSpace: it.exif?.colorSpace ?? null,
        cameraMake: it.exif?.cameraMake ?? null,
        cameraModel: it.exif?.cameraModel ?? null,
        lens: it.exif?.lens ?? null,
        focal: it.exif?.focal ?? null,
        fNumber: it.exif?.fNumber ?? null,
        exposure: it.exif?.exposure ?? null,
        iso: it.exif?.iso ?? null,
        lat: it.exif?.lat ?? it.pickedLat,
        lon: it.exif?.lon ?? it.pickedLon,
        alt: it.exif?.alt ?? null,
        place: it.place || null,
        country: it.country || null,
        countryCode: it.countryCode || null,
        thumbhash,
        mediaType: it.mediaType,
        duration: it.duration,
        originalContentType: originalFile.type || "application/octet-stream",
      }

      const fd = new FormData()
      fd.append("large", new File([large], "large.webp", { type: "image/webp" }))
      fd.append("thumb", new File([thumb], "thumb.webp", { type: "image/webp" }))
      fd.append("meta", JSON.stringify(meta))
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        throw new Error(`POST ${res.status}: ${body.slice(0, 120)}`)
      }
      const { id, uploadUrl } = await res.json() as { id: string; uploadUrl?: string | null }

      const contentType = originalFile.type || "application/octet-stream"

      // Preferred path: PUT the original straight to R2 via the presigned URL,
      // bypassing the Worker's request-size/CPU limits. Fall back to the Worker
      // route if no URL was issued or the direct upload fails (e.g. R2 CORS not
      // yet configured) — that path still works for files under the 100MB limit.
      let uploaded = false
      if (uploadUrl) {
        try {
          const r2Res = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
            body: originalFile,
          })
          uploaded = r2Res.ok
        } catch {
          uploaded = false
        }
      }
      if (!uploaded) {
        const putRes = await fetch(`/api/admin/upload/${id}/original`, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: originalFile,
        })
        if (!putRes.ok) {
          const body = await putRes.text().catch(() => "")
          throw new Error(`PUT ${putRes.status}: ${body.slice(0, 120)}`)
        }
      }
      patch(i, { status: "done", errorMsg: null }); onUploaded()
    } catch (err) {
      const msg = err instanceof Error
        ? (err.message || err.name || "unknown client error")
        : String(err)
      patch(i, { status: "error", errorMsg: msg })
    }
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
        <label className={`flex h-28 flex-1 cursor-pointer items-center justify-center rounded-lg border border-dashed font-mono text-[11px] uppercase tracking-[0.15em] text-muted ${items.length >= MAX_ITEMS ? "border-line opacity-40 cursor-not-allowed" : "border-line-2 hover:border-cyan/40"}`}>
          {items.length >= MAX_ITEMS ? `Max ${MAX_ITEMS} items` : `Drop or choose photos & videos (max ${MAX_ITEMS})`}
          <input
            type="file"
            multiple
            disabled={items.length >= MAX_ITEMS}
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
              <video src={it.preview} poster={it.posterUrl ?? undefined} className="h-24 w-24 shrink-0 rounded object-cover" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.preview} alt="" className="h-24 w-24 shrink-0 rounded object-cover" />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <input value={it.caption} onChange={(e) => patch(i, { caption: e.target.value })} placeholder="Caption" className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 text-sm text-text outline-none focus:border-cyan/50" />
              <input value={it.tags} onChange={(e) => patch(i, { tags: e.target.value })} placeholder="#tags #separated" className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-cyan/50" />
              <LocationSearchInput value={locationOf(it)} onChange={(v) => setLocation(i, v)} />
              {items.length > 1 && (it.place || it.country || it.exif?.lat != null || it.pickedLat != null) && (
                <button
                  type="button"
                  onClick={() => applyLocationToAll(i)}
                  className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-2 hover:text-amber"
                >
                  Apply location to all ↓
                </button>
              )}
              <div className="flex items-center gap-3">
                <button onClick={() => upload(i)} disabled={it.status === "uploading" || it.status === "done"} className="rounded border border-cyan/40 bg-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan disabled:opacity-50">
                  {it.status === "done" ? "Posted ✓" : it.status === "uploading" ? "Posting…" : "Post"}
                </button>
                {it.status === "error" && <span className="font-mono text-[10px] text-amber" title={it.errorMsg ?? undefined}>Failed {it.errorMsg ? `(${it.errorMsg})` : ""}</span>}
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
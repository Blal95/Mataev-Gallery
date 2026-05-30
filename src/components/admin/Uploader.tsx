"use client"

import { useEffect, useState } from "react"
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

  useEffect(() => () => { items.forEach((it) => URL.revokeObjectURL(it.preview)) }, [])

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

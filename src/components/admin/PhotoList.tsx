"use client"

import { useEffect, useState } from "react"
import { EditForm } from "./EditForm"
import { BulkTagger } from "./BulkTagger"
import type { PhotoDTO, PhotosResponse } from "@/types/photo"

export function PhotoList({ reloadKey }: { reloadKey: number }) {
  const [photos, setPhotos] = useState<PhotoDTO[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [bulkMode, setBulkMode] = useState(false)

  async function load() {
    const data = (await (await fetch("/api/photos")).json()) as PhotosResponse
    setPhotos(data.photos)
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [reloadKey])

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{photos.length} photos</p>
        <button
          onClick={() => setBulkMode(v => !v)}
          className={`font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${bulkMode ? "text-cyan" : "text-muted hover:text-text"}`}
        >
          Bulk tag
        </button>
      </div>
      {bulkMode && <BulkTagger photos={photos} />}
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

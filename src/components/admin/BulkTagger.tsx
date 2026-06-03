"use client"

import { useState } from "react"
import type { PhotoDTO } from "@/types/photo"

export function BulkTagger({ photos }: { photos: PhotoDTO[] }) {
  const [tag, setTag] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const tagName = tag.replace(/^#/, "").trim().toLowerCase()

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(photos.map(p => p.id)))
  }

  function clearAll() {
    setSelected(new Set())
  }

  async function apply() {
    if (!tagName || selected.size === 0) return
    setBusy(true)
    await Promise.all([...selected].map(id => {
      const photo = photos.find(p => p.id === id)!
      const existingTags = photo.tags.map(t => `#${t}`).join(" ")
      const newTags = existingTags ? `${existingTags} #${tagName}` : `#${tagName}`
      return fetch(`/api/admin/photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags }),
      })
    }))
    setBusy(false)
    setDone(true)
    setTimeout(() => setDone(false), 2000)
    setSelected(new Set())
    setTag("")
  }

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Bulk tag</p>
      <div className="flex gap-2">
        <input
          value={tag}
          onChange={e => setTag(e.target.value)}
          placeholder="#tag"
          className="flex-1 rounded border border-line-2 bg-bg-2 px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-cyan/50"
        />
        <button
          onClick={apply}
          disabled={busy || !tagName || selected.size === 0}
          className="rounded border border-cyan/40 bg-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan disabled:opacity-40"
        >
          {done ? "Done ✓" : busy ? "…" : `Apply to ${selected.size}`}
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={selectAll} className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted hover:text-text">Select all</button>
        <button onClick={clearAll} className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted hover:text-text">Clear</button>
      </div>
      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
        {photos.map(p => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={`relative aspect-square overflow-hidden rounded border transition-colors ${selected.has(p.id) ? "border-cyan/60 ring-1 ring-cyan/40" : "border-line hover:border-line-2"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url.thumb} alt="" className="h-full w-full object-cover" />
            {selected.has(p.id) && (
              <div className="absolute inset-0 flex items-center justify-center bg-cyan/20">
                <span className="text-[16px]">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

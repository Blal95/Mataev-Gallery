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

"use client"

import { useEffect, useState } from "react"
import type { PhotoDTO } from "@/types/photo"
import { LocationPicker, type LocationValue } from "./LocationPicker"
import type { CommentDTO } from "@/lib/comments"

export function EditForm({ photo, onSaved, onDeleted }: { photo: PhotoDTO; onSaved: () => void; onDeleted: () => void }) {
  const [caption, setCaption] = useState(photo.caption ?? "")
  const [tags, setTags] = useState(photo.tags.map((t) => `#${t}`).join(" "))
  const [published, setPublished] = useState(photo.published)
  const [location, setLocation] = useState<LocationValue>({
    lat: photo.lat,
    lon: photo.lon,
    place: photo.place ?? "",
    country: photo.country ?? "",
    countryCode: photo.countryCode ?? "",
  })
  const [busy, setBusy] = useState(false)
  const [comments, setComments] = useState<CommentDTO[]>([])

  useEffect(() => {
    fetch(`/api/photos/${photo.id}/comments`)
      .then((r) => r.json())
      .then((d) => setComments((d as { comments: CommentDTO[] }).comments))
      .catch(() => {})
  }, [photo.id])

  async function removeComment(id: string) {
    await fetch(`/api/admin/comments/${id}`, { method: "DELETE" })
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  async function save() {
    setBusy(true)
    await fetch(`/api/admin/photos/${photo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption,
        tags,
        place: location.place || null,
        country: location.country || null,
        countryCode: location.countryCode || null,
        lat: location.lat,
        lon: location.lon,
        published: published ? 1 : 0,
      }),
    })
    setBusy(false)
    onSaved()
  }
  async function remove() {
    if (!confirm("Delete this photo permanently? This removes it from the gallery and storage.")) return
    setBusy(true)
    await fetch(`/api/admin/photos/${photo.id}`, { method: "DELETE" })
    setBusy(false)
    onDeleted()
  }

  return (
    <div className="space-y-2 rounded-lg border border-line p-3">
      <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 text-sm text-text outline-none focus:border-cyan/50" />
      <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-cyan/50" />
      <LocationPicker value={location} onChange={setLocation} />
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={busy} className="rounded border border-cyan/40 bg-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan disabled:opacity-50">Save</button>
        <button
          type="button"
          onClick={() => setPublished((v) => !v)}
          className={`rounded border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${published ? "border-amber/40 bg-amber/10 text-amber" : "border-line-2 text-muted hover:border-line-2 hover:text-muted-2"}`}
        >
          {published ? "Published" : "Draft"}
        </button>
        <button onClick={remove} disabled={busy} className="ml-auto rounded border border-danger/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber hover:bg-amber/10">Delete</button>
      </div>
      {comments.length > 0 && (
        <div className="space-y-1 border-t border-line pt-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted">{comments.length} comment{comments.length !== 1 ? "s" : ""}</p>
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 rounded border border-line p-2">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-[10px] text-cyan">{c.author}</span>
                <p className="text-xs text-text">{c.body}</p>
              </div>
              <button
                onClick={() => removeComment(c.id)}
                className="shrink-0 rounded border border-danger/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-amber hover:bg-amber/10"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import type { PhotoDTO } from "@/types/photo"

type Mode = "tag" | "location" | "draft" | "delete"

const MODES: { key: Mode; label: string }[] = [
  { key: "tag", label: "Tag" },
  { key: "location", label: "Location" },
  { key: "draft", label: "Draft" },
  { key: "delete", label: "Delete" },
]

export function BulkActions({ photos, onDone }: { photos: PhotoDTO[]; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>("tag")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle")
  const [confirmDelete, setConfirmDelete] = useState(false)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() { setSelected(new Set(photos.map(p => p.id))) }
  function clearAll() { setSelected(new Set()) }

  function flash(s: "done" | "error") {
    setStatus(s)
    setTimeout(() => setStatus("idle"), 2000)
  }

  async function applyTag() {
    const tag = input.replace(/^#/, "").trim().toLowerCase()
    if (!tag || selected.size === 0) return
    setBusy(true)
    try {
      await Promise.all([...selected].map(id => {
        const photo = photos.find(p => p.id === id)!
        const existing = photo.tags.map(t => `#${t}`).join(" ")
        const newTags = existing ? `${existing} #${tag}` : `#${tag}`
        return fetch(`/api/admin/photos/${id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: newTags }),
        })
      }))
      flash("done"); setInput(""); clearAll(); onDone()
    } catch { flash("error") }
    setBusy(false)
  }

  async function applyLocation() {
    const place = input.trim()
    if (!place || selected.size === 0) return
    setBusy(true)
    try {
      await Promise.all([...selected].map(id =>
        fetch(`/api/admin/photos/${id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ place }),
        })
      ))
      flash("done"); setInput(""); clearAll(); onDone()
    } catch { flash("error") }
    setBusy(false)
  }

  async function applyDraft(published: number) {
    if (selected.size === 0) return
    setBusy(true)
    try {
      await Promise.all([...selected].map(id =>
        fetch(`/api/admin/photos/${id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published }),
        })
      ))
      flash("done"); clearAll(); onDone()
    } catch { flash("error") }
    setBusy(false)
  }

  async function applyDelete() {
    if (selected.size === 0) return
    setBusy(true)
    try {
      await Promise.all([...selected].map(id =>
        fetch(`/api/admin/photos/${id}`, { method: "DELETE" })
      ))
      flash("done"); setConfirmDelete(false); clearAll(); onDone()
    } catch { flash("error") }
    setBusy(false)
  }

  const count = selected.size
  const btnBase = "rounded border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] disabled:opacity-40"
  const btnCyan = `${btnBase} border-cyan/40 bg-cyan/10 text-cyan`
  const btnAmber = `${btnBase} border-amber/40 bg-amber/10 text-amber`
  const btnRed = `${btnBase} border-red-400/40 bg-red-400/10 text-red-400`

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      {/* Mode tabs */}
      <div className="flex gap-1">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setInput(""); setConfirmDelete(false) }}
            className={`rounded px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${mode === m.key ? (m.key === "delete" ? "bg-red-400/15 text-red-400" : "bg-cyan/15 text-cyan") : "text-muted hover:text-text"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Action area */}
      <div className="flex items-center gap-2">
        {(mode === "tag" || mode === "location") && (
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") mode === "tag" ? applyTag() : applyLocation() }}
            placeholder={mode === "tag" ? "#tag" : "City, Country"}
            className="flex-1 rounded border border-line-2 bg-bg-2 px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-cyan/50"
          />
        )}

        {mode === "tag" && (
          <button onClick={applyTag} disabled={busy || !input.trim() || count === 0} className={btnCyan}>
            {status === "done" ? "Done ✓" : busy ? "…" : `Tag ${count}`}
          </button>
        )}

        {mode === "location" && (
          <button onClick={applyLocation} disabled={busy || !input.trim() || count === 0} className={btnCyan}>
            {status === "done" ? "Done ✓" : busy ? "…" : `Set ${count}`}
          </button>
        )}

        {mode === "draft" && (
          <div className="flex gap-2">
            <button onClick={() => applyDraft(0)} disabled={busy || count === 0} className={btnAmber}>
              {busy ? "…" : `Draft ${count}`}
            </button>
            <button onClick={() => applyDraft(1)} disabled={busy || count === 0} className={btnCyan}>
              {status === "done" ? "Done ✓" : busy ? "…" : `Publish ${count}`}
            </button>
          </div>
        )}

        {mode === "delete" && !confirmDelete && (
          <button onClick={() => setConfirmDelete(true)} disabled={count === 0} className={btnRed}>
            Delete {count}
          </button>
        )}

        {mode === "delete" && confirmDelete && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-red-400">Delete {count} permanently?</span>
            <button onClick={applyDelete} disabled={busy} className={btnRed}>
              {busy ? "…" : "Confirm"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="font-mono text-[10px] text-muted hover:text-text">
              Cancel
            </button>
          </div>
        )}

        {status === "error" && <span className="font-mono text-[10px] text-amber">Error</span>}
      </div>

      {/* Select all / clear */}
      <div className="flex gap-3">
        <button onClick={selectAll} className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted hover:text-text">Select all</button>
        <button onClick={clearAll} className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted hover:text-text">Clear</button>
        {count > 0 && <span className="font-mono text-[9px] text-cyan">{count} selected</span>}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto">
        {photos.map(p => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={`relative aspect-square overflow-hidden rounded border transition-colors ${selected.has(p.id) ? "border-cyan/60 ring-1 ring-cyan/40" : "border-line hover:border-line-2"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url.thumb} alt="" className="h-full w-full object-cover" />
            {!p.published && (
              <div className="absolute inset-x-0 bottom-0 bg-amber/80 py-0.5 text-center font-mono text-[7px] uppercase tracking-wider text-bg">
                Draft
              </div>
            )}
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

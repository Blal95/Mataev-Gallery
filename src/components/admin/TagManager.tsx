"use client"

import { useEffect, useState } from "react"

interface TagEntry { name: string; count: number }

export function TagManager() {
  const [tags, setTags] = useState<TagEntry[]>([])
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  async function load() {
    const data = await fetch("/api/admin/tags").then(r => r.json()) as { tags: TagEntry[] }
    setTags(data.tags)
  }

  useEffect(() => { if (open) void load() }, [open])

  async function remove(name: string) {
    setBusy(true)
    try {
      await fetch(`/api/admin/tags/${encodeURIComponent(name)}`, { method: "DELETE" })
      setTags(prev => prev.filter(t => t.name !== name))
      setConfirmDelete(null)
    } catch { /* ignore */ }
    setBusy(false)
  }

  return (
    <section className="space-y-2">
      <button
        onClick={() => setOpen(v => !v)}
        className={`font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${open ? "text-cyan" : "text-muted hover:text-text"}`}
      >
        Manage tags {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="rounded-lg border border-line p-3 space-y-2">
          {tags.length === 0 && (
            <p className="font-mono text-[10px] text-muted">No tags</p>
          )}
          {tags.map(t => (
            <div key={t.name} className="flex items-center gap-2">
              <span className="flex-1 font-mono text-xs text-text">#{t.name}</span>
              <span className="font-mono text-[9px] text-muted">{t.count}</span>
              {confirmDelete === t.name ? (
                <>
                  <span className="font-mono text-[9px] text-red-400">Remove from {t.count} photo{t.count !== 1 ? "s" : ""}?</span>
                  <button
                    onClick={() => remove(t.name)}
                    disabled={busy}
                    className="rounded border border-red-400/40 bg-red-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-red-400 disabled:opacity-40"
                  >
                    {busy ? "…" : "Yes"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="font-mono text-[9px] text-muted hover:text-text"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(t.name)}
                  className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted hover:text-red-400"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

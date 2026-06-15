"use client"

import { useEffect, useRef, useState } from "react"

interface TagEntry { name: string; count: number }
type Action = { type: "delete"; name: string } | { type: "rename"; name: string }

export function TagManager({ onChanged }: { onChanged?: () => void }) {
  const [tags, setTags] = useState<TagEntry[]>([])
  const [action, setAction] = useState<Action | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const renameInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const data = await fetch("/api/admin/tags").then(r => r.json()) as { tags: TagEntry[] }
    setTags(data.tags)
  }

  useEffect(() => { if (open) void load() }, [open])

  useEffect(() => {
    if (action?.type === "rename") renameInputRef.current?.focus()
  }, [action])

  function startRename(name: string) {
    setAction({ type: "rename", name })
    setRenameValue(name)
  }

  function cancel() { setAction(null); setRenameValue("") }

  async function remove(name: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(name)}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setTags(prev => prev.filter(t => t.name !== name))
      setAction(null)
      onChanged?.()
    } catch { /* ignore */ }
    setBusy(false)
  }

  async function rename(oldName: string) {
    const newName = renameValue.trim().toLowerCase().replace(/\s+/g, "-")
    if (!newName || newName === oldName) { cancel(); return }
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(oldName)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName }),
      })
      if (!res.ok) throw new Error()
      setTags(prev => prev.map(t => t.name === oldName ? { ...t, name: newName } : t))
      setAction(null)
      setRenameValue("")
      onChanged?.()
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
          {tags.map(t => {
            const isRenaming = action?.type === "rename" && action.name === t.name
            const isConfirmDelete = action?.type === "delete" && action.name === t.name

            return (
              <div key={t.name} className="flex items-center gap-2">
                {isRenaming ? (
                  <>
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") void rename(t.name)
                        if (e.key === "Escape") cancel()
                      }}
                      className="flex-1 rounded border border-cyan/40 bg-bg-2 px-2 py-0.5 font-mono text-xs text-text outline-none focus:border-cyan/70"
                    />
                    <button
                      onClick={() => rename(t.name)}
                      disabled={busy}
                      className="rounded border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-cyan disabled:opacity-40"
                    >
                      {busy ? "…" : "Save"}
                    </button>
                    <button onClick={cancel} className="font-mono text-[9px] text-muted hover:text-text">
                      Cancel
                    </button>
                  </>
                ) : isConfirmDelete ? (
                  <>
                    <span className="flex-1 font-mono text-xs text-text">#{t.name}</span>
                    <span className="font-mono text-[9px] text-red-400">Remove from {t.count} photo{t.count !== 1 ? "s" : ""}?</span>
                    <button
                      onClick={() => remove(t.name)}
                      disabled={busy}
                      className="rounded border border-red-400/40 bg-red-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-red-400 disabled:opacity-40"
                    >
                      {busy ? "…" : "Yes"}
                    </button>
                    <button onClick={cancel} className="font-mono text-[9px] text-muted hover:text-text">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-mono text-xs text-text">#{t.name}</span>
                    <span className="font-mono text-[9px] text-muted">{t.count}</span>
                    <button
                      onClick={() => startRename(t.name)}
                      className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted hover:text-cyan"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => setAction({ type: "delete", name: t.name })}
                      className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted hover:text-red-400"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

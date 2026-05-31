"use client"

import { useEffect, useState } from "react"

const SHORTCUTS = [
  { key: "← / →", desc: "Navigate" },
  { key: "Esc", desc: "Close" },
  { key: "?", desc: "Shortcuts" },
]

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Open on ? (Shift+/) — only when overlay itself is not already handling the key
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        setOpen((prev) => !prev)
        return
      }
      if (e.key === "Escape" && open) {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener("keydown", onKey, { capture: true })
    return () => window.removeEventListener("keydown", onKey, { capture: true })
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-[280px] rounded-[6px] border border-line-2 bg-bg-2 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
          Shortcuts
        </h2>
        <ul className="space-y-3">
          {SHORTCUTS.map(({ key, desc }) => (
            <li key={key} className="flex items-center justify-between gap-4">
              <kbd className="rounded-[3px] border border-line-2 bg-bg px-2 py-0.5 font-mono text-[11px] text-cyan">
                {key}
              </kbd>
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                {desc}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
          Press Esc or ? to dismiss
        </p>
      </div>
    </div>
  )
}

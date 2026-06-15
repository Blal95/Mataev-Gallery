"use client"

import { useEffect, useState } from "react"
import { Login } from "@/components/admin/Login"
import { Uploader } from "@/components/admin/Uploader"
import { PhotoList } from "@/components/admin/PhotoList"
import { TagManager } from "@/components/admin/TagManager"

interface StatusResponse { authed: boolean; enrolled: boolean }

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [enrolled, setEnrolled] = useState(false)
  const [reload, setReload] = useState(0)
  const [backfill, setBackfill] = useState<string | null>(null)

  async function runBackfill() {
    setBackfill("Running…")
    try {
      const res = await fetch("/api/admin/geocode", { method: "POST" })
      const d = await res.json() as { videosScanned: number; videosLocated: number; placesChecked: number; placesFilled: number }
      if (!res.ok) throw new Error()
      setBackfill(`Videos located ${d.videosLocated}/${d.videosScanned} · places filled ${d.placesFilled}/${d.placesChecked}`)
      setReload((n) => n + 1)
    } catch {
      setBackfill("Backfill failed")
    }
  }

  useEffect(() => {
    fetch("/api/admin/status")
      .then((r) => r.json())
      .then((data) => {
        const status = data as StatusResponse
        setAuthed(status.authed)
        setEnrolled(status.enrolled)
      })
      .catch(() => setAuthed(false))
  }, [])

  if (authed === null) {
    return <div className="grid min-h-[70vh] place-items-center font-mono text-xs text-muted">…</div>
  }

  if (!authed) {
    return <Login enrolled={enrolled} onAuthed={() => setAuthed(true)} />
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-mono text-[12px] uppercase tracking-[0.3em] text-text">Admin</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={runBackfill}
            disabled={backfill === "Running…"}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-cyan disabled:opacity-50"
          >
            Backfill locations
          </button>
          <button
            onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.reload() }}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-cyan"
          >
            Sign out
          </button>
        </div>
      </div>
      {backfill && (
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{backfill}</p>
      )}
      <Uploader onUploaded={() => setReload((n) => n + 1)} />
      <TagManager onChanged={() => setReload(n => n + 1)} />
      <PhotoList reloadKey={reload} />
    </main>
  )
}

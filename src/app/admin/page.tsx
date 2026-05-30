"use client"

import { useEffect, useState } from "react"
import { Login } from "@/components/admin/Login"
import { Uploader } from "@/components/admin/Uploader"
import { PhotoList } from "@/components/admin/PhotoList"

interface StatusResponse { authed: boolean; enrolled: boolean }

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [enrolled, setEnrolled] = useState(false)
  const [reload, setReload] = useState(0)

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
        <button
          onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.reload() }}
          className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted hover:text-cyan"
        >
          Sign out
        </button>
      </div>
      <Uploader onUploaded={() => setReload((n) => n + 1)} />
      <PhotoList reloadKey={reload} />
    </main>
  )
}

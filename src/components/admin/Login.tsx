"use client"

import { useState } from "react"
import { startAuthentication, startRegistration } from "@simplewebauthn/browser"
import type { PublicKeyCredentialRequestOptionsJSON, PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser"

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data
}

function passkeyError(e: unknown): string {
  if (e instanceof DOMException) {
    if (e.name === "NotAllowedError") return "Passkey cancelled."
    return e.message
  }
  if (e instanceof Error) return e.message
  return "Sign-in failed."
}

function isLocalHost() {
  if (typeof window === "undefined") return false
  const h = window.location.hostname
  return h === "localhost" || h === "127.0.0.1"
}

export function Login({ enrolled, onAuthed }: { enrolled: boolean; onAuthed: () => void }) {
  const [code, setCode] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const localDev = isLocalHost()
  const showEnroll = !enrolled || localDev

  async function login() {
    setBusy(true)
    setErr(null)
    try {
      const optsRes = await fetch("/api/auth/auth-options", { method: "POST" })
      const opts = await readJson<PublicKeyCredentialRequestOptionsJSON>(optsRes)
      const resp = await startAuthentication({ optionsJSON: opts })
      const verifyRes = await fetch("/api/auth/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resp),
      })
      const out = await readJson<{ verified: boolean }>(verifyRes)
      if (out.verified) onAuthed()
      else setErr("Verification failed — try again (challenge may have expired).")
    } catch (e) {
      setErr(passkeyError(e))
    } finally {
      setBusy(false)
    }
  }

  async function enroll() {
    setBusy(true)
    setErr(null)
    try {
      const optsRes = await fetch("/api/auth/register-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const opts = await readJson<PublicKeyCredentialCreationOptionsJSON & { error?: string }>(optsRes)
      const resp = await startRegistration({ optionsJSON: opts })
      const verifyRes = await fetch("/api/auth/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resp),
      })
      const out = await readJson<{ verified: boolean }>(verifyRes)
      if (out.verified) onAuthed()
      else setErr("Enrollment failed.")
    } catch (e) {
      setErr(passkeyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-sm place-items-center px-5">
      <div className="w-full space-y-4 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">Admin</p>
        <button onClick={login} disabled={busy} className="w-full rounded-md border border-cyan/40 bg-cyan/10 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.15em] text-cyan hover:bg-cyan/20 disabled:opacity-50">
          Sign in with passkey
        </button>
        {showEnroll && (
          <div className="space-y-2 border-t border-line pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              {enrolled && localDev ? "Local dev — add a localhost passkey" : "First run — enroll a passkey"}
            </p>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enroll code" className="w-full rounded-md border border-line-2 bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-cyan/50" />
            <button onClick={enroll} disabled={busy || !code} className="w-full rounded-md border border-line-2 px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.15em] text-text hover:border-cyan/50 disabled:opacity-50">
              Enroll passkey
            </button>
          </div>
        )}
        {err && <p className="font-mono text-[11px] text-amber">{err}</p>}
        {enrolled && localDev && (
          <p className="font-mono text-[9px] leading-relaxed text-muted">
            Your production passkey won&apos;t work on localhost — enroll one above, or use{" "}
            <span className="text-muted-2">gallery.mataev.no/admin</span>.
          </p>
        )}
      </div>
    </div>
  )
}

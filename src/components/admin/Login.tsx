"use client"

import { useState } from "react"
import { startAuthentication, startRegistration } from "@simplewebauthn/browser"
import type { PublicKeyCredentialRequestOptionsJSON, PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser"

export function Login({ enrolled, onAuthed }: { enrolled: boolean; onAuthed: () => void }) {
  const [code, setCode] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function login() {
    setBusy(true); setErr(null)
    try {
      const opts = (await (await fetch("/api/auth/auth-options", { method: "POST" })).json()) as PublicKeyCredentialRequestOptionsJSON
      const resp = await startAuthentication({ optionsJSON: opts })
      const out = (await (await fetch("/api/auth/auth-verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) })).json()) as { verified: boolean }
      if (out.verified) onAuthed(); else setErr("Verification failed.")
    } catch { setErr("Passkey cancelled.") } finally { setBusy(false) }
  }

  async function enroll() {
    setBusy(true); setErr(null)
    try {
      const opts = (await (await fetch("/api/auth/register-options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })).json()) as PublicKeyCredentialCreationOptionsJSON & { error?: string }
      if (opts.error) { setErr("Wrong enroll code."); return }
      const resp = await startRegistration({ optionsJSON: opts })
      const out = (await (await fetch("/api/auth/register-verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) })).json()) as { verified: boolean }
      if (out.verified) onAuthed(); else setErr("Enrollment failed.")
    } catch { setErr("Passkey cancelled.") } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-sm place-items-center px-5">
      <div className="w-full space-y-4 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">Admin</p>
        <button onClick={login} disabled={busy} className="w-full rounded-md border border-cyan/40 bg-cyan/10 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.15em] text-cyan hover:bg-cyan/20 disabled:opacity-50">
          Sign in with passkey
        </button>
        {!enrolled && (
          <div className="space-y-2 border-t border-line pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">First run — enroll a passkey</p>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enroll code" className="w-full rounded-md border border-line-2 bg-bg-2 px-3 py-2 font-mono text-sm text-text outline-none focus:border-cyan/50" />
            <button onClick={enroll} disabled={busy || !code} className="w-full rounded-md border border-line-2 px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.15em] text-text hover:border-cyan/50 disabled:opacity-50">
              Enroll passkey
            </button>
          </div>
        )}
        {err && <p className="font-mono text-[11px] text-amber">{err}</p>}
      </div>
    </div>
  )
}

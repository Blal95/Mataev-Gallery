"use client"

import { useCallback, useEffect, useState } from "react"

interface Comment {
  id: string
  author: string
  body: string
  createdAt: number
}

export function PhotoComments({ photoId }: { photoId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [author, setAuthor] = useState("")
  const [body, setBody] = useState("")
  const [website, setWebsite] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/photos/${photoId}/comments`)
    if (!res.ok) return
    const data = (await res.json()) as { comments: Comment[] }
    setComments(data.comments)
  }, [photoId])

  useEffect(() => { void load() }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await fetch(`/api/photos/${photoId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, body, website }),
    })
    setBusy(false)
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? "Could not post comment")
      return
    }
    const data = (await res.json()) as { comment: Comment }
    setComments((prev) => [...prev, data.comment])
    setBody("")
  }

  return (
    <section className="mt-6 border-t border-line pt-5">
      <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-2">Comments</h3>

      {comments.length > 0 && (
        <ul className="mb-4 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="text-sm">
              <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {c.author}
                <span className="mx-2 text-line-2">·</span>
                {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </div>
              <p className="mt-1 leading-relaxed text-text">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          required
          className="w-full rounded border border-line-2 bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-amber/50"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a note…"
          maxLength={500}
          required
          rows={3}
          className="w-full resize-y rounded border border-line-2 bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-amber/50"
        />
        {/* Honeypot — hidden from humans */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        {error && <p className="font-mono text-[10px] text-amber">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded border border-amber/40 bg-amber/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber disabled:opacity-50"
        >
          {busy ? "Posting…" : "Post comment"}
        </button>
      </form>
    </section>
  )
}

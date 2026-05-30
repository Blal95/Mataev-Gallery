import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-5 text-center">
      <span className="font-mono text-sm uppercase tracking-[0.34em] text-text">MATAEV</span>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
        404 <span className="text-cyan">—</span> not found
      </p>
      <Link
        href="/"
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan hover:underline"
      >
        ← Back to gallery
      </Link>
    </div>
  )
}

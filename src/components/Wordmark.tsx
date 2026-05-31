import Link from "next/link"
import { site } from "@/config/site"

function RegMark() {
  // Registration/target mark — a film-archive motif.
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="h-3.5 w-3.5 text-amber" aria-hidden>
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 1.5v6M12 16.5v6M1.5 12h6M16.5 12h6" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <header className="flex items-center justify-between px-4 pb-3 pt-5 sm:px-6">
      <Link href="/" className="group flex items-center gap-2.5">
        <RegMark />
        <span className="font-mono text-sm font-medium uppercase tracking-[0.38em] text-text transition-colors group-hover:text-amber">
          {site.name}
        </span>
      </Link>
      <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.28em] text-muted">
        <span className="text-amber/70">▚</span>
        <span>ARCHIVE</span>
        <span className="text-line-2">/</span>
        <span>NO</span>
      </div>
    </header>
  )
}

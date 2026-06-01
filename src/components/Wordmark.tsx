import Link from "next/link"
import { site } from "@/config/site"
import Logo from "@/components/Logo"

export function Wordmark() {
  return (
    <header className="flex items-center justify-between px-4 pb-3 pt-5 sm:px-6">
      <Link href="/" className="group flex items-center gap-2.5">
        <Logo iconOnly className="h-5 w-auto text-amber transition-colors group-hover:text-text" />
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

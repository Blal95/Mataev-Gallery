import Link from "next/link"
import { site } from "@/config/site"

export function Wordmark() {
  return (
    <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="font-mono text-sm uppercase tracking-[0.34em] text-text">{site.name}</span>
        <span className="h-[5px] w-[5px] -translate-y-px rounded-full bg-cyan" />
      </Link>
      <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted">{site.meta}</span>
    </div>
  )
}

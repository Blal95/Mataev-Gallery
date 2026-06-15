import Link from "next/link"
import { site } from "@/config/site"
import Logo from "@/components/Logo"

export function Wordmark() {
  return (
    <header className="flex items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-5 sm:px-6">
      <Link href="/" className="group flex items-center gap-2.5">
        <Logo iconOnly className="h-5 w-auto text-amber transition-colors group-hover:text-text" />
        <span className="font-mono text-sm font-medium uppercase tracking-[0.38em] text-text transition-colors group-hover:text-amber">
          {site.name}
        </span>
      </Link>
    </header>
  )
}

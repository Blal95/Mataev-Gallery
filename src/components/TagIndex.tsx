import Link from "next/link"
import { cn } from "@/lib/cn"
import type { TagCount } from "@/types/photo"

function Chip({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-200",
        active ? "border-amber text-text" : "border-transparent text-muted-2 hover:text-text",
      )}
    >
      <span className={cn("transition-colors", active ? "text-amber" : "text-muted group-hover:text-amber")}>
        {active ? "▸" : ""}
      </span>
      <span>{label}</span>
      {count != null && (
        <span className={cn("text-[9px] tabular-nums", active ? "text-amber" : "text-muted")}>{count}</span>
      )}
    </Link>
  )
}

export function TagIndex({ tags, active }: { tags: TagCount[]; active?: string }) {
  return (
    <nav className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="flex items-center gap-5 overflow-x-auto px-4 pt-3 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip href="/" active={!active} label="All" />
        {tags.map((t) => (
          <Chip key={t.name} href={`/t/${t.name}`} active={active === t.name} label={t.name} count={t.count} />
        ))}
      </div>
    </nav>
  )
}

import Link from "next/link"
import { cn } from "@/lib/cn"
import type { TagCount } from "@/types/photo"

export function TagIndex({ tags, active }: { tags: TagCount[]; active?: string }) {
  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-2 border-b border-line px-5 pb-3.5">
      <Link
        href="/"
        className={cn(
          "pb-[3px] font-mono text-[11px] uppercase tracking-[0.1em]",
          !active ? "border-b-[1.5px] border-cyan text-text" : "text-muted hover:text-text",
        )}
      >
        All
      </Link>
      {tags.map((t) => (
        <Link
          key={t.name}
          href={`/t/${t.name}`}
          className={cn(
            "pb-[3px] font-mono text-[11px] uppercase tracking-[0.1em]",
            active === t.name ? "border-b-[1.5px] border-cyan text-text" : "text-muted hover:text-text",
          )}
        >
          {t.name}
          <sup className="ml-0.5 text-[8px] text-cyan">{t.count}</sup>
        </Link>
      ))}
    </nav>
  )
}

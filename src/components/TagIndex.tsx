"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/cn"
import Link from "next/link"
import type { TagCount } from "@/types/photo"

function Chip({
  href, active, label, count, onClick, loading,
}: {
  href: string; active: boolean; label: string; count?: number
  onClick: () => void; loading: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-200",
        active ? "border-amber text-text" : "border-transparent text-muted-2 hover:text-text",
        loading && "opacity-60",
      )}
    >
      <span className={cn("transition-colors", active ? "text-amber" : "text-muted group-hover:text-amber")}>
        {loading ? (
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
        ) : active ? "▸" : ""}
      </span>
      <span>{label}</span>
      {count != null && (
        <span className={cn("text-[9px] tabular-nums", active ? "text-amber" : "text-muted")}>{count}</span>
      )}
    </button>
  )
}

export function TagIndex({ tags, active }: { tags: TagCount[]; active?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  function navigate(href: string) {
    setPendingHref(href)
    startTransition(() => {
      router.push(href)
    })
  }

  // Clear pending once transition resolves
  if (!isPending && pendingHref !== null) {
    setPendingHref(null)
  }

  return (
    <nav aria-label="Filter by tag" className="sticky top-0 z-20 flex items-stretch border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-5 overflow-x-auto px-4 pt-3 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Chip
          href="/"
          active={!active}
          label="All"
          loading={pendingHref === "/"}
          onClick={() => navigate("/")}
        />
        {tags.map((t) => {
          const href = `/t/${t.name}`
          return (
            <Chip
              key={t.name}
              href={href}
              active={active === t.name}
              label={t.name}
              count={t.count}
              loading={pendingHref === href}
              onClick={() => navigate(href)}
            />
          )
        })}
      </div>
      {/* Atlas — pinned right so it never scrolls with the tag list */}
      <Link
        href="/atlas"
        className="group flex shrink-0 items-center gap-1.5 border-l border-line px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-2 transition-colors hover:text-text sm:px-6"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted transition-colors group-hover:text-amber" aria-hidden>
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" />
        </svg>
        Atlas
      </Link>
    </nav>
  )
}

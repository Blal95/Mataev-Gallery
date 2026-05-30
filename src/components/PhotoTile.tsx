"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { thumbhashToUrl } from "@/lib/thumbhash"
import { flagEmoji } from "@/lib/format"
import type { PhotoDTO } from "@/types/photo"

export function PhotoTile({
  photo, width, height, index,
}: { photo: PhotoDTO; width: number; height: number; index: number }) {
  const [loaded, setLoaded] = useState(false)
  const placeholder = useMemo(() => thumbhashToUrl(photo.thumbhash), [photo.thumbhash])
  const place = [flagEmoji(photo.countryCode), photo.place].filter(Boolean).join(" ")

  return (
    <Link
      href={`/p/${photo.slug}`}
      scroll={false}
      className="group relative block overflow-hidden rounded-[3px] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1"
      style={{ width, height }}
    >
      {placeholder && !loaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={placeholder} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url.thumb}
        alt={photo.caption ?? `Photo ${index + 1}`}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="relative h-full w-full object-cover"
      />
      {/* hover peek: gradient + place + index, plus cyan rule */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#080b12]/85 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute bottom-2 left-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-text opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {place || " "} <span className="text-muted-2">· {String(index + 1).padStart(3, "0")}</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-cyan opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Link>
  )
}

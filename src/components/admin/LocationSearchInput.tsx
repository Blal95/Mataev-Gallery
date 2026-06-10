"use client"

import { useEffect, useState } from "react"
import { flagEmoji } from "@/lib/format"

export interface PickedLocation {
  place: string
  country: string
  countryCode: string
  lat: number | null
  lon: number | null
  address: string | null
}

interface SearchHit {
  lat: number
  lon: number
  label: string
  address: string | null
  place: string | null
  country: string | null
  countryCode: string | null
}

/**
 * Location field with POI search: type "Brescia station", pick a hit, and it
 * fills place/country/coords. Free text that is never picked still saves as a
 * plain place name. A selected location renders as a compact "city, country"
 * line expandable to the full address.
 */
export function LocationSearchInput({
  value,
  onChange,
}: {
  value: PickedLocation
  onChange: (v: PickedLocation) => void
}) {
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [fetchedAddress, setFetchedAddress] = useState<string | null>(null)
  // Only text the user actually typed triggers search — programmatic place
  // updates (EXIF prefill, apply-to-all) must not pop the dropdown open.
  const [query, setQuery] = useState<string | null>(null)

  // Debounced POI search on the typed text. Hits are cleared in the event
  // handlers (typing short text, picking, clearing), never synchronously here.
  useEffect(() => {
    if (query == null) return
    const q = query.trim()
    if (q.length < 3) return
    const t = setTimeout(() => {
      setSearching(true)
      fetch(`/api/admin/geocode?q=${encodeURIComponent(q)}`)
        .then(async (r) => {
          const d = (await r.json()) as { results?: SearchHit[] }
          setHits(d.results ?? [])
        })
        .catch(() => setHits([]))
        .finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  const pick = (h: SearchHit) => {
    setQuery(null)
    setHits([])
    setExpanded(false)
    setFetchedAddress(null)
    onChange({
      place: h.place ?? h.label,
      country: h.country ?? "",
      countryCode: h.countryCode ?? "",
      lat: h.lat,
      lon: h.lon,
      address: h.address,
    })
  }

  const clear = () => {
    setQuery(null)
    setHits([])
    setExpanded(false)
    setFetchedAddress(null)
    onChange({ place: "", country: "", countryCode: "", lat: null, lon: null, address: null })
  }

  const toggleExpand = () => {
    const next = !expanded
    setExpanded(next)
    if (next && !value.address && !fetchedAddress && value.lat != null && value.lon != null) {
      fetch(`/api/admin/geocode?lat=${value.lat}&lon=${value.lon}&full=1`)
        .then((r) => r.json())
        .then((d) => setFetchedAddress((d as { address?: string | null }).address ?? null))
        .catch(() => {})
    }
  }

  const selected = Boolean(value.country || (value.lat != null && value.lon != null))
  const flag = flagEmoji(value.countryCode || null, value.lat, value.lon)
  const compact = [value.place, value.country].filter(Boolean).join(", ")
  const fullAddress = value.address ?? fetchedAddress

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          value={query ?? value.place}
          onChange={(e) => {
            const text = e.target.value
            setQuery(text)
            if (text.trim().length < 3) setHits([])
            onChange({ ...value, place: text })
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits.length > 0) { e.preventDefault(); pick(hits[0]) }
            if (e.key === "Escape") setHits([])
          }}
          placeholder="Location — search e.g. “Brescia station”"
          className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 text-xs text-text outline-none focus:border-cyan/50"
        />
        {searching && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted">…</span>
        )}
        {hits.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded border border-line-2 bg-bg-2 py-1 shadow-lg">
            {hits.map((h, i) => (
              <li key={`${h.lat}-${h.lon}-${i}`}>
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left text-xs text-text hover:bg-amber/10"
                  onClick={() => pick(h)}
                >
                  {h.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="space-y-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">
              {flag ? `${flag} ` : ""}{compact || "Pinned"}
              {value.lat != null && value.lon != null && (
                <span className="text-muted/60"> · {value.lat.toFixed(4)}°, {value.lon.toFixed(4)}°</span>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {(value.lat != null || value.address) && (
                <button type="button" onClick={toggleExpand} className="text-muted-2 hover:text-amber">
                  {expanded ? "Less ▴" : "Details ▾"}
                </button>
              )}
              <button type="button" onClick={clear} className="text-amber hover:underline">Clear</button>
            </span>
          </div>
          {expanded && (
            <p className="whitespace-normal border-l border-line-2 pl-2 normal-case tracking-normal text-muted-2">
              {fullAddress ?? "Loading address…"}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

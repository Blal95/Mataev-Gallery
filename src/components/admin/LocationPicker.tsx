"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"

export interface LocationValue {
  lat: number | null
  lon: number | null
  place: string
  country: string
  countryCode: string
}

interface SearchHit {
  lat: number
  lon: number
  label: string
  place: string | null
  country: string | null
  countryCode: string | null
}

/**
 * Admin location editor — click the map or search to set GPS + locality.
 * Reverse-geocodes on pin drop via /api/admin/geocode.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue
  onChange: (v: LocationValue) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<import("leaflet").Map | null>(null)
  const markerRef = useRef<import("leaflet").Marker | null>(null)
  const onChangeRef = useRef(onChange)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const applyCoords = useCallback(async (lat: number, lon: number, label?: Partial<LocationValue>) => {
    if (label?.place != null) {
      onChangeRef.current({
        lat,
        lon,
        place: label.place ?? "",
        country: label.country ?? "",
        countryCode: label.countryCode ?? "",
      })
      return
    }
    const res = await fetch(`/api/admin/geocode?lat=${lat}&lon=${lon}`)
    const data = (await res.json()) as { result?: { place: string | null; country: string | null; countryCode: string | null } }
    const g = data.result
    onChangeRef.current({
      lat,
      lon,
      place: g?.place ?? "",
      country: g?.country ?? "",
      countryCode: g?.countryCode ?? "",
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const mod = await import("leaflet")
      const L = mod.default ?? mod
      if (cancelled || !mapRef.current) return

      const center: [number, number] =
        value.lat != null && value.lon != null ? [value.lat, value.lon] : [55, 15]

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false,
      })
      map.setView(center, value.lat != null ? 8 : 3)

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map)

      map.on("click", (e) => {
        void applyCoords(e.latlng.lat, e.latlng.lng)
      })

      mapInstance.current = map
    })()

    return () => {
      cancelled = true
      mapInstance.current?.remove()
      mapInstance.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map mounts once
  }, [applyCoords])

  useEffect(() => {
    void (async () => {
      const map = mapInstance.current
      if (!map) return
      const mod = await import("leaflet")
      const L = mod.default ?? mod

      if (value.lat == null || value.lon == null) {
        markerRef.current?.remove()
        markerRef.current = null
        return
      }

      const pos: [number, number] = [value.lat, value.lon]
      if (markerRef.current) {
        markerRef.current.setLatLng(pos)
      } else {
        markerRef.current = L.marker(pos, {
          draggable: true,
          icon: L.divIcon({
            className: "",
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            html: '<div style="width:14px;height:14px;border-radius:9999px;background:#e3a857;box-shadow:0 0 0 4px rgba(227,168,87,0.22)"></div>',
          }),
        }).addTo(map)
        markerRef.current.on("dragend", () => {
          const ll = markerRef.current!.getLatLng()
          void applyCoords(ll.lat, ll.lng)
        })
      }
      map.setView(pos, Math.max(map.getZoom(), 6))
    })()
  }, [value.lat, value.lon, applyCoords])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      return
    }
    const t = setTimeout(() => {
      setSearching(true)
      fetch(`/api/admin/geocode?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d: { results?: SearchHit[] }) => setHits(d.results ?? []))
        .catch(() => setHits([]))
        .finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  const label = [value.place, value.country].filter(Boolean).join(", ")

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search place…"
          className="w-full rounded border border-line-2 bg-bg-2 px-2 py-1.5 text-xs text-text outline-none focus:border-cyan/50"
        />
        {searching && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] text-muted">
            …
          </span>
        )}
        {hits.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded border border-line-2 bg-bg-2 py-1 shadow-lg">
            {hits.map((h, i) => (
              <li key={`${h.lat}-${h.lon}-${i}`}>
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left text-xs text-text hover:bg-amber/10"
                  onClick={() => {
                    setQuery("")
                    setHits([])
                    void applyCoords(h.lat, h.lon, {
                      lat: h.lat,
                      lon: h.lon,
                      place: h.place ?? "",
                      country: h.country ?? "",
                      countryCode: h.countryCode ?? "",
                    })
                  }}
                >
                  {h.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={mapRef} className="h-36 w-full overflow-hidden rounded border border-line-2" aria-label="Pick location on map" />

      <div className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
        <span className="min-w-0 truncate">
          {value.lat != null
            ? `${label || "Pinned"} · ${value.lat.toFixed(4)}°, ${value.lon!.toFixed(4)}°`
            : "Click map or search — no pin yet"}
        </span>
        {value.lat != null && (
          <button
            type="button"
            onClick={() => onChange({ lat: null, lon: null, place: "", country: "", countryCode: "" })}
            className="shrink-0 text-amber hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster/dist/MarkerCluster.css"

export interface AtlasPin {
  slug: string
  lat: number
  lon: number
  thumb: string
  caption: string | null
  place: string | null
  countryCode: string | null
}

/**
 * The Atlas — every geotagged photo plotted on one dark map. Click a pin to
 * open that frame. This is the "between the fjell and the Caucasus" story made
 * literal: pan from Norway to the Caucasus and watch the work spread across it.
 *
 * Leaflet is imported lazily inside the effect (it touches `window`, so it must
 * never reach the server bundle) and only loads when this page renders.
 */
export function AtlasMap({ pins, className, initialCenter, initialZoom, selectedSlug }: {
  pins: AtlasPin[]; className?: string
  initialCenter?: [number, number]
  initialZoom?: number
  selectedSlug?: string | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  // Keep the latest pins/router reachable from the mount-only effect without
  // re-initialising the whole map when they change.
  const pinsRef = useRef(pins)
  const initialCenterRef = useRef(initialCenter)
  const initialZoomRef = useRef(initialZoom)
  const selectedSlugRef = useRef(selectedSlug)
  const routerRef = useRef(router)
  useEffect(() => { pinsRef.current = pins }, [pins])
  useEffect(() => { routerRef.current = router }, [router])

  useEffect(() => {
    let map: import("leaflet").Map | undefined
    let cancelled = false

    void (async () => {
      const mod = await import("leaflet")
      await import("leaflet.markercluster")
      const L = mod.default ?? mod
      if (cancelled || !ref.current) return

      const current = pinsRef.current

      map = L.map(ref.current, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true,
        worldCopyJump: true,
        minZoom: 2,
      })

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        minZoom: 2,
      }).addTo(map)

      const markers: import("leaflet").Marker[] = []
      const markerBySlug = new Map<string, import("leaflet").Marker>()

      const cluster = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: false,
        iconCreateFunction: (c: any) => L.divIcon({
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          html: `<div style="width:22px;height:22px;border-radius:9999px;background:#e3a857;box-shadow:0 0 0 4px rgba(227,168,87,0.2),0 0 12px rgba(227,168,87,0.8);cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:ui-monospace,monospace;font-size:9px;color:#0a0908;font-weight:700;letter-spacing:0">${c.getChildCount()}</div>`,
        }),
      })

      for (const pin of current) {
        const marker = L.marker([pin.lat, pin.lon], {
          keyboard: true,
          title: pin.caption ?? pin.place ?? "View frame",
          icon: L.divIcon({
            className: "",
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            html:
              '<div style="width:14px;height:14px;border-radius:9999px;background:#e3a857;' +
              'box-shadow:0 0 0 4px rgba(227,168,87,0.2),0 0 12px rgba(227,168,87,0.8);' +
              'cursor:pointer;transition:transform .18s ease"></div>',
          }),
        })

        const cc = pin.countryCode
        const flagEmoji = cc && cc.length === 2
          ? [...cc.toUpperCase()].map(ch => String.fromCodePoint(ch.codePointAt(0)! + 0x1F1E6 - 65)).join("")
          : ""
        const placeLabel = pin.place ? escapeHtml(pin.place) : ""
        marker.bindPopup(
          `<a href="/image/${pin.slug}" data-slug="${pin.slug}" style="display:block;width:150px;text-decoration:none;color:inherit">
             <img src="${pin.thumb}" alt="" style="width:150px;height:100px;object-fit:cover;border-radius:4px;display:block" loading="lazy" />
             ${pin.caption ? `<div style="font-style:italic;font-size:12px;margin-top:6px;line-height:1.3;color:#e8e4dc">${escapeHtml(pin.caption)}</div>` : ""}
             ${placeLabel ? `<div style="font-family:ui-monospace,monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;margin-top:4px;color:#9a948a">${flagEmoji ? flagEmoji + " " : ""}${placeLabel}</div>` : ""}
           </a>`,
          { closeButton: true, className: "atlas-popup", minWidth: 150, maxWidth: 150 },
        )

        ;(marker as any)._pin = pin
        cluster.addLayer(marker)
        markers.push(marker)
        markerBySlug.set(pin.slug, marker)
      }

      cluster.addTo(map!)

      // Cluster click → show a popup with the first photo + the rest as "in this cluster"
      cluster.on("clusterclick", (e: any) => {
        e.originalEvent?.stopPropagation()
        const clusterPins: AtlasPin[] = (e.layer.getAllChildMarkers() as any[])
          .map((m) => m._pin as AtlasPin)
          .filter((p): p is AtlasPin => !!p)
        if (!clusterPins.length) return

        const main = clusterPins[0]
        const rest = clusterPins.slice(1)
        const cc = main.countryCode
        const flag = cc && cc.length === 2
          ? [...cc.toUpperCase()].map(ch => String.fromCodePoint(ch.codePointAt(0)! + 0x1F1E6 - 65)).join("") + " "
          : ""
        const placeLabel = main.place ? escapeHtml(main.place) : ""

        const restHtml = rest.length > 0
          ? `<div data-cluster-rest style="display:none">` +
            rest.map(p =>
              `<a href="/image/${p.slug}" data-slug="${p.slug}" style="display:flex;align-items:center;gap:6px;margin-top:6px;text-decoration:none;color:inherit">
                <img src="${p.thumb}" style="width:36px;height:36px;object-fit:cover;border-radius:3px;flex-shrink:0" loading="lazy" alt="" />
                <span style="font-size:10px;color:#efe8dd;line-height:1.3">${p.caption ? escapeHtml(p.caption.slice(0, 28)) + (p.caption.length > 28 ? "…" : "") : p.place ? escapeHtml(p.place) : ""}</span>
              </a>`
            ).join("") + `</div>`
          : ""

        const toggleHtml = rest.length > 0
          ? `<button data-cluster-toggle style="margin-top:8px;padding-top:8px;border-top:1px solid #2a241d;border-left:none;border-right:none;border-bottom:none;background:none;padding-left:0;padding-right:0;width:100%;text-align:left;font-family:ui-monospace,monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#9a948a;cursor:pointer;display:block">In this cluster (${rest.length})</button>`
          : ""

        const html =
          `<a href="/image/${main.slug}" data-slug="${main.slug}" style="display:block;width:150px;text-decoration:none;color:inherit">
            <img src="${main.thumb}" alt="" style="width:150px;height:100px;object-fit:cover;border-radius:4px;display:block" loading="lazy" />
            ${main.caption ? `<div style="font-style:italic;font-size:12px;margin-top:6px;line-height:1.3;color:#e8e4dc">${escapeHtml(main.caption)}</div>` : ""}
            ${placeLabel ? `<div style="font-family:ui-monospace,monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;margin-top:4px;color:#9a948a">${flag}${placeLabel}</div>` : ""}
          </a>${toggleHtml}${restHtml}`

        const popup = L.popup({ closeButton: true, className: "atlas-popup", minWidth: 150, maxWidth: 150 })
          .setLatLng(e.layer.getLatLng())
          .setContent(html)
          .openOn(map!)

        // wire up after Leaflet renders the popup
        setTimeout(() => {
          const el = popup.getElement()
          if (!el) return
          el.querySelectorAll<HTMLAnchorElement>("a[data-slug]").forEach(a => {
            a.addEventListener("click", ev => { ev.preventDefault(); routerRef.current.push(`/image/${a.dataset.slug!}`) })
          })
          const toggleBtn = el.querySelector<HTMLButtonElement>("[data-cluster-toggle]")
          const restEl = el.querySelector<HTMLDivElement>("[data-cluster-rest]")
          if (toggleBtn && restEl) {
            toggleBtn.addEventListener("click", () => {
              const open = restEl.style.display !== "none"
              restEl.style.display = open ? "none" : "block"
              toggleBtn.textContent = open ? `In this cluster (${rest.length})` : `In this cluster (${rest.length}) ▲`
            })
          }
        }, 0)
      })

      // Intercept popup link clicks → client-side nav (no full reload).
      // Also append "Nearby" photos to single-pin popups.
      map.on("popupopen", (e) => {
        const popup = e.popup as import("leaflet").Popup
        const node = popup.getElement()
        const anchor = node?.querySelector<HTMLAnchorElement>("a[data-slug]")

        anchor?.addEventListener("click", (ev) => {
          ev.preventDefault()
          routerRef.current.push(`/image/${anchor.dataset.slug}`)
        })

        // Skip nearby for cluster popups (they have data-cluster-toggle)
        if (node?.querySelector("[data-cluster-toggle]")) return

        const slug = anchor?.dataset.slug
        const pin = pinsRef.current.find(p => p.slug === slug)
        if (pin && node) {
          const nearby = pinsRef.current
            .filter(p => p.slug !== slug)
            .map(p => ({ p, dist: Math.sqrt((p.lat - pin.lat) ** 2 + (p.lon - pin.lon) ** 2) }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3)
            .filter(({ dist }) => dist < 0.5)

          if (nearby.length > 0) {
            const content = node.querySelector(".leaflet-popup-content")
            if (content) {
              const toggle = document.createElement("button")
              toggle.textContent = `Nearby (${nearby.length})`
              toggle.style.cssText = "margin-top:8px;padding-top:8px;border-top:1px solid #2a241d;border-left:none;border-right:none;border-bottom:none;background:none;padding-left:0;padding-right:0;width:100%;text-align:left;font-family:ui-monospace,monospace;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#9a948a;cursor:pointer;display:block"

              const nearbyEl = document.createElement("div")
              nearbyEl.style.display = "none"
              nearbyEl.innerHTML = nearby.map(({ p }) =>
                `<a href="/image/${p.slug}" data-slug="${p.slug}" style="display:flex;align-items:center;gap:6px;margin-top:6px;text-decoration:none;color:inherit">
                  <img src="${p.thumb}" style="width:36px;height:36px;object-fit:cover;border-radius:3px;flex-shrink:0" loading="lazy" alt="" />
                  <span style="font-size:10px;color:#efe8dd;line-height:1.3">${p.caption ? escapeHtml(p.caption.slice(0, 30)) + (p.caption.length > 30 ? "…" : "") : p.place ? escapeHtml(p.place) : ""}</span>
                </a>`
              ).join("")

              toggle.addEventListener("click", () => {
                const open = nearbyEl.style.display !== "none"
                nearbyEl.style.display = open ? "none" : "block"
                toggle.textContent = open ? `Nearby (${nearby.length})` : `Nearby (${nearby.length}) ▲`
              })

              nearbyEl.querySelectorAll<HTMLAnchorElement>("a[data-slug]").forEach(a => {
                a.addEventListener("click", ev => { ev.preventDefault(); routerRef.current.push(`/image/${a.dataset.slug!}`) })
              })

              content.appendChild(toggle)
              content.appendChild(nearbyEl)
            }
          }
        }
      })

      // If a specific center was requested (e.g. from a photo location link), use it.
      // Otherwise frame around all pins; fall back to a Norway↔Caucasus view.
      const center = initialCenterRef.current
      if (center) {
        map.setView(center, initialZoomRef.current ?? 10)
      } else if (markers.length > 0) {
        const group = L.featureGroup(markers)
        map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 8 })
      } else {
        map.setView([55, 30], 3)
      }

      // Auto-open popup for a selected photo (e.g. navigated from photo detail).
      const slug = selectedSlugRef.current
      if (slug) {
        const m = markerBySlug.get(slug)
        if (m) setTimeout(() => m.openPopup(), 350)
      }
    })()

    return () => {
      cancelled = true
      map?.remove()
    }
  }, [])

  return (
    <div
      ref={ref}
      className={className ? `atlas-map ${className}` : "atlas-map"}
      aria-label="Map of all photo locations"
    />
  )
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  )
}

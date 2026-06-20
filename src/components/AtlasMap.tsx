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

/** Marker carrying its source pin so cluster popups can read it back. */
type PinMarker = import("leaflet").Marker & { _pin?: AtlasPin }

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
        preferCanvas: true,
        maxBounds: [[-85.051129, -180000], [85.051129, 180000]],
        maxBoundsViscosity: 1.0,
        zoomSnap: 0.25,
        wheelPxPerZoomLevel: 80,
      })

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        minZoom: 2,
        updateWhenZooming: false,
        keepBuffer: 4,
      }).addTo(map)

      // Custom border: Chechnya drawn as its own country, extended to include
      // the Khasavyurt region (Khasavyurtovsky district + city okrug, where
      // Bammatyurt lies). Dissolved from OSM admin boundaries, served from
      // /public so the polygon never bloats the JS bundle.
      void fetch("/chechnya-border.json")
        .then((r) => (r.ok ? (r.json() as Promise<GeoJSON.Feature>) : null))
        .then((geo) => {
          if (!geo || cancelled || !map) return
          L.geoJSON(geo, {
            style: {
              color: "#3d3528",
              weight: 1.2,
              opacity: 1,
              fillOpacity: 0,
            },
            interactive: false,
          }).addTo(map)
        })
        .catch(() => {})

      const markers: import("leaflet").Marker[] = []
      const markerBySlug = new Map<string, import("leaflet").Marker>()

      const cluster = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: false,
        iconCreateFunction: (c) => L.divIcon({
          className: "",
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          html: `<div style="width:30px;height:30px;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer"><div style="position:absolute;inset:0;border-radius:50%;border:1.5px solid rgba(227,168,87,0.55);background:rgba(227,168,87,0.12)"></div><span style="font-family:ui-monospace,monospace;font-size:9px;font-weight:700;color:#e3a857;letter-spacing:0;position:relative">${c.getChildCount()}</span></div>`,
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
              '<div style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;cursor:pointer">' +
              '<div style="width:8px;height:8px;border-radius:50%;background:#e3a857;' +
              'box-shadow:0 0 0 3px rgba(227,168,87,0.22),0 0 0 6px rgba(227,168,87,0.08),0 0 10px rgba(227,168,87,0.65);' +
              'transition:transform .18s ease"></div>' +
              '</div>',
          }),
        })

        const cc = pin.countryCode
        const isChechnya = cc === "RU" && pin.lat >= 42.5 && pin.lat <= 43.8 && pin.lon >= 44.8 && pin.lon <= 47.0
        const flagEmoji = isChechnya ? "" : (cc && cc.length === 2
          ? [...cc.toUpperCase()].map(ch => String.fromCodePoint(ch.codePointAt(0)! + 0x1F1E6 - 65)).join("")
          : "")
        const flagPrefix = isChechnya
          ? `<img src="/ichkeria.png" alt="" style="display:inline-block;height:10px;width:auto;vertical-align:middle;margin-right:3px" /> `
          : (flagEmoji ? flagEmoji + " " : "")
        const placeLabel = pin.place ? escapeHtml(pin.place) : ""
        marker.bindPopup(
          `<a href="/image/${pin.slug}" data-slug="${pin.slug}" style="display:block;width:164px;text-decoration:none;color:inherit;user-select:none">
             <div style="border-radius:6px;overflow:hidden;line-height:0;box-shadow:0 4px 14px rgba(0,0,0,0.45)">
               <img src="${pin.thumb}" alt="" style="width:164px;height:110px;object-fit:cover;display:block" loading="lazy" />
             </div>
             ${pin.caption ? `<p style="font-family:var(--font-playfair,Georgia,'Times New Roman',serif);font-style:italic;font-size:12.5px;margin:8px 0 0;line-height:1.35;color:#efe8dd">${escapeHtml(pin.caption)}</p>` : ""}
             ${placeLabel ? `<p style="font-family:ui-monospace,'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.18em;margin:${pin.caption ? "5px" : "8px"} 0 0;color:#9b8f80">${flagPrefix}${placeLabel}</p>` : ""}
           </a>`,
          { closeButton: true, className: "atlas-popup", minWidth: 164, maxWidth: 164 },
        )

        ;(marker as PinMarker)._pin = pin
        cluster.addLayer(marker)
        markers.push(marker)
        markerBySlug.set(pin.slug, marker)
      }

      cluster.addTo(map!)

      // Cluster click → show a popup with the first photo + the rest as "in this cluster"
      cluster.on("clusterclick", (e) => {
        const ev = e as import("leaflet").LeafletEvent & {
          layer: import("leaflet").MarkerCluster
          originalEvent?: MouseEvent
        }
        ev.originalEvent?.stopPropagation()
        const clusterPins: AtlasPin[] = ev.layer.getAllChildMarkers()
          .map((m: PinMarker) => m._pin)
          .filter((p: AtlasPin | undefined): p is AtlasPin => !!p)
        if (!clusterPins.length) return

        const main = clusterPins[0]
        const rest = clusterPins.slice(1)
        const cc = main.countryCode
        const isMainChechnya = cc === "RU" && main.lat >= 42.5 && main.lat <= 43.8 && main.lon >= 44.8 && main.lon <= 47.0
        const flag = isMainChechnya
          ? `<img src="/ichkeria.png" alt="" style="display:inline-block;height:10px;width:auto;vertical-align:middle;margin-right:3px" /> `
          : (cc && cc.length === 2
            ? [...cc.toUpperCase()].map(ch => String.fromCodePoint(ch.codePointAt(0)! + 0x1F1E6 - 65)).join("") + " "
            : "")
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
          ? `<button data-cluster-toggle style="margin-top:9px;padding-top:9px;border-top:1px solid #2a241d;border:none;border-top:1px solid #2a241d;background:none;padding-left:0;padding-right:0;width:100%;text-align:left;font-family:ui-monospace,'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.16em;color:#9b8f80;cursor:pointer;display:block">In this cluster (${rest.length})</button>`
          : ""

        const html =
          `<a href="/image/${main.slug}" data-slug="${main.slug}" style="display:block;width:164px;text-decoration:none;color:inherit;user-select:none">
            <div style="border-radius:6px;overflow:hidden;line-height:0;box-shadow:0 4px 14px rgba(0,0,0,0.45)">
              <img src="${main.thumb}" alt="" style="width:164px;height:110px;object-fit:cover;display:block" loading="lazy" />
            </div>
            ${main.caption ? `<p style="font-family:var(--font-playfair,Georgia,'Times New Roman',serif);font-style:italic;font-size:12.5px;margin:8px 0 0;line-height:1.35;color:#efe8dd">${escapeHtml(main.caption)}</p>` : ""}
            ${placeLabel ? `<p style="font-family:ui-monospace,'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.18em;margin:${main.caption ? "5px" : "8px"} 0 0;color:#9b8f80">${flag}${placeLabel}</p>` : ""}
          </a>${toggleHtml}${restHtml}`

        const popup = L.popup({ closeButton: true, className: "atlas-popup", minWidth: 164, maxWidth: 164 })
          .setLatLng(ev.layer.getLatLng())
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
              toggle.style.cssText = "margin-top:9px;padding-top:9px;border-top:1px solid #2a241d;border-left:none;border-right:none;border-bottom:none;background:none;padding-left:0;padding-right:0;width:100%;text-align:left;font-family:ui-monospace,'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:.16em;color:#9b8f80;cursor:pointer;display:block"

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
      let homeBounds: import("leaflet").LatLngBounds | null = null
      if (markers.length > 0) {
        homeBounds = L.featureGroup(markers).getBounds().pad(0.25)
      }
      if (center) {
        map.setView([0, 0], 2, { animate: false })
        map.flyTo(center, initialZoomRef.current ?? 10, { duration: 1.4 })
      } else if (homeBounds) {
        map.fitBounds(homeBounds, { maxZoom: 8 })
      } else {
        map.setView([55, 30], 3)
      }

      // Home button — flies back to fit-all-pins view.
      if (homeBounds) {
        const bounds = homeBounds
        const HomeControl = L.Control.extend({
          onAdd() {
            const bar = L.DomUtil.create("div", "leaflet-bar leaflet-control")
            const a = L.DomUtil.create("a", "", bar) as HTMLAnchorElement
            a.href = "#"
            a.title = "Fit all frames"
            a.setAttribute("role", "button")
            a.style.cssText = "display:flex;align-items:center;justify-content:center;width:26px;height:26px;font-size:15px;line-height:1;"
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
            svg.setAttribute("viewBox", "0 0 16 16")
            svg.setAttribute("fill", "none")
            svg.setAttribute("stroke", "currentColor")
            svg.setAttribute("stroke-width", "1.5")
            svg.style.cssText = "width:14px;height:14px;display:block"
            const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path")
            p1.setAttribute("d", "M1 6L8 1l7 5v8a1 1 0 01-1 1H2a1 1 0 01-1-1V6z")
            const p2 = document.createElementNS("http://www.w3.org/2000/svg", "path")
            p2.setAttribute("d", "M6 16V10h4v6")
            svg.appendChild(p1); svg.appendChild(p2); a.appendChild(svg)
            L.DomEvent.on(a, "click", (e) => {
              L.DomEvent.stopPropagation(e)
              L.DomEvent.preventDefault(e)
              map!.flyToBounds(bounds, { maxZoom: 8, duration: 1.2 })
            })
            return bar
          },
        })
        new HomeControl({ position: "topleft" }).addTo(map)
      }

      // Minimal attribution — CARTO ToS requires credit; styled to match the palette.
      L.control.attribution({ position: "bottomright", prefix: false })
        .addAttribution('<span style="font-family:ui-monospace,monospace;font-size:8px;letter-spacing:.06em;opacity:.35">© <a href="https://carto.com" target="_blank" rel="noopener" style="color:inherit">CARTO</a> · <a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener" style="color:inherit">OSM</a></span>')
        .addTo(map)

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

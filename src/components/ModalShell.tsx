"use client"

import { useEffect, useRef } from "react"

/**
 * Full-bleed focus-trap container for the intercepted photo route. The visual
 * surface (background, layout) is painted by PhotoDetail itself so the modal
 * and the standalone page share one immersive presentation.
 */
export function ModalShell({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<Element | null>(null)

  useEffect(() => {
    returnFocusRef.current = document.activeElement
    cardRef.current?.focus()

    // Lock body scroll so iOS Safari doesn't shift fixed-position elements.
    // Persist scrollY in sessionStorage so restoration survives Next.js's own
    // scroll handling on router.back(), which fires after this cleanup runs.
    const scrollY = window.scrollY
    sessionStorage.setItem("gallery-scroll", String(scrollY))
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"
    document.body.style.overflowY = "scroll"

    return () => {
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.width = ""
      document.body.style.overflowY = ""
      // Defer past Next.js's own popstate scroll handler so we win the race.
      requestAnimationFrame(() => {
        const saved = sessionStorage.getItem("gallery-scroll")
        if (saved) {
          sessionStorage.removeItem("gallery-scroll")
          window.scrollTo(0, parseInt(saved, 10))
        }
      })
      ;(returnFocusRef.current as HTMLElement | null)?.focus()
    }
  }, [])

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const getFocusable = () =>
      Array.from(
        card.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"))

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      const focusable = getFocusable()
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    card.addEventListener("keydown", handleKeyDown)
    return () => card.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo detail"
      tabIndex={-1}
      className="fixed inset-0 z-50 overflow-hidden outline-none"
    >
      {children}
    </div>
  )
}

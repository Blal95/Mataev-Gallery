"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

export function ModalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<Element | null>(null)

  useEffect(() => {
    returnFocusRef.current = document.activeElement
    cardRef.current?.focus()
    return () => {
      ;(returnFocusRef.current as HTMLElement | null)?.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm" onClick={() => router.back()}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="Photo detail"
        tabIndex={-1}
        className="mx-auto my-6 max-w-[760px] overflow-hidden rounded-lg border border-line-2 bg-[#06080d] outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

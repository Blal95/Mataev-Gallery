"use client"

import { useEffect } from "react"

export function NoScroll() {
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = "hidden"
    return () => { html.style.overflow = prev }
  }, [])
  return null
}

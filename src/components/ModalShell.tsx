"use client"

import { useRouter } from "next/navigation"

export function ModalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm" onClick={() => router.back()}>
      <div className="mx-auto my-6 max-w-[760px] overflow-hidden rounded-lg border border-line-2 bg-[#06080d]" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

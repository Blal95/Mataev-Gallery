import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "MATAEV — Photography",
  description: "Photographs by Bilal R. Mataev.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://gallery.mataev.no"),
  title: "MATAEV — Photography",
  description: "Photographs by Bilal R. Mataev.",
  openGraph: {
    siteName: "MATAEV",
    type: "website",
    title: "MATAEV — Photography",
    description: "Photographs by Bilal R. Mataev.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MATAEV — Photography",
    description: "Photographs by Bilal R. Mataev.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

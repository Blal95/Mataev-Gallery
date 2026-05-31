import type { Metadata } from "next"
import { Playfair_Display, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const serif = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
})

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
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from "next"
import { Playfair_Display, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const serif = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  style: ["italic"],   // only italic is used across the entire site
  weight: ["400"],
  variable: "--font-playfair",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],   // 600 is unused
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://gallery.mataev.no"),
  title: "MATAEV — Photography",
  description: "Photographs by Bilal R. Mataev.",
  keywords: [
    "Bilal Mataev",
    "Bilal R. Mataev",
    "Bilal Rasulovich Mataev",
    "Mataev",
    "Mataev photography",
    "Bilal Mataev photography",
  ],
  openGraph: {
    siteName: "MATAEV",
    type: "website",
    title: "MATAEV — Photography",
    description: "Photographs by Bilal R. Mataev.",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "MATAEV — Photography",
    description: "Photographs by Bilal R. Mataev.",
    images: ["/og-image.png"],
  },
}

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Bilal R. Mataev",
  alternateName: ["Bilal Mataev", "Bilal Rasulovich Mataev", "Bilal R Mataev", "Mataev"],
  url: "https://mataev.no",
  sameAs: [
    "https://mataev.no",
    "https://github.com/Blal95",
    "https://linkedin.com/in/bilalrmataev",
  ],
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "MATAEV — Photography",
  url: "https://gallery.mataev.no",
  author: {
    "@type": "Person",
    name: "Bilal R. Mataev",
    url: "https://mataev.no",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${mono.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: "html,body{background:#0a0908;color:#efe8dd}" }} />
        <link rel="dns-prefetch" href="https://flagcdn.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}

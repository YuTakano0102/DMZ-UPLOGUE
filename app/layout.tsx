import React from "react"
import type { Metadata, Viewport } from "next"
import { DM_Sans, Noto_Sans_JP } from "next/font/google"

import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
})

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Uplogue - あなたの旅の記録が、誰かの次の旅になる",
  description:
    "写真をアップするだけで旅行記録を自動生成。Uplouge は AI 旅行記録プラットフォームです。",
  icons: {
    icon: "/favicon.svg",
  },
}

export const viewport: Viewport = {
  themeColor: "#2E3A59",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.9.3/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${dmSans.variable} ${notoSansJP.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  )
}

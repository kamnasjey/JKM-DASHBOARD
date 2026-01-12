import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/session-provider"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "JKMCOPILOT — Just Keep Moving | Trading Setup Scanner",
  description:
    "Таны дүрмээр 24/7 зах зээлийг скан хийж setup илрүүлдэг AI туслах. BUY/SELL тулгахгүй. Setups, not signals.",
  generator: "v0.app",
  openGraph: {
    title: "JKMCOPILOT — Just Keep Moving | Trading Setup Scanner",
    description:
      "Таны дүрмээр 24/7 зах зээлийг скан хийж setup илрүүлдэг AI туслах. BUY/SELL тулгахгүй. Setups, not signals.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JKMCOPILOT — Just Keep Moving | Trading Setup Scanner",
    description:
      "Таны дүрмээр 24/7 зах зээлийг скан хийж setup илрүүлдэг AI туслах. BUY/SELL тулгахгүй. Setups, not signals.",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="mn" className="dark">
      <body className={`font-sans antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Link from "next/link"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "tGHSX Portal",
  description: "Mint and unlock crypto-backed Ghana Cedi (tGHSX)",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        {/* Top Navigation */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex space-x-6">
            <Link href="/" className="font-bold text-lg text-blue-700">
              tGHSX
            </Link>
            <Link href="/mint" className="text-sm text-gray-700 hover:text-blue-600">
              Mint
            </Link>
            <Link href="/unlock" className="text-sm text-gray-700 hover:text-blue-600">
              Unlock
            </Link>
            <Link href="/status" className="text-sm text-gray-700 hover:text-blue-600">
              Status
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}

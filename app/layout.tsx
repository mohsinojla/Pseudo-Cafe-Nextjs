import "./globals.css"
import Navbar from "@/components/Navbar"
import Providers from "@/components/Providers"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pseudo Café",
  description: "Fresh food, real technology",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-white">
        <Providers>
          <Navbar />
          <main className="pt-14 min-h-screen bg-black/40">{children}</main>
        </Providers>
      </body>
    </html>
  )
}

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Nav } from "@/components/nav"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Pokepet - Transform Your Pet Into a Pokepet",
  description:
    "Upload a photo of your pet and watch as AI transforms them into a unique, collectible Pokepet with special abilities and evolutionary paths.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Nav />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

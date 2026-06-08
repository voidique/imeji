import type { Metadata, Viewport } from "next"
import { Geist_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://imeji.app"
const DESCRIPTION =
  "Imeji turns brainstorms, documents, and videos into a living concept map — explore your knowledge as a mind map and a color-coded graph, then refine it with AI."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Imeji — Turn scattered ideas into a single map",
    template: "%s · Imeji",
  },
  description: DESCRIPTION,
  applicationName: "Imeji",
  keywords: [
    "mind map",
    "concept map",
    "knowledge graph",
    "brainstorming",
    "note-taking",
    "AI mind map",
    "study tool",
    "markmap",
    "force-directed graph",
  ],
  authors: [{ name: "Imeji" }],
  creator: "Imeji",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Imeji",
    url: "/",
    title: "Imeji — Turn scattered ideas into a single map",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Imeji — Turn scattered ideas into a single map",
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export const viewport: Viewport = {
  themeColor: "#f4f4f4",
  colorScheme: "light",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased font-sans", fontMono.variable)}
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}

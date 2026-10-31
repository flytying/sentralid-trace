import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

// Fonts are committed (src/app/fonts, SIL OFL 1.1) so `npm run build` never needs the network —
// next/font/google fetches from fonts.googleapis.com at build time and fails behind proxies or offline.
const geistSans = localFont({ src: "./fonts/Geist-Variable.woff2", variable: "--font-geist-sans", weight: "100 900", display: "swap" });
const geistMono = localFont({ src: "./fonts/GeistMono-Variable.woff2", variable: "--font-geist-mono", weight: "100 900", display: "swap" });

export const metadata: Metadata = {
  title: "SentralID Trace — Verify Before You Book",
  description:
    "Check a Philippine hotel or resort booking channel against independently sourced records before you pay a deposit.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f4f8f8" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* Browser extensions (e.g. Web of Trust) add attributes to <body> before React loads.
          This only ignores attribute differences on <body> itself, not anything inside it. */}
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <div className="shell">
          <SiteHeader />
          <main className="container">{children}</main>
          <footer className="container" style={{ padding: "20px", fontSize: "var(--fs-sm)", color: "var(--muted)", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", borderTop: "1px solid var(--line-2)" }}>
            <span>SentralID Trace · Hackathon prototype. Not a guarantee of authenticity or booking safety.</span>
            <span style={{ display: "flex", gap: 14 }}>
              <Link href="/about#privacy">Privacy</Link>
              <Link href="/about">Limitations</Link>
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}

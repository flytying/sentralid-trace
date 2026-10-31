import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "SentralID Trace — Verify Before You Book",
  description:
    "Check a Philippine hotel or resort booking channel against independently sourced records before you pay a deposit.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f4f8f8" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
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

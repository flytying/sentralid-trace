import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata = { title: "About & limits — SentralID Trace" };

const h2 = { margin: 0, fontSize: "var(--fs-h3)", fontWeight: 500 } as const;
const p = { margin: 0, fontSize: "var(--fs-body)", lineHeight: 1.6, color: "var(--text-2)" } as const;
const list = { margin: 0, paddingLeft: 18, fontSize: "var(--fs-body)", lineHeight: 1.6, color: "var(--text-2)" } as const;

export default function AboutPage() {
  return (
    <div className="fade-in" style={{ maxWidth: 760, padding: "40px 0 56px", display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: "var(--fs-h1)", letterSpacing: "-0.02em", fontWeight: 500 }}>
          What Trace can — and can&apos;t — tell you
        </h1>
        <p style={{ ...p, fontSize: "var(--fs-h3)", lineHeight: 1.55 }}>
          Trace compares what you send us with the details we have on file for a resort, each backed by an independent
          source. We tell you what matches, what doesn&apos;t, and what we can&apos;t tell. We can&apos;t decide for you
          if a page is real or if paying is safe.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ ...h2, fontSize: "var(--fs-title)", fontWeight: 600 }}>What it can check</h2>
          <ul style={list}>
            <li>Whether a Facebook link is a resort&apos;s page on file</li>
            <li>Whether names and contact details you saw match what we have on file</li>
            <li>What&apos;s most useful to check next</li>
          </ul>
        </div>
        <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 style={{ ...h2, fontSize: "var(--fs-title)", fontWeight: 600 }}>What it can&apos;t check</h2>
          <ul style={list}>
            <li>Who is actually typing in a Messenger chat</li>
            <li>Whether a GCash, Maya or bank account belongs to the business</li>
            <li>Resorts we don&apos;t have on file</li>
            <li>Anything on Facebook directly — we never open pages</li>
          </ul>
        </div>
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={h2}>Where our records come from</h2>
        <p style={p}>
          For each resort, we record its Facebook page only when a separate, identifiable source — such as a local
          tourism office directory or the resort&apos;s own website — links to that exact page. We note the source, how
          we checked it, and when. A record supports only that page link; it says nothing about chat senders, booking
          agents or payment accounts. The sample cases on this site are demo scenarios with fictional resorts, and are labelled as such.
        </p>
      </section>

      <section id="privacy" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={h2}>How screenshots are processed</h2>
        <p style={p}>
          Screenshots you submit are sent to the Meta Model API (Muse Spark, Standard mode) to read visible text such
          as page names, handles and contact details. Please hide OTPs, ID numbers, private addresses, account balances
          and unrelated personal information first. Trace does not store your screenshots or chats on its servers and
          does not write them to logs. This hackathon build runs on Meta&apos;s free API credits; under those terms, Meta may use
          submitted content to improve its products. Pasted links are compared with our records and are never opened.
        </p>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={h2}>Why our results aren&apos;t a guarantee</h2>
        <p style={p}>
          Our records can be out of date, and screenshots can miss things. &ldquo;Matches&rdquo; means a detail is the
          same as our record; &ldquo;doesn&apos;t match&rdquo; means it&apos;s different. Neither proves a scam, and
          neither means paying is safe. Always confirm the booking through a channel you found independently before
          paying.
        </p>
      </section>

      <div>
        <Link href="/investigate" className="btn btn-primary">
          Check a booking
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

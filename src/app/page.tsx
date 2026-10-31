import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CircleCheck,
  CircleHelp,
  Hotel,
  ImageUp,
  ListChecks,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import styles from "./page.module.css";

const STEPS = [
  { icon: Search, title: "Find the resort", body: "Type its name or paste its Facebook link." },
  { icon: ImageUp, title: "Show us what you have", body: "The page link, a screenshot of the page, or your chat. One is enough." },
  { icon: ListChecks, title: "See what we found", body: "We compare it with the resort's documented details and show what matches and what doesn't." },
  { icon: ShieldCheck, title: "Do one quick check", body: "We suggest one thing to check before you pay, then update your result." },
];

export default function Home() {
  return (
    <div className="fade-in">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.pill}>For hotel &amp; resort bookings on Facebook</span>
          <h1 className={styles.title}>Verify Before You Book.</h1>
          <p className={styles.lede}>
            Found a resort on Facebook but not sure it&apos;s real? Share the page link, or a screenshot of the page or
            your Messenger chat with them. We&apos;ll tell you what checks out, what doesn&apos;t, and what to do before
            you pay.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/investigate" className="btn btn-primary">
              Check a booking
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <span className={styles.ctaNote}>Free, no sign-up</span>
          </div>
        </div>

        <div className={styles.art} aria-hidden="true">
          <div className={styles.artBg} />
          <div className={styles.mock}>
            <div className={styles.mockHead}>
              <span className={styles.mockIcon}>
                <Hotel size={18} />
              </span>
              <span className={styles.mockName}>
                <strong>Bahay Dagat Resort</strong>
                <span>Moalboal, Cebu · made-up example</span>
              </span>
            </div>
            <div className={styles.mockAlert}>
              <TriangleAlert size={18} />
              <span>Some details don&apos;t match our records</span>
            </div>
            <div>
              <div className={styles.mockRow}>
                <CircleCheck size={16} color="var(--ok-icon)" />
                <span>Name looks like the resort&apos;s</span>
                <span className="chip chip-ok">Matches</span>
              </div>
              <div className={styles.mockRow}>
                <TriangleAlert size={16} color="var(--warn-icon)" />
                <span>Page link is different</span>
                <span className="chip chip-warn">Doesn&apos;t match</span>
              </div>
              <div className={styles.mockRow}>
                <CircleHelp size={16} color="var(--unk-icon)" />
                <span>Whose GCash account it is</span>
                <span className="chip chip-unk">Can&apos;t tell yet</span>
              </div>
            </div>
            <div className={styles.mockNext}>
              <span>
                <small>One thing to check next</small>
                Does the resort run this page?
              </span>
              <ArrowRight size={18} color="var(--brand-pale)" />
            </div>
          </div>
          <div className={styles.onFile}>
            <small>Page on file</small>
            <span className="mono">fb.com/bahaydagatmoalboal</span>
          </div>
        </div>
      </section>

      <section className={styles.steps} aria-labelledby="how-it-works">
        <div className={styles.stepsHead}>
          <span className="eyebrow">How it works</span>
          <h2 id="how-it-works">Check a booking in four steps</h2>
        </div>
        <ol className={styles.stepGrid}>
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className={`card ${styles.step}`}>
              <span className={styles.stepTop}>
                <span className={styles.stepIcon}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <span className={styles.stepNum}>{String(i + 1).padStart(2, "0")}</span>
              </span>
              <strong>{title}</strong>
              <span>{body}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

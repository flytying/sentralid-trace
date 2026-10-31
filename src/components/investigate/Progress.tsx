import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { Shot } from "./EvidenceForm";
import styles from "./workspace.module.css";

// What the extraction schema asks the model to read (lib/meta/extract.ts). Shown as a list of
// targets, not as live progress: the call is one request and doesn't report which field it's on.
const TARGETS = ["Page address", "Page name", "Phone numbers", "Payment requests", "Booking terms", "Chat sender"];

// Truthful stages: only "Reading evidence" takes real time, and only when screenshots were sent.
// No percentages — the call is indeterminate. The timer shows real elapsed time.
export function Progress({ usesModel, shots }: { usesModel: boolean; shots: { shot: Shot; caption: string }[] }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => setElapsed((performance.now() - start) / 1000), 100);
    return () => window.clearInterval(id);
  }, []);

  const stages = [
    { label: "Checking what you sent", state: "done" as const },
    usesModel
      ? { label: "Reading your screenshots with Meta AI (live)", state: "active" as const }
      : { label: "Comparing your link with our records — no AI needed", state: "active" as const },
    { label: "Comparing with our records", state: "todo" as const, hidden: !usesModel },
    { label: "Preparing what we found", state: "todo" as const },
  ].filter((s) => !("hidden" in s && s.hidden));

  return (
    <div className={`${styles.panel} fade-in`} role="status" aria-live="polite">
      <div className={styles.headBlock}>
        <h1 className={styles.h1} tabIndex={-1}>
          Checking your booking
        </h1>
        <p className={styles.sub}>
          {usesModel
            ? "This usually takes 5–15 seconds. Your screenshots are read once and not stored."
            : "We only compare the link. We don't open the page."}
        </p>
      </div>
      <div className={`card ${styles.progress}`}>
        <div className={styles.progressHead}>
          <div className={styles.indet} aria-hidden="true">
            <span />
          </div>
          <span className={`mono ${styles.timer}`} aria-hidden="true">
            {elapsed.toFixed(1)} s
          </span>
        </div>

        {usesModel && shots.length > 0 && (
          <div className={styles.scanStrip} aria-hidden="true">
            {shots.map(({ shot, caption }, i) => (
              <figure key={shot.previewUrl} className={styles.scanShot} style={{ animationDelay: `${i * 90}ms` }}>
                <div className={styles.scanFrame}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                  <img src={shot.previewUrl} alt="" decoding="async" />
                  <span className={styles.scanBeam} style={{ animationDelay: `${i * 450}ms` }} />
                </div>
                <figcaption>{caption}</figcaption>
              </figure>
            ))}
          </div>
        )}

        {usesModel && (
          <div className={styles.targets} aria-hidden="true">
            <span className={styles.targetsLabel}>Meta AI looks for</span>
            {TARGETS.map((t, i) => (
              <span key={t} className={styles.target} style={{ animationDelay: `${i * 0.6}s`, animationDuration: `${TARGETS.length * 0.6}s` }}>
                {t}
              </span>
            ))}
          </div>
        )}

        <ol className={styles.stageList}>
          {stages.map((s) => (
            <li key={s.label} data-state={s.state}>
              <span className={styles.stageDot} aria-hidden="true">
                {s.state === "done" ? <Check size={14} /> : s.state === "active" ? <span className={styles.spinner} /> : null}
              </span>
              <span>
                {s.label}
                <span className="sr-only">{s.state === "done" ? " — done" : s.state === "active" ? " — in progress" : " — waiting"}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.skeletons} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`card ${styles.skeletonRow}`} style={{ animationDelay: `${i * 120}ms` }}>
            <span className={styles.skelDot} />
            <span className={styles.skelLine} style={{ width: `${[46, 58, 38][i]}%` }} />
            <span className={styles.skelChip} />
          </div>
        ))}
      </div>
    </div>
  );
}

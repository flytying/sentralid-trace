import { Check } from "lucide-react";
import styles from "./workspace.module.css";

// Truthful stages: only "Reading evidence" takes real time, and only when screenshots were sent.
// No percentages — the call is indeterminate.
export function Progress({ usesModel }: { usesModel: boolean }) {
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
        <div className={styles.indet} aria-hidden="true">
          <span />
        </div>
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
    </div>
  );
}

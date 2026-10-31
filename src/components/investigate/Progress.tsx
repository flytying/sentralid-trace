import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Shot } from "./EvidenceForm";
import styles from "./workspace.module.css";

// What the extraction schema asks the model to read (lib/meta/extract.ts). Shown as a list of
// targets, not as live progress: the call is one request and doesn't report which field it's on.
const TARGETS = ["Page address", "Page name", "Phone numbers", "Payment requests", "Booking terms", "Chat sender"];

/** How long each finishing stage stays "in progress" once the server has answered. */
const STEP_MS = 600;

interface Props {
  usesModel: boolean;
  shots: { shot: Shot; caption: string }[];
  /** Set once the server has answered: the remaining stages play out, then onFinished runs. */
  done: boolean;
  /** Real Meta extraction time, shown on the reading stage once it's done. */
  modelMs: number | null;
  onFinished: () => void;
}

// Truthful stages. The server does the reading, comparing and preparing in one request, so while
// it runs only the reading stage is active and the bar eases toward 80% with real elapsed time.
// When the answer arrives, comparing and preparing (which really ran) are shown completing in turn.
export function Progress({ usesModel, shots, done, modelMs, onFinished }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [finishStep, setFinishStep] = useState(0);
  const finished = useRef(onFinished);
  useEffect(() => {
    finished.current = onFinished;
  }, [onFinished]);

  useEffect(() => {
    if (done) return;
    const start = performance.now();
    const id = window.setInterval(() => setElapsed((performance.now() - start) / 1000), 100);
    return () => window.clearInterval(id);
  }, [done]);

  // 0 = waiting, 1 = comparing, 2 = preparing, 3 = all done.
  useEffect(() => {
    if (!done) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = reduced ? 150 : STEP_MS;
    const timers = [1, 2, 3].map((n) => window.setTimeout(() => setFinishStep(n), (n - 1) * step));
    timers.push(window.setTimeout(() => finished.current(), 3 * step + (reduced ? 0 : 350)));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [done]);

  const reading = usesModel ? "Reading your screenshots with Meta AI (live)" : "Comparing your link with our records — no AI needed";
  const readDone = usesModel && modelMs !== null ? `Read your screenshots with Meta AI · ${(modelMs / 1000).toFixed(1)} s` : reading;
  type State = "done" | "active" | "todo";
  const stages: { label: string; state: State }[] = [
    { label: "Checking what you sent", state: "done" },
    { label: finishStep >= 1 ? readDone : reading, state: finishStep >= 1 ? "done" : "active" },
    ...(usesModel ? [{ label: "Comparing with our records", state: (finishStep >= 2 ? "done" : finishStep === 1 ? "active" : "todo") as State }] : []),
    { label: "Preparing what we found", state: finishStep >= 3 ? "done" : finishStep >= (usesModel ? 2 : 1) ? "active" : "todo" },
  ];

  // Eases toward 80% while waiting (never claims to be nearly done), then steps to 100%.
  const waiting = 12 + 68 * (1 - Math.exp(-elapsed / 5));
  const pct = finishStep === 0 ? waiting : finishStep === 1 ? 88 : finishStep === 2 ? 96 : 100;

  return (
    <div className={`${styles.panel} fade-in`} role="status" aria-live="polite">
      <div className={styles.headBlock}>
        <h1 className={styles.h1} tabIndex={-1}>
          {finishStep >= 3 ? "Done — here's what we found" : "Checking your booking"}
        </h1>
        <p className={styles.sub}>
          {usesModel
            ? "This usually takes 5–15 seconds. Your screenshots are read once and not stored."
            : "We only compare the link. We don't open the page."}
        </p>
      </div>
      <div className={`card ${styles.progress}`}>
        <div className={styles.progressHead}>
          <div className={styles.bar} aria-hidden="true" data-finishing={finishStep > 0}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className={`mono ${styles.timer}`} aria-hidden="true">
            {elapsed.toFixed(1)} s
          </span>
        </div>

        {usesModel && shots.length > 0 && (
          <div className={styles.scanStrip} aria-hidden="true" data-done={finishStep > 0}>
            {shots.map(({ shot, caption }, i) => (
              <figure key={shot.previewUrl} className={styles.scanShot} style={{ animationDelay: `${i * 90}ms` }}>
                <div className={styles.scanFrame}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                  <img src={shot.previewUrl} alt="" decoding="async" />
                  <span className={styles.scanBeam} style={{ animationDelay: `${i * -0.9}s` }} />
                  <span className={styles.scanCheck}>
                    <Check size={14} />
                  </span>
                </div>
                <figcaption>{caption}</figcaption>
              </figure>
            ))}
          </div>
        )}

        {usesModel && (
          <div className={styles.targets} aria-hidden="true" data-done={finishStep > 0}>
            <span className={styles.targetsLabel}>Meta AI looks for</span>
            <div className={styles.targetList}>
              {TARGETS.map((t, i) => (
                <span key={t} className={styles.target} style={{ animationDelay: `${i * 0.9}s`, animationDuration: `${TARGETS.length * 0.9}s` }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <ol className={styles.stageList}>
          {stages.map((s, i) => (
            <li key={i} data-state={s.state}>
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

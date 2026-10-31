import { STEPS, type StepId } from "./types";
import styles from "./workspace.module.css";

export function Stepper({ current }: { current: StepId }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <ol aria-label="Progress" className={styles.stepper}>
      {STEPS.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "current" : "todo";
        return (
          <li key={s.id} className={styles.step} data-state={state} aria-current={state === "current" ? "step" : undefined}>
            {i > 0 && <span className={styles.stepLine} data-on={i <= idx} aria-hidden="true" />}
            <span className={styles.stepDot} aria-hidden="true">
              <span />
            </span>
            <span className={styles.stepText}>
              <span className={styles.stepNum}>Step {i + 1}</span>
              <span className={styles.stepLabel}>
                {s.label}
                <span className="sr-only">{state === "done" ? " (done)" : state === "current" ? " (current)" : ""}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

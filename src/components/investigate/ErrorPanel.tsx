import { TriangleAlert } from "lucide-react";
import styles from "./workspace.module.css";

export interface ClientError {
  code: string;
  message: string;
  recoverable: boolean;
  requestId?: string;
}

const TITLE: Record<string, string> = {
  MODEL_RATE_LIMITED: "Live analysis is busy",
  MODEL_TIMEOUT: "Live analysis took too long",
  MODEL_UNAVAILABLE: "Live analysis is unavailable",
  MODEL_BAD_RESPONSE: "Live analysis gave an unusable answer",
  CONFIG_INVALID: "Live analysis isn't set up",
  NETWORK: "We couldn't reach Trace",
};

export function ErrorPanel({ error, onRetry, onEdit, onRestart }: { error: ClientError; onRetry: () => void; onEdit: () => void; onRestart: () => void }) {
  const isInput = !(error.code in TITLE);
  return (
    <div className={`${styles.panel} fade-in`}>
      <div className={styles.headBlock}>
        <h1 className={styles.h1} tabIndex={-1}>
          Check didn&apos;t finish
        </h1>
      </div>
      <div className={styles.errorCard} data-aside-anchor="" role="alert">
        <TriangleAlert size={20} aria-hidden="true" />
        <div>
          <strong>{TITLE[error.code] ?? "Something in what you sent needs fixing"}</strong>
          <p>{error.message}</p>
          <p className={styles.help}>
            We never guess a result when something goes wrong. Code <span className="mono">{error.code}</span>
            {error.requestId && <> · ref <span className="mono">{error.requestId}</span></>}
          </p>
        </div>
      </div>
      <div className={styles.actions}>
        {isInput ? (
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            Change what I sent
          </button>
        ) : (
          error.recoverable && (
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              Try again
            </button>
          )
        )}
        {!isInput && (
          <button type="button" className="btn btn-secondary" onClick={onEdit}>
            Change what I sent
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onRestart}>
          Start a new check
        </button>
      </div>
    </div>
  );
}

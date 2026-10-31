"use client";

import { useId, useRef, useState } from "react";
import { ArrowRight, ExternalLink, ImageUp, ShieldCheck, X } from "lucide-react";
import { FACEBOOK_URL_ERROR_TEXT, displayFacebookUrl, parseFacebookUrl } from "@/lib/facebook-url";
import type { NextCheck } from "@/lib/verify/plan";
import { PrepareError, prepareImage } from "./compress";
import { displayUrl } from "./format";
import styles from "./workspace.module.css";

export type FollowUp =
  | { kind: "url"; url: string }
  | { kind: "image"; file: File; consent: true }
  | { kind: "report"; answer: "confirmed" | "denied" | "no_answer" };

/** Compact card shown on the findings screen. */
export function NextCheckCard({ next, onStart, synthetic }: { next: NextCheck; onStart: () => void; synthetic: boolean }) {
  if (next.status !== "check_available") {
    return (
      <div className={styles.nextInfo}>
        <span className={styles.nextEyebrow}>{next.status === "no_material_issue" ? "No further check needed" : "No safe check available"}</span>
        <strong>{next.question}</strong>
        <p>{next.whyItMatters}</p>
      </div>
    );
  }
  return (
    <div className={styles.nextCard}>
      <span className={styles.nextEyebrow}>One thing to check next</span>
      <strong>{next.question}</strong>
      <p>{next.whyItMatters}</p>
      <div className={styles.nextFoot}>
        <button type="button" className={styles.nextBtn} onClick={onStart}>
          Let&apos;s check <ArrowRight size={16} aria-hidden="true" />
        </button>
        <span className={styles.nextMeta}>
          {next.selectedBy === "model" ? "Chosen with Meta AI from our list of safe checks" : "Chosen by our rules from our list of safe checks"}
          {synthetic ? " · made-up sample" : ""}
        </span>
      </div>
    </div>
  );
}

interface Props {
  next: NextCheck;
  synthetic: boolean;
  sampleLink?: string;
  busy: boolean;
  error: string | null;
  onSubmit: (f: FollowUp) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function CheckView({ next, synthetic, sampleLink, busy, error, onSubmit, onSkip, onBack }: Props) {
  const check = next.check!;
  const ids = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"url" | "image">("url");
  const [url, setUrl] = useState("");
  const [shot, setShot] = useState<{ file: File; preview: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState<"" | "confirmed" | "denied" | "no_answer">("");
  const [fileErr, setFileErr] = useState<string | null>(null);

  const parsed = url.trim() ? parseFacebookUrl(url) : null;
  const isReport = check.resolution === "user_report";
  const canSend = !busy && (isReport ? Boolean(answer) : mode === "url" ? Boolean(parsed?.ok) : Boolean(shot) && consent);

  function submit() {
    if (!canSend) return;
    if (isReport) onSubmit({ kind: "report", answer: answer as "confirmed" });
    else if (mode === "url") onSubmit({ kind: "url", url: url.trim() });
    else onSubmit({ kind: "image", file: shot!.file, consent: true });
  }

  return (
    <div className={`${styles.panel} stagger`}>
      <div className={styles.headBlock}>
        <span className={styles.eyebrowMuted}>One thing to check{synthetic ? " · made-up sample" : ""}</span>
        <h1 className={styles.h1} tabIndex={-1}>
          {next.question}
        </h1>
      </div>

      {next.hypotheses && (
        <div className={styles.hypGrid}>
          <div className={styles.hyp}>
            <span className={styles.hypLabel}>Possibility A</span>
            <span>{next.hypotheses.a}</span>
          </div>
          <div className={styles.hyp}>
            <span className={styles.hypLabel}>Possibility B</span>
            <span>{next.hypotheses.b}</span>
          </div>
        </div>
      )}
      <p className={styles.explain}>{next.whyItMatters}</p>

      <section className={`card ${styles.checkBox}`} aria-labelledby={`${ids}-safe`}>
        <span className={styles.nextEyebrowDark} id={`${ids}-safe`}>
          <ShieldCheck size={15} aria-hidden="true" /> The safest check we can suggest
        </span>
        <strong className={styles.checkLabel}>{check.label}</strong>
        <p className={styles.explain}>{check.how}</p>
        <div className={styles.documented}>
          <span className={styles.compareLabel}>{isReport ? "Number on file" : "Pages on file"}</span>
          {check.documented.map((d) => (
            <span key={d} className="mono">
              {d}
            </span>
          ))}
        </div>
        {check.sources.map((s) =>
          synthetic ? (
            <span key={s.id} className={styles.help}>
              From: {s.title} <span className="mono">({s.url} — made up, doesn&apos;t open)</span>
            </span>
          ) : (
            <a key={s.id} className={styles.sourceUrl} href={s.url} target="_blank" rel="noopener noreferrer nofollow">
              Open the source: {s.title} <ExternalLink size={12} aria-label="opens in a new tab" />
            </a>
          ),
        )}
        <p className={styles.help}>Never pay, share codes, or ask the account you&apos;re unsure about for proof while you check.</p>
      </section>

      {next.implications && (
        <section className={styles.implGrid} aria-label="What the answer could mean">
          <div>
            <span className={styles.hypLabel}>Points to A</span>
            <span>{next.implications.a}</span>
          </div>
          <div>
            <span className={styles.hypLabel}>Points to B</span>
            <span>{next.implications.b}</span>
          </div>
          <div>
            <span className={styles.hypLabel}>Still unclear</span>
            <span>{next.implications.unclear}</span>
          </div>
        </section>
      )}

      <form
        className={`card ${styles.field}`}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
      >
        <span className={styles.label}>{isReport ? "What did the resort tell you?" : "Add what you found"}</span>

        {isReport ? (
          <fieldset className={styles.radioSet}>
            <legend className="sr-only">What did the resort tell you?</legend>
            {(
              [
                ["confirmed", "They said the page or number is theirs"],
                ["denied", "They said it isn't theirs"],
                ["no_answer", "I couldn't reach them"],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className={styles.checkRow}>
                <input type="radio" name="answer" value={v} checked={answer === v} onChange={() => setAnswer(v)} />
                {label}
              </label>
            ))}
            <span className={styles.help}>We&apos;ll keep this as your note. It can&apos;t change our records or your result by itself.</span>
          </fieldset>
        ) : (
          <>
            <div className={styles.tabs} role="group" aria-label="How to add it">
              <button type="button" aria-pressed={mode === "url"} onClick={() => setMode("url")}>
                Page link
              </button>
              <button type="button" aria-pressed={mode === "image"} onClick={() => setMode("image")}>
                Screenshot
              </button>
            </div>
            {mode === "url" ? (
              <>
                <label htmlFor={`${ids}-url`} className="sr-only">
                  Facebook link of the page you&apos;re talking to
                </label>
                <input
                  id={`${ids}-url`}
                  className={styles.input}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="facebook.com/pagename"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="url"
                  aria-invalid={Boolean(parsed && !parsed.ok)}
                />
                <span className={parsed && !parsed.ok ? styles.errText : styles.help}>
                  {parsed && !parsed.ok
                    ? FACEBOOK_URL_ERROR_TEXT[parsed.error]
                    : parsed?.ok
                      ? <>We&apos;ll compare <span className="mono">{displayFacebookUrl(parsed)}</span> with the pages on file. We won&apos;t open it.</>
                      : "Copy the address of the page you're chatting with, from your browser or the Facebook app's “Copy link”."}
                </span>
                {sampleLink && !url && (
                  <button type="button" className={styles.linkBtn} onClick={() => setUrl(sampleLink)}>
                    Use the sample&apos;s page link ({displayUrl(sampleLink)})
                  </button>
                )}
              </>
            ) : (
              <>
                {shot ? (
                  <div className={styles.shot}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                    <img src={shot.preview} alt="New screenshot preview" className={styles.thumb} />
                    <span className={styles.shotMain}>
                      <strong>New screenshot</strong>
                      <span className={styles.help}>{Math.round(shot.file.size / 1024)} KB</span>
                    </span>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      aria-label="Remove new screenshot"
                      onClick={() => {
                        URL.revokeObjectURL(shot.preview);
                        setShot(null);
                      }}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button type="button" className={styles.drop} onClick={() => fileRef.current?.click()}>
                    <ImageUp size={20} aria-hidden="true" />
                    <span>
                      <strong>Choose a screenshot that shows the page&apos;s address</strong>
                      <span className={styles.help}>It will be read live by Meta AI</span>
                    </span>
                  </button>
                )}
                {fileErr && <span role="alert" className={styles.errText}>{fileErr}</span>}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setFileErr(null);
                    try {
                      const p = await prepareImage(f);
                      setShot({ file: p, preview: URL.createObjectURL(p) });
                    } catch (err) {
                      setFileErr(err instanceof PrepareError ? err.message : "We couldn't add that image.");
                    }
                  }}
                />
                {shot && (
                  <label className={styles.checkRow}>
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    I&apos;ve covered up private details, and I&apos;m okay with Meta AI reading this screenshot.
                  </label>
                )}
              </>
            )}
          </>
        )}

        {error && (
          <p role="alert" className={styles.errText}>
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary" disabled={!canSend}>
            {busy ? "Updating your result…" : isReport ? "Add and update my result" : "Compare and update my result"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onSkip} disabled={busy}>
            I can&apos;t check this
          </button>
        </div>
        <span className={styles.help}>You can add one follow-up per check.</span>
      </form>

      <div>
        <button type="button" className={styles.linkBtn} onClick={onBack} disabled={busy}>
          ‹ Back to what we found
        </button>
      </div>
    </div>
  );
}

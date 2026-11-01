"use client";

import { useId, useRef, useState } from "react";
import { ArrowRight, ExternalLink, ImageUp, ShieldAlert, ShieldCheck, X, ZoomIn } from "lucide-react";
import { FACEBOOK_URL_ERROR_TEXT, displayFacebookUrl, parseFacebookUrl } from "@/lib/facebook-url";
import type { NextCheck } from "@/lib/verify/plan";
import { PrepareError, prepareImage } from "./compress";
import { displayUrl } from "./format";
import { ImageViewer } from "./ImageViewer";
import styles from "./workspace.module.css";

export type FollowUp =
  | { kind: "url"; url: string }
  | { kind: "image"; file: File; consent: true }
  | { kind: "report"; answer: string };

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
          {next.selectedBy === "model" ? "Chosen with Muse Spark from our list of safe checks" : "Chosen by our rules from our list of safe checks"}
          {synthetic ? " · demo scenario" : ""}
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

// Checks the user answers themselves. The answers are kept as notes and never change a finding.
const REPORTS = {
  CHECK_REGISTERED_CONTACT_POLICY: {
    documentedLabel: "Number on file",
    prompt: "What did the resort tell you?",
    answers: [
      ["confirmed", "They said the page or number is theirs"],
      ["denied", "They said it isn't theirs"],
      ["no_answer", "I couldn't reach them"],
    ],
  },
  MESSAGE_FROM_LISTED_PAGE: {
    documentedLabel: "Page on file",
    prompt: "What happened when you tapped Message?",
    answers: [
      ["same_chat", "It opened the same conversation"],
      ["new_chat", "It opened a new, empty chat"],
      ["cant_tell", "I couldn't tell"],
    ],
  },
} as const;

export function CheckView({ next, synthetic, sampleLink, busy, error, onSubmit, onSkip, onBack }: Props) {
  const check = next.check!;
  const ids = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"url" | "image">("url");
  const [url, setUrl] = useState("");
  const [shot, setShot] = useState<{ file: File; preview: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [answer, setAnswer] = useState("");
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);

  const parsed = url.trim() ? parseFacebookUrl(url) : null;
  const isReport = check.resolution === "user_report";
  const report = REPORTS[check.actionId as keyof typeof REPORTS];
  const canSend = !busy && (isReport ? Boolean(answer) : mode === "url" ? Boolean(parsed?.ok) : Boolean(shot) && consent);

  function submit() {
    if (!canSend) return;
    if (isReport) onSubmit({ kind: "report", answer });
    else if (mode === "url") onSubmit({ kind: "url", url: url.trim() });
    else onSubmit({ kind: "image", file: shot!.file, consent: true });
  }

  return (
    <div className={`${styles.panel} stagger`}>
      <div className={styles.headBlock}>
        <span className={styles.eyebrowMuted}>One thing to check{synthetic ? " · demo scenario" : ""}</span>
        <h1 className={styles.h1} tabIndex={-1}>
          {next.question}
        </h1>
        <p className={styles.sub}>{next.whyItMatters}</p>
      </div>

      <section className={`card ${styles.checkMain}`} data-aside-anchor="" aria-labelledby={`${ids}-do`}>
        <div className={styles.checkIntro}>
          <span className={styles.stepEyebrow} id={`${ids}-do`}>
            <ShieldCheck size={15} aria-hidden="true" /> What to do
          </span>
          <p className={styles.checkHow}>{check.how}</p>
          <div className={styles.onFile}>
            <span className={styles.onFileLabel}>{report?.documentedLabel ?? "Pages on file"}</span>
            <span className={styles.onFileChips}>
              {check.documented.map((d) => (
                <span key={d} className={`mono ${styles.fileChip}`}>
                  {d}
                </span>
              ))}
            </span>
          </div>
          {check.sources.map((s) =>
            synthetic ? (
              <span key={s.id} className={styles.help}>
                Source: {s.title} · demo source, doesn&apos;t open
              </span>
            ) : (
              <a key={s.id} className={styles.sourceUrl} href={s.url} target="_blank" rel="noopener noreferrer nofollow">
                Source: {s.title} <ExternalLink size={12} aria-label="opens in a new tab" />
              </a>
            ),
          )}
        </div>
        <form
          className={styles.checkForm}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
          <span className={styles.formLabel}>{report?.prompt ?? "Add the page you're talking to"}</span>

          {isReport ? (
            <fieldset className={styles.radioSet}>
              <legend className="sr-only">{report?.prompt}</legend>
              {(report?.answers ?? []).map(([v, label]) => (
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
                    <button type="button" className={styles.sampleChip} onClick={() => setUrl(sampleLink)}>
                      Use the sample&apos;s link <span className="mono">{displayUrl(sampleLink)}</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  {shot ? (
                    <div className={styles.shot}>
                      <button type="button" className={styles.thumbBtn} onClick={() => setViewing(true)} aria-label="View new screenshot full size">
                        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                        <img src={shot.preview} alt="" className={styles.thumb} />
                        <span className={styles.thumbZoom} aria-hidden="true">
                          <ZoomIn size={14} />
                        </span>
                      </button>
                      {viewing && <ImageViewer src={shot.preview} caption="New screenshot" onClose={() => setViewing(false)} />}
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
                        <span className={styles.help}>It will be read live by Muse Spark</span>
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
                      I&apos;ve covered up private details, and I&apos;m okay with Meta&apos;s Muse Spark reading this screenshot.
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
            <button type="button" className={styles.skipBtn} onClick={onSkip} disabled={busy}>
              I can&apos;t check this
            </button>
          </div>
          <p className={styles.formNote}>
            <ShieldAlert size={14} aria-hidden="true" />
            Never pay, share codes, or ask the account you&apos;re unsure about for proof. You can add one follow-up per check.
          </p>
        </form>
      </section>

      {next.hypotheses && (
        <section className={styles.outcomes} aria-labelledby={`${ids}-out`}>
          <h2 id={`${ids}-out`} className={styles.outcomesHead}>
            What the answer tells you
          </h2>
          <div className={styles.outcomeGrid}>
            {(["a", "b"] as const).map((k) => (
              <div key={k} className={styles.outcomeCard}>
                <span className={styles.badge} data-k={k} aria-hidden="true">
                  {k.toUpperCase()}
                </span>
                <div>
                  <strong>{next.hypotheses![k]}</strong>
                  {next.implications && <p>{next.implications[k]}</p>}
                </div>
              </div>
            ))}
          </div>
          {next.implications && (
            <p className={styles.unclearNote}>
              <span className={styles.badge} data-k="u" aria-hidden="true">
                ?
              </span>
              <span>{next.implications.unclear}</span>
            </p>
          )}
        </section>
      )}

      <div>
        <button type="button" className={styles.linkBtn} onClick={onBack} disabled={busy}>
          ‹ Back to what we found
        </button>
      </div>
    </div>
  );
}

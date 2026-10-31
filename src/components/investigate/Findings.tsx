"use client";

import { useState } from "react";
import { ChevronDown, CircleCheck, CircleHelp, Cpu, Link2, TriangleAlert } from "lucide-react";
import type { AnalyzeResponse } from "@/lib/case/state";
import { FIELD_LABEL, NOT_A_GUARANTEE, OUTCOME_COPY, STATE_CHIP, findingCopy } from "@/lib/engine/copy";
import type { Finding, FindingState } from "@/lib/engine/types";
import { NextCheckCard } from "./CheckView";
import { formatDate } from "./format";
import type { ReferenceView } from "./types";
import styles from "./workspace.module.css";

const GROUPS: { state: FindingState; label: string; short: string; desc: string; empty: string }[] = [
  { state: "different_from_reference", label: "What doesn't match", short: "don't match", desc: "Details that differ from what our sources record.", empty: "Nothing we compared was different from our records." },
  { state: "match", label: "What matches", short: "match", desc: "Details that are the same as our records.", empty: "Nothing could be matched to our records." },
  { state: "unknown", label: "What we can't tell", short: "can't tell", desc: "Things a screenshot or link can't prove, or that we had nothing to compare with.", empty: "" },
];

const ICON = { ok: CircleCheck, warn: TriangleAlert, unk: CircleHelp };

interface FindingsProps {
  result: AnalyzeResponse;
  reference: ReferenceView | null;
  note: string;
  onEdit: () => void;
  onRestart: () => void;
  onStartCheck: () => void;
  onFinish: () => void;
}

export function Findings({ result, reference, note, onEdit, onRestart, onStartCheck, onFinish }: FindingsProps) {
  const outcome = OUTCOME_COPY[result.outcome];
  const OutcomeIcon = ICON[outcome.tone];
  const obsById = new Map(result.observations.map((o) => [o.id, o]));
  const inputLabel = new Map(result.inputs.map((i) => [i.id, i.label]));
  const counts = GROUPS.map((g) => ({ g, n: result.findings.filter((f) => f.state === g.state).length }));

  return (
    <div className={`${styles.panel} stagger`}>
      <div className={styles.headBlock}>
        <span className={styles.eyebrowMuted}>What we found</span>
        <h1 className={styles.h1} tabIndex={-1}>
          {outcome.head}
        </h1>
      </div>

      <div className={styles.outcome} data-tone={outcome.tone}>
        <OutcomeIcon size={22} aria-hidden="true" />
        <div>
          <strong>{outcome.label}</strong>
          <p>{counts.filter((c) => c.n).map((c) => `${c.n} ${c.g.short}`).join(" · ")}</p>
        </div>
      </div>

      <NextCheckCard next={result.nextCheck} onStart={onStartCheck} synthetic={result.subject.samples} />

      <p className={styles.provenance}>
        {result.inferencePerformed ? (
          <>
            <Cpu size={15} aria-hidden="true" /> Screenshots read live by Meta {result.modelUsed} in {(result.inference!.latencyMs / 1000).toFixed(1)}s. Everything
            below was then compared with our records by fixed rules — the AI doesn&apos;t decide the result.
          </>
        ) : (
          <>
            <Link2 size={15} aria-hidden="true" /> Link compared with our records only. No AI was used and the page was not opened.
          </>
        )}
      </p>

      {result.unreadableInputIds.length > 0 && (
        <p className={styles.notice} role="status">
          We couldn&apos;t read anything useful from {result.unreadableInputIds.map((id) => inputLabel.get(id as never)?.toLowerCase()).join(" and ")}. A clearer or less
          cropped screenshot may help.
        </p>
      )}
      {result.warnings.length > 0 && (
        <div className={styles.notice} role="status">
          <strong>Heads-up from the screenshot reader:</strong>
          <ul>
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <span className={styles.help}>These notes don&apos;t change the result.</span>
        </div>
      )}

      {GROUPS.map((g) => {
        const items = result.findings.filter((f) => f.state === g.state);
        if (!items.length && !g.empty) return null;
        return (
          <section key={g.state} className={`${styles.group} stagger`} aria-labelledby={`grp-${g.state}`}>
            <div>
              <h2 id={`grp-${g.state}`} className={styles.h2}>
                {g.label} <span className={styles.count}>{items.length}</span>
              </h2>
              <p className={styles.help}>{g.desc}</p>
            </div>
            {items.length === 0 && <p className={styles.emptyGroup}>{g.empty}</p>}
            {items.map((f) => (
              <FindingCard key={f.id} f={f} reference={reference} obsById={obsById} inputLabel={inputLabel} />
            ))}
          </section>
        );
      })}

      <details className={`card ${styles.readBox}`}>
        <summary>What we read from what you sent ({result.observations.filter((o) => o.value).length})</summary>
        <ul>
          {result.observations
            .filter((o) => o.value)
            .map((o) => (
              <li key={o.id}>
                <span className={styles.readField}>{FIELD_LABEL[o.field]}</span>
                <span className={styles.readValue}>{o.value}</span>
                <span className={styles.help}>
                  {inputLabel.get(o.inputId)} · {o.origin === "user" ? "you typed this" : `read by Meta AI${o.clarity === "uncertain" ? ", partly readable" : ""}`} · {o.id}
                </span>
              </li>
            ))}
        </ul>
        {note && (
          <p className={styles.help}>
            Your note (not analysed): &ldquo;{note}&rdquo;
          </p>
        )}
      </details>

      <p className={styles.disclaimer}>{NOT_A_GUARANTEE}</p>

      <div className={styles.actions}>
        {result.nextCheck.status === "check_available" ? (
          <button type="button" className="btn btn-primary" onClick={onStartCheck}>
            Check one more thing
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onFinish}>
            See what to do now
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onEdit}>
          Change what I sent
        </button>
        <button type="button" className="btn btn-secondary" onClick={onRestart}>
          Check another booking
        </button>
      </div>
    </div>
  );
}

function FindingCard({
  f,
  reference,
  obsById,
  inputLabel,
}: {
  f: Finding;
  reference: ReferenceView | null;
  obsById: Map<string, AnalyzeResponse["observations"][number]>;
  inputLabel: Map<string, string>;
}) {
  const [open, setOpen] = useState(f.state !== "match");
  const chip = STATE_CHIP[f.state];
  const Icon = ICON[chip.tone];
  const copy = findingCopy(f);
  const obs = f.observationIds.map((id) => obsById.get(id)).filter(Boolean);
  const sources = reference ? reference.sources.filter((s) => f.sourceIds.includes(s.id)) : [];
  const bodyId = `fd-${f.id}`;

  return (
    <article className={`card ${styles.finding}`} data-tone={chip.tone}>
      <button type="button" className={styles.findingHead} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
        <Icon size={18} aria-hidden="true" className={styles.findingIcon} />
        <span className={styles.findingTitle}>{copy.title}</span>
        <span className={`chip chip-${chip.tone}`}>{chip.text}</span>
        <ChevronDown size={18} aria-hidden="true" className={styles.chev} data-open={open} />
      </button>
      {open && (
        <div id={bodyId} className={styles.findingBody}>
          <div className={styles.compare}>
            <div>
              <span className={styles.compareLabel}>What you sent</span>
              <span className={styles.compareValue}>{f.observed ?? "—"}</span>
              {obs.length > 0 && (
                <span className={styles.help}>
                  Seen in: {[...new Set(obs.map((o) => inputLabel.get(o!.inputId)))].join(", ")}
                  {obs[0]?.excerpt && obs[0].excerpt !== f.observed && <> · &ldquo;{obs[0].excerpt}&rdquo;</>}
                </span>
              )}
            </div>
            <div>
              <span className={styles.compareLabel}>What we have on file</span>
              <span className={styles.compareValue}>
                {f.reference ?? (f.kind === "message_sender" || f.kind === "payment_instruction" ? "Not something any record can confirm" : "Nothing on file for this")}
              </span>
              {sources.map((s) => (
                <span key={s.id} className={styles.help}>
                  {s.title} · checked {formatDate(s.reviewedAt)} · <span className="mono">{s.id}</span>
                </span>
              ))}
            </div>
          </div>
          <p className={styles.explain}>{copy.explanation}</p>
          {f.limitations.map((l) => (
            <p key={l} className={styles.limit}>
              {l}
            </p>
          ))}
          <span className={`mono ${styles.trace}`}>
            {f.rationaleCode} · {[...f.observationIds, ...f.referenceClaimIds].join(", ") || "no evidence ids"}
          </span>
        </div>
      )}
    </article>
  );
}

"use client";

import { ArrowRight, CircleCheck, CircleHelp, ExternalLink, TriangleAlert } from "lucide-react";
import type { AnalyzeResponse, ReassessResponse } from "@/lib/case/state";
import { NOT_A_GUARANTEE, OUTCOME_COPY, STATE_CHIP, findingCopy } from "@/lib/engine/copy";
import type { CaseOutcome, Finding } from "@/lib/engine/types";
import { displayUrl, formatDate } from "./format";
import type { ReferenceView } from "./types";
import styles from "./workspace.module.css";

const ICON = { ok: CircleCheck, warn: TriangleAlert, unk: CircleHelp };

const WHAT_NOW: Record<CaseOutcome, string> = {
  no_material_conflict_observed:
    "Book only through the page and contact details on file. Before paying, confirm the payment details through the resort's documented phone or website — Trace can't confirm who owns a payment account.",
  potential_channel_conflict:
    "Don't pay through this page or number. Contact the resort using the details on file and ask about your booking there.",
  insufficient_evidence:
    "Pause before paying. Contact the resort through a channel you found yourself — its own website or a trusted listing — not the details in the chat.",
};

interface Props {
  analysis: AnalyzeResponse;
  reassessment: ReassessResponse | null;
  skipped: boolean;
  reference: ReferenceView | null;
  checkedAt: { analyzed: Date; followup: Date | null };
  onRestart: () => void;
}

// What to do after messaging the resort from its listed page. Guidance only — the findings don't change.
const MESSENGER_NEXT: Record<string, { title: string; body: string }> = {
  same_chat: {
    title: "You're chatting with the listed page",
    body: "That still doesn't show whose GCash or bank account you'd pay. Before sending money, confirm the payment details with the resort using the number on file.",
  },
  new_chat: {
    title: "The account that messaged you isn't the listed page",
    body: "Don't pay or share details in the old chat. Continue only in the conversation that opened from the listed page, or call the number on file.",
  },
  cant_tell: {
    title: "Still unclear",
    body: "Keep booking only through the listed page or the number on file, and don't pay in a chat you can't place.",
  },
};

export function ResultView({ analysis, reassessment, skipped, reference, checkedAt, onRestart }: Props) {
  const outcome = reassessment?.outcome ?? analysis.outcome;
  const prev = reassessment?.previousOutcome ?? analysis.outcome;
  const copy = OUTCOME_COPY[outcome];
  const Icon = ICON[copy.tone];
  const findings = reassessment?.findings ?? analysis.findings;
  const unknowns = reassessment?.remainingUnknowns ?? findings.filter((f) => f.state === "unknown");
  const changes = reassessment?.changes ?? [];
  const worse = (c: (typeof changes)[number]) => c.after?.state === "different_from_reference";

  return (
    <div className={`${styles.panel} stagger`}>
      <div className={styles.headBlock}>
        <span className={styles.eyebrowMuted}>Your updated result</span>
        <h1 className={styles.h1} tabIndex={-1}>
          {copy.head}
        </h1>
      </div>

      <div className={styles.outcome} data-aside-anchor="" data-tone={copy.tone}>
        <Icon size={22} aria-hidden="true" />
        <div>
          <strong>{copy.label}</strong>
          <p>{prev === outcome ? "Same as before the check." : <>Before: {OUTCOME_COPY[prev].label}</>}</p>
        </div>
      </div>

      <section className={styles.group} aria-labelledby="what-changed">
        <h2 id="what-changed" className={styles.h2}>
          What changed
        </h2>
        {skipped && <p className={styles.emptyGroup}>You skipped the check, so nothing changed. Everything we couldn&apos;t confirm is still open.</p>}
        {!skipped && changes.length === 0 && (
          <p className={styles.emptyGroup}>
            Nothing changed.{" "}
            {reassessment?.followup.userReport
              ? reassessment.followup.actionId === "MESSAGE_FROM_LISTED_PAGE"
                ? "What you saw is kept as your note. We can't see your Messenger, so it can't change our records or your result — but it's the clearest sign of who you're chatting with."
                : "What you were told is kept as your note. A phone call can't be checked by us, so it can't change our records or your result on its own — but it can still guide what you do next."
              : "What you added didn't match anything our sources record, or didn't show enough to compare."}
          </p>
        )}
        {reassessment?.followup.reportedAnswer && MESSENGER_NEXT[reassessment.followup.reportedAnswer] && reassessment.followup.actionId === "MESSAGE_FROM_LISTED_PAGE" && (
          <div className={`card ${styles.messengerNext}`} data-answer={reassessment.followup.reportedAnswer}>
            <strong>{MESSENGER_NEXT[reassessment.followup.reportedAnswer].title}</strong>
            <p>{MESSENGER_NEXT[reassessment.followup.reportedAnswer].body}</p>
          </div>
        )}
        {changes.map((c) => (
          <article key={c.findingId} className={`card ${styles.change}`} data-worse={worse(c)}>
            {worse(c) && <span className={`chip chip-warn ${styles.changeTag}`}>More worrying now</span>}
            <div className={styles.changeGrid}>
              <ChangeSide label="Before" f={c.before} />
              <ArrowRight size={18} aria-hidden="true" className={styles.changeArrow} />
              <ChangeSide label="After" f={c.after} />
            </div>
            <p className={styles.explain}>{c.reason}</p>
            {c.after && <span className={`mono ${styles.trace}`}>{c.after.rationaleCode} · {[...c.newEvidenceIds, ...c.after.referenceClaimIds].join(", ")}</span>}
          </article>
        ))}
      </section>

      {reassessment && (
        <section className={`card ${styles.looked}`} aria-labelledby="looked-at">
          <h2 id="looked-at" className={styles.h2}>
            What we looked at
          </h2>
          <div className={styles.compare}>
            <div>
              <span className={styles.compareLabel}>What you added</span>
              <span className={styles.compareValue}>
                {reassessment.followup.userReport ??
                  (reassessment.observations
                    .filter((o) => reassessment.followup.evidenceIds.includes(o.id) && o.value)
                    .map((o) => o.value)
                    .join(" · ") ||
                    "—")}
              </span>
              <span className={styles.help}>
                {reassessment.followup.inputLabel}
                {reassessment.inference ? ` · read live by Meta AI in ${(reassessment.inference.latencyMs / 1000).toFixed(1)}s` : " · no AI used"}
              </span>
            </div>
            <div>
              <span className={styles.compareLabel}>What we compared it with</span>
              <span className={styles.compareValue}>{reference ? reference.facebookPages.map((p) => displayUrl(p.url)).join(" · ") : "Nothing on file"}</span>
              <span className={styles.help}>Same records as your first check — nothing new was fetched.</span>
            </div>
          </div>
        </section>
      )}

      {unknowns.length > 0 && (
        <section className={styles.group} aria-labelledby="still-open">
          <h2 id="still-open" className={styles.h2}>
            What&apos;s still open <span className={styles.count}>{unknowns.length}</span>
          </h2>
          {unknowns.map((f) => (
            <div key={f.id} className={styles.openItem}>
              <span className={`chip chip-${STATE_CHIP[f.state].tone}`}>{STATE_CHIP[f.state].text}</span>
              <span>
                <strong>{findingCopy(f).title}</strong>
                <span className={styles.help}>{findingCopy(f).explanation}</span>
              </span>
            </div>
          ))}
        </section>
      )}

      {reference && (
        <section className={`card ${styles.looked}`} aria-labelledby="contacts">
          <h2 id="contacts" className={styles.h2}>
            The resort&apos;s contact details on file
          </h2>
          <ul className={styles.contactList}>
            {reference.facebookPages.map((p) => (
              <li key={p.claimId}>
                <span className="mono">{displayUrl(p.url)}</span> · {p.label ?? "Facebook page"}
              </li>
            ))}
            {reference.contacts.map((c) => (
              <li key={c.claimId}>
                <span className="mono">{c.value}</span> · {c.kind === "reservation_phone" ? "reservations phone" : c.kind.replace("_", " ")}
              </li>
            ))}
          </ul>
          {reference.sources.map((s) =>
            reference.synthetic ? (
              <span key={s.id} className={styles.help}>
                From: {s.title}, checked {formatDate(s.reviewedAt)} (made up — doesn&apos;t open)
              </span>
            ) : (
              <a key={s.id} className={styles.sourceUrl} href={s.url} target="_blank" rel="noopener noreferrer nofollow">
                From: {s.title}, checked {formatDate(s.reviewedAt)} <ExternalLink size={12} aria-label="opens in a new tab" />
              </a>
            ),
          )}
        </section>
      )}

      <section className={styles.whatNow} aria-labelledby="what-now">
        <h2 id="what-now" className={styles.h2}>
          What to do now
        </h2>
        <p>{WHAT_NOW[outcome]}</p>
      </section>

      <section className={styles.group} aria-labelledby="history">
        <h2 id="history" className={styles.h2}>
          Check history
        </h2>
        <ol className={styles.history}>
          <li>
            <span className="mono">{checkedAt.analyzed.toLocaleTimeString()}</span> First check:{" "}
            {analysis.inferencePerformed ? `${analysis.inputs.length} input(s), screenshots read live by Meta AI` : "link compared, no AI used"} →{" "}
            {OUTCOME_COPY[analysis.outcome].label}
          </li>
          <li>
            <span className="mono">{checkedAt.followup ? checkedAt.followup.toLocaleTimeString() : "—"}</span>{" "}
            {skipped ? "Check skipped" : `Follow-up: ${reassessment?.followup.inputLabel.toLowerCase()}`} → {copy.label}
          </li>
        </ol>
      </section>

      <p className={styles.disclaimer}>{NOT_A_GUARANTEE}</p>
      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={onRestart}>
          Check another booking
        </button>
      </div>
    </div>
  );
}

function ChangeSide({ label, f }: { label: string; f: Finding | null }) {
  if (!f) {
    return (
      <div className={styles.changeSide}>
        <span className={styles.compareLabel}>{label}</span>
        <span className={styles.help}>Not part of the result</span>
      </div>
    );
  }
  const chip = STATE_CHIP[f.state];
  return (
    <div className={styles.changeSide}>
      <span className={styles.compareLabel}>{label}</span>
      <span className={`chip chip-${chip.tone}`}>{chip.text}</span>
      <strong>{findingCopy(f).title}</strong>
      {f.observed && <span className={`mono ${styles.help}`}>{f.observed}</span>}
    </div>
  );
}

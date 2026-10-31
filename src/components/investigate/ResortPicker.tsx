"use client";

import { useEffect, useId, useState } from "react";
import { FACEBOOK_URL_ERROR_TEXT, type FacebookUrlError } from "@/lib/facebook-url";
import { displayUrl, formatDate } from "./format";
import type { LinkLookup, ReferenceView, Selection } from "./types";
import styles from "./workspace.module.css";

const looksLikeLink = (q: string) => /facebook|fb\.|\/|\.com|^https?:/i.test(q);

interface Props {
  samples: boolean;
  onSelect: (s: Selection) => void;
}

export function ResortPicker({ samples, onSelect }: Props) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ReferenceView[] | null>(null);
  const [lookup, setLookup] = useState<LinkLookup | null>(null);
  const [loadError, setLoadError] = useState(false);

  const trimmed = query.trim();
  const isLink = looksLikeLink(trimmed);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams(isLink ? { url: trimmed } : { q: trimmed });
    if (samples) params.set("samples", "1");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/references?${params}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setLoadError(false);
        if (isLink) {
          setLookup(data.lookup);
          setItems(null);
        } else {
          setItems(data.items);
          setLookup(null);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setLoadError(true);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [trimmed, isLink, samples]);

  const pageUrl = lookup && lookup.status !== "invalid" ? trimmed : undefined;

  return (
    <div className={`${styles.panel} fade-in`}>
      <div className={styles.headBlock}>
        <h1 className={styles.h1} tabIndex={-1}>Which resort are you booking?</h1>
        <p className={styles.sub}>Type its name, or paste the Facebook link you were sent.</p>
      </div>

      <label htmlFor={inputId} className="sr-only">
        Resort name or Facebook link
      </label>
      <input
        id={inputId}
        className={styles.bigInput}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Resort name or facebook.com/… link"
        autoComplete="off"
        spellCheck={false}
        maxLength={500}
      />

      <div aria-live="polite" className={styles.stack}>
        {loadError && (
          <p role="alert" className={styles.errText}>
            We couldn&apos;t load our records just now. Check your connection and try again.
          </p>
        )}

        {lookup?.status === "invalid" && (
          <p role="alert" className={styles.errText}>
            {FACEBOOK_URL_ERROR_TEXT[lookup.error as FacebookUrlError] ?? FACEBOOK_URL_ERROR_TEXT.NOT_A_URL}
          </p>
        )}

        {lookup?.status === "exact" && (
          <div className={styles.matchBox}>
            <div className={styles.matchHead}>This link is a page we have on file for:</div>
            {lookup.matches.map(({ business, claimId }) => {
              const page = business.facebookPages.find((p) => p.claimId === claimId);
              return (
                <ResortRow
                  key={claimId}
                  r={business}
                  fbLine={page ? `${displayUrl(page.url)}${page.label ? ` · ${page.label}` : ""}` : undefined}
                  cta="Use this resort"
                  onClick={() => onSelect({ kind: "listed", ref: business, pageUrl })}
                />
              );
            })}
            <p className={styles.matchFoot}>
              A matching link only means this page is the one on file. It doesn&apos;t tell us who you&apos;re chatting with
              or whose payment account it is.
            </p>
          </div>
        )}

        {lookup?.status === "similar" && (
          <div className={styles.closeBox}>
            <div className={styles.closeHead}>
              <strong>This exact link isn&apos;t on file.</strong> It looks like it could be about one of these resorts.
              Which did you mean?
            </div>
            {lookup.suggestions.map((r) => (
              <ResortRow
                key={r.id}
                r={r}
                fbLine={`Page on file: ${r.facebookPages.map((p) => displayUrl(p.url)).join(", ")}`}
                cta="Compare with this resort"
                onClick={() => onSelect({ kind: "listed", ref: r, pageUrl })}
              />
            ))}
            <button type="button" className={styles.rowGhost} onClick={() => onSelect({ kind: "unlisted", label: lookup.normalized, pageUrl })}>
              None of these — continue with this link ›
            </button>
          </div>
        )}

        {lookup?.status === "unknown" && (
          <div className={styles.noneBlock}>
            <strong>We don&apos;t have this link on file</strong>
            <span>
              It doesn&apos;t look like any resort we know either. That isn&apos;t proof of anything — we just can&apos;t
              compare it. We&apos;ll still point out what to check and how to confirm it safely.
            </span>
            <button type="button" className="btn btn-primary" onClick={() => onSelect({ kind: "unlisted", label: lookup.normalized, pageUrl })}>
              Continue with this link ›
            </button>
          </div>
        )}

        {!isLink && items && (
          <div className={`card ${styles.list}`}>
            <div className={styles.listHead}>{trimmed ? "Matching resorts on file" : samples ? "Sample resorts (made up)" : "Resorts on file"}</div>
            {items.map((r) => (
              <ResortRow
                key={r.id}
                r={r}
                fbLine={r.facebookPages.map((p) => displayUrl(p.url)).join(" · ")}
                cta="Choose"
                onClick={() => onSelect({ kind: "listed", ref: r })}
              />
            ))}
            {items.length === 0 && (
              <div className={styles.listEmpty}>
                {trimmed ? <>We don&apos;t have &ldquo;{trimmed}&rdquo; on file.</> : <>No resorts are on file yet.</>}
              </div>
            )}
          </div>
        )}

        {!isLink && items && (
          <button
            type="button"
            className={styles.dashed}
            onClick={() => onSelect({ kind: "unlisted", label: trimmed || "A resort not on file" })}
          >
            <span className={styles.dashedTitle}>{trimmed ? <>Continue with &ldquo;{trimmed}&rdquo; ›</> : <>My resort isn&apos;t listed ›</>}</span>
            <span className={styles.dashedSub}>
              We can&apos;t confirm who runs it, but we&apos;ll still point out what to check and how to confirm it safely.
            </span>
          </button>
        )}

        {!isLink && items && (
          <p className={styles.hint}>Only have a screenshot? Pick the resort here — you&apos;ll add the screenshot on the next step.</p>
        )}
      </div>
    </div>
  );
}

function ResortRow({ r, fbLine, cta, onClick }: { r: ReferenceView; fbLine?: string; cta: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <span className={styles.rowMain}>
        <span className={styles.rowName}>
          {r.displayName} <span className={styles.rowLoc}>· {r.locality}, {r.province}</span>
          {r.synthetic && <span className="chip chip-unk" style={{ marginLeft: 6 }}>Made-up sample</span>}
        </span>
        {fbLine && <span className={`mono ${styles.rowFb}`}>{fbLine}</span>}
        {r.reviewDue && <span className={styles.recheck}>Due for a recheck · last checked {formatDate(r.reviewedAt)}</span>}
      </span>
      <span className={styles.rowCta}>{cta} ›</span>
    </button>
  );
}


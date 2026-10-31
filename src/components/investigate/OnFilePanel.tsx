import { ExternalLink } from "lucide-react";
import { displayUrl, formatDate } from "./format";
import type { Selection } from "./types";
import styles from "./workspace.module.css";

const SOURCE_KIND_LABEL: Record<string, string> = {
  local_tourism_directory: "Local government tourism directory",
  independent_business_site: "The resort's own website",
  listed_facebook_page: "The resort's listed Facebook page",
  owner_attestation: "Statement from the resort",
  other_documented_source: "Other documented source",
};

export function OnFilePanel({ selection, onChange }: { selection: Selection; onChange: () => void }) {
  if (selection.kind === "unlisted") {
    return (
      <aside className={`card ${styles.side}`} aria-label="Resort record">
        <div className={styles.sideHead}>
          <span className={styles.sideEyebrow}>Not on file</span>
          <button type="button" className={styles.linkBtn} onClick={onChange}>
            Change
          </button>
        </div>
        <strong className={styles.sideName}>{selection.label}</strong>
        <p className={styles.sideText}>Not in our records, so we can&apos;t confirm who runs it. We can still:</p>
        <ul className={styles.sideList}>
          <li>Spot links that copy a resort we do know</li>
          <li>Point out details worth checking before you pay</li>
          <li>Show you the safest way to confirm the booking</li>
        </ul>
      </aside>
    );
  }

  const r = selection.ref;
  return (
    <aside className={`card ${styles.side}`} aria-label="Resort record">
      <div className={styles.sideHead}>
        <span className={styles.sideEyebrow}>On file{r.synthetic ? " · made-up sample" : ""}</span>
        <button type="button" className={styles.linkBtn} onClick={onChange}>
          Change
        </button>
      </div>
      <div>
        <strong className={styles.sideName}>{r.displayName}</strong>
        <div className={styles.sideLoc}>
          {r.locality}, {r.province}
        </div>
      </div>
      {r.reviewDue && (
        <p className={styles.recheck}>Needs a recheck. Our record was last checked {formatDate(r.reviewedAt)} and may be out of date.</p>
      )}

      <dl className={styles.dl}>
        {r.facebookPages.map((p) => (
          <div key={p.claimId}>
            <dt>{p.label ?? "Facebook page"}</dt>
            <dd className="mono">{displayUrl(p.url)}</dd>
          </div>
        ))}
        {r.contacts.map((c) => (
          <div key={c.claimId}>
            <dt>{c.kind === "reservation_phone" ? "Reservations phone" : c.kind === "reservation_email" ? "Reservations email" : "Website"}</dt>
            <dd className="mono">{c.value}</dd>
          </div>
        ))}
        {!r.contacts.some((c) => c.kind === "reservation_phone" || c.kind === "reservation_email") && (
          <div>
            <dt>Phone and email</dt>
            <dd className={styles.help}>
              None on file yet. The tourism office lists Facebook pages, not phone numbers.
            </dd>
          </div>
        )}
      </dl>

      <div className={styles.sources}>
        <span className={styles.sideEyebrow}>Where we got it</span>
        {r.sources.map((s) => (
          <div key={s.id} className={styles.source}>
            <span className={styles.sourceKind}>
              {SOURCE_KIND_LABEL[s.kind]} <span className="mono">{s.id}</span>
            </span>
            <span className={styles.sourceTitle}>{s.title}</span>
            {r.synthetic ? (
              <span className={`mono ${styles.sourceUrl}`}>{s.url} (made-up — doesn&apos;t open)</span>
            ) : (
              <a className={`mono ${styles.sourceUrl}`} href={s.url} target="_blank" rel="noopener noreferrer nofollow">
                {displayUrl(s.url)} <ExternalLink size={12} aria-label="opens in a new tab" />
              </a>
            )}
            <span className={styles.sourceMeta}>Checked {formatDate(s.reviewedAt)}</span>
          </div>
        ))}
      </div>

      <p className={styles.scope}>
        <strong>This tells us</strong> which Facebook page{r.facebookPages.length > 1 ? "s are" : " is"} linked to this resort by the
        source above. <strong>It doesn&apos;t tell us</strong> who&apos;s behind a Messenger chat, or whose GCash or bank account it is.
      </p>
    </aside>
  );
}

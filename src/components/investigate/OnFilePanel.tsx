import { ExternalLink, Globe, Landmark, Link2, Mail, Phone } from "lucide-react";
import { displayUrl, formatDate } from "./format";
import type { Selection } from "./types";
import styles from "./workspace.module.css";

// Full name for the source list, short name for the "from" line under each detail.
const SOURCE_KIND: Record<string, { label: string; short: string; Icon: typeof Globe }> = {
  local_tourism_directory: { label: "Tourism office directory", short: "tourism office", Icon: Landmark },
  independent_business_site: { label: "Resort's own website", short: "resort website", Icon: Globe },
  listed_facebook_page: { label: "Resort's listed Facebook page", short: "listed page", Icon: Link2 },
  owner_attestation: { label: "Statement from the resort", short: "resort statement", Icon: Globe },
  other_documented_source: { label: "Other documented source", short: "other source", Icon: Globe },
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
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
  const kindOf = new Map(r.sources.map((s) => [s.id, s.kind]));
  const from = (ids: string[]) => [...new Set(ids.map((id) => SOURCE_KIND[kindOf.get(id) ?? ""]?.short).filter(Boolean))].join(", ");
  const details = [
    ...r.facebookPages.map((p) => ({ id: p.claimId, Icon: Link2, value: displayUrl(p.url), label: p.label ?? "Facebook page", src: from(p.sourceIds) })),
    ...r.contacts.map((c) => ({
      id: c.claimId,
      Icon: c.kind === "reservation_phone" ? Phone : c.kind === "reservation_email" ? Mail : Globe,
      value: c.value,
      label: c.kind === "reservation_phone" ? "Phone" : c.kind === "reservation_email" ? "Email" : "Website",
      src: from(c.sourceIds),
    })),
  ];
  const noContacts = !r.contacts.some((c) => c.kind === "reservation_phone" || c.kind === "reservation_email");

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

      <ul className={styles.fileList} aria-label="Details on file">
        {details.map(({ id, Icon, value, label, src }) => (
          <li key={id} className={styles.fileRow}>
            <span className={styles.fileIcon} aria-hidden="true">
              <Icon size={15} />
            </span>
            <span className={styles.fileText}>
              <span className={`mono ${styles.fileValue}`}>{value}</span>
              <span className={styles.fileMeta}>
                {label}
                {src && <> · from {src}</>}
              </span>
            </span>
          </li>
        ))}
        {noContacts && (
          <li className={styles.fileRow}>
            <span className={styles.fileIcon} data-empty="" aria-hidden="true">
              <Phone size={15} />
            </span>
            <span className={styles.fileText}>
              <span className={styles.fileMeta}>No phone or email on file yet</span>
            </span>
          </li>
        )}
      </ul>

      <div className={styles.srcBlock}>
        <span className={styles.sideEyebrow}>Sources</span>
        <ul className={styles.srcList}>
          {r.sources.map((s) => {
            const k = SOURCE_KIND[s.kind] ?? SOURCE_KIND.other_documented_source;
            const inner = (
              <>
                <span className={styles.srcIcon} aria-hidden="true">
                  <k.Icon size={15} />
                </span>
                <span className={styles.fileText}>
                  <span className={styles.srcName}>{k.label}</span>
                  <span className={styles.fileMeta}>
                    {r.synthetic ? "made up · doesn't open" : hostOf(s.url)} · checked {formatDate(s.reviewedAt)}
                  </span>
                </span>
                {!r.synthetic && <ExternalLink size={14} className={styles.srcOut} aria-hidden="true" />}
              </>
            );
            return (
              <li key={s.id}>
                {r.synthetic ? (
                  <span className={styles.srcRow} title={`${s.title} (${s.id})`}>
                    {inner}
                  </span>
                ) : (
                  <a className={styles.srcRow} href={s.url} target="_blank" rel="noopener noreferrer nofollow" title={`${s.title} (${s.id}) — opens in a new tab`}>
                    {inner}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className={styles.scope}>
        <strong>Confirms</strong> which pages and contacts belong to this resort. <strong>Doesn&apos;t confirm</strong> who&apos;s behind a chat or
        whose GCash or bank account it is.
      </p>
    </aside>
  );
}

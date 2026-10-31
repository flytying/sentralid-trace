"use client";

import { useId, useRef, useState } from "react";
import { ImageUp, Info, ShieldAlert, X, ZoomIn } from "lucide-react";
import { FACEBOOK_URL_ERROR_TEXT, parseFacebookUrl, displayFacebookUrl } from "@/lib/facebook-url";
import { CLIENT_MAX_TOTAL_BYTES, PrepareError, prepareImage } from "./compress";
import { ImageViewer } from "./ImageViewer";
import styles from "./workspace.module.css";

export interface Shot {
  file: File;
  previewUrl: string;
  name: string;
  sample: boolean;
}

export interface Evidence {
  pageUrl: string;
  pageShot: Shot | null;
  chats: Shot[];
  note: string;
  consent: boolean;
}

export const EMPTY_EVIDENCE: Evidence = { pageUrl: "", pageShot: null, chats: [], note: "", consent: false };

interface Props {
  evidence: Evidence;
  onChange: (e: Evidence) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSample: boolean;
}

export function EvidenceForm({ evidence, onChange, onSubmit, onBack, isSample }: Props) {
  const urlId = useId();
  const noteId = useId();
  const consentId = useId();
  const pageInput = useRef<HTMLInputElement>(null);
  const chatInput = useRef<HTMLInputElement>(null);
  const [pageErr, setPageErr] = useState<string | null>(null);
  const [chatErr, setChatErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const url = evidence.pageUrl.trim();
  const parsed = url ? parseFacebookUrl(url) : null;
  const hasImages = Boolean(evidence.pageShot) || evidence.chats.length > 0;
  const totalBytes = (evidence.pageShot?.file.size ?? 0) + evidence.chats.reduce((n, c) => n + c.file.size, 0);
  const tooBig = totalBytes > CLIENT_MAX_TOTAL_BYTES;
  const hasInput = Boolean(parsed?.ok) || hasImages;
  const canSubmit = hasInput && (!url || parsed?.ok) && (!hasImages || evidence.consent) && !tooBig && !busy;

  const blockedReason = !hasInput
    ? "Add a page link or at least one screenshot."
    : url && !parsed?.ok
      ? "Fix the page link, or clear it."
      : hasImages && !evidence.consent
        ? "Tick the privacy box to send screenshots."
        : tooBig
          ? "Your screenshots are too large together. Remove one."
          : null;

  async function addFile(file: File, target: "page" | "chat") {
    const setErr = target === "page" ? setPageErr : setChatErr;
    setErr(null);
    setBusy(true);
    try {
      const prepared = await prepareImage(file);
      const shot: Shot = { file: prepared, previewUrl: URL.createObjectURL(prepared), name: file.name, sample: false };
      if (target === "page") {
        if (evidence.pageShot) URL.revokeObjectURL(evidence.pageShot.previewUrl);
        onChange({ ...evidence, pageShot: shot });
      } else {
        onChange({ ...evidence, chats: [...evidence.chats, shot].slice(0, 3) });
      }
    } catch (e) {
      setErr(e instanceof PrepareError ? e.message : "We couldn't add that image. Try another screenshot.");
    } finally {
      setBusy(false);
    }
  }

  function removeChat(i: number) {
    URL.revokeObjectURL(evidence.chats[i].previewUrl);
    onChange({ ...evidence, chats: evidence.chats.filter((_, j) => j !== i) });
  }

  function moveChat(i: number, dir: -1 | 1) {
    const chats = [...evidence.chats];
    [chats[i], chats[i + dir]] = [chats[i + dir], chats[i]];
    onChange({ ...evidence, chats });
  }

  return (
    <form
      className={`${styles.panel} fade-in`}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      noValidate
    >
      <div className={styles.headBlock}>
        <h1 className={styles.h1} tabIndex={-1}>
          Add what you have
        </h1>
        <p className={styles.sub}>Any one is enough: a page link, a page screenshot, or chat screenshots.</p>
      </div>

      {isSample && (
        <p className={styles.sampleNote}>
          <Info size={17} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
          <span>This demo scenario is filled in with sample screenshots of a fictional resort. They&apos;ll be read live by Meta AI, just like your own.</span>
        </p>
      )}

      {/* Page link */}
      <div className={`card ${styles.field}`}>
        <label htmlFor={urlId} className={styles.label}>
          Link to the Facebook page <span className={styles.optional}>· optional</span>
        </label>
        <input
          id={urlId}
          className={styles.input}
          value={evidence.pageUrl}
          onChange={(e) => onChange({ ...evidence, pageUrl: e.target.value })}
          placeholder="facebook.com/pagename"
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
          maxLength={500}
          aria-invalid={Boolean(url && parsed && !parsed.ok)}
          aria-describedby={`${urlId}-help`}
        />
        <span id={`${urlId}-help`} className={parsed && !parsed.ok ? styles.errText : styles.help}>
          {parsed && !parsed.ok
            ? FACEBOOK_URL_ERROR_TEXT[parsed.error]
            : parsed?.ok
              ? <>Looks like a Facebook link: <span className="mono">{displayFacebookUrl(parsed)}</span>. We compare it with our records — we never open the page.</>
              : "We compare the link with the resort's page on file. We don't open the page itself."}
        </span>
      </div>

      {/* Page screenshot */}
      <div className={`card ${styles.field}`}>
        <span className={styles.label} id={`${urlId}-page`}>
          Screenshot of the Facebook page <span className={styles.optional}>· optional, 1 max</span>
        </span>
        {evidence.pageShot ? (
          <ShotRow
            shot={evidence.pageShot}
            caption="Page screenshot"
            onRemove={() => {
              URL.revokeObjectURL(evidence.pageShot!.previewUrl);
              onChange({ ...evidence, pageShot: null });
            }}
            onReplace={() => pageInput.current?.click()}
          />
        ) : (
          <button type="button" className={styles.drop} onClick={() => pageInput.current?.click()} disabled={busy} aria-describedby={`${urlId}-page`}>
            <ImageUp size={20} aria-hidden="true" />
            <span>
              <strong>Choose a screenshot</strong>
              <span className={styles.help}>PNG, JPG or WebP · large images are shrunk before sending</span>
            </span>
          </button>
        )}
        {pageErr && <span role="alert" className={styles.errText}>{pageErr}</span>}
        <input
          ref={pageInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) addFile(f, "page");
          }}
        />
      </div>

      {/* Chat screenshots */}
      <div className={`card ${styles.field}`}>
        <span className={styles.label} id={`${urlId}-chats`}>
          Screenshots of your Messenger chat <span className={styles.optional}>· optional, up to 3, in order</span>
        </span>
        {evidence.chats.map((c, i) => (
          <ShotRow
            key={c.previewUrl}
            shot={c}
            caption={`Chat screenshot ${i + 1}`}
            onRemove={() => removeChat(i)}
            onUp={i > 0 ? () => moveChat(i, -1) : undefined}
            onDown={i < evidence.chats.length - 1 ? () => moveChat(i, 1) : undefined}
          />
        ))}
        {evidence.chats.length < 3 && (
          <button type="button" className={styles.drop} onClick={() => chatInput.current?.click()} disabled={busy} aria-describedby={`${urlId}-chats`}>
            <ImageUp size={20} aria-hidden="true" />
            <span>
              <strong>{evidence.chats.length ? "Add another chat screenshot" : "Choose a chat screenshot"}</strong>
              <span className={styles.help}>{3 - evidence.chats.length} more allowed</span>
            </span>
          </button>
        )}
        {chatErr && <span role="alert" className={styles.errText}>{chatErr}</span>}
        <input
          ref={chatInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) addFile(f, "chat");
          }}
        />
      </div>

      {/* Note */}
      <div className={`card ${styles.field}`}>
        <label htmlFor={noteId} className={styles.label}>
          What concerns you about this booking? <span className={styles.optional}>· optional</span>
        </label>
        <textarea
          id={noteId}
          className={styles.textarea}
          value={evidence.note}
          onChange={(e) => onChange({ ...evidence, note: e.target.value.slice(0, 300) })}
          rows={2}
          maxLength={300}
          placeholder="e.g. They asked for a deposit to a personal GCash"
        />
        <span className={styles.help}>Kept with your check for your reference. It isn&apos;t sent to AI and can&apos;t change the result.</span>
      </div>

      {/* Privacy consent */}
      {hasImages && (
        <div className={styles.consent}>
          <ShieldAlert size={20} aria-hidden="true" className={styles.consentIcon} />
          <div>
            <strong>Before you send screenshots</strong>
            <p>
              Please hide OTPs, ID numbers, private addresses, account balances and unrelated personal information.
              Screenshots are sent to the Meta Model API for analysis and are not stored by Trace.
            </p>
            <label htmlFor={consentId} className={styles.checkRow}>
              <input
                id={consentId}
                type="checkbox"
                checked={evidence.consent}
                onChange={(e) => onChange({ ...evidence, consent: e.target.checked })}
              />
              I&apos;ve covered up private details, and I&apos;m okay with Meta AI reading my screenshots.
            </label>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={!canSubmit} aria-describedby={blockedReason ? `${urlId}-why` : undefined}>
          Check this booking
        </button>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ‹ Change resort
        </button>
      </div>
      {blockedReason && (
        <span id={`${urlId}-why`} className={styles.help}>
          {blockedReason}
        </span>
      )}
    </form>
  );
}

function ShotRow({
  shot,
  caption,
  onRemove,
  onReplace,
  onUp,
  onDown,
}: {
  shot: Shot;
  caption: string;
  onRemove: () => void;
  onReplace?: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const [viewing, setViewing] = useState(false);
  const detail = `${shot.sample ? "Demo scenario · " : ""}${shot.name} · ${Math.round(shot.file.size / 1024)} KB`;
  return (
    <div className={styles.shot}>
      <button type="button" className={styles.thumbBtn} onClick={() => setViewing(true)} aria-label={`View ${caption} full size`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
        <img src={shot.previewUrl} alt="" className={styles.thumb} />
        <span className={styles.thumbZoom} aria-hidden="true">
          <ZoomIn size={14} />
        </span>
      </button>
      {viewing && <ImageViewer src={shot.previewUrl} caption={caption} detail={detail} onClose={() => setViewing(false)} />}
      <span className={styles.shotMain}>
        <strong>{caption}</strong>
        <span className={styles.help}>{detail}</span>
      </span>
      <span className={styles.shotActions}>
        {onUp && (
          <button type="button" className={styles.linkBtn} onClick={onUp} aria-label={`Move ${caption} up`}>
            ↑
          </button>
        )}
        {onDown && (
          <button type="button" className={styles.linkBtn} onClick={onDown} aria-label={`Move ${caption} down`}>
            ↓
          </button>
        )}
        {onReplace && (
          <button type="button" className={styles.linkBtn} onClick={onReplace}>
            Replace
          </button>
        )}
        <button type="button" className={styles.linkBtn} onClick={onRemove} aria-label={`Remove ${caption}`}>
          <X size={16} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

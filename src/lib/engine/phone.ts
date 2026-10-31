// Philippine phone-number handling for comparison. Partly hidden numbers ("0966 ••• 2290") are
// compared only on their visible digits and can never produce a match.

export interface PhoneShape {
  /** Full E.164-style digits ("+639661232290") when every digit is visible. */
  full: string | null;
  /** Visible leading digits in national form ("0966"), when the middle is hidden. */
  prefix: string;
  /** Visible trailing digits ("2290"). */
  suffix: string;
  hidden: boolean;
}

const MASK = /[•·*xX…]|\.{2,}/;

export function parsePhone(raw: string): PhoneShape | null {
  const s = raw.trim();
  if (!/\d/.test(s)) return null;
  const hidden = MASK.test(s.replace(/\s/g, "").replace(/^\+/, ""));
  if (hidden) {
    const parts = s.split(/(?:[•·*xX…]|\.{2,})+/);
    const prefix = toNational(parts[0]?.replace(/\D/g, "") ?? "");
    const suffix = (parts[parts.length - 1] ?? "").replace(/\D/g, "");
    if (!prefix && !suffix) return null;
    return { full: null, prefix, suffix, hidden: true };
  }
  const national = toNational(s.replace(/\D/g, ""));
  if (national.length < 9 || national.length > 11) return null;
  return { full: `+63${national.slice(1)}`, prefix: national, suffix: "", hidden: false };
}

/** "63917…" / "917…" / "0917…" → "0917…" (national form with trunk 0). */
function toNational(digits: string): string {
  if (!digits) return "";
  if (digits.startsWith("63")) return `0${digits.slice(2)}`;
  if (digits.startsWith("0")) return digits;
  return digits.length >= 9 ? `0${digits}` : digits;
}

export function nationalOf(e164: string): string {
  return toNational(e164.replace(/\D/g, ""));
}

export type PhoneComparison = "match" | "differs" | "partly_hidden";

/** Compare an observed number with a registry number (stored normalized as +63…). */
export function comparePhone(observed: PhoneShape, referenceE164: string): PhoneComparison {
  const ref = nationalOf(referenceE164);
  if (!observed.hidden) return observed.full === `+63${ref.slice(1)}` ? "match" : "differs";
  const consistent = ref.startsWith(observed.prefix) && ref.endsWith(observed.suffix);
  return consistent ? "partly_hidden" : "differs";
}

/** Mask the middle of long digit runs (account / wallet numbers) for display and storage. */
export function maskAccountNumbers(text: string): string {
  return text.replace(/(\+?\d[\d\s-]{6,}\d)/g, (run) => {
    const digits = run.replace(/\D/g, "");
    if (digits.length < 8) return run;
    return `${digits.slice(0, 4)} ••• ${digits.slice(-4)}`;
  });
}

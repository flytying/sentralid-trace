// Deterministic comparison of observations against admitted registry claims (TDD §5).
// The model never decides anything here: it only supplied the observations.
import { displayFacebookUrl, parseFacebookUrl } from "../facebook-url";
import { isServable, type Registry } from "../registry/load";
import type { RegistryClaim } from "../registry/schema";
import { fold } from "../registry/search";
import { comparePhone, maskAccountNumbers, parsePhone } from "./phone";
import type { CaseOutcome, CaseSubject, EvidenceInput, Finding, Observation } from "./types";

const NAME_LIMIT = "Names, logos and photos are easy to copy. A matching name doesn't show who runs a page.";
const PAGE_MATCH_LIMIT = "This only shows the link is a page on file. It doesn't show who is sending you messages or whose payment account is used.";

interface PageLink {
  key: string; // normalized comparison key
  display: string;
  observationIds: string[];
  /** True only when the full link was clearly visible or typed by the user. */
  certain: boolean;
}

export function compareEvidence(reg: Registry, subject: CaseSubject, inputs: EvidenceInput[], observations: Observation[]): Finding[] {
  const business = subject.businessId
    ? reg.businesses.find((b) => b.id === subject.businessId && isServable(b)) ?? null
    : null;
  const claimsOf = (businessId: string) => reg.claims.filter((c) => c.businessId === businessId && c.trust === "corroborated");
  const ownClaims = business ? claimsOf(business.id) : [];
  const findings: Finding[] = [];

  // ---- Facebook page links ---------------------------------------------------------------
  const links = collectPageLinks(observations);
  const fbClaims = ownClaims.filter((c) => c.kind === "facebook_page_url");
  const refPages = fbClaims.map((c) => displayClaimUrl(c)).join(" · ") || null;

  if (links.length === 0) {
    const unclear = observations.filter((o) => (o.field === "facebook_url" || o.field === "facebook_handle") && o.clarity !== "clear");
    findings.push({
      id: "F-page:none",
      kind: "facebook_page_url",
      state: "unknown",
      rationaleCode: business ? "FB_PAGE_NOT_VISIBLE" : "FB_PAGE_NO_REFERENCE",
      observationIds: unclear.map((o) => o.id),
      referenceClaimIds: fbClaims.map((c) => c.id),
      sourceIds: uniq(fbClaims.flatMap((c) => c.sourceIds)),
      observed: null,
      reference: refPages,
      limitations: [],
    });
  }

  for (const link of links) {
    const base = { id: `F-page:${link.key}`, kind: "facebook_page_url" as const, observationIds: link.observationIds, observed: link.display };
    if (!business) {
      findings.push({ ...base, state: "unknown", rationaleCode: "FB_PAGE_NO_REFERENCE", referenceClaimIds: [], sourceIds: [], reference: null, limitations: [] });
      continue;
    }
    const exact = fbClaims.find((c) => c.normalizedValue === link.key);
    if (exact && link.certain) {
      findings.push({ ...base, state: "match", rationaleCode: "FB_PAGE_MATCH", referenceClaimIds: [exact.id], sourceIds: exact.sourceIds, reference: displayClaimUrl(exact), limitations: [PAGE_MATCH_LIMIT] });
      continue;
    }
    if (!link.certain) {
      findings.push({ ...base, state: "unknown", rationaleCode: "FB_PAGE_UNCLEAR", referenceClaimIds: fbClaims.map((c) => c.id), sourceIds: uniq(fbClaims.flatMap((c) => c.sourceIds)), reference: refPages, limitations: [] });
      continue;
    }
    const other = reg.claims.find(
      (c) => c.kind === "facebook_page_url" && c.trust === "corroborated" && c.normalizedValue === link.key && c.businessId !== business.id &&
        reg.businesses.some((b) => b.id === c.businessId && isServable(b)),
    );
    if (other) {
      const otherName = reg.businesses.find((b) => b.id === other.businessId)!.displayName;
      findings.push({ ...base, state: "different_from_reference", rationaleCode: "FB_PAGE_IS_OTHER_LISTED_BUSINESS", referenceClaimIds: [...fbClaims.map((c) => c.id), other.id], sourceIds: uniq([...fbClaims.flatMap((c) => c.sourceIds), ...other.sourceIds]), reference: `${refPages} (the link you sent is on file for ${otherName})`, limitations: [] });
      continue;
    }
    findings.push({ ...base, state: "different_from_reference", rationaleCode: "FB_PAGE_DIFFERS", referenceClaimIds: fbClaims.map((c) => c.id), sourceIds: uniq(fbClaims.flatMap((c) => c.sourceIds)), reference: refPages, limitations: ["A different link isn't proof of a scam — some businesses run more than one page. It does mean this page isn't one we can confirm."] });
  }

  // ---- Business name (listed resort only) -------------------------------------------------
  if (business) {
    const names = observations.filter((o) => o.field === "business_name" && o.value && o.clarity !== "unreadable");
    if (names.length) {
      const target = fold(business.displayName);
      const same = names.filter((o) => {
        const n = fold(o.value!);
        return n === target || n.includes(target) || target.includes(n);
      });
      const used = same.length ? same : names;
      findings.push({
        id: "F-name",
        kind: "business_name",
        state: same.length ? "match" : "unknown",
        rationaleCode: same.length ? "NAME_SAME_AS_RECORD" : "NAME_DIFFERS_FROM_RECORD",
        observationIds: used.map((o) => o.id),
        referenceClaimIds: [],
        sourceIds: business.sourceIds,
        observed: used[0].value,
        reference: business.displayName,
        limitations: [NAME_LIMIT],
      });
    }
  }

  // ---- Phone numbers -----------------------------------------------------------------------
  const phoneClaims = ownClaims.filter((c) => c.kind === "reservation_phone");
  const seenPhones = new Map<string, { obs: Observation[]; shape: NonNullable<ReturnType<typeof parsePhone>> }>();
  for (const o of observations) {
    if (o.field !== "phone" || !o.value || o.clarity === "unreadable") continue;
    const shape = parsePhone(o.value);
    if (!shape) continue;
    const key = shape.full ?? `${shape.prefix}…${shape.suffix}`;
    const entry = seenPhones.get(key) ?? { obs: [], shape };
    entry.obs.push(o);
    seenPhones.set(key, entry);
  }
  for (const [key, { obs, shape }] of seenPhones) {
    const base = { id: `F-phone:${key}`, kind: "reservation_phone" as const, observationIds: obs.map((o) => o.id), observed: obs[0].value };
    if (!business || phoneClaims.length === 0) {
      findings.push({ ...base, state: "unknown", rationaleCode: "PHONE_NO_REFERENCE", referenceClaimIds: [], sourceIds: [], reference: null, limitations: ["Numbers shown on a page or in a chat are that page's own claim."] });
      continue;
    }
    const results = phoneClaims.map((c) => ({ c, r: comparePhone(shape, c.normalizedValue) }));
    const match = results.find((x) => x.r === "match");
    const partial = results.find((x) => x.r === "partly_hidden");
    const ref = phoneClaims.map((c) => c.value).join(" · ");
    if (match) {
      findings.push({ ...base, state: "match", rationaleCode: "PHONE_MATCH", referenceClaimIds: [match.c.id], sourceIds: match.c.sourceIds, reference: match.c.value, limitations: ["Someone can copy a real number into a chat. Call the number on file yourself rather than replying in the chat."] });
    } else if (partial) {
      findings.push({ ...base, state: "unknown", rationaleCode: "PHONE_PARTLY_HIDDEN", referenceClaimIds: [partial.c.id], sourceIds: partial.c.sourceIds, reference: ref, limitations: [] });
    } else {
      findings.push({ ...base, state: "different_from_reference", rationaleCode: "PHONE_DIFFERS", referenceClaimIds: phoneClaims.map((c) => c.id), sourceIds: uniq(phoneClaims.flatMap((c) => c.sourceIds)), reference: ref, limitations: [] });
    }
  }

  // ---- Chat sender and payment: never established by this product -----------------------------
  if (inputs.some((i) => i.kind === "chat_screenshot")) {
    const senders = observations.filter((o) => o.field === "chat_sender_label" && o.value);
    findings.push({
      id: "F-sender",
      kind: "message_sender",
      state: "unknown",
      rationaleCode: "SENDER_NOT_AUTHENTICATED",
      observationIds: senders.map((o) => o.id),
      referenceClaimIds: [],
      sourceIds: [],
      observed: uniq(senders.map((o) => o.value!)).join(" · ") || null,
      reference: null,
      limitations: [],
    });
  }
  const payments = observations.filter((o) => o.field === "payment_instruction" && o.value);
  if (payments.length) {
    findings.push({
      id: "F-payment",
      kind: "payment_instruction",
      state: "unknown",
      rationaleCode: "PAYMENT_NOT_ESTABLISHED",
      observationIds: payments.map((o) => o.id),
      referenceClaimIds: [],
      sourceIds: [],
      observed: uniq(payments.map((o) => maskAccountNumbers(o.value!))).join(" · "),
      reference: null,
      limitations: [],
    });
  }

  return findings;
}

export function reduceOutcome(findings: Finding[], subject: CaseSubject): CaseOutcome {
  const material = findings.filter((f) => f.kind === "facebook_page_url" || f.kind === "reservation_phone");
  if (material.some((f) => f.state === "different_from_reference")) return "potential_channel_conflict";
  if (subject.businessId && findings.some((f) => f.kind === "facebook_page_url" && f.state === "match")) {
    return "no_material_conflict_observed";
  }
  return "insufficient_evidence";
}

function collectPageLinks(observations: Observation[]): PageLink[] {
  const byKey = new Map<string, PageLink>();
  for (const o of observations) {
    if (!o.value || o.clarity === "unreadable") continue;
    let candidate: string | null = null;
    if (o.field === "facebook_url") candidate = o.value;
    // A bare handle is compared only when it is a plain username.
    else if (o.field === "facebook_handle") {
      const h = o.value.trim().replace(/^@/, "");
      if (/^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/.test(h)) candidate = `facebook.com/${h}`;
    }
    if (!candidate) continue;
    const p = parseFacebookUrl(candidate);
    if (!p.ok) continue;
    const certain = o.origin === "user" || (o.clarity === "clear" && o.field === "facebook_url");
    const existing = byKey.get(p.normalized);
    if (existing) {
      existing.observationIds.push(o.id);
      existing.certain ||= certain;
    } else {
      byKey.set(p.normalized, { key: p.normalized, display: displayFacebookUrl(p), observationIds: [o.id], certain });
    }
  }
  return [...byKey.values()];
}

function displayClaimUrl(c: RegistryClaim): string {
  const p = parseFacebookUrl(c.value);
  return p.ok ? displayFacebookUrl(p) : c.value;
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}


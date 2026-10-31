// Registry integrity and admission-gate checks (TDD §3.3). Pure functions: used by the loader,
// unit tests and the release-gate script.
import type { BusinessReference, RegistryClaim, RegistryFiles, RegistrySource } from "./schema";

export const REVIEW_DUE_DAYS = 60;
export const REQUIRED_ADMITTED = 10;

// Sources the business itself controls. They may corroborate a page link, but domain control
// alone cannot establish who the registered business is, so they never admit a record alone.
const OWNER_CONTROLLED = new Set(["independent_business_site", "listed_facebook_page", "owner_attestation"]);

const pageKey = (url: string) => url.toLowerCase().replace(/^https?:\/\/(www\.|m\.)?/, "").replace(/\/+$/, "");

export interface Issue {
  ref: string;
  message: string;
}

/** Structural problems: duplicate IDs, dangling references, mismatched ownership. */
export function integrityIssues(files: RegistryFiles): Issue[] {
  const issues: Issue[] = [];
  const dupes = (items: { id: string }[], label: string) => {
    const seen = new Set<string>();
    for (const { id } of items) {
      if (seen.has(id)) issues.push({ ref: id, message: `duplicate ${label} id` });
      seen.add(id);
    }
  };
  dupes(files.businesses, "business");
  dupes(files.sources, "source");
  dupes(files.claims, "claim");

  const sources = new Set(files.sources.map((s) => s.id));
  const claimsById = new Map(files.claims.map((c) => [c.id, c]));
  const businesses = new Set(files.businesses.map((b) => b.id));

  for (const b of files.businesses) {
    for (const sid of b.sourceIds) if (!sources.has(sid)) issues.push({ ref: b.id, message: `unknown source ${sid}` });
    for (const cid of b.claimIds) {
      const c = claimsById.get(cid);
      if (!c) issues.push({ ref: b.id, message: `unknown claim ${cid}` });
      else if (c.businessId !== b.id) issues.push({ ref: b.id, message: `claim ${cid} belongs to ${c.businessId}` });
    }
  }
  for (const c of files.claims) {
    if (!businesses.has(c.businessId)) issues.push({ ref: c.id, message: `unknown business ${c.businessId}` });
    for (const sid of c.sourceIds) if (!sources.has(sid)) issues.push({ ref: c.id, message: `unknown source ${sid}` });
    const owner = files.businesses.find((b) => b.id === c.businessId);
    if (owner && !owner.claimIds.includes(c.id)) issues.push({ ref: c.id, message: "claim not listed on its business" });
  }
  return issues;
}

/** Automated part of the admission gate for one business. Manual link review is recorded by the reviewer. */
export function admissionIssues(
  b: BusinessReference,
  claims: RegistryClaim[],
  sources: RegistrySource[],
): string[] {
  const out: string[] = [];
  const own = claims.filter((c) => c.businessId === b.id);
  const fb = own.filter((c) => c.kind === "facebook_page_url" && c.trust === "corroborated");
  if (fb.length === 0) out.push("no corroborated Facebook page claim");
  const srcById = new Map(sources.map((s) => [s.id, s]));
  const independentFb = fb.some((c) =>
    c.sourceIds.some((sid) => {
      const s = srcById.get(sid);
      return s !== undefined && !OWNER_CONTROLLED.has(s.kind);
    }),
  );
  if (fb.length > 0 && !independentFb) out.push("no Facebook claim backed by a source independent of the business");
  if (own.some((c) => c.trust === "conflicted")) out.push("has a conflicted claim; reconcile before admission");
  // Contacts read from a Facebook page count only when that exact page is independently listed.
  const isIndependent = (sid: string) => {
    const s = srcById.get(sid);
    return s !== undefined && !OWNER_CONTROLLED.has(s.kind);
  };
  const listedPages = new Set(fb.filter((c) => c.sourceIds.some(isIndependent)).map((c) => c.normalizedValue));
  for (const c of own) {
    for (const sid of c.sourceIds) {
      const s = srcById.get(sid);
      if (s?.kind !== "listed_facebook_page") continue;
      if (c.kind === "facebook_page_url" || c.kind === "facebook_page_id") out.push(`${c.id}: a page can't vouch for itself`);
      else if (!listedPages.has(pageKey(s.url))) out.push(`${c.id}: source page ${s.url} is not this business's independently listed page`);
    }
  }
  if (!b.synthetic && /pending/i.test(b.reviewerNote)) out.push("manual review not recorded");
  return out;
}

export function isReviewDue(reviewedAt: string, now = new Date(), days = REVIEW_DUE_DAYS): boolean {
  const reviewed = new Date(`${reviewedAt}T00:00:00Z`).getTime();
  return now.getTime() - reviewed > days * 86_400_000;
}

export interface GateReport {
  admitted: string[];
  rejected: { id: string; reasons: string[] }[];
  pending: string[];
  passes: boolean;
}

/** Release gate: at least ten real (non-synthetic) admitted records that pass admission checks. */
export function releaseGate(files: RegistryFiles): GateReport {
  const admitted: string[] = [];
  const rejected: { id: string; reasons: string[] }[] = [];
  const pending: string[] = [];
  for (const b of files.businesses) {
    if (b.synthetic) continue;
    if (b.registryStatus !== "admitted") {
      pending.push(b.id);
      continue;
    }
    const reasons = admissionIssues(b, files.claims, files.sources);
    if (reasons.length) rejected.push({ id: b.id, reasons });
    else admitted.push(b.id);
  }
  return { admitted, rejected, pending, passes: admitted.length >= REQUIRED_ADMITTED && rejected.length === 0 };
}

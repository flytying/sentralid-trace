// Read-only, memoized registry loader. Real records and the synthetic sample set are kept apart:
// samples are only reachable when a caller explicitly asks for them.
import businesses from "@/data/reference-registry/businesses.json";
import claims from "@/data/reference-registry/claims.json";
import manifest from "@/data/reference-registry/manifest.json";
import sources from "@/data/reference-registry/sources.json";
import samples from "@/data/reference-registry/fixtures/samples.json";
import { integrityIssues, isReviewDue } from "./eligibility";
import {
  RegistryFiles,
  RegistryManifest,
  type BusinessReference,
  type RegistryClaim,
  type RegistrySource,
} from "./schema";

export interface Registry {
  version: string;
  businesses: BusinessReference[];
  sources: RegistrySource[];
  claims: RegistryClaim[];
}

function parse(files: unknown, label: string): RegistryFiles {
  const parsed = RegistryFiles.safeParse(files);
  if (!parsed.success) {
    throw new Error(`${label} registry failed schema validation: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`);
  }
  const issues = integrityIssues(parsed.data);
  if (issues.length) throw new Error(`${label} registry integrity: ${issues.map((i) => `${i.ref}: ${i.message}`).join("; ")}`);
  return parsed.data;
}

let realCache: Registry | null = null;
let sampleCache: Registry | null = null;

/** All real records, any status. Callers that serve users must filter with `isServable`. */
export function loadRealRegistry(): Registry {
  if (!realCache) {
    const files = parse({ businesses, sources, claims }, "Reference");
    if (files.businesses.some((b) => b.synthetic)) throw new Error("Synthetic record found in the real registry");
    realCache = { version: RegistryManifest.parse(manifest).version, ...files };
  }
  return realCache;
}

export function loadSampleRegistry(): Registry {
  if (!sampleCache) {
    const files = parse(samples, "Sample");
    if (files.businesses.some((b) => !b.synthetic)) throw new Error("Non-synthetic record found in the sample set");
    sampleCache = { version: "samples-v1", ...files };
  }
  return sampleCache;
}

/** Only admitted records are shown or compared against. Drafts and needs_review never are. */
export function isServable(b: BusinessReference): boolean {
  return b.registryStatus === "admitted";
}

export interface ReferenceView {
  id: string;
  displayName: string;
  locality: string;
  province: string;
  synthetic: boolean;
  reviewedAt: string;
  reviewDue: boolean;
  facebookPages: { claimId: string; url: string; normalized: string; label: string | null; sourceIds: string[] }[];
  sources: { id: string; kind: RegistrySource["kind"]; ownerName: string; title: string; url: string; method: string; reviewedAt: string }[];
  contacts: { claimId: string; kind: RegistryClaim["kind"]; value: string; sourceIds: string[] }[];
}

export function toView(reg: Registry, b: BusinessReference, now = new Date()): ReferenceView {
  const own = reg.claims.filter((c) => c.businessId === b.id && c.trust === "corroborated");
  const srcIds = new Set(b.sourceIds);
  return {
    id: b.id,
    displayName: b.displayName,
    locality: b.locality,
    province: b.province,
    synthetic: b.synthetic,
    reviewedAt: b.reviewedAt,
    reviewDue: isReviewDue(b.reviewedAt, now),
    facebookPages: own
      .filter((c) => c.kind === "facebook_page_url")
      .map((c) => ({ claimId: c.id, url: c.value, normalized: c.normalizedValue, label: c.label ?? null, sourceIds: c.sourceIds })),
    sources: reg.sources
      .filter((s) => srcIds.has(s.id))
      .map(({ id, kind, ownerName, title, url, method, reviewedAt }) => ({ id, kind, ownerName, title, url, method, reviewedAt })),
    contacts: own
      .filter((c) => c.kind === "reservation_phone" || c.kind === "reservation_email" || c.kind === "website_url")
      .map((c) => ({ claimId: c.id, kind: c.kind, value: c.value, sourceIds: c.sourceIds })),
  };
}

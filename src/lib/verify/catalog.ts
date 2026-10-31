// VerifyNext: server-owned catalog of safe checks and the deterministic candidate builder
// (TDD §5.3). The model may only choose among candidates produced here.
import { displayFacebookUrl, parseFacebookUrl } from "../facebook-url";
import { isServable, type Registry } from "../registry/load";
import type { RegistrySource } from "../registry/schema";
import type { CaseSubject, Finding } from "../engine/types";

export const ACTION_IDS = [
  "COMPARE_LGU_REFERENCE_PAGE",
  "COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE",
  "CHECK_REGISTERED_CONTACT_POLICY",
  "MESSAGE_FROM_LISTED_PAGE",
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

/** How a check's answer comes back into the case. */
export type Resolution = "page_link_or_screenshot" | "user_report";

export interface CheckCandidate {
  actionId: ActionId;
  targetFindingId: string;
  resolution: Resolution;
  /** Registry sources the user is pointed to. Never a link taken from the questioned material. */
  sources: { id: string; title: string; url: string; kind: RegistrySource["kind"] }[];
  /** Independently documented values the user can compare against. */
  documented: string[];
  label: string;
  how: string;
  effort: "low" | "medium";
  /** Higher = better at separating the two explanations. */
  discriminative: number;
}

export interface Hypotheses {
  a: string;
  b: string;
}

export type PlanStatus = "check_available" | "no_material_issue" | "no_safe_check";

export interface PlanInput {
  status: PlanStatus;
  target: Finding | null;
  hypotheses: Hypotheses | null;
  candidates: CheckCandidate[];
}

/** Pick the highest-consequence unresolved finding and the safe checks that could resolve it. */
export function buildPlanInput(reg: Registry, subject: CaseSubject, findings: Finding[]): PlanInput {
  const business = subject.businessId ? reg.businesses.find((b) => b.id === subject.businessId && isServable(b)) : undefined;
  const page = findings.find((f) => f.kind === "facebook_page_url" && f.state !== "match");
  const phone = findings.find((f) => f.kind === "reservation_phone" && f.state !== "match" && f.rationaleCode !== "PHONE_NO_REFERENCE");
  // Who is behind a chat can't be read from a screenshot; it becomes the target only when the
  // page and numbers leave nothing else to check.
  const sender = findings.find((f) => f.kind === "message_sender");
  const target = page ?? phone ?? sender ?? null;

  if (!target) return { status: "no_material_issue", target: null, hypotheses: null, candidates: [] };
  if (!business) return { status: "no_safe_check", target, hypotheses: hypothesesFor(target), candidates: [] };

  const claims = reg.claims.filter((c) => c.businessId === business.id && c.trust === "corroborated");
  const srcById = new Map(reg.sources.map((s) => [s.id, s]));
  const fbClaims = claims.filter((c) => c.kind === "facebook_page_url");
  const pagesBy = (kind: RegistrySource["kind"]) => fbClaims.filter((c) => c.sourceIds.some((id) => srcById.get(id)?.kind === kind));
  const sourceList = (kind: RegistrySource["kind"]) =>
    [...new Set(pagesBy(kind).flatMap((c) => c.sourceIds))]
      .map((id) => srcById.get(id)!)
      .filter((s) => s.kind === kind)
      .map((s) => ({ id: s.id, title: s.title, url: s.url, kind: s.kind }));
  const shown = (urls: string[]) => urls.map((u) => {
    const p = parseFacebookUrl(u);
    return p.ok ? displayFacebookUrl(p) : u;
  });

  const candidates: CheckCandidate[] = [];
  const pageUnresolved = target.kind === "facebook_page_url" && target.state === "unknown";

  const lguPages = pagesBy("local_tourism_directory");
  if (target.kind === "facebook_page_url" && lguPages.length) {
    candidates.push({
      actionId: "COMPARE_LGU_REFERENCE_PAGE",
      targetFindingId: target.id,
      resolution: "page_link_or_screenshot",
      sources: sourceList("local_tourism_directory"),
      documented: shown(lguPages.map((c) => c.value)),
      label: "Compare with the page in the tourism office's list",
      how: "Open the page you're talking to on Facebook, copy its address from the browser (or take a screenshot that shows it), and add it here. We'll compare it with the page the tourism office lists.",
      effort: "low",
      discriminative: pageUnresolved ? 2 : 1,
    });
  }

  const sitePages = pagesBy("independent_business_site");
  if (target.kind === "facebook_page_url" && sitePages.length) {
    const extra = sitePages.some((c) => !lguPages.includes(c));
    candidates.push({
      actionId: "COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE",
      targetFindingId: target.id,
      resolution: "page_link_or_screenshot",
      sources: sourceList("independent_business_site"),
      documented: shown(sitePages.map((c) => c.value)),
      label: "Compare with the pages the resort's own website links",
      how: "Open the page you're talking to on Facebook, copy its address (or screenshot it with the address showing), and add it here. We'll compare it with every page the resort's website links to.",
      effort: "low",
      // A website that documents extra pages can confirm an authorised second page.
      discriminative: pageUnresolved ? (extra ? 3 : 2) : extra ? 2 : 1,
    });
  }

  const phones = claims.filter((c) => c.kind === "reservation_phone");
  if (phones.length && target !== sender) {
    candidates.push({
      actionId: "CHECK_REGISTERED_CONTACT_POLICY",
      targetFindingId: target.id,
      resolution: "user_report",
      sources: [...new Set(phones.flatMap((c) => c.sourceIds))].map((id) => srcById.get(id)!).map((s) => ({ id: s.id, title: s.title, url: s.url, kind: s.kind })),
      documented: phones.map((c) => c.value),
      label: "Ask the resort through the number on file",
      how: "Call the number on file — not any number from the chat — and ask whether the page or number you were given belongs to them. Don't pay or share codes while you check.",
      effort: "medium",
      // Can't change a record by itself, but is the most direct way to separate the explanations when links differ.
      discriminative: pageUnresolved ? 1 : 3,
    });
  }

  // Messaging the resort from its listed page shows the user, in their own app, whether the chat
  // they're in is with that page. Offered when it can tell the explanations apart: the sender is
  // the open question, or the chat comes with a page or number that doesn't match.
  if (sender && lguPages.length && (target === sender || target.state === "different_from_reference")) {
    candidates.push({
      actionId: "MESSAGE_FROM_LISTED_PAGE",
      targetFindingId: target.id,
      resolution: "user_report",
      sources: sourceList("local_tourism_directory"),
      documented: shown(lguPages.map((c) => c.value)),
      label: "Message the resort from the page the tourism office lists",
      how: "In your Facebook app, open the page shown below (search for it or open the tourism office's list) and tap Message. If it opens the same conversation that asked you to book or pay, you're chatting with that page. If it opens a new, empty chat, the account that messaged you is a different one.",
      effort: "low",
      discriminative: target === sender ? 3 : 2,
    });
  }

  candidates.sort((x, y) => y.discriminative - x.discriminative || (x.effort === y.effort ? 0 : x.effort === "low" ? -1 : 1) || ACTION_IDS.indexOf(x.actionId) - ACTION_IDS.indexOf(y.actionId));
  return { status: candidates.length ? "check_available" : "no_safe_check", target, hypotheses: hypothesesFor(target), candidates };
}

function hypothesesFor(f: Finding): Hypotheses {
  if (f.kind === "facebook_page_url" && f.state === "unknown") {
    return {
      a: "You're talking to a page the resort is documented to use.",
      b: "You're talking to a page that isn't connected to the resort.",
    };
  }
  if (f.kind === "facebook_page_url") {
    return {
      a: "The resort runs this page too, but our sources don't list it.",
      b: "Someone else made this page to look like the resort's.",
    };
  }
  if (f.kind === "message_sender") {
    return {
      a: "You're chatting with the page the tourism office lists for this resort.",
      b: "You're chatting with a different account that uses the resort's name.",
    };
  }
  return {
    a: "The resort uses this number too, but our source doesn't list it.",
    b: "The number belongs to someone else using the resort's name.",
  };
}

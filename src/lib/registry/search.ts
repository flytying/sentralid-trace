// Name search and Facebook-link lookup over servable registry records.
// Similarity is used only to *suggest* which resort a user may mean — never as evidence.
import { parseFacebookUrl } from "../facebook-url";
import { isServable, toView, type ReferenceView, type Registry } from "./load";

export function fold(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function searchByName(reg: Registry, query: string, limit = 8): ReferenceView[] {
  const q = fold(query).slice(0, 80);
  const servable = reg.businesses.filter(isServable);
  if (!q) return servable.slice(0, limit).map((b) => toView(reg, b));
  const terms = q.split(" ");
  return servable
    .map((b) => {
      const name = fold(`${b.displayName} ${b.locality} ${b.province}`);
      const hit = terms.every((t) => name.includes(t));
      const starts = fold(b.displayName).startsWith(q);
      return { b, score: hit ? (starts ? 2 : 1) : 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.b.displayName.localeCompare(b.b.displayName))
    .slice(0, limit)
    .map((x) => toView(reg, x.b));
}

export type LinkLookup =
  | { status: "invalid"; error: string }
  | { status: "exact"; normalized: string; matches: { business: ReferenceView; claimId: string }[] }
  | { status: "similar"; normalized: string; suggestions: ReferenceView[] }
  | { status: "unknown"; normalized: string };

/** Exact normalized-path comparison only; "similar" is a picker hint, never a match. */
export function lookupFacebookLink(reg: Registry, input: string): LinkLookup {
  const parsed = parseFacebookUrl(input);
  if (!parsed.ok) return { status: "invalid", error: parsed.error };
  const servable = reg.businesses.filter(isServable);
  const servableIds = new Set(servable.map((b) => b.id));
  const exact = reg.claims.filter(
    (c) =>
      c.kind === "facebook_page_url" &&
      c.trust === "corroborated" &&
      c.normalizedValue === parsed.normalized &&
      servableIds.has(c.businessId),
  );
  if (exact.length) {
    return {
      status: "exact",
      normalized: parsed.normalized,
      matches: exact.map((c) => ({ business: toView(reg, servable.find((b) => b.id === c.businessId)!), claimId: c.id })),
    };
  }
  if (parsed.kind === "username" && parsed.username) {
    const key = squash(parsed.username);
    const suggestions = servable.filter((b) =>
      reg.claims.some((c) => {
        if (c.businessId !== b.id || c.kind !== "facebook_page_url") return false;
        const known = squash(c.normalizedValue.replace("facebook.com/", ""));
        return known.length >= 5 && (key.includes(known) || known.includes(key) || editDistance(key, known) <= 3);
      }),
    );
    if (suggestions.length) return { status: "similar", normalized: parsed.normalized, suggestions: suggestions.map((b) => toView(reg, b)) };
  }
  return { status: "unknown", normalized: parsed.normalized };
}

function squash(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

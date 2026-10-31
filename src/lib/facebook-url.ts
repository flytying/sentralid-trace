// Strict Facebook page URL parser (TDD §3.5, PR-02). Never fetches anything.
// Produces a comparison key; it does not and cannot tell who controls the page.

const ALLOWED_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "mbasic.facebook.com"]);
const SHORTENER_HOSTS = new Set(["fb.me", "fb.com", "www.fb.com", "fb.watch", "on.fb.me", "l.facebook.com", "lm.facebook.com"]);

// First path segments that are Facebook features, not page usernames.
const RESERVED = new Set([
  "l.php", "share", "sharer", "sharer.php", "groups", "events", "photo", "photo.php", "photos", "watch", "story.php",
  "permalink.php", "reel", "reels", "marketplace", "gaming", "login", "login.php", "help", "settings", "messages",
  "hashtag", "search", "home.php", "dialog", "plugins", "policies", "privacy", "notes", "media", "stories", "friends",
]);

const VANITY = /^[A-Za-z0-9][A-Za-z0-9._-]{1,79}$/;
const NUMERIC_ID = /^\d{5,20}$/;

export type FacebookUrlError =
  | "EMPTY"
  | "NOT_A_URL"
  | "NOT_HTTPS"
  | "SHORTENER"
  | "NOT_FACEBOOK"
  | "CREDENTIALS_OR_PORT"
  | "NESTED_URL"
  | "NOT_A_PAGE";

export type ParsedFacebookUrl =
  | {
      ok: true;
      raw: string;
      /** Comparison key, e.g. "facebook.com/acuaticobeachresort" or "facebook.com/profile.php?id=1000…" */
      normalized: string;
      /** Canonical display URL; casing of the username is preserved for display only. */
      canonicalUrl: string;
      kind: "username" | "page_id";
      username?: string;
      pageId?: string;
    }
  | { ok: false; raw: string; error: FacebookUrlError };

export function parseFacebookUrl(input: string): ParsedFacebookUrl {
  const raw = input.trim();
  const fail = (error: FacebookUrlError): ParsedFacebookUrl => ({ ok: false, raw, error });
  if (!raw) return fail("EMPTY");
  if (raw.length > 500 || /\s/.test(raw)) return fail("NOT_A_URL");

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return fail("NOT_A_URL");
  }

  const host = url.hostname.toLowerCase();
  if (SHORTENER_HOSTS.has(host)) return fail("SHORTENER");
  if (!ALLOWED_HOSTS.has(host)) return fail("NOT_FACEBOOK");
  if (url.protocol !== "https:") return fail("NOT_HTTPS");
  if (url.username || url.password || url.port) return fail("CREDENTIALS_OR_PORT");

  const decoded = safeDecode(url.pathname + url.search);
  if (/https?:|%2f%2f|\/\//i.test(decoded.replace(/^\/+/, ""))) return fail("NESTED_URL");

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return fail("NOT_A_PAGE");
  const first = segments[0];
  const firstLower = first.toLowerCase();

  // profile.php?id=123 — numeric page/profile id.
  if (firstLower === "profile.php") {
    const pid = url.searchParams.get("id") ?? "";
    if (!NUMERIC_ID.test(pid) || segments.length > 1) return fail("NOT_A_PAGE");
    return idResult(raw, pid);
  }
  // /people/Name/123 and /pages/Name/123 — the trailing id identifies the page.
  if ((firstLower === "people" || firstLower === "pages") && segments.length >= 3) {
    const pid = segments[2];
    if (!NUMERIC_ID.test(pid)) return fail("NOT_A_PAGE");
    return idResult(raw, pid);
  }
  if (RESERVED.has(firstLower) || firstLower === "people" || firstLower === "pages") return fail("NOT_A_PAGE");
  if (!VANITY.test(first)) return fail("NOT_A_PAGE");

  return {
    ok: true,
    raw,
    kind: "username",
    username: first,
    // Facebook usernames are case-insensitive; compare in lower case, keep raw casing for display.
    normalized: `facebook.com/${firstLower}`,
    canonicalUrl: `https://www.facebook.com/${first}`,
  };
}

function idResult(raw: string, pageId: string): ParsedFacebookUrl {
  return {
    ok: true,
    raw,
    kind: "page_id",
    pageId,
    normalized: `facebook.com/profile.php?id=${pageId}`,
    canonicalUrl: `https://www.facebook.com/profile.php?id=${pageId}`,
  };
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Display form used in the UI, e.g. "facebook.com/AcuaticoBeachResort". */
export function displayFacebookUrl(p: Extract<ParsedFacebookUrl, { ok: true }>): string {
  return p.kind === "username" ? `facebook.com/${p.username}` : p.normalized;
}

export const FACEBOOK_URL_ERROR_TEXT: Record<FacebookUrlError, string> = {
  EMPTY: "Paste a Facebook page link, like facebook.com/pagename.",
  NOT_A_URL: "That doesn't look like a link. Try facebook.com/pagename.",
  NOT_HTTPS: "Use the https:// version of the link, or paste it without http.",
  SHORTENER: "Short or redirect links (like fb.me) can't be compared. Open it and copy the page's full facebook.com address.",
  NOT_FACEBOOK: "That isn't a facebook.com link. Lookalike addresses are never treated as Facebook.",
  CREDENTIALS_OR_PORT: "That link has unusual parts we don't accept. Copy the page address again.",
  NESTED_URL: "That link points somewhere else inside it. Copy the page's own facebook.com address.",
  NOT_A_PAGE: "That's a Facebook link, but not to a page. Try the page's main address, like facebook.com/pagename.",
};

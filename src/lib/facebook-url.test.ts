import { describe, expect, it } from "vitest";
import { parseFacebookUrl } from "./facebook-url";

const ok = (input: string) => {
  const r = parseFacebookUrl(input);
  if (!r.ok) throw new Error(`expected ok for ${input}, got ${r.error}`);
  return r;
};
const err = (input: string) => {
  const r = parseFacebookUrl(input);
  if (r.ok) throw new Error(`expected error for ${input}`);
  return r.error;
};

describe("parseFacebookUrl — accepted forms", () => {
  it.each([
    "https://www.facebook.com/AcuaticoBeachResort",
    "https://facebook.com/AcuaticoBeachResort/",
    "facebook.com/AcuaticoBeachResort",
    "www.facebook.com/acuaticobeachresort",
    "https://m.facebook.com/AcuaticoBeachResort?ref=page_internal",
    "https://web.facebook.com/AcuaticoBeachResort?_rdc=1&_rdr",
    "https://www.facebook.com/AcuaticoBeachResort/?mibextid=LQQJ4d#",
    "https://www.facebook.com/AcuaticoBeachResort/posts/123456",
    "  https://WWW.FACEBOOK.COM/AcuaticoBeachResort  ",
  ])("%s → one comparison key", (input) => {
    expect(ok(input).normalized).toBe("facebook.com/acuaticobeachresort");
  });

  it("keeps the raw casing for display", () => {
    const r = ok("https://web.facebook.com/AcuaticoBeachResort");
    expect(r.canonicalUrl).toBe("https://www.facebook.com/AcuaticoBeachResort");
    expect(r.raw).toBe("https://web.facebook.com/AcuaticoBeachResort");
  });

  it("parses numeric profile ids and drops tracking parameters", () => {
    const r = ok("https://www.facebook.com/profile.php?id=61592929209938&mibextid=LQQJ4d&rdid=x");
    expect(r.kind).toBe("page_id");
    expect(r.normalized).toBe("facebook.com/profile.php?id=61592929209938");
  });

  it("parses /people/ and /pages/ ids", () => {
    expect(ok("https://www.facebook.com/people/Some-Resort/100064182843841/").pageId).toBe("100064182843841");
    expect(ok("https://www.facebook.com/pages/Some-Resort/100064182843841").pageId).toBe("100064182843841");
  });

  it("treats similar-looking usernames as different pages", () => {
    expect(ok("facebook.com/bahaydagat.moalboal.ph").normalized).not.toBe(ok("facebook.com/bahaydagatmoalboal").normalized);
  });
});

describe("parseFacebookUrl — rejected forms", () => {
  it.each([
    ["", "EMPTY"],
    ["instagram.com/lumencove", "NOT_FACEBOOK"],
    ["https://facebook.com.ph/resort", "NOT_FACEBOOK"],
    ["https://faceb00k.com/resort", "NOT_FACEBOOK"],
    ["https://facebook.com.evil.io/resort", "NOT_FACEBOOK"],
    ["https://secure-facebook.com/resort", "NOT_FACEBOOK"],
    ["https://157.240.1.35/resort", "NOT_FACEBOOK"],
    ["http://www.facebook.com/resort", "NOT_HTTPS"],
    ["https://fb.me/resort", "SHORTENER"],
    ["https://l.facebook.com/l.php?u=https%3A%2F%2Fevil.example", "SHORTENER"],
    ["https://www.facebook.com/l.php?u=https%3A%2F%2Fevil.example", "NESTED_URL"],
    ["https://user:pass@www.facebook.com/resort", "CREDENTIALS_OR_PORT"],
    ["https://www.facebook.com:8443/resort", "CREDENTIALS_OR_PORT"],
    ["https://www.facebook.com/share/18LXzPmb4m/", "NOT_A_PAGE"],
    ["https://www.facebook.com/groups/12345", "NOT_A_PAGE"],
    ["https://www.facebook.com/", "NOT_A_PAGE"],
    ["https://www.facebook.com/profile.php?id=abc", "NOT_A_PAGE"],
    ["javascript:alert(1)", "NOT_FACEBOOK"],
    ["face book.com/resort", "NOT_A_URL"],
  ])("%s → %s", (input, code) => {
    expect(err(input)).toBe(code);
  });
});

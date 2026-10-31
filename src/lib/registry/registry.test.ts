import { describe, expect, it } from "vitest";
import { parseFacebookUrl } from "../facebook-url";
import { admissionIssues, integrityIssues, isReviewDue, releaseGate } from "./eligibility";
import { isServable, loadRealRegistry, loadSampleRegistry, type Registry } from "./load";
import type { RegistryFiles } from "./schema";
import { lookupFacebookLink, searchByName } from "./search";

const real = loadRealRegistry();
const samples = loadSampleRegistry();

describe("registry files (CI)", () => {
  it.each([
    ["real", real],
    ["sample", samples],
  ] as const)("%s registry parses with no integrity issues", (_label, reg) => {
    expect(integrityIssues(reg)).toEqual([]);
  });

  it("keeps synthetic and real records apart", () => {
    expect(real.businesses.every((b) => !b.synthetic)).toBe(true);
    expect(samples.businesses.every((b) => b.synthetic)).toBe(true);
    const realIds = new Set(real.businesses.map((b) => b.id));
    expect(samples.businesses.some((b) => realIds.has(b.id))).toBe(false);
  });

  it("synthetic sources only use reserved .example domains", () => {
    for (const s of samples.sources) expect(new URL(s.url).hostname.endsWith(".example")).toBe(true);
  });

  it.each([
    ["real", real],
    ["sample", samples],
  ] as const)("%s Facebook claims store the parser's own normalized key", (_label, reg) => {
    for (const c of reg.claims.filter((c) => c.kind === "facebook_page_url")) {
      const p = parseFacebookUrl(c.value);
      expect(p.ok, c.id).toBe(true);
      if (p.ok) expect(c.normalizedValue, c.id).toBe(p.normalized);
    }
  });

  it("every real Facebook claim is backed by the LGU directory", () => {
    const fb = real.claims.filter((c) => c.kind === "facebook_page_url" && c.label === "Main page");
    expect(fb.length).toBe(real.businesses.length);
    for (const c of fb) expect(c.sourceIds).toContain("SRC-LGU-SJB-FBDIR");
  });

  it("records no payment-account claims", () => {
    for (const c of [...real.claims, ...samples.claims]) expect(c.kind).not.toMatch(/payment|gcash|bank/i);
  });

  it("sample records pass the automated admission checks", () => {
    for (const b of samples.businesses) expect(admissionIssues(b, samples.claims, samples.sources), b.id).toEqual([]);
  });
});

describe("admission gate", () => {
  const base: RegistryFiles = JSON.parse(JSON.stringify({ businesses: real.businesses, sources: real.sources, claims: real.claims }));

  it("does not count drafts or synthetic records", () => {
    const gate = releaseGate(base);
    expect(gate.admitted.length).toBe(real.businesses.filter((b) => b.registryStatus === "admitted").length);
    expect(releaseGate({ ...samples }).admitted).toEqual([]);
  });

  it("rejects an admitted record backed only by the business's own website", () => {
    const files: RegistryFiles = JSON.parse(JSON.stringify(base));
    const b = files.businesses.find((x) => x.id === "acuatico-beach-resort")!;
    b.registryStatus = "admitted";
    b.reviewerNote = "Reviewed.";
    const c = files.claims.find((x) => x.id === "CLM-acuatico-beach-resort-fb-1")!;
    c.sourceIds = ["SRC-WEB-ACUATICO"];
    expect(admissionIssues(b, files.claims, files.sources)).toContain(
      "no Facebook claim backed by a source independent of the business",
    );
  });

  it("rejects an admitted record whose manual review is not recorded", () => {
    const b = { ...base.businesses[0], registryStatus: "admitted" as const };
    expect(admissionIssues(b, base.claims, base.sources)).toContain("manual review not recorded");
  });

  it("flags review-due records after 60 days", () => {
    expect(isReviewDue("2026-08-01", new Date("2026-10-31T00:00:00Z"))).toBe(true);
    expect(isReviewDue("2026-10-01", new Date("2026-10-31T00:00:00Z"))).toBe(false);
  });
});

describe("search and link lookup", () => {
  const draftOnly: Registry = real;

  it("never serves draft records", () => {
    for (const b of draftOnly.businesses.filter((b) => !isServable(b))) {
      expect(searchByName(draftOnly, b.displayName).map((v) => v.id)).not.toContain(b.id);
    }
  });

  it("finds sample resorts by partial, case- and accent-insensitive name", () => {
    expect(searchByName(samples, "lumen").map((v) => v.id)).toEqual(["sample-lumen-cove"]);
    expect(searchByName(samples, "BAHAY dagat").map((v) => v.id)).toEqual(["sample-bahay-dagat"]);
    expect(searchByName(samples, "moalboal").map((v) => v.id)).toEqual(["sample-bahay-dagat"]);
    expect(searchByName(samples, "isla verde")).toEqual([]);
  });

  it("matches documented main and alternate pages exactly", () => {
    const main = lookupFacebookLink(samples, "https://m.facebook.com/LumenCoveResort?ref=share");
    expect(main.status).toBe("exact");
    const alt = lookupFacebookLink(samples, "facebook.com/lumencove.reservations");
    expect(alt.status === "exact" && alt.matches[0].claimId).toBe("CLM-sample-lc-fb-2");
  });

  it("only suggests — never matches — a lookalike page", () => {
    const r = lookupFacebookLink(samples, "facebook.com/bahaydagat.moalboal.ph");
    expect(r.status).toBe("similar");
    expect(lookupFacebookLink(samples, "facebook.com/lumencove.resort.ph").status).toBe("similar");
  });

  it("reports unlisted and invalid links", () => {
    expect(lookupFacebookLink(samples, "facebook.com/islaverdehideaway").status).toBe("unknown");
    expect(lookupFacebookLink(samples, "instagram.com/lumencove")).toEqual({ status: "invalid", error: "NOT_FACEBOOK" });
  });
});

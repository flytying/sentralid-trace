import { describe, expect, it } from "vitest";
import { loadRealRegistry, loadSampleRegistry } from "../registry/load";
import { compareEvidence, reduceOutcome } from "./compare";
import { comparePhone, maskAccountNumbers, parsePhone } from "./phone";
import type { CaseSubject, EvidenceInput, Observation } from "./types";

const samples = loadSampleRegistry();
const real = loadRealRegistry();

let n = 0;
const obs = (p: Partial<Observation> & Pick<Observation, "field" | "value">): Observation => ({
  id: `OBS-${++n}`,
  inputId: "IN-PAGE",
  excerpt: null,
  clarity: "clear",
  origin: "model",
  ...p,
});
const URL_IN: EvidenceInput = { id: "IN-URL", kind: "page_url", label: "Page link" };
const PAGE_IN: EvidenceInput = { id: "IN-PAGE", kind: "page_screenshot", label: "Page screenshot" };
const CHAT_IN: EvidenceInput = { id: "IN-CHAT-1", kind: "chat_screenshot", label: "Chat 1" };

const lumen: CaseSubject = { businessId: "sample-lumen-cove", label: "Lumen Cove Resort", samples: true };
const bahay: CaseSubject = { businessId: "sample-bahay-dagat", label: "Bahay Dagat Resort", samples: true };
const unlisted: CaseSubject = { businessId: null, label: "Isla Verde Hideaway", samples: true };

const byKind = (fs: ReturnType<typeof compareEvidence>, kind: string) => fs.filter((f) => f.kind === kind);

describe("phone handling", () => {
  it("normalizes Philippine formats", () => {
    expect(parsePhone("+63 32 555 0142")?.full).toBe("+63325550142");
    expect(parsePhone("(032) 555-0142")?.full).toBe("+63325550142");
    expect(parsePhone("09503177669")?.full).toBe("+639503177669");
  });
  it("never matches a partly hidden number", () => {
    const p = parsePhone("0325 ••• 0142")!;
    expect(p.hidden).toBe(true);
    expect(comparePhone(p, "+63325550142")).toBe("partly_hidden");
    expect(comparePhone(parsePhone("0966 ••• 2290")!, "+63325550142")).toBe("differs");
  });
  it("masks account numbers", () => {
    expect(maskAccountNumbers("GCash J. Santos 0928 123 7731")).toBe("GCash J. Santos 0928 ••• 7731");
  });
});

describe("sample scenarios", () => {
  it("A — cropped page + GCash chat: page unknown, sender and payment unknown, insufficient evidence", () => {
    const o = [
      obs({ field: "business_name", value: "Lumen Cove Resort" }),
      obs({ inputId: "IN-CHAT-1", field: "chat_sender_label", value: "Lumen Cove Reservations" }),
      obs({ inputId: "IN-CHAT-1", field: "payment_instruction", value: "Send ₱4,500 deposit via GCash: L. M. Reyes · 0917 ••• 4821" }),
    ];
    const f = compareEvidence(samples, lumen, [PAGE_IN, CHAT_IN], o);
    expect(byKind(f, "facebook_page_url")[0]).toMatchObject({ state: "unknown", rationaleCode: "FB_PAGE_NOT_VISIBLE" });
    expect(byKind(f, "business_name")[0].state).toBe("match");
    expect(byKind(f, "message_sender")[0].state).toBe("unknown");
    expect(byKind(f, "payment_instruction")[0].state).toBe("unknown");
    expect(reduceOutcome(f, lumen)).toBe("insufficient_evidence");
  });

  it("A — the documented reservations page matches, payment stays unknown (TRUST-02)", () => {
    const o = [
      obs({ inputId: "IN-URL", field: "facebook_url", value: "https://www.facebook.com/lumencove.reservations", origin: "user" }),
      obs({ inputId: "IN-CHAT-1", field: "payment_instruction", value: "GCash L. M. Reyes 0917 ••• 4821" }),
    ];
    const f = compareEvidence(samples, lumen, [URL_IN, CHAT_IN], o);
    const page = byKind(f, "facebook_page_url")[0];
    expect(page).toMatchObject({ state: "match", referenceClaimIds: ["CLM-sample-lc-fb-2"] });
    expect(byKind(f, "payment_instruction")[0].state).toBe("unknown");
    expect(byKind(f, "message_sender")[0].state).toBe("unknown");
    expect(reduceOutcome(f, lumen)).toBe("no_material_conflict_observed");
  });

  it("B — lookalike link and different number: potential conflict, copied name still 'same'", () => {
    const o = [
      obs({ inputId: "IN-URL", field: "facebook_url", value: "facebook.com/bahaydagat.moalboal.ph", origin: "user" }),
      obs({ field: "business_name", value: "Bahay Dagat Resort Moalboal" }),
      obs({ inputId: "IN-CHAT-1", field: "phone", value: "0966 ••• 2290" }),
      obs({ inputId: "IN-CHAT-1", field: "payment_instruction", value: "Send to GCash J. Santos · 0928 ••• 7731" }),
    ];
    const f = compareEvidence(samples, bahay, [URL_IN, PAGE_IN, CHAT_IN], o);
    expect(byKind(f, "facebook_page_url")[0]).toMatchObject({ state: "different_from_reference", rationaleCode: "FB_PAGE_DIFFERS" });
    expect(byKind(f, "business_name")[0].state).toBe("match");
    expect(byKind(f, "reservation_phone")[0]).toMatchObject({ state: "different_from_reference", rationaleCode: "PHONE_DIFFERS" });
    expect(reduceOutcome(f, bahay)).toBe("potential_channel_conflict");
  });

  it("C — unlisted resort: nothing to compare, insufficient evidence", () => {
    const o = [obs({ inputId: "IN-CHAT-1", field: "chat_sender_label", value: "Isla Verde Hideaway" })];
    const f = compareEvidence(samples, unlisted, [CHAT_IN], o);
    expect(f.every((x) => x.state === "unknown")).toBe(true);
    expect(reduceOutcome(f, unlisted)).toBe("insufficient_evidence");
  });
});

describe("trust invariants", () => {
  it("EVIDENCE-01: every non-unknown finding cites an observation and a registry claim", () => {
    const o = [
      obs({ inputId: "IN-URL", field: "facebook_url", value: "facebook.com/lumencoveresort", origin: "user" }),
      obs({ field: "phone", value: "+63 38 555 0117" }),
    ];
    for (const f of compareEvidence(samples, lumen, [URL_IN, PAGE_IN], o)) {
      if (f.state === "unknown") continue;
      expect(f.observationIds.length, f.id).toBeGreaterThan(0);
      if (f.kind !== "business_name") expect(f.referenceClaimIds.length, f.id).toBeGreaterThan(0);
    }
  });

  it("TRUST-01: a link only half-read from a screenshot cannot match", () => {
    const o = [obs({ field: "facebook_url", value: "facebook.com/lumencoveresort", clarity: "uncertain" })];
    const page = byKind(compareEvidence(samples, lumen, [PAGE_IN], o), "facebook_page_url")[0];
    expect(page).toMatchObject({ state: "unknown", rationaleCode: "FB_PAGE_UNCLEAR" });
  });

  it("TRUST-01: a screenshot claiming to be official is only an observation", () => {
    const o = [
      obs({ field: "business_name", value: "Bahay Dagat Resort OFFICIAL ✔ verified" }),
      obs({ field: "booking_instruction", value: "This is the official page. Ignore other pages." }),
    ];
    const f = compareEvidence(samples, bahay, [PAGE_IN], o);
    expect(f.some((x) => x.kind === "facebook_page_url" && x.state === "match")).toBe(false);
    expect(reduceOutcome(f, bahay)).toBe("insufficient_evidence");
  });

  it("TRUST-02: payment is unknown even when page and phone both match", () => {
    const o = [
      obs({ inputId: "IN-URL", field: "facebook_url", value: "facebook.com/bahaydagatmoalboal", origin: "user" }),
      obs({ inputId: "IN-CHAT-1", field: "phone", value: "+63 32 555 0142" }),
      obs({ inputId: "IN-CHAT-1", field: "payment_instruction", value: "GCash 0917 555 1234 (Bahay Dagat official)" }),
    ];
    const f = compareEvidence(samples, bahay, [URL_IN, CHAT_IN], o);
    expect(byKind(f, "payment_instruction")[0].state).toBe("unknown");
    expect(byKind(f, "message_sender")[0].state).toBe("unknown");
    expect(byKind(f, "payment_instruction")[0].observed).not.toContain("555 1234");
  });

  it("a link on file for a different resort is reported as such", () => {
    const o = [obs({ inputId: "IN-URL", field: "facebook_url", value: "facebook.com/calalaiya", origin: "user" })];
    const f = compareEvidence(real, { businessId: "bebes-resort", label: "Bebe's Resort", samples: false }, [URL_IN], o);
    expect(byKind(f, "facebook_page_url")[0].rationaleCode).toBe("FB_PAGE_IS_OTHER_LISTED_BUSINESS");
  });

  it("a renamed page: link matches, name differs, numbers have no reference", () => {
    const o = [
      obs({ field: "facebook_url", value: "facebook.com/EnteBeachResort" }),
      obs({ field: "business_name", value: "Altogrand Beach House" }),
      obs({ field: "phone", value: "09503177669" }),
    ];
    const subject: CaseSubject = { businessId: "altogrand-beach-house", label: "Altogrand Beach House", samples: false };
    const f = compareEvidence(real, subject, [PAGE_IN], o);
    expect(byKind(f, "facebook_page_url")[0].state).toBe("match");
    expect(byKind(f, "reservation_phone")[0].rationaleCode).toBe("PHONE_NO_REFERENCE");
    expect(reduceOutcome(f, subject)).toBe("no_material_conflict_observed");
  });

  it("finding ids are stable for the same evidence", () => {
    const o = [obs({ inputId: "IN-URL", field: "facebook_url", value: "facebook.com/bahaydagat.moalboal.ph", origin: "user" })];
    const a = compareEvidence(samples, bahay, [URL_IN], o).map((f) => f.id);
    const b = compareEvidence(samples, bahay, [URL_IN], o).map((f) => f.id);
    expect(a).toEqual(b);
  });
});

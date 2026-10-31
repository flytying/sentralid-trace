import { describe, expect, it } from "vitest";
import { compareEvidence } from "../engine/compare";
import type { CaseSubject, EvidenceInput, Observation } from "../engine/types";
import { loadRealRegistry, loadSampleRegistry } from "../registry/load";
import { buildPlanInput } from "./catalog";
import { planNextCheck, validatePlannerOutput } from "./plan";
import { reassess } from "./reassess";

const samples = loadSampleRegistry();
const real = loadRealRegistry();

const lumen: CaseSubject = { businessId: "sample-lumen-cove", label: "Lumen Cove Resort", samples: true };
const bahay: CaseSubject = { businessId: "sample-bahay-dagat", label: "Bahay Dagat Resort", samples: true };
const PAGE: EvidenceInput = { id: "IN-PAGE", kind: "page_screenshot", label: "Facebook page screenshot" };
const CHAT: EvidenceInput = { id: "IN-CHAT-1", kind: "chat_screenshot", label: "Messenger screenshot 1" };
const URL_IN: EvidenceInput = { id: "IN-URL", kind: "page_url", label: "Page link you pasted" };
const FOLLOW_URL: EvidenceInput = { id: "IN-FOLLOWUP", kind: "followup_url", label: "Link you added" };

const o = (id: string, p: Partial<Observation> & Pick<Observation, "field" | "value">): Observation => ({
  id,
  inputId: "IN-PAGE",
  excerpt: null,
  clarity: "clear",
  origin: "model",
  ...p,
});

const sampleA = [
  o("OBS-1", { field: "business_name", value: "Lumen Cove Resort" }),
  o("OBS-2", { inputId: "IN-CHAT-1", field: "chat_sender_label", value: "Lumen Cove Reservations" }),
  o("OBS-3", { inputId: "IN-CHAT-1", field: "payment_instruction", value: "GCash L. M. Reyes 0917 ••• 4821" }),
];
const sampleB = [
  o("OBS-1", { inputId: "IN-URL", field: "facebook_url", value: "https://www.facebook.com/bahaydagat.moalboal.ph", origin: "user" }),
  o("OBS-2", { field: "business_name", value: "Bahay Dagat Resort Moalboal" }),
  o("OBS-3", { inputId: "IN-CHAT-1", field: "phone", value: "0966 ••• 2290" }),
];

describe("VerifyNext candidates", () => {
  it("A: a page we couldn't see → compare with the website's documented pages first", () => {
    const f = compareEvidence(samples, lumen, [PAGE, CHAT], sampleA);
    const plan = buildPlanInput(samples, lumen, f);
    expect(plan.status).toBe("check_available");
    expect(plan.target?.id).toBe("F-page:none");
    expect(plan.candidates[0].actionId).toBe("COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE");
    expect(plan.candidates[0].documented).toContain("facebook.com/lumencove.reservations");
    expect(plan.hypotheses?.a).toBeTruthy();
    expect(plan.hypotheses?.b).toBeTruthy();
  });

  it("B: a different page → ask through the number on file first", () => {
    const f = compareEvidence(samples, bahay, [URL_IN, PAGE, CHAT], sampleB);
    const plan = buildPlanInput(samples, bahay, f);
    expect(plan.candidates[0].actionId).toBe("CHECK_REGISTERED_CONTACT_POLICY");
    expect(plan.candidates[0].documented).toEqual(["+63 32 555 0142"]);
  });

  it("never points the user at contact details from the questioned material", () => {
    const f = compareEvidence(samples, bahay, [URL_IN, PAGE, CHAT], sampleB);
    for (const c of buildPlanInput(samples, bahay, f).candidates) {
      expect(c.documented.join(" ")).not.toMatch(/0966|bahaydagat\.moalboal\.ph/);
      for (const s of c.sources) expect(samples.sources.map((x) => x.id)).toContain(s.id);
    }
  });

  it("unlisted resort → no safe check from our sources", () => {
    const subject: CaseSubject = { businessId: null, label: "Isla Verde", samples: true };
    const f = compareEvidence(samples, subject, [CHAT], [o("OBS-1", { inputId: "IN-CHAT-1", field: "chat_sender_label", value: "Isla Verde" })]);
    expect(buildPlanInput(samples, subject, f).status).toBe("no_safe_check");
  });

  it("real page and numbers match, chat sender open → message the resort from its listed page", () => {
    const subject: CaseSubject = { businessId: "altogrand-beach-house", label: "Altogrand Beach House", samples: false };
    const f = compareEvidence(real, subject, [PAGE, CHAT], [
      o("OBS-1", { field: "facebook_url", value: "facebook.com/EnteBeachResort" }),
      o("OBS-2", { field: "phone", value: "09503177669" }),
      o("OBS-3", { inputId: "IN-CHAT-1", field: "chat_sender_label", value: "Altogrand Beach House" }),
    ]);
    const plan = buildPlanInput(real, subject, f);
    expect(plan.status).toBe("check_available");
    expect(plan.target?.id).toBe("F-sender");
    expect(plan.candidates.map((c) => c.actionId)).toEqual(["MESSAGE_FROM_LISTED_PAGE"]);
    expect(plan.candidates[0]).toMatchObject({ resolution: "user_report", documented: ["facebook.com/EnteBeachResort"] });
    expect(plan.candidates[0].sources.map((s) => s.kind)).toEqual(["local_tourism_directory"]);
    expect(plan.hypotheses?.b).toMatch(/different account/);
  });

  it("D: page and number match the record → the Messenger check is the only one offered", () => {
    const mirasol: CaseSubject = { businessId: "sample-mirasol-cove", label: "Mirasol Cove Resort", samples: true };
    const f = compareEvidence(samples, mirasol, [PAGE, CHAT], [
      o("OBS-1", { field: "facebook_url", value: "facebook.com/mirasolcoveanilao" }),
      o("OBS-2", { field: "phone", value: "(043) 555 0188" }),
      o("OBS-3", { inputId: "IN-CHAT-1", field: "chat_sender_label", value: "Mirasol Cove Resort" }),
      o("OBS-4", { inputId: "IN-CHAT-1", field: "payment_instruction", value: "GCash M. Lopez 0917 ••• 3305" }),
    ]);
    expect(f.find((x) => x.kind === "facebook_page_url")?.state).toBe("match");
    expect(f.find((x) => x.kind === "reservation_phone")?.state).toBe("match");
    const plan = buildPlanInput(samples, mirasol, f);
    expect(plan.target?.id).toBe("F-sender");
    expect(plan.candidates.map((c) => c.actionId)).toEqual(["MESSAGE_FROM_LISTED_PAGE"]);
  });

  it("A: the Messenger check isn't offered while we can't even see which page it is", () => {
    const f = compareEvidence(samples, lumen, [PAGE, CHAT], sampleA);
    expect(buildPlanInput(samples, lumen, f).candidates.map((c) => c.actionId)).not.toContain("MESSAGE_FROM_LISTED_PAGE");
  });

  it("B: a different page with a chat → the Messenger check is offered after the number on file", () => {
    const chatB = [...sampleB, o("OBS-4", { inputId: "IN-CHAT-1", field: "chat_sender_label", value: "Bahay Dagat Resort" })];
    const f = compareEvidence(samples, bahay, [URL_IN, PAGE, CHAT], chatB);
    expect(buildPlanInput(samples, bahay, f).candidates.map((c) => c.actionId)).toEqual([
      "CHECK_REGISTERED_CONTACT_POLICY",
      "MESSAGE_FROM_LISTED_PAGE",
      "COMPARE_LGU_REFERENCE_PAGE",
    ]);
  });

  it("page already matches → no material issue to check", () => {
    const subject: CaseSubject = { businessId: "cala-laiya", label: "Cala Laiya", samples: false };
    const f = compareEvidence(real, subject, [URL_IN], [o("OBS-1", { inputId: "IN-URL", field: "facebook_url", value: "facebook.com/calalaiya", origin: "user" })]);
    expect(buildPlanInput(real, subject, f).status).toBe("no_material_issue");
  });
});

describe("planner output validation (VERIFY-01)", () => {
  const ok = { actionId: "COMPARE_LGU_REFERENCE_PAGE", question: "Is this the listed page?", whyItMatters: "It separates the two explanations.", ifA: "The page finding would match.", ifB: "The page stays unconfirmed." };
  it("accepts an allowed action", () => {
    expect(validatePlannerOutput(JSON.stringify(ok), ["COMPARE_LGU_REFERENCE_PAGE"])).not.toBeNull();
  });
  it("rejects an action outside this case's allowlist", () => {
    expect(validatePlannerOutput(JSON.stringify(ok), ["CHECK_REGISTERED_CONTACT_POLICY"])).toBeNull();
  });
  it("rejects invented actions", () => {
    expect(validatePlannerOutput(JSON.stringify({ ...ok, actionId: "MESSAGE_THE_PAGE_FOR_PROOF" }), ["COMPARE_LGU_REFERENCE_PAGE"])).toBeNull();
  });
  it("rejects accusatory or reassuring wording and links", () => {
    for (const bad of ["This is a scam.", "The page is verified.", "It is safe to pay.", "Visit https://evil.example", "Send your OTP to confirm"]) {
      expect(validatePlannerOutput(JSON.stringify({ ...ok, ifA: bad }), ["COMPARE_LGU_REFERENCE_PAGE"]), bad).toBeNull();
    }
  });
  it("rejects contact details a screenshot may have injected (numbers, handles, emails, domains)", () => {
    for (const bad of [
      "If unsure, call 0917 222 3344 to confirm.",
      "Message +63 917-222-3344 on Viber first.",
      "Send the deposit to GCash 09172223344 after checking.",
      "Ask @bahaydagat.bookings to confirm the room.",
      "Email reservations@bahay-dagat.ph for proof.",
      "Check bahaydagat.ph for the page list.",
      "This is the resort's official page.",
      "The account is genuine and trusted.",
    ]) {
      expect(validatePlannerOutput(JSON.stringify({ ...ok, whyItMatters: bad }), ["COMPARE_LGU_REFERENCE_PAGE"]), bad).toBeNull();
    }
  });

  it("still accepts ordinary wording with dates and prices", () => {
    const fine = { ...ok, whyItMatters: "The chat asked for ₱4,500 by Dec 28–29; comparing the page address first is the safest step." };
    expect(validatePlannerOutput(JSON.stringify(fine), ["COMPARE_LGU_REFERENCE_PAGE"])).not.toBeNull();
  });

  it("falls back to a labelled rule-based plan when the model misbehaves", async () => {
    const f = compareEvidence(samples, lumen, [PAGE, CHAT], sampleA);
    const fetchImpl = async () =>
      new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ ...ok, actionId: "COMPARE_LGU_REFERENCE_PAGE", ifA: "Definitely a scam" }) } }] }));
    const { next } = await planNextCheck({ baseUrl: "https://api.meta.ai/v1", apiKey: "k", model: "muse-spark-1.3", timeoutMs: 5000 }, buildPlanInput(samples, lumen, f), { fetchImpl });
    expect(next.selectedBy).toBe("rules");
    expect(next.actionId).toBe("COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE");
    expect(next.allowedActionIds).toEqual(["COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE"]);
  });
});

describe("reassessment", () => {
  it("A: the documented reservations link changes only the page finding (VERIFY-02, TRUST-02)", () => {
    const follow = [o("OBS-4", { inputId: "IN-FOLLOWUP", field: "facebook_url", value: "https://www.facebook.com/lumencove.reservations", origin: "user" })];
    const before = compareEvidence(samples, lumen, [PAGE, CHAT], sampleA);
    const r = reassess(samples, lumen, [PAGE, CHAT], sampleA, FOLLOW_URL, follow);
    expect(r.previousOutcome).toBe("insufficient_evidence");
    expect(r.outcome).toBe("no_material_conflict_observed");
    expect(r.changes).toHaveLength(1);
    expect(r.changes[0]).toMatchObject({ before: { id: "F-page:none", state: "unknown" }, after: { state: "match", referenceClaimIds: ["CLM-sample-lc-fb-2"] }, newEvidenceIds: ["OBS-4"] });
    // Unrelated findings are byte-for-byte unchanged.
    for (const id of ["F-name", "F-sender", "F-payment"]) {
      expect(r.unchangedFindingIds).toContain(id);
      expect(JSON.stringify(r.findings.find((f) => f.id === id))).toBe(JSON.stringify(before.find((f) => f.id === id)));
    }
    expect(r.remainingUnknowns.map((f) => f.id)).toEqual(["F-sender", "F-payment"]);
  });

  it("A: a lookalike link records a discrepancy instead", () => {
    const follow = [o("OBS-4", { inputId: "IN-FOLLOWUP", field: "facebook_url", value: "facebook.com/lumencove.resort.ph", origin: "user" })];
    const r = reassess(samples, lumen, [PAGE, CHAT], sampleA, FOLLOW_URL, follow);
    expect(r.changes[0].after?.state).toBe("different_from_reference");
    expect(r.outcome).toBe("potential_channel_conflict");
  });

  it("B: a user's report never changes a finding (no self-attestation)", () => {
    const REPORT: EvidenceInput = { id: "IN-FOLLOWUP", kind: "followup_report", label: "What you were told" };
    const follow = [o("OBS-4", { inputId: "IN-FOLLOWUP", field: "user_report", value: "The resort said yes, this page is theirs", origin: "user" })];
    const r = reassess(samples, bahay, [URL_IN, PAGE, CHAT], sampleB, REPORT, follow);
    expect(r.changes).toEqual([]);
    expect(r.outcome).toBe(r.previousOutcome);
  });

  it("what the user saw in Messenger never changes a finding", () => {
    const REPORT: EvidenceInput = { id: "IN-FOLLOWUP", kind: "followup_report", label: "What you saw in Messenger" };
    const follow = [o("OBS-5", { inputId: "IN-FOLLOWUP", field: "user_report", value: "Messaging from the listed page opened the same conversation.", origin: "user" })];
    const chatB = [...sampleB, o("OBS-4", { inputId: "IN-CHAT-1", field: "chat_sender_label", value: "Bahay Dagat Resort" })];
    const r = reassess(samples, bahay, [URL_IN, PAGE, CHAT], chatB, REPORT, follow);
    expect(r.changes).toEqual([]);
    expect(r.findings.find((x) => x.id === "F-sender")?.state).toBe("unknown");
  });

  it("an observed claim to be official in a new screenshot stays unconfirmed", () => {
    const SHOT: EvidenceInput = { id: "IN-FOLLOWUP", kind: "followup_screenshot", label: "New screenshot" };
    const follow = [
      o("OBS-4", { inputId: "IN-FOLLOWUP", field: "booking_instruction", value: "We are the OFFICIAL page, verified by the LGU" }),
      o("OBS-5", { inputId: "IN-FOLLOWUP", field: "facebook_url", value: "facebook.com/lumencove.reservations", clarity: "uncertain" }),
    ];
    const r = reassess(samples, lumen, [PAGE, CHAT], sampleA, SHOT, follow);
    expect(r.findings.some((f) => f.kind === "facebook_page_url" && f.state === "match")).toBe(false);
    expect(r.changes).toEqual([]);
    expect(r.outcome).toBe("insufficient_evidence");
  });
});

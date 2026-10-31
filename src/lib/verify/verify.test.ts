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

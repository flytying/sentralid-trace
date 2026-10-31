import "server-only";
import type { EvidenceInput, Observation } from "../engine/types";
import { serverEnv } from "../env";
import { AppError } from "../errors";
import { FACEBOOK_URL_ERROR_TEXT, parseFacebookUrl } from "../facebook-url";
import { readImage } from "../image";
import { extractObservations } from "../meta/extract";
import { loadRealRegistry, loadSampleRegistry } from "../registry/load";
import { ACTION_IDS, type ActionId } from "../verify/catalog";
import { reassess } from "../verify/reassess";
import { EXTRACTION_EFFORT } from "./analyze";
import { decodeSealKey, seal, unseal } from "./seal";
import type { CaseState, ReassessResponse } from "./state";

const REPORT_TEXT: Record<string, string> = {
  confirmed: "You were told the page or number belongs to the resort.",
  denied: "You were told the page or number does not belong to the resort.",
  no_answer: "You couldn't get an answer from the number on file.",
};

export async function reassessCase(form: FormData, log: (e: Record<string, unknown>) => void, requestId: string): Promise<ReassessResponse> {
  const env = serverEnv();
  const key = decodeSealKey(env.CASE_SEAL_KEY);
  const token = typeof form.get("sealedCaseToken") === "string" ? (form.get("sealedCaseToken") as string) : "";
  const state = unseal<CaseState>(token, key);
  if (state.v !== 1) throw new AppError("CASE_INVALID", "This case could not be verified. Please start a new check.", 400);

  const reg = state.subject.samples ? loadSampleRegistry() : loadRealRegistry();
  if (reg.version !== state.registryVersion) {
    throw new AppError("CASE_INVALID", "Our records were updated since this check started. Please start a new check.", 409);
  }
  // One guided follow-up per case progression. A replayed earlier token is bounded by expiry and
  // rate limits; this is not a global one-time guarantee (TDD §3.4).
  if (state.followupCount >= 1) throw new AppError("FOLLOWUP_ALREADY_USED", "You've already added one follow-up for this check. Start a new check to look again.", 409);

  const actionId = form.get("actionId");
  if (typeof actionId !== "string" || !(ACTION_IDS as readonly string[]).includes(actionId) || !state.allowedActionIds.includes(actionId as ActionId)) {
    throw new AppError("CASE_INVALID", "That check isn't available for this case.", 400);
  }
  const action = actionId as ActionId;

  const url = typeof form.get("extraPageUrl") === "string" ? (form.get("extraPageUrl") as string).trim() : "";
  const image = form.get("extraImage");
  const hasImage = image instanceof File && image.size > 0;
  const answer = typeof form.get("reportedAnswer") === "string" ? (form.get("reportedAnswer") as string) : "";
  const provided = [Boolean(url), hasImage, Boolean(answer)].filter(Boolean).length;
  if (provided !== 1) throw new AppError("NO_EVIDENCE", "Add one thing: a page link, a screenshot, or what you were told.", 400);

  const reportAction = action === "CHECK_REGISTERED_CONTACT_POLICY";
  if (reportAction !== Boolean(answer)) {
    throw new AppError("NO_EVIDENCE", reportAction ? "Tell us what the resort said when you called the number on file." : "Add the page link or a screenshot that shows it.", 400);
  }

  const nextId = state.observations.length + 1;
  let input: EvidenceInput;
  let followObs: Observation[] = [];
  let warnings: string[] = [];
  let inference: ReassessResponse["inference"] = null;
  let userReport: string | null = null;

  if (url) {
    const p = parseFacebookUrl(url);
    if (!p.ok) throw new AppError("INVALID_FACEBOOK_URL", FACEBOOK_URL_ERROR_TEXT[p.error], 400);
    input = { id: "IN-FOLLOWUP", kind: "followup_url", label: "Link you added" };
    followObs = [{ id: `OBS-${nextId}`, inputId: "IN-FOLLOWUP", field: "facebook_url", value: p.canonicalUrl, excerpt: null, clarity: "clear", origin: "user" }];
  } else if (hasImage) {
    if (form.get("consent") !== "true") throw new AppError("NO_EVIDENCE", "Please confirm you've hidden private details before we send the screenshot.", 400);
    input = { id: "IN-FOLLOWUP", kind: "followup_screenshot", label: "Screenshot you added" };
    const img = await readImage(image as File, "The new screenshot");
    const ex = await extractObservations(
      { baseUrl: env.META_BASE_URL, apiKey: env.MODEL_API_KEY, model: env.MODEL_ID, timeoutMs: env.MODEL_TIMEOUT_MS },
      [{ input, ...img }],
      { reasoningEffort: EXTRACTION_EFFORT, firstObservationIndex: nextId },
    );
    followObs = ex.observations;
    warnings = ex.warnings;
    inference = { latencyMs: ex.latencyMs, attempts: ex.attempts };
  } else {
    if (!(answer in REPORT_TEXT)) throw new AppError("NO_EVIDENCE", "Choose what the resort told you.", 400);
    input = { id: "IN-FOLLOWUP", kind: "followup_report", label: "What you were told" };
    userReport = REPORT_TEXT[answer];
    followObs = [{ id: `OBS-${nextId}`, inputId: "IN-FOLLOWUP", field: "user_report", value: userReport, excerpt: null, clarity: "clear", origin: "user" }];
  }

  const r = reassess(reg, state.subject, state.inputs, state.observations, input, followObs);
  const nextState: CaseState = {
    ...state,
    inputs: r.inputs,
    observations: r.observations,
    findingIds: r.findings.map((f) => f.id),
    outcome: r.outcome,
    allowedActionIds: [],
    followupCount: state.followupCount + 1,
  };

  log({ requestId, action, input: input.kind, modelLatencyMs: inference?.latencyMs ?? null, changed: r.changes.length, outcome: r.outcome });

  return {
    caseId: state.caseId,
    previousOutcome: r.previousOutcome,
    outcome: r.outcome,
    changes: r.changes,
    unchangedFindingIds: r.unchangedFindingIds,
    remainingUnknowns: r.remainingUnknowns,
    findings: r.findings,
    observations: r.observations,
    inputs: r.inputs,
    followup: { actionId: action, inputLabel: input.label, evidenceIds: followObs.map((o) => o.id), userReport },
    inference,
    warnings,
    followupCount: nextState.followupCount,
    sealedCaseToken: seal(nextState, key, env.CASE_TTL_SECONDS),
  };
}

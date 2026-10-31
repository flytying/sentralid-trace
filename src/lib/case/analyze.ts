import "server-only";
import { randomUUID } from "node:crypto";
import { compareEvidence, reduceOutcome } from "../engine/compare";
import type { CaseSubject, EvidenceInput, InputId, Observation } from "../engine/types";
import { serverEnv } from "../env";
import { AppError } from "../errors";
import { FACEBOOK_URL_ERROR_TEXT, parseFacebookUrl } from "../facebook-url";
import { MAX_TOTAL_BYTES, readImage } from "../image";
import type { ReasoningEffort } from "../meta/client";
import { extractObservations, type ImageInput } from "../meta/extract";
import { isServable, loadRealRegistry, loadSampleRegistry } from "../registry/load";
import { buildPlanInput } from "../verify/catalog";
import { planNextCheck } from "../verify/plan";
import { decodeSealKey, seal } from "./seal";
import type { AnalyzeResponse, CaseState } from "./state";

// Chosen from measured runs on the sample set; see README "Model settings".
export const EXTRACTION_EFFORT: ReasoningEffort = "minimal";

export interface AnalyzeLog {
  requestId: string;
  plannerMs?: number | null;
  plan?: string;
  inputs: string[];
  modelLatencyMs: number | null;
  attempts: number;
  observationCount: number;
  outcome: string;
}

export async function analyzeCase(form: FormData, log: (entry: AnalyzeLog) => void, requestId: string): Promise<AnalyzeResponse> {
  const samples = form.get("samples") === "1";
  const reg = samples ? loadSampleRegistry() : loadRealRegistry();

  // ---- Subject ----------------------------------------------------------------------------
  const businessId = str(form.get("businessId"));
  let subject: CaseSubject;
  if (businessId) {
    const b = reg.businesses.find((x) => x.id === businessId && isServable(x));
    if (!b) throw new AppError("REFERENCE_NOT_FOUND", "We don't have this resort on file. Pick it again or continue without it.", 404);
    subject = { businessId: b.id, label: b.displayName, samples };
  } else {
    subject = { businessId: null, label: (str(form.get("unlistedLabel")) ?? "A resort not on file").slice(0, 120), samples };
  }

  // ---- Inputs -------------------------------------------------------------------------------
  const inputs: EvidenceInput[] = [];
  const observations: Observation[] = [];
  const pageUrl = str(form.get("pageUrl"));
  if (pageUrl) {
    const p = parseFacebookUrl(pageUrl);
    if (!p.ok) throw new AppError("INVALID_FACEBOOK_URL", FACEBOOK_URL_ERROR_TEXT[p.error], 400);
    inputs.push({ id: "IN-URL", kind: "page_url", label: "Page link you pasted" });
    observations.push({ id: "OBS-1", inputId: "IN-URL", field: "facebook_url", value: p.canonicalUrl, excerpt: null, clarity: "clear", origin: "user" });
  }

  const images: ImageInput[] = [];
  const pageFile = form.get("pageImage");
  if (pageFile instanceof File && pageFile.size > 0) {
    const input: EvidenceInput = { id: "IN-PAGE", kind: "page_screenshot", label: "Facebook page screenshot" };
    images.push({ input, ...(await readImage(pageFile, "The page screenshot")) });
    inputs.push(input);
  }
  const chatFiles = form.getAll("chatImages").filter((f): f is File => f instanceof File && f.size > 0);
  if (chatFiles.length > 3) throw new AppError("PAYLOAD_TOO_LARGE", "Add up to three chat screenshots.", 413);
  for (const [i, f] of chatFiles.entries()) {
    const input: EvidenceInput = { id: `IN-CHAT-${i + 1}` as InputId, kind: "chat_screenshot", label: `Messenger screenshot ${i + 1}` };
    images.push({ input, ...(await readImage(f, `Chat screenshot ${i + 1}`)) });
    inputs.push(input);
  }
  if (inputs.length === 0) throw new AppError("NO_EVIDENCE", "Add a page link or at least one screenshot.", 400);
  if (images.reduce((n, i) => n + i.bytes.length, 0) > MAX_TOTAL_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", "Your screenshots are too large together. Remove one or use smaller images.", 413);
  }
  if (images.length && form.get("consent") !== "true") {
    throw new AppError("NO_EVIDENCE", "Please confirm you've hidden private details before we send screenshots for analysis.", 400);
  }

  // ---- Live extraction (screenshots only) ----------------------------------------------------
  const env = serverEnv();
  let inference: AnalyzeResponse["inference"] = null;
  let modelUsed: string | null = null;
  let warnings: string[] = [];
  if (images.length) {
    const ex = await extractObservations(
      { baseUrl: env.META_BASE_URL, apiKey: env.MODEL_API_KEY, model: env.MODEL_ID, timeoutMs: env.MODEL_TIMEOUT_MS },
      images,
      { reasoningEffort: EXTRACTION_EFFORT, firstObservationIndex: observations.length + 1 },
    );
    observations.push(...ex.observations);
    warnings = ex.warnings;
    modelUsed = ex.model ?? env.MODEL_ID;
    inference = { latencyMs: ex.latencyMs, attempts: ex.attempts, reasoningEffort: EXTRACTION_EFFORT };
  }

  // ---- Deterministic comparison --------------------------------------------------------------
  const findings = compareEvidence(reg, subject, inputs, observations);
  const outcome = reduceOutcome(findings, subject);

  // ---- VerifyNext: one safe check. URL-only cases stay model-free (rule-based plan). ----------
  const meta = { baseUrl: env.META_BASE_URL, apiKey: env.MODEL_API_KEY, model: env.MODEL_ID, timeoutMs: env.MODEL_TIMEOUT_MS };
  const plan = await planNextCheck(images.length ? meta : null, buildPlanInput(reg, subject, findings), { reasoningEffort: EXTRACTION_EFFORT });
  const unreadableInputIds = images
    .map((i) => i.input.id)
    .filter((id) => !observations.some((o) => o.inputId === id && o.value !== null));

  const caseId = randomUUID();
  const state: CaseState = {
    v: 1,
    caseId,
    registryVersion: reg.version,
    subject,
    inputs,
    observations,
    findingIds: findings.map((f) => f.id),
    outcome,
    allowedActionIds: plan.next.allowedActionIds,
    followupCount: 0,
  };
  const sealedCaseToken = seal(state, decodeSealKey(env.CASE_SEAL_KEY), env.CASE_TTL_SECONDS);

  log({
    requestId,
    inputs: inputs.map((i) => i.kind),
    modelLatencyMs: inference?.latencyMs ?? null,
    attempts: inference?.attempts ?? 0,
    observationCount: observations.length,
    outcome,
    plannerMs: plan.latencyMs,
    plan: `${plan.next.status}:${plan.next.actionId ?? "-"}:${plan.next.selectedBy}`,
  });

  return {
    caseId,
    registryVersion: reg.version,
    modelUsed,
    inferencePerformed: images.length > 0,
    inference,
    subject,
    inputs,
    observations,
    findings,
    outcome,
    warnings,
    unreadableInputIds,
    nextCheck: plan.next,
    planner: images.length ? { latencyMs: plan.latencyMs } : null,
    sealedCaseToken,
  };
}

function str(v: FormDataEntryValue | null): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 500) : null;
}

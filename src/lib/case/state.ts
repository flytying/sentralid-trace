import type { CaseOutcome, CaseSubject, EvidenceInput, Finding, Observation } from "../engine/types";
import type { ActionId } from "../verify/catalog";
import type { NextCheck } from "../verify/plan";
import type { FindingChange } from "../verify/reassess";

/** Contents of the sealed case token. Sanitized observations only — never image bytes. */
export interface CaseState {
  v: 1;
  caseId: string;
  registryVersion: string;
  subject: CaseSubject;
  inputs: EvidenceInput[];
  observations: Observation[];
  findingIds: string[];
  outcome: CaseOutcome;
  /** Checks this case may follow up with, fixed at analysis time (VERIFY-01). */
  allowedActionIds: ActionId[];
  followupCount: number;
}

/** What the analyze endpoint returns to the browser. */
export interface AnalyzeResponse {
  caseId: string;
  registryVersion: string;
  modelUsed: string | null;
  inferencePerformed: boolean;
  inference: { latencyMs: number; attempts: number; reasoningEffort: string } | null;
  subject: CaseSubject;
  inputs: EvidenceInput[];
  observations: Observation[];
  findings: Finding[];
  outcome: CaseOutcome;
  warnings: string[];
  /** Inputs from which nothing could be read; the UI asks for a clearer image. */
  unreadableInputIds: string[];
  nextCheck: NextCheck;
  planner: { latencyMs: number | null } | null;
  sealedCaseToken: string;
}

export interface ReassessResponse {
  caseId: string;
  previousOutcome: CaseOutcome;
  outcome: CaseOutcome;
  changes: FindingChange[];
  unchangedFindingIds: string[];
  remainingUnknowns: Finding[];
  findings: Finding[];
  observations: Observation[];
  inputs: EvidenceInput[];
  followup: { actionId: ActionId; inputLabel: string; evidenceIds: string[]; userReport: string | null };
  inference: { latencyMs: number; attempts: number } | null;
  warnings: string[];
  followupCount: number;
  sealedCaseToken: string;
}

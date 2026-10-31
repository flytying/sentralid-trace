import type { CaseOutcome, CaseSubject, EvidenceInput, Finding, Observation } from "../engine/types";

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
  nextCheck: null;
  sealedCaseToken: string;
}

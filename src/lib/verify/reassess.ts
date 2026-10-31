// One bounded reassessment (TDD §5.4): add the follow-up observations, recompute every finding
// against the SAME registry snapshot, and report a claim-level diff. Only registry matches can
// upgrade a finding; user reports are recorded but never compared.
import { compareEvidence, reduceOutcome } from "../engine/compare";
import { findingCopy } from "../engine/copy";
import type { CaseOutcome, CaseSubject, EvidenceInput, Finding, Observation } from "../engine/types";
import type { Registry } from "../registry/load";

export interface FindingChange {
  findingId: string;
  before: Finding | null;
  after: Finding | null;
  newEvidenceIds: string[];
  reason: string;
}

export interface ReassessResult {
  findings: Finding[];
  observations: Observation[];
  inputs: EvidenceInput[];
  previousOutcome: CaseOutcome;
  outcome: CaseOutcome;
  changes: FindingChange[];
  unchangedFindingIds: string[];
  remainingUnknowns: Finding[];
}

export function reassess(
  reg: Registry,
  subject: CaseSubject,
  inputs: EvidenceInput[],
  observations: Observation[],
  followupInput: EvidenceInput,
  followupObservations: Observation[],
): ReassessResult {
  const before = compareEvidence(reg, subject, inputs, observations);
  const allInputs = [...inputs, followupInput];
  const allObs = [...observations, ...followupObservations];
  const after = compareEvidence(reg, subject, allInputs, allObs);
  const newIds = new Set(followupObservations.map((o) => o.id));

  const beforeById = new Map(before.map((f) => [f.id, f]));
  const afterById = new Map(after.map((f) => [f.id, f]));
  const changes: FindingChange[] = [];
  const unchanged: string[] = [];
  const paired = new Set<string>();

  for (const f of after) {
    const prev = beforeById.get(f.id);
    const evidence = f.observationIds.filter((id) => newIds.has(id));
    if (prev) {
      paired.add(prev.id);
      if (prev.state === f.state) unchanged.push(f.id);
      else changes.push({ findingId: f.id, before: prev, after: f, newEvidenceIds: evidence, reason: reasonFor(f, evidence, followupInput) });
      continue;
    }
    // A page link that was previously not visible now has a specific finding: pair them.
    const none = beforeById.get("F-page:none");
    if (f.kind === "facebook_page_url" && none && !afterById.has("F-page:none") && !paired.has(none.id)) {
      paired.add(none.id);
      if (none.state === f.state) unchanged.push(f.id);
      else changes.push({ findingId: f.id, before: none, after: f, newEvidenceIds: evidence, reason: reasonFor(f, evidence, followupInput) });
      continue;
    }
    changes.push({ findingId: f.id, before: null, after: f, newEvidenceIds: evidence, reason: reasonFor(f, evidence, followupInput) });
  }
  for (const f of before) {
    if (!paired.has(f.id) && !afterById.has(f.id)) {
      changes.push({ findingId: f.id, before: f, after: null, newEvidenceIds: [], reason: "This no longer applies after the new evidence." });
    }
  }

  return {
    findings: after,
    observations: allObs,
    inputs: allInputs,
    previousOutcome: reduceOutcome(before, subject),
    outcome: reduceOutcome(after, subject),
    changes,
    unchangedFindingIds: unchanged,
    remainingUnknowns: after.filter((f) => f.state === "unknown"),
  };
}

function reasonFor(f: Finding, evidence: string[], input: EvidenceInput): string {
  const via = evidence.length ? ` (from ${input.label.toLowerCase()}, ${evidence.join(", ")})` : "";
  return `${findingCopy(f).explanation}${via}`;
}

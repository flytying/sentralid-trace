import type { ReferenceView } from "@/lib/registry/load";
import type { LinkLookup } from "@/lib/registry/search";

export type { ReferenceView, LinkLookup };

export type Selection =
  | { kind: "listed"; ref: ReferenceView; pageUrl?: string }
  | { kind: "unlisted"; label: string; pageUrl?: string };

export type StepId = "business" | "evidence" | "findings" | "check" | "result";

export const STEPS: { id: StepId; label: string }[] = [
  { id: "business", label: "Pick the resort" },
  { id: "evidence", label: "Add what you have" },
  { id: "findings", label: "See what we found" },
  { id: "check", label: "Check one thing" },
  { id: "result", label: "Updated result" },
];

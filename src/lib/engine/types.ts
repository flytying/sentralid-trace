// Evidence model shared by the extraction adapter, the comparison engine and the UI.
// Observations are untrusted; only registry claims carry authority (TDD §3.2, §5.1).

export type InputId = "IN-URL" | "IN-PAGE" | "IN-CHAT-1" | "IN-CHAT-2" | "IN-CHAT-3" | "IN-FOLLOWUP";
export type InputKind = "page_url" | "page_screenshot" | "chat_screenshot" | "followup_screenshot" | "followup_url" | "followup_report";

export interface EvidenceInput {
  id: InputId;
  kind: InputKind;
  label: string;
}

export const OBSERVATION_FIELDS = [
  "business_name",
  "facebook_url",
  "facebook_url_mentioned",
  "facebook_handle",
  "phone",
  "email",
  "website",
  "payment_instruction",
  "booking_instruction",
  "chat_sender_label",
] as const;
export type ObservationField = (typeof OBSERVATION_FIELDS)[number];

export type Clarity = "clear" | "uncertain" | "unreadable";

export interface Observation {
  id: string; // OBS-n
  inputId: InputId;
  /** "user_report" records what the user says they were told; the engine never compares it. */
  field: ObservationField | "user_report";
  /** Display-safe value (account numbers masked). Null when absent or unreadable. */
  value: string | null;
  excerpt: string | null;
  clarity: Clarity;
  /** "model" = read by Meta Muse Spark; "user" = typed/pasted by the user. */
  origin: "model" | "user";
}

export type FindingKind =
  | "facebook_page_url"
  | "mentioned_link"
  | "business_name"
  | "reservation_phone"
  | "message_sender"
  | "payment_instruction";
export type FindingState = "match" | "different_from_reference" | "unknown";
export type CaseOutcome = "no_material_conflict_observed" | "potential_channel_conflict" | "insufficient_evidence";

export type RationaleCode =
  | "FB_PAGE_MATCH"
  | "FB_PAGE_DIFFERS"
  | "FB_PAGE_IS_OTHER_LISTED_BUSINESS"
  | "FB_PAGE_NOT_VISIBLE"
  | "FB_PAGE_NO_REFERENCE"
  | "FB_PAGE_UNCLEAR"
  | "LINK_ONLY_MENTIONED"
  | "NAME_SAME_AS_RECORD"
  | "NAME_DIFFERS_FROM_RECORD"
  | "PHONE_MATCH"
  | "PHONE_DIFFERS"
  | "PHONE_PARTLY_HIDDEN"
  | "PHONE_NO_REFERENCE"
  | "SENDER_NOT_AUTHENTICATED"
  | "PAYMENT_NOT_ESTABLISHED";

export interface Finding {
  /** Stable across reassessment: derived from kind + compared value. */
  id: string;
  kind: FindingKind;
  state: FindingState;
  rationaleCode: RationaleCode;
  observationIds: string[];
  referenceClaimIds: string[];
  sourceIds: string[];
  /** Short, display-safe strings computed deterministically by the engine. */
  observed: string | null;
  reference: string | null;
  limitations: string[];
}

export interface CaseSubject {
  /** Registry business id, or null when the resort isn't on file. */
  businessId: string | null;
  label: string;
  samples: boolean;
}

// Plain-language copy for engine codes. The UI renders only these explanations — never model prose.
import type { CaseOutcome, Finding, FindingState, RationaleCode } from "./types";

export const STATE_CHIP: Record<FindingState, { text: string; tone: "ok" | "warn" | "unk" }> = {
  match: { text: "Matches our record", tone: "ok" },
  different_from_reference: { text: "Doesn't match", tone: "warn" },
  unknown: { text: "Can't tell", tone: "unk" },
};

export const OUTCOME_COPY: Record<CaseOutcome, { head: string; label: string; tone: "ok" | "warn" | "unk" }> = {
  no_material_conflict_observed: {
    head: "Nothing we checked conflicts with our records",
    label: "No conflict found in what we could check",
    tone: "ok",
  },
  potential_channel_conflict: {
    head: "Some details don't match our records",
    label: "Possible booking-channel mismatch",
    tone: "warn",
  },
  insufficient_evidence: {
    head: "We can't confirm this booking channel yet",
    label: "Not enough evidence",
    tone: "unk",
  },
};

export const NOT_A_GUARANTEE =
  "This is based only on what we could check. It can't promise the page is real or that paying is safe.";

const RATIONALE: Record<RationaleCode, { title: (f: Finding) => string; explanation: string }> = {
  FB_PAGE_MATCH: {
    title: () => "Page link is one we have on file",
    explanation: "The link is exactly a Facebook page that an independent source connects to this resort.",
  },
  FB_PAGE_DIFFERS: {
    title: () => "Page link is different from the one on file",
    explanation: "The link you sent isn't any of the pages our sources connect to this resort.",
  },
  FB_PAGE_IS_OTHER_LISTED_BUSINESS: {
    title: () => "Page link belongs to a different resort",
    explanation: "This link is on file, but for another resort — not the one you're booking.",
  },
  FB_PAGE_NOT_VISIBLE: {
    title: () => "We couldn't see which page this is",
    explanation: "No full facebook.com link was visible in what you sent, so we couldn't compare the page.",
  },
  FB_PAGE_UNCLEAR: {
    title: () => "Page link was only partly readable",
    explanation: "We could make out part of a link, but not enough to compare it reliably.",
  },
  LINK_ONLY_MENTIONED: {
    title: () => "A page link is mentioned in what you sent",
    explanation: "Someone wrote this link in a message or on a page. Anyone can write any link, so a mentioned link doesn't tell us which page you're actually talking to.",
  },
  FB_PAGE_NO_REFERENCE: {
    title: () => "No page on file to compare with",
    explanation: "This resort isn't in our records, so there's nothing to compare the link with. That isn't evidence either way.",
  },
  NAME_SAME_AS_RECORD: {
    title: () => "Name looks like the resort's",
    explanation: "The name shown is the same as the resort's name in our records.",
  },
  NAME_DIFFERS_FROM_RECORD: {
    title: () => "Name is different from our record",
    explanation: "The name shown isn't the resort's name in our records. Pages are sometimes renamed, so this alone settles nothing.",
  },
  PHONE_MATCH: {
    title: () => "Phone number matches our record",
    explanation: "This number is the reservations number our source lists for the resort.",
  },
  PHONE_DIFFERS: {
    title: () => "Phone number is different",
    explanation: "The visible digits don't fit the reservations number our source lists for the resort.",
  },
  PHONE_PARTLY_HIDDEN: {
    title: () => "Phone number is partly hidden",
    explanation: "The digits we can see fit the number on file, but part is hidden, so we can't confirm it.",
  },
  PHONE_NO_REFERENCE: {
    title: () => "No phone number on file to compare",
    explanation: "We don't have an independently sourced number for this resort.",
  },
  SENDER_NOT_AUTHENTICATED: {
    title: () => "Who is sending these messages",
    explanation: "A chat screenshot can't show who is really behind an account — anyone can use a resort's name and photo.",
  },
  PAYMENT_NOT_ESTABLISHED: {
    title: () => "Whose payment account this is",
    explanation: "Trace never confirms who owns a GCash, Maya or bank account — even when the page is on file. Pay only through a channel you've confirmed yourself.",
  },
};

export function findingCopy(f: Finding): { title: string; explanation: string } {
  const r = RATIONALE[f.rationaleCode];
  return { title: r.title(f), explanation: r.explanation };
}

export const FIELD_LABEL: Record<string, string> = {
  business_name: "Name",
  facebook_url: "Facebook link",
  facebook_url_mentioned: "Link mentioned in text",
  facebook_handle: "Facebook username",
  phone: "Phone number",
  email: "Email",
  website: "Website",
  payment_instruction: "Payment request",
  booking_instruction: "Booking terms",
  chat_sender_label: "Chat sender",
};

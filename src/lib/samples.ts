// Labelled synthetic demo scenarios (PRD §10.1). All businesses and screenshots are fictional.
export type SampleKey = "A" | "B" | "C";

export interface SampleScenario {
  key: SampleKey;
  title: string;
  summary: string;
  /** Sample-registry business id, or null for the deliberately unlisted case. */
  businessId: string | null;
  unlistedName?: string;
  pageUrl?: string;
  pageImage?: string;
  chatImages: string[];
  /** Demo helper for the follow-up step: the link the (made-up) chat page would show. */
  followupLink?: string;
}

export const SAMPLES: Record<SampleKey, SampleScenario> = {
  A: {
    key: "A",
    title: "A second page that turns out to be documented",
    summary: "A cropped page screenshot and a GCash request from Lumen Cove Resort's reservations team.",
    businessId: "sample-lumen-cove",
    pageImage: "/samples/A-page-lumencove-cropped.png",
    chatImages: ["/samples/A-chat-lumencove-gcash.png"],
    followupLink: "facebook.com/lumencove.reservations",
  },
  B: {
    key: "B",
    title: "A lookalike page asking for a deposit",
    summary: "A page that copies Bahay Dagat Resort's name, plus a chat asking for a personal e-wallet deposit.",
    businessId: "sample-bahay-dagat",
    pageUrl: "facebook.com/bahaydagat.moalboal.ph",
    pageImage: "/samples/B-page-bahaydagat-lookalike.png",
    chatImages: ["/samples/B-chat-bahaydagat-deposit.png", "/samples/B-chat-bahaydagat-number.png"],
  },
  C: {
    key: "C",
    title: "Not enough to go on",
    summary: "A cropped chat from Isla Verde Hideaway, a resort that isn't in our records.",
    businessId: null,
    unlistedName: "Isla Verde Hideaway",
    chatImages: ["/samples/C-chat-islaverde-cropped.png"],
  },
};

export function isSampleKey(v: unknown): v is SampleKey {
  return v === "A" || v === "B" || v === "C";
}

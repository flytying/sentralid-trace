// Registry model: businesses, sources and atomic, source-scoped identity claims (TDD §3).
// There is deliberately no global "verified" flag — each claim carries its own scope and evidence.
import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{1,79}$/, "expected ASCII slug");

export const ClaimKind = z.enum([
  "facebook_page_url",
  "facebook_page_id",
  "website_url",
  "reservation_phone",
  "reservation_email",
  "booking_policy",
]);
export const RegistryStatus = z.enum(["draft", "admitted", "needs_review"]);
export const SourceKind = z.enum([
  "local_tourism_directory",
  "independent_business_site",
  "listed_facebook_page",
  "owner_attestation",
  "other_documented_source",
]);
export const ClaimTrust = z.enum(["corroborated", "not_corroborated", "conflicted"]);

export const BusinessReference = z
  .object({
    id,
    displayName: z.string().min(2).max(120),
    province: z.string().min(2).max(60),
    locality: z.string().min(2).max(80),
    registryStatus: RegistryStatus,
    reviewedAt: date,
    sourceIds: z.array(id).min(1),
    claimIds: z.array(id).min(1),
    reviewerNote: z.string().max(600),
    synthetic: z.boolean(),
  })
  .strict();

export const RegistrySource = z
  .object({
    id,
    kind: SourceKind,
    ownerName: z.string().min(2).max(160),
    title: z.string().min(2).max(200),
    url: z.string().url().startsWith("https://"),
    observedAt: z.string().datetime(),
    reviewedAt: date,
    method: z.string().min(5).max(400),
    permittedUse: z.string().min(5).max(300),
  })
  .strict();

export const RegistryClaim = z
  .object({
    id,
    businessId: id,
    kind: ClaimKind,
    value: z.string().min(1).max(300),
    normalizedValue: z.string().min(1).max(300),
    label: z.string().max(80).optional(),
    trust: ClaimTrust,
    sourceIds: z.array(id).min(1),
    reviewedAt: date,
    note: z.string().max(400).optional(),
  })
  .strict();

export const RegistryManifest = z
  .object({
    version: z.string().min(3).max(40),
    builtAt: z.string().datetime(),
    reviewer: z.string().max(120),
    admittedCount: z.number().int().min(0),
  })
  .strict();

export const RegistryFiles = z.object({
  businesses: z.array(BusinessReference),
  sources: z.array(RegistrySource),
  claims: z.array(RegistryClaim),
});

export type ClaimKind = z.infer<typeof ClaimKind>;
export type RegistryStatus = z.infer<typeof RegistryStatus>;
export type SourceKind = z.infer<typeof SourceKind>;
export type ClaimTrust = z.infer<typeof ClaimTrust>;
export type BusinessReference = z.infer<typeof BusinessReference>;
export type RegistrySource = z.infer<typeof RegistrySource>;
export type RegistryClaim = z.infer<typeof RegistryClaim>;
export type RegistryManifest = z.infer<typeof RegistryManifest>;
export type RegistryFiles = z.infer<typeof RegistryFiles>;

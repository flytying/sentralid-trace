import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { seal, unseal } from "./seal";

const key = randomBytes(32);

describe("case seal", () => {
  it("round-trips data before expiry", () => {
    const token = seal({ followupCount: 0, registryVersion: "v1" }, key, 60);
    expect(unseal(token, key)).toEqual({ followupCount: 0, registryVersion: "v1" });
  });

  it("does not expose plaintext in the token", () => {
    const token = seal({ secret: "GCash 0917-555-1234" }, key, 60);
    expect(Buffer.from(token, "base64url").toString("utf8")).not.toContain("GCash");
  });

  it("rejects expired tokens", () => {
    const token = seal({ a: 1 }, key, 60, Date.now() - 120_000);
    expect(() => unseal(token, key)).toThrowError(expect.objectContaining({ code: "CASE_EXPIRED" }));
  });

  it("rejects tampered tokens", () => {
    const raw = Buffer.from(seal({ a: 1 }, key, 60), "base64url");
    raw[raw.length - 20] ^= 0xff;
    expect(() => unseal(raw.toString("base64url"), key)).toThrowError(expect.objectContaining({ code: "CASE_INVALID" }));
  });

  it("rejects tokens sealed with another key", () => {
    const token = seal({ a: 1 }, randomBytes(32), 60);
    expect(() => unseal(token, key)).toThrowError(expect.objectContaining({ code: "CASE_INVALID" }));
  });

  it("rejects garbage", () => {
    expect(() => unseal("not-a-token", key)).toThrowError(expect.objectContaining({ code: "CASE_INVALID" }));
  });
});

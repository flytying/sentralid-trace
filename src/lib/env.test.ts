import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { parseEnv } = await import("./env");

const base = { MODEL_API_KEY: "k", CASE_SEAL_KEY: "s" };

describe("server env", () => {
  it("accepts the Meta endpoint and approved model", () => {
    const env = parseEnv({ ...base, META_BASE_URL: "https://api.meta.ai/v1/", MODEL_ID: "muse-spark-1.3" });
    expect(env.META_BASE_URL).toBe("https://api.meta.ai/v1");
    expect(env.MODEL_ID).toBe("muse-spark-1.3");
  });

  it("fails closed on a non-Meta host", () => {
    expect(() => parseEnv({ ...base, META_BASE_URL: "https://api.openai.com/v1" })).toThrow(/Meta Model API/);
  });

  it("fails closed on plain http", () => {
    expect(() => parseEnv({ ...base, META_BASE_URL: "http://api.meta.ai/v1" })).toThrow();
  });

  it("fails closed on an unapproved model", () => {
    expect(() => parseEnv({ ...base, MODEL_ID: "gpt-4o" })).toThrow(/MODEL_ID/);
  });

  it("fails closed when the API key is missing", () => {
    expect(() => parseEnv({ CASE_SEAL_KEY: "s" })).toThrow(/MODEL_API_KEY/);
  });
});

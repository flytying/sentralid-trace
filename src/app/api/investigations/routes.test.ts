import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const PNG = readFileSync("public/samples/A-chat-lumencove-gcash.png");
const EXTRACTION = JSON.stringify({
  observations: [
    { inputId: "IN-CHAT-1", field: "chat_sender_label", value: "Lumen Cove Reservations", visibleExcerpt: null, clarity: "clear" },
    { inputId: "IN-CHAT-1", field: "payment_instruction", value: "GCash L. M. Reyes 0917 555 4821", visibleExcerpt: "GCash L. M. Reyes 0917 555 4821", clarity: "clear" },
  ],
  warnings: [],
});
const ok = (content: string) => new Response(JSON.stringify({ model: "muse-spark-1.3", choices: [{ finish_reason: "stop", message: { content } }] }), { status: 200 });

let fetchMock: ReturnType<typeof vi.fn>;

async function routes() {
  vi.resetModules();
  const analyze = await import("./analyze/route");
  const reassess = await import("./reassess/route");
  return { analyze: analyze.POST, reassess: reassess.POST };
}

function req(path: string, form: FormData, ip = "10.0.0.1") {
  return new NextRequest(`http://localhost${path}`, { method: "POST", body: form, headers: { "x-forwarded-for": ip } });
}

function chatForm() {
  const f = new FormData();
  f.set("samples", "1");
  f.set("businessId", "sample-lumen-cove");
  f.set("consent", "true");
  f.append("chatImages", new File([PNG], "chat.png", { type: "image/png" }));
  return f;
}

beforeEach(() => {
  process.env.MODEL_API_KEY = "test-key";
  process.env.CASE_SEAL_KEY = randomBytes(32).toString("base64");
  process.env.RATE_LIMIT_PER_MINUTE = "100";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("analyze route — provider failures never produce results (MODEL-02)", () => {
  it.each([
    ["401", () => new Response("{}", { status: 401 }), 502, "CONFIG_INVALID"],
    ["500", () => new Response("{}", { status: 500 }), 502, "MODEL_UNAVAILABLE"],
    ["429", () => new Response("{}", { status: 429 }), 429, "MODEL_RATE_LIMITED"],
  ] as const)("provider %s → %s %s", async (_n, make, status, code) => {
    fetchMock.mockImplementation(async () => make());
    const { analyze } = await routes();
    const res = await analyze(req("/api/investigations/analyze", chatForm()));
    const body = await res.json();
    expect(res.status).toBe(status);
    expect(body.error.code).toBe(code);
    expect(body.findings).toBeUndefined();
    expect(body.outcome).toBeUndefined();
  });

  it("timeout → MODEL_TIMEOUT", async () => {
    fetchMock.mockImplementation(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    const { analyze } = await routes();
    const res = await analyze(req("/api/investigations/analyze", chatForm()));
    expect(res.status).toBe(504);
    expect((await res.json()).error.code).toBe("MODEL_TIMEOUT");
  });

  it("malformed model output twice → MODEL_BAD_RESPONSE after one retry", async () => {
    fetchMock.mockImplementation(async () => ok('{"verdict":"safe to pay"}'));
    const { analyze } = await routes();
    const res = await analyze(req("/api/investigations/analyze", chatForm()));
    expect((await res.json()).error.code).toBe("MODEL_BAD_RESPONSE");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("missing API key → CONFIG_INVALID, and nothing is sent anywhere", async () => {
    delete process.env.MODEL_API_KEY;
    const { analyze } = await routes();
    const res = await analyze(req("/api/investigations/analyze", chatForm()));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("CONFIG_INVALID");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only calls the Meta endpoint", async () => {
    fetchMock.mockImplementation(async () => ok(EXTRACTION));
    const { analyze } = await routes();
    await analyze(req("/api/investigations/analyze", chatForm()));
    for (const call of fetchMock.mock.calls) expect(String(call[0])).toBe("https://api.meta.ai/v1/chat/completions");
  });
});

describe("analyze route — behaviour", () => {
  it("a planner failure still returns findings, with a labelled rule-based check", async () => {
    fetchMock.mockImplementationOnce(async () => ok(EXTRACTION)).mockImplementationOnce(async () => new Response("{}", { status: 500 }));
    const { analyze } = await routes();
    const res = await analyze(req("/api/investigations/analyze", chatForm()));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.nextCheck.selectedBy).toBe("rules");
    expect(body.findings.find((f: { id: string }) => f.id === "F-payment").state).toBe("unknown");
  });

  it("a link-only check makes no model call", async () => {
    const f = new FormData();
    f.set("samples", "1");
    f.set("businessId", "sample-bahay-dagat");
    f.set("pageUrl", "facebook.com/bahaydagat.moalboal.ph");
    const { analyze } = await routes();
    const body = await (await analyze(req("/api/investigations/analyze", f))).json();
    expect(body.inferencePerformed).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs contain no screenshot text, account numbers or tokens", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockImplementation(async () => ok(EXTRACTION));
    const { analyze } = await routes();
    const body = await (await analyze(req("/api/investigations/analyze", chatForm()))).json();
    const logged = JSON.stringify([...info.mock.calls, ...warn.mock.calls]);
    expect(logged).not.toMatch(/GCash|Reyes|0917|Lumen Cove/);
    expect(logged).not.toContain(body.sealedCaseToken.slice(0, 20));
    expect(JSON.stringify(body)).not.toContain("555 4821");
  });

  it("rate-limits one client per minute and says when to retry", async () => {
    process.env.RATE_LIMIT_PER_MINUTE = "2";
    const { analyze } = await routes();
    const link = () => {
      const f = new FormData();
      f.set("samples", "1");
      f.set("pageUrl", "facebook.com/lumencoveresort");
      return f;
    };
    expect((await analyze(req("/api/investigations/analyze", link(), "1.2.3.4"))).status).toBe(200);
    expect((await analyze(req("/api/investigations/analyze", link(), "1.2.3.4"))).status).toBe(200);
    const limited = await analyze(req("/api/investigations/analyze", link(), "1.2.3.4"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toMatch(/^\d+$/);
    expect((await analyze(req("/api/investigations/analyze", link(), "5.6.7.8"))).status).toBe(200);
  });
});

describe("reassess route", () => {
  async function analyzed() {
    const { analyze, reassess } = await routes();
    const f = new FormData();
    f.set("samples", "1");
    f.set("businessId", "sample-bahay-dagat");
    f.set("pageUrl", "facebook.com/bahaydagat.moalboal.ph");
    const body = await (await analyze(req("/api/investigations/analyze", f))).json();
    return { body, reassess };
  }

  it("accepts exactly one follow-up for the presented check (VERIFY-03)", async () => {
    const { body, reassess } = await analyzed();
    expect(body.nextCheck.actionId).toBe("CHECK_REGISTERED_CONTACT_POLICY");
    const send = (token: string) => {
      const f = new FormData();
      f.set("sealedCaseToken", token);
      f.set("actionId", body.nextCheck.actionId);
      f.set("reportedAnswer", "confirmed");
      return reassess(req("/api/investigations/reassess", f));
    };
    const first = await send(body.sealedCaseToken);
    const firstBody = await first.json();
    expect(first.status).toBe(200);
    expect(firstBody.changes).toEqual([]);
    const second = await send(firstBody.sealedCaseToken);
    expect((await second.json()).error.code).toBe("FOLLOWUP_ALREADY_USED");
  });

  it("rejects an action that wasn't presented (VERIFY-01)", async () => {
    const { body, reassess } = await analyzed();
    const f = new FormData();
    f.set("sealedCaseToken", body.sealedCaseToken);
    f.set("actionId", "COMPARE_LGU_REFERENCE_PAGE");
    f.set("extraPageUrl", "facebook.com/bahaydagatmoalboal");
    expect((await (await reassess(req("/api/investigations/reassess", f))).json()).error.code).toBe("CASE_INVALID");
  });

  it("rejects a tampered token", async () => {
    const { body, reassess } = await analyzed();
    const f = new FormData();
    f.set("sealedCaseToken", body.sealedCaseToken.slice(0, -4) + "AAAA");
    f.set("actionId", body.nextCheck.actionId);
    f.set("reportedAnswer", "confirmed");
    expect((await (await reassess(req("/api/investigations/reassess", f))).json()).error.code).toBe("CASE_INVALID");
  });
});

describe("Messenger check (MESSAGE_FROM_LISTED_PAGE)", () => {
  it("takes only its own answers, keeps them as a note, and changes no finding", async () => {
    const { analyze, reassess } = await routes();
    const extraction = JSON.stringify({
      observations: [{ inputId: "IN-CHAT-1", field: "chat_sender_label", value: "Bahay Dagat Resort", visibleExcerpt: null, clarity: "clear" }],
      warnings: [],
    });
    const plan = JSON.stringify({
      actionId: "MESSAGE_FROM_LISTED_PAGE",
      question: "Is the chat you're in with the page the tourism office lists?",
      whyItMatters: "Starting a message from the listed page shows which conversation belongs to that page.",
      ifA: "The same conversation opens, so you're chatting with the listed page.",
      ifB: "A new, empty chat opens, so the account that messaged you is a different one.",
    });
    fetchMock.mockResolvedValueOnce(ok(extraction)).mockResolvedValueOnce(ok(plan));
    const f = new FormData();
    f.set("samples", "1");
    f.set("businessId", "sample-bahay-dagat");
    f.set("pageUrl", "facebook.com/bahaydagat.moalboal.ph");
    f.set("consent", "true");
    f.append("chatImages", new File([PNG], "chat.png", { type: "image/png" }));
    const body = await (await analyze(req("/api/investigations/analyze", f))).json();
    expect(body.nextCheck).toMatchObject({ actionId: "MESSAGE_FROM_LISTED_PAGE", selectedBy: "model", allowedActionIds: ["MESSAGE_FROM_LISTED_PAGE"] });

    const send = (answer: string) => {
      const r = new FormData();
      r.set("sealedCaseToken", body.sealedCaseToken);
      r.set("actionId", "MESSAGE_FROM_LISTED_PAGE");
      r.set("reportedAnswer", answer);
      return reassess(req("/api/investigations/reassess", r));
    };
    expect((await (await send("confirmed")).json()).error.code).toBe("NO_EVIDENCE");
    const res = await (await send("new_chat")).json();
    expect(res.changes).toEqual([]);
    expect(res.outcome).toBe(res.previousOutcome);
    expect(res.followup).toMatchObject({ reportedAnswer: "new_chat", inputLabel: "What you saw in Messenger" });
  });
});

describe("request size cap", () => {
  it("rejects an oversized upload even without a Content-Length header, before any model call", async () => {
    const { analyze } = await routes();
    const big = new Uint8Array(5_000_000);
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < big.length; i += 64_000) c.enqueue(big.subarray(i, i + 64_000));
        c.close();
      },
    });
    const req = new NextRequest("http://localhost/api/investigations/analyze", {
      method: "POST",
      body: stream,
      headers: { "content-type": "multipart/form-data; boundary=x", "x-forwarded-for": "10.0.0.9" },
      duplex: "half", // Node's fetch needs this for a streamed body
    });
    expect(req.headers.get("content-length")).toBeNull();
    const res = await analyze(req);
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// QA-LIVE: run the three synthetic demo scenarios N times end-to-end (analyze → one follow-up)
// against a running Trace server, check each run against the expected behaviour, and write a
// markdown report. Usage: TRACE_URL=http://localhost:3011 npm run qa:repeat -- [runs] [extra-image]
// Only synthetic sample images are sent unless an extra (unseen) image path is given; the report
// records outcomes and timings, never extracted text.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { basename } from "node:path";

const BASE = process.env.TRACE_URL ?? "http://localhost:3011";
const RUNS = Number(process.argv[2] ?? 5);
const EXTRA = process.argv[3];

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const S = "public/samples";
const SCENARIOS = {
  A: {
    business: "sample-lumen-cove",
    page: `${S}/A-page-lumencove-cropped.png`,
    chats: [`${S}/A-chat-lumencove-gcash.png`],
    followup: { extraPageUrl: "facebook.com/lumencove.reservations" },
    expect: { first: "insufficient_evidence", after: "no_material_conflict_observed", changes: 1, checkStatus: "check_available" },
  },
  B: {
    business: "sample-bahay-dagat",
    url: "facebook.com/bahaydagat.moalboal.ph",
    page: `${S}/B-page-bahaydagat-lookalike.png`,
    chats: [`${S}/B-chat-bahaydagat-deposit.png`, `${S}/B-chat-bahaydagat-number.png`],
    followup: { reportedAnswer: "confirmed" },
    expect: { first: "potential_channel_conflict", after: "potential_channel_conflict", changes: 0, checkStatus: "check_available" },
  },
  C: {
    unlisted: "Isla Verde Hideaway",
    chats: [`${S}/C-chat-islaverde-cropped.png`],
    expect: { first: "insufficient_evidence", after: null, changes: null, checkStatus: "no_safe_check" },
  },
} as const;

async function file(path: string) {
  return new File([await readFile(path)], basename(path), { type: path.endsWith(".webp") ? "image/webp" : path.endsWith(".jpg") ? "image/jpeg" : "image/png" });
}

async function post(path: string, form: FormData): Promise<{ status: number; body: Json; ms: number }> {
  const t = Date.now();
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: form });
  return { status: res.status, body: await res.json(), ms: Date.now() - t };
}

interface Row {
  scenario: string;
  run: number;
  pass: boolean;
  notes: string[];
  analyzeMs: number;
  modelMs: number | null;
  plannerMs: number | null;
  plan: string;
  first: string;
  after: string;
  changes: string;
}

async function runScenario(key: keyof typeof SCENARIOS, run: number): Promise<Row> {
  const sc = SCENARIOS[key] as Json;
  const form = new FormData();
  form.set("samples", "1");
  form.set("consent", "true");
  if (sc.business) form.set("businessId", sc.business);
  if (sc.unlisted) form.set("unlistedLabel", sc.unlisted);
  if (sc.url) form.set("pageUrl", sc.url);
  if (sc.page) form.set("pageImage", await file(sc.page));
  for (const c of sc.chats) form.append("chatImages", await file(c));
  const a = await post("/api/investigations/analyze", form);
  const row: Row = { scenario: key, run, pass: true, notes: [], analyzeMs: a.ms, modelMs: null, plannerMs: null, plan: "-", first: "-", after: "-", changes: "-" };
  if (a.body.error) {
    row.pass = false;
    row.notes.push(`analyze error ${a.body.error.code}`);
    return row;
  }
  const d = a.body;
  row.modelMs = d.inference?.latencyMs ?? null;
  row.plannerMs = d.planner?.latencyMs ?? null;
  row.first = d.outcome;
  row.plan = `${d.nextCheck.status}/${d.nextCheck.actionId ?? "-"}/${d.nextCheck.selectedBy}`;
  if (!d.inferencePerformed) row.notes.push("no live inference");
  if (d.outcome !== sc.expect.first) row.notes.push(`first outcome ${d.outcome}`);
  if (d.nextCheck.status !== sc.expect.checkStatus) row.notes.push(`check status ${d.nextCheck.status}`);
  if (d.findings.some((f: Json) => f.kind === "payment_instruction" && f.state !== "unknown")) row.notes.push("payment not unknown");

  if (sc.followup && d.nextCheck.actionId) {
    const f = new FormData();
    f.set("sealedCaseToken", d.sealedCaseToken);
    f.set("actionId", d.nextCheck.actionId);
    const pageAction = d.nextCheck.check.resolution === "page_link_or_screenshot";
    if (pageAction && sc.followup.extraPageUrl) f.set("extraPageUrl", sc.followup.extraPageUrl);
    else if (!pageAction && sc.followup.reportedAnswer) f.set("reportedAnswer", sc.followup.reportedAnswer);
    else if (sc.followup.extraPageUrl) f.set("reportedAnswer", "confirmed");
    else f.set("extraPageUrl", sc.url);
    const r = await post("/api/investigations/reassess", f);
    if (r.body.error) row.notes.push(`reassess error ${r.body.error.code}`);
    else {
      row.after = r.body.outcome;
      row.changes = String(r.body.changes.length);
      if (r.body.outcome !== sc.expect.after) row.notes.push(`after outcome ${r.body.outcome}`);
      if (r.body.changes.length !== sc.expect.changes) row.notes.push(`${r.body.changes.length} changes`);
      if (r.body.findings.some((x: Json) => x.kind === "payment_instruction" && x.state !== "unknown")) row.notes.push("payment changed");
    }
  }
  row.pass = row.notes.length === 0;
  return row;
}

async function main() {
  const rows: Row[] = [];
  for (let i = 1; i <= RUNS; i++) {
    for (const key of Object.keys(SCENARIOS) as (keyof typeof SCENARIOS)[]) {
      const r = await runScenario(key, i);
      rows.push(r);
      console.log(`${r.pass ? "✓" : "✗"} ${key}#${i} ${r.first} → ${r.after} plan=${r.plan} model=${r.modelMs}ms planner=${r.plannerMs}ms total=${r.analyzeMs}ms ${r.notes.join("; ")}`);
    }
  }

  const extra: string[] = [];
  if (EXTRA) {
    const f = new FormData();
    f.set("businessId", process.env.EXTRA_BUSINESS ?? "altogrand-beach-house");
    f.set("consent", "true");
    f.set("pageImage", await file(EXTRA));
    const r = await post("/api/investigations/analyze", f);
    const line = r.body.error
      ? `Unseen screenshot: error ${r.body.error.code}`
      : `Unseen real page screenshot (not in repo): live inference=${r.body.inferencePerformed}, model ${r.body.inference?.latencyMs}ms, outcome ${r.body.outcome}, findings ${r.body.findings.map((x: Json) => `${x.kind}:${x.state}`).join(", ")}`;
    console.log(line);
    extra.push(line);
  }
  const bad = new FormData();
  bad.set("sealedCaseToken", "not-a-token");
  bad.set("actionId", "COMPARE_LGU_REFERENCE_PAGE");
  bad.set("extraPageUrl", "facebook.com/x");
  const e = await post("/api/investigations/reassess", bad);
  extra.push(`Deliberate error (forged case token): HTTP ${e.status}, code ${e.body.error?.code}, success-shaped body: ${"findings" in e.body ? "yes" : "no"}`);
  console.log(extra[extra.length - 1]);

  const ms = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null).sort((a, b) => a - b);
    return v.length ? `median ${v[Math.floor(v.length / 2)]} ms, max ${v[v.length - 1]} ms (n=${v.length})` : "n/a";
  };
  const passed = rows.filter((r) => r.pass).length;
  const md = `# QA-LIVE repeat runs — ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC

Server: production build (\`next build\` + \`next start\`), live Meta \`muse-spark-1.3\`, extraction \`reasoning_effort: minimal\`. Synthetic samples only, except where noted.

**Result: ${passed}/${rows.length} scenario runs matched the expected behaviour.**

| Scenario | Expected |
|---|---|
| A | not enough evidence → (documented reservations link) → no conflict found; exactly 1 finding changes; payment stays unknown |
| B | possible mismatch → (phone report "they said yes") → unchanged; 0 findings change |
| C | not enough evidence; no safe check available (resort not on file) |

## Runs

| Scenario | Run | Pass | First outcome | Next check (status/action/selected by) | After follow-up | Changes | Extraction | Planner | Analyze total | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.scenario} | ${r.run} | ${r.pass ? "✓" : "✗"} | ${r.first} | ${r.plan} | ${r.after} | ${r.changes} | ${r.modelMs ?? "-"} ms | ${r.plannerMs ?? "-"} ms | ${r.analyzeMs} ms | ${r.notes.join("; ")} |`).join("\n")}

## Latency

- Extraction call: ${ms(rows.map((r) => r.modelMs))}
- Planner call: ${ms(rows.map((r) => r.plannerMs))}
- Analyze request end-to-end: ${ms(rows.map((r) => r.analyzeMs))}

## Other checks

${extra.map((x) => `- ${x}`).join("\n")}

Single-session measurements on a home connection; not a benchmark or SLA.
`;
  await mkdir("docs/qa", { recursive: true });
  const out = `docs/qa/repeat-runs-${new Date().toISOString().slice(0, 10)}.md`;
  await writeFile(out, md);
  console.log(`\n${passed}/${rows.length} passed — report written to ${out}`);
}

main();

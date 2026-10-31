# SentralID Trace — Verify Before You Book

Trace helps Philippine travelers check a hotel or resort booking channel on Facebook before paying a deposit. It compares a pasted Facebook page link and/or screenshots of the page and Messenger chat against a small registry of independently sourced business records, shows what matches, what conflicts and what can't be established, then proposes one safe follow-up check and re-assesses.

Entry for the **Meta Global AI Developer Hackathon** — Indie Developer track, *Build for Your World*.

> Status: under active development (Oct 27 – Nov 4, 2026). This README is expanded as each phase lands.

## How AI is used

- **Runtime model:** Meta **Muse Spark 1.3** (Standard mode) via the Meta Model API at `https://api.meta.ai/v1`. No other AI provider is called at runtime; the server refuses to start an inference call if the configured host or model is not on its allowlist.
- The model **extracts** visible details from screenshots and **proposes** a next check from a fixed catalog. Application code — not the model — normalizes links, compares claims against the registry, decides what is corroborated, and computes the before/after reassessment.
- URL-only checks make **no** model call and never fetch the pasted page.

## Requirements

- Node.js 20.9+ (developed on Node 24)
- Your own Meta Model API key

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- `MODEL_API_KEY` — your Meta Model API key (server-side only)
- `CASE_SEAL_KEY` — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

Verify your Meta access with a live smoke test (sends one synthetic sample screenshot):

```bash
npm run smoke:meta
```

Expected output: two `ok` lines. Muse Spark is a reasoning model, so the image call takes several seconds (about 4–12s depending on `reasoning_effort`).

## Run

```bash
npm run dev            # http://localhost:3000
npm run build && npm start
```

## Test

```bash
npm test               # unit tests
npm run typecheck
npm run lint
npm run registry:gate  # release gate: ≥10 reviewed, admitted real records
npm run eval:extraction -- minimal low   # live extraction on the synthetic samples (uses your key)
npm run eval:adversarial                 # live adversarial screenshots vs. a running server
TRACE_URL=http://localhost:3000 npm run qa:repeat -- 5   # 3 scenarios × 5 live runs → docs/qa/
```

Latest live QA report: [docs/qa/repeat-runs-2026-10-31.md](docs/qa/repeat-runs-2026-10-31.md).

## Safety and abuse controls

- **Model boundary:** screenshot text is data. The extraction prompt says so, output is schema-constrained and re-validated, and the comparison is done by fixed rules. Synthetic adversarial screenshots (prompt injection in a page bio, a fake "verified" badge with the real page's link in the bio, an "official GCash" chat) are in `eval/adversarial/`; none produced a page match or a "no conflict" result.
- **Mentioned links never count:** only the page's own address (pasted by the user, or shown as the address in a page screenshot) is compared. A link written inside a chat, bio or post is reported as "mentioned" and never matches. If one screenshot yields two different addresses, neither is trusted.
- **No fetching:** pasted links are parsed, never opened. The server only calls `https://api.meta.ai/v1`.
- **Privacy:** screenshots are processed in memory and not stored; logs record request id, input types, timings, counts and outcome only. Account numbers are masked in results.
- **Rate limiting:** `RATE_LIMIT_PER_MINUTE` (per client) and `MODEL_CALLS_PER_HOUR` (per server) cap model use. This limiter is in-memory **per instance**: it protects a local run but does not coordinate across serverless instances. A public hosted deployment must also enable platform rate limiting (for example a Vercel Firewall rate-limit rule on `/api/investigations/*`) and Meta API spend alerts.
- **Headers:** strict Content-Security-Policy (`connect-src 'self'`), `frame-ancestors 'none'`, `nosniff`, no `X-Powered-By`.

## How a check flows

1. **Analyze** (`POST /api/investigations/analyze`): screenshots → one Muse Spark extraction call → fixed comparison rules → findings and outcome. A second, small Muse Spark call picks **one** next check from the server's candidate list (`COMPARE_LGU_REFERENCE_PAGE`, `COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE`, `CHECK_REGISTERED_CONTACT_POLICY`) and explains it; anything outside the list or with unsafe wording is rejected and replaced by a rule-based plan that the UI labels as such. Link-only checks make no model calls.
2. **Reassess** (`POST /api/investigations/reassess`): one follow-up per case, carried in an encrypted, expiring case token. A new link is compared without fetching it; a new screenshot gets one more extraction call; a phone-call report is recorded as the user's note and cannot change any finding. Findings are recomputed against the same registry snapshot and returned as a before/after diff.

## Model settings and measured behaviour

Screenshot extraction uses `muse-spark-1.3` with `reasoning_effort: "minimal"`, chosen from live runs on 2026-10-31 (single runs, not a benchmark):

| Effort | Sample A | Sample B | Sample C | Extraction quality on samples |
|---|---|---|---|---|
| minimal | 4.2s | 4.3s | 5.9s | All key fields read correctly |
| low | 10.7s | 11.1s | 6.6s | Same fields |
| default | 18.2s | 25.8s | 21.1s | Same fields, more noise |

An unseen real page screenshot (not in the repo) also extracted correctly at `minimal` in 4.9s, including the `facebook.com/…` address from the browser bar. Muse Spark spends output tokens on reasoning first, so calls set a generous `max_tokens`; an exhausted budget is reported as an error, never as an empty result.

## Built during the hackathon (Oct 27 – Nov 4, 2026)

All code in this repository was written during the event. Commit history shows the progression by phase.

- Phase 1 — Foundation: Next.js app shell and design system (ported from the Trace prototype), fail-closed Meta Model API client, live smoke test, AES-256-GCM sealed case tokens.
- Phase 2 — Registry: claim/source data model with zod validation and integrity checks, admission gate, strict Facebook URL parser (no fetching), name search and exact link lookup, reference APIs, resort picker and "on file" source panel, labelled synthetic sample scenarios.
- Phase 3 — Live investigation: evidence intake (link, page screenshot, up to three ordered chat screenshots, consent), browser-side image shrinking, server-side content sniffing and limits, schema-constrained Muse Spark extraction with one bounded retry, deterministic comparison engine (page link, name, phone, chat sender, payment request), case outcome, sealed case token, findings view with evidence trace, and honest progress/error states.
- Phase 4 — VerifyNext and reassessment: server-owned catalog of three safe checks, deterministic candidate builder with two competing explanations, Muse Spark choosing one check from the allowlist and wording it (validated; labelled rule-based fallback), one sealed follow-up (page link, screenshot or phone-call report), claim-level before/after diff that changes only justified findings, and the check and updated-result screens.
- Phase 5 — Hardening: "mentioned link" handling and ambiguous-address guard, synthetic adversarial screenshots with a live eval, per-instance rate limiting with `Retry-After`, security headers, clear error for a rejected API key, route-level failure tests (provider 401/429/500/timeout/bad output, missing key, planner failure, follow-up replay, tampered token, log hygiene), contrast and control-labelling fixes, and a 3×5 live repeat-run report.

## Reference registry

`src/data/reference-registry/` holds real Philippine resort records. Each record links a business to a Facebook page only when a separate, identifiable source does so — primarily the [San Juan, Batangas LGU tourism directory](https://tourism.sanjuanbatangas.gov.ph/verified-facebook-pages), sometimes also the resort's own website. Records stay `draft` (never shown or compared against) until a human reviewer checks them; see [docs/registry-audit.md](docs/registry-audit.md). A record supports only the page relationship — never a chat sender or payment account.

## Sample data

Files in `public/samples/` are **synthetic** screenshots of **fictional** resorts (watermarked "Synthetic sample — not a real business"). They exist only to demonstrate the workflow and make no claim about any real business.

## Disclaimer

Trace is a hackathon prototype. Its results are not a guarantee of authenticity or booking safety, and it does not certify any payment account.

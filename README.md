# SentralID Trace — Verify Before You Book

**Trace checks a Philippine hotel or resort booking channel before you pay a deposit.** Paste the Facebook page link you were sent and/or upload screenshots of the page and your Messenger chat. Trace reads them live with **Meta Muse Spark**, compares what it sees against independently sourced records, tells you what matches, what doesn't and what nobody can confirm from a screenshot — then suggests **one safe check** and updates the result when you come back with the answer.

Entry for the **Meta Global AI Developer Hackathon** — Indie Developer track, *Build for Your World*.

| | |
|---|---|
| Runtime AI | Meta `muse-spark-1.3` (Standard mode) via `https://api.meta.ai/v1` — the only AI the app calls |
| Real records | 13 San Juan, Batangas resorts, each tied to its Facebook page by the LGU tourism directory |
| Tests | 131 unit/route tests · live 4 × 5 demo runs: 20/20 ([report](docs/qa/repeat-runs-2026-10-31.md)) |

## Why this isn't "ask a chatbot"

- **The model reads; it never decides.** Muse Spark extracts what is visible into a strict schema. Fixed rules compare those observations with a curated, source-backed registry and produce every finding.
- **Every finding is traceable** to an observation in your input and, where it matches, a registry claim with its source and review date.
- **It never over-claims.** A matching page never "verifies" the person chatting with you or the GCash/bank account they give you — those stay *can't tell*, always. There is no scam score and no "safe to pay".
- **It asks for the one check that could change the answer.** VerifyNext states two competing explanations, picks one safe check from a server-owned catalog (Muse Spark chooses and explains; the server validates), and re-assesses only the findings that evidence justifies.

## Quick start (about 5 minutes)

Requirements: **Node.js 20.9+** (tested on Node 24) and **your own Meta Model API key**.

```bash
git clone https://github.com/flytying/sentralid-trace.git
cd sentralid-trace
npm ci
cp .env.example .env.local
```

Edit `.env.local`:

- `MODEL_API_KEY=` your Meta Model API key (kept server-side; never sent to the browser)
- `CASE_SEAL_KEY=` output of `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

Check your key works (sends one synthetic sample screenshot to Meta; expect two `ok` lines):

```bash
npm run smoke:meta
```

Run it:

```bash
npm run build && npm start      # production build on http://localhost:3000
# or: npm run dev
```

### Try it

1. Open http://localhost:3000 and pick **Sample A** under *Try a sample*. (Samples use made-up resorts and screenshots, but are analysed live.)
2. Tick the privacy box → **Check this booking**. Muse Spark reads both screenshots (~5 s). Result: *We can't confirm this booking channel yet* — the cropped page screenshot doesn't show which page it is.
3. **Let's check** → Trace suggests comparing your page's address with the pages the resort's own website lists. Click **Use the sample's page link** → **Compare and update my result**.
4. The page finding changes from *Can't tell* to *Matches our record*. Who is sending the messages and whose GCash it is stay open.
5. Try **Sample B** (a lookalike page and a different phone number → *Some details don't match*; Meta AI suggests either calling the number on file or messaging the resort from its listed page; what you report is kept as a note and changes nothing, by design) **Sample C** (a resort not on file → no safe check available) and **Sample D** (the page and number match our records, but the chat wants a deposit to a personal GCash → Meta AI suggests messaging the resort from its listed page; tick *It opened a new, empty chat* to see the guidance).
6. Then use your own screenshot of a real resort's Facebook page — for example one of the [13 resorts on file](docs/registry-audit.md) — via **Check a booking**.

### Live vs. simulated

Everything is live. There is **no replay, stub or cached-answer mode**: every screenshot (including the samples) goes to Meta, and if Meta is unavailable you get an error, never a made-up result. Checks that use only a pasted link make **no** model call — the UI says so — and never open the link.

## How a check flows

1. **Analyze** (`POST /api/investigations/analyze`): validate inputs (content-sniffed images, strict Facebook-URL parser) → one Muse Spark **extraction** call → deterministic comparison → findings and outcome → one small Muse Spark **planning** call that chooses the next check from the server's candidates (`COMPARE_LGU_REFERENCE_PAGE`, `COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE`, `CHECK_REGISTERED_CONTACT_POLICY`, `MESSAGE_FROM_LISTED_PAGE`). Anything outside the list, or with unsafe wording, is rejected and replaced by a rule-based plan that the UI labels as such.
2. **Reassess** (`POST /api/investigations/reassess`): exactly one follow-up, carried in an AES-256-GCM encrypted, expiring case token (no database). A new link is compared without fetching it; a new screenshot gets one more extraction call; a phone-call report, or what the user saw after tapping **Message** on the listed page (same conversation / new empty chat), is kept as the user's note and cannot change any finding — Trace can't see Messenger, so it never claims to know who is behind a chat. Findings are recomputed against the same registry snapshot and returned as a before/after diff.

Outcomes are one of: *No conflict found in what we could check*, *Possible booking-channel mismatch*, *Not enough evidence* — each with "This can't promise the page is real or that paying is safe."

## Reference registry

`src/data/reference-registry/` holds **13 real resorts** in San Juan, Batangas. Each record links a business to a Facebook page only because a separate, identifiable source does: the [San Juan, Batangas Municipal Tourism Office directory](https://tourism.sanjuanbatangas.gov.ph/verified-facebook-pages) (and, for four resorts, the resort's own website too). Links were taken from the page HTML, then approved in manual review — see [docs/registry-audit.md](docs/registry-audit.md). Phone numbers and emails come only from that exact listed page (the resort's own published contacts), never from a lookalike. A record supports the page relationship and those published contacts, never a chat sender, booking agent or payment account. `npm run registry:gate` enforces the ≥ 10 reviewed-records release gate.

Sample resorts (Lumen Cove, Bahay Dagat, Isla Verde) are fictional, kept in a separate fixture file with `.example` sources, and never counted as real.

## Safety, privacy and abuse controls

- **Model boundary:** screenshot text is data. The extraction prompt says so; output is schema-constrained by the API and re-validated with zod; unknown fields, extra keys or screenshots that weren't sent are rejected (one bounded retry, then an error).
- **Mentioned links never count:** only the page's own address (pasted, or shown as the address in a page screenshot) is compared. Links written in chats, bios or posts are reported as "mentioned" and never match; if one screenshot yields two different addresses, neither is trusted. Synthetic adversarial screenshots (prompt injection in a bio, fake "verified" badge with the real link, "official GCash" chat) live in `eval/adversarial/`; none produced a match or a "no conflict" result.
- **No fetching:** pasted links are parsed, never opened. The only outbound request is to `https://api.meta.ai/v1`; the server refuses to run with any other host or model.
- **Privacy:** consent and redaction notice before any screenshot is sent; images are shrunk in the browser, processed in memory and never stored; account numbers are masked; logs contain only request id, input types, timings, counts and outcome.
- **Rate limiting:** `RATE_LIMIT_PER_MINUTE` (per client) and `MODEL_CALLS_PER_HOUR` (per server) cap model use, with `Retry-After`. This limiter is **per instance** — fine for a local run; a public deployment must add platform rate limiting and Meta spend alerts.
- **Headers:** strict CSP (`connect-src 'self'`, `frame-ancestors 'none'`), `nosniff`, no `X-Powered-By`.

## Testing and QA

```bash
npm test                 # 131 unit + route tests (no network)
npm run typecheck && npm run lint
npm run registry:gate    # ≥10 reviewed real records
npm run smoke:meta       # live: key, image input, JSON-schema output
npm run eval:extraction -- minimal low      # live: extraction on samples per reasoning effort
npm run eval:adversarial                    # live: adversarial screenshots vs. a running server
TRACE_URL=http://localhost:3000 npm run qa:repeat -- 5   # live: 3 scenarios × 5 runs → docs/qa/
```

Tests cover the trust invariants from the design (every finding cites evidence; a screenshot alone can't corroborate; payment never upgrades; only allowlisted checks; one follow-up; unrelated findings stay byte-identical), provider failures (401/429/500/timeout/malformed output never produce a result), tampered/expired/replayed case tokens, image sniffing and log hygiene.

Latest live report: [docs/qa/repeat-runs-2026-10-31.md](docs/qa/repeat-runs-2026-10-31.md) — 20/20 runs matched expectations on a production build; analyze end-to-end 3.1–9.1 s.

## Model settings

Extraction and planning use `reasoning_effort: "minimal"`, chosen from live runs on 2026-10-31 (single runs, not a benchmark):

| Effort | Sample A | Sample B | Sample C | Extraction on samples |
|---|---|---|---|---|
| minimal | 4.2 s | 4.3 s | 5.9 s | All key fields read correctly |
| low | 10.7 s | 11.1 s | 6.6 s | Same fields |
| default | 18.2 s | 25.8 s | 21.1 s | Same fields, more noise |

Muse Spark reasons before answering and reasoning tokens count against `max_tokens`, so calls use a generous budget; an exhausted budget is reported as an error, never as an empty result.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Live analysis isn't set up" / `CONFIG_INVALID` | `MODEL_API_KEY` or `CASE_SEAL_KEY` missing in `.env.local`; restart the server after editing. |
| "The Meta Model API rejected this server's API key" | The key is wrong or lacks access to `muse-spark-1.3`; run `npm run smoke:meta`. |
| `MODEL_RATE_LIMITED` | Your Meta quota or Trace's per-minute limit (`RATE_LIMIT_PER_MINUTE`, default 8) — wait the time shown. |
| `MODEL_TIMEOUT` | Slow provider response; retry, or raise `MODEL_TIMEOUT_MS` (default 45000). |
| `CASE_EXPIRED` / `FOLLOWUP_ALREADY_USED` | Case tokens last 30 minutes and allow one follow-up; start a new check. |
| "We couldn't load our records" | The registry files failed validation; run `npm run registry:gate` to see why. |
| Port 3000 busy | `npm start -- -p 3001` |

## Project layout

```
src/app/                 pages (/, /investigate, /about) and API routes
src/components/investigate/   workspace UI: picker, evidence form, findings, check, result
src/lib/engine/          deterministic comparison, phone handling, outcome, copy
src/lib/meta/            Meta Model API client and extraction adapter
src/lib/verify/          VerifyNext catalog, planner, reassessment diff
src/lib/registry/        registry schema, loader, admission gate, search
src/lib/case/            analyze / reassess orchestration, sealed case tokens
src/data/reference-registry/   real records + synthetic sample fixtures
eval/adversarial/        synthetic adversarial screenshots (and their HTML sources)
docs/                    registry audit, QA reports, demo script, submission checklist
```

## Built during the hackathon (Oct 27 – Nov 4, 2026)

All code in this repository was written during the event; the commit history shows the progression. Inputs prepared earlier in the event by the entrant — the BRD/PRD/TDD specifications and a clickable HTML prototype whose visual design was ported here — are not in this repo. The synthetic sample screenshots are generated in the repo by `eval/samples-src/render.mjs`. Deliberate changes from the specs (a fourth safe check, a fourth sample, a contacts-only source kind, made-up sample resorts) are recorded in [docs/spec-changes.md](docs/spec-changes.md).

- **Phase 1 — Foundation:** Next.js app shell and design system, fail-closed Meta Model API client, live smoke test, AES-256-GCM sealed case tokens.
- **Phase 2 — Registry:** claim/source data model with validation and admission gate, 13 reviewed real records, strict Facebook URL parser, search and exact link lookup, reference APIs, resort picker and "on file" source panel, labelled synthetic samples.
- **Phase 3 — Live investigation:** evidence intake with consent, browser-side image shrinking, server-side content sniffing, schema-constrained Muse Spark extraction, deterministic comparison engine, findings view with evidence trace, honest progress and error states.
- **Phase 4 — VerifyNext:** safe-check catalog, competing explanations, model-chosen and validated check with rule-based fallback, one sealed follow-up, claim-level before/after diff, check and updated-result screens.
- **Phase 5 — Hardening:** mentioned-link and ambiguous-address guards, adversarial screenshots and live eval, rate limiting, security headers, route-level failure tests, accessibility fixes, 3 × 5 live repeat runs.
- **Phase 6 — Submission:** this README, clean-checkout verification, demo script and submission checklist.
- **Phase 7 — Depth and polish:** phone numbers and emails from each resort's listed page (contacts-only source kind with admission checks); a fourth safe check, *message the resort from its listed page*, and Sample D to show it; realistic generated sample screenshots; a progress screen that plays out the real stages; redesigned check, result and side-panel screens; full-size screenshot viewer; a type scale and a WCAG AA contrast pass; 4 × 5 live repeat runs (20/20).

## Third-party software and data

Next.js, React, zod, lucide-react (ISC), Geist fonts via `next/font` (SIL OFL); dev: Vitest, tsx, ESLint. Registry facts (business names and public Facebook links) are cited from the San Juan, Batangas Municipal Tourism Office directory and the resorts' own websites; no photos, logos or page content from them are included. Sample and adversarial screenshots are synthetic and watermarked.

## Limitations

- Registry covers 13 resorts in one municipality; anything else is "not on file" (which is not evidence of anything).
- A screenshot can be edited; Trace says so on screenshot-based matches and never treats a match as proof of who is chatting or who owns a payment account.
- The rate limiter is per server instance; the case token allows one follow-up per issued token, and an unexpired earlier token could be replayed until it expires (30 min).
- Latency figures are single-session measurements, not an SLA.

## License

**All rights reserved.** The code is public only so the hackathon can review it: organizers, sponsors and judges may clone and run it to evaluate this entry. No other use, copying or redistribution is permitted without written permission. See [LICENSE](LICENSE).

## Disclaimer

Trace is a hackathon prototype, not an official Meta product or a fraud-detection service. Its results are not a guarantee of authenticity or booking safety, and it does not certify any payment account.

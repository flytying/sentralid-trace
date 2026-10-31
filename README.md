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
```

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

## Reference registry

`src/data/reference-registry/` holds real Philippine resort records. Each record links a business to a Facebook page only when a separate, identifiable source does so — primarily the [San Juan, Batangas LGU tourism directory](https://tourism.sanjuanbatangas.gov.ph/verified-facebook-pages), sometimes also the resort's own website. Records stay `draft` (never shown or compared against) until a human reviewer checks them; see [docs/registry-audit.md](docs/registry-audit.md). A record supports only the page relationship — never a chat sender or payment account.

## Sample data

Files in `public/samples/` are **synthetic** screenshots of **fictional** resorts (watermarked "Synthetic sample — not a real business"). They exist only to demonstrate the workflow and make no claim about any real business.

## Disclaimer

Trace is a hackathon prototype. Its results are not a guarantee of authenticity or booking safety, and it does not certify any payment account.

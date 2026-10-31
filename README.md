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
```

## Built during the hackathon (Oct 27 – Nov 4, 2026)

All code in this repository was written during the event. Commit history shows the progression by phase.

- Phase 1 — Foundation: Next.js app shell and design system (ported from the Trace prototype), fail-closed Meta Model API client, live smoke test, AES-256-GCM sealed case tokens.

## Sample data

Files in `public/samples/` are **synthetic** screenshots of **fictional** resorts (watermarked "Synthetic sample — not a real business"). They exist only to demonstrate the workflow and make no claim about any real business.

## Disclaimer

Trace is a hackathon prototype. Its results are not a guarantee of authenticity or booking safety, and it does not certify any payment account.

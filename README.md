# SentralID Trace: Verify Before You Book

**Trace helps you check a Philippine hotel or resort booking before you pay a deposit.**

In the Philippines, booking a beach resort often happens on Facebook: you find a page, chat on Messenger, and send a deposit by GCash. Scammers copy real resorts' pages and photos to collect those deposits. Trace gives you a way to check before you pay.

You give Trace what you have: the Facebook link you were sent, a screenshot of the page, or screenshots of your chat. Trace reads them with **Meta's Muse Spark AI**, compares what it finds with records from a government source, and tells you what matches, what doesn't, and what a screenshot can't prove. Then it suggests **one safe thing to check next**, and updates the result when you come back with the answer.

This is an entry for the **Meta Global AI Developer Hackathon** (Indie Developer track, *Build for Your World*).

| | |
|---|---|
| AI used | Meta `muse-spark-1.3`, through `https://api.meta.ai/v1`. It's the only AI the app talks to. |
| Real records | 13 resorts in San Juan, Batangas, each linked to its Facebook page by the town's tourism office |
| Tests | 134 automated tests, plus 20 out of 20 live end-to-end runs ([report](docs/qa/repeat-runs-2026-10-31.md)) |

## Why this isn't just an image reader

Reading the screenshot is only the first of six steps, and it never decides the result.

1. **Read.** Muse Spark reads the screenshots and lists what it sees: the page address, names, phone numbers, payment requests. It treats any text in a screenshot as information, never as instructions, even text that tries to give it orders.
2. **Compare with a government source.** Fixed rules, not the AI, compare what was read with Trace's records. Those records come from the [San Juan, Batangas Municipal Tourism Office's list of verified resort Facebook pages](https://tourism.sanjuanbatangas.gov.ph/verified-facebook-pages), published by a Philippine town government. Every result says which record and source it relies on.
3. **Keep each question separate.** Finding the right Facebook page doesn't tell you who is chatting with you, or whose GCash account you're paying. Trace keeps those as "can't tell" every time. It never gives a scam score and never says "safe to pay".
4. **Plan the next step.** Muse Spark sets out the two most likely explanations and picks one safe check from a short list Trace controls. For example: compare the page with the tourism office's list, call the number on file, or message the resort from its listed page.
5. **Double-check the AI's plan.** Trace throws out any plan that isn't on the list, or whose wording vouches for someone, accuses someone, or includes a phone number or link that a scammer could have slipped into a screenshot. If that happens, it shows a standard plan instead and says so.
6. **Update the result.** You add one thing you found. Trace checks it against the same records and shows exactly what changed and why.

The "message the resort" check answers something no screenshot can: **who is actually behind this chat?** Trace can't see your Messenger, so it tells you how to find out yourself. Open the page the tourism office lists and tap **Message**. If the same conversation opens, you're talking to that page. If a new, empty chat opens, whoever asked you for money is someone else.

**Why Trace doesn't scan Facebook itself.** Meta doesn't allow automated collection of Facebook data without permission, and it wouldn't help anyway. A Facebook page says whatever its owner wants, and it can't show who runs a chat or owns a payment account. Trace relies on an independent source, the government list, and it never opens the links you paste.

## Quick start (about 5 minutes)

You'll need **Node.js 20.9 or newer** (tested on Node 24) and **your own Meta Model API key**.

```bash
git clone https://github.com/flytying/sentralid-trace.git
cd sentralid-trace
npm ci
cp .env.example .env.local
```

Open `.env.local` and fill in two values:

- `MODEL_API_KEY=`: your Meta Model API key. It stays on the server and is never sent to the browser.
- `CASE_SEAL_KEY=`: a random secret Trace uses to protect each check in progress. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

Check that your key works. This makes two small calls to Meta, the second with a made-up sample screenshot; you should see two `ok` lines.

```bash
npm run smoke:meta
```

Start the app:

```bash
npm run build && npm start      # production build on http://localhost:3000
# or: npm run dev
```

### Try it

1. Open http://localhost:3000 and choose **Sample A** under *Try a sample*. The samples use made-up resorts and screenshots, but Meta reads them live, just like your own.
2. Tick the privacy box and click **Check this booking**. Muse Spark reads both screenshots in about 5 seconds. The result is *We can't confirm this booking channel yet*, because the page screenshot is cropped and doesn't show which page it is.
3. Click **Let's check**. Trace suggests comparing the page's address with the pages listed on the resort's own website. Click **Use the sample's link**, then **Compare and update my result**.
4. The page result changes from *Can't tell* to *Matches our record*. Who is sending the messages, and whose GCash account it is, stay open.
5. Try the other samples:
   - **Sample B:** a lookalike page with a different phone number. The result is *Some details don't match*. Trace suggests calling the number on file or messaging the resort from its listed page. Your answer is kept as a note and doesn't change the result, on purpose.
   - **Sample C:** a resort that isn't in Trace's records, so there's no safe check to suggest.
   - **Sample D:** the page and phone number both match, but the chat demands a same-day deposit to a personal GCash account. Trace suggests messaging the resort from its listed page. Choose *It opened a new, empty chat* to see what Trace advises.
6. Then try a screenshot of a real resort's Facebook page, such as one of the [13 resorts on file](docs/registry-audit.md), using **Check a booking**.

### Is it really live?

Yes. There's no replay mode and no stored answers. Every screenshot, including the samples, goes to Meta. If Meta is unavailable, you see an error, never a made-up result. A check that uses only a pasted link doesn't need the AI at all; the app tells you so, and it never opens the link.

## How a check works

**1. First check.** Trace checks your files (it looks at the actual image data, not just the file name) and the link you pasted. Then:
- one call to Muse Spark reads the screenshots;
- fixed rules compare what was read with the records and produce the findings and overall result;
- a second, small call to Muse Spark chooses the next check from Trace's list: `COMPARE_LGU_REFERENCE_PAGE`, `COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE`, `CHECK_REGISTERED_CONTACT_POLICY` or `MESSAGE_FROM_LISTED_PAGE`. If its choice or wording fails Trace's checks, a standard plan is used instead and labelled as such.

This is the `POST /api/investigations/analyze` endpoint.

**2. Follow-up.** You get one follow-up per check (`POST /api/investigations/reassess`). Trace doesn't keep a database. The check in progress travels with your browser in an encrypted token (AES-256-GCM) that expires after 30 minutes.
- A new link is compared without being opened.
- A new screenshot gets one more read by Muse Spark.
- An answer you report (what the resort told you on the phone, or what happened when you tapped **Message**) is saved as your note and can't change any finding. Trace can't hear your call or see your Messenger, so it never claims to know who is behind a chat.

Trace then re-checks everything against the same records and shows a before-and-after.

The overall result is always one of three: *No conflict found in what we could check*, *Possible booking-channel mismatch*, or *Not enough evidence*. Each comes with the reminder that Trace can't promise a page is real or that paying is safe.

## The records

`src/data/reference-registry/` holds **13 real resorts** in San Juan, Batangas. A resort's Facebook page is on file only because an independent source links the two: the [San Juan, Batangas Municipal Tourism Office list](https://tourism.sanjuanbatangas.gov.ph/verified-facebook-pages), and for four resorts, their own website as well. Each link was copied from the source page's code and then reviewed by hand; see [docs/registry-audit.md](docs/registry-audit.md).

Phone numbers and emails come only from the resort's own listed Facebook page, never from a lookalike. A record backs up the resort's page and published contacts. It says nothing about who sends a chat, any booking agent, or any payment account. `npm run registry:gate` confirms at least 10 reviewed real records are in place.

The sample resorts (Lumen Cove, Bahay Dagat, Isla Verde and Mirasol Cove) are made up. They live in a separate file, use `.example` web addresses, and are never counted as real.

## Safety and privacy

- **Screenshots can't give the AI orders.** The AI is told that screenshot text is information only. Its answers must follow a fixed format, and Trace checks them again before using them. Anything unexpected is rejected: after one retry, you get an error.
- **Only the page's own address counts.** Trace compares the address you pasted, or the one shown in the browser bar of a page screenshot. Links written inside chats, bios or posts are listed as "mentioned" and never count as a match. If one screenshot shows two different page addresses, Trace trusts neither.
- **The AI can't pass on a scammer's contact details.** Muse Spark words the suggested next check, but Trace rejects that wording if it includes a phone or account number, an @handle, an email, a link, or words like "official", "verified", "safe to pay" or "scam". The check card only ever shows contact details from Trace's own records.
- **Tested against attacks.** `eval/adversarial/` holds made-up hostile screenshots: hidden instructions to the AI in a page bio, a fake "verified" badge next to the real link, a chat claiming to be the "official GCash", and a chat whose sender name tells the AI to send the user to a phone number and call it safe to pay. In live runs (`npm run eval:adversarial`), none of them produced a false match, a "no conflict" result, or a planted number on the check card. The planted number was even flagged as not matching the one on file.
- **Nothing is fetched.** Pasted links are read as text, never opened. The only outside service Trace contacts is `https://api.meta.ai/v1`, and the server won't start with any other address or model.
- **Privacy.** You're asked to cover private details and agree before any screenshot is sent. Images are shrunk in your browser, handled in memory, and never stored. Account numbers are partly hidden. Logs record only timings, counts and the result, never what your screenshots say.
- **Size limits.** Uploads are capped at 4.4 MB, counted from the data actually received, so the cap can't be dodged. Each image is checked to be a real PNG, JPEG or WebP of a sensible size.
- **Usage limits.** `RATE_LIMIT_PER_MINUTE` limits each visitor, and `MODEL_CALLS_PER_HOUR` limits the whole server, so a busy or abusive visitor can't run up a large Meta bill. These limits apply to one running server. The per-visitor limit trusts a header that only a proxy you control can vouch for, but the server-wide hourly limit always holds. That's fine for running it yourself; a public deployment should add its host's rate limiting and a Meta spending alert.
- **Browser protections.** In production the app sends strict security headers: a content security policy, no embedding in other sites, and no guessing of file types.
- **Dependencies.** `npm audit` reports no known vulnerabilities. Zod is on 4.6.7, and the PostCSS bundled with Next.js is pinned to 8.5.29 through `overrides` in `package.json`.

## Testing

```bash
npm test                 # 134 automated tests (no network)
npm run typecheck && npm run lint
npm run registry:gate    # at least 10 reviewed real records
npm run smoke:meta       # live: your key, image input, structured output
npm run eval:extraction -- minimal low      # live: how well samples are read at each reasoning setting
npm run eval:adversarial                    # live: hostile screenshots against a running server
TRACE_URL=http://localhost:3000 npm run qa:repeat -- 5   # live: 4 samples × 5 runs → docs/qa/
```

The automated tests check the safety rules from the design:
- every finding points to its evidence;
- a screenshot alone can't confirm anything;
- the payment account is never treated as confirmed;
- only checks on Trace's list are allowed, with one follow-up each;
- a follow-up never changes unrelated findings.

They also cover Meta failing (rejected key, rate limit, server error, timeout, garbled answers never produce a result), tampered or expired check tokens, image checks and log privacy.

Latest live run: [docs/qa/repeat-runs-2026-10-31.md](docs/qa/repeat-runs-2026-10-31.md). All 20 runs (4 samples, 5 times each) behaved as expected on a production build, taking 3 to 9 seconds per check.

## AI settings

Both AI calls use `reasoning_effort: "minimal"`. We picked it after timing live runs on 31 Oct 2026 (single runs, not a benchmark):

| Setting | Sample A | Sample B | Sample C | Reading quality |
|---|---|---|---|---|
| minimal | 4.2 s | 4.3 s | 5.9 s | All key details read correctly |
| low | 10.7 s | 11.1 s | 6.6 s | The same |
| default | 18.2 s | 25.8 s | 21.1 s | The same, with more noise |

Muse Spark thinks before it answers, and that thinking counts toward its word limit (`max_tokens`). So Trace gives it a generous limit. If the limit still runs out, you get an error, never an empty result.

## Troubleshooting

| What you see | What to do |
|---|---|
| "Live analysis isn't set up" / `CONFIG_INVALID` | `MODEL_API_KEY` or `CASE_SEAL_KEY` is missing from `.env.local`. Add it and restart the server. |
| "The Meta Model API rejected this server's API key" | The key is wrong, or it can't use `muse-spark-1.3`. Run `npm run smoke:meta` to check. |
| `MODEL_RATE_LIMITED` | You've hit your Meta quota or Trace's per-minute limit (`RATE_LIMIT_PER_MINUTE`, default 8). Wait the time shown. |
| `MODEL_TIMEOUT` | Meta was slow to answer. Try again, or raise `MODEL_TIMEOUT_MS` (default 45000). |
| `CASE_EXPIRED` / `FOLLOWUP_ALREADY_USED` | A check lasts 30 minutes and allows one follow-up. Start a new check. |
| "We couldn't load our records" | The record files have a problem. Run `npm run registry:gate` to see what. |
| Port 3000 is busy | `npm start -- -p 3001` |

## Project layout

```
src/app/                       pages (/, /investigate, /about) and API routes
src/components/investigate/    the check screens: resort picker, upload form, findings, next check, result
src/lib/engine/                fixed comparison rules, phone-number handling, result wording
src/lib/meta/                  Meta API client and screenshot reading
src/lib/verify/                the list of safe checks, the AI planner and its checks, before-and-after
src/lib/registry/              record format, loading, admission rules, search
src/lib/case/                  first check and follow-up, encrypted check tokens
src/data/reference-registry/   real records, plus the made-up sample resorts
eval/adversarial/              hostile test screenshots (and the HTML they're drawn from)
eval/samples-src/              generator for the sample screenshots
docs/                          record audit, live QA report, changes from the original specs
```

## Built during the hackathon (27 Oct – 4 Nov 2026)

All code in this repository was written during the event, and the commit history shows how it grew. Before coding, the entrant wrote the business, product and technical specs and built a clickable HTML prototype; the app's visual design comes from that prototype. Neither is in this repo. The sample screenshots are drawn by `eval/samples-src/render.mjs`. Deliberate changes from the original specs are recorded in [docs/spec-changes.md](docs/spec-changes.md): a fourth safe check, a fourth sample, a new kind of source for contact details, and made-up sample resorts.

- **Phase 1, Foundation:** app shell and design, a Meta API client that refuses to run when misconfigured, a live smoke test, encrypted check tokens.
- **Phase 2, Records:** the record format and admission rules, 13 reviewed real resorts, a strict Facebook link parser, search, the resort picker and the "on file" panel, labelled made-up samples.
- **Phase 3, Live checks:** the upload form with consent, image shrinking in the browser and image checks on the server, Muse Spark screenshot reading, the comparison rules, findings with their evidence, honest progress and error screens.
- **Phase 4, Next check:** the list of safe checks, two competing explanations, an AI-chosen check that Trace double-checks (with a standard fallback), one follow-up, the before-and-after view.
- **Phase 5, Hardening:** protection against mentioned links and conflicting addresses, hostile test screenshots, rate limiting, security headers, failure tests, accessibility fixes, 3 samples × 5 live runs.
- **Phase 6, Submission:** this README, a fresh-download test, the demo video plan.
- **Phase 7, Depth and polish:** phone numbers and emails from each resort's listed page; the "message the resort" check and Sample D to show it; realistic sample screenshots; a progress screen that walks through the real steps; redesigned screens; a full-size screenshot viewer; consistent text sizes and a colour-contrast pass; 4 samples × 5 live runs (20 out of 20).

## Third-party software and data

Next.js, React, Zod, lucide-react (ISC licence) and the Geist fonts (SIL Open Font License 1.1). The fonts are included in `src/app/fonts/` with their licence, so the app builds without an internet connection. Development tools: Vitest, tsx, ESLint.

Resort names and Facebook links come from the San Juan, Batangas Municipal Tourism Office list and the resorts' own websites. No photos, logos or page content from them are included. Sample and test screenshots are made up and marked as such.

## Limitations

- Trace only knows 13 resorts in one town. Any other resort shows as "not on file", which says nothing either way.
- Screenshots can be edited. Trace says so whenever a match comes from a screenshot, and never treats a match as proof of who is chatting or who owns a payment account.
- Usage limits apply per running server. Each check allows one follow-up, but an older, unexpired check link could be reused until it expires (30 minutes).
- Timings were measured in a single session and aren't a guarantee.

## License

**All rights reserved.** The code is public only so the hackathon can review it. Organizers, sponsors and judges may download and run it to evaluate this entry. Any other use, copying or sharing needs written permission. See [LICENSE](LICENSE).

## Disclaimer

Trace is a hackathon prototype. It isn't an official Meta product or a fraud-detection service. Its results don't guarantee that a page is real or that a booking is safe, and it doesn't certify any payment account.

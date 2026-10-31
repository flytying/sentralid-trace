# Demo video script — 3:00 max

Goal: show the four judging areas equally — **impact**, **Meta AI tooling**, **technical depth**, **live demo** — and make the newly built, agentic part (one safe check → validated re-assessment) unmistakable.

Setup before recording:
- `npm run build && npm start` on a clean browser profile, window ~1280 px wide, zoom 110%.
- Have ready: the Altogrand Beach House page screenshot (real resort on file; not committed to the repo) and the repo open on GitHub.
- Close other tabs; turn off notifications. Record voice separately if easier.
- Do one warm-up run so the first Meta call isn't the recorded one.
- Open the file picker once and cancel it before recording: macOS can take several seconds to open it the first time.

| Time | Screen | Voice-over (≈ 400 words total) |
|---|---|---|
| **0:00–0:20** Problem | Home page hero | "In the Philippines, booking a resort usually means a Facebook page and a Messenger chat — and a deposit to someone's GCash. Pages and logos are easy to copy. SentralID Trace helps you check a booking channel before you pay." |
| **0:20–0:35** What's different | Scroll to "How it works", then About page bullets | "Trace isn't a chatbot opinion. It compares what you send with real resorts whose Facebook pages are independently listed by the San Juan, Batangas tourism office — and it's honest about what a screenshot can never prove." |
| **0:35–1:05** Live Meta extraction | Sample B: evidence form (lookalike link + page + 2 chats) → tick consent → Check → progress "Reading your screenshots with Meta AI (live)" | "Here's a made-up lookalike page and a chat asking for a deposit. Muse Spark 1.3 reads all three screenshots live — about five seconds — into a strict schema. Then fixed rules, not the model, compare them with our records." |
| **1:05–1:30** Evidence-linked findings | Findings: "Some details don't match"; expand page link + phone; show source line and trace code; point at "Whose payment account this is — Can't tell" | "The page link isn't the one on file, and the reservations number doesn't fit the documented one. Every finding shows what you sent, what's on file, the source and its date. And notice: whose GCash this is stays 'can't tell' — always. Trace never says 'safe to pay'." |
| **1:30–2:20** Agentic check + reassessment | Switch to Sample A → findings "Not enough evidence" → next-check card ("Chosen with Meta AI from our list of safe checks") → Let's check: Possibility A/B, safest check, what each answer means → Use the sample's page link → Compare → Updated result: Before *Can't tell* → After *Matches our record*; "What's still open" | "Sample A is harder: the screenshot is cropped, so we can't tell which page this is. Trace frames two explanations — a documented reservations page, or an unconnected one — and Muse Spark picks one safe check from a server-owned allowlist: compare the page's address with the pages the resort's own website lists. I add the link… and only that finding changes, citing the exact record. The chat sender and the payment account stay open, because a matching page doesn't prove them." |
| **2:20–2:40** Fresh, real input | Check a booking → search "Altogrand" → upload the real page screenshot → result: page link matches (read from the address bar); point at the side card's "Phone and email — None on file" and the phone finding "No phone number on file to compare" | "This also works on a screenshot it's never seen — a real resort on file. The page was renamed, so its username doesn't match its name; Trace still matches the exact link. The tourism office lists pages, not phone numbers, so Trace says it has no number to compare — instead of trusting whatever number the page shows." |
| **2:40–3:00** Build + close | GitHub repo README (Built during the hackathon; QA report 15/15) | "Built during the hackathon: Next.js, Meta Muse Spark for extraction and check selection, a deterministic trust engine, 122 tests, adversarial screenshots and live repeat runs. Clone it, add your Meta key, and run it. Verify before you book." |

Cut list if over time: shorten 0:20–0:35 to one sentence; skip expanding the phone finding; skip the About page.

Captions: burn in short labels at each section change ("Live Meta extraction", "Deterministic comparison", "One safe check", "Re-assessment") so the video works muted.

Honesty checks for the recording:
- Say samples are made up whenever a sample is on screen (the UI also labels them).
- Do not imply any real resort confirmed a fictional page.
- Don't speed up the progress screen without saying so; if trimmed, add a caption "(trimmed — live call took ~5 s)".

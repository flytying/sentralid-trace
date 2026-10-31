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
| **0:35–1:05** Live Meta extraction | Sample B: evidence form (lookalike link + page + 2 chats) → tick consent → Check → progress screen: thumbnails scanning, "Meta AI looks for" pills cycling, bar filling with the live timer → response arrives: "Read your screenshots with Meta AI · 4.x s", then *Comparing with our records* and *Preparing what we found* tick off → "Done — here's what we found" | "Here's a made-up lookalike page and a chat asking for a deposit. Muse Spark 1.3 reads all three screenshots live — about five seconds — into a strict schema. Then fixed rules, not the model, compare them with our records." |
| **1:05–1:30** Evidence-linked findings | Findings: "Some details don't match"; expand page link + phone; show source line and trace code; point at "Whose payment account this is — Can't tell" | "The page link isn't the one on file, and the reservations number doesn't fit the documented one. Every finding shows what you sent, what's on file, the source and its date. And notice: whose GCash this is stays 'can't tell' — always. Trace never says 'safe to pay'." |
| **1:30–2:05** Agentic check + reassessment | Switch to Sample A → findings "Not enough evidence" → next-check card ("Chosen with Meta AI from our list of safe checks"; the question is worded live, so it varies run to run) → Let's check: Possibility A/B → Use the sample's page link → Compare → Updated result: Before *Can't tell* → After *Matches our record* | "Sample A: the screenshot is cropped, so we can't tell which page this is. Muse Spark picks one safe check from a server-owned list — compare the page's address with the pages the resort's own website lists. I add the link… and only that finding changes, citing the exact record." |
| **2:05–2:25** Who's in the chat? | Sample D → findings "Nothing we checked conflicts with our records" (page, name and number match; sender and payment *Can't tell*) → next-check card: message the resort from its listed page → pick *It opened a new, empty chat* → point at the guidance card "The account that messaged you isn't the listed page" (the banner above stays "No conflict found" on purpose: what you saw in Messenger is your note, not evidence Trace can check) | "Sample D is the classic trap: the page and number are right, but the chat wants a deposit to a personal GCash today. Trace can't see Messenger — so Muse Spark picks the one check you can do yourself: tap Message on the listed page. A new, empty chat means whoever's asking for money isn't that page." |
| **2:25–2:42** Fresh, real input | Check a booking → search "Altogrand" → upload the real page screenshot → result: page link matches (read from the address bar), both phone numbers *Matches our record*; expand one phone finding to show the source line | "This also works on a screenshot it's never seen — a real resort on file. The page was renamed, so its username doesn't match its old name, but Trace matches the exact link the tourism office lists — and both phone numbers match the ones published on that listed page. A lookalike page with a different number would be flagged." |
| **2:42–3:00** Build + close | GitHub repo README (Built during the hackathon; QA report 20/20) | "Built during the hackathon: Next.js, Meta Muse Spark for extraction and check selection, a deterministic trust engine, 131 tests, adversarial screenshots and live repeat runs. Clone it, add your Meta key, and run it. Verify before you book." |

Cut list if over time: shorten 0:20–0:35 to one sentence; drop the Altogrand segment if D runs long; skip expanding the phone finding; skip the About page.

Captions: burn in short labels at each section change ("Live Meta extraction", "Deterministic comparison", "One safe check", "Re-assessment", "Who's in the chat?") so the video works muted.

Things that vary between runs (so don't read them word for word):
- The next-check question and its "why it matters" are written by Muse Spark each time.
- On Sample B, Muse Spark picks either *Ask the resort through the number on file* or *Message the resort from its listed page* — both are fine for the 1:05–1:30 segment, which only covers the findings.
- Meta's read time (shown on the progress screen and under the findings) is real; expect roughly 3–6 s.

Honesty checks for the recording:
- Say samples are made up whenever a sample is on screen (the UI also labels them).
- Do not imply any real resort confirmed a fictional page.
- Don't speed up the progress screen without saying so; if trimmed, add a caption "(trimmed — live call took ~5 s)". The comparing/preparing ticks after the response are a short replay of steps the server really ran in the same request (≈1.2 s); keep them as they are.

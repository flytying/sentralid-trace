# Submission checklist

Deadline: **4 Nov 2026, 9:00 PM EST = 5 Nov 2026, 10:00 AM Manila** (Cerebral Valley). Internal target: 4 Nov, Manila.

Status as of 31 Oct 2026. ✅ done and verified · ⏳ owner action needed · ➖ optional / not applicable.

## Release gates (TDD §8.3, PRD §10.4)

| # | Gate | Status | Evidence |
|---|---|---|---|
| 1 | ≥ 10 source-admitted real records | ✅ 13 | `npm run registry:gate`; [registry-audit.md](registry-audit.md) |
| 2 | Repo runs live from a clean checkout per README, with a judge's own key | ✅ | Fresh `git clone` from GitHub on 31 Oct: `npm ci`, tests 122/122, typecheck, lint, registry gate, `smoke:meta`, `build`, `start`, and Sample A clicked through to the updated result |
| 3 | A new, unseen screenshot invokes Meta and yields evidence-linked results | ✅ | Real Altogrand page screenshot (not in repo): live extraction, page link matched from address bar ([QA report](qa/repeat-runs-2026-10-31.md)) |
| 4 | One counterfactual question + validated reassessment visibly changes a supported claim | ✅ | Sample A: page finding *Can't tell → Matches our record*, citing `CLM-sample-lc-fb-2`; other findings unchanged |
| 5 | Three demo scenarios × five production repetitions | ✅ 15/15 | [docs/qa/repeat-runs-2026-10-31.md](qa/repeat-runs-2026-10-31.md) |
| 6 | No safety or privacy critical defect | ✅ (no known open) | Trust-invariant tests, adversarial eval, log-hygiene test, no storage of uploads |
| 7 | Public repo with hackathon-built code and licensed/synthetic assets only | ✅ / ⏳ license | Public at github.com/flytying/sentralid-trace; synthetic samples; no resort photos/logos. **Choose a LICENSE** (see below) |
| 8 | 3-minute demo video, accessible without login | ⏳ | Script: [demo-script.md](demo-script.md) |
| 9 | Video clearly identifies newly built functionality | ⏳ | Covered in the script's 2:40 segment and README "Built during the hackathon" |
| 10 | Submission completed on time; receipt saved | ⏳ | — |

## Participant Guide items (PRD Appendix C)

| ID | Requirement | Status |
|---|---|---|
| HG-01 | Public repo, no secrets or unauthorised assets | ✅ `.env.local` never committed (history scanned for the key: 0 hits); `.design-ref/` and build dirs ignored |
| HG-02 | Only event-built work; contributions identified | ✅ README section + timestamped commits |
| HG-03 | No third-party rights violations | ✅ Facts and links only; synthetic screenshots. ⏳ Do not commit the real Altogrand screenshot or any real resort imagery |
| HG-04 | Not a basic RAG / image analyzer | ✅ Demo shows check selection, validation and claim-level reassessment |
| HG-05 | Meaningful Meta model use; only Meta models at runtime | ✅ Muse Spark for extraction and check selection; host/model allowlist; no other AI dependency |
| HG-06 | Submit before cutoff | ⏳ |
| HG-07 | 3-min video + public repo links; hosted product optional | ⏳ video · ➖ hosting |
| HG-08 | Video covers impact, Meta use, depth, demo equally | ⏳ follow the script |
| HG-09 | Solo entrant attribution | ⏳ confirm entrant name on the submission form |
| HG-10 | Meta API credits / billing alerts | ⏳ confirm spend alert is set on the Meta account |

## Owner decisions still open

1. **License.** Without a LICENSE file the code is public but not licensed for reuse; judges can still clone and run it. MIT is the usual choice for hackathon entries.
2. **Hosting (optional).** If you want a hosted URL: deploy to Vercel with `MODEL_API_KEY`, `CASE_SEAL_KEY` set as server env vars, add a Vercel Firewall rate-limit rule on `/api/investigations/*`, set a Meta spend alert, and re-run `npm run qa:repeat` against the deployed URL. Document any access restriction in the README.
3. **Video.** Record per [demo-script.md](demo-script.md); upload unlisted/public (YouTube or similar) and check it plays logged out.
4. **Separate signed participation agreement**, if any — review independently.

## Final pre-submit run (do on 4 Nov)

```bash
git pull && npm ci && npm test && npm run typecheck && npm run lint && npm run registry:gate
npm run smoke:meta
npm run build && npm start   # click through Samples A, B, C and one real screenshot
```

Then open the repo and video links in a logged-out browser, submit on Cerebral Valley, and save the confirmation.

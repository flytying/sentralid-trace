# QA-LIVE repeat runs — 2026-10-31 11:56 UTC

Server: production build (`next build` + `next start`), live Meta `muse-spark-1.3`, extraction `reasoning_effort: minimal`. Synthetic samples only, except where noted.

**Result: 15/15 scenario runs matched the expected behaviour.**

| Scenario | Expected |
|---|---|
| A | not enough evidence → (documented reservations link) → no conflict found; exactly 1 finding changes; payment stays unknown |
| B | possible mismatch → (user report: "they said yes" for the phone check, or "same conversation" for the Messenger check — whichever Meta AI chose) → unchanged; 0 findings change |
| C | not enough evidence; no safe check available (resort not on file) |

## Runs

| Scenario | Run | Pass | First outcome | Next check (status/action/selected by) | After follow-up | Changes | Extraction | Planner | Analyze total | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 1 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 4276 ms | 2930 ms | 7285 ms |  |
| B | 1 | ✓ | potential_channel_conflict | check_available/MESSAGE_FROM_LISTED_PAGE/model | potential_channel_conflict | 0 | 4312 ms | 1913 ms | 6245 ms |  |
| C | 1 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4738 ms | - ms | 4785 ms |  |
| A | 2 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 4140 ms | 2131 ms | 6326 ms |  |
| B | 2 | ✓ | potential_channel_conflict | check_available/MESSAGE_FROM_LISTED_PAGE/model | potential_channel_conflict | 0 | 3389 ms | 3074 ms | 6484 ms |  |
| C | 2 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4654 ms | - ms | 4679 ms |  |
| A | 3 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 4164 ms | 3544 ms | 7725 ms |  |
| B | 3 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 4526 ms | 4121 ms | 8685 ms |  |
| C | 3 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 3544 ms | - ms | 3561 ms |  |
| A | 4 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 3839 ms | 2073 ms | 5936 ms |  |
| B | 4 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 5538 ms | 5363 ms | 10928 ms |  |
| C | 4 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 3600 ms | - ms | 3668 ms |  |
| A | 5 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 3220 ms | 2543 ms | 5793 ms |  |
| B | 5 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 3746 ms | 3663 ms | 7423 ms |  |
| C | 5 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4101 ms | - ms | 4112 ms |  |

## Latency

- Extraction call: median 4140 ms, max 5538 ms (n=15)
- Planner call: median 3074 ms, max 5363 ms (n=10)
- Analyze request end-to-end: median 6245 ms, max 10928 ms (n=15)

## Other checks

- Unseen real page screenshot (not in repo): live inference=true, model 3280ms, outcome no_material_conflict_observed, findings facebook_page_url:match, business_name:match, reservation_phone:match, reservation_phone:match
- Deliberate error (forged case token): HTTP 400, code CASE_INVALID, success-shaped body: no

Single-session measurements on a home connection; not a benchmark or SLA.

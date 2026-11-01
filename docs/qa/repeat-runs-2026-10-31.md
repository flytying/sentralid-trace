# QA-LIVE repeat runs — 2026-10-31 13:16 UTC

Server: production build (`next build` + `next start`), live Meta `muse-spark-1.3`, extraction `reasoning_effort: minimal`. Synthetic samples only, except where noted.

**Result: 20/20 scenario runs matched the expected behaviour.**

| Scenario | Expected |
|---|---|
| A | not enough evidence → (documented reservations link) → no conflict found; exactly 1 finding changes; payment stays unknown |
| B | possible mismatch → (user report: "they said yes" for the phone check, or "same conversation" for the Messenger check — whichever Muse Spark chose) → unchanged; 0 findings change |
| C | not enough evidence; no safe check available (resort not on file) |
| D | no conflict found (page and number match) → Messenger check is the one offered → (user report: "new, empty chat") → unchanged; 0 findings change; payment stays unknown |

## Runs

| Scenario | Run | Pass | First outcome | Next check (status/action/selected by) | After follow-up | Changes | Extraction | Planner | Analyze total | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 1 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 4416 ms | 1780 ms | 6266 ms |  |
| B | 1 | ✓ | potential_channel_conflict | check_available/MESSAGE_FROM_LISTED_PAGE/model | potential_channel_conflict | 0 | 4419 ms | 4821 ms | 9271 ms |  |
| C | 1 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4471 ms | - ms | 4480 ms |  |
| D | 1 | ✓ | no_material_conflict_observed | check_available/MESSAGE_FROM_LISTED_PAGE/model | no_material_conflict_observed | 0 | 4325 ms | 2290 ms | 6652 ms |  |
| A | 2 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 3719 ms | 2522 ms | 6284 ms |  |
| B | 2 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 4690 ms | 4120 ms | 8837 ms |  |
| C | 2 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4560 ms | - ms | 4581 ms |  |
| D | 2 | ✓ | no_material_conflict_observed | check_available/MESSAGE_FROM_LISTED_PAGE/model | no_material_conflict_observed | 0 | 4717 ms | 1579 ms | 6317 ms |  |
| A | 3 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 5075 ms | 3903 ms | 8998 ms |  |
| B | 3 | ✓ | potential_channel_conflict | check_available/MESSAGE_FROM_LISTED_PAGE/model | potential_channel_conflict | 0 | 4957 ms | 3679 ms | 8675 ms |  |
| C | 3 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 3390 ms | - ms | 3396 ms |  |
| D | 3 | ✓ | no_material_conflict_observed | check_available/MESSAGE_FROM_LISTED_PAGE/model | no_material_conflict_observed | 0 | 2921 ms | 1492 ms | 4451 ms |  |
| A | 4 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 4208 ms | 2566 ms | 6821 ms |  |
| B | 4 | ✓ | potential_channel_conflict | check_available/MESSAGE_FROM_LISTED_PAGE/model | potential_channel_conflict | 0 | 3050 ms | 2273 ms | 5411 ms |  |
| C | 4 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4636 ms | - ms | 4648 ms |  |
| D | 4 | ✓ | no_material_conflict_observed | check_available/MESSAGE_FROM_LISTED_PAGE/model | no_material_conflict_observed | 0 | 3456 ms | 3421 ms | 6897 ms |  |
| A | 5 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 3080 ms | 2391 ms | 5487 ms |  |
| B | 5 | ✓ | potential_channel_conflict | check_available/MESSAGE_FROM_LISTED_PAGE/model | potential_channel_conflict | 0 | 4152 ms | 2140 ms | 6326 ms |  |
| C | 5 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 3044 ms | - ms | 3054 ms |  |
| D | 5 | ✓ | no_material_conflict_observed | check_available/MESSAGE_FROM_LISTED_PAGE/model | no_material_conflict_observed | 0 | 2503 ms | 2058 ms | 4576 ms |  |

## Latency

- Extraction call: median 4325 ms, max 5075 ms (n=20)
- Planner call: median 2391 ms, max 4821 ms (n=15)
- Analyze request end-to-end: median 6284 ms, max 9271 ms (n=20)

## Other checks

- Unseen real page screenshot (not in repo): live inference=true, model 2062ms, outcome no_material_conflict_observed, findings facebook_page_url:match, business_name:match, reservation_phone:match, reservation_phone:match
- Deliberate error (forged case token): HTTP 400, code CASE_INVALID, success-shaped body: no

Single-session measurements on a home connection; not a benchmark or SLA.

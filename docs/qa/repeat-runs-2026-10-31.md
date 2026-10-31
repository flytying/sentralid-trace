# QA-LIVE repeat runs — 2026-10-31 12:07 UTC

Server: production build (`next build` + `next start`), live Meta `muse-spark-1.3`, extraction `reasoning_effort: minimal`. Synthetic samples only, except where noted.

**Result: 20/20 scenario runs matched the expected behaviour.**

| Scenario | Expected |
|---|---|
| A | not enough evidence → (documented reservations link) → no conflict found; exactly 1 finding changes; payment stays unknown |
| B | possible mismatch → (user report: "they said yes" for the phone check, or "same conversation" for the Messenger check — whichever Meta AI chose) → unchanged; 0 findings change |
| C | not enough evidence; no safe check available (resort not on file) |
| D | no conflict found (page and number match) → Messenger check is the one offered → (user report: "new, empty chat") → unchanged; 0 findings change; payment stays unknown |

## Runs

| Scenario | Run | Pass | First outcome | Next check (status/action/selected by) | After follow-up | Changes | Extraction | Planner | Analyze total | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 1 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 5654 ms | 3245 ms | 8950 ms |  |
| B | 1 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 5859 ms | 3158 ms | 9053 ms |  |
| C | 1 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 3153 ms | - ms | 3164 ms |  |
| D | 1 | ✓ | no_material_conflict_observed | check_available/MESSAGE_FROM_LISTED_PAGE/model | no_material_conflict_observed | 0 | 4814 ms | 2194 ms | 7028 ms |  |
| A | 2 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 3986 ms | 2586 ms | 6587 ms |  |
| B | 2 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 5252 ms | 3730 ms | 9011 ms |  |
| C | 2 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 3042 ms | - ms | 3054 ms |  |
| D | 2 | ✓ | no_material_conflict_observed | check_available/MESSAGE_FROM_LISTED_PAGE/model | no_material_conflict_observed | 0 | 4867 ms | 1850 ms | 6741 ms |  |
| A | 3 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 3613 ms | 2459 ms | 6093 ms |  |
| B | 3 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 3535 ms | 3797 ms | 7361 ms |  |
| C | 3 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 3769 ms | - ms | 3773 ms |  |
| D | 3 | ✓ | no_material_conflict_observed | check_available/MESSAGE_FROM_LISTED_PAGE/model | no_material_conflict_observed | 0 | 2948 ms | 1744 ms | 4718 ms |  |
| A | 4 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 3212 ms | 2306 ms | 5528 ms |  |
| B | 4 | ✓ | potential_channel_conflict | check_available/MESSAGE_FROM_LISTED_PAGE/model | potential_channel_conflict | 0 | 4373 ms | 4369 ms | 8771 ms |  |
| C | 4 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4788 ms | - ms | 4809 ms |  |
| D | 4 | ✓ | no_material_conflict_observed | check_available/MESSAGE_FROM_LISTED_PAGE/model | no_material_conflict_observed | 0 | 3297 ms | 1811 ms | 5126 ms |  |
| A | 5 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 3744 ms | 2304 ms | 6070 ms |  |
| B | 5 | ✓ | potential_channel_conflict | check_available/MESSAGE_FROM_LISTED_PAGE/model | potential_channel_conflict | 0 | 4575 ms | 2123 ms | 6736 ms |  |
| C | 5 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 3643 ms | - ms | 3649 ms |  |
| D | 5 | ✓ | no_material_conflict_observed | check_available/MESSAGE_FROM_LISTED_PAGE/model | no_material_conflict_observed | 0 | 3130 ms | 1601 ms | 4739 ms |  |

## Latency

- Extraction call: median 3769 ms, max 5859 ms (n=20)
- Planner call: median 2306 ms, max 4369 ms (n=15)
- Analyze request end-to-end: median 6093 ms, max 9053 ms (n=20)

## Other checks

- Unseen real page screenshot (not in repo): live inference=true, model 1591ms, outcome no_material_conflict_observed, findings facebook_page_url:match, business_name:match, reservation_phone:match, reservation_phone:match
- Deliberate error (forged case token): HTTP 400, code CASE_INVALID, success-shaped body: no

Single-session measurements on a home connection; not a benchmark or SLA.

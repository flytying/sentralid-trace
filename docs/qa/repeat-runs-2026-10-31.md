# QA-LIVE repeat runs — 2026-10-31 06:08 UTC

Server: production build (`next build` + `next start`), live Meta `muse-spark-1.3`, extraction `reasoning_effort: minimal`. Synthetic samples only, except where noted.

**Result: 15/15 scenario runs matched the expected behaviour.**

| Scenario | Expected |
|---|---|
| A | not enough evidence → (documented reservations link) → no conflict found; exactly 1 finding changes; payment stays unknown |
| B | possible mismatch → (phone report "they said yes") → unchanged; 0 findings change |
| C | not enough evidence; no safe check available (resort not on file) |

## Runs

| Scenario | Run | Pass | First outcome | Next check (status/action/selected by) | After follow-up | Changes | Extraction | Planner | Analyze total | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 1 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 5141 ms | 3130 ms | 8315 ms |  |
| B | 1 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 4797 ms | 2524 ms | 7383 ms |  |
| C | 1 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4811 ms | - ms | 4819 ms |  |
| A | 2 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 5158 ms | 3140 ms | 8317 ms |  |
| B | 2 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 4312 ms | 2919 ms | 7252 ms |  |
| C | 2 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4051 ms | - ms | 4076 ms |  |
| A | 3 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 3719 ms | 2922 ms | 6663 ms |  |
| B | 3 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 3698 ms | 2875 ms | 6596 ms |  |
| C | 3 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4606 ms | - ms | 4614 ms |  |
| A | 4 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 3654 ms | 2080 ms | 5765 ms |  |
| B | 4 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 4169 ms | 1853 ms | 6036 ms |  |
| C | 4 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4528 ms | - ms | 4550 ms |  |
| A | 5 | ✓ | insufficient_evidence | check_available/COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE/model | no_material_conflict_observed | 1 | 5798 ms | 3260 ms | 9090 ms |  |
| B | 5 | ✓ | potential_channel_conflict | check_available/CHECK_REGISTERED_CONTACT_POLICY/model | potential_channel_conflict | 0 | 4392 ms | 2654 ms | 7080 ms |  |
| C | 5 | ✓ | insufficient_evidence | no_safe_check/-/rules | - | - | 4220 ms | - ms | 4233 ms |  |

## Latency

- Extraction call: median 4392 ms, max 5798 ms (n=15)
- Planner call: median 2919 ms, max 3260 ms (n=10)
- Analyze request end-to-end: median 6596 ms, max 9090 ms (n=15)

## Other checks

- Unseen real page screenshot (not in repo): live inference=true, model 6250ms, outcome no_material_conflict_observed, findings facebook_page_url:match, business_name:match, reservation_phone:unknown, reservation_phone:unknown
- Deliberate error (forged case token): HTTP 400, code CASE_INVALID, success-shaped body: no

Single-session measurements on a home connection; not a benchmark or SLA.

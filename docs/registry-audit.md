# Registry source audit — v2026-10-31-draft1

Release gate REGISTRY-01 requires **10 real records** that pass manual review. Twelve candidates are drafted (two spare). None count until a human reviewer completes the checks below and records the decision.

## Sources

| ID | Kind | Owner | URL | Observed |
|---|---|---|---|---|
| SRC-LGU-SJB-FBDIR | Local tourism directory (LGU) | Municipal Tourism Office, San Juan, Batangas | https://tourism.sanjuanbatangas.gov.ph/verified-facebook-pages | 2026-10-31 05:06 UTC |
| SRC-WEB-ACUATICO | Business's own site | Acuatico Beach Resort | https://www.acuaticoresort.com.ph/ | 2026-10-31 |
| SRC-WEB-ACUAVERDE | Business's own site | Acuaverde Beach Resort | https://acuaverderesort.com.ph/ | 2026-10-31 |
| SRC-WEB-SABANGAN | Business's own site | Sabangan Beach Resort | https://www.sabangan.com/ | 2026-10-31 |
| SRC-WEB-CALALAIYA | Business's own site | Cala Laiya | https://calalaiya.com/ | 2026-10-31 |
| SRC-WEB-HENRY | Business's own site | The Henry Hotels | https://thehenryhotel.com/ | 2026-10-31 |
| SRC-WEB-BURACAI | Business's own site | Buracai de Laiya | https://buracaidelaiya.com/ | 2026-10-31 |

How the LGU links were recorded: the directory is a Google Sites page whose links are wrapped in `google.com/url?q=…` redirects. Each Facebook URL below is the unwrapped link target from the page HTML, not the visible text. The directory says listed establishments are registered with the LGU and gives no further verification method and no last-updated date (only "Copyright © 2021").

Each website link was taken from the site's own HTML (`facebook.com/...` href). An owner-controlled site corroborates the page link only; it is never enough to admit a record by itself.

## Candidates

| # | Business ID | Name (LGU listing) | Facebook page on file | Second source |
|---|---|---|---|---|
| 1 | acuatico-beach-resort | Acuatico Beach Resort and Hotel, Inc. | facebook.com/AcuaticoBeachResort | Website links the same page |
| 2 | acuaverde-beach-resort | Acuaverde Beach Resort and Hotel, Inc. | facebook.com/AcuaverdeBeachResort | Website links the same page |
| 3 | sabangan-beach-resort | Sabangan Beach Resort, Inc. | facebook.com/mysabangan | Website links the same page |
| 4 | cala-laiya | Cala Laiya | facebook.com/calalaiya | Website links the same page |
| 5 | the-henry-resort-laiya | The Henry Resort Taramindu Laiya | facebook.com/TheHenryHotels | Website links the same page (hotel-group page, also covers other Henry properties) |
| 6 | buracai-de-laiya | Buracai de Laiya Hotel & Resort | facebook.com/BuracaiDeLaiyaHotelAndResort | Website links a **different** page: facebook.com/BuracaiDelaiya — recorded as a second documented page |
| 7 | la-luz-beach-resort | La Luz Beach Resort & Spa | facebook.com/laluzbeachresortandspa | — (LGU only) |
| 8 | punta-aguila-resort | Punta Aguila Resort and Hotel | facebook.com/PuntaAguila | — (LGU only) |
| 9 | one-laiya-beach-resort | One Laiya Beach Resort | facebook.com/onelaiya | — (LGU only) |
| 10 | llamar-beach-resort | Llamar Beach Resort, Inc. | facebook.com/LlamarBeachResortOfficial | — (LGU only) |
| 11 | virgin-beach-resort | Virgin Beach Resort | web.facebook.com/virginbeachresortlaiya | — (LGU only) |
| 12 | sigayan-bay-beach-resort | Sigayan Bay Beach Resort | facebook.com/sigayanbay | — (LGU only) |

### Excluded during drafting

- **Laiya White Cove Beach Resort** — the LGU lists facebook.com/LaiyaWhiteCoveOfficial, but `laiyawhitecove.com` now serves an unrelated gambling page (likely an expired, re-registered domain). Not used as a source. This is a useful example of why domain control alone never establishes identity.
- Entries linked only as `profile.php?id=…` were skipped in favour of named pages that a judge can recognise.

## Reviewer checklist (per business)

1. Open the LGU directory, find the business name, and confirm the link next to it goes to the Facebook URL above.
2. Open the Facebook URL in a logged-out browser. Confirm it loads, is a Page (not a personal profile or group), and its name plausibly matches the business. Note if it redirects to a different username.
3. If there is a second source, open it and confirm it links to the same page (or, for Buracai, the second page).
4. Record the decision:
   - **Admit:** set `registryStatus` to `admitted`, set `reviewedAt` to the review date, and replace `reviewerNote` with what you checked (e.g. "LGU link and FB page checked logged-out 2026-11-01; page name matches.").
   - **Reject:** leave as `draft` and note why, or remove the record.
5. Update `manifest.json` (`reviewer`, `admittedCount`, `version`) and run `npm run registry:gate`.

## Decisions

| # | Business ID | LGU link OK | FB page loads & matches | 2nd source OK | Decision | Reviewer / date |
|---|---|---|---|---|---|---|
| 1 | acuatico-beach-resort | | | | | |
| 2 | acuaverde-beach-resort | | | | | |
| 3 | sabangan-beach-resort | | | | | |
| 4 | cala-laiya | | | | | |
| 5 | the-henry-resort-laiya | | | | | |
| 6 | buracai-de-laiya | | | | | |
| 7 | la-luz-beach-resort | | | n/a | | |
| 8 | punta-aguila-resort | | | n/a | | |
| 9 | one-laiya-beach-resort | | | n/a | | |
| 10 | llamar-beach-resort | | | n/a | | |
| 11 | virgin-beach-resort | | | n/a | | |
| 12 | sigayan-bay-beach-resort | | | n/a | | |

## Scope of what a record supports

A record supports only "this business is associated with this Facebook page" according to the named source on the date observed. It does not establish who sends a Messenger message, any booking agent, or any GCash/Maya/bank account.

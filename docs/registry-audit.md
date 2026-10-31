# Registry source audit — v2026-10-31-v1

Release gate REGISTRY-01 requires **10 real records** that pass manual review. **13 records are admitted** (`npm run registry:gate` passes). The project owner selected them on 2026-10-31 from a 12-record draft plus further LGU entries; each link was then re-verified against the LGU page HTML.

## Sources

| ID | Kind | Owner | URL | Observed |
|---|---|---|---|---|
| SRC-LGU-SJB-FBDIR | Local tourism directory (LGU) | Municipal Tourism Office, San Juan, Batangas | https://tourism.sanjuanbatangas.gov.ph/verified-facebook-pages | 2026-10-31 05:06 UTC |
| SRC-WEB-ACUATICO | Business's own site | Acuatico Beach Resort | https://www.acuaticoresort.com.ph/ | 2026-10-31 |
| SRC-WEB-ACUAVERDE | Business's own site | Acuaverde Beach Resort | https://acuaverderesort.com.ph/ | 2026-10-31 |
| SRC-WEB-CALALAIYA | Business's own site | Cala Laiya | https://calalaiya.com/ | 2026-10-31 |
| SRC-WEB-BURACAI | Business's own site | Buracai de Laiya | https://buracaidelaiya.com/ | 2026-10-31 |

How the LGU links were recorded: the directory is a Google Sites page whose links are wrapped in `google.com/url?q=…` redirects. Each Facebook URL below is the unwrapped link target from the page HTML, not the visible text. The directory says listed establishments are registered with the LGU and gives no further verification method and no last-updated date (only "Copyright © 2021").

Each website link was taken from the site's own HTML (`facebook.com/...` href). An owner-controlled site corroborates the page link only; it is never enough to admit a record by itself.

## Admitted records

| # | Business ID | Name (LGU listing) | Facebook page on file | Second source |
|---|---|---|---|---|
| 1 | acuatico-beach-resort | Acuatico Beach Resort and Hotel, Inc. | facebook.com/AcuaticoBeachResort | Website links the same page |
| 2 | acuaverde-beach-resort | Acuaverde Beach Resort and Hotel, Inc. | facebook.com/AcuaverdeBeachResort | Website links the same page |
| 3 | altogrand-beach-house | Altogrand Beach House | facebook.com/EnteBeachResort | — Username is from a former name; reviewer confirmed the page is titled “Altogrand Beach House” and its bio says “Formerly known as Ente's Beach Resort” |
| 4 | arias-crib-laiya | Aria's Crib - Laiya Beach House | facebook.com/AriasCrib | — |
| 5 | avc-kubo-transient-house | AVC Kubo Transient House | facebook.com/AVCSanJuanBatangas | — |
| 6 | beach-hive-seafront | Beach Hive Seafront | facebook.com/beachhiveseafront | — |
| 7 | beatajara-house-rental | Beatajara House Rental | facebook.com/bjbplaiya | — |
| 8 | bebes-resort | Bebe's Resort | facebook.com/bebesresortt | — |
| 9 | biga-cottages | BigA Cottages | facebook.com/Bigacottage | — |
| 10 | blue-coral-beach-resort | Blue Coral Beach Resort | facebook.com/bluecoralbeachresortlaiya | — |
| 11 | buracai-de-laiya | Buracai de Laiya Hotel & Resort | facebook.com/BuracaiDeLaiyaHotelAndResort | Website links a **different** page, facebook.com/BuracaiDelaiya, recorded as a second documented page (owner-controlled source only) |
| 12 | burgis-mangrove-beach-resort | Burgis Mangrove Beach Resort | facebook.com/burgismangrovebeachresort | — |
| 13 | cala-laiya | Cala Laiya | facebook.com/calalaiya | Website links the same page |

### Not selected

Drafted but not chosen in review, so removed from the registry: Sabangan Beach Resort, The Henry Resort Taramindu Laiya, La Luz Beach Resort & Spa, Punta Aguila Resort and Hotel, One Laiya Beach Resort, Llamar Beach Resort, Virgin Beach Resort, Sigayan Bay Beach Resort.

### Excluded during drafting

- **Laiya White Cove Beach Resort** — `laiyawhitecove.com` now serves an unrelated gambling page (likely an expired, re-registered domain). Not used as a source. A useful example of why domain control alone never establishes identity.

## Re-review checklist

Records become "due for a recheck" in the app 60 days after `reviewedAt`. To re-review a record:

1. Open the LGU directory, find the business name, and confirm the link next to it still goes to the Facebook URL above.
2. Open the Facebook URL in a logged-out browser. Confirm it loads, is a Page, and its name plausibly matches the business.
3. If there is a second source, confirm it still links the same page.
4. Update `reviewedAt` and `reviewerNote`; if anything no longer holds, set `registryStatus` to `needs_review`.
5. Update `manifest.json` and run `npm run registry:gate`.

## Scope of what a record supports

A record supports only "this business is associated with this Facebook page" according to the named source on the date observed. It does not establish who sends a Messenger message, any booking agent, or any GCash/Maya/bank account.

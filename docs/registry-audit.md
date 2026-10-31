# Registry source audit — v2026-10-31-v2

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

## Contacts from the listed pages (v2)

Added 2026-10-31. For each resort, the project owner opened the **exact Facebook page the LGU directory lists** and recorded the phone numbers and email shown in its Intro / contact info (source IDs `SRC-FB-<RESORT>`, kind `listed_facebook_page`).

- **Why it counts:** the number is the resort's own published contact, read from a page an independent source (the LGU) ties to the resort. It is owner-controlled, like the resorts' websites.
- **Guard rails (enforced by `admissionIssues` and unit tests):** a listed-page source can back phone and email claims only, never a Facebook-page claim (a page can't vouch for itself), and only when its URL is that business's independently listed page. It never admits a record by itself.
- **Every number on the page, not just one:** a number the real page shows but the registry lacks would be flagged as "doesn't match" on the real page. Altogrand's bio shows a second number (0961 197 8288), recorded from the owner's screenshot of the listed page.
- **Left out on purpose:** emails that look like an individual's personal address (Altogrand, Beatajara, BigA). They aren't compared by the engine, and a public repo shouldn't republish them. Messenger display names weren't recorded either: a chat sender's name can be copied, so Trace never matches on it.

| Resort | Phone(s) on file | Email on file |
|---|---|---|
| Acuatico | +63 968 871 4516 | reservations@acuaticoresort.com.ph |
| Acuaverde | +63 998 843 1347 | reservations@acuaverderesort.com.ph |
| Altogrand | +63 950 317 7669, +63 961 197 8288 | — (personal address, left out) |
| Aria's Crib | — | ariascriblaiya@gmail.com |
| AVC Kubo | +63 919 271 3551 | — |
| Beach Hive Seafront | +63 965 235 8873 | beachhive.seafront@gmail.com |
| Beatajara | +63 919 895 5748 | — (personal address, left out) |
| Bebe's Resort | — | bebehomeresort@gmail.com |
| BigA Cottages | +63 961 360 2190 | — (personal address, left out) |
| Blue Coral | +63 915 712 3100 | bluecoralbeachresort@gmail.com |
| Buracai de Laiya | +63 999 600 2518 | buracaidelaiya08@gmail.com |
| Burgis Mangrove | +63 947 100 3639 | — |
| Cala Laiya | +63 917 883 9900 | reservations@calalaiya.ph |

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
   - On the listed page, confirm every phone number shown is on file (add any new one; mark removed ones `needs_review`).
4. Update `reviewedAt` and `reviewerNote`; if anything no longer holds, set `registryStatus` to `needs_review`.
5. Update `manifest.json` and run `npm run registry:gate`.

## Scope of what a record supports

A record supports only "this business is associated with this Facebook page" (and, since v2, "this page publishes these contacts") according to the named source on the date observed. It does not establish who sends a Messenger message, any booking agent, or any GCash/Maya/bank account.

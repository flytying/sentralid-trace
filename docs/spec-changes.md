# Spec amendments

The specs (BRD v1.3, PRD v1.4, TDD v1.2) were written before the build. These are the deliberate changes made during it. Each one amends the section named, and everything else in the specs stands as written.

The specs have since been reissued with these changes folded in, as **BRD v1.4, PRD v1.5 and TDD v1.3** (31 Oct 2026). Those are the entrant's working documents and are not in this repository. This file is the record of what changed and why.

| # | Amends | Change |
|---|---|---|
| 1 | TDD §5.3 allowed catalog; VERIFY-01 | Fourth safe check: `MESSAGE_FROM_LISTED_PAGE` |
| 2 | TDD §3 `SourceKind`; registry admission | New source kind `listed_facebook_page`, for contacts only |
| 3 | BRD §9.1; PRD §10.1, §5 home page, release gates | Four sample scenarios, not three |
| 4 | BRD §9.1 | Samples use made-up resorts, not real resort records |

## 1. Fourth safe check: `MESSAGE_FROM_LISTED_PAGE`

**Amends** TDD §5.3. The allowed catalog is now:

`COMPARE_LGU_REFERENCE_PAGE`, `COMPARE_REGISTRY_OFFICIAL_WEBSITE_PAGE`, `CHECK_REGISTERED_CONTACT_POLICY`, `MESSAGE_FROM_LISTED_PAGE`.

VERIFY-01 is unchanged: any action outside this list is rejected, even if the model asks for it (`validatePlannerOutput`, `src/lib/verify/plan.ts`).

**Why.** A screenshot can never show who is behind a Messenger chat, so "who is sending these messages" is always *can't tell*. The traveller can settle that question themselves: open the page the tourism office lists for the resort and tap **Message**. If the same conversation opens, they're talking to the listed page. If a new, empty chat opens, the account that messaged them is a different one. This check is the reason Sample D exists.

**Safety rules** (enforced in code):

- **Who it points the user at.** It sends the user to the *independently listed* page, taken from a non-owner source. It never points at the questioned account, and never asks that account for proof. This is the same rule as `CHECK_REGISTERED_CONTACT_POLICY`.
- **When it's offered.**
  - Only when a chat screenshot was sent and the resort has an LGU-listed page.
  - Only when it can separate the two explanations: either the chat sender is the open question (page and number already match), or the chat comes with a page or number that doesn't match.
  - Never while the page itself can't be seen (Sample A's case).
- **Report-only.** The answer is one of *same conversation*, *new empty chat* or *can't tell*. It is kept as the user's note and never changes a finding or the outcome. This keeps the "no self-attestation" rule: Trace can't see Messenger, so it never claims to know who is behind a chat.
- **Answers are checked per action.** The server accepts only this action's three answers, so a phone-call answer sent to it is rejected.
- **No other check offered for this target.** The phone check is not offered when the chat sender is the target.
- **Labelled fallback.** If the model's choice fails validation, the rule-based fallback has its own fixed wording for this action, labelled as rule-based.

**Tests.** In `src/lib/verify/verify.test.ts`:
- when it's offered for a real resort, and for Samples B and D
- never offered for Sample A
- a report never changes a finding

In `src/app/api/investigations/routes.test.ts`:
- end-to-end: the planner picks it, it is sealed as the only allowed action, a wrong-action answer is rejected, and the right answer changes nothing.

**Live QA:** Meta AI chose it for Sample D in 5/5 production runs ([QA report](qa/repeat-runs-2026-10-31.md)).

## 2. Source kind `listed_facebook_page`

**Amends** TDD §3:

```ts
type SourceKind =
  | "local_tourism_directory"
  | "independent_business_site"
  | "listed_facebook_page"
  | "owner_attestation"
  | "other_documented_source";
```

**Why.** The tourism office lists each resort's Facebook page, not its phone numbers. A phone number or email the resort publishes *on that exact listed page* is still the resort's own claim. It counts only because an independent source ties that page to the resort. That makes it owner-controlled, like the resort's own website.

**Rules** (enforced in `admissionIssues`, `src/lib/registry/eligibility.ts`):

- **Contacts only.** It can back phone and email claims, never a Facebook-page claim, because a page can't vouch for itself.
- **Exact listed page only.** Its URL must be the business's *independently* listed page, not a lookalike.
- **Never admits.** It never admits a record by itself, like every owner-controlled source.

**Data and tests.** 22 contact claims across the 13 real resorts. Emails that look like an individual's personal address are left out. Covered by tests in `src/lib/registry/registry.test.ts`. Details are in [registry-audit.md](registry-audit.md).

## 3. Four sample scenarios

**Amends** BRD §9.1 ("three judge-accessible sample investigations") and PRD §10.1, the home-page line in PRD §5 ("three clearly synthetic sample scenarios") and the release gates ("three repeatable judge scenarios", "three scenarios, five repeats each").

**Added:** (D) **the right page, but who's in the chat?**
- The page link and reservations number match the record.
- The chat demands a deposit to a personal GCash.

It shows claim-scoped trust directly: the page matching does not settle the sender or the payment account. The Messenger check (amendment 1) is the next step.

**Release gate now:** four scenarios × five production repeats. Latest run: **20/20** ([QA report](qa/repeat-runs-2026-10-31.md)).

## 4. Samples use made-up resorts

**Amends** BRD §9.1, which says "Samples use real, source-backed resort reference records but any impersonator and transaction data must be fictional".

**Changed to:** all four samples use made-up resorts in a separate sample registry (`src/data/reference-registry/fixtures/samples.json`), with `.example` sources and watermarked screenshots. Real records live only in the real registry.

**Why.** Three of the four samples show something going wrong:
- a lookalike page
- a deposit to a personal GCash
- an unverifiable chat

Pairing those with a real business name would publicly suggest a real resort is linked to a scam. It would also put its branding in a public repository. This was decided at kickoff, and the screenshots carry no platform logos.

**Real-record coverage is unchanged.** The unseen-screenshot release gate runs a real resort's page (Altogrand Beach House) against its real record. It matched link, name and both numbers in every QA run. That screenshot is not committed.

## Not a spec change: the licence

PRD [SRC-1] reads "Official Meta hackathon page — Open source — …". In that table, "Open source" describes the *type of citation*, meaning publicly available material. Every source row uses it, including the Muse Spark docs and the tourism directory. It does not name a licence requirement or track. The rules require a public repository that judges can run from its README, and the organizers confirmed on 31 Oct 2026 that no specific or OSI-approved licence is required. The repo's all-rights-reserved [LICENSE](../LICENSE) grants organizers, sponsors and judges the right to view, clone, install and run it for evaluation. See [submission-checklist.md](submission-checklist.md).

# KarmaClub LOS — Prototype (v2)

End-to-end Loan Origination System prototype for KarmaClub: from a Funding Lead drafted by the
Investments Team, through IC voting, Legal documentation, and Finance disbursement, to an
Onboarded project.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS
**Status:** Prototype with mocked data — no backend; everything persists in your browser's
localStorage.

---

## The end-to-end flow

Every project moves through five stages. The home page has one tab per stage, and each project
card shows a stepper with its current position.

```
┌──────────────┐   ┌───────────┐   ┌───────┐   ┌─────────┐   ┌───────────┐
│ Funding Lead │ → │ IC Review │ → │ Legal │ → │ Finance │ → │ Onboarded │
└──────────────┘   └───────────┘   └───────┘   └─────────┘   └───────────┘
 Investments        Investment      Legal        Finance
 Team drafts &      Committee       Team runs    Team splits
 submits the        votes           the doc      KF/KCF &
 submission         (amount-        checklist    confirms
                    tiered          & hands      disbursement
                    quorum)         off
```

- **Funding Lead** — the Investments Team fills the analyst submission form (drafts live here
  with lead statuses 2 / 3 / 3.9) and submits to IC.
- **IC Review** — IC members vote as themselves. Quorum is amount-tiered: ≤ IDR 4B needs the
  Principal only; 4–6B needs 2 votes incl. Principal; > 6B needs all 3. A Principal Reject
  stops the flow (the project stays on the IC tab marked **Rejected**).
- **Legal** — documentation checklist (term sheet signed, agreement drafted, agreement signed)
  plus notes; completing it hands the project to Finance.
- **Finance** — KF/KCF funding split (must sum to the approved amount), bank-details review,
  disbursement date; confirming disbursement marks the project **Onboarded**.

## Access control: by team, field-level, stage-contingent

Access is governed by **Role Type (team)** — never by person. Any member of a team can see and
do everything the team can: no hierarchies or per-person scoping within a team (the 2-person
teams must cover for each other, and Investments shares context across sectors).

Controls are **field-level** (can you see a field, edit it, push its button) **and contingent
on stage** — e.g. an analyst can edit the credit memo while the lead is in preparation, but not
once it's submitted, and certainly not while Finance is splitting KF/KCF.

The whole policy lives in one matrix in [`lib/access.ts`](lib/access.ts):

| Field group | Edited by | Editable during | Visible to |
| --- | --- | --- | --- |
| Submission form (details, terms, memos) | Investments Team | Funding Lead | everyone |
| SLIK files / exec summaries / UBO exposure | Investments Team | Funding Lead | Investments, Credit Ops, IC — **hidden from Legal & Finance** |
| IC votes, approval notes, conditions subsequent | Investment Committee | IC Review | everyone |
| Legal documentation checklist | Legal Team | Legal | everyone |
| KF/KCF split, bank review, disbursement | Finance Team | Finance | everyone |

Buttons follow their field group: *New Submission* / *Submit to IC* are Investments-only,
*Submit Vote* is IC-only during review, *Complete Legal* is Legal-only in the Legal stage,
*Confirm Disbursement* is Finance-only in the Finance stage.

> Credit Ops currently has view access to everything (incl. SLIK) but owns no stage gate —
> what they edit is still to be defined.

## Concentration limits

Limits prevent one investee's failure from failing Karma or posting a negative fund return.
The **Concentration Limits** admin page (header link, `/admin/limits`) holds the base values —
editable by **IC or System Admin** only, viewable by everyone:

| Entity | Basis | Limits |
| --- | --- | --- |
| KarmaFood (on-balance sheet) | Net Assets (Equity), reset quarterly | 3% / project · 5% / entrepreneur · 10% stretch · 15% UBO (stretch tiers need full IC sign-off) |
| KarmaCap Fund 1 (off-balance sheet) | Aggregate Capital Commitments, locked at fund close | 10% / project · 25% / entrepreneur |

The config page previews the resulting Rupiah limits **live while typing** (mirroring the policy
doc's Implementation section), and every save is an append-only version — the change log (who,
old → new, when) and "what was the limit at the time of a past approval" both fall out of that
history. Checks always read the live config, never a cached figure.

Enforcement happens at three points:

1. **Analyst form** — a live Concentration Limit Check panel compares cumulative exposure
   (existing + proposed) per Project / Entrepreneur / UBO. Within normal → proceeds; over normal
   but within stretch → proceeds flagged for **full IC sign-off (all 3 votes, overriding the
   amount tiers)**; over stretch → **hard block** on submit.
2. **IC card** — the check is stamped at submission time and shown with the config it ran
   against; the voting rule banner switches to the stretch rule when applicable.
3. **Finance stage** — fund assignment happens at the KF/KCF split, so each slot is checked
   against its own entity's limits; a slot over its limit blocks *Confirm Disbursement* until
   the split is rebalanced.

### Teams & demo profiles

There is no login — switch profiles with the picker in the header (grouped by team):

| Team | Members |
| --- | --- |
| Investments Team | Priska Ponggawa, Nila Layla Melinda |
| Investment Committee | Ben Elberger (Principal), Aldi Haryopratomo, Junaidi |
| Credit Ops Team | Dewi Anggraini, Rizal Fauzan |
| Legal Team | Larasati Wibowo, Andre Sitompul |
| Finance Team | Maya Kusuma, Bagus Santoso |
| System Admin | Sari Utami |

### Try the flow yourself

1. As **Ben Elberger** (IC Principal), open a pending project ≤ IDR 4B, vote **Approve**, and
   submit — the card gains a Legal section and moves to the Legal tab.
2. Switch to **Larasati Wibowo** (Legal), tick the three checklist items, *Complete Legal*.
3. Switch to **Maya Kusuma** (Finance), enter a KF/KCF split that sums to the approved amount,
   tick bank review, pick a date, *Confirm Disbursement* — the project lands on the Onboarded
   tab.
4. Switch back to any other team along the way to see the same fields render read-only (or, for
   SLIK as Legal/Finance, not at all).

## System structure

```
app/
  page.tsx                      Home — search/filters + one tab per lifecycle stage
  project/[id]/page.tsx         Project card: stepper + all sections + stage sections
  submission/new/page.tsx       New draft (Investments-only)
  submission/[id]/page.tsx      Edit draft (read-only outside Investments)
  admin/limits/page.tsx         Concentration limits config (IC/System Admin edit; all view)
  kp/[brand]/page.tsx           Karmapreneur history page

components/
  ui/
    ProfileSwitcher.tsx         Header profile picker, grouped by team
    StageStepper.tsx            Funding Lead → … → Onboarded stepper
    SectionCard.tsx, Tag.tsx, DataRow.tsx, Warning.tsx
  submission/
    SubmissionForm.tsx          Analyst form; fieldset-disabled when the viewer can't edit
  sections/                     IC card sections (header, PIC, terms, recap, …)
    ApprovalSection.tsx         IC voting — profile-driven, persisted, quorum-aware
    LegalSection.tsx            Legal stage checklist + handoff button
    FinanceSection.tsx          KF/KCF split + disbursement + onboard button

lib/
  access.ts                     ★ Team types, stages, and the field-group access matrix
  profileStore.tsx              App users (per team) + active-profile context
  submissionsStore.ts           Draft/submitted submissions (localStorage) → ICProject factory
  workflowStore.ts              ★ Post-submission state: votes, legal, finance → derived stage
  limitsStore.ts                Concentration limit config (append-only versions = audit log)
  exposure.ts                   Cumulative exposure calc + the concentration check itself
  icVoting.ts                   Amount-tiered quorum rules (+ stretch-tier override)
  warnings.ts                   Card warnings engine (plafond breach, SLIK missing, DPD, …)
  assetClass.ts, bRecapRules.ts, pastProjectsRecap.ts, …

data/
  masterData.ts                 Closed enums from the LOS master data (Coda export)
  types.ts                      ICProject and section types
  mock.ts                       Mock IC projects (pending reviews)
  mockOnboarded.ts              Pre-existing onboarded rows
```

★ = the two files that define this prototype's behavior model.

### How state fits together

- **Drafts** (`kc-los-submissions`) — the analyst form, saved by `submissionsStore`; submitting
  converts a draft to an `ICProject` for the review card.
- **Workflow** (`kc-los-workflows`) — everything that happens *after* submission, keyed by
  project id in `workflowStore`: recorded votes, approval notes, the Legal checklist, the
  Finance split. The current stage is **derived** from this state (votes ⇒ outcome ⇒
  legal/finance completion), which is why mock projects can move through the flow too.
- **Active profile** (`kc-los-active-profile`) — who you are; drives every access check.

Because it's all localStorage, clearing site data resets the demo.

## Run locally

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel login     # follow the browser prompt
vercel --prod    # deploy; grab the URL
```

Or import the GitHub repo at [vercel.com](https://vercel.com) → **Add New Project** — Next.js
is auto-detected, defaults are fine.

---

## Important prototype notes

- No backend: votes, checklists, and splits persist only in the current browser.
- In production, submitting a vote / completing a stage would trigger Coda automation
  (status change + Slack notifications).
- All data is mocked and does not reflect real projects.
- Some mock projects carry a pre-recorded IC vote, so they start mid-flow (e.g. already with
  Legal) to demo the pipeline out of the box.

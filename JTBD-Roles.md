# Jobs To Be Done — by Role

One row per job. Derived from the access matrix in `lib/access.ts`, the workflow
state in `lib/workflowStore.ts`, and the Board/pipeline UI in `app/board/page.tsx`
and `app/page.tsx`. Access is by **Team** (Role Type), never by individual — any
member of a team can do everything listed for that team.

Two systems chain together:
1. **Board** (`/board`) — pre-submission CRM. Stages: `Early Lead → Funding Lead → Due Diligence`.
2. **LOS pipeline** (`/`) — post-submission. Stages: `Due Diligence (funding_lead) → IC Review → Finance Split → Legal Agreement → Finance Disbursed → Onboarded`.

The Board's "Due Diligence" stage 3 and the LOS pipeline's "Due Diligence"
(`funding_lead`) stage are the same handoff point — clicking "Submission Form"
on a Board card opens `/submission/new` and enters the LOS pipeline.

Each role's homepage "My Queue" (`app/page.tsx`) surfaces exactly the row(s)
below that are theirs to act on right now — nothing else.

| Role (Who) | When (Trigger / Stage) | Which Info (needed to decide) | Action (what they do) | Outcome (state change) | Screen |
|---|---|---|---|---|---|
| Investments Team | A new lead/contact surfaces (no formal stage yet) | KP/Brand name, project name, contact name + WhatsApp, asset class | Create a lead card; log meeting notes | Card created at Board stage 1 (Early Lead) | `/board` |
| Investments Team | Lead is warm, docs being gathered (Board stage 2, Funding Lead) | 12-item checklist (KTP, NPWP, NIB, financials, bank statements, SLIK, etc.), meeting notes | Check off collected documents as they arrive | Checklist progress updates; card advances to Due Diligence once ready | `/board` |
| Investments Team | Docs complete, ready to formalize (Board stage 3, Due Diligence) | Same card's checklist + notes | Click "Submission Form" | Opens `/submission/new`, enters LOS pipeline at `funding_lead` | `/board` → `/submission/new` |
| Investments Team | Project sits in `funding_lead` (LOS "Due Diligence") | Project/KP details, deal terms, financials, KP contacts, past-project recap, credit memo | Fill in and submit the full submission form | Project moves to `ic_review` | Home → "My Queue: Continue Due Diligence" → `/submission/[id]` |
| Investment Committee | Project enters `ic_review`, this member hasn't voted yet | Requested amount, credit memo, deal terms, conditions precedent/subsequent, current vote tally & quorum, SLIK/UBO exposure | Cast Approve / Reject / Abstain | Vote recorded; once quorum reached, project moves to `finance_slotting` (or is rejected) | Home → "My Queue: Awaiting Your Vote" → `/project/[id]` (ApprovalSection) |
| Finance Team | Project enters `finance_slotting` (IC approved) | Approved amount, requested amount, existing plafond/limit headroom | Enter KF amount + KCF amount, confirm split | `finance.slottedAt` set; project moves to `legal` | Home → "My Queue: Awaiting KF/KCF Split" → `/project/[id]` (FinanceSlottingSection) |
| Legal Team | Project enters `legal` (split confirmed) | Term sheet / agreement drafting / agreement signing status, legal notes | Check off Term Sheet Signed → Agreement Drafted → Agreement Signed | `legal.completedAt` set; project moves to `finance_disbursement` | Home → "My Queue: Awaiting Legal Agreement" → `/project/[id]` (LegalSection) |
| Finance Team | Project enters `finance_disbursement` (legal complete) | Bank details, disbursement date, legal completion status | Review bank details, set disbursement date, confirm disbursed | `finance.completedAt` set; project moves to `onboarded` | Home → "My Queue: Ready to Disburse" → `/project/[id]` (FinanceDisbursementSection) |
| System Admin | Always (global config, not stage-bound) | Net Assets / Capital Commitments base values, org-wide concentration limits | Edit concentration-limit configuration | Limit config updated for all teams | `/admin/limits` |
| System Admin | Any time | Every field group across every stage (superset view) | Oversight / covers any team if needed | No personal queue — reads the full pipeline directly | Home → "Full Pipeline" (Table/Card) |

## Field-group access (from `lib/access.ts`)

| Field group | Viewable by | Editable by | Editable only at stage |
|---|---|---|---|
| `submission` | all | Investments Team | `funding_lead` |
| `slik` | Investments Team, Investment Committee, System Admin | Investments Team | `funding_lead` |
| `icDecision` | all | Investment Committee | `ic_review` |
| `financeSlotting` | all | Finance Team | `finance_slotting` |
| `legalChecklist` | all | Legal Team | `legal` |
| `financeDisbursement` | all | Finance Team | `finance_disbursement` |
| `limitConfig` | all | Investment Committee, System Admin | any (global) |

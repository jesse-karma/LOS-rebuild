/**
 * Team-based access control (July 2026 feedback).
 *
 * Access is governed by Role Type (team), never by person: any member of a
 * team can see and do everything the team can — small teams (Credit Ops,
 * Legal, Finance are 2 people each) must be able to cover for each other,
 * and Investments shares context across sectors. No hierarchies within a
 * team for now.
 *
 * Controls are field-level (see / edit / push a button) AND contingent on
 * stage: e.g. Investments can edit the credit memo while the lead is in
 * preparation, but not once it's submitted to IC — and certainly not while
 * Finance is splitting the funding between KF/KCF.
 */

export type Team =
  | "Investments Team"
  | "Investment Committee"
  | "Credit Ops Team"
  | "Legal Team"
  | "Finance Team";

export const TEAMS: Team[] = [
  "Investments Team",
  "Investment Committee",
  "Credit Ops Team",
  "Legal Team",
  "Finance Team",
];

// ─── Stages (end-to-end lifecycle) ────────────────────────────────────────────

export type Stage = "funding_lead" | "ic_review" | "legal" | "finance" | "onboarded";

export const STAGE_ORDER: Stage[] = ["funding_lead", "ic_review", "legal", "finance", "onboarded"];

export const STAGE_LABELS: Record<Stage, string> = {
  funding_lead: "Funding Lead",
  ic_review: "IC Review",
  legal: "Legal",
  finance: "Finance",
  onboarded: "Onboarded",
};

// ─── Field groups ─────────────────────────────────────────────────────────────
// Fields are gated in groups (a field belongs to exactly one group); the
// matrix below is the single place a group's see/edit rules live.

export type FieldGroup =
  | "submission" // the analyst form: project details, terms, memos, notes for IC
  | "slik" // SLIK files, exec summaries, UBO exposure — credit-sensitive personal data
  | "icDecision" // IC votes, approval notes, conditions subsequent
  | "legalChecklist" // term sheet & loan agreement execution checklist
  | "financeOps"; // KF/KCF funding split, bank details review, disbursement

export type Access = "edit" | "view" | "hidden";

interface GroupRule {
  /** Teams that can see the group's fields ("all" = every team). */
  view: Team[] | "all";
  /** The one team that can fill/edit the group's fields and push its buttons… */
  editBy: Team;
  /** …and only while the project sits in one of these stages. */
  editAt: Stage[];
}

const MATRIX: Record<FieldGroup, GroupRule> = {
  submission: { view: "all", editBy: "Investments Team", editAt: ["funding_lead"] },
  slik: {
    // Credit-sensitive personal data: not shown to Legal/Finance.
    view: ["Investments Team", "Investment Committee", "Credit Ops Team"],
    editBy: "Investments Team",
    editAt: ["funding_lead"],
  },
  icDecision: { view: "all", editBy: "Investment Committee", editAt: ["ic_review"] },
  legalChecklist: { view: "all", editBy: "Legal Team", editAt: ["legal"] },
  financeOps: { view: "all", editBy: "Finance Team", editAt: ["finance"] },
};

export function fieldAccess(team: Team, group: FieldGroup, stage: Stage): Access {
  const rule = MATRIX[group];
  if (rule.view !== "all" && !rule.view.includes(team)) return "hidden";
  return rule.editBy === team && rule.editAt.includes(stage) ? "edit" : "view";
}

export function canEdit(team: Team, group: FieldGroup, stage: Stage): boolean {
  return fieldAccess(team, group, stage) === "edit";
}

export function canSee(team: Team, group: FieldGroup, stage: Stage): boolean {
  return fieldAccess(team, group, stage) !== "hidden";
}

/** Creating a new submission is an Investments Team action. */
export function canCreateSubmission(team: Team): boolean {
  return team === "Investments Team";
}

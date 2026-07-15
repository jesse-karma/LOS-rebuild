import { ConditionRow, ICProject, ICVote, ICVoteRecord, NoteEntry } from "@/data/types";
import { Stage } from "@/lib/access";
import { requiredVotes } from "@/lib/icVoting";

/**
 * Post-submission workflow state — carries a project from IC Review through
 * Finance Slotting (KF/KCF split), Legal (documentation), and Finance
 * Disbursement to Onboarded. Stored per project in localStorage (prototype
 * persistence), layered over the baked-in mock/submission data so mock
 * projects can move through the flow too.
 */

export interface RecordedVote {
  vote: Exclude<ICVote, null>;
  votedAt: string; // ISO
}

export interface LegalState {
  termSheetSigned: boolean;
  agreementDrafted: boolean;
  agreementSigned: boolean;
  notes: string;
  completedAt: string | null; // ISO — set when Legal hands off to Finance
  completedBy: string;
}

export interface FinanceState {
  kfAmount: number; // IDR
  kcfAmount: number; // IDR
  slottedAt: string | null; // ISO — set when Finance confirms the KF/KCF split
  slottedBy: string;
  bankDetailsReviewed: boolean;
  disbursementDate: string; // ISO date (yyyy-mm-dd)
  notes: string;
  completedAt: string | null; // ISO — set when Finance confirms disbursement
  completedBy: string;
}

export interface ProjectWorkflow {
  /** Votes recorded in the app, by IC memberId — override the baked-in mock votes. */
  votes: Record<string, RecordedVote>;
  approvalNotes: string | null; // null = untouched, fall back to the project's value
  conditionsPrecedent: ConditionRow[] | null; // null = untouched, fall back to the project's value
  conditionsPrecedentLogic: string | null; // null = untouched, fall back to the project's value
  conditionsSubsequent: ConditionRow[] | null; // null = untouched, fall back to the project's value
  conditionsSubsequentLogic: string | null; // null = untouched, fall back to the project's value
  /** Notes Feed — null = untouched, fall back to the project's baked-in notes. */
  notes: NoteEntry[] | null;
  legal: LegalState;
  finance: FinanceState;
}

export function emptyWorkflow(): ProjectWorkflow {
  return {
    votes: {},
    approvalNotes: null,
    conditionsPrecedent: null,
    conditionsPrecedentLogic: null,
    conditionsSubsequent: null,
    conditionsSubsequentLogic: null,
    notes: null,
    legal: {
      termSheetSigned: false,
      agreementDrafted: false,
      agreementSigned: false,
      notes: "",
      completedAt: null,
      completedBy: "",
    },
    finance: {
      kfAmount: 0,
      kcfAmount: 0,
      slottedAt: null,
      slottedBy: "",
      bankDetailsReviewed: false,
      disbursementDate: "",
      notes: "",
      completedAt: null,
      completedBy: "",
    },
  };
}

// ─── localStorage CRUD ────────────────────────────────────────────────────────

const STORAGE_KEY = "kc-los-workflows";

function loadAll(): Record<string, ProjectWorkflow> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ProjectWorkflow>) : {};
  } catch {
    return {};
  }
}

export function getWorkflow(projectId: string): ProjectWorkflow {
  const stored = loadAll()[projectId];
  // Merge over defaults so workflows saved before new fields existed stay complete.
  return stored
    ? {
        ...emptyWorkflow(),
        ...stored,
        legal: { ...emptyWorkflow().legal, ...stored.legal },
        finance: { ...emptyWorkflow().finance, ...stored.finance },
      }
    : emptyWorkflow();
}

export function saveWorkflow(projectId: string, wf: ProjectWorkflow) {
  const all = loadAll();
  all[projectId] = wf;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

const DEMO_SEED_FLAG = "kc-los-workflows-seeded";

/**
 * Demo-only: advances a couple of mock projects further down the pipeline so
 * Finance Split / Legal Agreement / Finance Disbursed have example rows on
 * first load, instead of only ever being reachable by voting/editing in-app.
 * Runs once (flagged) and never overwrites a workflow the user already has.
 */
export function seedDefaultWorkflows() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(DEMO_SEED_FLAG)) return;
  const all = loadAll();

  // Shushu — IC-approved, KF/KCF slotted, awaiting Legal.
  if (!all["proj-shushu"]) {
    const wf = emptyWorkflow();
    wf.votes["ic-1"] = { vote: "Approve", votedAt: "2026-04-10T09:00:00Z" };
    wf.finance.kfAmount = 150_000_000;
    wf.finance.kcfAmount = 100_000_000;
    wf.finance.slottedAt = "2026-04-12T10:00:00Z";
    wf.finance.slottedBy = "Maya Kusuma";
    all["proj-shushu"] = wf;
  }

  // Cipta Usaha Media — through Legal, awaiting Finance Disbursement.
  if (!all["proj-cum"]) {
    const wf = emptyWorkflow();
    wf.votes["ic-1"] = { vote: "Approve", votedAt: "2026-04-05T09:00:00Z" };
    wf.finance.kfAmount = 150_000_000;
    wf.finance.kcfAmount = 99_000_000;
    wf.finance.slottedAt = "2026-04-06T10:00:00Z";
    wf.finance.slottedBy = "Bagus Santoso";
    wf.legal.termSheetSigned = true;
    wf.legal.agreementDrafted = true;
    wf.legal.agreementSigned = true;
    wf.legal.completedAt = "2026-04-14T10:00:00Z";
    wf.legal.completedBy = "Larasati Wibowo";
    all["proj-cum"] = wf;
  }

  // Cahaya Energi Asia — Aztech #1 — through Legal, awaiting Finance Disbursement.
  // icVoteBasisAmount (15B) puts this in the 3-vote tier, so both remaining IC
  // members need to approve on top of the baked-in Principal approval.
  if (!all["proj-cea-aztech"]) {
    const wf = emptyWorkflow();
    wf.votes["ic-2"] = { vote: "Approve", votedAt: "2026-06-05T09:00:00Z" };
    wf.votes["ic-3"] = { vote: "Approve", votedAt: "2026-06-05T09:30:00Z" };
    wf.finance.kfAmount = 4_000_000_000;
    wf.finance.kcfAmount = 2_000_000_000;
    wf.finance.slottedAt = "2026-06-08T10:00:00Z";
    wf.finance.slottedBy = "Bagus Santoso";
    wf.legal.termSheetSigned = true;
    wf.legal.agreementDrafted = true;
    wf.legal.agreementSigned = true;
    wf.legal.completedAt = "2026-06-15T10:00:00Z";
    wf.legal.completedBy = "Andre Sitompul";
    all["proj-cea-aztech"] = wf;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.localStorage.setItem(DEMO_SEED_FLAG, "1");
}

// ─── Derived IC outcome & stage ───────────────────────────────────────────────

/** Baked-in votes overlaid with votes recorded in the app. */
export function effectiveVotes(project: ICProject, wf: ProjectWorkflow): ICVoteRecord[] {
  return project.icVotes.map((v) => {
    const recorded = wf.votes[v.memberId];
    return recorded ? { ...v, vote: recorded.vote, votedAt: recorded.votedAt } : v;
  });
}

export type ICOutcome = "approved" | "rejected" | null;

/**
 * IC decision from the effective votes: a Principal Reject kills the request;
 * approval requires the amount-tiered vote count (lib/icVoting) including no
 * outstanding rejects.
 */
export function icOutcome(project: ICProject, wf: ProjectWorkflow): ICOutcome {
  const votes = effectiveVotes(project, wf);
  if (votes.some((v) => v.isPrincipal && v.vote === "Reject")) return "rejected";
  const approvals = votes.filter((v) => v.vote === "Approve");
  if (approvals.length >= requiredVotes(project) && !votes.some((v) => v.vote === "Reject")) {
    return "approved";
  }
  return null;
}

/** When the deciding approval landed (latest approve vote). */
export function icDecidedAt(project: ICProject, wf: ProjectWorkflow): string | null {
  const times = effectiveVotes(project, wf)
    .filter((v) => v.vote === "Approve" && v.votedAt)
    .map((v) => v.votedAt as string)
    .sort();
  return times[times.length - 1] ?? null;
}

export interface StageInfo {
  stage: Stage;
  /** IC rejected — the project stays on the IC Review list, marked Rejected. */
  rejected: boolean;
}

export function stageInfo(project: ICProject, wf: ProjectWorkflow): StageInfo {
  const outcome = icOutcome(project, wf);
  if (outcome === "rejected") return { stage: "ic_review", rejected: true };
  if (outcome === null) return { stage: "ic_review", rejected: false };
  // completedAt implies slotting already happened, for workflows saved under the old single-stage Finance model.
  const slotted = !!(wf.finance.slottedAt || wf.finance.completedAt);
  if (!slotted) return { stage: "finance_slotting", rejected: false };
  if (!wf.legal.completedAt) return { stage: "legal", rejected: false };
  if (!wf.finance.completedAt) return { stage: "finance_disbursement", rejected: false };
  return { stage: "onboarded", rejected: false };
}

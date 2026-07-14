import { ICProject, ICVote, ICVoteRecord } from "@/data/types";
import { Stage } from "@/lib/access";
import { requiredVotes } from "@/lib/icVoting";

/**
 * Post-submission workflow state — carries a project from IC Review through
 * Legal (documentation) and Finance (KF/KCF split + disbursement) to
 * Onboarded. Stored per project in localStorage (prototype persistence),
 * layered over the baked-in mock/submission data so mock projects can move
 * through the flow too.
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
  conditionsSubsequent: string[] | null; // null = untouched, fall back to the project's value
  legal: LegalState;
  finance: FinanceState;
}

export function emptyWorkflow(): ProjectWorkflow {
  return {
    votes: {},
    approvalNotes: null,
    conditionsSubsequent: null,
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
  if (!wf.legal.completedAt) return { stage: "legal", rejected: false };
  if (!wf.finance.completedAt) return { stage: "finance", rejected: false };
  return { stage: "onboarded", rejected: false };
}

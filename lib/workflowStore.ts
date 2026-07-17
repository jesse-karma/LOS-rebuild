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

/** An IC member's rejecting vote, archived when the project is resubmitted so the prior decision stays visible. */
export interface RejectionRecord {
  memberId: string;
  votedAt: string;
}

export interface ProjectWorkflow {
  /** Votes recorded in the app, by IC memberId — override the baked-in mock votes. */
  votes: Record<string, RecordedVote>;
  /** Rejections archived on resubmit — the live `votes` gets cleared for a fresh round, this doesn't. */
  rejectionHistory: RejectionRecord[];
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
    rejectionHistory: [],
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

/**
 * Sends a rejected project back to IC for a fresh vote: archives the rejecting
 * vote(s) into rejectionHistory (so the prior decision stays visible even once
 * votes are cleared) and clears every recorded vote — a revised submission gets
 * a full fresh round, not a partial carryover of votes cast before the reject.
 */
export function resubmitProject(projectId: string): void {
  const wf = getWorkflow(projectId);
  const rejections: RejectionRecord[] = Object.entries(wf.votes)
    .filter(([, v]) => v.vote === "Reject")
    .map(([memberId, v]) => ({ memberId, votedAt: v.votedAt }));
  wf.rejectionHistory = [...wf.rejectionHistory, ...rejections];
  wf.votes = {};
  saveWorkflow(projectId, wf);
}

/**
 * One-time migration: an earlier version of this prototype's seed data marked Maju,
 * Tekstil Makmur Sentosa, and Distribusi Pangan Sejahtera as IC-rejected. That's since
 * been reverted (only Ayam Geprek Juara stays rejected — the other three are meant to
 * be genuinely pending IC Review examples), but a browser that already loaded the app
 * under the old seed has that stale vote cached in localStorage forever, since seeding
 * never overwrites an existing entry. Match by the exact seeded timestamp (not just
 * "is it a Reject vote") so a real analyst/IC action is never touched.
 */
const STALE_REJECT_SEEDS: Record<string, string> = {
  "proj-assetd-plafond": "2026-06-20T09:00:00Z",
  "proj-tekstil-makmur": "2026-06-22T09:00:00Z",
  "proj-distribusi-pangan": "2026-06-23T09:00:00Z",
};

function migrateStaleRejectSeeds(all: Record<string, ProjectWorkflow>): void {
  for (const [id, staleVotedAt] of Object.entries(STALE_REJECT_SEEDS)) {
    const vote = all[id]?.votes["ic-1"];
    if (vote?.vote === "Reject" && vote.votedAt === staleVotedAt) {
      delete all[id].votes["ic-1"];
    }
  }
}

/** Same migration, for Shushu's stale seeded Approve — see seedDefaultWorkflows(). */
const STALE_APPROVE_SEEDS: Record<string, string> = {
  "proj-shushu": "2026-04-10T09:00:00Z",
};

function migrateStaleApproveSeeds(all: Record<string, ProjectWorkflow>): void {
  for (const [id, staleVotedAt] of Object.entries(STALE_APPROVE_SEEDS)) {
    const vote = all[id]?.votes["ic-1"];
    if (vote?.vote === "Approve" && vote.votedAt === staleVotedAt) {
      delete all[id].votes["ic-1"];
    }
  }
}

/** Ayam Geprek Juara's project notes and lease condition — see migrateAyamGeprekExtras(). */
const AYAM_GEPREK_NOTES: NoteEntry[] = [
  {
    author: "Sharfina Nindita",
    date: "2026-06-20",
    noteType: "Project Note",
    content: "Submission pertama Ayam Geprek Juara. Semua dokumen lengkap. Menunggu review IC — belum ada vote masuk.",
  },
  {
    author: "Sharfina Nindita",
    date: "2026-06-05",
    noteType: "KP Note",
    attendee: "Fajar Nugroho",
    content:
      "Site visit ke outlet Bekasi bersama Fajar. Dapur rapi, SOP food cost dijalankan konsisten. Fajar sangat antusias soal rencana ekspansi Depok.",
  },
  {
    author: "Sharfina Nindita",
    date: "2026-05-20",
    noteType: "KP Note",
    attendee: "Fajar Nugroho",
    content: "Follow-up call — Fajar update lokasi Depok sudah deal sewa 3 tahun, tinggal proses renovasi.",
  },
  {
    author: "Sharfina Nindita",
    date: "2026-05-02",
    noteType: "KP Note",
    attendee: "Fajar Nugroho",
    content: "First meeting dengan Fajar untuk eksplorasi kebutuhan modal ekspansi. Background QSR solid, sangat data-driven soal food cost.",
  },
  {
    author: "Sharfina Nindita",
    date: "2026-04-15",
    noteType: "KP Note",
    attendee: "Fajar Nugroho",
    content: "Warm intro dari referral existing KP. Fajar cerita perjalanan dari area supervisor jadi founder brand sendiri.",
  },
];

const AYAM_GEPREK_CONDITIONS_SUBSEQUENT: ConditionRow[] = [
  { letter: "A", name: "", condition: "Execute lease agreement for Depok outlet before disbursement", approver: "" },
];

/**
 * Ayam Geprek Juara moved from a hand-authored data/mock.ts object to a real, editable
 * StoredSubmission (so it can be resubmitted like any analyst submission) — which means
 * its project notes and lease-execution condition no longer live on the baked-in project
 * object; submissionToICProject() always starts both empty for a real submission. A
 * browser that already seeded this project's workflow under the old mock-backed version
 * won't have them, since seeding never overwrites an existing entry — backfill them here.
 */
function migrateAyamGeprekExtras(all: Record<string, ProjectWorkflow>): void {
  const wf = all["proj-ayam-geprek"];
  if (!wf || (wf.notes && wf.notes.length > 0)) return;
  wf.notes = AYAM_GEPREK_NOTES;
  wf.conditionsSubsequent = AYAM_GEPREK_CONDITIONS_SUBSEQUENT;
  wf.conditionsSubsequentLogic = "";
}

/**
 * Demo-only: advances a couple of mock projects further down the pipeline so
 * Finance Split / Legal Agreement / Finance Disbursed have example rows on
 * first load, instead of only ever being reachable by voting/editing in-app.
 * Each project is only seeded once (the `!all["proj-id"]` guard below) and
 * never overwrites a workflow the user already has — safe to re-run on every
 * load, so new demo projects added later still get backfilled in a browser
 * that was already seeded under an older version of this function.
 */
export function seedDefaultWorkflows() {
  if (typeof window === "undefined") return;
  const all = loadAll();
  migrateStaleRejectSeeds(all);
  migrateStaleApproveSeeds(all);
  migrateAyamGeprekExtras(all);

  // Shushu (Asset A) intentionally left at its raw mock (unvoted) state — IC Review
  // needs a genuinely pending example of every asset class, and A had none.

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
    wf.finance.bankDetailsReviewed = true;
    wf.finance.disbursementDate = "2026-04-18";
    wf.finance.completedAt = "2026-04-18T10:00:00Z";
    wf.finance.completedBy = "Bagus Santoso";
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

  // Konveksi Berkah Jaya — IC-approved, KF/KCF slotted, awaiting Legal.
  if (!all["proj-konveksi-berkah"]) {
    const wf = emptyWorkflow();
    wf.votes["ic-1"] = { vote: "Approve", votedAt: "2026-05-22T09:00:00Z" };
    wf.finance.kfAmount = 200_000_000;
    wf.finance.kcfAmount = 120_000_000;
    wf.finance.slottedAt = "2026-05-24T10:00:00Z";
    wf.finance.slottedBy = "Maya Kusuma";
    all["proj-konveksi-berkah"] = wf;
  }

  // Agro Makmur Distribusi — IC-approved, KF/KCF slotted, awaiting Legal.
  if (!all["proj-agro-makmur"]) {
    const wf = emptyWorkflow();
    wf.votes["ic-1"] = { vote: "Approve", votedAt: "2026-05-24T09:00:00Z" };
    wf.finance.kfAmount = 160_000_000;
    wf.finance.kcfAmount = 100_000_000;
    wf.finance.slottedAt = "2026-05-26T10:00:00Z";
    wf.finance.slottedBy = "Bagus Santoso";
    all["proj-agro-makmur"] = wf;
  }

  // Klinik Sehat Keluarga — IC-approved, KF/KCF slotted, awaiting Legal.
  if (!all["proj-klinik-sehat"]) {
    const wf = emptyWorkflow();
    wf.votes["ic-1"] = { vote: "Approve", votedAt: "2026-05-17T09:00:00Z" };
    wf.finance.kfAmount = 550_000_000;
    wf.finance.kcfAmount = 350_000_000;
    wf.finance.slottedAt = "2026-05-19T10:00:00Z";
    wf.finance.slottedBy = "Maya Kusuma";
    all["proj-klinik-sehat"] = wf;
  }

  // Bakmi Naga Emas — through Legal, awaiting Finance Disbursement.
  if (!all["proj-bakmi-naga"]) {
    const wf = emptyWorkflow();
    wf.votes["ic-1"] = { vote: "Approve", votedAt: "2026-04-14T09:00:00Z" };
    wf.finance.kfAmount = 1_100_000_000;
    wf.finance.kcfAmount = 700_000_000;
    wf.finance.slottedAt = "2026-04-17T10:00:00Z";
    wf.finance.slottedBy = "Bagus Santoso";
    wf.legal.termSheetSigned = true;
    wf.legal.agreementDrafted = true;
    wf.legal.agreementSigned = true;
    wf.legal.completedAt = "2026-04-20T10:00:00Z";
    wf.legal.completedBy = "Larasati Wibowo";
    wf.finance.bankDetailsReviewed = true;
    wf.finance.disbursementDate = "2026-04-24";
    wf.finance.completedAt = "2026-04-24T10:00:00Z";
    wf.finance.completedBy = "Maya Kusuma";
    all["proj-bakmi-naga"] = wf;
  }

  // Percetakan Media Cipta — through Legal, awaiting Finance Disbursement.
  if (!all["proj-percetakan-media"]) {
    const wf = emptyWorkflow();
    wf.votes["ic-1"] = { vote: "Approve", votedAt: "2026-04-16T09:00:00Z" };
    wf.finance.kfAmount = 210_000_000;
    wf.finance.kcfAmount = 130_000_000;
    wf.finance.slottedAt = "2026-04-18T10:00:00Z";
    wf.finance.slottedBy = "Maya Kusuma";
    wf.legal.termSheetSigned = true;
    wf.legal.agreementDrafted = true;
    wf.legal.agreementSigned = true;
    wf.legal.completedAt = "2026-04-22T10:00:00Z";
    wf.legal.completedBy = "Andre Sitompul";
    wf.finance.bankDetailsReviewed = true;
    wf.finance.disbursementDate = "2026-04-26";
    wf.finance.completedAt = "2026-04-26T10:00:00Z";
    wf.finance.completedBy = "Bagus Santoso";
    all["proj-percetakan-media"] = wf;
  }

  // Toko Bangunan Sentosa — through Legal, awaiting Finance Disbursement.
  if (!all["proj-toko-bangunan"]) {
    const wf = emptyWorkflow();
    wf.votes["ic-1"] = { vote: "Approve", votedAt: "2026-04-19T09:00:00Z" };
    wf.finance.kfAmount = 1_000_000_000;
    wf.finance.kcfAmount = 600_000_000;
    wf.finance.slottedAt = "2026-04-22T10:00:00Z";
    wf.finance.slottedBy = "Bagus Santoso";
    wf.legal.termSheetSigned = true;
    wf.legal.agreementDrafted = true;
    wf.legal.agreementSigned = true;
    wf.legal.completedAt = "2026-04-25T10:00:00Z";
    wf.legal.completedBy = "Larasati Wibowo";
    wf.finance.bankDetailsReviewed = true;
    wf.finance.disbursementDate = "2026-04-29";
    wf.finance.completedAt = "2026-04-29T10:00:00Z";
    wf.finance.completedBy = "Maya Kusuma";
    all["proj-toko-bangunan"] = wf;
  }

  // Ayam Geprek Juara — IC Principal declined. The one rejected demo example —
  // Maju/Tekstil Makmur/Distribusi Pangan intentionally left at their raw mock
  // (unvoted) state instead, so IC Review has genuinely pending examples too.
  // A real StoredSubmission (lib/submissionsStore.ts) now backs this project,
  // so it can be edited and resubmitted like any analyst submission — the notes
  // and lease condition are seeded here since submissionToICProject() always
  // starts both empty for a real submission.
  if (!all["proj-ayam-geprek"]) {
    const wf = emptyWorkflow();
    wf.votes["ic-1"] = { vote: "Reject", votedAt: "2026-06-21T09:00:00Z" };
    wf.notes = AYAM_GEPREK_NOTES;
    wf.conditionsSubsequent = AYAM_GEPREK_CONDITIONS_SUBSEQUENT;
    wf.conditionsSubsequentLogic = "";
    all["proj-ayam-geprek"] = wf;
  }

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
  /** IC rejected — the project moves back to the analyst's Due Diligence queue, marked Rejected. */
  rejected: boolean;
}

export function stageInfo(project: ICProject, wf: ProjectWorkflow): StageInfo {
  const outcome = icOutcome(project, wf);
  if (outcome === "rejected") return { stage: "funding_lead", rejected: true };
  if (outcome === null) return { stage: "ic_review", rejected: false };
  // completedAt implies slotting already happened, for workflows saved under the old single-stage Finance model.
  const slotted = !!(wf.finance.slottedAt || wf.finance.completedAt);
  if (!slotted) return { stage: "finance_slotting", rejected: false };
  if (!wf.legal.completedAt) return { stage: "legal", rejected: false };
  if (!wf.finance.completedAt) return { stage: "finance_disbursement", rejected: false };
  return { stage: "onboarded", rejected: false };
}

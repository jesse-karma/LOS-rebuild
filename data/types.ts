// ─── Core shared types ───────────────────────────────────────────────────────

export type ApprovalType =
  | "Project"
  | "Plafond"
  | "Project+Plafond"
  | "PO/Invoice+Plafond"
  | "PO/Invoice";

export type ReturnType =
  | "Revenue Share (Time-Capped)"
  | "Revenue Share (Return-Capped)"
  | "Fixed Return"
  | "Daily Interest";

export type ProjectStatus =
  | "Proposed"
  | "IC Review"
  | "Pending IC submission"
  | "Active"
  | "Completed"
  | "Rescheduled"
  | "Rejected";

export type ICVote = "Approve" | "Reject" | "Abstain" | null;

// ─── Sub-entities ─────────────────────────────────────────────────────────────

export interface PICInfo {
  submitter: string;
  primaryAnalyst: string;
  secondaryAnalyst: string | null;
}

export interface PlafondInfo {
  // Proposed (only if approval type includes Plafond)
  proposed: {
    totalLimit: number;
    poSubLimit: number;
    wcSubLimit: number;
    /** B_MOD: optional next plafond / covenant review date shown on Proposed row. */
    maxReviewDate?: string | null;
  } | null;
  // Current
  current: {
    totalLimit: number;
    poSubLimit: number;
    wcSubLimit: number;
    effectiveDate: string; // ISO date
    expiryDate: string; // ISO date
    limitStatus: "Active" | "Expired" | "None";
    maxReviewDate?: string | null;
  } | null;
  // Outstanding & remaining (from Brand / Reporting Layer)
  outstandingTotal: number;
  /** WC bucket outstanding when split from total (B_MOD plafond table). Defaults to 0 in UI if omitted. */
  outstandingWC?: number;
  remainingTotal: number;
  remainingPO: number;
  remainingWC: number;
  // Superseded (new app feature)
  superseded: Array<{
    totalLimit: number;
    poSubLimit: number;
    wcSubLimit: number;
    effectiveDate: string;
    expiryDate: string;
  }>;
}

export interface FinancialReview {
  submissionDate: string; // ISO date
  financialReportsReviewed: string;
  periodEndingDate: string; // ISO date
  limitRecommendation: "Keep" | "Increase" | "Decrease";
  /**
   * Brand **total** limit (IDR) in effect when this review was written — the “current” side of the recommendation.
   * Null when no formal total limit applied at review time (e.g. first project with no plafond yet).
   */
  limitCurrentIdr: number | null;
  /**
   * For **Increase** / **Decrease**: recommended new total limit (IDR). Omit or null for **Keep**.
   */
  limitRecommendedIdr?: number | null;
  reviewNotes: string; // markdown / plain text proxy for canvas
}

export interface KPContact {
  id: string;
  name: string;
  role: string;
  notesOnPerson: string;
  referredProjects: string[];
  associatedKPs: string[];
  isKeyPerson: boolean;
  slikFileUrl: string | null;
  slikExecSummary: string | null;
  uboExposure: number; // IDR
}

export interface OverdueEvent {
  dueDate: string; // ISO date
  daysOverdue: number;
  status: "Paid" | "Unpaid";
}

/** Economics slice stored on past recap rows for Asset A/D cross-project comparison. */
/** Snapshot of daily-interest + late-fee economics for one recap row (B_MOD). */
export interface DailyInterestRecapSnapshot {
  interestRate30DayPct: number;
  serviceFee30DayPct: number;
  tenorDays: number;
  minInterestPeriodDays: number;
  serviceFeeDailyBasis: string;
  lateFeeBasis: string;
  gracePeriodDays: number;
  dailyPctInvestors: number;
  dailyPctASN: number;
}

export interface RevShareTermsSnapshot {
  capType: "Return Cap" | "Time Cap";
  capMultiple: number | null;
  capTimePeriodMonths: number | null;
  preBEPRevSharePct: number;
  postBEPRevSharePct: number;
  minReturn: number | null;
  minReturnMultiple: number | null;
  minReturnPayableMonths: number | null;
}

export interface PastProject {
  id: string;
  projectName: string;
  status: ProjectStatus;
  /**
   * IC approval date for this project (ISO). Used to sort recap rows newest-first within the same status.
   */
  icApprovalDate: string | null;
  /** When true, this row is the Proposed project for the IC page being viewed (always shown in the recap table). */
  isCurrentSubmission?: boolean;
  returnType: ReturnType;
  amount: number;
  outstandingAmount: number;
  projectedTermMonths: number;
  otfTermMonths: number | null; // actual term if completed
  otfIRR: number | null; // percentage, e.g. 18.5
  projectedIRR: number;
  otfMOIC: number | null;
  projectedMOIC: string; // e.g. "1.3x"
  projectedBEPMonths: number;
  currentDPD: number;
  maxDPD: number;
  overdueHistory?: OverdueEvent[];
  /** At IC time: terms as executed (or as modeled) for this row — used in Asset A/D revenue-share recap comparison. */
  revShareTermsSnapshot?: RevShareTermsSnapshot;
  /**
   * B_MOD recap: row classification. When omitted on an Asset B brand card, UI infers from the viewed project’s asset class.
   */
  bRecapKind?: "B-I" | "B-PO" | "A/D";
  /** Counterparty / payor labels for this historical or proposed tranche. */
  payors?: string[];
  /** For Daily Interest rows at IC time — drives B_MOD recap warnings. */
  dailyInterestRecap?: DailyInterestRecapSnapshot | null;
  /** A/D rows only: PvA % when available from reporting layer. */
  pvaPct?: number | null;
  /** Non–Daily Interest rows: late fee terms at IC time for recap display / A/D checks. */
  lateFeeRecap?: {
    basis: string;
    gracePeriodDays: number;
    dailyPctInvestors: number;
    dailyPctASN: number;
  } | null;
}

export interface DisbursementRow {
  tranche: number;
  plannedAmount: number;
  plannedDate: string; // ISO date
}

export interface BranchInfo {
  id: string;
  name: string;
  area: string;
  gmapsLink: string | null;
  notes: string;
  type: "Opening Branch" | "Accruing Branch";
}

export interface RevenueShareTerms {
  sourceOfRevenueAccrued: string;
  frequency: string;
  dueDate: string;
  capType: "Return Cap" | "Time Cap";
  capMultiple: number | null; // x times
  capTimePeriodMonths: number | null;
  revShareStartType: "Anchored to Branch Opening" | "Fixed";
  revShareStartDate: string | null;
  preBEPRevSharePct: number;
  postBEPRevSharePct: number;
  carryType: string;
  carryPct: number;
  minReturn: number | null; // pct
  minReturnMultiple: number | null;
  minReturnPayableMonths: number | null;
  revProjectionArray: Array<{ month: number; revenue: number }>;
}

/** One row of the fixed-return amortization (principal / interest / carry per month). */
export interface FixedReturnScheduleRow {
  month: number;
  principal: number;
  interest: number;
  carry: number;
}

export interface FixedReturnTerms {
  repaymentSchedule: FixedReturnScheduleRow[];
  totalRepayment: number;
  totalPrincipal: number;
  totalInterest: number;
  /** Total carry across the schedule (should equal sum of monthly `carry`). */
  carry: number;
}

/** PO / invoice-style daily interest (Coda: Daily Interest return type) */
export interface DailyInterestTerms {
  interestRate30DayPct: number;
  serviceFee30DayPct: number;
  tenorDays: number;
  minInterestPeriodDays: number;
  serviceFeeDailyBasis: string;
}

/** B_MOD: proposed tranche payor / PO / invoice grid (Coda-sourced in production). */
export interface PayorInvoiceRow {
  id: string;
  payorLabel: string;
  poOrInvoiceNumber: string;
  dueDate: string;
  amount: number;
  currency: "IDR" | "USD";
  payorType: string;
  payeeProjects: string;
  notes: string;
  riskLevel: string;
}

export interface PTInfo {
  id: string;
  name: string;
  bank: string;
  accountNumber: string;
  accountholderName: string;
  slikFileUrl: string | null;
  slikExecSummary: string | null;
  warnings: string[];
}

export interface ICVoteRecord {
  memberId: string;
  memberName: string;
  isPrincipal: boolean;
  vote: ICVote;
  votedAt: string | null;
}

// ─── Root project type ────────────────────────────────────────────────────────

export interface ICProject {
  id: string;
  /** Source Coda Project row id when seeded from production */
  codaRowId?: string;
  // Header
  brandName: string;
  brandIsNew: boolean;
  projectName: string;
  approvalType: ApprovalType;
  submittedAt: string; // ISO date

  // PIC
  pic: PICInfo;

  // Project details
  projectNumberForKP: number; // "Project # for KP"
  brandActiveProjects: number;
  brandCompletedProjects: number;
  brandBeforeICProjects: number;
  brandPendingDisbursementProjects: number;
  mainSector: string;
  subSector: string | null;
  syariah: boolean;
  /** Analyst notes on the syariah scheme; only set when `syariah` is true (A&D spec E18). */
  syariahNotes?: string | null;
  assetClass: string;
  requestedAmountCurrency: "IDR" | "USD";
  requestedAmount: number;
  /**
   * When set, this is the PO / tranche project target (e.g. Coda IDR/USD Project Target Amount).
   * For PO/Invoice + Plafond, `requestedAmount` may instead represent the net plafond increase while this holds the tranche size.
   */
  trancheTargetAmount?: number;
  /** When set (e.g. PO/Invoice + Plafond), IC vote-count rules use this IDR amount instead of `requestedAmount`. */
  icVoteBasisAmount?: number;
  amountWarning: string | null;
  financingUse: string;
  sectorWarning: string | null;

  // Plafond
  plafond: PlafondInfo;

  // Financial reviews (last 2)
  financialReviews: FinancialReview[];

  // KP details
  referralSource: string;
  specificReferror: string | null;
  referrorBelongsToKP: string | null;
  /**
   * When `referralSource` is the sentinel "2nd+ project", show this snapshot (first project’s referral) instead.
   */
  firstProjectReferralOverride?: {
    referralSource: string;
    specificReferror: string | null;
    referrorBelongsToKP: string | null;
  } | null;
  otherReferees: string[];

  /** Underwriting model: projected break-even in months (Coda Project). Shown with revenue share terms. */
  submissionProjectedBEPMonths?: number | null;

  // KP contacts
  kpContacts: KPContact[];

  // Past & proposed projects
  pastProjects: PastProject[];

  // Project terms
  returnType: ReturnType;
  /** Master data Return Type enum value as selected on the submission form (display-preferred). */
  masterReturnType?: string;
  disbursements: DisbursementRow[];
  branches: BranchInfo[];
  revenueShareTerms: RevenueShareTerms | null;
  fixedReturnTerms: FixedReturnTerms | null;
  dailyInterestTerms?: DailyInterestTerms | null;
  lateFee: {
    basis: string;
    gracePeriodDays: number;
    dailyPctInvestors: number;
    dailyPctASN: number;
  };
  termSheetLink: string | null;

  // Credit memo & notes
  kpCreditMemo: string;
  projectCreditMemo: string;
  financialsLink: string | null;
  projectNotes: Array<{ author: string; date: string; content: string }>;

  // PT
  ptDetails: PTInfo[];

  /** B_MOD: Payor / PO / invoice lines for the proposed submission. */
  payorInvoices?: PayorInvoiceRow[];

  // Approval
  fundingSource: string;
  bankDetailsReviewed: boolean;
  taxWithholdings: "Yes" | "No" | "TBD";
  icVotes: ICVoteRecord[];
  approvalNotes: string;
  specialNotesForIC: string | null;
  conditionsSubsequent: string[];
}

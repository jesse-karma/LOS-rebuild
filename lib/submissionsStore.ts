import { ApprovalType, ICProject, ReturnType } from "@/data/types";
import { mockProjects } from "@/data/mock";
import {
  LeadStatus,
  LEAD_STATUS_DISCUSSING_RETURN,
  LEAD_STATUS_IC_CREDIT_REVIEW,
  RequestState,
} from "@/data/masterData";

// ─── Submission form data (analyst-entered fields) ───────────────────────────

export interface SubmissionFormData {
  brandName: string;
  brandIsNew: boolean;
  projectName: string;
  /** Master data: Asset Class enum (A, B - I, B - PO, C, D). */
  assetClass: string;
  approvalType: ApprovalType;
  primaryAnalyst: string;
  secondaryAnalyst: string;
  mainSector: string;
  subSector: string;
  syariah: boolean;
  requestedAmountCurrency: "IDR" | "USD";
  requestedAmount: number;
  /** Master data: Structured Loan Use enum. */
  financingUse: string;
  /** Master data: Return Type enum (Revenue Share, Daily Interest, …). */
  returnType: string;
  /** Master data: Funding Source enum. */
  fundingSource: string;
  /** Master data: Referral Source enum. */
  referralSource: string;
  // Plafond proposal (used when approvalType includes "Plafond")
  proposedTotalLimit: number;
  proposedPOSubLimit: number;
  proposedWCSubLimit: number;
  termSheetLink: string;
  projectCreditMemo: string;
  specialNotesForIC: string;
}

// ─── Lifecycle (Lead Status + Request State master data) ─────────────────────

export function leadStatusFor(status: StoredSubmission["status"]): LeadStatus {
  return status === "draft" ? LEAD_STATUS_DISCUSSING_RETURN : LEAD_STATUS_IC_CREDIT_REVIEW;
}

export function requestStateFor(status: StoredSubmission["status"]): RequestState {
  return status === "draft" ? "Not Submitted" : "Pending review";
}

export interface StoredSubmission {
  id: string;
  status: "draft" | "submitted";
  createdAt: string; // ISO
  submittedAt: string | null; // ISO
  form: SubmissionFormData;
}

export function emptySubmissionForm(): SubmissionFormData {
  return {
    brandName: "",
    brandIsNew: true,
    projectName: "",
    assetClass: "A",
    approvalType: "Project",
    primaryAnalyst: "Priska Ponggawa",
    secondaryAnalyst: "",
    mainSector: "F&B",
    subSector: "",
    syariah: false,
    requestedAmountCurrency: "IDR",
    requestedAmount: 0,
    financingUse: "Branch Opening/Expansion",
    returnType: "Revenue Share",
    fundingSource: "KF/ KCF/KS",
    referralSource: "Cold calling",
    proposedTotalLimit: 0,
    proposedPOSubLimit: 0,
    proposedWCSubLimit: 0,
    termSheetLink: "",
    projectCreditMemo: "",
    specialNotesForIC: "",
  };
}

// ─── localStorage CRUD (client-only; prototype persistence) ──────────────────

const STORAGE_KEY = "kc-los-submissions";

export function listSubmissions(): StoredSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSubmission[]) : [];
  } catch {
    return [];
  }
}

function persist(subs: StoredSubmission[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

export function getSubmission(id: string): StoredSubmission | undefined {
  return listSubmissions().find((s) => s.id === id);
}

export function saveSubmission(sub: StoredSubmission) {
  const subs = listSubmissions();
  const i = subs.findIndex((s) => s.id === sub.id);
  if (i >= 0) subs[i] = sub;
  else subs.unshift(sub);
  persist(subs);
}

export function deleteSubmission(id: string) {
  persist(listSubmissions().filter((s) => s.id !== id));
}

export function newSubmissionId(): string {
  return `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Projects visible to IC (mock + submitted) ───────────────────────────────

export function submittedProjects(): ICProject[] {
  return listSubmissions()
    .filter((s) => s.status === "submitted")
    .map(submissionToICProject);
}

export function allReviewProjects(): ICProject[] {
  return [...submittedProjects(), ...mockProjects];
}

export function getReviewProjectById(id: string): ICProject | undefined {
  return allReviewProjects().find((p) => p.id === id);
}

// ─── Factory: form → full ICProject with safe defaults ───────────────────────

const IC_MEMBERS = [
  { memberId: "ic-1", memberName: "Ben Elberger", isPrincipal: true },
  { memberId: "ic-2", memberName: "Aldi Haryopratomo", isPrincipal: false },
  { memberId: "ic-3", memberName: "Junaidi", isPrincipal: false },
];

/**
 * The review card components still use the app's legacy ReturnType union;
 * map the master Return Type enum onto the closest legacy value.
 */
function legacyReturnType(masterReturnType: string): ReturnType {
  switch (masterReturnType) {
    case "Daily Interest":
      return "Daily Interest";
    case "Fixed Amount Repayment":
    case "Fixed Amount Repayment + Revenue Share":
      return "Fixed Return";
    case "Revenue Share":
    case "Profit Share":
    default:
      return "Revenue Share (Return-Capped)";
  }
}

export function submissionToICProject(sub: StoredSubmission): ICProject {
  const f = sub.form;
  const hasPlafond = f.approvalType.includes("Plafond");

  return {
    id: sub.id,
    brandName: f.brandName,
    brandIsNew: f.brandIsNew,
    projectName: f.projectName,
    approvalType: f.approvalType,
    submittedAt: sub.submittedAt ?? sub.createdAt,

    pic: {
      submitter: f.primaryAnalyst,
      primaryAnalyst: f.primaryAnalyst,
      secondaryAnalyst: f.secondaryAnalyst || null,
    },

    projectNumberForKP: 1,
    brandActiveProjects: 0,
    brandCompletedProjects: 0,
    brandBeforeICProjects: 1,
    brandPendingDisbursementProjects: 0,
    mainSector: f.mainSector,
    subSector: f.subSector || null,
    syariah: f.syariah,
    assetClass: f.assetClass,
    requestedAmountCurrency: f.requestedAmountCurrency,
    requestedAmount: f.requestedAmount,
    amountWarning: null,
    financingUse: f.financingUse,
    sectorWarning: null,

    plafond: {
      proposed: hasPlafond
        ? {
            totalLimit: f.proposedTotalLimit,
            poSubLimit: f.proposedPOSubLimit,
            wcSubLimit: f.proposedWCSubLimit,
          }
        : null,
      current: null,
      outstandingTotal: 0,
      remainingTotal: 0,
      remainingPO: 0,
      remainingWC: 0,
      superseded: [],
    },

    financialReviews: [],

    referralSource: f.referralSource,
    specificReferror: null,
    referrorBelongsToKP: null,
    otherReferees: [],

    kpContacts: [],

    pastProjects: [
      {
        id: `${sub.id}-proposed`,
        projectName: f.projectName,
        status: "Proposed",
        icApprovalDate: null,
        isCurrentSubmission: true,
        returnType: legacyReturnType(f.returnType),
        amount: f.requestedAmount,
        outstandingAmount: 0,
        projectedTermMonths: 0,
        otfTermMonths: null,
        otfIRR: null,
        projectedIRR: 0,
        otfMOIC: null,
        projectedMOIC: "—",
        projectedBEPMonths: 0,
        currentDPD: 0,
        maxDPD: 0,
      },
    ],

    returnType: legacyReturnType(f.returnType),
    disbursements: [],
    branches: [],
    revenueShareTerms: null,
    fixedReturnTerms: null,
    dailyInterestTerms: null,
    lateFee: { basis: "—", gracePeriodDays: 0, dailyPctInvestors: 0, dailyPctASN: 0 },
    termSheetLink: f.termSheetLink || null,

    kpCreditMemo: "",
    projectCreditMemo: f.projectCreditMemo,
    financialsLink: null,
    projectNotes: [],

    ptDetails: [],

    fundingSource: f.fundingSource,
    bankDetailsReviewed: false,
    taxWithholdings: "TBD",
    icVotes: IC_MEMBERS.map((m) => ({ ...m, vote: null, votedAt: null })),
    approvalNotes: "",
    specialNotesForIC: f.specialNotesForIC || null,
    conditionsSubsequent: [],
  };
}

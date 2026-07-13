import { ApprovalType, ICProject, ReturnType } from "@/data/types";
import { mockProjects } from "@/data/mock";
import {
  LeadStatus,
  LEAD_STATUS_DISCUSSING_RETURN,
  LEAD_STATUS_DUE_DILIGENCE,
  LEAD_STATUS_FUNDING_LEAD,
  LEAD_STATUS_IC_CREDIT_REVIEW,
  RequestState,
} from "@/data/masterData";

// ─── Submission form data (analyst-entered fields) ───────────────────────────

// Dynamic row types per the "Sub+IC Review_Card_A&D_MOD" spec (IC Review Layout sheet).

export interface SubmissionContactRow {
  id: string;
  name: string;
  role: string;
  notesOnPerson: string;
  isKeyPerson: boolean;
  slikFileUrl: string;
  slikExecSummary: string;
  uboExposure: number; // IDR
}

export interface SubmissionDisbursementRow {
  id: string;
  amount: number; // in the submission's requested-amount currency
  plannedDate: string; // ISO date (yyyy-mm-dd)
}

export interface SubmissionBranchRow {
  id: string;
  name: string;
  area: string;
  gmapsLink: string;
  notes: string;
  type: "Opening Branch" | "Accruing Branch";
}

export interface SubmissionPTRow {
  id: string;
  name: string;
  bank: string;
  accountNumber: string;
  accountholderName: string;
  slikFileUrl: string;
  slikExecSummary: string;
}

export interface SubmissionFormData {
  brandName: string;
  brandIsNew: boolean;
  projectName: string;
  /** Master data: Asset Class enum (A, B - I, B - PO, C, D). */
  assetClass: string;
  approvalType: ApprovalType;
  /** Card creator (spec: defaults Primary Analyst to the creator). */
  createdBy: string;
  /** Filled on submit; cleared when pulled back to draft (spec E8 fill logic). */
  submittedBy: string;
  primaryAnalyst: string;
  secondaryAnalyst: string;
  /** Free text — the person who referred (spec E10). */
  specificReferror: string;
  /** KP/Brand the referror belongs to (spec E10). */
  referrorBelongsToKP: string;
  mainSector: string;
  subSector: string;
  syariah: boolean;
  /** Shown only when syariah = true (spec E18). */
  syariahNotes: string;
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
  // Asset A&D spec sections
  kpContacts: SubmissionContactRow[];
  disbursements: SubmissionDisbursementRow[];
  branches: SubmissionBranchRow[];
  ptDetails: SubmissionPTRow[];
  /** Calculator / Financials Google Sheets link (spec F27 & E90 — embedded on the IC card). */
  financialsLink: string;
  kpCreditMemo: string;
  /** Only meaningful when fundingSource is Members (spec E101 display logic). */
  bankDetailsReviewed: boolean;
  /** Karmapreneur will withhold / will NOT withhold (spec E102). */
  taxWithholdings: "Yes" | "No" | "TBD";
  termSheetLink: string;
  projectCreditMemo: string;
  specialNotesForIC: string;
}

// ─── Lifecycle (Lead Status + Request State master data) ─────────────────────

/** Master data §1 lead statuses a draft can sit in before IC review. */
export type DraftLeadStatusCode = "2" | "3" | "3.9";

const DRAFT_LEAD_STATUSES: Record<DraftLeadStatusCode, LeadStatus> = {
  "2": LEAD_STATUS_FUNDING_LEAD,
  "3": LEAD_STATUS_DUE_DILIGENCE,
  "3.9": LEAD_STATUS_DISCUSSING_RETURN,
};

export function leadStatusFor(
  status: StoredSubmission["status"],
  leadStatusCode?: DraftLeadStatusCode
): LeadStatus {
  if (status !== "draft") return LEAD_STATUS_IC_CREDIT_REVIEW;
  return DRAFT_LEAD_STATUSES[leadStatusCode ?? "3.9"];
}

export function requestStateFor(status: StoredSubmission["status"]): RequestState {
  return status === "draft" ? "Not Submitted" : "Pending review";
}

export interface StoredSubmission {
  id: string;
  status: "draft" | "submitted";
  /** Where a draft sits before IC review; absent (legacy drafts) means 3.9. */
  leadStatusCode?: DraftLeadStatusCode;
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
    createdBy: "",
    submittedBy: "",
    primaryAnalyst: "Priska Ponggawa",
    secondaryAnalyst: "",
    specificReferror: "",
    referrorBelongsToKP: "",
    mainSector: "F&B",
    subSector: "",
    syariah: false,
    syariahNotes: "",
    requestedAmountCurrency: "IDR",
    requestedAmount: 0,
    financingUse: "Branch Opening/Expansion",
    returnType: "Revenue Share",
    fundingSource: "KF/ KCF/KS",
    referralSource: "Cold calling",
    proposedTotalLimit: 0,
    proposedPOSubLimit: 0,
    proposedWCSubLimit: 0,
    kpContacts: [],
    disbursements: [],
    branches: [],
    ptDetails: [],
    financialsLink: "",
    kpCreditMemo: "",
    bankDetailsReviewed: false,
    taxWithholdings: "TBD",
    termSheetLink: "",
    projectCreditMemo: "",
    specialNotesForIC: "",
  };
}

export function newRowId(): string {
  return `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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

// ─── Demo seed data (prototype: pre-populates the Funding Lead tab once) ─────

// v2: demo drafts carry varied leadStatusCode values.
const SEED_FLAG = "kc-los-demo-seeded-v2";

function demoDrafts(): StoredSubmission[] {
  return [
    {
      id: "sub-demo-sks",
      status: "draft",
      // Oldest draft is furthest along the pre-IC lifecycle.
      leadStatusCode: "3.9",
      createdAt: "2026-07-08T09:30:00.000Z",
      submittedAt: null,
      form: {
        ...emptySubmissionForm(),
        brandName: "Sate Khas Senayan",
        brandIsNew: true,
        projectName: "Sate Khas Senayan (#1) — Branch Opening: Bandung",
        assetClass: "A",
        approvalType: "Project",
        createdBy: "Priska Ponggawa",
        primaryAnalyst: "Priska Ponggawa",
        secondaryAnalyst: "Nila Layla Melinda",
        mainSector: "F&B",
        subSector: "🍲Full Service Resto",
        requestedAmount: 2_500_000_000,
        financingUse: "Branch Opening/Expansion",
        returnType: "Revenue Share",
        referralSource: "KarmaClub Member",
        kpContacts: [
          {
            id: "row-demo-sks-1",
            name: "Rizky Pratama",
            role: "Owner / Director",
            notesOnPerson: "Founder; runs day-to-day ops across 4 outlets.",
            isKeyPerson: true,
            slikFileUrl: "",
            slikExecSummary: "",
            uboExposure: 0,
          },
        ],
      },
    },
    {
      id: "sub-demo-spj",
      status: "draft",
      leadStatusCode: "3",
      createdAt: "2026-07-10T04:15:00.000Z",
      submittedAt: null,
      form: {
        ...emptySubmissionForm(),
        brandName: "Sumber Pangan Jaya",
        brandIsNew: true,
        projectName: "Sumber Pangan Jaya (#1) — PO Financing: Indomarco",
        assetClass: "B - PO",
        approvalType: "PO/Invoice",
        createdBy: "Nila Layla Melinda",
        primaryAnalyst: "Nila Layla Melinda",
        mainSector: "Commodities Trading, Processing, & Distribution",
        subSector: "🥨FMCG Distribution",
        requestedAmount: 1_200_000_000,
        financingUse: "Domestic PO Financing",
        returnType: "Daily Interest",
        referralSource: "Karmapreneur",
        disbursements: [
          { id: "row-demo-spj-1", amount: 700_000_000, plannedDate: "2026-08-01" },
          { id: "row-demo-spj-2", amount: 500_000_000, plannedDate: "2026-09-01" },
        ],
      },
    },
    {
      id: "sub-demo-dc",
      status: "draft",
      leadStatusCode: "2",
      createdAt: "2026-07-12T11:00:00.000Z",
      submittedAt: null,
      form: {
        ...emptySubmissionForm(),
        brandName: "Dapur Cokelat",
        brandIsNew: false,
        projectName: "Dapur Cokelat (#2) — Working Capital + Plafond",
        assetClass: "D",
        approvalType: "Project+Plafond",
        createdBy: "Priska Ponggawa",
        primaryAnalyst: "Priska Ponggawa",
        mainSector: "F&B",
        subSector: "🧋Snacks, Drinks, & Desserts",
        requestedAmount: 3_000_000_000,
        financingUse: "Working Capital Financing",
        returnType: "Fixed Amount Repayment",
        referralSource: "2nd+ Project",
        proposedTotalLimit: 5_000_000_000,
        proposedPOSubLimit: 2_000_000_000,
        proposedWCSubLimit: 3_000_000_000,
      },
    },
  ];
}

/** One-time localStorage seed so the prototype opens with Funding Lead examples. */
export function seedDemoSubmissions() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(SEED_FLAG)) return;
  const demos = demoDrafts();
  // Upgrade demo drafts seeded before v2 with their varied lead statuses.
  const existing = listSubmissions().map((s) => {
    const demo = demos.find((d) => d.id === s.id);
    return demo && s.status === "draft" ? { ...s, leadStatusCode: demo.leadStatusCode } : s;
  });
  const fresh = demos.filter((d) => !existing.some((s) => s.id === d.id));
  persist([...fresh, ...existing]);
  window.localStorage.setItem(SEED_FLAG, "1");
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

/** Spec A97: flag accountholder/PT name mismatches on the review card. */
function ptWarnings(pt: SubmissionPTRow): string[] {
  const warnings: string[] = [];
  if (pt.name.trim() && pt.accountholderName.trim() && pt.name.trim() !== pt.accountholderName.trim()) {
    warnings.push("Mismatch on accountholder and PT names");
  }
  return warnings;
}

/** Spec U19 Warning 2: Project Target Amount vs Proposed Plafond (Project+Plafond only). */
export function requestedAmountWarning(f: SubmissionFormData): string | null {
  if (
    f.approvalType === "Project+Plafond" &&
    f.requestedAmountCurrency === "IDR" &&
    f.proposedTotalLimit > 0 &&
    f.requestedAmount > f.proposedTotalLimit
  ) {
    return "Warning: Project Target Amount exceeds Proposed Plafond";
  }
  return null;
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
      submitter: f.submittedBy || f.primaryAnalyst,
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
    syariahNotes: f.syariah && f.syariahNotes ? f.syariahNotes : null,
    assetClass: f.assetClass,
    requestedAmountCurrency: f.requestedAmountCurrency,
    requestedAmount: f.requestedAmount,
    amountWarning: requestedAmountWarning(f),
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
    specificReferror: f.specificReferror || null,
    referrorBelongsToKP: f.referrorBelongsToKP || null,
    otherReferees: [],

    kpContacts: f.kpContacts.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      notesOnPerson: c.notesOnPerson,
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: c.isKeyPerson,
      slikFileUrl: c.slikFileUrl || null,
      slikExecSummary: c.slikExecSummary || null,
      uboExposure: c.uboExposure,
    })),

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
    disbursements: f.disbursements.map((d, i) => ({
      tranche: i + 1,
      plannedAmount: d.amount,
      plannedDate: d.plannedDate,
    })),
    branches: f.branches.map((b) => ({
      id: b.id,
      name: b.name,
      area: b.area,
      gmapsLink: b.gmapsLink || null,
      notes: b.notes,
      type: b.type,
    })),
    revenueShareTerms: null,
    fixedReturnTerms: null,
    dailyInterestTerms: null,
    lateFee: { basis: "—", gracePeriodDays: 0, dailyPctInvestors: 0, dailyPctASN: 0 },
    termSheetLink: f.termSheetLink || null,

    kpCreditMemo: f.kpCreditMemo,
    projectCreditMemo: f.projectCreditMemo,
    financialsLink: f.financialsLink || null,
    projectNotes: [],

    ptDetails: f.ptDetails.map((pt) => ({
      id: pt.id,
      name: pt.name,
      bank: pt.bank,
      accountNumber: pt.accountNumber,
      accountholderName: pt.accountholderName,
      slikFileUrl: pt.slikFileUrl || null,
      slikExecSummary: pt.slikExecSummary || null,
      warnings: ptWarnings(pt),
    })),

    fundingSource: f.fundingSource,
    bankDetailsReviewed: f.bankDetailsReviewed,
    taxWithholdings: f.taxWithholdings,
    icVotes: IC_MEMBERS.map((m) => ({ ...m, vote: null, votedAt: null })),
    approvalNotes: "",
    specialNotesForIC: f.specialNotesForIC || null,
    conditionsSubsequent: [],
  };
}

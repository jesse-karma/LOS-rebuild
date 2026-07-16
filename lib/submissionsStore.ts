import { ApprovalType, ICProject, PastProject, ReturnType } from "@/data/types";
import { mockProjects } from "@/data/mock";
import { isAssetB } from "@/lib/assetClass";
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
  whatsapp: string;
  email: string;
  role: string;
  notesOnPerson: string;
  isKeyPerson: boolean;
  slikFileUrl: string;
  slikExecSummary: string;
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

/** One month of the fixed-repayment amortization (month number = row order). */
export interface SubmissionFixedRow {
  id: string;
  principal: number;
  interest: number;
  carry: number;
}

/** Asset B: one payor / PO / invoice line for this proposed submission. */
export interface SubmissionPayorRow {
  id: string;
  payorLabel: string;
  poOrInvoiceNumber: string;
  dueDate: string; // ISO date (yyyy-mm-dd)
  amount: number; // in the submission's requested-amount currency
  payorType: string;
  payeeProjects: string;
  notes: string;
  riskLevel: "Low" | "Medium" | "High";
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

export interface SubmissionReferrorRow {
  id: string;
  name: string;
  /** Auto-derived from the name — "Karma Staff", "Karmapreneur", or "Potential Karmapreneur" if unrecognized. */
  relationType: string;
  /** Brand(s) this person is tied to, when they're a recognized Karmapreneur — else null ("N/A"). */
  belongsToKP: string | null;
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
  /** One or more people who referred this Karmapreneur (spec E10). */
  referrors: SubmissionReferrorRow[];
  /** True once the analyst has explicitly said this came from a marketing channel, not a person. */
  isMarketingReferral: boolean;
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
  // Financial review (becomes Review 1 on the IC card's Plafond & Financial Reviews section)
  finReviewReportsReviewed: string;
  finReviewPeriodEnding: string; // ISO date (yyyy-mm-dd)
  finReviewLimitRecommendation: "Keep" | "Increase" | "Decrease";
  /** Brand total limit (IDR) in effect at review time; 0 = none on file. */
  finReviewLimitCurrent: number;
  /** Recommended new total limit (IDR) for Increase / Decrease. */
  finReviewLimitRecommended: number;
  finReviewNotes: string;
  // Asset A&D spec sections
  kpContacts: SubmissionContactRow[];
  disbursements: SubmissionDisbursementRow[];
  branches: SubmissionBranchRow[];
  ptDetails: SubmissionPTRow[];
  // Deal terms — Revenue Share (shown when Return Type includes Revenue/Profit Share)
  rsSourceOfRevenue: string;
  rsFrequency: string;
  rsDueDate: string;
  rsCapType: "Return Cap" | "Time Cap";
  rsCapMultiple: number; // x, when Return Cap
  rsCapTimeMonths: number; // when Time Cap
  rsStartType: "Anchored to Branch Opening" | "Fixed";
  rsStartDate: string; // ISO, when Fixed
  rsPreBEPPct: number;
  rsPostBEPPct: number;
  rsCarryPct: number;
  // Deal terms — Fixed repayment schedule (Return Type includes Fixed Amount Repayment)
  fixedSchedule: SubmissionFixedRow[];
  // Deal terms — Daily Interest (Return Type = Daily Interest)
  diInterestRate30d: number; // % per 30 days
  diServiceFee30d: number; // % per 30 days
  diTenorDays: number;
  diMinInterestDays: number;
  diServiceFeeBasis: string;
  // Late fees (policy defaults pre-filled; card warns on deviations)
  lfBasis: string;
  lfGraceDays: number;
  lfDailyPctInvestors: number;
  lfDailyPctASN: number;
  // Asset B: payor / PO / invoice grid
  payorInvoices: SubmissionPayorRow[];
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
  /** Stamped on every save; absent (legacy drafts) means createdAt. */
  updatedAt?: string; // ISO
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
    referrors: [{ id: newRowId(), name: "", relationType: "", belongsToKP: null }],
    isMarketingReferral: false,
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
    finReviewReportsReviewed: "",
    finReviewPeriodEnding: "",
    finReviewLimitRecommendation: "Keep",
    finReviewLimitCurrent: 0,
    finReviewLimitRecommended: 0,
    finReviewNotes: "",
    kpContacts: [],
    disbursements: [],
    branches: [],
    ptDetails: [],
    rsSourceOfRevenue: "All revenue of the financed branches",
    rsFrequency: "Monthly",
    rsDueDate: "",
    rsCapType: "Return Cap",
    rsCapMultiple: 0,
    rsCapTimeMonths: 0,
    rsStartType: "Anchored to Branch Opening",
    rsStartDate: "",
    rsPreBEPPct: 0,
    rsPostBEPPct: 0,
    rsCarryPct: 0,
    fixedSchedule: [],
    diInterestRate30d: 0,
    diServiceFee30d: 0,
    diTenorDays: 0,
    diMinInterestDays: 0,
    diServiceFeeBasis: "Disbursed Amount",
    lfBasis: "Overdue Amount",
    lfGraceDays: 5,
    lfDailyPctInvestors: 0.08,
    lfDailyPctASN: 0.02,
    payorInvoices: [],
    financialsLink: "",
    kpCreditMemo: "",
    bankDetailsReviewed: false,
    // Spec default: "Karmapreneur will withhold" unless the brand's history says otherwise (see
    // mostRecentBrandProject — SubmissionForm pre-fills this live once a brand with history is typed).
    taxWithholdings: "Yes",
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

/** Shape of a stored submission from before referrors became a list (localStorage migration only). */
interface LegacySubmissionFormData {
  referrors?: SubmissionReferrorRow[];
  isMarketingReferral?: boolean;
  specificReferror?: string;
  referrorBelongsToKP?: string;
}

export function listSubmissions(): StoredSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const subs = raw ? (JSON.parse(raw) as StoredSubmission[]) : [];
    // Migrate existing contacts to have whatsapp/email fields
    return subs.map((sub) => {
      const legacy = sub.form as unknown as LegacySubmissionFormData;
      const referrors =
        legacy.referrors ??
        (legacy.specificReferror?.trim()
          ? [
              {
                id: newRowId(),
                name: legacy.specificReferror,
                relationType: sub.form.referralSource,
                belongsToKP: legacy.referrorBelongsToKP || null,
              },
            ]
          : []);
      return {
        ...sub,
        form: {
          ...sub.form,
          kpContacts: sub.form.kpContacts.map((c) => ({
            ...c,
            whatsapp: (c as any).whatsapp || "",
            email: (c as any).email || "",
          })),
          // Migrate the old single specificReferror/referrorBelongsToKP fields to the referrors list.
          referrors,
          // Older saves without the flag: an empty list used to mean "marketing".
          isMarketingReferral: legacy.isMarketingReferral ?? referrors.length === 0,
        },
      };
    });
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
  const stamped = { ...sub, updatedAt: new Date().toISOString() };
  const i = subs.findIndex((s) => s.id === stamped.id);
  if (i >= 0) subs[i] = stamped;
  else subs.unshift(stamped);
  persist(subs);
}

export function deleteSubmission(id: string) {
  persist(listSubmissions().filter((s) => s.id !== id));
}

export function newSubmissionId(): string {
  return `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Demo seed data (prototype: pre-populates the Funding Lead tab once) ─────

// v3: demo drafts carry varied leadStatusCode and updatedAt values.
const SEED_FLAG = "kc-los-demo-seeded-v3";

function demoDrafts(): StoredSubmission[] {
  return [
    {
      id: "sub-demo-sks",
      status: "draft",
      // Oldest draft is furthest along the pre-IC lifecycle.
      leadStatusCode: "3.9",
      createdAt: "2026-07-08T09:30:00.000Z",
      updatedAt: "2026-07-12T15:20:00.000Z",
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
        referrors: [
          {
            id: "row-demo-sks-ref-1",
            name: "Sinta Wulandari",
            relationType: "Potential Karmapreneur",
            belongsToKP: null,
          },
        ],
        kpContacts: [
          {
            id: "row-demo-sks-1",
            name: "Rizky Pratama",
            whatsapp: "+62 - 812 3456 7890",
            email: "rizky@satekhas.com",
            role: "Owner / Director",
            notesOnPerson: "Founder; runs day-to-day ops across 4 outlets.",
            isKeyPerson: true,
            slikFileUrl: "",
            slikExecSummary: "",
          },
        ],
      },
    },
    {
      id: "sub-demo-spj",
      status: "draft",
      leadStatusCode: "3",
      createdAt: "2026-07-10T04:15:00.000Z",
      updatedAt: "2026-07-11T08:45:00.000Z",
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
        referrors: [
          {
            id: "row-demo-spj-ref-1",
            name: "Regina Tiffani",
            relationType: "Karmapreneur",
            belongsToKP: "Steak Hotel by Holycow, Shushu",
          },
        ],
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
      updatedAt: "2026-07-12T11:00:00.000Z",
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
  // Upgrade demo drafts seeded before v3 with their varied lead statuses and update stamps.
  const existing = listSubmissions().map((s) => {
    const demo = demos.find((d) => d.id === s.id);
    return demo && s.status === "draft"
      ? { ...s, leadStatusCode: demo.leadStatusCode, updatedAt: s.updatedAt ?? demo.updatedAt }
      : s;
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
  // USD requests are compared against the (IDR) plafond limits at the same JISDOR-equivalent
  // rate used elsewhere in this file, rather than skipping the check entirely.
  const requestedIDR =
    f.requestedAmountCurrency === "IDR" ? f.requestedAmount : f.requestedAmount * 16000;

  if (f.approvalType === "Project+Plafond" && f.proposedTotalLimit > 0 && requestedIDR > f.proposedTotalLimit) {
    return "Warning: Project Target Amount exceeds Proposed Plafond";
  }
  if (f.approvalType === "Project" && f.finReviewLimitCurrent > 0 && requestedIDR > f.finReviewLimitCurrent) {
    return "Warning: Project Target Amount exceeds Current Plafond";
  }
  return null;
}

/** A brand's past projects across all mock history (deduped by id). */
export function brandHistoryFor(brandName: string): PastProject[] {
  const brandKey = brandName.trim().toLowerCase();
  const seenPastIds = new Set<string>();
  return mockProjects
    .filter((p) => p.brandName.trim().toLowerCase() === brandKey)
    .flatMap((p) => p.pastProjects.filter((pp) => !pp.isCurrentSubmission))
    .filter((pp) => (seenPastIds.has(pp.id) ? false : (seenPastIds.add(pp.id), true)));
}

/** The brand's most recent past project (by IC approval date) — basis for pre-fill/default lookups. */
export function getAllBrands(): string[] {
  const seenBrands = new Set<string>();
  // Add brands from mock projects
  mockProjects.forEach((p) => seenBrands.add(p.brandName));
  // Add brands from stored submissions
  listSubmissions().forEach((s) => {
    if (s.form.brandName.trim()) seenBrands.add(s.form.brandName);
  });
  return Array.from(seenBrands).sort();
}

export function mostRecentBrandProject(brandName: string): PastProject | null {
  const history = brandHistoryFor(brandName);
  if (history.length === 0) return null;
  return [...history].sort((a, b) => {
    const ta = a.icApprovalDate ? Date.parse(a.icApprovalDate) : -Infinity;
    const tb = b.icApprovalDate ? Date.parse(b.icApprovalDate) : -Infinity;
    return tb - ta;
  })[0];
}

/** Every distinct referror name recorded across mock + in-app submissions. */
export function getAllReferrors(): string[] {
  const seen = new Set<string>();
  mockProjects.forEach((p) => {
    if (p.specificReferror?.trim()) seen.add(p.specificReferror.trim());
    p.otherReferees.forEach((name) => {
      if (name.trim()) seen.add(name.trim());
    });
  });
  listSubmissions().forEach((s) => {
    s.form.referrors.forEach((r) => {
      if (r.name.trim()) seen.add(r.name.trim());
    });
  });
  return Array.from(seen).sort();
}

export function submissionToICProject(sub: StoredSubmission): ICProject {
  const f = sub.form;
  const hasPlafond = f.approvalType.includes("Plafond");

  // The analyst's financial review becomes Review 1 on the IC card.
  const financialReviews = f.finReviewReportsReviewed.trim() || f.finReviewPeriodEnding
    ? [
        {
          submissionDate: (sub.submittedAt ?? sub.createdAt).slice(0, 10),
          financialReportsReviewed: f.finReviewReportsReviewed,
          periodEndingDate: f.finReviewPeriodEnding,
          limitRecommendation: f.finReviewLimitRecommendation,
          limitCurrentIdr: f.finReviewLimitCurrent > 0 ? f.finReviewLimitCurrent : null,
          limitRecommendedIdr: f.finReviewLimitRecommended > 0 ? f.finReviewLimitRecommended : null,
          reviewNotes: f.finReviewNotes,
        },
      ]
    : [];

  // Deal terms: map the analyst's entries onto the card's term blocks.
  const wantsRevShare = f.returnType.includes("Revenue Share") || f.returnType === "Profit Share";
  const wantsFixed = f.returnType.includes("Fixed Amount Repayment");
  const wantsDaily = f.returnType === "Daily Interest";

  const revenueShareTerms =
    wantsRevShare && (f.rsPreBEPPct > 0 || f.rsPostBEPPct > 0)
      ? {
          sourceOfRevenueAccrued: f.rsSourceOfRevenue || "All revenue of the financed branches",
          frequency: f.rsFrequency || "Monthly",
          dueDate: f.rsDueDate || "—",
          capType: f.rsCapType,
          capMultiple: f.rsCapType === "Return Cap" && f.rsCapMultiple > 0 ? f.rsCapMultiple : null,
          capTimePeriodMonths:
            f.rsCapType === "Time Cap" && f.rsCapTimeMonths > 0 ? f.rsCapTimeMonths : null,
          revShareStartType: f.rsStartType,
          revShareStartDate: f.rsStartType === "Fixed" && f.rsStartDate ? f.rsStartDate : null,
          preBEPRevSharePct: f.rsPreBEPPct,
          postBEPRevSharePct: f.rsPostBEPPct,
          carryType: "Fixed Platform Fee",
          carryPct: f.rsCarryPct,
          minReturn: null,
          minReturnMultiple: null,
          minReturnPayableMonths: null,
          revProjectionArray: [],
        }
      : null;

  const fixedRows = f.fixedSchedule.filter((r) => r.principal > 0 || r.interest > 0 || r.carry > 0);
  const fixedReturnTerms =
    wantsFixed && fixedRows.length > 0
      ? {
          repaymentSchedule: fixedRows.map((r, i) => ({
            month: i + 1,
            principal: r.principal,
            interest: r.interest,
            carry: r.carry,
          })),
          totalRepayment: fixedRows.reduce((s, r) => s + r.principal + r.interest + r.carry, 0),
          totalPrincipal: fixedRows.reduce((s, r) => s + r.principal, 0),
          totalInterest: fixedRows.reduce((s, r) => s + r.interest, 0),
          carry: fixedRows.reduce((s, r) => s + r.carry, 0),
        }
      : null;

  const dailyInterestTerms =
    wantsDaily && (f.diInterestRate30d > 0 || f.diTenorDays > 0)
      ? {
          interestRate30DayPct: f.diInterestRate30d,
          serviceFee30DayPct: f.diServiceFee30d,
          tenorDays: f.diTenorDays,
          minInterestPeriodDays: f.diMinInterestDays,
          serviceFeeDailyBasis: f.diServiceFeeBasis || "Disbursed Amount",
        }
      : null;

  const payorInvoices = f.payorInvoices
    .filter((r) => r.payorLabel.trim() || r.poOrInvoiceNumber.trim() || r.amount > 0)
    .map((r) => ({ ...r, currency: f.requestedAmountCurrency }));

  // Recap is core IC content regardless of analyst input: pull the brand's
  // history from the KP's known projects so Proposed sits alongside it.
  const brandHistory = brandHistoryFor(f.brandName);

  // Sector/sub-sector mismatch vs. this brand's past projects (skips rows with no recorded sector).
  const sectorMismatches = brandHistory.filter(
    (p) => p.sector && (p.sector !== f.mainSector || (p.subSector ?? "") !== (f.subSector || ""))
  );
  const sectorWarningMsg =
    sectorMismatches.length > 0
      ? `Warning: Previous project${sectorMismatches.length > 1 ? "s" : ""} ${sectorMismatches
          .map((p) => `"${p.projectName}"`)
          .join(", ")} had a sector/sub-sector of ${sectorMismatches
          .map((p) => (p.subSector ? `${p.sector}/${p.subSector}` : p.sector))
          .join("; ")} which are different from current setting (${
          f.subSector ? `${f.mainSector}/${f.subSector}` : f.mainSector
        }). Check that the current settings are accurate.`
      : null;

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

    projectNumberForKP: brandHistory.length + 1,
    brandActiveProjects: brandHistory.filter((p) => p.status === "Active" || p.status === "Rescheduled").length,
    brandCompletedProjects: brandHistory.filter((p) => p.status === "Completed").length,
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
    sectorWarning: sectorWarningMsg,

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

    financialReviews,

    referralSource: f.referrors[0] ? f.referrors[0].relationType : f.referralSource,
    specificReferror: f.referrors[0]?.name || null,
    referrorBelongsToKP: f.referrors[0]?.belongsToKP || null,
    otherReferees: f.referrors
      .slice(1)
      .filter((r) => r.name.trim())
      .map((r) => (r.belongsToKP ? `${r.name} (${r.belongsToKP})` : r.name)),

    kpContacts: f.kpContacts.map((c) => ({
      id: c.id,
      name: c.name,
      whatsapp: (c as any).whatsapp || "",
      email: (c as any).email || "",
      role: c.role,
      notesOnPerson: c.notesOnPerson,
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: c.isKeyPerson,
      slikFileUrl: c.slikFileUrl || null,
      slikExecSummary: c.slikExecSummary || null,
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
      ...brandHistory,
    ],

    returnType: legacyReturnType(f.returnType),
    masterReturnType: f.returnType,
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
    revenueShareTerms,
    fixedReturnTerms,
    dailyInterestTerms,
    payorInvoices,
    // Asset B late fees are policy-derived from the daily interest terms
    // (Outstanding Principal, no grace, daily rate = 30-day rate / 30).
    lateFee: isAssetB(f.assetClass)
      ? {
          basis: "Outstanding Principal",
          gracePeriodDays: 0,
          dailyPctInvestors: f.diInterestRate30d / 30,
          dailyPctASN: f.diServiceFee30d / 30,
        }
      : {
          basis: f.lfBasis || "Overdue Amount",
          gracePeriodDays: f.lfGraceDays,
          dailyPctInvestors: f.lfDailyPctInvestors,
          dailyPctASN: f.lfDailyPctASN,
        },
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
    // Plafond approvals vote on the total limit, not the (possibly zero) project amount.
    icVoteBasisAmount: hasPlafond
      ? Math.max(
          f.proposedTotalLimit,
          f.requestedAmountCurrency === "IDR" ? f.requestedAmount : f.requestedAmount * 16000
        )
      : undefined,
    icVotes: IC_MEMBERS.map((m) => ({ ...m, vote: null, votedAt: null })),
    approvalNotes: "",
    specialNotesForIC: f.specialNotesForIC || null,
    conditionsPrecedent: [],
    conditionsPrecedentLogic: "",
    conditionsSubsequent: [],
    conditionsSubsequentLogic: "",
  };
}

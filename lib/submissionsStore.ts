import { ApprovalType, CreditMemoSection, ICProject, PastProject, PlafondInfo, ReturnType } from "@/data/types";
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

// ─── Credit memo templates — fixed questions the analyst answers, grouped into sections ──────

/** Project Credit Memo template — what the project is for, its financials, and operational readiness. */
export const PROJECT_CREDIT_MEMO_TEMPLATE: CreditMemoSection[] = [
  {
    id: "intro",
    title: "",
    questions: [{ id: "project-for", label: "What is the project for / branch(es) to be opened?", answer: "" }],
  },
  {
    id: "financial-analysis",
    title: "Project Financial Analysis",
    questions: [
      { id: "steady-state-revenue", label: "What is the estimated steady state revenue at Month 12?", answer: "" },
      {
        id: "amount-to-pay-investors-karma",
        label: "What is the amount the Karmapreneur will need to pay Investors+Karma in Month 12?",
        answer: "",
      },
      {
        id: "net-income-before-depreciation",
        label: "What is Net Income before Depreciation after paying Investors+Karma in Month 12?",
        answer: "",
      },
      {
        id: "lowest-revenue-breakeven",
        label: "What is the lowest revenue the Karmapreneur needs to be able to pay Investors+Karma and profit = 0?",
        answer: "",
      },
    ],
  },
  {
    id: "rent-contract",
    title: "Rent Contract (for the branch we're doing revenue share for)",
    questions: [
      { id: "rent-contract-length", label: "What is the rent contract length?", answer: "" },
      {
        id: "extend-right",
        label:
          "Does the entrepreneur have a contractual right to extend? If not, who is the landlord and what is relationship to entrepreneur?",
        answer: "",
      },
    ],
  },
  {
    id: "space",
    title: "Space",
    questions: [
      { id: "parking-spaces", label: "How many parking spaces will there be?", answer: "" },
      { id: "seats-beds", label: "How many seats/beds/etc. will there be in the branch?", answer: "" },
    ],
  },
  {
    id: "licenses",
    title: "Licenses (for the branch we're doing revenue share for)",
    questions: [
      { id: "requires-izin", label: "Does new branch require izin (medical, alcohol, etc.)?", answer: "" },
      { id: "has-license", label: "Do they have the license yet?", answer: "" },
    ],
  },
  {
    id: "location-target-buyer",
    title: "Location/Target Buyer Analysis",
    questions: [{ id: "location-assessment", label: "What is the analysts' assessment of the new location?", answer: "" }],
  },
  {
    id: "activation-plan",
    title: "Activation Plan and Dependencies",
    questions: [
      { id: "marketing-plan", label: "What is marketing plan for the new branch?", answer: "" },
      {
        id: "key-dependencies",
        label: "Are there any key dependencies not yet covered above critical to the project's success?",
        answer: "",
      },
    ],
  },
  {
    id: "post-funding-promises",
    title: "Post-Funding Promises",
    questions: [{ id: "pos-login", label: "Is the entrepreneur willing to give us log-in to their POS?", answer: "" }],
  },
];

/** Company (KP) Credit Memo template — founders, ownership, product, and standing checks. */
export const KP_CREDIT_MEMO_TEMPLATE: CreditMemoSection[] = [
  {
    id: "intro",
    title: "",
    questions: [{ id: "why-work-with-kp", label: "Why should we work with this Karmapreneur?", answer: "" }],
  },
  {
    id: "founders-day-to-day",
    title: "Founders and Day to Day",
    questions: [
      { id: "founders-how-know-each-other", label: "How do founders know each other? Are any related?", answer: "" },
      { id: "founders-roles", label: "What are the founders' roles in company (full time/part time)?", answer: "" },
      { id: "founders-background", label: "What are the founders' background?", answer: "" },
      { id: "who-runs-day-to-day", label: "Who runs day-to-day?", answer: "" },
    ],
  },
  {
    id: "ownership",
    title: "Ownership of Company",
    questions: [
      { id: "who-owns-company", label: "Who owns the company?", answer: "" },
      { id: "other-businesses", label: "What are the various companies/businesses under the same founders?", answer: "" },
    ],
  },
  {
    id: "reference-check",
    title: "Reference Check",
    questions: [
      {
        id: "reference-check",
        label:
          "Do any referrors, Karmapreneurs, or other people we trust know the founders and what are their impression about them?",
        answer: "",
      },
    ],
  },
  {
    id: "product-customer",
    title: "Product/Customer",
    questions: [
      { id: "main-product", label: "What is the main product or service being sold?", answer: "" },
      { id: "target-customer", label: "Who is the target customer segment?", answer: "" },
    ],
  },
  {
    id: "mission",
    title: "Mission",
    questions: [
      { id: "what-they-want-to-be", label: "What do they want to be?", answer: "" },
      { id: "brand-evolution", label: "What do the founders want the brand/company to evolve into?", answer: "" },
    ],
  },
  {
    id: "competitors",
    title: "Competitors",
    questions: [
      { id: "competitors-differentiation", label: "Who are their competitors and what is their differentiation?", answer: "" },
    ],
  },
  {
    id: "longevity",
    title: "Longevity",
    questions: [
      { id: "founded-year", label: "What year was the brand/company/group founded in?", answer: "" },
      { id: "pivoted", label: "Have they changed/pivoted from a previous concept?", answer: "" },
    ],
  },
  {
    id: "taxes",
    title: "Taxes",
    lastCheckedDate: "",
    questions: [
      { id: "pays-pb1-ppn", label: "Is the company paying PB1/PPN?", answer: "" },
      { id: "tax-office-chasing", label: "Is the tax office chasing them on any tax liabilities?", answer: "" },
    ],
  },
  {
    id: "existing-financing",
    title: "Existing Financing",
    lastCheckedDate: "",
    questions: [
      { id: "how-financed", label: "How has the Brand/Company financed themselves so far?", answer: "" },
      {
        id: "fixed-rate-loans",
        label:
          "Are there any fixed rate loans due to friends, fintechs, or banks? When are they due? (we're checking if any of them are due before we get repaid and whether paying them endangers the company's ability to operate and/or repay us)",
        answer: "",
      },
    ],
  },
  {
    id: "bank-vs-sales",
    title: "Bank vs Sales",
    lastCheckedDate: "",
    questions: [
      { id: "bank-sales-variance", label: "What is the variance of bank statements vs sales reports?", answer: "" },
      { id: "what-compared", label: "What was compared (specific branches, whole company)?", answer: "" },
    ],
  },
];

function cloneCreditMemoTemplate(template: CreditMemoSection[]): CreditMemoSection[] {
  return template.map((s) => ({ ...s, questions: s.questions.map((q) => ({ ...q })) }));
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
  proposedWcSubLimit: number;
  /** B_MOD only: optional next plafond / covenant review date on the Proposed row. */
  proposedMaxReviewDate: string; // ISO date (yyyy-mm-dd)
  /** Whether this submission proposes a buffer at all — not every plafond needs one. */
  proposedBufferEnabled: boolean;
  /** Optional buffer (Rp) above the plafond — only applicable to Asset B/D. */
  proposedBufferTotal: number;
  proposedBufferPO: number;
  proposedBufferWC: number;
  proposedBufferExpiryDate: string; // ISO date (yyyy-mm-dd)
  proposedBufferReasons: string;
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
  /** Minimum Return floor (IC recap band D) — not every Revenue Share deal has one. */
  rsMinReturnEnabled: boolean;
  rsMinReturnType: "Continual Rev Share" | "Grossed-Up";
  rsMinReturnPct: number; // used when rsMinReturnType is "Continual Rev Share"
  rsMinReturnMultiple: number; // used when rsMinReturnType is "Grossed-Up"
  rsMinReturnPayableMonths: number;
  /** Asset A/D Tenor/Term (IC recap band C) — Asset B's tenor lives in diTenorDays below. */
  projectedTermMonths: number;
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
  /** GDrive link to the underlying invoice/PO documents backing the payorInvoices rows. */
  payorInvoiceDocsLink: string;
  /** Calculator / Financials Google Sheets link (spec F27 & E90 — embedded on the IC card). */
  financialsLink: string;
  /** Manually confirmed: the Calculator GSheet at financialsLink is present and readable. */
  calculatorGSheetVerified: boolean;
  kpCreditMemo: string;
  /** Structured Company Credit Memo Q&A (Founders, Ownership, Reference Check, etc.). */
  kpCreditMemoSections: CreditMemoSection[];
  /** Only meaningful when fundingSource is Members (spec E101 display logic). */
  bankDetailsReviewed: boolean;
  /** Karmapreneur will withhold / will NOT withhold (spec E102). */
  taxWithholdings: "Yes" | "No" | "TBD";
  termSheetLink: string;
  projectCreditMemo: string;
  /** Structured Project Credit Memo Q&A (Financial Analysis, Rent Contract, Space, etc.). */
  projectCreditMemoSections: CreditMemoSection[];
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
    proposedWcSubLimit: 0,
    proposedMaxReviewDate: "",
    proposedBufferEnabled: false,
    proposedBufferTotal: 0,
    proposedBufferPO: 0,
    proposedBufferWC: 0,
    proposedBufferExpiryDate: "",
    proposedBufferReasons: "",
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
    rsMinReturnEnabled: false,
    rsMinReturnType: "Continual Rev Share",
    rsMinReturnPct: 0,
    rsMinReturnMultiple: 0,
    rsMinReturnPayableMonths: 0,
    projectedTermMonths: 0,
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
    payorInvoiceDocsLink: "",
    financialsLink: "",
    calculatorGSheetVerified: false,
    kpCreditMemo: "",
    kpCreditMemoSections: cloneCreditMemoTemplate(KP_CREDIT_MEMO_TEMPLATE),
    bankDetailsReviewed: false,
    // Spec default: "Karmapreneur will withhold" unless the brand's history says otherwise (see
    // mostRecentBrandProject — SubmissionForm pre-fills this live once a brand with history is typed).
    taxWithholdings: "Yes",
    termSheetLink: "",
    projectCreditMemo: "",
    projectCreditMemoSections: cloneCreditMemoTemplate(PROJECT_CREDIT_MEMO_TEMPLATE),
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
    const demos = demoDrafts();
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
      // Demo drafts are living examples, not real user data — always re-sync their referror
      // shape to the current demoDrafts() definition, so a stale or since-fixed shape (e.g. an
      // old buggy isMarketingReferral baked in by an earlier save) never lingers, no matter how
      // this submission was reached (direct URL, not just via the Home page's seed call).
      const demo = sub.status === "draft" ? demos.find((d) => d.id === sub.id) : undefined;
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
          referrors: demo ? demo.form.referrors : referrors,
          // Older saves without the flag never recorded an explicit marketing choice — default
          // to the name-search view, same as a brand-new submission.
          isMarketingReferral: demo ? demo.form.isMarketingReferral : legacy.isMarketingReferral ?? false,
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

// ─── Demo seed data (prototype: pre-populates the Due Diligence tab) ─────────

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
        finReviewReportsReviewed: "https://docs.google.com/document/d/demo-sks-financial-review/edit",
        finReviewPeriodEnding: "2026-06-30",
        finReviewLimitRecommendation: "Keep",
        finReviewLimitCurrent: 0,
        finReviewLimitRecommended: 0,
        finReviewNotes:
          "First financing request — reviewed 6 months of bank statements and POS reports across 4 existing outlets. Revenue trend stable, no red flags.",
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
        finReviewReportsReviewed: "https://docs.google.com/document/d/demo-spj-financial-review/edit",
        finReviewPeriodEnding: "2026-06-30",
        finReviewLimitRecommendation: "Keep",
        finReviewLimitCurrent: 0,
        finReviewLimitRecommended: 0,
        finReviewNotes:
          "Reviewed distributor's bank statements and PO history with Indomarco; cash flow supports the proposed daily-interest facility.",
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
        proposedWcSubLimit: 4_000_000_000,
        proposedBufferEnabled: true,
        proposedBufferTotal: 500_000_000,
        proposedBufferWC: 500_000_000,
        proposedBufferExpiryDate: "2027-01-15",
        proposedBufferReasons: "Headroom for seasonal inventory build ahead of Lebaran/year-end demand spikes.",
        finReviewReportsReviewed: "https://docs.google.com/document/d/demo-dc-financial-review/edit",
        finReviewPeriodEnding: "2026-06-30",
        finReviewLimitRecommendation: "Increase",
        finReviewLimitCurrent: 3_000_000_000,
        finReviewLimitRecommended: 5_000_000_000,
        finReviewNotes: "Reviewed the last 2 quarters of bank statements; revenue growth supports the limit increase to Rp5.0B.",
      },
    },
    {
      id: "sub-demo-gsm",
      status: "draft",
      leadStatusCode: "3",
      createdAt: "2026-07-13T08:20:00.000Z",
      updatedAt: "2026-07-14T09:10:00.000Z",
      submittedAt: null,
      form: {
        ...emptySubmissionForm(),
        brandName: "Garmen Sukses Mandiri",
        brandIsNew: true,
        projectName: "Garmen Sukses Mandiri (#1) — Invoice Financing: Zalora Indonesia",
        assetClass: "B - I",
        approvalType: "PO/Invoice",
        createdBy: "Sharfina Nindita",
        primaryAnalyst: "Sharfina Nindita",
        mainSector: "Assorted B2B Services and Manufacturing",
        subSector: "🎽Clothing Manufacturing",
        requestedAmount: 500_000_000,
        financingUse: "Domestic Invoice Financing",
        returnType: "Daily Interest",
        finReviewReportsReviewed: "https://docs.google.com/document/d/demo-gsm-financial-review/edit",
        finReviewPeriodEnding: "2026-06-30",
        finReviewLimitRecommendation: "Keep",
        finReviewLimitCurrent: 0,
        finReviewLimitRecommended: 0,
        finReviewNotes:
          "Reviewed 3 months of bank statements; first invoice financing facility, with Zalora Indonesia as the anchor buyer.",
        referrors: [
          {
            id: "row-demo-gsm-ref-1",
            name: "Yoga Pratama Nugraha",
            relationType: "Potential Karmapreneur",
            belongsToKP: null,
          },
        ],
        disbursements: [{ id: "row-demo-gsm-1", amount: 500_000_000, plannedDate: "2026-08-05" }],
      },
    },
    {
      // Brand-new KP requesting a plafond for the first time — no Current/Superseded on file,
      // so the Plafond section should render the "first plafond for this brand" absolute-proposed
      // path (see PlafondTable's showProposedAbsolute / brandPlafondHistory returning null).
      id: "sub-demo-new-plafond",
      status: "draft",
      leadStatusCode: "2",
      createdAt: "2026-07-15T10:00:00.000Z",
      updatedAt: "2026-07-15T10:00:00.000Z",
      submittedAt: null,
      form: {
        ...emptySubmissionForm(),
        brandName: "Boba Kenangan Sejahtera",
        brandIsNew: true,
        projectName: "Boba Kenangan Sejahtera (#1) — Working Capital + Plafond",
        assetClass: "D",
        approvalType: "Project+Plafond",
        createdBy: "Nila Layla Melinda",
        primaryAnalyst: "Nila Layla Melinda",
        mainSector: "F&B",
        subSector: "🧋Snacks, Drinks, & Desserts",
        requestedAmount: 1_500_000_000,
        financingUse: "Working Capital Financing",
        returnType: "Fixed Amount Repayment",
        proposedTotalLimit: 2_000_000_000,
        proposedWcSubLimit: 2_000_000_000,
        finReviewReportsReviewed: "https://docs.google.com/document/d/demo-new-plafond-financial-review/edit",
        finReviewPeriodEnding: "2026-06-30",
        finReviewLimitRecommendation: "Increase",
        finReviewLimitCurrent: 0,
        finReviewLimitRecommended: 2_000_000_000,
        finReviewNotes:
          "First plafond request for this brand-new KP; reviewed 3 months of bank statements ahead of first drawdown.",
      },
    },
    {
      // Already submitted (and IC-rejected — see lib/workflowStore.ts seedDefaultWorkflows()),
      // not a draft — a real editable submission so the Resubmit-to-IC flow has a live example.
      id: "proj-ayam-geprek",
      status: "submitted",
      createdAt: "2026-06-15T09:00:00.000Z",
      updatedAt: "2026-06-20T09:00:00.000Z",
      submittedAt: "2026-06-20T09:00:00.000Z",
      form: {
        ...emptySubmissionForm(),
        brandName: "Ayam Geprek Juara",
        brandIsNew: true,
        projectName: "Ayam Geprek Juara (#1) — Branch Opening: Depok",
        assetClass: "A",
        approvalType: "Project",
        createdBy: "Sharfina Nindita",
        submittedBy: "Sharfina Nindita",
        primaryAnalyst: "Sharfina Nindita",
        mainSector: "F&B",
        subSector: "🍔QSR - Full Meal",
        requestedAmount: 2_200_000_000,
        financingUse: "Branch Opening/Expansion",
        returnType: "Revenue Share",
        fundingSource: "KF & KCF",
        referralSource: "Karmapreneur",
        bankDetailsReviewed: true,
        taxWithholdings: "Yes",
        finReviewReportsReviewed: "https://docs.google.com/document/d/demo-ayam-geprek-financial-review/edit",
        finReviewPeriodEnding: "2026-05-31",
        finReviewLimitRecommendation: "Keep",
        finReviewLimitCurrent: 0,
        finReviewLimitRecommended: 0,
        finReviewNotes:
          "KP baru, belum ada plafond. Revenue outlet pertama (Bekasi) IDR 480jt/bulan, GM ~62%. Cashflow bersih, tidak ada hutang bank. Dana diajukan untuk pembukaan outlet ke-2 di Depok.",
        referrors: [
          {
            id: "row-demo-ag-ref-1",
            name: "Regina Tiffani",
            relationType: "Karmapreneur",
            belongsToKP: "Steak Hotel by Holycow, Shushu",
          },
        ],
        kpContacts: [
          {
            id: "kpc-ag1",
            name: "Fajar Nugroho",
            whatsapp: "+62 - 818 2233 4455",
            email: "fajar.nugroho@ayamgeprekjuara.id",
            role: "Founder / Direktur Utama",
            notesOnPerson:
              "Founder Ayam Geprek Juara, membuka outlet pertama di Bekasi 2024. Background operasional QSR — pernah jadi area supervisor di jaringan ayam goreng nasional. Sangat detail soal food cost dan SOP dapur.",
            isKeyPerson: true,
            slikFileUrl: "https://drive.google.com/file/slik-fajar-nugroho",
            slikExecSummary: "KTP Bekasi. Kredit motor lunas 2023. Tidak ada catatan negatif. SLIK bersih per Juni 2026.",
          },
        ],
        disbursements: [{ id: "row-demo-ag-1", amount: 2_200_000_000, plannedDate: "2026-07-10" }],
        branches: [
          {
            id: "br-ag1",
            name: "Depok — Margonda Raya",
            area: "Depok, Jawa Barat",
            gmapsLink: "https://maps.google.com/?q=Margonda+Raya+Depok",
            notes:
              "Outlet ke-2. Lokasi dekat kampus, traffic mahasiswa tinggi. Area 80m², kapasitas 40 covers. Kontrak sewa 3 tahun.",
            type: "Opening Branch",
          },
        ],
        ptDetails: [
          {
            id: "pt-ag1",
            name: "PT Geprek Juara Nusantara",
            bank: "BCA",
            accountNumber: "5310029981",
            accountholderName: "GEPREK JUARA NUSANTARA",
            slikFileUrl: "https://drive.google.com/file/slik-pt-geprek-juara",
            slikExecSummary: "PT aktif sejak 2024. Rekening BCA digunakan untuk semua transaksi outlet. SLIK bersih per Juni 2026.",
          },
        ],
        rsSourceOfRevenue: "Sales setelah dikurangi diskon, sebelum PB1/PPN, sebelum biaya EDC/QRIS",
        rsFrequency: "Monthly",
        rsDueDate: "Tanggal 10 setiap bulan",
        rsCapType: "Return Cap",
        rsCapMultiple: 1.35,
        rsStartType: "Anchored to Branch Opening",
        rsPreBEPPct: 7.5,
        rsPostBEPPct: 8.0,
        rsCarryPct: 2.0,
        kpCreditMemo:
          "**KP Credit Memo — Ayam Geprek Juara**\n\nKP baru, submission pertama. Outlet Bekasi (dibuka 2024) sudah profitable dengan GM ~62%. Founder berpengalaman di operasional QSR. Tidak ada hutang bank. Dana diajukan untuk ekspansi outlet ke-2 di Depok, area kampus dengan traffic tinggi.",
        kpCreditMemoSections: cloneCreditMemoTemplate(KP_CREDIT_MEMO_TEMPLATE).map((s) =>
          s.id !== "intro"
            ? s
            : {
                ...s,
                questions: [
                  {
                    ...s.questions[0],
                    answer:
                      "KP baru, submission pertama. Outlet Bekasi (dibuka 2024) sudah profitable dengan GM ~62%. Founder berpengalaman di operasional QSR. Tidak ada hutang bank.",
                  },
                ],
              }
        ),
        projectCreditMemo:
          "**Project Credit Memo — Branch Opening: Depok**\n\nProyek pertama. Revenue Share return-capped 1.35x. Proyeksi revenue IDR 220jt/bulan setelah ramp-up. IRR proyeksi 20.8%, MOIC 1.35x.",
        projectCreditMemoSections: cloneCreditMemoTemplate(PROJECT_CREDIT_MEMO_TEMPLATE).map((s) =>
          s.id !== "intro"
            ? s
            : {
                ...s,
                questions: [
                  {
                    ...s.questions[0],
                    answer: "Pembukaan outlet ke-2 di Depok (area kampus, traffic mahasiswa tinggi), didanai Revenue Share return-capped 1.35x.",
                  },
                ],
              }
        ),
        financialsLink: "https://docs.google.com/spreadsheets/d/example-ayam-geprek-calc",
      },
    },
  ];
}

/**
 * Seeds Due Diligence examples so the prototype opens with data. Demo drafts are living
 * examples, not real user data — every call re-syncs known demo IDs' lead status and referror
 * shape to the current demoDrafts() definition (so a stale or since-fixed shape never lingers),
 * and backfills any demo id not yet in storage (so a demo added after someone's first visit
 * still shows up). Never touches a real, non-demo draft the user created themselves.
 */
export function seedDemoSubmissions() {
  if (typeof window === "undefined") return;
  const demos = demoDrafts();
  const existing = listSubmissions().map((s) => {
    const demo = demos.find((d) => d.id === s.id);
    return demo && s.status === "draft"
      ? {
          ...s,
          leadStatusCode: demo.leadStatusCode,
          updatedAt: s.updatedAt ?? demo.updatedAt,
          form: { ...s.form, referrors: demo.form.referrors, isMarketingReferral: demo.form.isMarketingReferral },
        }
      : s;
  });
  const fresh = demos.filter((d) => !existing.some((s) => s.id === d.id));
  persist([...fresh, ...existing]);
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

/** Spec A97: flag accountholder/PT name mismatches, prior-project drift, and LMS sync on the review card. */
export function ptWarnings(pt: SubmissionPTRow, brandName: string): string[] {
  const warnings: string[] = [];
  if (pt.name.trim() && pt.accountholderName.trim() && pt.name.trim() !== pt.accountholderName.trim()) {
    warnings.push("Mismatch on accountholder and PT names");
  }
  const trimmedBrand = brandName.trim().toLowerCase();
  if (trimmedBrand && pt.name.trim()) {
    // mockProjects, not allReviewProjects() — the latter re-converts every submission via
    // submissionToICProject(), which calls ptWarnings() for each of its PT rows, recursing forever.
    const priorProjects = mockProjects
      .filter((p) => p.brandName.trim().toLowerCase() === trimmedBrand)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    if (priorProjects.length > 0) {
      const samePT = priorProjects
        .flatMap((p) => p.ptDetails)
        .find((prior) => prior.name.trim().toLowerCase() === pt.name.trim().toLowerCase());
      if (
        samePT &&
        samePT.accountNumber.trim() &&
        pt.accountNumber.trim() &&
        samePT.accountNumber.trim() !== pt.accountNumber.trim()
      ) {
        warnings.push("Account number differs from prior project");
      }

      const mostRecentPT = priorProjects[0].ptDetails[0];
      if (
        mostRecentPT &&
        mostRecentPT.name.trim() &&
        mostRecentPT.name.trim().toLowerCase() !== pt.name.trim().toLowerCase()
      ) {
        warnings.push("PT differs from prior project");
      }
    }
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

/** Shared brand-plafond lookup over a given project list — most recent by `submittedAt`. */
function latestBrandPlafond(brandName: string, projects: ICProject[]): PlafondInfo | null {
  const trimmed = brandName.trim();
  if (!trimmed) return null;
  const brandProjects = projects.filter(
    (p) => p.brandName.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (brandProjects.length === 0) return null;
  const latest = [...brandProjects].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  return latest.plafond;
}

/**
 * A brand's full plafond record (current + superseded + outstanding/remaining) —
 * the most recent review-project for this brand across mock seeds and submitted
 * submissions. Unlike `mostRecentBrandProject`, this returns the whole `PlafondInfo`
 * (not just `.current`), so callers (the submission form) can render Superseded
 * history too. Not for use inside `submissionToICProject()` — see its own
 * mock-only lookup below to avoid re-entering `allReviewProjects()`.
 */
export function brandPlafondHistory(brandName: string): PlafondInfo | null {
  return latestBrandPlafond(brandName, allReviewProjects());
}

/** Every distinct referror name recorded across mock + in-app submissions, plus every KP contact
 *  (a Karmapreneur is one of the most common referrors — surfacing their name here is what lets
 *  the Specific Referror search resolve them to their Brand). Placeholder contact rows (Coda-sync
 *  stand-ins with no real name yet) are excluded. */
export function getAllReferrors(): string[] {
  const seen = new Set<string>();
  mockProjects.forEach((p) => {
    if (p.specificReferror?.trim()) seen.add(p.specificReferror.trim());
    p.otherReferees.forEach((name) => {
      if (name.trim()) seen.add(name.trim());
    });
    p.kpContacts.forEach((c) => {
      if (c.name.trim() && !c.name.includes("(")) seen.add(c.name.trim());
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

  // mockProjects, not allReviewProjects() — the latter re-converts every submission via
  // submissionToICProject(), which would call this again for each, recursing forever.
  const brandPlafond = latestBrandPlafond(f.brandName, mockProjects);

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
          minReturn:
            f.rsMinReturnEnabled && f.rsMinReturnType === "Continual Rev Share" ? f.rsMinReturnPct : null,
          minReturnMultiple:
            f.rsMinReturnEnabled && f.rsMinReturnType === "Grossed-Up" ? f.rsMinReturnMultiple : null,
          minReturnPayableMonths: f.rsMinReturnEnabled ? f.rsMinReturnPayableMonths || null : null,
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
            wcSubLimit: f.proposedWcSubLimit,
            maxReviewDate: f.proposedMaxReviewDate || null,
            // Only carry buffer fields through when the analyst explicitly opted into a buffer —
            // guards against stale values lingering after the toggle is switched back off.
            buffer: f.proposedBufferEnabled ? f.proposedBufferTotal || undefined : undefined,
            bufferPO: f.proposedBufferEnabled ? f.proposedBufferPO || undefined : undefined,
            bufferWC: f.proposedBufferEnabled ? f.proposedBufferWC || undefined : undefined,
            bufferExpiryDate: f.proposedBufferEnabled ? f.proposedBufferExpiryDate || null : null,
            bufferReasons: f.proposedBufferEnabled ? f.proposedBufferReasons || null : null,
          }
        : null,
      current: brandPlafond?.current ?? null,
      outstandingTotal: brandPlafond?.outstandingTotal ?? 0,
      outstandingWC: brandPlafond?.outstandingWC,
      remainingTotal: brandPlafond?.remainingTotal ?? 0,
      remainingPO: brandPlafond?.remainingPO ?? 0,
      remainingWC: brandPlafond?.remainingWC ?? 0,
      superseded: brandPlafond?.superseded ?? [],
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
        projectedTermMonths: f.projectedTermMonths,
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
    payorInvoiceDocsLink: f.payorInvoiceDocsLink || null,
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
    kpCreditMemoSections: f.kpCreditMemoSections,
    projectCreditMemo: f.projectCreditMemo,
    projectCreditMemoSections: f.projectCreditMemoSections,
    financialsLink: f.financialsLink || null,
    calculatorGSheetVerified: f.calculatorGSheetVerified,
    projectNotes: [],

    ptDetails: f.ptDetails.map((pt) => ({
      id: pt.id,
      name: pt.name,
      bank: pt.bank,
      accountNumber: pt.accountNumber,
      accountholderName: pt.accountholderName,
      slikFileUrl: pt.slikFileUrl || null,
      slikExecSummary: pt.slikExecSummary || null,
      warnings: ptWarnings(pt, f.brandName),
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

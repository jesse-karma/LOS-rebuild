"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Database, PenLine, Plus, Trash2 } from "lucide-react";
import { ApprovalType } from "@/data/types";
import {
  ANALYSTS,
  ASSET_CLASSES,
  FUNDING_SOURCES,
  MARKETING_REFERRAL_SOURCES,
  SECTORS,
  STRUCTURED_LOAN_USES,
  approvalTypesForAssetClass,
  financingTypesForAssetClassAndApprovalType,
  subSectorsForSector,
} from "@/data/masterData";
import { isAssetAOrD, isAssetB, isAssetD } from "@/lib/assetClass";
import {
  SubmissionFormData,
  StoredSubmission,
  SubmissionBranchRow,
  SubmissionContactRow,
  SubmissionDisbursementRow,
  SubmissionFixedRow,
  SubmissionPayorRow,
  SubmissionPTRow,
  SubmissionReferrorRow,
  emptySubmissionForm,
  newRowId,
  requestedAmountWarning,
  saveSubmission,
  deleteSubmission,
  mostRecentBrandProject,
  getAllBrands,
  getAllReferrors,
  brandPlafondHistory,
  ptWarnings,
  submissionToICProject,
} from "@/lib/submissionsStore";
import { useProfile } from "@/lib/profileStore";
import { canEdit } from "@/lib/access";
import { resubmitProject } from "@/lib/workflowStore";
import { existingUboExposure, uboExposureLevel, brandsForPerson } from "@/lib/exposure";
import { PlafondCurrentAndSupersededRows } from "@/components/sections/ProjectAndPlafond";
import { PastProjectsRecap } from "@/components/sections/PastProjectsRecap";

function FormSection({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm px-5 py-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
        {title}
        {badge}
      </h2>
      {children}
    </div>
  );
}

/** "Master data" = closed enum in the production DB; "Free input" = analyst types it. */
function SourceBadge({ source }: { source: "master" | "free" }) {
  return source === "master" ? (
    <span
      title="Master data — value comes from a closed enum in the LOS master data"
      className="inline-flex items-center text-indigo-400 shrink-0"
    >
      <Database className="w-3 h-3" />
    </span>
  ) : (
    <span
      title="Free input — analyst fills it in"
      className="inline-flex items-center text-gray-300 shrink-0"
    >
      <PenLine className="w-3 h-3" />
    </span>
  );
}

/** Label-left / input-right row, mirroring the IC card's DataRow. */
function Field({
  label,
  source,
  hint,
  children,
}: {
  label: string;
  source: "master" | "free";
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 w-44 shrink-0 pt-2.5">
        {label}
        <SourceBadge source={source} />
      </span>
      <div className="flex-1 min-w-0">
        {children}
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
    </div>
  );
}

/** Label-above-input, for tiling short fields (dropdowns, small amounts) into a grid instead of
 *  each one claiming a full-width row. Pass `span="full"` for a field that should break out of
 *  the grid columns (e.g. a textarea that needs real width). */
function CompactField({
  label,
  source,
  hint,
  span,
  children,
}: {
  label: string;
  source: "master" | "free";
  hint?: string;
  span?: "full";
  children: React.ReactNode;
}) {
  return (
    <div className={span === "full" ? "sm:col-span-2 lg:col-span-3" : undefined}>
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 mb-1">
        {label}
        <SourceBadge source={source} />
      </span>
      <div className="min-w-0">
        {children}
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      </div>
    </div>
  );
}

/** Inline warning per spec column U — shown next to the offending field. */
function InlineWarning({ message }: { message: string }) {
  return (
    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1.5">
      ⚠ {message}
    </p>
  );
}

/** Editable table shell matching the IC card table styling (Plafond / Contacts). */
function EditTable({
  headers,
  minWidthCls,
  children,
}: {
  headers: string[];
  minWidthCls: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className={`w-full text-xs border border-gray-100 rounded-lg overflow-hidden ${minWidthCls}`}>
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left">
            {headers.map((h, i) => (
              <th
                key={`${h}-${i}`}
                className={`py-2 px-2 font-medium whitespace-nowrap ${i === 0 ? "pl-3" : ""} ${
                  i === 0 && h === "#" ? "w-8" : ""
                } ${i === headers.length - 1 && h === "" ? "w-10" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">{children}</tbody>
      </table>
    </div>
  );
}

/** Renders a structured credit memo (KP or Project) as fixed question groups the analyst answers. */
function CreditMemoSectionsEditor({
  sections,
  onAnswerChange,
  onDateChange,
}: {
  sections: SubmissionFormData["kpCreditMemoSections"];
  onAnswerChange: (sectionId: string, questionId: string, value: string) => void;
  onDateChange: (sectionId: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id}>
          {section.title && (
            <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{section.title}</h4>
              {section.lastCheckedDate !== undefined && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="text-[11px] text-gray-400">Last Checked</label>
                  <input
                    type="date"
                    className="border border-gray-300 rounded px-1.5 py-0.5 text-xs"
                    value={section.lastCheckedDate}
                    onChange={(e) => onDateChange(section.id, e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <EditTable headers={["Question", "Answer"]} minWidthCls="min-w-[520px]">
            {section.questions.map((q) => (
              <tr key={q.id} className="align-top">
                <td className="py-2 pl-3 pr-2 w-64 text-gray-600">{q.label}</td>
                <td className="py-2 px-2">
                  <textarea
                    className={`${cellInputCls} resize-y`}
                    rows={1}
                    value={q.answer}
                    onChange={(e) => onAnswerChange(section.id, q.id, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </EditTable>
        </div>
      ))}
    </div>
  );
}

function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Remove row"
      className="text-red-400 hover:text-red-600 transition-colors mt-1.5"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mt-2"
    >
      <Plus className="w-4 h-4" />
      {label}
    </button>
  );
}

/** Icon-only "add" affordance for a transposed table's trailing header column — mirrors
 *  RemoveRowButton's icon-only style so the header row reads as one consistent action row. */
function AddColumnButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="inline-flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded px-2 py-1 whitespace-nowrap"
    >
      <Plus className="w-3.5 h-3.5" />
      Add
    </button>
  );
}

/** One row of a transposed table — a field label on the left, one cell per entity (contact/PT)
 *  to the right. Lets a multi-field entity list read top-to-bottom (fields) / left-to-right
 *  (entities) instead of the reverse, without the wide-table horizontal scroll that causes. */
function TransposedFieldRow<T extends { id: string }>({
  label,
  rows,
  renderCell,
}: {
  label: string;
  rows: T[];
  renderCell: (row: T) => React.ReactNode;
}) {
  return (
    <tr className="odd:bg-gray-50/50">
      <td className="py-2 px-3 font-semibold text-gray-700 text-xs whitespace-nowrap align-top">{label}</td>
      {rows.map((r) => (
        <td key={r.id} className="py-2 px-3 align-top w-56">
          {renderCell(r)}
        </td>
      ))}
    </tr>
  );
}

/** Auto-detect who a Specific Referror name is: Karma team, a known Karmapreneur (and which
 *  Brand(s) they're tied to), or nobody we recognize yet ("new") — the name alone decides the
 *  relation, so there's nothing left for the analyst to pick manually. */
function classifyReferror(name: string): {
  kind: "staff" | "karmapreneur" | "new";
  brands: string[];
  relationLabel: string;
} {
  const trimmed = name.trim();
  if (!trimmed) return { kind: "new", brands: [], relationLabel: "" };
  if (ANALYSTS.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
    return { kind: "staff", brands: [], relationLabel: "Karma Staff" };
  }
  const brands = Array.from(brandsForPerson(trimmed));
  if (brands.length > 0) return { kind: "karmapreneur", brands, relationLabel: "Karmapreneur" };
  return { kind: "new", brands: [], relationLabel: "Potential Karmapreneur" };
}

function blankReferror(): SubmissionReferrorRow {
  return { id: newRowId(), name: "", relationType: "", belongsToKP: null };
}

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

/** Compact input for table cells. */
const cellInputCls =
  "w-full border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

/** Format digits with id-ID thousand separators as the user types. */
function formatAmountInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

function parseAmount(formatted: string): number {
  return Number(formatted.replace(/[^\d]/g, "")) || 0;
}

function fmtIdr(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

// Starter rows the analyst never touched — dropped on save/submit.

function contactIsBlank(c: SubmissionContactRow): boolean {
  return (
    !c.name.trim() &&
    !c.whatsapp.trim() &&
    !c.email.trim() &&
    !c.role.trim() &&
    !c.notesOnPerson.trim() &&
    !c.slikFileUrl.trim() &&
    !c.slikExecSummary.trim() &&
    !c.isKeyPerson
  );
}

function disbursementIsBlank(d: SubmissionDisbursementRow): boolean {
  return d.amount === 0 && !d.plannedDate;
}

function branchIsBlank(b: SubmissionBranchRow): boolean {
  return !b.name.trim() && !b.area.trim() && !b.gmapsLink.trim() && !b.notes.trim();
}

function ptIsBlank(pt: SubmissionPTRow): boolean {
  return (
    !pt.name.trim() &&
    !pt.bank.trim() &&
    !pt.accountNumber.trim() &&
    !pt.accountholderName.trim() &&
    !pt.slikFileUrl.trim() &&
    !pt.slikExecSummary.trim()
  );
}

function fixedRowIsBlank(r: SubmissionFixedRow): boolean {
  return r.principal === 0 && r.interest === 0 && r.carry === 0;
}

/** The lead-in question's answer for a structured credit memo — used as the "is this filled in" check. */
function memoIntroAnswer(sections: SubmissionFormData["kpCreditMemoSections"]): string {
  return sections.find((s) => s.id === "intro")?.questions[0]?.answer ?? "";
}

function payorIsBlank(r: SubmissionPayorRow): boolean {
  return (
    !r.payorLabel.trim() &&
    !r.poOrInvoiceNumber.trim() &&
    !r.dueDate &&
    r.amount === 0 &&
    !r.payeeProjects.trim() &&
    !r.notes.trim()
  );
}

// Blank-row factories, shared by the [+] buttons and the starter rows.

function isValidWhatsApp(value: string): boolean {
  if (!value.trim()) return true; // Allow empty
  const waRegex = /^\+\d{1,3}\s-\s[\d\s]+$/;
  return waRegex.test(value.trim());
}

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true; // Allow empty
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim());
}

function blankContact(): SubmissionContactRow {
  return {
    id: newRowId(),
    name: "",
    whatsapp: "",
    email: "",
    role: "",
    notesOnPerson: "",
    isKeyPerson: false,
    slikFileUrl: "",
    slikExecSummary: "",
  };
}

function blankDisbursement(): SubmissionDisbursementRow {
  return { id: newRowId(), amount: 0, plannedDate: "" };
}

function blankBranch(): SubmissionBranchRow {
  return { id: newRowId(), name: "", area: "", gmapsLink: "", notes: "", type: "Opening Branch" };
}

function blankFixedRow(): SubmissionFixedRow {
  return { id: newRowId(), principal: 0, interest: 0, carry: 0 };
}

function blankPayorRow(): SubmissionPayorRow {
  return {
    id: newRowId(),
    payorLabel: "",
    poOrInvoiceNumber: "",
    dueDate: "",
    amount: 0,
    payorType: "Corporate",
    payeeProjects: "",
    notes: "",
    riskLevel: "Medium",
  };
}

function blankPT(): SubmissionPTRow {
  return {
    id: newRowId(),
    name: "",
    bank: "",
    accountNumber: "",
    accountholderName: "",
    slikFileUrl: "",
    slikExecSummary: "",
  };
}

/** The only Financing Uses that name branches — gates the Branch Details section. */
function isBranchFinancingUse(financingUse: string): boolean {
  return financingUse === "Branch Opening/Expansion" || financingUse === "Branch Renovation";
}

/**
 * Whenever the A&D sections are visible, each table keeps at least one starter
 * row so analysts see the columns to fill, not just [+]. Untouched starter rows
 * are stripped again on save/submit.
 */
function withStarterRows(f: SubmissionFormData): SubmissionFormData {
  const next = { ...f };
  const isProject = f.approvalType !== "Plafond";
  if (isAssetAOrD(f.assetClass)) {
    if (next.kpContacts.length === 0) next.kpContacts = [blankContact()];
    if (next.ptDetails.length === 0) next.ptDetails = [blankPT()];
    if (isProject && isBranchFinancingUse(f.financingUse) && next.branches.length === 0) {
      next.branches = [blankBranch()];
    }
  }
  if (isProject && next.disbursements.length === 0) next.disbursements = [blankDisbursement()];
  if (isProject && isAssetB(f.assetClass) && next.payorInvoices.length === 0) {
    next.payorInvoices = [blankPayorRow()];
  }
  if (f.returnType.includes("Fixed Amount Repayment") && next.fixedSchedule.length === 0) {
    next.fixedSchedule = [blankFixedRow()];
  }
  // Default view is a name search box, not the marketing dropdown — always keep one row
  // around to search in unless the analyst has explicitly picked a marketing channel.
  if (!next.isMarketingReferral && next.referrors.length === 0) {
    next.referrors = [blankReferror()];
  }
  return next;
}

interface Props {
  submission: StoredSubmission;
  /** True for a never-saved submission — lets the active profile pre-fill Primary Analyst. */
  isNew?: boolean;
}

export function SubmissionForm({ submission, isNew = false }: Props) {
  const router = useRouter();
  const { user } = useProfile();
  // A draft sits in the Funding Lead stage: only the Investments Team can fill it.
  const readOnly = !canEdit(user.team, "submission", "funding_lead");
  // Merge over defaults so drafts saved before new fields existed stay controlled.
  const [form, setForm] = useState<SubmissionFormData>(() =>
    withStarterRows({
      ...emptySubmissionForm(),
      ...submission.form,
      ptDetails: submission.form.ptDetails ?? [],
    })
  );
  const [amountText, setAmountText] = useState(
    submission.form.requestedAmount ? formatAmountInput(String(submission.form.requestedAmount)) : ""
  );
  const [plafondTexts, setPlafondTexts] = useState({
    total: submission.form.proposedTotalLimit ? formatAmountInput(String(submission.form.proposedTotalLimit)) : "",
    po: submission.form.proposedPOSubLimit ? formatAmountInput(String(submission.form.proposedPOSubLimit)) : "",
    wc: submission.form.proposedWcSubLimit ? formatAmountInput(String(submission.form.proposedWcSubLimit)) : "",
    bufferTotal: submission.form.proposedBufferTotal
      ? formatAmountInput(String(submission.form.proposedBufferTotal))
      : "",
    bufferPO: submission.form.proposedBufferPO ? formatAmountInput(String(submission.form.proposedBufferPO)) : "",
    bufferWC: submission.form.proposedBufferWC ? formatAmountInput(String(submission.form.proposedBufferWC)) : "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState(form.brandName);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [openReferrorRowId, setOpenReferrorRowId] = useState<string | null>(null);

  // Extract the free text part from the existing project name (for edit mode)
  const existingFreeText = (() => {
    const parts = form.projectName.split(" - ");
    if (parts.length > 1) {
      return parts.slice(1).join(" - ");
    }
    return "";
  })();
  const [projectFreeText, setProjectFreeText] = useState(existingFreeText);
  
  const allBrands = getAllBrands();
  const filteredBrands = allBrands.filter((b) =>
    b.toLowerCase().includes(brandSearch.toLowerCase())
  );

  // Known referrors = past referror names + the Karma team directory (so staff are
  // suggested even before they've ever been recorded as a referror).
  const allReferrors = Array.from(new Set([...getAllReferrors(), ...ANALYSTS])).sort();

  // Build the full project name. No "#N" project number and no asset-class type
  // label here — the project isn't disbursed yet, so neither applies. The "#N"
  // is assigned once disbursed, counting from #1 at that point.
  const generateProjectName = () => {
    const baseParts = [form.brandName];
    if (projectFreeText.trim()) {
      baseParts.push(projectFreeText.trim());
    }
    return baseParts.join(" - ");
  };

  // On a brand-new form, the creator becomes Created by and the default Primary Analyst (spec S8).
  useEffect(() => {
    if (isNew) {
      setForm((f) => ({
        ...f,
        createdBy: user.name,
        primaryAnalyst: user.team === "Investments Team" ? user.name : f.primaryAnalyst,
      }));
    }
  }, [isNew, user]);

  // Sync brand search with form brandName when it changes
  useEffect(() => {
    if (form.brandName !== brandSearch) {
      setBrandSearch(form.brandName);
    }
  }, [form.brandName]);

  // Update the form's projectName whenever the parts change
  useEffect(() => {
    const newProjectName = generateProjectName();
    if (form.projectName !== newProjectName) {
      set("projectName", newProjectName);
    }
  }, [form.brandName, projectFreeText]);

  // Extract free text from projectName if it's updated externally (e.g., initial load)
  useEffect(() => {
    const parts = form.projectName.split(" - ");
    if (parts.length > 1) {
      const freeTextFromName = parts.slice(1).join(" - ");
      if (freeTextFromName !== projectFreeText) {
        setProjectFreeText(freeTextFromName);
      }
    }
  }, [form.projectName]);

  const hasPlafond = form.approvalType.includes("Plafond");
  const isProjectType = form.approvalType !== "Plafond";
  // The A&D spec sections (contacts, terms, PT, memos) only apply to Asset A / D submissions.
  const isAD = isAssetAOrD(form.assetClass);
  const isB = isAssetB(form.assetClass);
  const isAssetA = form.assetClass.trim() === "A";
  const isD = isAssetD(form.assetClass);

  // The brand's full plafond record (current + superseded + outstanding/remaining), if any —
  // shown as reference at the top of the Plafond section so the analyst knows whether this is
  // a new plafond request or an update, and can see the brand's limit history.
  const brandPlafond = brandPlafondHistory(form.brandName);
  // Which deal-terms subsection the selected Return Type calls for
  const wantsRevShare = form.returnType.includes("Revenue Share") || form.returnType === "Profit Share";
  const wantsFixed = form.returnType.includes("Fixed Amount Repayment");
  const wantsDaily = form.returnType === "Daily Interest";

  // Dependent master-data option lists
  const approvalTypeOptions = approvalTypesForAssetClass(form.assetClass);
  const financingTypeOptions = financingTypesForAssetClassAndApprovalType(form.assetClass, form.approvalType);
  const subSectorOptions = subSectorsForSector(form.mainSector);

  // Live warnings (spec column U)
  const amountWarning = requestedAmountWarning({
    ...form,
    requestedAmount: parseAmount(amountText),
    proposedTotalLimit: parseAmount(plafondTexts.total),
  });
  const filledDisbursements = form.disbursements.filter((d) => !disbursementIsBlank(d));
  const disbursementSum = filledDisbursements.reduce((sum, d) => sum + d.amount, 0);
  const disbursementMismatch =
    filledDisbursements.length > 0 && disbursementSum !== parseAmount(amountText);
  const proposedIDR =
    form.requestedAmountCurrency === "IDR" ? parseAmount(amountText) : parseAmount(amountText) * 16000;

  function set<K extends keyof SubmissionFormData>(key: K, value: SubmissionFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Live preview of the IC-side project — recomputed on every keystroke so the Proposed &
  // Past Projects Recap table (below) reads the exact same shape the IC review page will,
  // with brand history already merged in via submissionToICProject's own pastProjects build.
  const previewProject = submissionToICProject({ ...submission, form });

  /** Asset Class drives allowed Approval Types (ENUM §3/§4) and Financing Types (§5b). */
  function setAssetClass(assetClass: string) {
    setForm((f) => {
      const allowedTypes = approvalTypesForAssetClass(assetClass);
      const approvalType = (
        allowedTypes.includes(f.approvalType) ? f.approvalType : allowedTypes[0]
      ) as ApprovalType;
      const allowedReturns = financingTypesForAssetClassAndApprovalType(assetClass, approvalType);
      const returnType = allowedReturns.includes(f.returnType) ? f.returnType : allowedReturns[0];
      return withStarterRows({ ...f, assetClass, approvalType, returnType });
    });
  }

  function setApprovalType(approvalType: ApprovalType) {
    setForm((f) => {
      const allowedReturns = financingTypesForAssetClassAndApprovalType(f.assetClass, approvalType);
      const returnType = allowedReturns.includes(f.returnType) ? f.returnType : allowedReturns[0];
      return withStarterRows({ ...f, approvalType, returnType });
    });
  }

  function setSector(mainSector: string) {
    setForm((f) => {
      const allowed = subSectorsForSector(mainSector);
      return { ...f, mainSector, subSector: allowed.includes(f.subSector) ? f.subSector : "" };
    });
  }

  function addReferrorRow() {
    setForm((f) => ({ ...f, isMarketingReferral: false, referrors: [...f.referrors, blankReferror()] }));
  }

  /** Typing/selecting a referror's name auto-detects who they are — Karma team, a known
   *  Karmapreneur (and which Brand(s) they're tied to), or "Potential Karmapreneur" if we don't
   *  recognize them yet — the name alone decides the relation, nothing left to pick manually. */
  function updateReferrorName(id: string, name: string) {
    const info = classifyReferror(name);
    updateRow("referrors", id, {
      name,
      relationType: info.relationLabel,
      belongsToKP: info.kind === "karmapreneur" ? info.brands.join(", ") : null,
    });
  }

  /** The Specific Referror search's pinned "Marketing" option — no person to search for. */
  function selectMarketingChannel() {
    setForm((f) => ({ ...f, isMarketingReferral: true, referrors: [], referralSource: "Cold calling" }));
  }

  /** Leaves Marketing mode to search for a specific person again. */
  function switchBackToReferrorSearch() {
    setForm((f) => ({ ...f, isMarketingReferral: false, referrors: [blankReferror()] }));
  }

  // ── Dynamic row helpers ([+]/[✍️]/[-] pattern) ─────────────────────────────

  function updateRow<
    K extends
      | "kpContacts"
      | "disbursements"
      | "branches"
      | "ptDetails"
      | "fixedSchedule"
      | "payorInvoices"
      | "referrors"
      | "kpCreditMemoSections"
      | "projectCreditMemoSections"
  >(
    key: K,
    id: string,
    patch: Partial<SubmissionFormData[K][number]>
  ) {
    setForm((f) => ({
      ...f,
      [key]: (f[key] as Array<{ id: string }>).map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }));
  }

  function updateMemoAnswer(
    key: "kpCreditMemoSections" | "projectCreditMemoSections",
    sectionId: string,
    questionId: string,
    answer: string
  ) {
    setForm((f) => ({
      ...f,
      [key]: f[key].map((s) =>
        s.id === sectionId
          ? { ...s, questions: s.questions.map((q) => (q.id === questionId ? { ...q, answer } : q)) }
          : s
      ),
    }));
  }

  function removeRow(
    key:
      | "kpContacts"
      | "disbursements"
      | "branches"
      | "ptDetails"
      | "fixedSchedule"
      | "payorInvoices"
      | "referrors",
    id: string
  ) {
    setForm((f) =>
      withStarterRows({
        ...f,
        [key]: (f[key] as Array<{ id: string }>).filter((row) => row.id !== id),
      })
    );
  }

  function addContact() {
    setForm((f) => ({ ...f, kpContacts: [...f.kpContacts, blankContact()] }));
  }

  function addPT() {
    setForm((f) => ({ ...f, ptDetails: [...f.ptDetails, blankPT()] }));
  }

  function addDisbursement() {
    setForm((f) => ({ ...f, disbursements: [...f.disbursements, blankDisbursement()] }));
  }

  function addBranch() {
    setForm((f) => ({ ...f, branches: [...f.branches, blankBranch()] }));
  }

  function addFixedRow() {
    setForm((f) => ({ ...f, fixedSchedule: [...f.fixedSchedule, blankFixedRow()] }));
  }

  function addPayorRow() {
    setForm((f) => ({ ...f, payorInvoices: [...f.payorInvoices, blankPayorRow()] }));
  }

  /** Return type drives which deal-terms subsection (and starter rows) apply. */
  function setReturnType(returnType: string) {
    setForm((f) => withStarterRows({ ...f, returnType }));
  }

  function currentDraft(status: "draft" | "submitted"): StoredSubmission {
    return {
      ...submission,
      status,
      submittedAt: status === "submitted" ? new Date().toISOString() : submission.submittedAt,
      form: {
        ...form,
        // Spec S8: Submitted by is set on submission and cleared when pulled back to draft.
        submittedBy: status === "submitted" ? user.name : "",
        kpContacts: form.kpContacts.filter((c) => !contactIsBlank(c)),
        disbursements: form.disbursements.filter((d) => !disbursementIsBlank(d)),
        branches: form.branches.filter((b) => !branchIsBlank(b)),
        ptDetails: form.ptDetails.filter((pt) => !ptIsBlank(pt)),
        fixedSchedule: form.fixedSchedule.filter((r) => !fixedRowIsBlank(r)),
        payorInvoices: form.payorInvoices.filter((r) => !payorIsBlank(r)),
        requestedAmount: parseAmount(amountText),
        proposedTotalLimit: parseAmount(plafondTexts.total),
        proposedPOSubLimit: parseAmount(plafondTexts.po),
        proposedWcSubLimit: parseAmount(plafondTexts.wc),
        proposedBufferTotal: parseAmount(plafondTexts.bufferTotal),
        proposedBufferPO: parseAmount(plafondTexts.bufferPO),
        proposedBufferWC: parseAmount(plafondTexts.bufferWC),
      },
    };
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!form.brandName.trim()) errs.push("Brand is required.");
    if (isProjectType && parseAmount(amountText) <= 0) errs.push("Requested Amount must be greater than zero.");
    if (hasPlafond && parseAmount(plafondTexts.total) <= 0)
      errs.push("Proposed Total Limit must be greater than zero for a Plafond submission.");
    if (!form.finReviewReportsReviewed.trim())
      errs.push("Financial Review: a link is required.");

    form.kpContacts.filter((c) => !contactIsBlank(c)).forEach((c, i) => {
      if (!c.name.trim()) errs.push(`Karmapreneur Contact ${i + 1}: Name is required.`);
      if (!c.role.trim()) errs.push(`Karmapreneur Contact ${i + 1}: Role is required.`);
      if (!isValidWhatsApp(c.whatsapp))
        errs.push(`Karmapreneur Contact ${i + 1} (${c.name || "unnamed"}): WhatsApp must be in format +[Country Code] - [Number].`);
      if (!isValidEmail(c.email))
        errs.push(`Karmapreneur Contact ${i + 1} (${c.name || "unnamed"}): Must be a valid email address.`);
      if (c.isKeyPerson && !c.slikFileUrl.trim())
        errs.push(`Karmapreneur Contact ${i + 1} (${c.name || "unnamed"}): SLIK-Key Person File URL is required for a Key Person.`);
      if (c.isKeyPerson && !c.slikExecSummary.trim())
        errs.push(`Karmapreneur Contact ${i + 1} (${c.name || "unnamed"}): SLIK-Key Person Exec Summary is required for a Key Person.`);
    });

    form.ptDetails.filter((pt) => !ptIsBlank(pt)).forEach((pt, i) => {
      if (!pt.name.trim()) errs.push(`PT Detail ${i + 1}: Name is required.`);
    });

    form.disbursements.filter((d) => !disbursementIsBlank(d)).forEach((d, i) => {
      if (!d.plannedDate) errs.push(`Disbursement ${i + 1}: Planned Disbursement Date is required.`);
      if (d.amount <= 0) errs.push(`Disbursement ${i + 1}: Disbursement Amount is required.`);
    });

    form.branches.filter((b) => !branchIsBlank(b)).forEach((b, i) => {
      if (!b.area.trim()) errs.push(`Branch ${i + 1} (${b.name || "unnamed"}): Branch Area is required.`);
      if (!b.gmapsLink.trim()) errs.push(`Branch ${i + 1} (${b.name || "unnamed"}): Gmaps Link is required.`);
      if (!b.type) errs.push(`Branch ${i + 1} (${b.name || "unnamed"}): Type is required.`);
    });

    const filledPayorRows = form.payorInvoices.filter((r) => !payorIsBlank(r));
    filledPayorRows.forEach((r, i) => {
      if (!r.payorLabel.trim()) errs.push(`Payor / Invoice ${i + 1}: Payor is required.`);
      if (!r.poOrInvoiceNumber.trim()) errs.push(`Payor / Invoice ${i + 1} (${r.payorLabel || "unnamed"}): PO / Invoice # is required.`);
      if (!r.dueDate) errs.push(`Payor / Invoice ${i + 1} (${r.payorLabel || "unnamed"}): Due Date is required.`);
      if (r.amount <= 0) errs.push(`Payor / Invoice ${i + 1} (${r.payorLabel || "unnamed"}): Amount is required.`);
    });
    if (filledPayorRows.length > 0 && !form.payorInvoiceDocsLink.trim())
      errs.push("GDrive Link to Underlying Invoice/PO Docs is required.");

    if (isAD && !memoIntroAnswer(form.kpCreditMemoSections).trim())
      errs.push('Company (KP) Credit Memo: "Why should we work with this Karmapreneur?" is required.');
    if (!memoIntroAnswer(form.projectCreditMemoSections).trim())
      errs.push('Project Credit Memo: "What is the project for / branch(es) to be opened?" is required.');

    return errs;
  }

  function handleSaveDraft() {
    saveSubmission(currentDraft("draft"));
    router.push("/");
  }

  /** Already-submitted means this is a rejected project being edited and sent back — not a first submit. */
  const isResubmit = submission.status === "submitted";

  function handleSubmitToIC() {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;
    saveSubmission(currentDraft("submitted"));
    if (isResubmit) resubmitProject(submission.id);
    router.push("/");
  }

  function handleDeleteDraft() {
    deleteSubmission(submission.id);
    router.push("/");
  }

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        All submissions
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analyst Submission</h1>
        <p className="text-sm text-gray-500 mt-1">
          {readOnly
            ? `View only — submissions are filled and submitted by the Investments Team (you are on the ${user.team}).`
            : "Fill in the project details, then submit to IC. You can save a draft at any time."}
        </p>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <Database className="w-3 h-3 text-indigo-400" />
            Master data — value comes from a closed enum in the LOS master data
          </span>
          <span className="inline-flex items-center gap-1.5">
            <PenLine className="w-3 h-3 text-gray-300" />
            Free input — analyst fills it in
          </span>
        </div>
      </div>

      {/* fieldset[disabled] enforces the field-level rule: every input inside is read-only for non-Investments teams */}
      <fieldset disabled={readOnly} className="space-y-4 min-w-0">
        {/* PIC and Karmapreneur Details side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormSection title="PIC">
            <Field label="Created by" source="free" hint="Set automatically to the card creator">
              <input className={`${inputCls} bg-gray-50 text-gray-500`} value={form.createdBy || "—"} readOnly />
            </Field>
            {/* Spec C8: Submitted by is not shown prior to the IC submission stage. */}
            <Field label="Primary Analyst" source="master" hint="From the Karma Team table">
              <select
                className={inputCls}
                value={form.primaryAnalyst}
                onChange={(e) => set("primaryAnalyst", e.target.value)}
              >
                {ANALYSTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Secondary Analyst" source="master" hint="From the Karma Team table">
              <select
                className={inputCls}
                value={form.secondaryAnalyst}
                onChange={(e) => set("secondaryAnalyst", e.target.value)}
              >
                <option value="">— None —</option>
                {ANALYSTS.filter((a) => a !== form.primaryAnalyst).map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
          </FormSection>

          <FormSection title="Karmapreneur Details">
            {form.isMarketingReferral ? (
              <Field label="Referral Source" source="master" hint="Which marketing channel brought them in">
                <select
                  className={inputCls}
                  value={form.referralSource}
                  onChange={(e) => set("referralSource", e.target.value)}
                >
                  {MARKETING_REFERRAL_SOURCES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={switchBackToReferrorSearch}
                  className="text-xs text-blue-600 hover:underline mt-1.5"
                >
                  Search for a person instead
                </button>
              </Field>
            ) : (
              <Field label="Specific Referror" source="free" hint="Search a known name — new names welcome too">
                <div className="space-y-2">
                  {form.referrors.map((r, i) => {
                    const info = classifyReferror(r.name);
                    return (
                      <div key={r.id} className="border border-gray-200 rounded-lg p-2.5">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 relative">
                            <input
                              className={inputCls}
                              value={r.name}
                              onChange={(e) => updateReferrorName(r.id, e.target.value)}
                              onFocus={() => setOpenReferrorRowId(r.id)}
                              onBlur={() =>
                                setTimeout(
                                  () => setOpenReferrorRowId((cur) => (cur === r.id ? null : cur)),
                                  200
                                )
                              }
                              placeholder="e.g. Regina Tiffani"
                            />
                            {openReferrorRowId === r.id && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                {i === 0 && (
                                  <div
                                    className="px-3 py-2 cursor-pointer hover:bg-amber-50 text-sm text-amber-800 border-b border-gray-100 font-medium"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={selectMarketingChannel}
                                  >
                                    🏷️ Marketing / cold outreach — no specific person
                                  </div>
                                )}
                                {allReferrors
                                  .filter((name) => name.toLowerCase().includes(r.name.toLowerCase()))
                                  .filter(
                                    (name) =>
                                      !form.referrors.some(
                                        (other) =>
                                          other.id !== r.id &&
                                          other.name.toLowerCase() === name.toLowerCase()
                                      )
                                  )
                                  .map((name) => (
                                    <div
                                      key={name}
                                      className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        updateReferrorName(r.id, name);
                                        setOpenReferrorRowId(null);
                                      }}
                                    >
                                      {name}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                          {form.referrors.length > 1 && (
                            <RemoveRowButton onClick={() => removeRow("referrors", r.id)} />
                          )}
                        </div>

                        {r.name.trim() && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {info.kind === "staff" && (
                              <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-1">
                                🧑‍💼 Karma team member
                              </span>
                            )}
                            {info.kind === "karmapreneur" && (
                              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                                🔗 Karmapreneur — {info.brands.join(", ")}
                              </span>
                            )}
                            {info.kind === "new" && (
                              <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                                ➕ New / unrecognized
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <AddRowButton label="Add another referror" onClick={addReferrorRow} />
                </div>
              </Field>
            )}
          </FormSection>
        </div>

        <FormSection title="Project's Application">
          <Field label="Brand" source="free" hint="Lookup to Karmapreneur — type a new name to create it">
            <div className="relative">
              <input
                className={inputCls}
                value={brandSearch}
                onChange={(e) => {
                  setBrandSearch(e.target.value);
                  const recent = mostRecentBrandProject(e.target.value);
                  setForm((f) => ({
                    ...f,
                    brandName: e.target.value,
                    // Pre-fill "[Brand] - " while the analyst hasn't typed a custom name
                    projectName:
                      !f.projectName || f.projectName === `${f.brandName} - `
                        ? `${e.target.value} - `
                        : f.projectName,
                    // Pre-fill Sector/Sub-Sector and Tax Withholdings from the brand's most recent
                    // project, while the analyst hasn't touched them from their defaults.
                    mainSector: recent?.sector && f.mainSector === "F&B" ? recent.sector : f.mainSector,
                    subSector: recent?.subSector && !f.subSector ? recent.subSector : f.subSector,
                    taxWithholdings:
                      recent?.taxWithholdings && f.taxWithholdings === "Yes"
                        ? recent.taxWithholdings
                        : f.taxWithholdings,
                  }));
                }}
                onFocus={() => setIsBrandDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsBrandDropdownOpen(false), 200)}
                placeholder="e.g. Kopi Tuku"
              />
              {isBrandDropdownOpen && filteredBrands.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredBrands.map((brand) => (
                    <div
                      key={brand}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                      onClick={() => {
                        setBrandSearch(brand);
                        const recent = mostRecentBrandProject(brand);
                        setForm((f) => ({
                          ...f,
                          brandName: brand,
                          // Pre-fill "[Brand] - " while the analyst hasn't typed a custom name
                          projectName:
                            !f.projectName || f.projectName === `${f.brandName} - `
                              ? `${brand} - `
                              : f.projectName,
                          // Pre-fill Sector/Sub-Sector and Tax Withholdings from the brand's most recent
                          // project, while the analyst hasn't touched them from their defaults.
                          mainSector: recent?.sector && f.mainSector === "F&B" ? recent.sector : f.mainSector,
                          subSector: recent?.subSector && !f.subSector ? recent.subSector : f.subSector,
                          taxWithholdings:
                            recent?.taxWithholdings && f.taxWithholdings === "Yes"
                              ? recent.taxWithholdings
                              : f.taxWithholdings,
                        }));
                        setIsBrandDropdownOpen(false);
                      }}
                    >
                      {brand}
                    </div>
                  ))}
                </div>
              )}
              {(() => {
                const recent = mostRecentBrandProject(form.brandName);
                if (!form.brandName.trim()) {
                  return null;
                }
                if (recent) {
                  return (
                    <div className="mt-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-1.5 flex items-center gap-1.5">
                      ✓ Existing Karmapreneur/Brand
                    </div>
                  );
                }
                return (
                  <div className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-1.5 flex items-center gap-1.5">
                    ➕ New Karmapreneur/Brand
                  </div>
                );
              })()}
            </div>
          </Field>
          <Field label="Project Name (Auto-generated)" source="free">
            <input
              className={`${inputCls} bg-gray-50 text-gray-500`}
              value={form.projectName}
              readOnly
            />
          </Field>
          <Field label="Project Description" source="free" hint="Main purpose of the project">
            <input
              className={inputCls}
              value={projectFreeText}
              onChange={(e) => setProjectFreeText(e.target.value)}
              placeholder="e.g. Blok A Expansion"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pt-3 pb-2 border-t border-gray-50">
            <CompactField label="Asset Class" source="master" hint="Changing it filters the allowed Types">
              <select
                className={inputCls}
                value={form.assetClass}
                onChange={(e) => setAssetClass(e.target.value)}
              >
                {ASSET_CLASSES.map((a) => (
                  <option key={a} value={a}>
                    Asset Class {a}
                  </option>
                ))}
              </select>
            </CompactField>
            <CompactField label="Submission Type" source="master" hint="Allowed options are filtered by Asset Class">
              <select
                className={inputCls}
                value={form.approvalType}
                onChange={(e) => setApprovalType(e.target.value as ApprovalType)}
              >
                {approvalTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </CompactField>
            <CompactField label="Financing Type" source="master" hint="Allowed options are filtered by Asset Class">
              <select
                className={inputCls}
                value={form.returnType}
                onChange={(e) => setReturnType(e.target.value)}
              >
                {financingTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </CompactField>
            {isProjectType && (
              <>
                <CompactField label="Financing Use" source="master" hint="What the financing is for">
                  <select
                    className={inputCls}
                    value={form.financingUse}
                    onChange={(e) => set("financingUse", e.target.value)}
                  >
                    {STRUCTURED_LOAN_USES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </CompactField>
                <CompactField label="Requested Amount" source="free" hint="USD converts to IDR at JISDOR (T-1 working day)">
                  <div className="flex gap-2">
                    <select
                      className={`${inputCls} !w-24`}
                      value={form.requestedAmountCurrency}
                      onChange={(e) => set("requestedAmountCurrency", e.target.value as "IDR" | "USD")}
                    >
                      <option value="IDR">Rp</option>
                      <option value="USD">USD</option>
                    </select>
                    <input
                      className={`${inputCls} font-mono`}
                      inputMode="numeric"
                      value={amountText}
                      onChange={(e) => {
                        const formatted = formatAmountInput(e.target.value);
                        setAmountText(formatted);
                        set("requestedAmount", parseAmount(formatted));
                      }}
                      placeholder="2.000.000.000"
                    />
                  </div>
                  {amountWarning && <InlineWarning message={amountWarning} />}
                </CompactField>
              </>
            )}
            <CompactField label="Sector" source="master">
              <select className={inputCls} value={form.mainSector} onChange={(e) => setSector(e.target.value)}>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </CompactField>
            {form.mainSector === "Other" ? (
              <CompactField label="Sub-sector" source="free" hint="Free text — no sub-sector list under Other">
                <input
                  className={inputCls}
                  value={form.subSector}
                  onChange={(e) => set("subSector", e.target.value)}
                  placeholder="e.g. Pet Grooming"
                />
              </CompactField>
            ) : (
              <CompactField label="Sub-sector" source="master" hint={`${subSectorOptions.length} sub-sectors under ${form.mainSector}`}>
                <select
                  className={inputCls}
                  value={form.subSector}
                  onChange={(e) => set("subSector", e.target.value)}
                >
                  <option value="">— None —</option>
                  {subSectorOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </CompactField>
            )}
            <CompactField label="Syariah Project?" source="free">
              <label className="flex items-center gap-2 text-sm text-gray-700 py-2">
                <input
                  type="checkbox"
                  checked={form.syariah}
                  onChange={(e) => set("syariah", e.target.checked)}
                  className="rounded border-gray-300"
                />
                Syariah
              </label>
            </CompactField>
            {form.syariah && (
              <CompactField
                label="Syariah Notes"
                source="free"
                hint="Shown on the IC card next to the Syariah tag"
                span="full"
              >
                <textarea
                  className={`${inputCls} min-h-20 resize-y`}
                  value={form.syariahNotes}
                  onChange={(e) => set("syariahNotes", e.target.value)}
                  placeholder="e.g. Mudarabah scheme using buy-sell to PT Artha"
                />
              </CompactField>
            )}
          </div>
        </FormSection>

        <FormSection title="Plafond & Financial Review">
          {form.brandName.trim() && (
            <div className="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Current Plafond on File
              </div>
              {brandPlafond && (brandPlafond.current || brandPlafond.superseded.length > 0) ? (
                <EditTable
                  headers={
                    isB
                      ? ["Limit Status", "Total Limit", "PO Sub Limit", "Working Capital Sub Limit", "Max review date"]
                      : ["Limit Status", "Total Limit", "PO Sub Limit", "Working Capital Sub Limit"]
                  }
                  minWidthCls="min-w-[560px]"
                >
                  <PlafondCurrentAndSupersededRows plafond={brandPlafond} assetClass={form.assetClass} />
                </EditTable>
              ) : (
                <p className="text-xs text-gray-500">
                  No active plafond on file for {form.brandName} — this submission is a new plafond request.
                </p>
              )}
            </div>
          )}

          {isAssetA ? (
            <div className="mb-4 p-3 rounded-lg border border-dashed border-gray-200 text-sm text-gray-400 italic">
              Plafond: N/A for Asset A.
            </div>
          ) : (
            hasPlafond && (
              <>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-1">
                Proposed Limit
              </h3>
              <EditTable
                headers={[
                  "Limit Status",
                  "Total Limit",
                  ...(isB ? ["PO Sub Limit"] : []),
                  "Working Capital Sub Limit",
                  ...(isB ? ["Max review date"] : []),
                ]}
                minWidthCls="min-w-[480px]"
              >
                <tr className="bg-purple-50/30 align-top">
                  <td className="py-3 pl-3 pr-2 font-semibold text-purple-800 whitespace-nowrap">Proposed</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        className={`${cellInputCls} font-mono`}
                        inputMode="numeric"
                        value={plafondTexts.total}
                        onChange={(e) =>
                          setPlafondTexts((t) => ({ ...t, total: formatAmountInput(e.target.value) }))
                        }
                        placeholder="5.000.000.000"
                      />
                      {brandPlafond?.current && (
                        <button
                          type="button"
                          className="shrink-0 text-[10px] px-1.5 py-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-100"
                          onClick={() =>
                            setPlafondTexts((t) => ({
                              ...t,
                              total: formatAmountInput(String(brandPlafond.current!.totalLimit)),
                            }))
                          }
                        >
                          Keep
                        </button>
                      )}
                    </div>
                  </td>
                  {isB && (
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          className={`${cellInputCls} font-mono`}
                          inputMode="numeric"
                          value={plafondTexts.po}
                          onChange={(e) =>
                            setPlafondTexts((t) => ({ ...t, po: formatAmountInput(e.target.value) }))
                          }
                        />
                        {brandPlafond?.current && (
                          <button
                            type="button"
                            className="shrink-0 text-[10px] px-1.5 py-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-100"
                            onClick={() =>
                              setPlafondTexts((t) => ({
                                ...t,
                                po: formatAmountInput(String(brandPlafond.current!.poSubLimit)),
                              }))
                            }
                          >
                            Keep
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        className={`${cellInputCls} font-mono`}
                        inputMode="numeric"
                        value={plafondTexts.wc}
                        onChange={(e) =>
                          setPlafondTexts((t) => ({ ...t, wc: formatAmountInput(e.target.value) }))
                        }
                      />
                      {brandPlafond?.current && (
                        <button
                          type="button"
                          className="shrink-0 text-[10px] px-1.5 py-1 rounded border border-gray-300 text-gray-500 hover:bg-gray-100"
                          onClick={() =>
                            setPlafondTexts((t) => ({
                              ...t,
                              wc: formatAmountInput(String(brandPlafond.current!.wcSubLimit)),
                            }))
                          }
                        >
                          Keep
                        </button>
                      )}
                    </div>
                  </td>
                  {isB && (
                    <td className="py-2 px-2">
                      <input
                        type="date"
                        className={cellInputCls}
                        value={form.proposedMaxReviewDate}
                        onChange={(e) => set("proposedMaxReviewDate", e.target.value)}
                      />
                    </td>
                  )}
                </tr>
              </EditTable>
              {isB && (
                <p className="text-[11px] text-amber-700 mt-1.5">
                  PO Sub Limit requires IC approval.
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-2">
                Amounts in Rp. Current and Superseded rows above reflect this brand&apos;s plafond
                history, if any.
              </p>
              {(isB || isD) && (
                <div className="mt-4 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.proposedBufferEnabled}
                      onChange={(e) => set("proposedBufferEnabled", e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Buffer <span className="font-normal normal-case text-gray-400">(headroom above limit)</span>
                  </label>
                  {form.proposedBufferEnabled ? (
                    <div className="mt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Total Buffer" source="free">
                          <input
                            className={`${inputCls} font-mono`}
                            inputMode="numeric"
                            value={plafondTexts.bufferTotal}
                            onChange={(e) =>
                              setPlafondTexts((t) => ({ ...t, bufferTotal: formatAmountInput(e.target.value) }))
                            }
                            placeholder="500.000.000"
                          />
                        </Field>
                        {isB && (
                          <Field label="PO Buffer" source="free">
                            <input
                              className={`${inputCls} font-mono`}
                              inputMode="numeric"
                              value={plafondTexts.bufferPO}
                              onChange={(e) =>
                                setPlafondTexts((t) => ({ ...t, bufferPO: formatAmountInput(e.target.value) }))
                              }
                            />
                          </Field>
                        )}
                        <Field label="WC Buffer" source="free">
                          <input
                            className={`${inputCls} font-mono`}
                            inputMode="numeric"
                            value={plafondTexts.bufferWC}
                            onChange={(e) =>
                              setPlafondTexts((t) => ({ ...t, bufferWC: formatAmountInput(e.target.value) }))
                            }
                          />
                        </Field>
                      </div>
                      <Field label="Buffer Expiry Date" source="free">
                        <input
                          type="date"
                          className={inputCls}
                          value={form.proposedBufferExpiryDate}
                          onChange={(e) => set("proposedBufferExpiryDate", e.target.value)}
                        />
                      </Field>
                      <Field label="Reasons" source="free" hint="Why this buffer is held above the plafond">
                        <textarea
                          className={`${inputCls} min-h-16 resize-y`}
                          value={form.proposedBufferReasons}
                          onChange={(e) => set("proposedBufferReasons", e.target.value)}
                          placeholder="e.g. Headroom for seasonal inventory build"
                        />
                      </Field>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-1.5">
                      No buffer for this plafond.
                    </p>
                  )}
                </div>
              )}
              </>
            )
          )}

          <h3
            className={`text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 ${
              hasPlafond ? "mt-6" : "mt-1"
            }`}
          >
            Financial Review
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Link to your financial review write-up (Google Doc/Sheet) — required before submitting
            to IC.
          </p>
          <Field label="Financial Review Link" source="free" hint="Shown as Review 1 on the IC card">
            <input
              className={inputCls}
              value={form.finReviewReportsReviewed}
              onChange={(e) => set("finReviewReportsReviewed", e.target.value)}
              placeholder="https://docs.google.com/document/d/…"
            />
          </Field>
          <Field label="Reports' Period Ending" source="free">
            <input
              type="date"
              className={inputCls}
              value={form.finReviewPeriodEnding}
              onChange={(e) => set("finReviewPeriodEnding", e.target.value)}
            />
          </Field>
          <Field label="Limit Recommendation" source="free">
            <select
              className={inputCls}
              value={form.finReviewLimitRecommendation}
              onChange={(e) =>
                set("finReviewLimitRecommendation", e.target.value as SubmissionFormData["finReviewLimitRecommendation"])
              }
            >
              <option value="Keep">Keep</option>
              <option value="Increase">Increase</option>
              <option value="Decrease">Decrease</option>
            </select>
          </Field>
          <Field label="Current Limit (Rp)" source="free" hint="Brand total limit on file at review time; 0 = none">
            <input
              className={`${inputCls} font-mono`}
              inputMode="numeric"
              value={form.finReviewLimitCurrent ? formatAmountInput(String(form.finReviewLimitCurrent)) : ""}
              onChange={(e) => set("finReviewLimitCurrent", parseAmount(e.target.value))}
              placeholder="3.000.000.000"
            />
          </Field>
          {form.finReviewLimitRecommendation !== "Keep" && (
            <Field label="Recommended Limit (Rp)" source="free">
              <input
                className={`${inputCls} font-mono`}
                inputMode="numeric"
                value={
                  form.finReviewLimitRecommended ? formatAmountInput(String(form.finReviewLimitRecommended)) : ""
                }
                onChange={(e) => set("finReviewLimitRecommended", parseAmount(e.target.value))}
                placeholder="5.000.000.000"
              />
            </Field>
          )}
          <Field label="Notes" source="free">
            <textarea
              className={`${inputCls} min-h-20 resize-y`}
              value={form.finReviewNotes}
              onChange={(e) => set("finReviewNotes", e.target.value)}
              placeholder="What was reviewed and why this recommendation"
            />
          </Field>
        </FormSection>

        {isAD && (
          <FormSection
            title="Karmapreneur Contacts"
            badge={
              form.kpContacts.some((c) => c.isKeyPerson && !c.slikFileUrl.trim()) && (
                <span className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
                  SLIK Missing
                </span>
              )
            }
          >
            <p className="text-xs text-gray-500 mb-3">
              List the people behind this Karmapreneur — owners, directors, and guarantors. Mark at
              least one <strong className="text-gray-600">Key Person</strong>; key persons need a
              SLIK file before IC approval.
            </p>
            <div className="overflow-x-auto -mx-1 max-w-[900px]">
              <table
                className="text-xs border border-gray-100 rounded-lg overflow-hidden"
                style={{ minWidth: 144 + form.kpContacts.length * 224 + 96 }}
              >
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left">
                    <th className="py-2 px-3 font-medium w-36">Field</th>
                    {form.kpContacts.map((c, i) => (
                      <th key={c.id} className="py-2 px-3 font-medium w-56">
                        <div className="flex items-center justify-between gap-2">
                          <span>Contact {i + 1}</span>
                          <RemoveRowButton onClick={() => removeRow("kpContacts", c.id)} />
                        </div>
                      </th>
                    ))}
                    <th className="py-2 px-3 whitespace-nowrap w-24">
                      <AddColumnButton label="Add contact" onClick={addContact} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <TransposedFieldRow
                    label="Name"
                    rows={form.kpContacts}
                    renderCell={(c) => (
                      <input
                        className={cellInputCls}
                        value={c.name}
                        onChange={(e) => updateRow("kpContacts", c.id, { name: e.target.value })}
                        placeholder="e.g. Tyo Kusumaputera"
                      />
                    )}
                  />
                  <TransposedFieldRow
                    label="Role"
                    rows={form.kpContacts}
                    renderCell={(c) => (
                      <input
                        className={cellInputCls}
                        value={c.role}
                        onChange={(e) => updateRow("kpContacts", c.id, { role: e.target.value })}
                        placeholder="e.g. CEO"
                      />
                    )}
                  />
                  <TransposedFieldRow
                    label="Key Person?"
                    rows={form.kpContacts}
                    renderCell={(c) => (
                      <input
                        type="checkbox"
                        checked={c.isKeyPerson}
                        onChange={(e) => updateRow("kpContacts", c.id, { isKeyPerson: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                    )}
                  />
                  <TransposedFieldRow
                    label="SLIK File URL"
                    rows={form.kpContacts}
                    renderCell={(c) => (
                      <input
                        className={cellInputCls}
                        value={c.slikFileUrl}
                        onChange={(e) => updateRow("kpContacts", c.id, { slikFileUrl: e.target.value })}
                        placeholder="https://drive.google.com/…"
                      />
                    )}
                  />
                  <TransposedFieldRow
                    label="SLIK Exec Summary"
                    rows={form.kpContacts}
                    renderCell={(c) => (
                      <input
                        className={cellInputCls}
                        value={c.slikExecSummary}
                        onChange={(e) => updateRow("kpContacts", c.id, { slikExecSummary: e.target.value })}
                        placeholder="e.g. Kol 1, no arrears"
                      />
                    )}
                  />
                  <TransposedFieldRow
                    label="UBO Exposure (Rp)"
                    rows={form.kpContacts}
                    renderCell={(c) => {
                      if (!c.name.trim()) return <span className="text-gray-300">—</span>;
                      const existing = existingUboExposure(c.name);
                      const includingProposed = proposedIDR > 0 ? existing + proposedIDR : existing;
                      const level = uboExposureLevel(includingProposed);
                      return (
                        <span
                          className={
                            level === "over"
                              ? "font-medium text-red-700"
                              : level === "stretch"
                              ? "font-medium text-amber-700"
                              : "text-gray-700"
                          }
                        >
                          {formatAmountInput(String(existing)) || "0"}
                          {proposedIDR > 0 && ` (${formatAmountInput(String(includingProposed))} incl.)`}
                        </span>
                      );
                    }}
                  />
                  <TransposedFieldRow
                    label="WhatsApp"
                    rows={form.kpContacts}
                    renderCell={(c) => (
                      <>
                        <input
                          className={cellInputCls}
                          inputMode="tel"
                          value={c.whatsapp}
                          onChange={(e) => updateRow("kpContacts", c.id, { whatsapp: e.target.value })}
                          placeholder="+62 - 812..."
                        />
                        {!isValidWhatsApp(c.whatsapp) && (
                          <InlineWarning message="Format: +[Country Code] - [Number]" />
                        )}
                      </>
                    )}
                  />
                  <TransposedFieldRow
                    label="Email"
                    rows={form.kpContacts}
                    renderCell={(c) => (
                      <>
                        <input
                          className={cellInputCls}
                          inputMode="email"
                          value={c.email}
                          onChange={(e) => updateRow("kpContacts", c.id, { email: e.target.value })}
                          placeholder="tyo@example.com"
                        />
                        {!isValidEmail(c.email) && (
                          <InlineWarning message="Must be a valid email (e.g., name@mail.com)" />
                        )}
                      </>
                    )}
                  />
                  <TransposedFieldRow
                    label="Notes on Person"
                    rows={form.kpContacts}
                    renderCell={(c) => (
                      <input
                        className={cellInputCls}
                        value={c.notesOnPerson}
                        onChange={(e) => updateRow("kpContacts", c.id, { notesOnPerson: e.target.value })}
                        placeholder="e.g. Founder; runs day-to-day ops"
                      />
                    )}
                  />
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              SLIK File URL is required before approval for key persons.
            </p>
          </FormSection>
        )}

        {isAD && (
          <FormSection
            title="PT Details"
            badge={
              form.ptDetails.some((pt) => ptWarnings(pt, form.brandName).length > 0) && (
                <span className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
                  Mismatch
                </span>
              )
            }
          >
            <p className="text-xs text-gray-500 mb-3">
              The legal entities (PTs) receiving disbursements and their bank accounts. The
              accountholder name should match the PT name — mismatches are flagged to IC.
            </p>
            <div className="overflow-x-auto -mx-1 max-w-[900px]">
              <table
                className="text-xs border border-gray-100 rounded-lg overflow-hidden"
                style={{ minWidth: 144 + form.ptDetails.length * 224 + 96 }}
              >
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left">
                    <th className="py-2 px-3 font-medium w-36">Field</th>
                    {form.ptDetails.map((pt, i) => (
                      <th key={pt.id} className="py-2 px-3 font-medium w-56">
                        <div className="flex items-center justify-between gap-2">
                          <span>PT {i + 1}</span>
                          <RemoveRowButton onClick={() => removeRow("ptDetails", pt.id)} />
                        </div>
                      </th>
                    ))}
                    <th className="py-2 px-3 whitespace-nowrap w-24">
                      <AddColumnButton label="Add PT" onClick={addPT} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <TransposedFieldRow
                    label="PT Name"
                    rows={form.ptDetails}
                    renderCell={(pt) => (
                      <input
                        className={cellInputCls}
                        value={pt.name}
                        onChange={(e) => updateRow("ptDetails", pt.id, { name: e.target.value })}
                        placeholder="e.g. PT Tuku Sejahtera"
                      />
                    )}
                  />
                  <TransposedFieldRow
                    label="Bank"
                    rows={form.ptDetails}
                    renderCell={(pt) => (
                      <input
                        className={cellInputCls}
                        value={pt.bank}
                        onChange={(e) => updateRow("ptDetails", pt.id, { bank: e.target.value })}
                        placeholder="e.g. BCA"
                      />
                    )}
                  />
                  <TransposedFieldRow
                    label="Account Number"
                    rows={form.ptDetails}
                    renderCell={(pt) => (
                      <input
                        className={cellInputCls}
                        inputMode="numeric"
                        value={pt.accountNumber}
                        onChange={(e) => updateRow("ptDetails", pt.id, { accountNumber: e.target.value })}
                        placeholder="e.g. 5271038812"
                      />
                    )}
                  />
                  <TransposedFieldRow
                    label="Accountholder Name"
                    rows={form.ptDetails}
                    renderCell={(pt) => {
                      const warnings = ptWarnings(pt, form.brandName);
                      return (
                        <>
                          <input
                            className={cellInputCls}
                            value={pt.accountholderName}
                            onChange={(e) => updateRow("ptDetails", pt.id, { accountholderName: e.target.value })}
                            placeholder="e.g. PT Tuku Sejahtera"
                          />
                          {pt.name.trim() && warnings.map((w, wi) => <InlineWarning key={wi} message={w} />)}
                        </>
                      );
                    }}
                  />
                  <TransposedFieldRow
                    label="SLIK-PT File URL"
                    rows={form.ptDetails}
                    renderCell={(pt) => (
                      <input
                        className={cellInputCls}
                        value={pt.slikFileUrl}
                        onChange={(e) => updateRow("ptDetails", pt.id, { slikFileUrl: e.target.value })}
                        placeholder="https://drive.google.com/…"
                      />
                    )}
                  />
                  <TransposedFieldRow
                    label="SLIK-PT Exec Summary"
                    rows={form.ptDetails}
                    renderCell={(pt) => (
                      <input
                        className={cellInputCls}
                        value={pt.slikExecSummary}
                        onChange={(e) => updateRow("ptDetails", pt.id, { slikExecSummary: e.target.value })}
                        placeholder="e.g. Kol 1, no arrears"
                      />
                    )}
                  />
                </tbody>
              </table>
            </div>
          </FormSection>
        )}

        {(isProjectType || wantsFixed || wantsDaily) && (
          <FormSection title="Project Terms Details">
            <p className="text-[11px] text-gray-400 -mt-1 mb-3">
              Grouped to match the IC Review recap&apos;s bands (A-F), so what&apos;s filled in
              during Due Diligence lines up with what IC reviews later.
            </p>

            {isProjectType && (
              <>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2 pb-1.5 border-b border-gray-200">
                A — Identity &amp; Structure
              </h3>
              <p className="text-[11px] text-gray-400 mb-3">
                Financing Type, Asset Class, Financing Use, and PT are captured above in
                Project&apos;s Application / PT Details.
              </p>
              <h4 className="text-xs font-medium text-gray-600 mb-2">Disbursement Schedule</h4>
              <p className="text-xs text-gray-500 mb-3">
                How the requested amount is released in tranches — planned amounts should add up to
                the Requested Amount.
              </p>
              <EditTable
                  headers={[
                    "#",
                    `Disbursement Amount (${form.requestedAmountCurrency === "USD" ? "USD" : "Rp"})`,
                    "Planned Disbursement Date",
                    "",
                  ]}
                  minWidthCls="min-w-[480px]"
                >
                  {form.disbursements.map((d, i) => (
                    <tr key={d.id} className="align-top">
                      <td className="py-2 pl-3 pr-2 pt-3.5 text-gray-400 font-medium">{i + 1}</td>
                      <td className="py-2 px-2">
                        <input
                          className={`${cellInputCls} font-mono`}
                          inputMode="numeric"
                          value={d.amount ? formatAmountInput(String(d.amount)) : ""}
                          onChange={(e) =>
                            updateRow("disbursements", d.id, { amount: parseAmount(e.target.value) })
                          }
                          placeholder="700.000.000"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="date"
                          className={cellInputCls}
                          value={d.plannedDate}
                          onChange={(e) => updateRow("disbursements", d.id, { plannedDate: e.target.value })}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <RemoveRowButton onClick={() => removeRow("disbursements", d.id)} />
                      </td>
                    </tr>
                  ))}
                </EditTable>
              <AddRowButton label="Add disbursement" onClick={addDisbursement} />
              {filledDisbursements.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Total planned: <span className="font-mono">{fmtIdr(disbursementSum)}</span>
                </p>
              )}
              {disbursementMismatch && (
                <InlineWarning message="Warning: Not same as Project Target Amount" />
              )}

              {isB && (
                <>
                  <h4 className="text-xs font-medium text-gray-600 mb-2 mt-6">Payor / PO / Invoice Details</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    One row per payor / PO or invoice line backing this request — shown on the IC
                    card&apos;s Payor section.
                  </p>
                  <EditTable
                    headers={[
                      "#",
                      "Payor",
                      "PO / Invoice #",
                      "Due Date",
                      `Amount (${form.requestedAmountCurrency === "USD" ? "USD" : "Rp"})`,
                      "Payor Type",
                      "Payee Projects",
                      "Notes",
                      "Risk",
                      "",
                    ]}
                    minWidthCls="min-w-[1100px]"
                  >
                    {form.payorInvoices.map((r, i) => (
                      <tr key={r.id} className="align-top">
                        <td className="py-2 pl-3 pr-2 pt-3.5 text-gray-400 font-medium">{i + 1}</td>
                        <td className="py-2 px-2 min-w-36">
                          <input
                            className={cellInputCls}
                            value={r.payorLabel}
                            onChange={(e) => updateRow("payorInvoices", r.id, { payorLabel: e.target.value })}
                            placeholder="e.g. Indomarco Adi Prima"
                          />
                        </td>
                        <td className="py-2 px-2 min-w-28">
                          <input
                            className={cellInputCls}
                            value={r.poOrInvoiceNumber}
                            onChange={(e) =>
                              updateRow("payorInvoices", r.id, { poOrInvoiceNumber: e.target.value })
                            }
                            placeholder="e.g. PO-2026-0713"
                          />
                        </td>
                        <td className="py-2 px-2 min-w-32">
                          <input
                            type="date"
                            className={cellInputCls}
                            value={r.dueDate}
                            onChange={(e) => updateRow("payorInvoices", r.id, { dueDate: e.target.value })}
                          />
                        </td>
                        <td className="py-2 px-2 min-w-32">
                          <input
                            className={`${cellInputCls} font-mono`}
                            inputMode="numeric"
                            value={r.amount ? formatAmountInput(String(r.amount)) : ""}
                            onChange={(e) =>
                              updateRow("payorInvoices", r.id, { amount: parseAmount(e.target.value) })
                            }
                            placeholder="700.000.000"
                          />
                        </td>
                        <td className="py-2 px-2 min-w-28">
                          <select
                            className={cellInputCls}
                            value={r.payorType}
                            onChange={(e) => updateRow("payorInvoices", r.id, { payorType: e.target.value })}
                          >
                            <option value="Corporate">Corporate</option>
                            <option value="Government">Government</option>
                            <option value="SME">SME</option>
                            <option value="Individual">Individual</option>
                          </select>
                        </td>
                        <td className="py-2 px-2 min-w-32">
                          <input
                            className={cellInputCls}
                            value={r.payeeProjects}
                            onChange={(e) =>
                              updateRow("payorInvoices", r.id, { payeeProjects: e.target.value })
                            }
                            placeholder="e.g. this project only"
                          />
                        </td>
                        <td className="py-2 px-2 min-w-36">
                          <input
                            className={cellInputCls}
                            value={r.notes}
                            onChange={(e) => updateRow("payorInvoices", r.id, { notes: e.target.value })}
                            placeholder="e.g. repeat payor, pays on time"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            className={cellInputCls}
                            value={r.riskLevel}
                            onChange={(e) =>
                              updateRow("payorInvoices", r.id, {
                                riskLevel: e.target.value as SubmissionPayorRow["riskLevel"],
                              })
                            }
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <RemoveRowButton onClick={() => removeRow("payorInvoices", r.id)} />
                        </td>
                      </tr>
                    ))}
                  </EditTable>
                  <AddRowButton label="Add payor / invoice" onClick={addPayorRow} />
                  <div className="mt-4">
                    <Field
                      label="GDrive Link to Underlying Invoice/PO Docs"
                      source="free"
                      hint="Folder or file link with the supporting invoice/PO documents"
                    >
                      <input
                        className={inputCls}
                        value={form.payorInvoiceDocsLink}
                        onChange={(e) => set("payorInvoiceDocsLink", e.target.value)}
                        placeholder="https://drive.google.com/…"
                      />
                    </Field>
                  </div>
                </>
              )}
              </>
            )}

            {((isProjectType && wantsRevShare) || wantsFixed || wantsDaily) && (
              <>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mt-8 mb-2 pb-1.5 border-b border-gray-200">
                B — Return Structure
              </h3>

              {isProjectType && wantsRevShare && (
                <p className="text-[11px] text-gray-400 mb-3">
                  Revenue Share %, Cap, Carry, and Start are entered in the Proposed & Past Project
                  Recap table below.
                </p>
              )}

              {wantsFixed && (
                <>
                  <h4 className="text-xs font-medium text-gray-600 mb-2 mt-6">Fixed Repayment Schedule</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    One row per month — principal, interest, and carry per installment. Totals are
                    computed for the IC card.
                  </p>
                  <EditTable
                    headers={["#", "Principal (Rp)", "Interest (Rp)", "Carry (Rp)", ""]}
                    minWidthCls="min-w-[560px]"
                  >
                    {form.fixedSchedule.map((r, i) => (
                      <tr key={r.id} className="align-top">
                        <td className="py-2 pl-3 pr-2 pt-3.5 text-gray-400 font-medium whitespace-nowrap">
                          Month {i + 1}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            className={`${cellInputCls} font-mono`}
                            inputMode="numeric"
                            value={r.principal ? formatAmountInput(String(r.principal)) : ""}
                            onChange={(e) =>
                              updateRow("fixedSchedule", r.id, { principal: parseAmount(e.target.value) })
                            }
                            placeholder="100.000.000"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            className={`${cellInputCls} font-mono`}
                            inputMode="numeric"
                            value={r.interest ? formatAmountInput(String(r.interest)) : ""}
                            onChange={(e) =>
                              updateRow("fixedSchedule", r.id, { interest: parseAmount(e.target.value) })
                            }
                            placeholder="10.000.000"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            className={`${cellInputCls} font-mono`}
                            inputMode="numeric"
                            value={r.carry ? formatAmountInput(String(r.carry)) : ""}
                            onChange={(e) =>
                              updateRow("fixedSchedule", r.id, { carry: parseAmount(e.target.value) })
                            }
                            placeholder="2.000.000"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <RemoveRowButton onClick={() => removeRow("fixedSchedule", r.id)} />
                        </td>
                      </tr>
                    ))}
                  </EditTable>
                  <AddRowButton label="Add month" onClick={addFixedRow} />
                  {form.fixedSchedule.some((r) => !fixedRowIsBlank(r)) && (
                    <p className="text-xs text-gray-500 mt-2">
                      Total repayment:{" "}
                      <span className="font-mono">
                        {fmtIdr(
                          form.fixedSchedule.reduce((s, r) => s + r.principal + r.interest + r.carry, 0)
                        )}
                      </span>
                    </p>
                  )}
                </>
              )}

              {wantsDaily && (
                <>
                  <h4 className="text-xs font-medium text-gray-600 mb-2 mt-6">Daily Interest Terms</h4>
                  <p className="text-[11px] text-gray-400 mb-3">
                    Interest Rate (30-day) and Service Fee (30-day) are entered in the Proposed &amp;
                    Past Project Recap table below (Target Carry / Fixed Payment Investor ROIC rows).
                  </p>
                  <Field label="Service Fee Daily Basis" source="free">
                    <input
                      className={inputCls}
                      value={form.diServiceFeeBasis}
                      onChange={(e) => set("diServiceFeeBasis", e.target.value)}
                      placeholder="e.g. Disbursed Amount"
                    />
                  </Field>
                </>
              )}
              </>
            )}

            {((isAD && (isProjectType || wantsFixed)) || wantsDaily) && (
              <>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mt-8 mb-2 pb-1.5 border-b border-gray-200">
                C — Timeline &amp; Operations
              </h3>
              <p className="text-[11px] text-gray-400 mb-3">
                Term / Tenor is entered in the Proposed &amp; Past Project Recap table below.
              </p>

              {isProjectType && isAD && isBranchFinancingUse(form.financingUse) && (
                <>
                  <h4 className="text-xs font-medium text-gray-600 mb-2 mt-6">Branch Details</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Outlets this financing opens (Opening Branch) or whose revenue repays it (Accruing
                    Branch).
                  </p>
                  <EditTable
                      headers={["#", "Branch Name", "Branch Area", "Type", "Gmaps Link", "Notes", ""]}
                      minWidthCls="min-w-[760px]"
                    >
                      {form.branches.map((b, i) => (
                        <tr key={b.id} className="align-top">
                          <td className="py-2 pl-3 pr-2 pt-3.5 text-gray-400 font-medium">{i + 1}</td>
                          <td className="py-2 px-2 min-w-36">
                            <input
                              className={cellInputCls}
                              value={b.name}
                              onChange={(e) => updateRow("branches", b.id, { name: e.target.value })}
                              placeholder="e.g. Kopi Tuku — Blok A"
                            />
                          </td>
                          <td className="py-2 px-2 min-w-28">
                            <input
                              className={cellInputCls}
                              value={b.area}
                              onChange={(e) => updateRow("branches", b.id, { area: e.target.value })}
                              placeholder="e.g. Depok"
                            />
                          </td>
                          <td className="py-2 px-2 min-w-36">
                            <select
                              className={cellInputCls}
                              value={b.type}
                              onChange={(e) =>
                                updateRow("branches", b.id, {
                                  type: e.target.value as SubmissionBranchRow["type"],
                                })
                              }
                            >
                              <option value="Opening Branch">Opening Branch</option>
                              <option value="Accruing Branch">Accruing Branch</option>
                            </select>
                          </td>
                          <td className="py-2 px-2 min-w-36">
                            <input
                              className={cellInputCls}
                              value={b.gmapsLink}
                              onChange={(e) => updateRow("branches", b.id, { gmapsLink: e.target.value })}
                              placeholder="https://maps.app.goo.gl/…"
                            />
                          </td>
                          <td className="py-2 px-2 min-w-36">
                            <input
                              className={cellInputCls}
                              value={b.notes}
                              onChange={(e) => updateRow("branches", b.id, { notes: e.target.value })}
                              placeholder="e.g. 2nd outlet in the area"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <RemoveRowButton onClick={() => removeRow("branches", b.id)} />
                          </td>
                        </tr>
                      ))}
                    </EditTable>
                  <AddRowButton label="Add branch" onClick={addBranch} />
                </>
              )}
              </>
            )}

            {(isProjectType || wantsFixed || wantsDaily) && (
              <>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mt-8 mb-2 pb-1.5 border-b border-gray-200">
                D — Performance Metrics
              </h3>
              <p className="text-[11px] text-gray-400">
                Minimum Return (if any) is entered in the table below. PvA, IRR, MOIC, BEP, and DPD
                are calculated after disbursement (LMS) or via the linked Calculator — not entered
                here.
              </p>
              </>
            )}

            {wantsRevShare && !isB && (
              <>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mt-8 mb-2 pb-1.5 border-b border-gray-200">
                E — Revenue Model
              </h3>
              <p className="text-[11px] text-gray-400">
                Source of Revenue Accrued is entered in the table below. Month-by-month Revenue
                Projection is maintained in the linked Calculator, not entered here.
              </p>
              </>
            )}

            {isProjectType && (
              <>
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mt-8 mb-2 pb-1.5 border-b border-gray-200">
                F — Payment Mechanics
              </h3>
              <p className="text-[11px] text-gray-400">
                {isB
                  ? "Payment Frequency is fixed (at maturity / bullet repayment) for this asset class. Late fees follow policy from the Daily Interest terms — nothing to fill in here."
                  : "Frequency, Due Date, and Late Fee terms are entered in the Proposed & Past Project Recap table below."}
              </p>
              </>
            )}
          </FormSection>
        )}

        {(isProjectType || wantsFixed || wantsDaily) && (
          <PastProjectsRecap project={previewProject} editableProposed={{ form, set }} />
        )}

        <FormSection title="Credit Memo and Notes">
          {isAD && (
            <>
            <Field
              label="Calculator / Financials Link"
              source="free"
              hint="Google Sheets link — embedded on the IC review card"
            >
              <input
                className={inputCls}
                value={form.financialsLink}
                onChange={(e) => set("financialsLink", e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/…"
              />
              {!form.financialsLink.trim() && <InlineWarning message="Calculator GSheet missing" />}
            </Field>
            {form.financialsLink.trim() && (
              <Field label="Calculator GSheet Verified" source="free" hint="Confirm the link is present and readable">
                <label className="flex items-center gap-2 text-sm text-gray-700 py-2">
                  <input
                    type="checkbox"
                    checked={form.calculatorGSheetVerified}
                    onChange={(e) => set("calculatorGSheetVerified", e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Verified
                </label>
                {!form.calculatorGSheetVerified && <InlineWarning message="Calculator GSheet not readable" />}
              </Field>
            )}
            </>
          )}
          <Field label="Term Sheet Link" source="free" hint="Optional">
            <input
              className={inputCls}
              value={form.termSheetLink}
              onChange={(e) => set("termSheetLink", e.target.value)}
              placeholder="https://drive.google.com/…"
            />
          </Field>
          <Field label="Special Notes for IC" source="free" hint="Optional">
            <input
              className={inputCls}
              value={form.specialNotesForIC}
              onChange={(e) => set("specialNotesForIC", e.target.value)}
            />
          </Field>
          {isAD && (
            <div className="mt-6 pt-4 border-t-2 border-gray-200">
              <h3 className="text-sm font-bold text-gray-900 mb-3">
                Company (KP) Credit Memo
              </h3>
              <CreditMemoSectionsEditor
                sections={form.kpCreditMemoSections}
                onAnswerChange={(sectionId, questionId, value) =>
                  updateMemoAnswer("kpCreditMemoSections", sectionId, questionId, value)
                }
                onDateChange={(sectionId, value) =>
                  updateRow("kpCreditMemoSections", sectionId, { lastCheckedDate: value })
                }
              />
            </div>
          )}
          <div className="mt-6 pt-4 border-t-2 border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              Project Credit Memo
            </h3>
            <CreditMemoSectionsEditor
              sections={form.projectCreditMemoSections}
              onAnswerChange={(sectionId, questionId, value) =>
                updateMemoAnswer("projectCreditMemoSections", sectionId, questionId, value)
              }
              onDateChange={(sectionId, value) =>
                updateRow("projectCreditMemoSections", sectionId, { lastCheckedDate: value })
              }
            />
          </div>
        </FormSection>



        {errors.length > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 space-y-1">
            {errors.map((e, i) => (
              <p key={i} className="text-sm text-red-700">
                ✖ {e}
              </p>
            ))}
          </div>
        )}

        {/* Action bar — Investments Team only (submission buttons are field-level controls too) */}
        {readOnly ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-md px-5 py-4 mt-4">
            <span className="text-xs text-gray-400">
              View only — the Investments Team fills and submits this form while the lead is in
              preparation.
            </span>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-md px-5 py-4 mt-4 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSubmitToIC}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              {isResubmit ? "Resubmit to IC" : "Submit to IC"}
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={handleDeleteDraft}
              className="ml-auto text-sm text-red-500 hover:text-red-700 transition-colors"
            >
              Delete draft
            </button>
            <span className="w-full text-xs text-gray-400">
              Submitting moves the request to IC Credit Review (Request State: Pending review). Prototype:
              data is stored in your browser only.
            </span>
          </div>
        )}
      </fieldset>
    </div>
  );
}

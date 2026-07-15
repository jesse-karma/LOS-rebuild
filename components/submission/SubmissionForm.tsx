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
  REFERRAL_SOURCES,
  SECTORS,
  STRUCTURED_LOAN_USES,
  approvalTypesForAssetClass,
  returnTypesForApprovalType,
  subSectorsForSector,
  typeLabelForAssetClass,
} from "@/data/masterData";
import { isAssetAOrD, isAssetB } from "@/lib/assetClass";
import {
  SubmissionFormData,
  StoredSubmission,
  SubmissionBranchRow,
  SubmissionContactRow,
  SubmissionDisbursementRow,
  SubmissionFixedRow,
  SubmissionPayorRow,
  SubmissionPTRow,
  emptySubmissionForm,
  newRowId,
  requestedAmountWarning,
  saveSubmission,
  deleteSubmission,
  mostRecentBrandProject,
  getAllBrands,
  brandHistoryFor,
} from "@/lib/submissionsStore";
import { useProfile } from "@/lib/profileStore";
import { canEdit } from "@/lib/access";
import { existingUboExposure, uboExposureLevel } from "@/lib/exposure";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm px-5 py-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-2">{title}</h2>
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
                className={`py-2 px-2 font-medium ${i === 0 ? "pl-3 w-8" : ""} ${
                  i === headers.length - 1 && h === "" ? "w-10" : ""
                }`}
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
    if (isProject && next.branches.length === 0) next.branches = [blankBranch()];
  }
  if (isProject && next.disbursements.length === 0) next.disbursements = [blankDisbursement()];
  if (isProject && isAssetB(f.assetClass) && next.payorInvoices.length === 0) {
    next.payorInvoices = [blankPayorRow()];
  }
  if (isProject && f.returnType.includes("Fixed Amount Repayment") && next.fixedSchedule.length === 0) {
    next.fixedSchedule = [blankFixedRow()];
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
    wc: submission.form.proposedWCSubLimit ? formatAmountInput(String(submission.form.proposedWCSubLimit)) : "",
  });
  const [finReviewTexts, setFinReviewTexts] = useState({
    current: submission.form.finReviewLimitCurrent
      ? formatAmountInput(String(submission.form.finReviewLimitCurrent))
      : "",
    recommended: submission.form.finReviewLimitRecommended
      ? formatAmountInput(String(submission.form.finReviewLimitRecommended))
      : "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [brandSearch, setBrandSearch] = useState(form.brandName);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  
  // Extract the free text part from the existing project name (for edit mode)
  const existingFreeText = (() => {
    const parts = form.projectName.split(" - ");
    if (parts.length > 3) {
      return parts.slice(3).join(" - ");
    }
    return "";
  })();
  const [projectFreeText, setProjectFreeText] = useState(existingFreeText);
  
  const allBrands = getAllBrands();
  const filteredBrands = allBrands.filter((b) =>
    b.toLowerCase().includes(brandSearch.toLowerCase())
  );
  
  // Calculate project number: length of brand history + 1
  const projectNumber = brandHistoryFor(form.brandName).length + 1;
  // Get the type label from asset class
  const typeLabel = typeLabelForAssetClass(form.assetClass);
  
  // Build the full project name
  const generateProjectName = () => {
    const baseParts = [form.brandName, `#${projectNumber}`, typeLabel];
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
  }, [form.brandName, projectNumber, typeLabel, projectFreeText]);
  
  // Extract free text from projectName if it's updated externally (e.g., initial load)
  useEffect(() => {
    const parts = form.projectName.split(" - ");
    if (parts.length > 3) {
      const freeTextFromName = parts.slice(3).join(" - ");
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
  // Which deal-terms subsection the selected Return Type calls for
  const wantsRevShare = form.returnType.includes("Revenue Share") || form.returnType === "Profit Share";
  const wantsFixed = form.returnType.includes("Fixed Amount Repayment");
  const wantsDaily = form.returnType === "Daily Interest";

  // Dependent master-data option lists
  const approvalTypeOptions = approvalTypesForAssetClass(form.assetClass);
  const returnTypeOptions = returnTypesForApprovalType(form.approvalType);
  const subSectorOptions = subSectorsForSector(form.mainSector);

  // Live warnings (spec column U)
  const amountWarning = requestedAmountWarning({
    ...form,
    requestedAmount: parseAmount(amountText),
    proposedTotalLimit: parseAmount(plafondTexts.total),
    finReviewLimitCurrent: parseAmount(finReviewTexts.current),
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

  /** Asset Class drives allowed Approval Types (ENUM §3/§4); Approval Type drives Return Types (§5). */
  function setAssetClass(assetClass: string) {
    setForm((f) => {
      const allowedTypes = approvalTypesForAssetClass(assetClass);
      const approvalType = (
        allowedTypes.includes(f.approvalType) ? f.approvalType : allowedTypes[0]
      ) as ApprovalType;
      const allowedReturns = returnTypesForApprovalType(approvalType);
      const returnType = allowedReturns.includes(f.returnType) ? f.returnType : allowedReturns[0];
      return withStarterRows({ ...f, assetClass, approvalType, returnType });
    });
  }

  function setApprovalType(approvalType: ApprovalType) {
    setForm((f) => {
      const allowedReturns = returnTypesForApprovalType(approvalType);
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

  // ── Dynamic row helpers ([+]/[✍️]/[-] pattern) ─────────────────────────────

  function updateRow<
    K extends "kpContacts" | "disbursements" | "branches" | "ptDetails" | "fixedSchedule" | "payorInvoices"
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

  function removeRow(
    key: "kpContacts" | "disbursements" | "branches" | "ptDetails" | "fixedSchedule" | "payorInvoices",
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
        proposedWCSubLimit: parseAmount(plafondTexts.wc),
        finReviewLimitCurrent: parseAmount(finReviewTexts.current),
        finReviewLimitRecommended: parseAmount(finReviewTexts.recommended),
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
      errs.push("Financial Review: state which financial reports were reviewed.");
    if (!form.finReviewPeriodEnding)
      errs.push("Financial Review: the reports' period ending date is required.");

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

    if (!form.kpCreditMemo.trim()) errs.push("Karmapreneur Credit Memo is required.");
    if (!form.projectCreditMemo.trim()) errs.push("Project Credit Memo is required.");

    return errs;
  }

  function handleSaveDraft() {
    saveSubmission(currentDraft("draft"));
    router.push("/");
  }

  function handleSubmitToIC() {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;
    saveSubmission(currentDraft("submitted"));
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
            <Field label="Referral Source" source="master">
              <select
                className={inputCls}
                value={form.referralSource}
                onChange={(e) => set("referralSource", e.target.value)}
              >
                {REFERRAL_SOURCES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Specific Referror" source="free" hint="Who referred this Karmapreneur (optional)">
              <input
                className={inputCls}
                value={form.specificReferror}
                onChange={(e) => set("specificReferror", e.target.value)}
                placeholder="e.g. Iman Kusumaputra"
              />
            </Field>
            <Field label="Referror belongs to KP / Brand" source="free" hint="Optional">
              <input
                className={inputCls}
                value={form.referrorBelongsToKP}
                onChange={(e) => set("referrorBelongsToKP", e.target.value)}
                placeholder="e.g. Kopi Kalyan"
              />
            </Field>
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
          <Field label="Asset Class" source="master" hint="Changing it filters the allowed Types">
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
          </Field>
          <Field label="Type" source="master" hint="Auto-filled from Asset Class">
            <input
              className={`${inputCls} bg-gray-50 text-gray-500`}
              value={typeLabelForAssetClass(form.assetClass)}
              readOnly
            />
          </Field>
          <Field label="Requested Amount" source="free" hint="USD converts to IDR at JISDOR (T-1 working day)">
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
          </Field>
          <Field label="Sector" source="master">
            <select className={inputCls} value={form.mainSector} onChange={(e) => setSector(e.target.value)}>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          {form.mainSector === "Other" ? (
            <Field label="Sub-sector" source="free" hint="Free text — no sub-sector list under Other">
              <input
                className={inputCls}
                value={form.subSector}
                onChange={(e) => set("subSector", e.target.value)}
                placeholder="e.g. Pet Grooming"
              />
            </Field>
          ) : (
            <Field label="Sub-sector" source="master" hint={`${subSectorOptions.length} sub-sectors under ${form.mainSector}`}>
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
            </Field>
          )}
          <Field label="Syariah Project?" source="free">
            <label className="flex items-center gap-2 text-sm text-gray-700 py-2">
              <input
                type="checkbox"
                checked={form.syariah}
                onChange={(e) => set("syariah", e.target.checked)}
                className="rounded border-gray-300"
              />
              Syariah
            </label>
          </Field>
          <Field label="Syariah Notes" source="free" hint="Shown on the IC card next to the Syariah tag">
            <textarea
              className={`${inputCls} min-h-20 resize-y`}
              value={form.syariahNotes}
              onChange={(e) => set("syariahNotes", e.target.value)}
              placeholder="e.g. Mudarabah scheme using buy-sell to PT Artha"
            />
          </Field>
        </FormSection>

        <FormSection title="Plafond & Financial Review">
          {hasPlafond && (
            <>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-1">
              Proposed Limit
            </h3>
            <EditTable
              headers={["Limit Status", "Total Limit", "PO Sub Limit", "Working Capital Sub Limit"]}
              minWidthCls="min-w-[560px]"
            >
              <tr className="bg-purple-50/30 align-top">
                <td className="py-3 pl-3 pr-2 font-semibold text-purple-800 whitespace-nowrap">Proposed</td>
                <td className="py-2 px-2">
                  <input
                    className={`${cellInputCls} font-mono`}
                    inputMode="numeric"
                    value={plafondTexts.total}
                    onChange={(e) =>
                      setPlafondTexts((t) => ({ ...t, total: formatAmountInput(e.target.value) }))
                    }
                    placeholder="5.000.000.000"
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    className={`${cellInputCls} font-mono`}
                    inputMode="numeric"
                    value={plafondTexts.po}
                    onChange={(e) =>
                      setPlafondTexts((t) => ({ ...t, po: formatAmountInput(e.target.value) }))
                    }
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    className={`${cellInputCls} font-mono`}
                    inputMode="numeric"
                    value={plafondTexts.wc}
                    onChange={(e) =>
                      setPlafondTexts((t) => ({ ...t, wc: formatAmountInput(e.target.value) }))
                    }
                  />
                </td>
              </tr>
            </EditTable>
            <p className="text-[10px] text-gray-400 mt-2">
              Amounts in Rp. Current and Superseded rows appear on the IC review card once the
              submission is linked to the KP&apos;s plafond history.
            </p>
            </>
          )}

          <h3
            className={`text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 ${
              hasPlafond ? "mt-6" : "mt-1"
            }`}
          >
            Financial Review
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Which financials you reviewed and your limit recommendation — shown as Review 1 on the
            IC card, and required before submitting to IC.
          </p>
          <Field
            label="Financial Reports Reviewed"
            source="free"
            hint="Which statements / reports you looked at"
          >
            <input
              className={inputCls}
              value={form.finReviewReportsReviewed}
              onChange={(e) => set("finReviewReportsReviewed", e.target.value)}
              placeholder="e.g. FY2025 audited P&L + Jan–May 2026 management accounts"
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
          <Field label="Limit Recommendation" source="master">
            <select
              className={inputCls}
              value={form.finReviewLimitRecommendation}
              onChange={(e) =>
                set(
                  "finReviewLimitRecommendation",
                  e.target.value as SubmissionFormData["finReviewLimitRecommendation"]
                )
              }
            >
              <option value="Keep">Keep</option>
              <option value="Increase">Increase</option>
              <option value="Decrease">Decrease</option>
            </select>
          </Field>
          <Field
            label="Current Total Limit (Rp)"
            source="free"
            hint="Leave empty if the brand has no total limit on file yet"
          >
            <input
              className={`${inputCls} font-mono`}
              inputMode="numeric"
              value={finReviewTexts.current}
              onChange={(e) =>
                setFinReviewTexts((t) => ({ ...t, current: formatAmountInput(e.target.value) }))
              }
              placeholder="5.000.000.000"
            />
          </Field>
          {form.finReviewLimitRecommendation !== "Keep" && (
            <Field label="Recommended Total Limit (Rp)" source="free">
              <input
                className={`${inputCls} font-mono`}
                inputMode="numeric"
                value={finReviewTexts.recommended}
                onChange={(e) =>
                  setFinReviewTexts((t) => ({
                    ...t,
                    recommended: formatAmountInput(e.target.value),
                  }))
                }
                placeholder="7.000.000.000"
              />
            </Field>
          )}
          <Field label="Review Notes" source="free">
            <textarea
              className={`${inputCls} min-h-20 resize-y`}
              value={form.finReviewNotes}
              onChange={(e) => set("finReviewNotes", e.target.value)}
              placeholder="Key takeaways from the financials — margins, trends, red flags…"
            />
          </Field>
        </FormSection>

        {isAD && (
          <FormSection title="Karmapreneur Contacts">
            <p className="text-xs text-gray-500 mb-3">
              List the people behind this Karmapreneur — owners, directors, and guarantors. Mark at
              least one <strong className="text-gray-600">Key Person</strong>; key persons need a
              SLIK file before IC approval.
            </p>
            <EditTable
                headers={[
                  "#",
                  "Name",
                  "WhatsApp",
                  "Email",
                  "Role",
                  "Notes",
                  "Key Person?",
                  "SLIK File URL",
                  "SLIK Exec Summary",
                  "UBO Exposure (Rp)",
                  "",
                ]}
                minWidthCls="min-w-[1200px]"
              >
                {form.kpContacts.map((c, i) => (
                  <tr key={c.id} className="align-top">
                    <td className="py-2 pl-3 pr-2 pt-3.5 text-gray-400 font-medium">{i + 1}</td>
                    <td className="py-2 px-2 min-w-40">
                      <input
                        className={cellInputCls}
                        value={c.name}
                        onChange={(e) => updateRow("kpContacts", c.id, { name: e.target.value })}
                        placeholder="e.g. Tyo Kusumaputera"
                      />
                    </td>
                    <td className="py-2 px-2 min-w-32">
                      <div>
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
                      </div>
                    </td>
                    <td className="py-2 px-2 min-w-40">
                      <div>
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
                      </div>
                    </td>
                    <td className="py-2 px-2 min-w-24">
                      <input
                        className={cellInputCls}
                        value={c.role}
                        onChange={(e) => updateRow("kpContacts", c.id, { role: e.target.value })}
                        placeholder="e.g. CEO"
                      />
                    </td>
                    <td className="py-2 px-2 min-w-40">
                      <input
                        className={cellInputCls}
                        value={c.notesOnPerson}
                        onChange={(e) => updateRow("kpContacts", c.id, { notesOnPerson: e.target.value })}
                        placeholder="e.g. Founder; runs day-to-day ops"
                      />
                    </td>
                    <td className="py-2 px-2 pt-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={c.isKeyPerson}
                        onChange={(e) => updateRow("kpContacts", c.id, { isKeyPerson: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="py-2 px-2 min-w-40">
                      <input
                        className={cellInputCls}
                        value={c.slikFileUrl}
                        onChange={(e) => updateRow("kpContacts", c.id, { slikFileUrl: e.target.value })}
                        placeholder="https://drive.google.com/…"
                      />
                    </td>
                    <td className="py-2 px-2 min-w-40">
                      <input
                        className={cellInputCls}
                        value={c.slikExecSummary}
                        onChange={(e) => updateRow("kpContacts", c.id, { slikExecSummary: e.target.value })}
                        placeholder="e.g. Kol 1, no arrears"
                      />
                    </td>
                    <td className="py-2 px-2 min-w-32 pt-3.5 text-xs">
                      {(() => {
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
                      })()}
                    </td>
                    <td className="py-2 px-2">
                      <RemoveRowButton onClick={() => removeRow("kpContacts", c.id)} />
                    </td>
                  </tr>
                ))}
              </EditTable>
            <AddRowButton label="Add contact" onClick={addContact} />
            <p className="text-[10px] text-gray-400 mt-1">
              SLIK File URL is required before approval for key persons.
            </p>
          </FormSection>
        )}

        {isAD && (
          <FormSection title="PT Details">
            <p className="text-xs text-gray-500 mb-3">
              The legal entities (PTs) receiving disbursements and their bank accounts. The
              accountholder name should match the PT name — mismatches are flagged to IC.
            </p>
            <EditTable
              headers={[
                "#",
                "PT Name",
                "Bank",
                "Account Number",
                "Accountholder Name",
                "SLIK-PT File URL",
                "SLIK-PT Exec Summary",
                "",
              ]}
              minWidthCls="min-w-[960px]"
            >
              {form.ptDetails.map((pt, i) => (
                <tr key={pt.id} className="align-top">
                  <td className="py-2 pl-3 pr-2 pt-3.5 text-gray-400 font-medium">{i + 1}</td>
                  <td className="py-2 px-2 min-w-40">
                    <input
                      className={cellInputCls}
                      value={pt.name}
                      onChange={(e) => updateRow("ptDetails", pt.id, { name: e.target.value })}
                      placeholder="e.g. PT Tuku Sejahtera"
                    />
                  </td>
                  <td className="py-2 px-2 min-w-24">
                    <input
                      className={cellInputCls}
                      value={pt.bank}
                      onChange={(e) => updateRow("ptDetails", pt.id, { bank: e.target.value })}
                      placeholder="e.g. BCA"
                    />
                  </td>
                  <td className="py-2 px-2 min-w-32">
                    <input
                      className={cellInputCls}
                      inputMode="numeric"
                      value={pt.accountNumber}
                      onChange={(e) => updateRow("ptDetails", pt.id, { accountNumber: e.target.value })}
                      placeholder="e.g. 5271038812"
                    />
                  </td>
                  <td className="py-2 px-2 min-w-40">
                    <input
                      className={cellInputCls}
                      value={pt.accountholderName}
                      onChange={(e) => updateRow("ptDetails", pt.id, { accountholderName: e.target.value })}
                      placeholder="e.g. PT Tuku Sejahtera"
                    />
                    {pt.name.trim() &&
                      pt.accountholderName.trim() &&
                      pt.name.trim() !== pt.accountholderName.trim() && (
                        <InlineWarning message="Mismatch on accountholder and PT names" />
                      )}
                  </td>
                  <td className="py-2 px-2 min-w-40">
                    <input
                      className={cellInputCls}
                      value={pt.slikFileUrl}
                      onChange={(e) => updateRow("ptDetails", pt.id, { slikFileUrl: e.target.value })}
                      placeholder="https://drive.google.com/…"
                    />
                  </td>
                  <td className="py-2 px-2 min-w-40">
                    <input
                      className={cellInputCls}
                      value={pt.slikExecSummary}
                      onChange={(e) => updateRow("ptDetails", pt.id, { slikExecSummary: e.target.value })}
                      placeholder="e.g. Kol 1, no arrears"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <RemoveRowButton onClick={() => removeRow("ptDetails", pt.id)} />
                  </td>
                </tr>
              ))}
            </EditTable>
            <AddRowButton label="Add PT" onClick={addPT} />
          </FormSection>
        )}

        {isProjectType && (
          <FormSection title="Project Terms Details">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-1">
              Disbursement Schedule
            </h3>
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
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-3">
                  Payor / PO / Invoice Details
                </h3>
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
              </>
            )}

            {wantsRevShare && (
              <>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-3">
                  Revenue Share Terms
                </h3>
                <Field label="Source of Revenue Accrued" source="free">
                  <input
                    className={inputCls}
                    value={form.rsSourceOfRevenue}
                    onChange={(e) => set("rsSourceOfRevenue", e.target.value)}
                    placeholder="e.g. All revenue of the financed branches"
                  />
                </Field>
                <Field label="Revenue Share %" source="free" hint="Pre-BEP / Post-BEP, % of revenue">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      className={inputCls}
                      value={form.rsPreBEPPct || ""}
                      onChange={(e) => set("rsPreBEPPct", Number(e.target.value) || 0)}
                      placeholder="Pre-BEP, e.g. 6"
                    />
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      className={inputCls}
                      value={form.rsPostBEPPct || ""}
                      onChange={(e) => set("rsPostBEPPct", Number(e.target.value) || 0)}
                      placeholder="Post-BEP, e.g. 4"
                    />
                  </div>
                </Field>
                <Field label="Carry %" source="free" hint="Fixed Platform Fee">
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className={inputCls}
                    value={form.rsCarryPct || ""}
                    onChange={(e) => set("rsCarryPct", Number(e.target.value) || 0)}
                    placeholder="e.g. 20"
                  />
                </Field>
                <Field label="Frequency" source="master" hint="Monthly is the default — the IC card warns otherwise">
                  <select
                    className={inputCls}
                    value={form.rsFrequency}
                    onChange={(e) => set("rsFrequency", e.target.value)}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Quarterly">Quarterly</option>
                  </select>
                </Field>
                <Field label="Due Date" source="free">
                  <input
                    className={inputCls}
                    value={form.rsDueDate}
                    onChange={(e) => set("rsDueDate", e.target.value)}
                    placeholder="e.g. 5th of the following month"
                  />
                </Field>
                <Field label="Cap Type" source="master">
                  <select
                    className={inputCls}
                    value={form.rsCapType}
                    onChange={(e) =>
                      set("rsCapType", e.target.value as SubmissionFormData["rsCapType"])
                    }
                  >
                    <option value="Return Cap">Return Cap</option>
                    <option value="Time Cap">Time Cap</option>
                  </select>
                </Field>
                {form.rsCapType === "Return Cap" ? (
                  <Field label="Cap Multiple (x)" source="free" hint="Investor cap multiple">
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      className={inputCls}
                      value={form.rsCapMultiple || ""}
                      onChange={(e) => set("rsCapMultiple", Number(e.target.value) || 0)}
                      placeholder="e.g. 1.4"
                    />
                  </Field>
                ) : (
                  <Field label="Time Cap Period (months)" source="free">
                    <input
                      type="number"
                      inputMode="numeric"
                      className={inputCls}
                      value={form.rsCapTimeMonths || ""}
                      onChange={(e) => set("rsCapTimeMonths", Number(e.target.value) || 0)}
                      placeholder="e.g. 36"
                    />
                  </Field>
                )}
                <Field label="Revenue Share Start" source="master">
                  <select
                    className={inputCls}
                    value={form.rsStartType}
                    onChange={(e) =>
                      set("rsStartType", e.target.value as SubmissionFormData["rsStartType"])
                    }
                  >
                    <option value="Anchored to Branch Opening">Anchored to Branch Opening</option>
                    <option value="Fixed">Fixed start date</option>
                  </select>
                </Field>
                {form.rsStartType === "Fixed" && (
                  <Field label="Fixed Start Date" source="free">
                    <input
                      type="date"
                      className={inputCls}
                      value={form.rsStartDate}
                      onChange={(e) => set("rsStartDate", e.target.value)}
                    />
                  </Field>
                )}
              </>
            )}

            {wantsFixed && (
              <>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-3">
                  Fixed Repayment Schedule
                </h3>
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
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-3">
                  Daily Interest Terms
                </h3>
                <Field label="Interest Rate (30-day) %" source="free">
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className={inputCls}
                    value={form.diInterestRate30d || ""}
                    onChange={(e) => set("diInterestRate30d", Number(e.target.value) || 0)}
                    placeholder="e.g. 1.8"
                  />
                </Field>
                <Field label="Service Fee (30-day) %" source="free">
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className={inputCls}
                    value={form.diServiceFee30d || ""}
                    onChange={(e) => set("diServiceFee30d", Number(e.target.value) || 0)}
                    placeholder="e.g. 0.2"
                  />
                </Field>
                <Field label="Tenor (days)" source="free">
                  <input
                    type="number"
                    inputMode="numeric"
                    className={inputCls}
                    value={form.diTenorDays || ""}
                    onChange={(e) => set("diTenorDays", Number(e.target.value) || 0)}
                    placeholder="e.g. 90"
                  />
                </Field>
                <Field label="Minimum Interest Period (days)" source="free">
                  <input
                    type="number"
                    inputMode="numeric"
                    className={inputCls}
                    value={form.diMinInterestDays || ""}
                    onChange={(e) => set("diMinInterestDays", Number(e.target.value) || 0)}
                    placeholder="e.g. 30"
                  />
                </Field>
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

            {isAD && (
              <>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-3">
              Branch Details
            </h3>
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

            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-3">
              Late Fees
            </h3>
            {isB ? (
              <p className="text-xs text-gray-500">
                Asset B late fees follow policy from the Daily Interest terms: basis{" "}
                <strong className="text-gray-600">Outstanding Principal</strong>, no grace period,
                daily late fee = 30-day rate ÷ 30. Nothing to fill in here.
              </p>
            ) : (
              <>
            <Field
              label="Late Fee Basis"
              source="free"
              hint="Default: Overdue Amount — the IC card warns on deviations"
            >
              <input
                className={inputCls}
                value={form.lfBasis}
                onChange={(e) => set("lfBasis", e.target.value)}
                placeholder="Overdue Amount"
              />
            </Field>
            <Field label="Grace Period (days)" source="free" hint="Default: 5 days">
              <input
                type="number"
                inputMode="numeric"
                className={inputCls}
                value={form.lfGraceDays || ""}
                onChange={(e) => set("lfGraceDays", Number(e.target.value) || 0)}
                placeholder="5"
              />
            </Field>
            <Field
              label="Daily Late Fee %"
              source="free"
              hint="To Investors / to ASN — defaults 0.08 / 0.02 per day"
            >
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className={inputCls}
                  value={form.lfDailyPctInvestors || ""}
                  onChange={(e) => set("lfDailyPctInvestors", Number(e.target.value) || 0)}
                  placeholder="Investors, e.g. 0.08"
                />
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className={inputCls}
                  value={form.lfDailyPctASN || ""}
                  onChange={(e) => set("lfDailyPctASN", Number(e.target.value) || 0)}
                  placeholder="ASN, e.g. 0.02"
                />
              </div>
            </Field>
              </>
            )}
          </FormSection>
        )}

        <FormSection title="Credit Memo and Notes">
          {isAD && (
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
            </Field>
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
            <Field label="Karmapreneur Credit Memo" source="free">
              <textarea
                className={`${inputCls} min-h-24 resize-y`}
                value={form.kpCreditMemo}
                onChange={(e) => set("kpCreditMemo", e.target.value)}
                placeholder="Summary of the credit case for this Karmapreneur…"
              />
            </Field>
          )}
          <Field label="Project Credit Memo" source="free">
            <textarea
              className={`${inputCls} min-h-24 resize-y`}
              value={form.projectCreditMemo}
              onChange={(e) => set("projectCreditMemo", e.target.value)}
              placeholder="Summary of the credit case for this project…"
            />
          </Field>
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
              Submit to IC
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

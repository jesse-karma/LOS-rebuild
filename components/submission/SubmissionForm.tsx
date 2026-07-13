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
} from "@/lib/submissionsStore";
import { isAnalystRole, useProfile } from "@/lib/profileStore";

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
    !c.role.trim() &&
    !c.notesOnPerson.trim() &&
    !c.slikFileUrl.trim() &&
    !c.slikExecSummary.trim() &&
    !c.isKeyPerson &&
    c.uboExposure === 0
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

function blankContact(): SubmissionContactRow {
  return {
    id: newRowId(),
    name: "",
    role: "",
    notesOnPerson: "",
    isKeyPerson: false,
    slikFileUrl: "",
    slikExecSummary: "",
    uboExposure: 0,
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
  // Merge over defaults so drafts saved before new fields existed stay controlled.
  const [form, setForm] = useState<SubmissionFormData>(() =>
    withStarterRows({
      ...emptySubmissionForm(),
      ...submission.form,
      // A submission carries exactly one PT; older drafts may have stored more.
      ptDetails: (submission.form.ptDetails ?? []).slice(0, 1),
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

  // On a brand-new form, the creator becomes Created by and the default Primary Analyst (spec S8).
  useEffect(() => {
    if (isNew) {
      setForm((f) => ({
        ...f,
        createdBy: user.name,
        primaryAnalyst: isAnalystRole(user.role) ? user.name : f.primaryAnalyst,
      }));
    }
  }, [isNew, user]);

  const hasPlafond = form.approvalType.includes("Plafond");
  const isProjectType = form.approvalType !== "Plafond";
  // The A&D spec sections (contacts, terms, PT, memos) only apply to Asset A / D submissions.
  const isAD = isAssetAOrD(form.assetClass);
  /** Single PT per submission — the starter effect guarantees one exists for A/D. */
  const ptDetail = form.ptDetails[0];
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
  });
  const filledDisbursements = form.disbursements.filter((d) => !disbursementIsBlank(d));
  const disbursementSum = filledDisbursements.reduce((sum, d) => sum + d.amount, 0);
  const disbursementMismatch =
    filledDisbursements.length > 0 && disbursementSum !== parseAmount(amountText);

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
    if (!form.projectName.trim()) errs.push("Project Name is required.");
    if (isProjectType && parseAmount(amountText) <= 0) errs.push("Requested Amount must be greater than zero.");
    if (hasPlafond && parseAmount(plafondTexts.total) <= 0)
      errs.push("Proposed Total Limit must be greater than zero for a Plafond submission.");
    if (!form.finReviewReportsReviewed.trim())
      errs.push("Financial Review: state which financial reports were reviewed.");
    if (!form.finReviewPeriodEnding)
      errs.push("Financial Review: the reports' period ending date is required.");
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
          Fill in the project details, then submit to IC. You can save a draft at any time.
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

      <div className="space-y-4">
        <FormSection title="What are we reviewing?">
          <Field label="Brand" source="free" hint="Lookup to Karmapreneur — type a new name to create it">
            <input
              className={inputCls}
              value={form.brandName}
              onChange={(e) => {
                const brand = e.target.value;
                setForm((f) => ({
                  ...f,
                  brandName: brand,
                  // Pre-fill "[Brand] - " while the analyst hasn't typed a custom name
                  projectName:
                    !f.projectName || f.projectName === `${f.brandName} - `
                      ? `${brand} - `
                      : f.projectName,
                }));
              }}
              placeholder="e.g. Kopi Tuku"
            />
          </Field>
          <Field label="Project Name" source="free">
            <input
              className={inputCls}
              value={form.projectName}
              onChange={(e) => set("projectName", e.target.value)}
              placeholder="e.g. Kopi Tuku - Blok A"
            />
          </Field>
          <Field label="Asset Class" source="master" hint="Changing it filters the allowed Types">
            <select
              className={inputCls}
              value={form.assetClass}
              onChange={(e) => setAssetClass(e.target.value)}
            >
              {/* Asset C is parked for now — not selectable on new submissions. */}
              {ASSET_CLASSES.filter((a) => a !== "C").map((a) => (
                <option key={a} value={a}>
                  Asset Class {a}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Type"
            source="master"
            hint={`Allowed for Asset ${form.assetClass}: ${approvalTypeOptions.join(", ")}`}
          >
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
          </Field>
          <Field label="New Karmapreneur?" source="free">
            <label className="flex items-center gap-2 text-sm text-gray-700 py-2">
              <input
                type="checkbox"
                checked={form.brandIsNew}
                onChange={(e) => set("brandIsNew", e.target.checked)}
                className="rounded border-gray-300"
              />
              First project for this brand
            </label>
          </Field>
        </FormSection>

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
              placeholder="e.g. Iman Kusumaputera"
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

        {isProjectType && (
          <FormSection title="Project Details">
            <Field label="Sector" source="master">
              <select className={inputCls} value={form.mainSector} onChange={(e) => setSector(e.target.value)}>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
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
            {form.syariah && (
              <Field label="Syariah Notes" source="free" hint="Shown on the IC card next to the Syariah tag">
                <textarea
                  className={`${inputCls} min-h-20 resize-y`}
                  value={form.syariahNotes}
                  onChange={(e) => set("syariahNotes", e.target.value)}
                  placeholder="e.g. Mudarabah scheme using buy-sell to PT Artha"
                />
              </Field>
            )}
            <Field label="Requested Amount" source="free" hint="USD converts to IDR at JISDOR (T-1 working day)">
              <div className="flex gap-2">
                <select
                  className={`${inputCls} !w-24`}
                  value={form.requestedAmountCurrency}
                  onChange={(e) =>
                    set("requestedAmountCurrency", e.target.value as "IDR" | "USD")
                  }
                >
                  <option value="IDR">Rp</option>
                  <option value="USD">USD</option>
                </select>
                <input
                  className={`${inputCls} font-mono`}
                  inputMode="numeric"
                  value={amountText}
                  onChange={(e) => setAmountText(formatAmountInput(e.target.value))}
                  placeholder="2.000.000.000"
                />
              </div>
              {amountWarning && <InlineWarning message={amountWarning} />}
            </Field>
            <Field label="Financing Use" source="master" hint="Structured Loan Use enum">
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
            </Field>
            <Field
              label="Financing Type"
              source="master"
              hint={`Return Types allowed for ${form.approvalType}: ${returnTypeOptions.join(", ")}`}
            >
              <select
                className={inputCls}
                value={form.returnType}
                onChange={(e) => setReturnType(e.target.value)}
              >
                {returnTypeOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </FormSection>
        )}

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
                  "Role",
                  "Notes",
                  "Key Person?",
                  "SLIK File URL",
                  "SLIK Exec Summary",
                  "UBO Exposure (Rp)",
                  "",
                ]}
                minWidthCls="min-w-[960px]"
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
                    <td className="py-2 px-2 min-w-32">
                      <input
                        className={`${cellInputCls} font-mono`}
                        inputMode="numeric"
                        value={c.uboExposure ? formatAmountInput(String(c.uboExposure)) : ""}
                        onChange={(e) =>
                          updateRow("kpContacts", c.id, { uboExposure: parseAmount(e.target.value) })
                        }
                        placeholder="500.000.000"
                      />
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

        {isAD && ptDetail && (
          <FormSection title="PT Details">
            <p className="text-xs text-gray-500 mb-3">
              The legal entity (PT) receiving the disbursement and its bank account. The
              accountholder name should match the PT name — mismatches are flagged to IC.
            </p>
            <Field label="PT Name" source="free">
              <input
                className={inputCls}
                value={ptDetail.name}
                onChange={(e) => updateRow("ptDetails", ptDetail.id, { name: e.target.value })}
                placeholder="e.g. PT Tuku Sejahtera"
              />
            </Field>
            <Field label="Bank" source="free">
              <input
                className={inputCls}
                value={ptDetail.bank}
                onChange={(e) => updateRow("ptDetails", ptDetail.id, { bank: e.target.value })}
                placeholder="e.g. BCA"
              />
            </Field>
            <Field label="Account Number" source="free">
              <input
                className={inputCls}
                inputMode="numeric"
                value={ptDetail.accountNumber}
                onChange={(e) => updateRow("ptDetails", ptDetail.id, { accountNumber: e.target.value })}
                placeholder="e.g. 5271038812"
              />
            </Field>
            <Field label="Accountholder Name" source="free">
              <input
                className={inputCls}
                value={ptDetail.accountholderName}
                onChange={(e) =>
                  updateRow("ptDetails", ptDetail.id, { accountholderName: e.target.value })
                }
                placeholder="e.g. PT Tuku Sejahtera"
              />
              {ptDetail.name.trim() &&
                ptDetail.accountholderName.trim() &&
                ptDetail.name.trim() !== ptDetail.accountholderName.trim() && (
                  <InlineWarning message="Mismatch on accountholder and PT names" />
                )}
            </Field>
            <Field label="SLIK-PT File URL" source="free">
              <input
                className={inputCls}
                value={ptDetail.slikFileUrl}
                onChange={(e) => updateRow("ptDetails", ptDetail.id, { slikFileUrl: e.target.value })}
                placeholder="https://drive.google.com/…"
              />
            </Field>
            <Field label="SLIK-PT Exec Summary" source="free">
              <input
                className={inputCls}
                value={ptDetail.slikExecSummary}
                onChange={(e) => updateRow("ptDetails", ptDetail.id, { slikExecSummary: e.target.value })}
                placeholder="e.g. Kol 1, no arrears"
              />
            </Field>
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

        <FormSection title="Other">
          <Field label="Funding Source" source="master">
            <select
              className={inputCls}
              value={form.fundingSource}
              onChange={(e) => set("fundingSource", e.target.value)}
            >
              {FUNDING_SOURCES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            {form.fundingSource === "Members" && (
              <InlineWarning message="Warning: this is a Members project" />
            )}
          </Field>
          <Field label="Tax Withholdings" source="master">
            <select
              className={inputCls}
              value={form.taxWithholdings}
              onChange={(e) =>
                set("taxWithholdings", e.target.value as SubmissionFormData["taxWithholdings"])
              }
            >
              <option value="TBD">TBD</option>
              <option value="Yes">Karmapreneur will withhold</option>
              <option value="No">Karmapreneur will NOT withhold</option>
            </select>
            {form.taxWithholdings === "No" && (
              <InlineWarning message="Warning: Karmapreneur will NOT withhold taxes" />
            )}
          </Field>
          {/* Spec C101: only display if Funding Source includes Members */}
          {form.fundingSource === "Members" && (
            <Field label="Bank Details for PT (Members)" source="free">
              <label className="flex items-center gap-2 text-sm text-gray-700 py-2">
                <input
                  type="checkbox"
                  checked={form.bankDetailsReviewed}
                  onChange={(e) => set("bankDetailsReviewed", e.target.checked)}
                  className="rounded border-gray-300"
                />
                Bank details for PT reviewed by Finance / Analyst
              </label>
              {!form.bankDetailsReviewed && (
                <InlineWarning message="Bank Details Not Yet Reviewed by Finance/Analyst and going to Members" />
              )}
            </Field>
          )}
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

        {/* Action bar */}
        <div className="sticky bottom-0 bg-white border border-gray-200 rounded-xl shadow-md px-5 py-4 flex items-center gap-3 flex-wrap">
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
      </div>
    </div>
  );
}

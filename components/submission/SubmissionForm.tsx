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
import { isAssetAOrD } from "@/lib/assetClass";
import {
  SubmissionFormData,
  StoredSubmission,
  SubmissionBranchRow,
  SubmissionContactRow,
  SubmissionDisbursementRow,
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
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

/** "Master data" = closed enum in the production DB; "Free input" = analyst types it. */
function SourceBadge({ source }: { source: "master" | "free" }) {
  return source === "master" ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded normal-case tracking-normal">
      <Database className="w-2.5 h-2.5" />
      Master data
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded normal-case tracking-normal">
      <PenLine className="w-2.5 h-2.5" />
      Free input
    </span>
  );
}

function Field({
  label,
  source,
  hint,
  children,
  full,
}: {
  label: string;
  source: "master" | "free";
  hint?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
        <SourceBadge source={source} />
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
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

/** One removable row of a dynamic table ([+]/[-] pattern from the A&D spec). */
function RowCard({
  index,
  onRemove,
  children,
}: {
  index: number;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50/60 px-4 py-3 relative">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400">#{index + 1}</span>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>
      </div>
      {children}
    </div>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
    >
      <Plus className="w-4 h-4" />
      {label}
    </button>
  );
}

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

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

interface Props {
  submission: StoredSubmission;
  /** True for a never-saved submission — lets the active profile pre-fill Primary Analyst. */
  isNew?: boolean;
}

export function SubmissionForm({ submission, isNew = false }: Props) {
  const router = useRouter();
  const { user } = useProfile();
  // Merge over defaults so drafts saved before new fields existed stay controlled.
  const [form, setForm] = useState<SubmissionFormData>({
    ...emptySubmissionForm(),
    ...submission.form,
  });
  const [amountText, setAmountText] = useState(
    submission.form.requestedAmount ? formatAmountInput(String(submission.form.requestedAmount)) : ""
  );
  const [plafondTexts, setPlafondTexts] = useState({
    total: submission.form.proposedTotalLimit ? formatAmountInput(String(submission.form.proposedTotalLimit)) : "",
    po: submission.form.proposedPOSubLimit ? formatAmountInput(String(submission.form.proposedPOSubLimit)) : "",
    wc: submission.form.proposedWCSubLimit ? formatAmountInput(String(submission.form.proposedWCSubLimit)) : "",
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
  const disbursementSum = form.disbursements.reduce((sum, d) => sum + d.amount, 0);
  const disbursementMismatch =
    form.disbursements.length > 0 && disbursementSum !== parseAmount(amountText);

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
      return { ...f, assetClass, approvalType, returnType };
    });
  }

  function setApprovalType(approvalType: ApprovalType) {
    setForm((f) => {
      const allowedReturns = returnTypesForApprovalType(approvalType);
      const returnType = allowedReturns.includes(f.returnType) ? f.returnType : allowedReturns[0];
      return { ...f, approvalType, returnType };
    });
  }

  function setSector(mainSector: string) {
    setForm((f) => {
      const allowed = subSectorsForSector(mainSector);
      return { ...f, mainSector, subSector: allowed.includes(f.subSector) ? f.subSector : "" };
    });
  }

  // ── Dynamic row helpers ([+]/[✍️]/[-] pattern) ─────────────────────────────

  function updateRow<K extends "kpContacts" | "disbursements" | "branches" | "ptDetails">(
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

  function removeRow(key: "kpContacts" | "disbursements" | "branches" | "ptDetails", id: string) {
    setForm((f) => ({
      ...f,
      [key]: (f[key] as Array<{ id: string }>).filter((row) => row.id !== id),
    }));
  }

  function addContact() {
    const row: SubmissionContactRow = {
      id: newRowId(),
      name: "",
      role: "",
      notesOnPerson: "",
      isKeyPerson: false,
      slikFileUrl: "",
      slikExecSummary: "",
      uboExposure: 0,
    };
    setForm((f) => ({ ...f, kpContacts: [...f.kpContacts, row] }));
  }

  function addDisbursement() {
    const row: SubmissionDisbursementRow = { id: newRowId(), amount: 0, plannedDate: "" };
    setForm((f) => ({ ...f, disbursements: [...f.disbursements, row] }));
  }

  function addBranch() {
    const row: SubmissionBranchRow = {
      id: newRowId(),
      name: "",
      area: "",
      gmapsLink: "",
      notes: "",
      type: "Opening Branch",
    };
    setForm((f) => ({ ...f, branches: [...f.branches, row] }));
  }

  function addPT() {
    const row: SubmissionPTRow = {
      id: newRowId(),
      name: "",
      bank: "",
      accountNumber: "",
      accountholderName: "",
      slikFileUrl: "",
      slikExecSummary: "",
    };
    setForm((f) => ({ ...f, ptDetails: [...f.ptDetails, row] }));
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
        requestedAmount: parseAmount(amountText),
        proposedTotalLimit: parseAmount(plafondTexts.total),
        proposedPOSubLimit: parseAmount(plafondTexts.po),
        proposedWCSubLimit: parseAmount(plafondTexts.wc),
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
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <SourceBadge source="master" /> value comes from a closed enum in the LOS master data
          </span>
          <span className="inline-flex items-center gap-1.5">
            <SourceBadge source="free" /> analyst fills it in
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <FormSection title="What are we reviewing?">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {ASSET_CLASSES.map((a) => (
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
          </div>
        </FormSection>

        <FormSection title="PIC">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        </FormSection>

        <FormSection title="Karmapreneur Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
        </FormSection>

        {isProjectType && (
          <FormSection title="Project Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Field label="Syariah Notes" source="free" full hint="Shown on the IC card next to the Syariah tag">
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
                  onChange={(e) => set("returnType", e.target.value)}
                >
                  {returnTypeOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>
        )}

        {hasPlafond && (
          <FormSection title="Plafond and Financial Review">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Proposed Limit
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Total Limit (Rp)" source="free">
                <input
                  className={`${inputCls} font-mono`}
                  inputMode="numeric"
                  value={plafondTexts.total}
                  onChange={(e) =>
                    setPlafondTexts((t) => ({ ...t, total: formatAmountInput(e.target.value) }))
                  }
                  placeholder="5.000.000.000"
                />
              </Field>
              <Field label="PO Sub-Limit (Rp)" source="free">
                <input
                  className={`${inputCls} font-mono`}
                  inputMode="numeric"
                  value={plafondTexts.po}
                  onChange={(e) =>
                    setPlafondTexts((t) => ({ ...t, po: formatAmountInput(e.target.value) }))
                  }
                />
              </Field>
              <Field label="Working Capital Sub-Limit (Rp)" source="free">
                <input
                  className={`${inputCls} font-mono`}
                  inputMode="numeric"
                  value={plafondTexts.wc}
                  onChange={(e) =>
                    setPlafondTexts((t) => ({ ...t, wc: formatAmountInput(e.target.value) }))
                  }
                />
              </Field>
            </div>
          </FormSection>
        )}

        {isAD && (
          <FormSection title="Karmapreneur Contacts">
            <div className="space-y-3">
              {form.kpContacts.map((c, i) => (
                <RowCard key={c.id} index={i} onRemove={() => removeRow("kpContacts", c.id)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Name" source="free">
                      <input
                        className={inputCls}
                        value={c.name}
                        onChange={(e) => updateRow("kpContacts", c.id, { name: e.target.value })}
                        placeholder="e.g. Tyo Kusumaputera"
                      />
                    </Field>
                    <Field label="Role" source="free">
                      <input
                        className={inputCls}
                        value={c.role}
                        onChange={(e) => updateRow("kpContacts", c.id, { role: e.target.value })}
                        placeholder="e.g. CEO"
                      />
                    </Field>
                    <Field label="Notes" source="free" full>
                      <input
                        className={inputCls}
                        value={c.notesOnPerson}
                        onChange={(e) => updateRow("kpContacts", c.id, { notesOnPerson: e.target.value })}
                      />
                    </Field>
                    <Field label="Key Person?" source="free">
                      <label className="flex items-center gap-2 text-sm text-gray-700 py-2">
                        <input
                          type="checkbox"
                          checked={c.isKeyPerson}
                          onChange={(e) => updateRow("kpContacts", c.id, { isKeyPerson: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        Key person for this project
                      </label>
                    </Field>
                    <Field label="UBO Exposure (Rp)" source="free">
                      <input
                        className={`${inputCls} font-mono`}
                        inputMode="numeric"
                        value={c.uboExposure ? formatAmountInput(String(c.uboExposure)) : ""}
                        onChange={(e) =>
                          updateRow("kpContacts", c.id, { uboExposure: parseAmount(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="SLIK-Key Person File URL" source="free" hint={c.isKeyPerson ? "Required before approval for key persons" : undefined}>
                      <input
                        className={inputCls}
                        value={c.slikFileUrl}
                        onChange={(e) => updateRow("kpContacts", c.id, { slikFileUrl: e.target.value })}
                        placeholder="https://drive.google.com/…"
                      />
                    </Field>
                    <Field label="SLIK-Key Person Exec Summary" source="free">
                      <input
                        className={inputCls}
                        value={c.slikExecSummary}
                        onChange={(e) => updateRow("kpContacts", c.id, { slikExecSummary: e.target.value })}
                      />
                    </Field>
                  </div>
                </RowCard>
              ))}
              <AddRowButton label="Add contact" onClick={addContact} />
            </div>
          </FormSection>
        )}

        {isAD && isProjectType && (
          <FormSection title="Project Terms Details">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Disbursement Schedule
            </h3>
            <div className="space-y-3">
              {form.disbursements.map((d, i) => (
                <RowCard key={d.id} index={i} onRemove={() => removeRow("disbursements", d.id)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={`Disbursement Amount (${form.requestedAmountCurrency === "USD" ? "USD" : "Rp"})`} source="free">
                      <input
                        className={`${inputCls} font-mono`}
                        inputMode="numeric"
                        value={d.amount ? formatAmountInput(String(d.amount)) : ""}
                        onChange={(e) =>
                          updateRow("disbursements", d.id, { amount: parseAmount(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Planned Disbursement Date" source="free">
                      <input
                        type="date"
                        className={inputCls}
                        value={d.plannedDate}
                        onChange={(e) => updateRow("disbursements", d.id, { plannedDate: e.target.value })}
                      />
                    </Field>
                  </div>
                </RowCard>
              ))}
              <AddRowButton label="Add disbursement" onClick={addDisbursement} />
              {form.disbursements.length > 0 && (
                <p className="text-xs text-gray-500">
                  Total planned: <span className="font-mono">{fmtIdr(disbursementSum)}</span>
                </p>
              )}
              {disbursementMismatch && (
                <InlineWarning message="Warning: Not same as Project Target Amount" />
              )}
            </div>

            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-6 mb-3">
              Branch Details
            </h3>
            <div className="space-y-3">
              {form.branches.map((b, i) => (
                <RowCard key={b.id} index={i} onRemove={() => removeRow("branches", b.id)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Branch Name" source="free">
                      <input
                        className={inputCls}
                        value={b.name}
                        onChange={(e) => updateRow("branches", b.id, { name: e.target.value })}
                      />
                    </Field>
                    <Field label="Branch Area" source="free">
                      <input
                        className={inputCls}
                        value={b.area}
                        onChange={(e) => updateRow("branches", b.id, { area: e.target.value })}
                        placeholder="e.g. Depok"
                      />
                    </Field>
                    <Field label="Type" source="master">
                      <select
                        className={inputCls}
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
                    </Field>
                    <Field label="Gmaps Link" source="free">
                      <input
                        className={inputCls}
                        value={b.gmapsLink}
                        onChange={(e) => updateRow("branches", b.id, { gmapsLink: e.target.value })}
                        placeholder="https://maps.app.goo.gl/…"
                      />
                    </Field>
                    <Field label="Notes" source="free" full>
                      <input
                        className={inputCls}
                        value={b.notes}
                        onChange={(e) => updateRow("branches", b.id, { notes: e.target.value })}
                      />
                    </Field>
                  </div>
                </RowCard>
              ))}
              <AddRowButton label="Add branch" onClick={addBranch} />
            </div>
          </FormSection>
        )}

        {isAD && (
          <FormSection title="PT Details">
            <div className="space-y-3">
              {form.ptDetails.map((pt, i) => (
                <RowCard key={pt.id} index={i} onRemove={() => removeRow("ptDetails", pt.id)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="PT Name" source="free">
                      <input
                        className={inputCls}
                        value={pt.name}
                        onChange={(e) => updateRow("ptDetails", pt.id, { name: e.target.value })}
                        placeholder="e.g. PT Tuku Sejahtera"
                      />
                    </Field>
                    <Field label="Bank" source="free">
                      <input
                        className={inputCls}
                        value={pt.bank}
                        onChange={(e) => updateRow("ptDetails", pt.id, { bank: e.target.value })}
                        placeholder="e.g. BCA"
                      />
                    </Field>
                    <Field label="Account Number" source="free">
                      <input
                        className={inputCls}
                        inputMode="numeric"
                        value={pt.accountNumber}
                        onChange={(e) => updateRow("ptDetails", pt.id, { accountNumber: e.target.value })}
                      />
                    </Field>
                    <Field label="Accountholder Name" source="free">
                      <input
                        className={inputCls}
                        value={pt.accountholderName}
                        onChange={(e) =>
                          updateRow("ptDetails", pt.id, { accountholderName: e.target.value })
                        }
                      />
                      {pt.name.trim() &&
                        pt.accountholderName.trim() &&
                        pt.name.trim() !== pt.accountholderName.trim() && (
                          <InlineWarning message="Mismatch on accountholder and PT names" />
                        )}
                    </Field>
                    <Field label="SLIK-PT File URL" source="free">
                      <input
                        className={inputCls}
                        value={pt.slikFileUrl}
                        onChange={(e) => updateRow("ptDetails", pt.id, { slikFileUrl: e.target.value })}
                        placeholder="https://drive.google.com/…"
                      />
                    </Field>
                    <Field label="SLIK-PT Exec Summary" source="free">
                      <input
                        className={inputCls}
                        value={pt.slikExecSummary}
                        onChange={(e) => updateRow("ptDetails", pt.id, { slikExecSummary: e.target.value })}
                      />
                    </Field>
                  </div>
                </RowCard>
              ))}
              <AddRowButton label="Add PT" onClick={addPT} />
            </div>
          </FormSection>
        )}

        <FormSection title="Credit Memo and Notes">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Field label="Karmapreneur Credit Memo" source="free" full>
                <textarea
                  className={`${inputCls} min-h-24 resize-y`}
                  value={form.kpCreditMemo}
                  onChange={(e) => set("kpCreditMemo", e.target.value)}
                  placeholder="Summary of the credit case for this Karmapreneur…"
                />
              </Field>
            )}
            <Field label="Project Credit Memo" source="free" full>
              <textarea
                className={`${inputCls} min-h-24 resize-y`}
                value={form.projectCreditMemo}
                onChange={(e) => set("projectCreditMemo", e.target.value)}
                placeholder="Summary of the credit case for this project…"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Other">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Field label="Bank Details for PT (Members)" source="free" full>
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

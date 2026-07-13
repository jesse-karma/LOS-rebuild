"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Database, PenLine } from "lucide-react";
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
import {
  SubmissionFormData,
  StoredSubmission,
  emptySubmissionForm,
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

  // On a brand-new form, Primary Analyst defaults to the signed-in analyst profile.
  useEffect(() => {
    if (isNew && isAnalystRole(user.role)) {
      setForm((f) => ({ ...f, primaryAnalyst: user.name }));
    }
  }, [isNew, user]);

  const hasPlafond = form.approvalType.includes("Plafond");
  const isProjectType = form.approvalType !== "Plafond";

  // Dependent master-data option lists
  const approvalTypeOptions = approvalTypesForAssetClass(form.assetClass);
  const returnTypeOptions = returnTypesForApprovalType(form.approvalType);
  const subSectorOptions = subSectorsForSector(form.mainSector);

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

  function currentDraft(status: "draft" | "submitted"): StoredSubmission {
    return {
      ...submission,
      status,
      submittedAt: status === "submitted" ? new Date().toISOString() : submission.submittedAt,
      form: {
        ...form,
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
          </div>
        </FormSection>

        <FormSection title="PIC">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <FormSection title="Project & Plafond">
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
            {isProjectType && (
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
              </Field>
            )}
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

          {hasPlafond && (
            <div className="mt-5 pt-4 border-t border-gray-100">
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
            </div>
          )}
        </FormSection>

        <FormSection title="Funding, Terms & Memo">
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
            </Field>
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

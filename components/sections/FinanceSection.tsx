"use client";

import { useState } from "react";
import { ICProject } from "@/data/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { Banknote, CheckCircle } from "lucide-react";
import { useProfile } from "@/lib/profileStore";
import { canEdit } from "@/lib/access";
import { ProjectWorkflow, StageInfo } from "@/lib/workflowStore";

interface Props {
  project: ICProject;
  workflow: ProjectWorkflow;
  stageInfo: StageInfo;
  onWorkflowChange: (wf: ProjectWorkflow) => void;
}

function fmt(n: number): string {
  return `IDR ${new Intl.NumberFormat("id-ID").format(n)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Digits-only text → number (same convention as the submission form amounts). */
function parseAmount(text: string): number {
  const digits = text.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function formatAmountInput(n: number): string {
  return n > 0 ? new Intl.NumberFormat("id-ID").format(n) : "";
}

/** Finance stage — KF/KCF funding split + disbursement; completing it onboards the project. */
export function FinanceSection({ project, workflow, stageInfo, onWorkflowChange }: Props) {
  const { user } = useProfile();
  const editable = canEdit(user.team, "financeOps", stageInfo.stage);

  const [finance, setFinance] = useState(workflow.finance);
  const [amountTexts, setAmountTexts] = useState({
    kf: formatAmountInput(workflow.finance.kfAmount),
    kcf: formatAmountInput(workflow.finance.kcfAmount),
  });
  const done = !!workflow.finance.completedAt;

  // Split must cover the approved amount (IDR; USD projects use the 16k basis used for voting).
  const targetAmount =
    project.icVoteBasisAmount ??
    (project.requestedAmountCurrency === "IDR" ? project.requestedAmount : project.requestedAmount * 16000);
  const splitTotal = finance.kfAmount + finance.kcfAmount;
  const splitMismatch = splitTotal > 0 && splitTotal !== targetAmount;
  const readyToOnboard =
    splitTotal === targetAmount && finance.bankDetailsReviewed && !!finance.disbursementDate;

  function save(next: typeof finance) {
    setFinance(next);
    onWorkflowChange({ ...workflow, finance: next });
  }

  function setAmount(key: "kf" | "kcf", text: string) {
    const value = parseAmount(text);
    setAmountTexts((t) => ({ ...t, [key]: formatAmountInput(value) }));
    save({ ...finance, [key === "kf" ? "kfAmount" : "kcfAmount"]: value });
  }

  function handleOnboard() {
    save({ ...finance, completedAt: new Date().toISOString(), completedBy: user.name });
  }

  const badge = done ? (
    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
      Onboarded {fmtDate(workflow.finance.completedAt!)} · {workflow.finance.completedBy}
    </span>
  ) : (
    <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
      With Finance Team
    </span>
  );

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500";

  return (
    <SectionCard title="Finance — Funding Split & Disbursement" badge={badge}>
      <div className="mt-2 space-y-4">
        {!editable && !done && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5" />
            Editable by the Finance Team while the project is in the Finance stage. Your team ({user.team})
            has view access.
          </p>
        )}

        {/* KF / KCF split */}
        <div>
          <div className="text-xs text-gray-500 mb-2">
            Disbursement split — must add up to <span className="font-semibold text-gray-700">{fmt(targetAmount)}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500">KF Amount</span>
              <input
                className={inputCls}
                inputMode="numeric"
                value={amountTexts.kf}
                disabled={!editable || done}
                onChange={(e) => setAmount("kf", e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">KCF Amount</span>
              <input
                className={inputCls}
                inputMode="numeric"
                value={amountTexts.kcf}
                disabled={!editable || done}
                onChange={(e) => setAmount("kcf", e.target.value)}
                placeholder="0"
              />
            </label>
          </div>
          <div className="mt-1.5 text-xs">
            <span className="text-gray-500">Split total: </span>
            <span className={splitMismatch ? "text-amber-700 font-semibold" : "text-gray-700 font-medium"}>
              {fmt(splitTotal)}
            </span>
            {splitMismatch && (
              <span className="ml-2 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                Warning: KF + KCF does not match the approved amount
              </span>
            )}
          </div>
        </div>

        {/* Bank details & disbursement date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <label
            className={`flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg border ${
              finance.bankDetailsReviewed
                ? "border-emerald-200 bg-emerald-50/50 text-gray-800"
                : "border-gray-200 text-gray-700"
            } ${editable && !done ? "cursor-pointer" : ""}`}
          >
            <input
              type="checkbox"
              checked={finance.bankDetailsReviewed}
              disabled={!editable || done}
              onChange={(e) => save({ ...finance, bankDetailsReviewed: e.target.checked })}
              className="rounded border-gray-300"
            />
            Bank details for PT reviewed by Finance
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Disbursement Date</span>
            <input
              type="date"
              className={inputCls}
              value={finance.disbursementDate}
              disabled={!editable || done}
              onChange={(e) => save({ ...finance, disbursementDate: e.target.value })}
            />
          </label>
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">Finance Notes</div>
          {editable && !done ? (
            <textarea
              value={finance.notes}
              onChange={(e) => setFinance((f) => ({ ...f, notes: e.target.value }))}
              onBlur={() => save(finance)}
              rows={3}
              placeholder="Plafond updates, tranche instructions, FX notes…"
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[44px]">
              {workflow.finance.notes || <span className="text-gray-400 italic">No notes.</span>}
            </div>
          )}
        </div>

        {editable && !done && (
          <div>
            <button
              onClick={handleOnboard}
              disabled={!readyToOnboard}
              className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Disbursement & Mark Onboarded
            </button>
            {!readyToOnboard && (
              <p className="text-xs text-gray-400 mt-1">
                Requires a split matching the approved amount, reviewed bank details, and a disbursement date.
              </p>
            )}
          </div>
        )}
        {done && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div className="text-sm font-semibold text-emerald-800">
              Disbursement confirmed — the project is Onboarded.
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

"use client";

import { useState } from "react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Banknote, CheckCircle } from "lucide-react";
import { useProfile } from "@/lib/profileStore";
import { canEdit } from "@/lib/access";
import { ProjectWorkflow, StageInfo } from "@/lib/workflowStore";

interface Props {
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

/** Finance Disbursement stage — bank details & disbursement; completing it onboards the project. */
export function FinanceDisbursementSection({ workflow, stageInfo, onWorkflowChange }: Props) {
  const { user } = useProfile();
  const editable = canEdit(user.team, "financeDisbursement", stageInfo.stage);

  const [finance, setFinance] = useState(workflow.finance);
  const done = !!workflow.finance.completedAt;

  const readyToOnboard = finance.bankDetailsReviewed && !!finance.disbursementDate;

  function save(next: typeof finance) {
    setFinance(next);
    onWorkflowChange({ ...workflow, finance: next });
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
    <SectionCard title="Finance — Disbursement" badge={badge}>
      <div className="mt-2 space-y-4">
        {!editable && !done && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5" />
            Editable by the Finance Team while the project is in Finance Disbursement. Your team ({user.team})
            has view access.
          </p>
        )}

        {/* Locked KF/KCF split from Finance Slotting, shown here for context */}
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <span className="font-semibold text-gray-700">KF {fmt(workflow.finance.kfAmount)}</span> ·{" "}
          <span className="font-semibold text-gray-700">KCF {fmt(workflow.finance.kcfAmount)}</span>
          {workflow.finance.slottedAt && (
            <>
              {" "}
              — slotted {fmtDate(workflow.finance.slottedAt)} by {workflow.finance.slottedBy}
            </>
          )}
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
                Requires reviewed bank details and a disbursement date.
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

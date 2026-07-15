"use client";

import { useState } from "react";
import { ICProject } from "@/data/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { Banknote, CheckCircle } from "lucide-react";
import { useProfile } from "@/lib/profileStore";
import { canEdit } from "@/lib/access";
import { ProjectWorkflow, StageInfo } from "@/lib/workflowStore";
import { checkConcentration, existingFundExposure } from "@/lib/exposure";
import { ConcentrationCheck } from "@/data/types";

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

/** One fund slot's concentration status vs its own entity's limits. */
function SlotCheckLine({ slot, check }: { slot: string; check: ConcentrationCheck }) {
  const worst = check.dims.reduce(
    (w, d) => (d.status === "over" ? "over" : d.status === "stretch" && w !== "over" ? "stretch" : w),
    "ok" as "ok" | "stretch" | "over"
  );
  const entrepreneur = check.dims.find((d) => d.dimension === "entrepreneur") ?? check.dims[0];
  const pct = ((entrepreneur.cumulative / check.baseAmount) * 100).toFixed(2);
  return (
    <div
      className={`text-xs rounded px-2 py-1 border ${
        worst === "over"
          ? "text-red-700 bg-red-50 border-red-200"
          : worst === "stretch"
          ? "text-amber-700 bg-amber-50 border-amber-200"
          : "text-emerald-700 bg-emerald-50 border-emerald-200"
      }`}
    >
      <span className="font-semibold">{slot}</span> vs {check.entityName}: cumulative{" "}
      {fmt(entrepreneur.cumulative)} = {pct}% of {check.basisLabel} ({check.quarterLabel}) —{" "}
      {worst === "over"
        ? "exceeds the limit; cannot slot this split"
        : worst === "stretch"
        ? "over the normal maximum (stretch tier)"
        : "within limits"}
    </div>
  );
}

/** Digits-only text → number (same convention as the submission form amounts). */
function parseAmount(text: string): number {
  const digits = text.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function formatAmountInput(n: number): string {
  return n > 0 ? new Intl.NumberFormat("id-ID").format(n) : "";
}

/** Finance Slotting stage — the KF/KCF funding split; this is the only real concentration check in the app. */
export function FinanceSlottingSection({ project, workflow, stageInfo, onWorkflowChange }: Props) {
  const { user } = useProfile();
  const editable = canEdit(user.team, "financeSlotting", stageInfo.stage);

  const [finance, setFinance] = useState(workflow.finance);
  const [amountTexts, setAmountTexts] = useState({
    kf: formatAmountInput(workflow.finance.kfAmount),
    kcf: formatAmountInput(workflow.finance.kcfAmount),
  });
  const done = !!workflow.finance.slottedAt;

  // Split must cover the approved amount (IDR; USD projects use the 16k basis used for voting).
  const targetAmount =
    project.icVoteBasisAmount ??
    (project.requestedAmountCurrency === "IDR" ? project.requestedAmount : project.requestedAmount * 16000);
  const splitTotal = finance.kfAmount + finance.kcfAmount;
  const splitMismatch = splitTotal > 0 && splitTotal !== targetAmount;

  // The fund assignment happens here, so each slot is checked against its own
  // entity's concentration limits: KF vs KarmaFood (Net Assets), KCF vs
  // KarmaCap Fund 1 (Aggregate Capital Commitments).
  const fundExposure = existingFundExposure(project.brandName);
  const kfCheck =
    finance.kfAmount > 0
      ? checkConcentration("karmafood", {
          proposedAmount: finance.kfAmount,
          existingEntrepreneur: fundExposure.kf,
        })
      : null;
  const kcfCheck =
    finance.kcfAmount > 0
      ? checkConcentration("karmacap1", {
          proposedAmount: finance.kcfAmount,
          existingEntrepreneur: fundExposure.kcf,
        })
      : null;
  const slotBlocked = kfCheck?.outcome === "blocked" || kcfCheck?.outcome === "blocked";

  const readyToSlot = splitTotal === targetAmount && !slotBlocked;

  function save(next: typeof finance) {
    setFinance(next);
    onWorkflowChange({ ...workflow, finance: next });
  }

  function setAmount(key: "kf" | "kcf", text: string) {
    const value = parseAmount(text);
    setAmountTexts((t) => ({ ...t, [key]: formatAmountInput(value) }));
    save({ ...finance, [key === "kf" ? "kfAmount" : "kcfAmount"]: value });
  }

  function handleConfirmSlot() {
    save({ ...finance, slottedAt: new Date().toISOString(), slottedBy: user.name });
  }

  const badge = done ? (
    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
      Slotted {fmtDate(workflow.finance.slottedAt!)} · {workflow.finance.slottedBy}
    </span>
  ) : (
    <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
      With Finance Team
    </span>
  );

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500";

  return (
    <SectionCard title="Finance — Fund Slotting (KF/KCF)" badge={badge}>
      <div className="mt-2 space-y-4">
        {!editable && !done && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5" />
            Editable by the Finance Team while the project is in Finance Slotting. Your team ({user.team})
            has view access.
          </p>
        )}

        {/* KF / KCF split */}
        <div>
          <div className="text-xs text-gray-500 mb-2">
            Fund split — must add up to <span className="font-semibold text-gray-700">{fmt(targetAmount)}</span>
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
          {/* Concentration check per slot — each fund has its own limits & basis */}
          {(kfCheck || kcfCheck) && (
            <div className="mt-2 space-y-1.5">
              {kfCheck && <SlotCheckLine slot="KF slot" check={kfCheck} />}
              {kcfCheck && <SlotCheckLine slot="KCF slot" check={kcfCheck} />}
            </div>
          )}
        </div>

        {editable && !done && (
          <div>
            <button
              onClick={handleConfirmSlot}
              disabled={!readyToSlot}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Fund Slot → Hand off to Legal
            </button>
            {!readyToSlot && (
              <p className="text-xs text-gray-400 mt-1">
                {slotBlocked
                  ? "A fund slot exceeds its concentration limit — adjust the KF/KCF split before proceeding."
                  : "Requires a split matching the approved amount."}
              </p>
            )}
          </div>
        )}
        {done && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div className="text-sm font-semibold text-emerald-800">
              Fund slot confirmed — handed off to Legal for documentation.
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

"use client";

import { useState } from "react";
import { SectionCard } from "@/components/ui/SectionCard";
import { CheckCircle, Scale } from "lucide-react";
import { useProfile } from "@/lib/profileStore";
import { canEdit } from "@/lib/access";
import { ProjectWorkflow, StageInfo } from "@/lib/workflowStore";

interface Props {
  workflow: ProjectWorkflow;
  stageInfo: StageInfo;
  onWorkflowChange: (wf: ProjectWorkflow) => void;
}

const CHECKLIST: Array<{ key: "termSheetSigned" | "agreementDrafted" | "agreementSigned"; label: string }> = [
  { key: "termSheetSigned", label: "Term sheet finalized & signed by Karmapreneur" },
  { key: "agreementDrafted", label: "Loan agreement drafted & internally reviewed" },
  { key: "agreementSigned", label: "Loan agreement signed by all parties" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Legal stage — documentation checklist; completing it hands the project to Finance. */
export function LegalSection({ workflow, stageInfo, onWorkflowChange }: Props) {
  const { user } = useProfile();
  const editable = canEdit(user.team, "legalChecklist", stageInfo.stage);

  const [legal, setLegal] = useState(workflow.legal);
  const done = !!workflow.legal.completedAt;
  const allChecked = legal.termSheetSigned && legal.agreementDrafted && legal.agreementSigned;

  function save(next: typeof legal) {
    setLegal(next);
    onWorkflowChange({ ...workflow, legal: next });
  }

  function handleComplete() {
    save({ ...legal, completedAt: new Date().toISOString(), completedBy: user.name });
  }

  const badge = done ? (
    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
      Completed {fmtDate(workflow.legal.completedAt!)} · {workflow.legal.completedBy}
    </span>
  ) : (
    <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
      With Legal Team
    </span>
  );

  return (
    <SectionCard title="Legal — Documentation" badge={badge}>
      <div className="mt-2 space-y-4">
        {!editable && !done && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            Editable by the Legal Team while the project is in the Legal stage. Your team ({user.team})
            has view access.
          </p>
        )}

        <div className="space-y-2">
          {CHECKLIST.map(({ key, label }) => (
            <label
              key={key}
              className={`flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg border ${
                legal[key] ? "border-emerald-200 bg-emerald-50/50 text-gray-800" : "border-gray-200 text-gray-700"
              } ${editable && !done ? "cursor-pointer" : ""}`}
            >
              <input
                type="checkbox"
                checked={legal[key]}
                disabled={!editable || done}
                onChange={(e) => save({ ...legal, [key]: e.target.checked })}
                className="rounded border-gray-300"
              />
              {label}
            </label>
          ))}
        </div>

        <div>
          <div className="text-xs text-gray-500 mb-1">Legal Notes</div>
          {editable && !done ? (
            <textarea
              value={legal.notes}
              onChange={(e) => setLegal((l) => ({ ...l, notes: e.target.value }))}
              onBlur={() => save(legal)}
              rows={3}
              placeholder="Negotiated deviations, outstanding doc items, notary status…"
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[44px]">
              {workflow.legal.notes || <span className="text-gray-400 italic">No notes.</span>}
            </div>
          )}
        </div>

        {editable && !done && (
          <div>
            <button
              onClick={handleComplete}
              disabled={!allChecked}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Complete Legal → Hand off to Finance
            </button>
            {!allChecked && (
              <p className="text-xs text-gray-400 mt-1">All checklist items must be done before handing off.</p>
            )}
          </div>
        )}
        {done && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div className="text-sm font-semibold text-emerald-800">
              Documentation complete — handed off to Finance for the KF/KCF split & disbursement.
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

"use client";

import { useState } from "react";
import { ICProject } from "@/data/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { UserCheck, CheckCircle } from "lucide-react";
import { useProfile } from "@/lib/profileStore";
import { canEdit } from "@/lib/access";
import { icDecidedAt, ProjectWorkflow, StageInfo } from "@/lib/workflowStore";

interface Props {
  project: ICProject;
  workflow: ProjectWorkflow;
  stageInfo: StageInfo;
  onWorkflowChange: (wf: ProjectWorkflow) => void;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** KP Confirmation stage — the Karmapreneur must accept the IC-approved terms before
 *  Finance proceeds. There's no KP-facing login; the analyst records the outcome of an
 *  out-of-band conversation, same as every other stage in this app. */
export function KPConfirmationSection({ project, workflow, stageInfo, onWorkflowChange }: Props) {
  const { user } = useProfile();
  const editable = canEdit(user.team, "kpConfirmation", stageInfo.stage);
  const [notes, setNotes] = useState("");

  const outcome = workflow.kpConfirmation.outcome;
  // Projects that reached Finance Split (or beyond) before this stage existed never got an
  // explicit "Accepted" outcome recorded — stageInfo() already treats them as implicitly past
  // this stage (see its finance.slottedAt/completedAt check), so this component must too, or
  // it keeps showing "still needs confirmation" forever on that legacy data.
  const done = outcome === "Accepted" || stageInfo.stage !== "kp_confirmation";
  const decidedAt = icDecidedAt(project, workflow);

  function handleAccept() {
    onWorkflowChange({
      ...workflow,
      kpConfirmation: {
        outcome: "Accepted",
        decidedAt: new Date().toISOString(),
        decidedBy: user.name,
        negotiationNotes: "",
      },
    });
  }

  function handleNegotiate() {
    onWorkflowChange({
      ...workflow,
      kpConfirmation: {
        outcome: "Negotiating",
        decidedAt: new Date().toISOString(),
        decidedBy: user.name,
        negotiationNotes: notes.trim(),
      },
    });
  }

  const badge = done ? (
    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
      {workflow.kpConfirmation.decidedAt
        ? `Accepted ${fmtDate(workflow.kpConfirmation.decidedAt)} · ${workflow.kpConfirmation.decidedBy}`
        : "Confirmed"}
    </span>
  ) : (
    <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
      With Investments Team
    </span>
  );

  return (
    <SectionCard title="KP Confirmation" badge={badge}>
      <div className="mt-2 space-y-4">
        {!editable && !done && (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            Editable by the Investments Team while the project is in KP Confirmation. Your team (
            {user.team}) has view access.
          </p>
        )}

        {!done && (
          <p className="text-xs text-gray-600">
            IC approved this project{decidedAt ? ` on ${fmtDate(decidedAt)}` : ""} — confirm with the
            Karmapreneur whether they accept these terms before this proceeds to Finance.
          </p>
        )}

        {editable && !done && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-500">
                If negotiating: what does the KP want changed? (required to record Negotiating)
              </span>
              <textarea
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 min-h-20 resize-y"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Wants 6% pre-BEP rev share instead of 8%"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleAccept}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                KP Accepted
              </button>
              <button
                onClick={handleNegotiate}
                disabled={!notes.trim()}
                className="px-5 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                KP Wants to Negotiate
              </button>
            </div>
            {!notes.trim() && (
              <p className="text-xs text-gray-400">
                Notes are required before recording a negotiation — describe what the KP wants changed.
              </p>
            )}
          </div>
        )}

        {done && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div className="text-sm font-semibold text-emerald-800">
              Karmapreneur accepted the terms — handed off to Finance for slotting.
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

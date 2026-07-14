"use client";

import { useState } from "react";
import { ICProject, ICVote } from "@/data/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { CheckCircle, XCircle } from "lucide-react";
import { useProfile } from "@/lib/profileStore";
import { canEdit } from "@/lib/access";
import {
  effectiveVotes,
  icDecidedAt,
  icOutcome,
  ProjectWorkflow,
  StageInfo,
} from "@/lib/workflowStore";

interface Props {
  project: ICProject;
  workflow: ProjectWorkflow;
  stageInfo: StageInfo;
  onWorkflowChange: (wf: ProjectWorkflow) => void;
}

const VOTE_OPTIONS: { value: Exclude<ICVote, null>; label: string; color: string; icon: React.ReactNode }[] = [
  {
    value: "Approve",
    label: "Approve",
    color: "bg-emerald-600 hover:bg-emerald-700 text-white",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  {
    value: "Reject",
    label: "Reject",
    color: "bg-red-600 hover:bg-red-700 text-white",
    icon: <XCircle className="w-4 h-4" />,
  },
];

function VoteBadge({ vote }: { vote: ICVote }) {
  if (vote === "Approve")
    return <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Approved</span>;
  if (vote === "Reject")
    return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">Rejected</span>;
  return <span className="text-xs text-gray-400 italic">Pending</span>;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ApprovalSection({ project, workflow, stageInfo, onWorkflowChange }: Props) {
  const { user } = useProfile();

  const votes = effectiveVotes(project, workflow);
  const outcome = icOutcome(project, workflow);
  const decidedAt = icDecidedAt(project, workflow);

  // The active profile votes as themselves — only IC members appear on the roster.
  const myMember = votes.find((v) => v.memberName === user.name);
  // Field-level rule: icDecision is editable by the Investment Committee, only during IC Review.
  const decisionOpen = canEdit(user.team, "icDecision", stageInfo.stage) && outcome === null;
  const canVote = decisionOpen && !!myMember;

  const [myVote, setMyVote] = useState<ICVote>(myMember?.vote ?? null);
  const [approvalNotes, setApprovalNotes] = useState(workflow.approvalNotes ?? project.approvalNotes);
  const [conditionsSubsequent, setConditionsSubsequent] = useState<string[]>(
    () => workflow.conditionsSubsequent ?? [...project.conditionsSubsequent]
  );
  const [justSubmitted, setJustSubmitted] = useState(false);

  function handleSubmit() {
    if (!myMember || !myVote) return;
    onWorkflowChange({
      ...workflow,
      votes: {
        ...workflow.votes,
        [myMember.memberId]: { vote: myVote, votedAt: new Date().toISOString() },
      },
      approvalNotes,
      conditionsSubsequent,
    });
    setJustSubmitted(true);
  }

  // Voting rule: use explicit IC basis (e.g. proposed total limit) when provided — else project amount
  const amount =
    project.icVoteBasisAmount ??
    (project.requestedAmountCurrency === "IDR" ? project.requestedAmount : project.requestedAmount * 16000);
  // Concentration stretch tier overrides the amount tiers: full Investment Committee sign-off.
  const stretchTier = project.limitCheck?.outcome === "stretch";
  const votingRule: 1 | 2 | 3 = stretchTier
    ? 3
    : amount <= 4_000_000_000
    ? 1
    : amount <= 6_000_000_000
    ? 2
    : 3;
  const requiredVoteCount = votingRule === 1 ? 1 : votingRule === 2 ? 2 : 3;

  function isRequired(v: { memberId: string; isPrincipal: boolean }): boolean {
    if (votingRule === 1) return v.isPrincipal;
    if (votingRule === 2) return v.isPrincipal || votes.findIndex((x) => x.memberId === v.memberId) < 2;
    return true; // all 3 required
  }

  const RULE_LABELS: Record<1 | 2 | 3, string> = {
    1: "≤ IDR 4B — Principal approval only required",
    2: "IDR 4B–6B — 2 IC votes required, including Principal",
    3: "> IDR 6B — All 3 IC votes required, including Principal",
  };
  const ruleLabel = stretchTier
    ? "Concentration stretch tier — full Investment Committee sign-off required (all 3 votes)"
    : RULE_LABELS[votingRule];

  // Other section items per CSV (Funding Source, Tax Withholdings)
  const isMembersProject = project.fundingSource.includes("Members");
  const taxNotWithheld = project.taxWithholdings === "No";
  const prevTaxNotWithheld = false; // would come from past projects in production

  return (
    <SectionCard title="Other">
      {/* Other section — per CSV order: Funding Source, Bank Details (conditional), Tax Withholdings */}
      <div className="mt-2 space-y-4">
        <div className="text-sm space-y-2">
          <div className="flex items-start gap-3">
            <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">Funding Source</span>
            <span className="text-gray-900">
              {project.fundingSource}
              {isMembersProject && (
                <span className="ml-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                  Warning: this is a Members project
                </span>
              )}
            </span>
          </div>

          {isMembersProject && (
            <div className="flex items-start gap-3">
              <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">Bank Details for PT (Members)</span>
              <span className={project.bankDetailsReviewed ? "text-gray-700" : "text-amber-700"}>
                {project.bankDetailsReviewed
                  ? "Reviewed"
                  : "Bank Details Not Yet Reviewed by Finance/Analyst and going to Members"}
              </span>
            </div>
          )}

          <div className="flex items-start gap-3">
            <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">Tax Withholdings</span>
            <div>
              <span className={taxNotWithheld ? "text-red-700 font-medium" : "text-gray-900"}>
                {project.taxWithholdings === "Yes"
                  ? "Karmapreneur will withhold"
                  : project.taxWithholdings === "No"
                  ? "Karmapreneur will NOT withhold"
                  : "TBD"}
              </span>
              {taxNotWithheld && (
                <div className="text-xs text-red-600 mt-0.5">Warning: Karmapreneur will NOT withhold taxes</div>
              )}
              {prevTaxNotWithheld && (
                <div className="text-xs text-red-600 mt-0.5">
                  Warning: Karmapreneur is NOT withholding taxes on a previous project
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Approval section */}
      <div className="mt-6 border-t border-gray-100 pt-5 space-y-5">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Approval</h4>

        {/* Decision banner once IC has decided */}
        {outcome === "approved" && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div className="text-sm font-semibold text-emerald-800">
              Approved by IC{decidedAt ? ` on ${fmtDate(decidedAt)}` : ""} — handed off to Legal
            </div>
          </div>
        )}
        {outcome === "rejected" && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <div className="text-sm font-semibold text-red-800">Rejected by IC — the flow stops here.</div>
          </div>
        )}

        {project.specialNotesForIC && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {project.specialNotesForIC}
          </div>
        )}

        {/* Voting rule banner */}
        <div
          className={`flex items-center gap-2 text-xs border rounded-lg px-3 py-2 ${
            stretchTier
              ? "bg-purple-50 border-purple-200 text-purple-800"
              : "bg-gray-50 border-gray-200 text-gray-600"
          }`}
        >
          <span className={`font-semibold ${stretchTier ? "text-purple-800" : "text-gray-700"}`}>Rule:</span>
          <span>{ruleLabel}</span>
          <span className="ml-auto text-gray-400">
            {votes.filter((v) => v.vote === "Approve").length}/{requiredVoteCount} required vote
            {requiredVoteCount > 1 ? "s" : ""}
          </span>
        </div>

        {/* IC votes table */}
        <div className="space-y-1">
          {votes.map((v) => {
            const isMe = v.memberName === user.name;
            const required = isRequired(v);
            return (
              <div
                key={v.memberId}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border ${isMe ? "border-blue-200 bg-blue-50" : "border-gray-100 bg-gray-50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{v.memberName}</span>
                  {v.isPrincipal && (
                    <span className="text-xs text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">Principal</span>
                  )}
                  {isMe && (
                    <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">You</span>
                  )}
                  {!required && (
                    <span className="text-xs text-gray-400 italic">optional</span>
                  )}
                </div>
                <VoteBadge vote={v.vote} />
              </div>
            );
          })}
        </div>

        {/* Vote buttons — IC members only, while the decision is open */}
        {canVote && !justSubmitted && (
          <div>
            <div className="text-xs text-gray-500 mb-2">Your Vote</div>
            <div className="flex gap-2">
              {VOTE_OPTIONS.map(({ value, label, color, icon }) => (
                <button
                  key={value}
                  onClick={() => setMyVote(value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${color} ${myVote === value ? "ring-2 ring-offset-1 ring-gray-400 scale-[1.02]" : "opacity-80"}`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {decisionOpen && !myMember && (
          <p className="text-xs text-gray-400">
            Voting is open to the Investment Committee. Your team ({user.team}) has view access to this
            decision.
          </p>
        )}

        {/* Approval Notes */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Approval Notes</div>
          {canVote && !justSubmitted ? (
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={4}
              placeholder="Enter approval notes here..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[60px]">
              {(workflow.approvalNotes ?? project.approvalNotes) || (
                <span className="text-gray-400 italic">No notes entered.</span>
              )}
            </div>
          )}
        </div>

        {/* Conditions Subsequent — analyst draft; IC revises before vote (prototype) */}
        <div>
          <div className="text-xs text-gray-500 mb-1">Conditions Subsequent</div>
          <p className="text-xs text-gray-500 mb-2 leading-relaxed">
            Drafted by the <strong className="text-gray-600">Investments Team</strong> (e.g. from diligence).{" "}
            <strong className="text-gray-600">IC</strong> may edit or add items here before submitting a vote; in production
            this would write back to the Project row.
          </p>
          {canVote && !justSubmitted ? (
            <div className="space-y-2">
              {conditionsSubsequent.length === 0 && (
                <p className="text-xs text-gray-400 italic">No conditions yet — add if needed.</p>
              )}
              {conditionsSubsequent.map((c, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <textarea
                    value={c}
                    onChange={(e) =>
                      setConditionsSubsequent((prev) =>
                        prev.map((line, j) => (j === i ? e.target.value : line))
                      )
                    }
                    rows={2}
                    className="flex-1 min-w-0 border border-gray-200 rounded-lg p-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
                  />
                  <button
                    type="button"
                    onClick={() => setConditionsSubsequent((prev) => prev.filter((_, j) => j !== i))}
                    className="text-xs text-red-600 hover:text-red-800 shrink-0 pt-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setConditionsSubsequent((prev) => [...prev, ""])}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                + Add condition
              </button>
            </div>
          ) : (workflow.conditionsSubsequent ?? project.conditionsSubsequent).length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {(workflow.conditionsSubsequent ?? project.conditionsSubsequent).map((c, i) => (
                <li key={i} className="text-sm text-gray-700 whitespace-pre-wrap">
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400 italic">No conditions subsequent.</p>
          )}
        </div>

        {/* Submit */}
        {canVote && !justSubmitted && (
          <div>
            <button
              onClick={handleSubmit}
              disabled={!myVote}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Submit Vote & Notes
            </button>
            {!myVote && <p className="text-xs text-gray-400 mt-1">Select a vote before submitting.</p>}
            <p className="text-xs text-gray-400 mt-1">
              ℹ️ In production, submitting will trigger Coda automation (status update + Slack notification).
            </p>
          </div>
        )}
        {justSubmitted && outcome === null && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-sm font-semibold text-emerald-800">Vote recorded</div>
              <div className="text-xs text-emerald-600">
                Waiting on the remaining required IC votes before the project moves to Legal.
              </div>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ICProject } from "@/data/types";
import { getProjectById } from "@/data/mock";
import { getReviewProjectById } from "@/lib/submissionsStore";
import { computeWarnings } from "@/lib/warnings";
import { Warning } from "@/components/ui/Warning";
import { ProjectHeader } from "@/components/sections/ProjectHeader";
import { PICSection } from "@/components/sections/PICSection";
import { ProjectDetailsSection } from "@/components/sections/ProjectAndPlafond";
import { FinancialReviews } from "@/components/sections/FinancialReviews";
import { KPDetails } from "@/components/sections/KPDetails";
import { KPContacts } from "@/components/sections/KPContacts";
import { PastProjectsRecap } from "@/components/sections/PastProjectsRecap";
import { PayorInvoiceSection } from "@/components/sections/PayorInvoiceSection";
import { ProjectTerms } from "@/components/sections/ProjectTerms";
import { CreditMemoNotes } from "@/components/sections/CreditMemoNotes";
import { PTDetails } from "@/components/sections/PTDetails";
import { ApprovalSection } from "@/components/sections/ApprovalSection";
import { KPConfirmationSection } from "@/components/sections/KPConfirmationSection";
import { LegalSection } from "@/components/sections/LegalSection";
import { FinanceSlottingSection } from "@/components/sections/FinanceSlottingSection";
import { FinanceDisbursementSection } from "@/components/sections/FinanceDisbursementSection";
import { StageStepper } from "@/components/ui/StageStepper";
import { useProfile } from "@/lib/profileStore";
import { canSee } from "@/lib/access";
import {
  getWorkflow,
  ProjectWorkflow,
  saveWorkflow,
  seedDefaultWorkflows,
  stageInfo as stageInfoFor,
} from "@/lib/workflowStore";
import { seedDefaultLimitConfigs } from "@/lib/limitsStore";
import { ChevronLeft } from "lucide-react";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Banner shown on a currently-rejected project (with the Resubmit action) and, once
 *  resubmitted, a lighter note keeping the prior decision visible for the new vote round. */
function RejectionBanner({
  project,
  workflow,
  rejected,
  kpNegotiating,
  canResubmit,
}: {
  project: ICProject;
  workflow: ProjectWorkflow;
  rejected: boolean;
  kpNegotiating: boolean;
  canResubmit: boolean;
}) {
  const memberName = (memberId: string) =>
    project.icVotes.find((v) => v.memberId === memberId)?.memberName ?? memberId;

  if (rejected) {
    const rejectorId = Object.entries(workflow.votes).find(([, v]) => v.vote === "Reject")?.[0];
    const rejectorVote = rejectorId ? workflow.votes[rejectorId] : undefined;
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-red-800">Rejected by IC</p>
          {rejectorId && rejectorVote && (
            <p className="text-xs text-red-600 mt-0.5">
              {memberName(rejectorId)} · {fmtDate(rejectorVote.votedAt)}
            </p>
          )}
        </div>
        {canResubmit && (
          <Link
            href={`/submission/${project.id}`}
            className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shrink-0 whitespace-nowrap"
          >
            Resubmit to IC
          </Link>
        )}
      </div>
    );
  }

  if (kpNegotiating) {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-amber-800">Karmapreneur wants to negotiate terms</p>
          {workflow.kpConfirmation.negotiationNotes && (
            <p className="text-xs text-amber-700 mt-0.5">{workflow.kpConfirmation.negotiationNotes}</p>
          )}
          {workflow.kpConfirmation.decidedAt && (
            <p className="text-xs text-amber-600 mt-0.5">
              {workflow.kpConfirmation.decidedBy} · {fmtDate(workflow.kpConfirmation.decidedAt)}
            </p>
          )}
        </div>
        {canResubmit && (
          <Link
            href={`/submission/${project.id}`}
            className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shrink-0 whitespace-nowrap"
          >
            Revise &amp; Resubmit to IC
          </Link>
        )}
      </div>
    );
  }

  if (workflow.rejectionHistory.length > 0) {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">Previously rejected</p>
        <ul className="text-xs text-amber-700 space-y-0.5">
          {workflow.rejectionHistory.map((r, i) => (
            <li key={i}>
              {memberName(r.memberId)} · {fmtDate(r.votedAt)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (workflow.kpNegotiationHistory.length > 0) {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">Previously, KP requested different terms</p>
        <ul className="text-xs text-amber-700 space-y-0.5">
          {workflow.kpNegotiationHistory.map((r, i) => (
            <li key={i}>
              {r.notes} — {r.requestedBy} · {fmtDate(r.requestedAt)}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useProfile();
  // Mock projects resolve immediately; browser-stored submissions resolve after mount.
  const [project, setProject] = useState<ICProject | null | undefined>(
    () => getProjectById(id) ?? undefined
  );
  const [workflow, setWorkflow] = useState<ProjectWorkflow | null>(null);

  useEffect(() => {
    seedDefaultLimitConfigs();
    seedDefaultWorkflows();
    setProject(getReviewProjectById(id) ?? null);
    setWorkflow(getWorkflow(id));
  }, [id]);

  if (project === undefined || (project && workflow === null)) {
    return <p className="text-sm text-gray-400">Loading review…</p>;
  }

  if (project === null) {
    return (
      <div className="text-sm text-gray-500">
        Review not found.{" "}
        <Link href="/" className="text-blue-600 hover:underline">
          Back to submissions
        </Link>
      </div>
    );
  }

  const wf = workflow!;
  const stage = stageInfoFor(project, wf);
  const showSlik = canSee(user.team, "slik", stage.stage);

  function handleWorkflowChange(next: ProjectWorkflow) {
    saveWorkflow(id, next);
    setWorkflow(next);
  }

  const warnings = computeWarnings(project);
  const errors = warnings.filter((w) => w.level === "error");
  const warnItems = warnings.filter((w) => w.level === "warn");

  return (
    <div>
      {/* Back nav */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        All submissions
      </Link>

      {/* Lifecycle stage */}
      <div className="mb-4">
        <StageStepper stage={stage.stage} rejected={stage.rejected} kpNegotiating={stage.kpNegotiating} />
      </div>

      <RejectionBanner
        project={project}
        workflow={wf}
        rejected={stage.rejected}
        kpNegotiating={stage.kpNegotiating}
        canResubmit={user.team === "Investments Team"}
      />

      {/* Global warnings banner */}
      {errors.length > 0 && (
        <div className="mb-4 space-y-2">
          {errors.map((e, i) => (
            <Warning key={i} message={`[${e.section}] ${e.message}`} level="error" />
          ))}
        </div>
      )}
      {warnItems.length > 0 && (
        <div className="mb-4 space-y-2">
          {warnItems.map((w, i) => (
            <Warning key={i} message={`[${w.section}] ${w.message}`} level="warn" />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <ProjectHeader project={project} />
      </div>

      {/* Two-column layout for smaller sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <PICSection project={project} />
        <KPDetails project={project} />
      </div>

      {/* Project Details */}
      <div className="mb-4">
        <ProjectDetailsSection project={project} />
      </div>

      {/* Plafond & Financial Reviews */}
      <div className="mb-4">
        <FinancialReviews project={project} />
      </div>

      {/* KP Contacts */}
      <div className="mb-4">
        <KPContacts project={project} showSlik={showSlik} />
      </div>

      {/* Past Projects */}
      <div className="mb-4">
        <PastProjectsRecap project={project} />
      </div>

      <div className="mb-4">
        <PayorInvoiceSection project={project} />
      </div>

      {/* Project Terms */}
      <div className="mb-4">
        <ProjectTerms project={project} />
      </div>

      {/* Credit Memo & Notes */}
      <div className="mb-4">
        <CreditMemoNotes
          key={user.id}
          project={project}
          workflow={wf}
          onWorkflowChange={handleWorkflowChange}
        />
      </div>

      {/* PT Details */}
      <div className="mb-4">
        <PTDetails project={project} showSlik={showSlik} />
      </div>

      {/* IC decision — keyed by profile so switching users resets the section's local edit state */}
      <div className="mb-4">
        <ApprovalSection
          key={user.id}
          project={project}
          workflow={wf}
          stageInfo={stage}
          onWorkflowChange={handleWorkflowChange}
        />
      </div>

      {/* Post-IC stages appear once the project reaches them */}
      {(stage.stage === "kp_confirmation" ||
        stage.stage === "finance_slotting" ||
        stage.stage === "legal" ||
        stage.stage === "finance_disbursement" ||
        stage.stage === "onboarded") && (
        <div className="mb-4">
          <KPConfirmationSection
            key={user.id}
            project={project}
            workflow={wf}
            stageInfo={stage}
            onWorkflowChange={handleWorkflowChange}
          />
        </div>
      )}
      {(stage.stage === "finance_slotting" ||
        stage.stage === "legal" ||
        stage.stage === "finance_disbursement" ||
        stage.stage === "onboarded") && (
        <div className="mb-4">
          <FinanceSlottingSection
            key={user.id}
            project={project}
            workflow={wf}
            stageInfo={stage}
            onWorkflowChange={handleWorkflowChange}
          />
        </div>
      )}
      {(stage.stage === "legal" || stage.stage === "finance_disbursement" || stage.stage === "onboarded") && (
        <div className="mb-4">
          <LegalSection
            key={user.id}
            workflow={wf}
            stageInfo={stage}
            onWorkflowChange={handleWorkflowChange}
          />
        </div>
      )}
      {(stage.stage === "finance_disbursement" || stage.stage === "onboarded") && (
        <div className="mb-4">
          <FinanceDisbursementSection
            key={user.id}
            workflow={wf}
            stageInfo={stage}
            onWorkflowChange={handleWorkflowChange}
          />
        </div>
      )}

      <div className="text-xs text-center text-gray-400 pb-8 pt-4">
        IC Review App — Prototype · Mocked data · Phase 1 concept
      </div>
    </div>
  );
}

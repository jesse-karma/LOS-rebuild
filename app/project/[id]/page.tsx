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
import { ConcentrationPanel } from "@/components/submission/ConcentrationPanel";
import { LegalSection } from "@/components/sections/LegalSection";
import { FinanceSection } from "@/components/sections/FinanceSection";
import { StageStepper } from "@/components/ui/StageStepper";
import { useProfile } from "@/lib/profileStore";
import { canSee } from "@/lib/access";
import {
  getWorkflow,
  ProjectWorkflow,
  saveWorkflow,
  stageInfo as stageInfoFor,
} from "@/lib/workflowStore";
import { seedDefaultLimitConfigs } from "@/lib/limitsStore";
import { ChevronLeft } from "lucide-react";

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
        <StageStepper stage={stage.stage} rejected={stage.rejected} />
      </div>

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
        <CreditMemoNotes project={project} />
      </div>

      {/* PT Details */}
      <div className="mb-4">
        <PTDetails project={project} showSlik={showSlik} />
      </div>

      {/* Concentration limit check stamped at submission (audit: config in effect at the time) */}
      {project.limitCheck && (
        <div className="mb-4">
          <ConcentrationPanel
            check={project.limitCheck}
            title="Concentration Limit Check (at submission)"
          />
        </div>
      )}

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
      {(stage.stage === "legal" || stage.stage === "finance" || stage.stage === "onboarded") && (
        <div className="mb-4">
          <LegalSection
            key={user.id}
            workflow={wf}
            stageInfo={stage}
            onWorkflowChange={handleWorkflowChange}
          />
        </div>
      )}
      {(stage.stage === "finance" || stage.stage === "onboarded") && (
        <div className="mb-4">
          <FinanceSection
            key={user.id}
            project={project}
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

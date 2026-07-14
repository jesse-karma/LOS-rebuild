"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Vote } from "lucide-react";
import { ICProject } from "@/data/types";
import { mockProjects } from "@/data/mock";
import { Tag, approvalTypeVariant, assetClassVariant } from "@/components/ui/Tag";
import {
  allReviewProjects,
  listSubmissions,
  seedDemoSubmissions,
  StoredSubmission,
} from "@/lib/submissionsStore";
import { mockOnboarded } from "@/data/mockOnboarded";
import { useProfile } from "@/lib/profileStore";
import { canCreateSubmission, Stage } from "@/lib/access";
import { daysWaiting, needsVoteFrom, votesRemaining } from "@/lib/icVoting";
import {
  effectiveVotes,
  emptyWorkflow,
  getWorkflow,
  icDecidedAt,
  ProjectWorkflow,
  stageInfo,
} from "@/lib/workflowStore";
import { seedDefaultLimitConfigs } from "@/lib/limitsStore";
import { ASSET_CLASSES, APPROVAL_TYPE_ASSET_CLASSES } from "@/data/masterData";

function fmt(n: number): string {
  return `IDR ${new Intl.NumberFormat("id-ID").format(n)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Case-insensitive match on KP/Brand and Project name. */
function matchesQuery(query: string, brandName: string, projectName: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return brandName.toLowerCase().includes(q) || projectName.toLowerCase().includes(q);
}

function projectAmount(p: ICProject): string {
  return p.requestedAmountCurrency === "IDR"
    ? fmt(p.trancheTargetAmount ?? p.requestedAmount)
    : `USD ${(p.trancheTargetAmount ?? p.requestedAmount).toLocaleString()}`;
}

/** "Pending Review" with submitted date and days pending (red once stale). */
function ReviewStatusCell({ submittedAt, rejected }: { submittedAt: string; rejected: boolean }) {
  if (rejected) {
    return (
      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200 whitespace-nowrap">
        Rejected
      </span>
    );
  }
  const days = daysWaiting(submittedAt);
  const stale = days > 14;
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 whitespace-nowrap">
        Pending Review
      </span>
      <span className="text-xs text-gray-400 px-0.5 whitespace-nowrap">
        Submitted {fmtDate(submittedAt)} ·{" "}
        <span className={stale ? "text-red-600 font-semibold" : ""}>{days}d</span>
      </span>
    </div>
  );
}

/** "With Legal/Finance" + how long the stage has been holding the project. */
function StageStatusCell({ label, since }: { label: string; since: string | null }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
        {label}
      </span>
      {since && (
        <span className="text-xs text-gray-400 px-0.5 whitespace-nowrap">
          Since {fmtDate(since)} · {daysWaiting(since)}d
        </span>
      )}
    </div>
  );
}

/** IC-only: this member's vote state + quorum shortfall. */
function VoteChip({ project, memberName }: { project: ICProject; memberName: string }) {
  const remaining = votesRemaining(project);
  if (needsVoteFrom(project, memberName)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-emerald-600 text-white font-semibold px-2 py-0.5 rounded whitespace-nowrap">
        <Vote className="w-3 h-3" />
        Your vote needed
      </span>
    );
  }
  return (
    <span className="text-xs text-gray-400 font-medium px-2 py-0.5">
      {remaining > 0 ? `needs ${remaining} more vote${remaining > 1 ? "s" : ""}` : "quorum reached"}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabKey = "prep" | "ic" | "legal" | "finance" | "decided";

interface FlowRow {
  /** Project with in-app votes overlaid, so vote chips reflect the recorded state. */
  project: ICProject;
  workflow: ProjectWorkflow;
  stage: Stage;
  rejected: boolean;
}

/** Shared table shell for the IC / Legal / Finance tabs. */
function FlowTable({
  flowRows,
  statusCell,
  voteMemberName = null,
  emptyText,
  query,
}: {
  flowRows: FlowRow[];
  statusCell: (row: FlowRow) => React.ReactNode;
  /** IC members get a Vote column with their own vote state. */
  voteMemberName?: string | null;
  emptyText: string;
  query: string;
}) {
  const router = useRouter();
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-sm">
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">KP / Brand</th>
            <th className="py-2.5 px-2.5 font-bold w-full min-w-48">Project</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Type</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Asset</th>
            <th className="py-2.5 px-2.5 font-bold text-right whitespace-nowrap w-0">Amount</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Status</th>
            {voteMemberName && <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Vote</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {flowRows.map((row) => {
            const p = row.project;
            return (
              <tr
                key={p.id}
                className="hover:bg-blue-50/40 cursor-pointer"
                onClick={() => router.push(`/project/${p.id}`)}
              >
                <td className="py-2.5 px-2.5 whitespace-nowrap">
                  <Link
                    href={`/kp/${encodeURIComponent(p.brandName)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-600 hover:text-blue-700 hover:underline underline-offset-2"
                  >
                    {p.brandName}
                  </Link>
                </td>
                <td className="py-2.5 px-2.5 font-medium text-gray-900">{p.projectName}</td>
                <td className="py-2.5 px-2.5">
                  <Tag label={p.approvalType} variant={approvalTypeVariant(p.approvalType)} />
                </td>
                <td className="py-2.5 px-2.5">
                  <Tag label={`Asset ${p.assetClass}`} variant={assetClassVariant(p.assetClass)} />
                </td>
                <td className="py-2.5 px-2.5 text-right font-medium text-gray-800 whitespace-nowrap">
                  {projectAmount(p)}
                </td>
                <td className="py-2.5 px-2.5">{statusCell(row)}</td>
                {voteMemberName && (
                  <td className="py-2.5 px-2.5">
                    {!row.rejected && <VoteChip project={row.project} memberName={voteMemberName} />}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {flowRows.length === 0 && (
        <p className="text-sm text-gray-400 px-6 py-8 text-center">
          {query ? `No results for “${query}”.` : emptyText}
        </p>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user } = useProfile();
  const router = useRouter();
  const [projects, setProjects] = useState<ICProject[]>(mockProjects);
  const [drafts, setDrafts] = useState<StoredSubmission[]>([]);
  // Workflows load after mount (localStorage) — empty map matches the server render.
  const [workflows, setWorkflows] = useState<Record<string, ProjectWorkflow>>({});
  const [query, setQuery] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tab, setTab] = useState<TabKey>("ic");

  useEffect(() => {
    seedDemoSubmissions();
    seedDefaultLimitConfigs();
    const all = allReviewProjects();
    setProjects(all);
    setDrafts(listSubmissions().filter((s) => s.status === "draft"));
    setWorkflows(Object.fromEntries(all.map((p) => [p.id, getWorkflow(p.id)])));
  }, []);

  // Everyone on a team sees the whole pipeline — access is by Role Type, not person.
  const isIC = user.team === "Investment Committee";

  // Search + filters
  const matching = projects
    .filter((p) => matchesQuery(query, p.brandName, p.projectName))
    .filter((p) => !assetFilter || p.assetClass === assetFilter)
    .filter((p) => !typeFilter || p.approvalType === typeFilter)
    // Organize by KP/Brand (rows for the same brand sit together), then oldest-first within a brand.
    .sort((a, b) => a.brandName.localeCompare(b.brandName) || a.submittedAt.localeCompare(b.submittedAt));

  // Bucket by workflow stage
  const rows: FlowRow[] = matching.map((p) => {
    const wf = workflows[p.id] ?? emptyWorkflow();
    const info = stageInfo(p, wf);
    return {
      project: { ...p, icVotes: effectiveVotes(p, wf) },
      workflow: wf,
      stage: info.stage,
      rejected: info.rejected,
    };
  });
  const byStage = (s: Stage) => rows.filter((r) => r.stage === s);
  const icRows = byStage("ic_review");
  const legalRows = byStage("legal");
  const financeRows = byStage("finance");
  const onboardedFlowRows = byStage("onboarded");

  const visibleDrafts = drafts
    .filter((d) => matchesQuery(query, d.form.brandName, d.form.projectName))
    .filter((d) => !assetFilter || d.form.assetClass === assetFilter)
    .filter((d) => !typeFilter || d.form.approvalType === typeFilter);

  // Onboarded = projects that completed the flow in-app + the pre-existing mock rows.
  const onboardedRows = [
    ...onboardedFlowRows.map(({ project, workflow }) => ({
      id: project.id,
      brandName: project.brandName,
      projectName: project.projectName,
      approvalType: project.approvalType,
      assetClass: project.assetClass,
      requestedAmountCurrency: project.requestedAmountCurrency,
      amount: project.trancheTargetAmount ?? project.requestedAmount,
      icApprovedAt: icDecidedAt(project, workflow) ?? project.submittedAt,
      onboardedAt: workflow.finance.completedAt ?? project.submittedAt,
      href: `/project/${project.id}`,
    })),
    ...mockOnboarded
      .filter((o) => matchesQuery(query, o.brandName, o.projectName))
      .filter((o) => !assetFilter || o.assetClass === assetFilter)
      .filter((o) => !typeFilter || o.approvalType === typeFilter)
      .map((o) => ({ ...o, href: null as string | null })),
  ].sort((a, b) => b.onboardedAt.localeCompare(a.onboardedAt));

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: "prep", label: "Funding Lead", count: visibleDrafts.length },
    { key: "ic", label: "IC Review", count: icRows.length },
    { key: "legal", label: "Legal", count: legalRows.length },
    { key: "finance", label: "Finance", count: financeRows.length },
    { key: "decided", label: "Onboarded", count: onboardedRows.length },
  ];

  return (
    <div>
      {/* Search + filters + new submission */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        <div className="relative flex-1 min-w-56">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search by KP / Brand or Project name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-300 rounded-lg px-2.5 py-2 text-sm bg-white text-gray-700"
          value={assetFilter}
          onChange={(e) => setAssetFilter(e.target.value)}
          aria-label="Filter by asset class"
        >
          <option value="">Asset Class</option>
          {ASSET_CLASSES.map((a) => (
            <option key={a} value={a}>
              Asset {a}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-300 rounded-lg px-2.5 py-2 text-sm bg-white text-gray-700"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by project type"
        >
          <option value="">Project Types</option>
          {Object.keys(APPROVAL_TYPE_ASSET_CLASSES).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {canCreateSubmission(user.team) && (
          <Link
            href="/submission/new"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Submission
          </Link>
        )}
      </div>

      {/* Lifecycle tabs — every team sees the whole flow; edit rights are per stage */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
            <span
              className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab: Funding Lead — drafts in preparation, same table shape as IC Review */}
      {tab === "prep" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-sm">
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">KP / Brand</th>
                <th className="py-2.5 px-2.5 font-bold w-full min-w-48">Project&apos;s Name</th>
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Type</th>
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Asset</th>
                <th className="py-2.5 px-2.5 font-bold text-right whitespace-nowrap w-0">Amount</th>
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Created at</th>
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Last updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleDrafts.map((d) => (
                <tr
                  key={d.id}
                  className="hover:bg-blue-50/40 cursor-pointer group"
                  onClick={() => router.push(`/submission/${d.id}`)}
                >
                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    {d.form.brandName ? (
                      <Link
                        href={`/kp/${encodeURIComponent(d.form.brandName)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-600 hover:text-blue-700 hover:underline underline-offset-2"
                      >
                        {d.form.brandName}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 font-medium text-gray-900 group-hover:text-blue-700">
                    {d.form.projectName || "Untitled submission"}
                  </td>
                  <td className="py-2.5 px-2.5">
                    <Tag label={d.form.approvalType} variant={approvalTypeVariant(d.form.approvalType)} />
                  </td>
                  <td className="py-2.5 px-2.5">
                    <Tag label={`Asset ${d.form.assetClass}`} variant={assetClassVariant(d.form.assetClass)} />
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-medium text-gray-800 whitespace-nowrap">
                    {d.form.requestedAmount > 0
                      ? d.form.requestedAmountCurrency === "IDR"
                        ? fmt(d.form.requestedAmount)
                        : `USD ${d.form.requestedAmount.toLocaleString()}`
                      : <span className="text-gray-400 font-normal">—</span>}
                  </td>
                  <td className="py-2.5 px-2.5 text-gray-500 whitespace-nowrap">{fmtDate(d.createdAt)}</td>
                  <td className="py-2.5 px-2.5 text-gray-500 whitespace-nowrap">
                    {fmtDate(d.updatedAt ?? d.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleDrafts.length === 0 && (
            <p className="text-sm text-gray-400 px-6 py-8 text-center">
              {query ? `No results for “${query}”.` : "No drafts in preparation."}
            </p>
          )}
        </div>
      )}

      {/* Tab: IC Review — pending votes + rejected requests */}
      {tab === "ic" && (
        <FlowTable
          flowRows={icRows}
          voteMemberName={isIC ? user.name : null}
          query={query}
          statusCell={(row) => (
            <ReviewStatusCell submittedAt={row.project.submittedAt} rejected={row.rejected} />
          )}
          emptyText="No pending reviews."
        />
      )}

      {/* Tab: Legal — IC approved, documentation in progress */}
      {tab === "legal" && (
        <FlowTable
          flowRows={legalRows}
          query={query}
          statusCell={(row) => (
            <StageStatusCell
              label="With Legal"
              since={icDecidedAt(row.project, row.workflow)}
            />
          )}
          emptyText="No projects with Legal."
        />
      )}

      {/* Tab: Finance — documentation done, KF/KCF split & disbursement in progress */}
      {tab === "finance" && (
        <FlowTable
          flowRows={financeRows}
          query={query}
          statusCell={(row) => (
            <StageStatusCell label="With Finance" since={row.workflow.legal.completedAt} />
          )}
          emptyText="No projects with Finance."
        />
      )}

      {/* Tab: Onboarded — approved by IC and disbursed */}
      {tab === "decided" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-sm">
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">KP / Brand</th>
                <th className="py-2.5 px-2.5 font-bold w-full min-w-48">Project</th>
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Type</th>
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Asset</th>
                <th className="py-2.5 px-2.5 font-bold text-right whitespace-nowrap w-0">Amount</th>
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">IC Approved</th>
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {onboardedRows.map((o) => (
                <tr
                  key={o.id}
                  className={`hover:bg-emerald-50/40 ${o.href ? "cursor-pointer" : ""}`}
                  onClick={() => o.href && router.push(o.href)}
                >
                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    <Link
                      href={`/kp/${encodeURIComponent(o.brandName)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-600 hover:text-blue-700 hover:underline underline-offset-2"
                    >
                      {o.brandName}
                    </Link>
                  </td>
                  <td className="py-2.5 px-2.5 font-medium text-gray-900">{o.projectName}</td>
                  <td className="py-2.5 px-2.5">
                    <Tag label={o.approvalType} variant={approvalTypeVariant(o.approvalType)} />
                  </td>
                  <td className="py-2.5 px-2.5">
                    <Tag label={`Asset ${o.assetClass}`} variant={assetClassVariant(o.assetClass)} />
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-medium text-gray-800 whitespace-nowrap">
                    {o.requestedAmountCurrency === "IDR" ? fmt(o.amount) : `USD ${o.amount.toLocaleString()}`}
                  </td>
                  <td className="py-2.5 px-2.5 text-gray-500 whitespace-nowrap">{fmtDate(o.icApprovedAt)}</td>
                  <td className="py-2.5 px-2.5">
                    <span
                      className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap"
                      title={`Onboarded ${fmtDate(o.onboardedAt)}`}
                    >
                      Onboarded
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {onboardedRows.length === 0 && (
            <p className="text-sm text-gray-400 px-6 py-8 text-center">
              {query ? `No results for “${query}”.` : "No onboarded submissions."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

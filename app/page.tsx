"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Plus, Search, Vote } from "lucide-react";
import { ICProject } from "@/data/types";
import { mockProjects } from "@/data/mock";
import { Tag, approvalTypeVariant, assetClassVariant } from "@/components/ui/Tag";
import {
  allReviewProjects,
  listSubmissions,
  seedDemoSubmissions,
  StoredSubmission,
} from "@/lib/submissionsStore";
import { useProfile } from "@/lib/profileStore";
import { canCreateSubmission, Stage, STAGE_LABELS } from "@/lib/access";
import { daysWaiting, needsVoteFrom, votesRemaining } from "@/lib/icVoting";
import {
  effectiveVotes,
  emptyWorkflow,
  getWorkflow,
  icDecidedAt,
  ProjectWorkflow,
  seedDefaultWorkflows,
  stageInfo,
} from "@/lib/workflowStore";
import { seedDefaultLimitConfigs } from "@/lib/limitsStore";

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

/** Asset A/D sort to the top of a tab's table; Asset B (any subtype) sinks to the bottom. */
function assetSortRank(assetClass: string): number {
  return assetClass.startsWith("B") ? 1 : 0;
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

/** Stage badge + how long the stage has been holding the project. */
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

type TabKey = "prep" | "ic" | "finance_slotting" | "legal" | "finance_disbursement";

interface FlowRow {
  /** Project with in-app votes overlaid, so vote chips reflect the recorded state. */
  project: ICProject;
  workflow: ProjectWorkflow;
  stage: Stage;
  rejected: boolean;
}

/** Shared table shell for the IC / Finance Split / Legal Agreement / Finance Disbursed tabs. */
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
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Asset</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Financing Type</th>
            <th className="py-2.5 px-2.5 font-bold text-right whitespace-nowrap w-0">Requested Amount</th>
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
                  <Tag label={`Asset ${p.assetClass}`} variant={assetClassVariant(p.assetClass)} />
                </td>
                <td className="py-2.5 px-2.5">
                  <Tag label={p.approvalType} variant={approvalTypeVariant(p.approvalType)} />
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

/** What a dragged card carries — enough to know where to navigate on a cross-column drop. */
interface DragPayload {
  kind: "draft" | "project";
  id: string;
  label: string;
  sourceCol: TabKey;
}

/** One card's worth of display data, built once per column from whichever source it came from. */
interface BoardItem {
  key: string;
  payload: DragPayload;
  brandName: string;
  projectName: string;
  assetClass: string;
  approvalType: string;
  amountLabel: string;
  statusNode: React.ReactNode;
}

function draftToBoardItem(d: StoredSubmission): BoardItem {
  return {
    key: d.id,
    payload: { kind: "draft", id: d.id, label: d.form.projectName || d.form.brandName || "Untitled submission", sourceCol: "prep" },
    brandName: d.form.brandName,
    projectName: d.form.projectName || "Untitled submission",
    assetClass: d.form.assetClass,
    approvalType: d.form.approvalType,
    amountLabel:
      d.form.requestedAmount > 0
        ? d.form.requestedAmountCurrency === "IDR"
          ? fmt(d.form.requestedAmount)
          : `USD ${d.form.requestedAmount.toLocaleString()}`
        : "—",
    statusNode: (
      <span className="text-xs text-gray-500">{daysWaiting(d.updatedAt ?? d.createdAt)}d idle</span>
    ),
  };
}

function rowToBoardItem(row: FlowRow, sourceCol: TabKey, statusNode: React.ReactNode): BoardItem {
  const p = row.project;
  return {
    key: p.id,
    payload: { kind: "project", id: p.id, label: p.projectName, sourceCol },
    brandName: p.brandName,
    projectName: p.projectName,
    assetClass: p.assetClass,
    approvalType: p.approvalType,
    amountLabel: projectAmount(p),
    statusNode,
  };
}

function BoardCard({
  item,
  onDragStart,
  onClick,
}: {
  item: BoardItem;
  onDragStart: (ev: React.DragEvent) => void;
  onClick: () => void;
}) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <Link
          href={`/kp/${encodeURIComponent(item.brandName)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-gray-500 hover:text-blue-700 hover:underline underline-offset-2 truncate"
        >
          {item.brandName || "—"}
        </Link>
      </div>
      <div className="text-sm font-medium text-gray-900 mb-2 leading-snug">{item.projectName}</div>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <Tag label={`Asset ${item.assetClass}`} variant={assetClassVariant(item.assetClass)} />
        <Tag label={item.approvalType} variant={approvalTypeVariant(item.approvalType)} />
      </div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{item.amountLabel}</span>
      </div>
      {item.statusNode}
    </article>
  );
}

/** Every pipeline stage as one board — reuses exactly the same rows the table view computes. */
function PipelineBoard({
  columns,
  query,
}: {
  columns: Array<{ key: TabKey; label: string; items: BoardItem[] }>;
  query: string;
}) {
  const router = useRouter();
  const [dragOverCol, setDragOverCol] = useState<TabKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function handleDragStart(ev: React.DragEvent, payload: DragPayload) {
    ev.dataTransfer.setData("text/plain", JSON.stringify(payload));
    ev.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(ev: React.DragEvent, colKey: TabKey) {
    ev.preventDefault();
    setDragOverCol(null);
    let payload: DragPayload;
    try {
      payload = JSON.parse(ev.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }
    // Same column: nothing to do — order here isn't manually controlled.
    if (payload.sourceCol === colKey) return;
    // Every other stage boundary needs a real gated action (votes, exact-sum slotting,
    // a legal checklist, submission validation) that a drag can't legitimately complete —
    // so a cross-column drop opens the real screen instead of silently moving the card.
    const dest = payload.kind === "draft" ? `/submission/${payload.id}` : `/project/${payload.id}`;
    setNotice(`Opening “${payload.label}” — ${payload.kind === "draft" ? "the submission form" : "the project page"} to advance it from here.`);
    setTimeout(() => router.push(dest), 450);
  }

  return (
    <div>
      {notice && (
        <div className="mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          {notice}
        </div>
      )}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((col) => (
          <div key={col.key} className="flex-1 min-w-[280px] max-w-[360px]">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {col.items.length}
              </span>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.key);
              }}
              onDragLeave={() => setDragOverCol((cur) => (cur === col.key ? null : cur))}
              onDrop={(e) => handleDrop(e, col.key)}
              className={`rounded-xl p-2 space-y-2 min-h-[140px] border transition-colors ${
                dragOverCol === col.key
                  ? "bg-blue-50/60 border-blue-300"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              {col.items.map((item) => (
                <BoardCard
                  key={item.key}
                  item={item}
                  onDragStart={(e) => handleDragStart(e, item.payload)}
                  onClick={() =>
                    router.push(
                      item.payload.kind === "draft"
                        ? `/submission/${item.payload.id}`
                        : `/project/${item.payload.id}`
                    )
                  }
                />
              ))}
              {col.items.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">
                  {query ? "No matches here." : "Nothing in this stage."}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
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
  const [tab, setTab] = useState<TabKey>("ic");
  const [homeView, setHomeView] = useState<"table" | "board">("table");

  useEffect(() => {
    seedDemoSubmissions();
    seedDefaultLimitConfigs();
    seedDefaultWorkflows();
    const all = allReviewProjects();
    setProjects(all);
    setDrafts(listSubmissions().filter((s) => s.status === "draft"));
    setWorkflows(Object.fromEntries(all.map((p) => [p.id, getWorkflow(p.id)])));
  }, []);

  // Everyone on a team sees the whole pipeline — access is by Role Type, not person.
  const isIC = user.team === "Investment Committee";

  // Search
  const matching = projects
    .filter((p) => matchesQuery(query, p.brandName, p.projectName))
    // Asset A/D float to the top, Asset B sinks to the bottom; within that, grouped by
    // KP/Brand (rows for the same brand sit together), then oldest-first within a brand.
    .sort(
      (a, b) =>
        assetSortRank(a.assetClass) - assetSortRank(b.assetClass) ||
        a.brandName.localeCompare(b.brandName) ||
        a.submittedAt.localeCompare(b.submittedAt)
    );

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
  const financeSlottingRows = byStage("finance_slotting");
  const legalRows = byStage("legal");
  const financeDisbursementRows = byStage("finance_disbursement");

  const visibleDrafts = drafts
    .filter((d) => matchesQuery(query, d.form.brandName, d.form.projectName))
    .sort(
      (a, b) =>
        assetSortRank(a.form.assetClass) - assetSortRank(b.form.assetClass) ||
        a.form.brandName.localeCompare(b.form.brandName) ||
        a.createdAt.localeCompare(b.createdAt)
    );

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: "prep", label: STAGE_LABELS.funding_lead, count: visibleDrafts.length },
    { key: "ic", label: STAGE_LABELS.ic_review, count: icRows.length },
    { key: "finance_slotting", label: STAGE_LABELS.finance_slotting, count: financeSlottingRows.length },
    { key: "legal", label: STAGE_LABELS.legal, count: legalRows.length },
    {
      key: "finance_disbursement",
      label: STAGE_LABELS.finance_disbursement,
      count: financeDisbursementRows.length,
    },
  ];

  // Board view: the exact same rows as the tables above, reshaped into board columns.
  const boardColumns: Array<{ key: TabKey; label: string; items: BoardItem[] }> = [
    { key: "prep", label: STAGE_LABELS.funding_lead, items: visibleDrafts.map(draftToBoardItem) },
    {
      key: "ic",
      label: STAGE_LABELS.ic_review,
      items: icRows.map((row) =>
        rowToBoardItem(row, "ic", <ReviewStatusCell submittedAt={row.project.submittedAt} rejected={row.rejected} />)
      ),
    },
    {
      key: "finance_slotting",
      label: STAGE_LABELS.finance_slotting,
      items: financeSlottingRows.map((row) =>
        rowToBoardItem(
          row,
          "finance_slotting",
          <StageStatusCell label={STAGE_LABELS.finance_slotting} since={icDecidedAt(row.project, row.workflow)} />
        )
      ),
    },
    {
      key: "legal",
      label: STAGE_LABELS.legal,
      items: legalRows.map((row) =>
        rowToBoardItem(
          row,
          "legal",
          <StageStatusCell label={STAGE_LABELS.legal} since={row.workflow.finance.slottedAt} />
        )
      ),
    },
    {
      key: "finance_disbursement",
      label: STAGE_LABELS.finance_disbursement,
      items: financeDisbursementRows.map((row) =>
        rowToBoardItem(
          row,
          "finance_disbursement",
          <StageStatusCell label={STAGE_LABELS.finance_disbursement} since={row.workflow.legal.completedAt} />
        )
      ),
    },
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
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setHomeView("table")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              homeView === "table" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Table
          </button>
          <button
            type="button"
            onClick={() => setHomeView("board")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              homeView === "board" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Board
          </button>
        </div>
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

      {homeView === "board" && <PipelineBoard columns={boardColumns} query={query} />}

      {/* Lifecycle tabs — every team sees the whole flow; edit rights are per stage */}
      {homeView === "table" && (
      <>
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
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Asset</th>
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Financing Type</th>
                <th className="py-2.5 px-2.5 font-bold text-right whitespace-nowrap w-0">Requested Amount</th>
                <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Idle</th>
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
                    <Tag label={`Asset ${d.form.assetClass}`} variant={assetClassVariant(d.form.assetClass)} />
                  </td>
                  <td className="py-2.5 px-2.5">
                    <Tag label={d.form.approvalType} variant={approvalTypeVariant(d.form.approvalType)} />
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-medium text-gray-800 whitespace-nowrap">
                    {d.form.requestedAmount > 0
                      ? d.form.requestedAmountCurrency === "IDR"
                        ? fmt(d.form.requestedAmount)
                        : `USD ${d.form.requestedAmount.toLocaleString()}`
                      : <span className="text-gray-400 font-normal">—</span>}
                  </td>
                  <td className="py-2.5 px-2.5 text-gray-500 whitespace-nowrap">
                    {daysWaiting(d.updatedAt ?? d.createdAt)}d
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

      {/* Tab: Finance Split — IC approved, Finance assigning the KF/KCF split */}
      {tab === "finance_slotting" && (
        <FlowTable
          flowRows={financeSlottingRows}
          query={query}
          statusCell={(row) => (
            <StageStatusCell
              label={STAGE_LABELS.finance_slotting}
              since={icDecidedAt(row.project, row.workflow)}
            />
          )}
          emptyText="No projects with Finance for slotting."
        />
      )}

      {/* Tab: Legal Agreement — KF/KCF slotted, documentation in progress */}
      {tab === "legal" && (
        <FlowTable
          flowRows={legalRows}
          query={query}
          statusCell={(row) => (
            <StageStatusCell label={STAGE_LABELS.legal} since={row.workflow.finance.slottedAt} />
          )}
          emptyText="No projects with Legal."
        />
      )}

      {/* Tab: Finance Disbursed — documentation done, bank details & disbursement in progress */}
      {tab === "finance_disbursement" && (
        <FlowTable
          flowRows={financeDisbursementRows}
          query={query}
          statusCell={(row) => (
            <StageStatusCell
              label={STAGE_LABELS.finance_disbursement}
              since={row.workflow.legal.completedAt}
            />
          )}
          emptyText="No projects awaiting disbursement."
        />
      )}
      </>
      )}
    </div>
  );
}

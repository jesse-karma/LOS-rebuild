"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Search, User } from "lucide-react";
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
import { Stage, STAGE_LABELS } from "@/lib/access";
import { daysWaiting, needsVoteFrom } from "@/lib/icVoting";
import {
  effectiveVotes,
  emptyWorkflow,
  getWorkflow,
  icDecidedAt,
  LegalState,
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

/** Full Pipeline just needs how long a row has been sitting — My Queue already surfaces what's actionable. */
function IdleCell({
  since,
  rejected,
  pendingLabel,
}: {
  since: string | null;
  rejected?: boolean;
  /** Tabs where "no decision yet" should read as an explicit status (e.g. "Need Review") rather than a bare day count. */
  pendingLabel?: string;
}) {
  if (rejected) {
    return <span className="text-xs font-medium text-red-600 whitespace-nowrap">Rejected</span>;
  }
  if (!since) return <span className="text-xs text-gray-300">—</span>;
  const days = daysWaiting(since);
  const stale = days > 14;
  if (pendingLabel) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 whitespace-nowrap">
          {pendingLabel}
        </span>
        <span className={`text-xs px-0.5 whitespace-nowrap ${stale ? "text-red-600 font-semibold" : "text-gray-400"}`}>
          {days}d idle
        </span>
      </div>
    );
  }
  return (
    <span className={`text-xs whitespace-nowrap ${stale ? "text-red-600 font-semibold" : "text-gray-500"}`}>
      {days}d idle
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
  emptyText,
  query,
}: {
  flowRows: FlowRow[];
  statusCell: (row: FlowRow) => React.ReactNode;
  emptyText: string;
  query: string;
}) {
  const router = useRouter();
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-sm">
            <th className="py-2.5 px-2.5 font-bold w-full min-w-48">Project</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">KP / Brand</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Asset</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Financing Type</th>
            <th className="py-2.5 px-2.5 font-bold text-right whitespace-nowrap w-0">Amount</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Idle</th>
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
                <td className="py-2.5 px-2.5 font-medium text-gray-900">{p.projectName}</td>
                <td className="py-2.5 px-2.5 whitespace-nowrap">
                  <Link
                    href={`/kp/${encodeURIComponent(p.brandName)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-600 hover:text-blue-700 hover:underline underline-offset-2"
                  >
                    {p.brandName}
                  </Link>
                </td>
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

/** One card's worth of display data — same fields the table shows, whichever source it came from. */
interface CardItem {
  key: string;
  href: string;
  brandName: string;
  projectName: string;
  assetClass: string;
  approvalType: string;
  amountLabel: string;
  primaryAnalyst: string;
  statusNode?: React.ReactNode;
  /** Last-touched timestamp (ISO) — drives the "newest edit" default sort in queue carousels. */
  updatedAt: string;
}

function draftToCardItem(d: StoredSubmission): CardItem {
  return {
    key: d.id,
    href: `/submission/${d.id}`,
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
    primaryAnalyst: d.form.primaryAnalyst || "—",
    statusNode: <IdleCell since={d.updatedAt ?? d.createdAt} />,
    updatedAt: d.updatedAt ?? d.createdAt,
  };
}

/** Table shell for CardItem-backed tabs (mixes drafts with rejected-and-returned projects) — same columns as FlowTable. */
function SimpleFlowTable({ items, query, emptyText }: { items: CardItem[]; query: string; emptyText: string }) {
  const router = useRouter();
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-sm">
            <th className="py-2.5 px-2.5 font-bold w-full min-w-48">Project</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">KP / Brand</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Asset</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Financing Type</th>
            <th className="py-2.5 px-2.5 font-bold text-right whitespace-nowrap w-0">Amount</th>
            <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Idle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item) => (
            <tr
              key={item.key}
              className="hover:bg-blue-50/40 cursor-pointer group"
              onClick={() => router.push(item.href)}
            >
              <td className="py-2.5 px-2.5 font-medium text-gray-900 group-hover:text-blue-700">
                {item.projectName}
              </td>
              <td className="py-2.5 px-2.5 whitespace-nowrap">
                {item.brandName ? (
                  <Link
                    href={`/kp/${encodeURIComponent(item.brandName)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-600 hover:text-blue-700 hover:underline underline-offset-2"
                  >
                    {item.brandName}
                  </Link>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="py-2.5 px-2.5">
                <Tag label={`Asset ${item.assetClass}`} variant={assetClassVariant(item.assetClass)} />
              </td>
              <td className="py-2.5 px-2.5">
                <Tag label={item.approvalType} variant={approvalTypeVariant(item.approvalType)} />
              </td>
              <td className="py-2.5 px-2.5 text-right font-medium text-gray-800 whitespace-nowrap">
                {item.amountLabel === "—" ? <span className="text-gray-400 font-normal">—</span> : item.amountLabel}
              </td>
              <td className="py-2.5 px-2.5">{item.statusNode}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <p className="text-sm text-gray-400 px-6 py-8 text-center">
          {query ? `No results for “${query}”.` : emptyText}
        </p>
      )}
    </div>
  );
}

function rowToCardItem(row: FlowRow, statusNode: React.ReactNode): CardItem {
  const p = row.project;
  return {
    key: p.id,
    href: `/project/${p.id}`,
    brandName: p.brandName,
    projectName: p.projectName,
    assetClass: p.assetClass,
    approvalType: p.approvalType,
    amountLabel: projectAmount(p),
    primaryAnalyst: p.pic.primaryAnalyst || "—",
    statusNode,
    updatedAt: p.submittedAt,
  };
}

function ProjectCard({ item }: { item: CardItem }) {
  const router = useRouter();
  return (
    <article
      onClick={() => router.push(item.href)}
      className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all h-[224px] flex flex-col overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5 shrink-0">
        <Link
          href={`/kp/${encodeURIComponent(item.brandName)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-gray-500 hover:text-blue-700 hover:underline underline-offset-2 truncate"
        >
          {item.brandName || "—"}
        </Link>
      </div>
      <div className="text-sm font-medium text-gray-900 mb-2 leading-snug line-clamp-2 shrink-0">
        {item.projectName}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-2 shrink-0">
        <Tag label={`Asset ${item.assetClass}`} variant={assetClassVariant(item.assetClass)} />
        <Tag label={item.approvalType} variant={approvalTypeVariant(item.approvalType)} />
      </div>
      <div className="flex items-center justify-between gap-2 mb-1 shrink-0">
        <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{item.amountLabel}</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-1 shrink-0">
        <User className="w-3 h-3 shrink-0" />
        <span className="truncate">{item.primaryAnalyst}</span>
      </div>
      <div className="mt-auto">{item.statusNode}</div>
    </article>
  );
}

/** A stage tab's rows as a 3-per-row card grid — the same data the table view shows. */
function CardGrid({ items, emptyText, query }: { items: CardItem[]; emptyText: string; query: string }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 px-6 py-8 text-center">
        {query ? `No results for “${query}”.` : emptyText}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <ProjectCard key={item.key} item={item} />
      ))}
    </div>
  );
}

// ─── My Queue — one role-specific job at a time, no drag-and-drop ─────────────

function LegalChecklistProgress({ legal }: { legal: LegalState }) {
  const done = [legal.termSheetSigned, legal.agreementDrafted, legal.agreementSigned].filter(Boolean).length;
  return <span className="text-xs font-medium text-gray-500 whitespace-nowrap">{done}/3 steps done</span>;
}

/**
 * My Queue section, for every role — one flat set of cards (no sub-grouping within a
 * stage, e.g. drafts and IC-rejected returns aren't differentiated). Horizontal scroll,
 * ~5 cards visible at a time, newest-edit-first by default with a toggle to flip it.
 */
function QueueCarousel({ title, items, emptyText }: { title: string; items: CardItem[]; emptyText: string }) {
  const [sortDir, setSortDir] = useState<"newest" | "oldest">("newest");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const sorted = [...items].sort((a, b) =>
    sortDir === "newest" ? b.updatedAt.localeCompare(a.updatedAt) : a.updatedAt.localeCompare(b.updatedAt)
  );

  function scrollByCards(dir: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const cardWidth = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 240;
    el.scrollBy({ left: dir * (cardWidth + 12) * 3, behavior: "smooth" });
  }

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{items.length}</span>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "newest" ? "oldest" : "newest"))}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded-md border border-gray-200 bg-white whitespace-nowrap"
            >
              {sortDir === "newest" ? "Newest first" : "Oldest first"}
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(-1)}
              aria-label="Scroll left"
              className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              aria-label="Scroll right"
              className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400 italic px-1">{emptyText}</p>
      ) : (
        <div ref={scrollerRef} className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1">
          {sorted.map((item) => (
            <div
              key={item.key}
              className="shrink-0 snap-start"
              style={{ width: "calc(20% - 10px)", minWidth: 220 }}
            >
              <ProjectCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { user } = useProfile();
  const [projects, setProjects] = useState<ICProject[]>(mockProjects);
  const [drafts, setDrafts] = useState<StoredSubmission[]>([]);
  // Workflows load after mount (localStorage) — empty map matches the server render.
  const [workflows, setWorkflows] = useState<Record<string, ProjectWorkflow>>({});
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("prep");
  const [homeView, setHomeView] = useState<"table" | "card">("table");

  useEffect(() => {
    seedDemoSubmissions();
    seedDefaultLimitConfigs();
    seedDefaultWorkflows();
    const all = allReviewProjects();
    setProjects(all);
    setDrafts(listSubmissions().filter((s) => s.status === "draft"));
    setWorkflows(Object.fromEntries(all.map((p) => [p.id, getWorkflow(p.id)])));
  }, []);

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
  // Rejected by IC — sent back to the analyst, surfaced alongside drafts in Due Diligence.
  const returnedRows = byStage("funding_lead");
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

  // Due Diligence tab: fresh drafts + projects the IC sent back to the analyst.
  const prepItems: CardItem[] = [
    ...visibleDrafts.map(draftToCardItem),
    ...returnedRows.map((row) => rowToCardItem(row, <IdleCell since={row.project.submittedAt} rejected />)),
  ];

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: "prep", label: STAGE_LABELS.funding_lead, count: prepItems.length },
    { key: "ic", label: STAGE_LABELS.ic_review, count: icRows.length },
    { key: "finance_slotting", label: STAGE_LABELS.finance_slotting, count: financeSlottingRows.length },
    { key: "legal", label: STAGE_LABELS.legal, count: legalRows.length },
    {
      key: "finance_disbursement",
      label: STAGE_LABELS.finance_disbursement,
      count: financeDisbursementRows.length,
    },
  ];

  // My Queue — the one job each team actually does, not the whole pipeline. System Admin sees
  // everything already via Full Pipeline below, so it gets no personal queue. Investments Team's
  // queue renders separately below as a card carousel (drafts and IC-rejected returns aren't
  // differentiated — same Due Diligence stage either way).
  const myQueueSections: Array<{ title: string; items: CardItem[]; emptyText: string }> | null =
    (() => {
      switch (user.team) {
        case "Investments Team":
          return [{ title: "Continue Due Diligence", items: prepItems, emptyText: "No drafts in preparation." }];
        case "Investment Committee": {
          const awaitingMyVote = icRows.filter((row) => !row.rejected && needsVoteFrom(row.project, user.name));
          return [
            {
              title: "Awaiting Your Vote",
              items: awaitingMyVote.map((row) =>
                rowToCardItem(row, <ReviewStatusCell submittedAt={row.project.submittedAt} rejected={row.rejected} />)
              ),
              emptyText: "Nothing needs your vote right now.",
            },
          ];
        }
        case "Finance Team":
          return [
            {
              title: "Awaiting KF/KCF Split",
              items: financeSlottingRows.map((row) =>
                rowToCardItem(
                  row,
                  <StageStatusCell label={STAGE_LABELS.finance_slotting} since={icDecidedAt(row.project, row.workflow)} />
                )
              ),
              emptyText: "Nothing awaiting the KF/KCF split.",
            },
            {
              title: "Ready to Disburse",
              items: financeDisbursementRows.map((row) =>
                rowToCardItem(
                  row,
                  <StageStatusCell label={STAGE_LABELS.finance_disbursement} since={row.workflow.legal.completedAt} />
                )
              ),
              emptyText: "Nothing ready to disburse.",
            },
          ];
        case "Legal Team":
          return [
            {
              title: "Awaiting Legal Agreement",
              items: legalRows.map((row) => rowToCardItem(row, <LegalChecklistProgress legal={row.workflow.legal} />)),
              emptyText: "Nothing awaiting a legal agreement.",
            },
          ];
        default:
          return null;
      }
    })();

  return (
    <div>
      {myQueueSections && (
        <div className="mb-8">
          <h1 className="text-lg font-bold text-gray-900 mb-3">My Queue</h1>
          {myQueueSections.map((section) => (
            <QueueCarousel
              key={section.title}
              title={section.title}
              items={section.items}
              emptyText={section.emptyText}
            />
          ))}
        </div>
      )}

      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Full Pipeline</h2>

      {/* Search + filters */}
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
            onClick={() => setHomeView("card")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              homeView === "card" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Card
          </button>
        </div>
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

      {/* Tab: Due Diligence — fresh drafts + projects the IC rejected and sent back to the analyst */}
      {tab === "prep" && (
        homeView === "card" ? (
          <CardGrid items={prepItems} query={query} emptyText="No drafts in preparation." />
        ) : (
          <SimpleFlowTable items={prepItems} query={query} emptyText="No drafts in preparation." />
        )
      )}

      {/* Tab: IC Review — pending votes + rejected requests */}
      {tab === "ic" && (
        homeView === "card" ? (
          <CardGrid
            items={icRows.map((row) =>
              rowToCardItem(row, <IdleCell since={row.project.submittedAt} pendingLabel="Need Review" />)
            )}
            query={query}
            emptyText="No pending reviews."
          />
        ) : (
        <FlowTable
          flowRows={icRows}
          query={query}
          statusCell={(row) => <IdleCell since={row.project.submittedAt} pendingLabel="Need Review" />}
          emptyText="No pending reviews."
        />
        )
      )}

      {/* Tab: Finance Split — IC approved, Finance assigning the KF/KCF split */}
      {tab === "finance_slotting" && (
        homeView === "card" ? (
          <CardGrid
            items={financeSlottingRows.map((row) =>
              rowToCardItem(row, <IdleCell since={icDecidedAt(row.project, row.workflow)} />)
            )}
            query={query}
            emptyText="No projects with Finance for slotting."
          />
        ) : (
        <FlowTable
          flowRows={financeSlottingRows}
          query={query}
          statusCell={(row) => <IdleCell since={icDecidedAt(row.project, row.workflow)} />}
          emptyText="No projects with Finance for slotting."
        />
        )
      )}

      {/* Tab: Legal Agreement — KF/KCF slotted, documentation in progress */}
      {tab === "legal" && (
        homeView === "card" ? (
          <CardGrid
            items={legalRows.map((row) => rowToCardItem(row, <IdleCell since={row.workflow.finance.slottedAt} />))}
            query={query}
            emptyText="No projects with Legal."
          />
        ) : (
        <FlowTable
          flowRows={legalRows}
          query={query}
          statusCell={(row) => <IdleCell since={row.workflow.finance.slottedAt} />}
          emptyText="No projects with Legal."
        />
        )
      )}

      {/* Tab: Finance Disbursed — documentation done, bank details & disbursement in progress */}
      {tab === "finance_disbursement" && (
        homeView === "card" ? (
          <CardGrid
            items={financeDisbursementRows.map((row) =>
              rowToCardItem(row, <IdleCell since={row.workflow.legal.completedAt} />)
            )}
            query={query}
            emptyText="No projects awaiting disbursement."
          />
        ) : (
        <FlowTable
          flowRows={financeDisbursementRows}
          query={query}
          statusCell={(row) => <IdleCell since={row.workflow.legal.completedAt} />}
          emptyText="No projects awaiting disbursement."
        />
        )
      )}
    </div>
  );
}

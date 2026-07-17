"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Search } from "lucide-react";
import { Tag, TagVariant, approvalTypeVariant, assetClassVariant } from "@/components/ui/Tag";
import {
  allReviewProjects,
  listSubmissions,
  seedDemoSubmissions,
} from "@/lib/submissionsStore";
import { getWorkflow, seedDefaultWorkflows, stageInfo } from "@/lib/workflowStore";
import { Stage, STAGE_LABELS, STAGE_ORDER } from "@/lib/access";
import { seedDefaultLimitConfigs } from "@/lib/limitsStore";

function fmt(n: number): string {
  return `IDR ${new Intl.NumberFormat("id-ID").format(n)}`;
}

interface ProjectRow {
  id: string;
  kind: "draft" | "project";
  brandName: string;
  projectName: string;
  primaryAnalyst: string;
  assetClass: string;
  approvalType: string;
  amountLabel: string;
  stageLabel: string;
  stageRank: number;
  rejected: boolean;
}

/** Stage badge colors — distinct from asset/type tags, and Rejected always reads as danger. */
function stageVariant(stageLabel: string, rejected: boolean): TagVariant {
  if (rejected) return "red";
  const map: Record<string, TagVariant> = {
    "Due Diligence": "amber",
    "IC Review": "purple",
    "Finance Split": "blue",
    "Legal Agreement": "blue",
    "Finance Disbursed": "green",
    Onboarded: "green",
  };
  return map[stageLabel] ?? "default";
}

function buildProjectRows(): ProjectRow[] {
  const draftRows: ProjectRow[] = listSubmissions()
    .filter((s) => s.status === "draft")
    .map((d) => ({
      id: d.id,
      kind: "draft",
      brandName: d.form.brandName,
      projectName: d.form.projectName || "Untitled submission",
      primaryAnalyst: d.form.primaryAnalyst || "—",
      assetClass: d.form.assetClass,
      approvalType: d.form.approvalType,
      amountLabel:
        d.form.requestedAmount > 0
          ? d.form.requestedAmountCurrency === "IDR"
            ? fmt(d.form.requestedAmount)
            : `USD ${d.form.requestedAmount.toLocaleString()}`
          : "—",
      stageLabel: STAGE_LABELS.funding_lead,
      stageRank: STAGE_ORDER.indexOf("funding_lead" as Stage),
      rejected: false,
    }));

  const projectRows: ProjectRow[] = allReviewProjects().map((p) => {
    const info = stageInfo(p, getWorkflow(p.id));
    const stageLabel = info.rejected ? "Rejected" : STAGE_LABELS[info.stage];
    return {
      id: p.id,
      kind: "project",
      brandName: p.brandName,
      projectName: p.projectName,
      primaryAnalyst: p.pic.primaryAnalyst || "—",
      assetClass: p.assetClass,
      approvalType: p.approvalType,
      amountLabel:
        p.requestedAmountCurrency === "IDR"
          ? fmt(p.trancheTargetAmount ?? p.requestedAmount)
          : `USD ${(p.trancheTargetAmount ?? p.requestedAmount).toLocaleString()}`,
      stageLabel,
      stageRank: STAGE_ORDER.indexOf(info.stage),
      rejected: info.rejected,
    };
  });

  return [...draftRows, ...projectRows].sort(
    (a, b) => a.stageRank - b.stageRank || a.brandName.localeCompare(b.brandName)
  );
}

function ProjectCard({ row }: { row: ProjectRow }) {
  const router = useRouter();
  return (
    <article
      onClick={() => router.push(row.kind === "draft" ? `/submission/${row.id}` : `/project/${row.id}`)}
      className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <Link
          href={`/kp/${encodeURIComponent(row.brandName)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-gray-500 hover:text-blue-700 hover:underline underline-offset-2 truncate"
        >
          {row.brandName || "—"}
        </Link>
      </div>
      <div className="text-sm font-medium text-gray-900 mb-2 leading-snug">{row.projectName}</div>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <Tag label={`Asset ${row.assetClass}`} variant={assetClassVariant(row.assetClass)} />
        <Tag label={row.approvalType} variant={approvalTypeVariant(row.approvalType)} />
        <Tag label={row.stageLabel} variant={stageVariant(row.stageLabel, row.rejected)} />
      </div>

      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-100">
        <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{row.amountLabel}</span>
        <span className="text-xs text-gray-400 truncate">{row.primaryAnalyst}</span>
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ProjectRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [assetFilter, setAssetFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [view, setView] = useState<"table" | "card">("card");

  useEffect(() => {
    seedDemoSubmissions();
    seedDefaultLimitConfigs();
    seedDefaultWorkflows();
    setRows(buildProjectRows());
  }, []);

  const assetOptions = useMemo(
    () => (rows ? [...new Set(rows.map((r) => r.assetClass))].sort() : []),
    [rows]
  );
  const typeOptions = useMemo(
    () => (rows ? [...new Set(rows.map((r) => r.approvalType))].sort() : []),
    [rows]
  );
  const stageOptions = useMemo(() => {
    if (!rows) return [];
    const seen = new Map<string, number>();
    rows.forEach((r) => {
      if (!seen.has(r.stageLabel)) seen.set(r.stageLabel, r.rejected ? STAGE_ORDER.length : r.stageRank);
    });
    return [...seen.entries()].sort((a, b) => a[1] - b[1]).map(([label]) => label);
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => !q || r.brandName.toLowerCase().includes(q) || r.projectName.toLowerCase().includes(q))
      .filter((r) => assetFilter === "all" || r.assetClass === assetFilter)
      .filter((r) => typeFilter === "all" || r.approvalType === typeFilter)
      .filter((r) => stageFilter === "all" || r.stageLabel === stageFilter);
  }, [rows, query, assetFilter, typeFilter, stageFilter]);

  if (rows === null) return <p className="text-sm text-gray-400">Loading projects…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Projects</h1>
      <p className="text-sm text-gray-500 mb-5">
        Every project on file, across the whole pipeline. Click a row to open it.
      </p>

      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-56 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search by KP / Brand or Project name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={assetFilter}
          onChange={(e) => setAssetFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Assets</option>
          {assetOptions.map((a) => (
            <option key={a} value={a}>Asset {a}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Financing Types</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Stages</option>
          {stageOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setView("table")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === "table" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Table
          </button>
          <button
            type="button"
            onClick={() => setView("card")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === "card" ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Card
          </button>
        </div>
      </div>

      {view === "card" ? (
        filtered.length === 0 ? (
          <p className="text-sm text-gray-400 px-6 py-8 text-center">
            {query ? `No projects match “${query}”.` : "No projects yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <ProjectCard key={r.id} row={r} />
            ))}
          </div>
        )
      ) : (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-sm">
              <th className="py-2.5 px-2.5 font-bold w-full min-w-48">Project</th>
              <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">KP / Brand</th>
              <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Asset</th>
              <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Financing Type</th>
              <th className="py-2.5 px-2.5 font-bold text-right whitespace-nowrap w-0">Requested Amount</th>
              <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Primary Analyst</th>
              <th className="py-2.5 px-2.5 font-bold whitespace-nowrap w-0">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                onClick={() => router.push(r.kind === "draft" ? `/submission/${r.id}` : `/project/${r.id}`)}
              >
                <td className="py-2.5 px-2.5 font-medium text-gray-900">{r.projectName}</td>
                <td className="py-2.5 px-2.5 whitespace-nowrap">
                  <Link
                    href={`/kp/${encodeURIComponent(r.brandName)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-600 hover:text-blue-700 hover:underline underline-offset-2"
                  >
                    {r.brandName || "—"}
                  </Link>
                </td>
                <td className="py-2.5 px-2.5 whitespace-nowrap">
                  <Tag label={`Asset ${r.assetClass}`} variant={assetClassVariant(r.assetClass)} />
                </td>
                <td className="py-2.5 px-2.5 whitespace-nowrap">
                  <Tag label={r.approvalType} variant={approvalTypeVariant(r.approvalType)} />
                </td>
                <td className="py-2.5 px-2.5 text-right font-medium text-gray-800 whitespace-nowrap">
                  {r.amountLabel}
                </td>
                <td className="py-2.5 px-2.5 text-gray-600 whitespace-nowrap">{r.primaryAnalyst}</td>
                <td className="py-2.5 px-2.5 whitespace-nowrap">
                  <Tag label={r.stageLabel} variant={stageVariant(r.stageLabel, r.rejected)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 px-6 py-8 text-center">
            {query ? `No projects match “${query}”.` : "No projects yet."}
          </p>
        )}
      </div>
      )}
    </div>
  );
}

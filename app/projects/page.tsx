"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Tag, TagVariant, approvalTypeVariant, assetClassVariant } from "@/components/ui/Tag";
import {
  allReviewProjects,
  listSubmissions,
  seedDemoSubmissions,
} from "@/lib/submissionsStore";
import { getWorkflow, stageInfo } from "@/lib/workflowStore";
import { Stage, STAGE_LABELS, STAGE_ORDER } from "@/lib/access";

function fmt(n: number): string {
  return `IDR ${new Intl.NumberFormat("id-ID").format(n)}`;
}

interface ProjectRow {
  id: string;
  kind: "draft" | "project";
  brandName: string;
  projectName: string;
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

export default function ProjectsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ProjectRow[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    seedDemoSubmissions();
    setRows(buildProjectRows());
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.brandName.toLowerCase().includes(q) || r.projectName.toLowerCase().includes(q)
    );
  }, [rows, query]);

  if (rows === null) return <p className="text-sm text-gray-400">Loading projects…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Projects</h1>
      <p className="text-sm text-gray-500 mb-5">
        Every project on file, across the whole pipeline. Click a row to open it.
      </p>

      <div className="relative mb-5 max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search by KP / Brand or Project name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-xs">
              <th className="py-2.5 px-4 font-medium">KP / Brand</th>
              <th className="py-2.5 px-4 font-medium">Project</th>
              <th className="py-2.5 px-4 font-medium">Asset</th>
              <th className="py-2.5 px-4 font-medium">Financing Type</th>
              <th className="py-2.5 px-4 font-medium text-right">Requested Amount</th>
              <th className="py-2.5 px-4 font-medium">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                onClick={() => router.push(r.kind === "draft" ? `/submission/${r.id}` : `/project/${r.id}`)}
              >
                <td className="py-2.5 px-4 whitespace-nowrap">
                  <Link
                    href={`/kp/${encodeURIComponent(r.brandName)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-600 hover:text-blue-700 hover:underline underline-offset-2"
                  >
                    {r.brandName || "—"}
                  </Link>
                </td>
                <td className="py-2.5 px-4 font-medium text-gray-900">{r.projectName}</td>
                <td className="py-2.5 px-4">
                  <Tag label={`Asset ${r.assetClass}`} variant={assetClassVariant(r.assetClass)} />
                </td>
                <td className="py-2.5 px-4">
                  <Tag label={r.approvalType} variant={approvalTypeVariant(r.approvalType)} />
                </td>
                <td className="py-2.5 px-4 text-right font-medium text-gray-800 whitespace-nowrap">
                  {r.amountLabel}
                </td>
                <td className="py-2.5 px-4">
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
    </div>
  );
}

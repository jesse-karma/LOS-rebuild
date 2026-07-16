"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Tag, assetClassVariant } from "@/components/ui/Tag";
import { fmt } from "@/components/ui/DataRow";
import { allReviewProjects, getAllBrands, listSubmissions, seedDemoSubmissions } from "@/lib/submissionsStore";

interface CompanyRow {
  brandName: string;
  assetClasses: string[];
  sectors: string[];
  activeProjects: number;
  completedProjects: number;
  totalLimit: number | null;
  remainingTotal: number | null;
  /** True when this brand only exists as an in-progress draft — no submitted/mock project yet. */
  isDraftOnly: boolean;
}

function buildCompanyRows(): CompanyRow[] {
  const projects = allReviewProjects();
  const draftBrands = listSubmissions()
    .filter((s) => s.status === "draft")
    .map((s) => s.form.brandName)
    .filter((name) => name.trim());

  return getAllBrands().map((brandName) => {
    const brandProjects = projects.filter((p) => p.brandName === brandName);
    const latest = [...brandProjects].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];

    return {
      brandName,
      assetClasses: [...new Set(brandProjects.map((p) => p.assetClass))],
      sectors: [...new Set(brandProjects.map((p) => p.mainSector).filter(Boolean))],
      activeProjects: latest?.brandActiveProjects ?? 0,
      completedProjects: latest?.brandCompletedProjects ?? 0,
      totalLimit: latest?.plafond.current?.totalLimit ?? latest?.plafond.proposed?.totalLimit ?? null,
      remainingTotal: latest?.plafond.current ? latest.plafond.remainingTotal : null,
      // brandProjects.length === 0 means this brand only exists as an in-progress draft so far.
      isDraftOnly: brandProjects.length === 0 && draftBrands.includes(brandName),
    };
  });
}

export default function CompaniesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<CompanyRow[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    seedDemoSubmissions();
    setRows(buildCompanyRows());
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.brandName.toLowerCase().includes(q));
  }, [rows, query]);

  if (rows === null) return <p className="text-sm text-gray-400">Loading companies…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Companies</h1>
      <p className="text-sm text-gray-500 mb-5">
        Every Karmapreneur / Brand on file. Click a row for its project history, notes, and pricing.
      </p>

      <div className="relative mb-5 max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search companies…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-xs">
              <th className="py-2.5 px-4 font-medium">Company</th>
              <th className="py-2.5 px-4 font-medium">Asset Class</th>
              <th className="py-2.5 px-4 font-medium">Sector</th>
              <th className="py-2.5 px-4 font-medium text-right">Active</th>
              <th className="py-2.5 px-4 font-medium text-right">Completed</th>
              <th className="py-2.5 px-4 font-medium text-right">Total Limit</th>
              <th className="py-2.5 px-4 font-medium text-right">Remaining</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((r) => (
              <tr
                key={r.brandName}
                className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                onClick={() => router.push(`/kp/${encodeURIComponent(r.brandName)}`)}
              >
                <td className="py-2.5 px-4 font-medium text-gray-900">
                  <Link
                    href={`/kp/${encodeURIComponent(r.brandName)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-blue-700 hover:underline underline-offset-2"
                  >
                    {r.brandName}
                  </Link>
                  {r.isDraftOnly && (
                    <span className="ml-2 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      Draft only
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-4">
                  {r.assetClasses.length === 0 ? (
                    <span className="text-gray-300">—</span>
                  ) : (
                    <div className="flex gap-1 flex-wrap">
                      {r.assetClasses.map((a) => (
                        <Tag key={a} label={`Asset ${a}`} variant={assetClassVariant(a)} />
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-4 text-gray-600">{r.sectors.join(", ") || "—"}</td>
                <td className="py-2.5 px-4 text-right text-gray-700">{r.activeProjects}</td>
                <td className="py-2.5 px-4 text-right text-gray-700">{r.completedProjects}</td>
                <td className="py-2.5 px-4 text-right font-medium text-gray-800 whitespace-nowrap">
                  {r.totalLimit !== null ? fmt(r.totalLimit) : "—"}
                </td>
                <td
                  className={`py-2.5 px-4 text-right whitespace-nowrap ${
                    r.remainingTotal !== null && r.remainingTotal < 0
                      ? "text-red-600 font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {r.remainingTotal !== null ? fmt(r.remainingTotal) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 px-6 py-8 text-center">
            {query ? `No companies match “${query}”.` : "No companies yet."}
          </p>
        )}
      </div>
    </div>
  );
}

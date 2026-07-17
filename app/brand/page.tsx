"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Search } from "lucide-react";
import { fmt, fmtDate } from "@/components/ui/DataRow";
import { allReviewProjects, getAllBrands, listSubmissions, seedDemoSubmissions } from "@/lib/submissionsStore";

interface BrandRow {
  brandName: string;
  activeProjects: number;
  completedProjects: number;
  plafond: number | null;
  remainingTotal: number | null;
  /** Only brands with a confirmed current plafond have an expiry — proposed-only or no-plafond brands don't. */
  plafondExpiryDate: string | null;
  /** True when this brand only exists as an in-progress draft — no submitted/mock project yet. */
  isDraftOnly: boolean;
}

function buildBrandRows(): BrandRow[] {
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
      activeProjects: latest?.brandActiveProjects ?? 0,
      completedProjects: latest?.brandCompletedProjects ?? 0,
      plafond: latest?.plafond.current?.totalLimit ?? latest?.plafond.proposed?.totalLimit ?? null,
      remainingTotal: latest?.plafond.current ? latest.plafond.remainingTotal : null,
      plafondExpiryDate: latest?.plafond.current?.expiryDate ?? null,
      // brandProjects.length === 0 means this brand only exists as an in-progress draft so far.
      isDraftOnly: brandProjects.length === 0 && draftBrands.includes(brandName),
    };
  });
}

function BrandCard({ row }: { row: BrandRow }) {
  const router = useRouter();
  return (
    <article
      onClick={() => router.push(`/kp/${encodeURIComponent(row.brandName)}`)}
      className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link
          href={`/kp/${encodeURIComponent(row.brandName)}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold text-gray-900 hover:text-blue-700 hover:underline underline-offset-2 truncate"
        >
          {row.brandName}
        </Link>
        {row.isDraftOnly && (
          <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
            Draft only
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span>
          <span className="font-semibold text-gray-700">{row.activeProjects}</span> active
        </span>
        <span>
          <span className="font-semibold text-gray-700">{row.completedProjects}</span> completed
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
        <div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Plafond</div>
          <div className="text-sm font-medium text-gray-800">
            {row.plafond !== null ? fmt(row.plafond) : "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Remaining</div>
          <div
            className={`text-sm font-medium ${
              row.remainingTotal !== null && row.remainingTotal < 0 ? "text-red-600" : "text-gray-800"
            }`}
          >
            {row.remainingTotal !== null ? fmt(row.remainingTotal) : "—"}
          </div>
        </div>
      </div>

      {row.plafondExpiryDate && (
        <div className="mt-2 text-xs text-gray-400">Expires {fmtDate(row.plafondExpiryDate)}</div>
      )}
    </article>
  );
}

export default function BrandPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BrandRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"table" | "card">("card");

  useEffect(() => {
    seedDemoSubmissions();
    setRows(buildBrandRows());
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.brandName.toLowerCase().includes(q));
  }, [rows, query]);

  if (rows === null) return <p className="text-sm text-gray-400">Loading brands…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Brand</h1>
      <p className="text-sm text-gray-500 mb-5">
        Every Karmapreneur / Brand on file. Click a row for its project history, notes, and pricing.
      </p>

      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-56 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search brands…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
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
            {query ? `No brands match “${query}”.` : "No brands yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <BrandCard key={r.brandName} row={r} />
            ))}
          </div>
        )
      ) : (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-xs">
              <th className="py-2.5 px-4 font-medium">Brand</th>
              <th className="py-2.5 px-4 font-medium text-right">Active</th>
              <th className="py-2.5 px-4 font-medium text-right">Completed</th>
              <th className="py-2.5 px-4 font-medium text-right">Plafond</th>
              <th className="py-2.5 px-4 font-medium text-right">Remaining</th>
              <th className="py-2.5 px-4 font-medium">Plafond Expiry</th>
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
                <td className="py-2.5 px-4 text-right text-gray-700">{r.activeProjects}</td>
                <td className="py-2.5 px-4 text-right text-gray-700">{r.completedProjects}</td>
                <td className="py-2.5 px-4 text-right font-medium text-gray-800 whitespace-nowrap">
                  {r.plafond !== null ? fmt(r.plafond) : "—"}
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
                <td className="py-2.5 px-4 text-gray-600 whitespace-nowrap">
                  {r.plafondExpiryDate ? fmtDate(r.plafondExpiryDate) : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 px-6 py-8 text-center">
            {query ? `No brands match “${query}”.` : "No brands yet."}
          </p>
        )}
      </div>
      )}
    </div>
  );
}

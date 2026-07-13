"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Search, Vote } from "lucide-react";
import { ICProject } from "@/data/types";
import { mockProjects } from "@/data/mock";
import { computeWarnings } from "@/lib/warnings";
import { Tag, approvalTypeVariant, assetClassVariant } from "@/components/ui/Tag";
import {
  allReviewProjects,
  leadStatusFor,
  listSubmissions,
  requestStateFor,
  seedDemoSubmissions,
  StoredSubmission,
} from "@/lib/submissionsStore";
import { mockOnboarded } from "@/data/mockOnboarded";
import { isICRole, seesAllProjects, useProfile } from "@/lib/profileStore";
import { daysWaiting, needsVoteFrom, votesRemaining } from "@/lib/icVoting";
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

/** Lifecycle chip: Lead Status (master data §1) + Request State (§2). */
function LifecycleChip({ status }: { status: StoredSubmission["status"] }) {
  const lead = leadStatusFor(status);
  const request = requestStateFor(status);
  const isDraft = status === "draft";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded border ${
        isDraft
          ? "bg-gray-50 text-gray-600 border-gray-200"
          : "bg-indigo-50 text-indigo-700 border-indigo-200"
      }`}
      title={`Stage: ${lead.stage}`}
    >
      {lead.label}
      <span className={isDraft ? "text-gray-300" : "text-indigo-300"}>·</span>
      {request}
    </span>
  );
}

/** "waiting Nd" — red once IC has sat on it past the threshold. */
function AgingChip({ submittedAt }: { submittedAt: string }) {
  const days = daysWaiting(submittedAt);
  const stale = days > 14;
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${
        stale ? "bg-red-50 text-red-600 border border-red-200" : "bg-gray-50 text-gray-500 border border-gray-200"
      }`}
      title={`Submitted ${fmtDate(submittedAt)}`}
    >
      waiting {days}d
    </span>
  );
}

function BlockerChip({ project }: { project: ICProject }) {
  const errorCount = computeWarnings(project).filter((w) => w.level === "error").length;
  if (errorCount === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded whitespace-nowrap">
      <AlertCircle className="w-3 h-3" />
      {errorCount} blocker{errorCount > 1 ? "s" : ""}
    </span>
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

type TabKey = "prep" | "ic" | "decided";

export default function HomePage() {
  const { user } = useProfile();
  const router = useRouter();
  const [projects, setProjects] = useState<ICProject[]>(mockProjects);
  const [drafts, setDrafts] = useState<StoredSubmission[]>([]);
  const [query, setQuery] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [tab, setTab] = useState<TabKey>("ic");

  useEffect(() => {
    seedDemoSubmissions();
    setProjects(allReviewProjects());
    setDrafts(listSubmissions().filter((s) => s.status === "draft"));
  }, []);

  const isIC = isICRole(user.role);
  const showAll = seesAllProjects(user);

  // Role scope
  const scopedProjects = showAll
    ? projects
    : projects.filter(
        (p) => p.pic.primaryAnalyst === user.name || p.pic.secondaryAnalyst === user.name
      );
  const scopedDrafts = isIC
    ? []
    : showAll
    ? drafts
    : drafts.filter(
        (d) => d.form.primaryAnalyst === user.name || d.form.secondaryAnalyst === user.name
      );

  // Search + filters
  const visibleProjects = scopedProjects
    .filter((p) => matchesQuery(query, p.brandName, p.projectName))
    .filter((p) => !assetFilter || p.assetClass === assetFilter)
    .filter((p) => !typeFilter || p.approvalType === typeFilter)
    // Organize by KP/Brand (rows for the same brand sit together), then oldest-first within a brand.
    .sort((a, b) => a.brandName.localeCompare(b.brandName) || a.submittedAt.localeCompare(b.submittedAt));
  const visibleDrafts = scopedDrafts
    .filter((d) => matchesQuery(query, d.form.brandName, d.form.projectName))
    .filter((d) => !assetFilter || d.form.assetClass === assetFilter)
    .filter((d) => !typeFilter || d.form.approvalType === typeFilter);
  const visibleOnboarded = (showAll
    ? mockOnboarded
    : mockOnboarded.filter(
        (o) => o.primaryAnalyst === user.name || o.secondaryAnalyst === user.name
      )
  )
    .filter((o) => matchesQuery(query, o.brandName, o.projectName))
    .filter((o) => !assetFilter || o.assetClass === assetFilter)
    .filter((o) => !typeFilter || o.approvalType === typeFilter)
    .sort((a, b) => b.onboardedAt.localeCompare(a.onboardedAt));

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: "prep", label: "Funding Lead", count: visibleDrafts.length },
    { key: "ic", label: "IC Review", count: visibleProjects.length },
    { key: "decided", label: "Onboarded", count: visibleOnboarded.length },
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
        {!isIC && (
          <Link
            href="/submission/new"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Submission
          </Link>
        )}
      </div>

      {/* Lifecycle tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-5">
        {tabs
          .filter((t) => !(isIC && t.key === "prep"))
          .map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-xs">
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">KP / Brand</th>
                <th className="py-2 px-2.5 font-medium w-full min-w-48">Project</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Type</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Asset</th>
                <th className="py-2 px-2.5 font-medium text-right whitespace-nowrap w-0">Amount</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Started</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Status</th>
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
                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    <LifecycleChip status="draft" />
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

      {/* Tab: IC Review — one flat table, KP/Brand is just a column (rows grouped by brand order) */}
      {tab === "ic" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-xs">
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">KP / Brand</th>
                <th className="py-2 px-2.5 font-medium w-full min-w-48">Project</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Type</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Asset</th>
                <th className="py-2 px-2.5 font-medium text-right whitespace-nowrap w-0">Amount</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Waiting</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Blockers</th>
                {isIC && <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Vote</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleProjects.map((p) => (
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
                  <td className="py-2.5 px-2.5">
                    <AgingChip submittedAt={p.submittedAt} />
                  </td>
                  <td className="py-2.5 px-2.5">
                    <BlockerChip project={p} />
                  </td>
                  {isIC && (
                    <td className="py-2.5 px-2.5">
                      <VoteChip project={p} memberName={user.name} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleProjects.length === 0 && (
            <p className="text-sm text-gray-400 px-6 py-8 text-center">
              {query ? `No results for “${query}”.` : "No pending reviews for this profile."}
            </p>
          )}
        </div>
      )}

      {/* Tab: Onboarded — approved by IC and disbursed */}
      {tab === "decided" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-xs">
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">KP / Brand</th>
                <th className="py-2 px-2.5 font-medium w-full min-w-48">Project</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Type</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Asset</th>
                <th className="py-2 px-2.5 font-medium text-right whitespace-nowrap w-0">Amount</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">IC Approved</th>
                <th className="py-2 px-2.5 font-medium whitespace-nowrap w-0">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleOnboarded.map((o) => (
                <tr key={o.id} className="hover:bg-emerald-50/40">
                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    <Link
                      href={`/kp/${encodeURIComponent(o.brandName)}`}
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
          {visibleOnboarded.length === 0 && (
            <p className="text-sm text-gray-400 px-6 py-8 text-center">
              {query ? `No results for “${query}”.` : "No onboarded submissions for this profile."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

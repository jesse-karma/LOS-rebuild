"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight, Plus, Search, Vote } from "lucide-react";
import { ICProject } from "@/data/types";
import { mockProjects } from "@/data/mock";
import { computeWarnings } from "@/lib/warnings";
import { Tag, approvalTypeVariant, assetClassVariant } from "@/components/ui/Tag";
import {
  allReviewProjects,
  leadStatusFor,
  listSubmissions,
  requestStateFor,
  StoredSubmission,
} from "@/lib/submissionsStore";
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
      className={`text-xs font-medium px-2 py-0.5 rounded ${
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
    <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded">
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
      <span className="inline-flex items-center gap-1 text-xs bg-emerald-600 text-white font-semibold px-2 py-0.5 rounded">
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

function DraftCard({ draft }: { draft: StoredSubmission }) {
  const f = draft.form;
  return (
    <Link
      href={`/submission/${draft.id}`}
      className="block bg-white border border-dashed border-gray-300 rounded-xl px-6 py-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {f.brandName && <span className="text-xs text-gray-500">{f.brandName}</span>}
            <Tag label={`Asset ${f.assetClass}`} variant={assetClassVariant(f.assetClass)} />
            <LifecycleChip status="draft" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
            {f.projectName || "Untitled submission"}
          </h2>
          <div className="text-xs text-gray-500 mt-1">
            {f.approvalType} · started {fmtDate(draft.createdAt)}
          </div>
        </div>
        <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-800 shrink-0">
          Continue draft →
        </span>
      </div>
    </Link>
  );
}

// ─── Attention block ──────────────────────────────────────────────────────────

interface AttentionItem {
  href: string;
  title: string;
  reason: string;
}

function AttentionBlock({ items, heading }: { items: AttentionItem[]; heading: string }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
      <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">{heading}</h2>
      <div className="divide-y divide-amber-100">
        {items.map((it, i) => (
          <Link key={i} href={it.href} className="flex items-center gap-3 py-2 group">
            <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm font-medium text-gray-900 group-hover:text-amber-800">{it.title}</span>
            <span className="text-xs text-amber-700 ml-auto text-right">{it.reason}</span>
          </Link>
        ))}
      </div>
    </div>
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

  // Attention items per role
  let attention: AttentionItem[] = [];
  let attentionHeading = "Needs your attention";
  if (isIC) {
    attentionHeading = "Awaiting your vote";
    attention = visibleProjects
      .filter((p) => needsVoteFrom(p, user.name))
      .map((p) => ({
        href: `/project/${p.id}`,
        title: p.projectName,
        reason: `waiting ${daysWaiting(p.submittedAt)}d · ${projectAmount(p)}`,
      }));
  } else {
    attentionHeading = "Pick up where you left off";
    attention = visibleDrafts.map((d) => ({
      href: `/submission/${d.id}`,
      title: d.form.projectName || "Untitled submission",
      reason: `draft · started ${fmtDate(d.createdAt)}`,
    }));
  }

  const scopeLabel =
    user.role === "Analyst"
      ? "your projects"
      : user.role === "Analyst Principal"
      ? "all of the team's projects"
      : "all pending reviews";

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: "prep", label: "Funding Lead", count: visibleDrafts.length },
    { key: "ic", label: "IC Review", count: visibleProjects.length },
    { key: "decided", label: "Onboarded", count: 0 },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-medium text-gray-700">{user.name}</span> · {user.role} — showing {scopeLabel}
          </p>
        </div>
        {!isIC && (
          <Link
            href="/submission/new"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Submission
          </Link>
        )}
      </div>

      <AttentionBlock items={attention} heading={attentionHeading} />

      {/* Search + filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
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

      {/* Tab: In Preparation */}
      {tab === "prep" && (
        <div className="space-y-3">
          {visibleDrafts.map((d) => (
            <DraftCard key={d.id} draft={d} />
          ))}
          {visibleDrafts.length === 0 && (
            <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl px-6 py-8 text-center">
              No drafts in preparation.
            </p>
          )}
        </div>
      )}

      {/* Tab: IC Review — one flat table, KP/Brand is just a column (rows grouped by brand order) */}
      {tab === "ic" && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-xs">
                <th className="py-2 px-4 font-medium">KP / Brand</th>
                <th className="py-2 px-4 font-medium">Project</th>
                <th className="py-2 px-4 font-medium">Type</th>
                <th className="py-2 px-4 font-medium">Asset</th>
                <th className="py-2 px-4 font-medium text-right">Amount</th>
                <th className="py-2 px-4 font-medium">Waiting</th>
                <th className="py-2 px-4 font-medium">Blockers</th>
                {isIC && <th className="py-2 px-4 font-medium">Vote</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleProjects.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-blue-50/40 cursor-pointer"
                  onClick={() => router.push(`/project/${p.id}`)}
                >
                  <td className="py-2.5 px-4">
                    <Link
                      href={`/kp/${encodeURIComponent(p.brandName)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-600 hover:text-blue-700 hover:underline underline-offset-2"
                    >
                      {p.brandName}
                    </Link>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-gray-900">{p.projectName}</td>
                  <td className="py-2.5 px-4">
                    <Tag label={p.approvalType} variant={approvalTypeVariant(p.approvalType)} />
                  </td>
                  <td className="py-2.5 px-4">
                    <Tag label={`Asset ${p.assetClass}`} variant={assetClassVariant(p.assetClass)} />
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-gray-800 whitespace-nowrap">
                    {projectAmount(p)}
                  </td>
                  <td className="py-2.5 px-4">
                    <AgingChip submittedAt={p.submittedAt} />
                  </td>
                  <td className="py-2.5 px-4">
                    <BlockerChip project={p} />
                  </td>
                  {isIC && (
                    <td className="py-2.5 px-4">
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

      {/* Tab: Onboarded */}
      {tab === "decided" && (
        <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl px-6 py-8 text-center">
          No onboarded submissions yet — approved requests will land here once IC voting is wired to
          decisions.
        </p>
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
        <strong>Prototype note:</strong> This uses mocked data modelled on the verified IC Review data contract.
        Submissions you create are stored in your browser only; voting and approval actions are UI-only.
      </div>
    </div>
  );
}

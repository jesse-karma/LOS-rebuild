"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ICProject } from "@/data/types";
import { allReviewProjects } from "@/lib/submissionsStore";
import { existingUboExposure } from "@/lib/exposure";
import { typeLabelForAssetClass } from "@/data/masterData";
import { Tag, approvalTypeVariant, assetClassVariant } from "@/components/ui/Tag";
import { fmt, fmtDate } from "@/components/ui/DataRow";
import { PastProjectsRecap } from "@/components/sections/PastProjectsRecap";
import { SectionCard } from "@/components/ui/SectionCard";

function MemoBlock({ title, content }: { title: string; content: string }) {
  if (!content.trim()) return null;
  return (
    <div className="mb-4 last:mb-0">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{title}</div>
      <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}

/** Minimal Karmapreneur page — everything hangs off the Brand in the LOS model. */
export default function KPPage() {
  const { brand } = useParams<{ brand: string }>();
  const brandName = decodeURIComponent(brand);
  const [projects, setProjects] = useState<ICProject[] | null>(null);

  useEffect(() => {
    setProjects(allReviewProjects().filter((p) => p.brandName === brandName));
  }, [brandName]);

  if (projects === null) return <p className="text-sm text-gray-400">Loading Karmapreneur…</p>;

  if (projects.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No projects found for “{brandName}”.{" "}
        <Link href="/" className="text-blue-600 hover:underline">
          Back to submissions
        </Link>
      </div>
    );
  }

  // Latest submission carries the freshest KP-level data (plafond, contacts, recap).
  const latest = [...projects].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  const plafond = latest.plafond;
  const assetClasses = [...new Set(projects.map((p) => p.assetClass))];

  // KP-level notes an analyst logged on ANY of this brand's submissions, not just the latest —
  // project-specific notes live on the project page instead, not here.
  const seenNotes = new Set<string>();
  const kpNotes = projects
    .flatMap((p) => p.projectNotes)
    .filter((n) => n.noteType === "KP Note")
    .filter((n) => {
      const key = `${n.author}|${n.date}|${n.content}`;
      if (seenNotes.has(key)) return false;
      seenNotes.add(key);
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        All submissions
      </Link>

      {/* KP header */}
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 shadow-sm mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">{brandName}</h1>
          {latest.brandIsNew && (
            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded">New KP</span>
          )}
          {assetClasses.map((a) => (
            <Tag key={a} label={`Asset ${a}`} variant={assetClassVariant(a)} />
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {latest.brandActiveProjects} active · {latest.brandCompletedProjects} completed ·{" "}
          {latest.brandBeforeICProjects} before IC · {latest.brandPendingDisbursementProjects} pending
          disbursement · Referral: {latest.referralSource}
        </p>

        {/* Plafond snapshot */}
        {(plafond.current || plafond.proposed) && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {plafond.current ? (
              <>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Current Total Limit</div>
                  <div className="font-semibold text-gray-900 mt-0.5">{fmt(plafond.current.totalLimit)}</div>
                  <div className="text-xs text-gray-400">until {fmtDate(plafond.current.expiryDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Outstanding</div>
                  <div className="font-semibold text-gray-900 mt-0.5">{fmt(plafond.outstandingTotal)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Remaining</div>
                  <div
                    className={`font-semibold mt-0.5 ${plafond.remainingTotal < 0 ? "text-red-600" : "text-gray-900"}`}
                  >
                    {fmt(plafond.remainingTotal)}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Proposed Total Limit</div>
                <div className="font-semibold text-gray-900 mt-0.5">{fmt(plafond.proposed!.totalLimit)}</div>
                <div className="text-xs text-gray-400">first plafond — pending IC</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending reviews for this KP */}
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        In IC Review ({projects.length})
      </h2>
      <div className="space-y-3 mb-8">
        {projects.map((p) => {
          const projPlafond = p.plafond.current?.totalLimit ?? p.plafond.proposed?.totalLimit ?? null;
          const projRemaining = p.plafond.current ? p.plafond.remainingTotal : null;
          return (
            <Link
              key={p.id}
              href={`/project/${p.id}`}
              className="block bg-white border border-gray-200 rounded-xl px-6 py-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {p.projectName}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {fmt(p.trancheTargetAmount ?? p.requestedAmount, p.requestedAmountCurrency)}
                  </span>
                </div>
                <Tag label={typeLabelForAssetClass(p.assetClass)} variant={approvalTypeVariant(p.approvalType)} />
              </div>

              {/* Plafond / Remaining — same stat-block layout as the Brand page's cards, for consistency */}
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100 max-w-xs">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Plafond</div>
                  <div className="text-sm font-medium text-gray-800">
                    {projPlafond !== null ? fmt(projPlafond) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide">Remaining</div>
                  <div
                    className={`text-sm font-medium ${
                      projRemaining !== null && projRemaining < 0 ? "text-red-600" : "text-gray-800"
                    }`}
                  >
                    {projRemaining !== null ? fmt(projRemaining) : "—"}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* KP contacts from the latest submission */}
      {latest.kpContacts.length > 0 && (
        <>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contacts</h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left text-xs">
                  <th className="py-2 px-4 font-medium">Name</th>
                  <th className="py-2 px-4 font-medium">Role</th>
                  <th className="py-2 px-4 font-medium">Key Person</th>
                  <th className="py-2 px-4 font-medium">UBO Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {latest.kpContacts.map((c) => {
                  const uboExposure = existingUboExposure(c.name);
                  return (
                    <tr key={c.id}>
                      <td className="py-2.5 px-4 font-medium text-gray-900">{c.name}</td>
                      <td className="py-2.5 px-4 text-gray-600">{c.role}</td>
                      <td className="py-2.5 px-4 text-gray-600">{c.isKeyPerson ? "Yes" : "No"}</td>
                      <td className="py-2.5 px-4 text-gray-600">
                        {uboExposure > 0 ? fmt(uboExposure) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Previous projects & pricing — recap table already used on the IC project page, keyed off the latest submission */}
      <div className="mb-8">
        <PastProjectsRecap project={latest} />
      </div>

      {/* Notes — read-only: KP credit memo + the KP-level notes feed, pooled across every submission for this brand */}
      <div className="mb-8">
        <SectionCard title="Notes">
          <div className="mt-2">
            <MemoBlock title="KP Credit Memo" content={latest.kpCreditMemo} />

            {kpNotes.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Notes Feed
                </div>
                <div className="space-y-2">
                  {kpNotes.map((note, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">{note.author}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {note.attendee && <Tag label={note.attendee} variant="blue" />}
                          <span className="text-[11px] text-gray-400">{fmtDate(note.date)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {kpNotes.length === 0 && !latest.kpCreditMemo.trim() && (
              <p className="text-sm text-gray-400 italic">No notes recorded for this Karmapreneur yet.</p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

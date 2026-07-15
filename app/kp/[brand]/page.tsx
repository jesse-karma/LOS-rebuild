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
        {projects.map((p) => (
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
          </Link>
        ))}
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

      <p className="text-xs text-gray-400 mt-8">
        Prototype KP page — full Karmapreneur profile (notes, memos, PTs, project history) comes with the
        production build.
      </p>
    </div>
  );
}

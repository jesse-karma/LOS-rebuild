import { FinancialReview, ICProject } from "@/data/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { fmt, fmtDate } from "@/components/ui/DataRow";
import { CalculatorGSheetEmbedBlock } from "@/components/sections/CalculatorGSheetSection";
import { shouldShowCalculatorGSheet } from "@/lib/calculatorGSheetVisibility";
import { PlafondTable, hasPlafondInfo } from "@/components/sections/ProjectAndPlafond";

interface Props {
  project: ICProject;
}

const recoStyle: Record<FinancialReview["limitRecommendation"], string> = {
  Keep: "text-gray-800",
  Increase: "text-emerald-800",
  Decrease: "text-red-800",
};

/** Human-readable limit recommendation with amounts (IDR). */
function formatLimitRecommendationLine(review: FinancialReview): string {
  const cur = review.limitCurrentIdr;
  const next = review.limitRecommendedIdr ?? null;

  if (review.limitRecommendation === "Keep") {
    if (cur == null) return "Keep — no total brand limit on file at this review";
    return `Keep ${fmt(cur)}`;
  }
  if (review.limitRecommendation === "Increase") {
    if (cur != null && next != null) return `Increase ${fmt(cur)} to ${fmt(next)}`;
    return "Increase — limit amounts not specified";
  }
  if (review.limitRecommendation === "Decrease") {
    if (cur != null && next != null) return `Decrease from ${fmt(cur)} to ${fmt(next)}`;
    return "Decrease — limit amounts not specified";
  }
  return review.limitRecommendation;
}

function monthsAgo(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
}

export function FinancialReviews({ project }: Props) {
  const reviews = project.financialReviews.slice(0, 2);

  const showCalculator = shouldShowCalculatorGSheet(project);
  const showPlafond = hasPlafondInfo(project);
  const p = project.plafond;
  const negativeCount = [p.remainingTotal, p.remainingWC, p.remainingPO].filter((n) => n < 0).length;
  const badge =
    negativeCount > 0 ? (
      <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
        {negativeCount} issue{negativeCount > 1 ? "s" : ""}
      </span>
    ) : null;

  return (
    <SectionCard title="Plafond & Financial Reviews" badge={badge}>
      <div className="mt-2 space-y-4">
        {showPlafond && (
          <div className="pb-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Plafond</h3>
            <PlafondTable project={project} />
          </div>
        )}

        {showCalculator && (
          <div className="pb-4 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-900 mb-3">Calculator (Google Sheets)</div>
            <CalculatorGSheetEmbedBlock project={project} />
          </div>
        )}

        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Financial Reviews</h3>
        <div className="overflow-x-auto -mx-1">
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400 italic px-1">No financial reviews on record.</p>
        ) : (
          <table className="w-full text-xs min-w-[560px]">
            <thead>
              <tr className="border-b text-gray-400 text-left">
                <th className="pb-2 pr-3 font-medium w-20"></th>
                <th className="pb-2 pr-3 font-medium">Submitted</th>
                <th className="pb-2 pr-3 font-medium">Financial Reports Reviewed</th>
                <th className="pb-2 pr-3 font-medium">Reports&apos; Period Ending Date</th>
                <th className="pb-2 pr-3 font-medium">Limit Recommendation</th>
                <th className="pb-2 pr-3 font-medium">Notes</th>
                <th className="pb-2 font-medium">Warnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reviews.map((review, i) => {
                const months = monthsAgo(review.submissionDate);
                const isStale = months > 2;
                return (
                  <tr key={i} className="align-top">
                    <td className="py-3 pr-3 font-semibold text-gray-600">Review {i + 1}</td>
                    <td className="py-3 pr-3 text-gray-700 whitespace-nowrap">
                      {fmtDate(review.submissionDate)}
                    </td>
                    <td className="py-3 pr-3 text-gray-700">{review.financialReportsReviewed}</td>
                    <td className="py-3 pr-3 text-gray-700 whitespace-nowrap">
                      {fmtDate(review.periodEndingDate)}
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`text-xs font-medium leading-snug ${recoStyle[review.limitRecommendation]}`}>
                        {formatLimitRecommendationLine(review)}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-gray-700 max-w-[220px]">
                      <div className="whitespace-pre-wrap leading-relaxed">{review.reviewNotes}</div>
                    </td>
                    <td className="py-3">
                      {isStale && (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 whitespace-nowrap">
                          Warning: More than {Math.round(months)} months ago
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        </div>
      </div>
    </SectionCard>
  );
}

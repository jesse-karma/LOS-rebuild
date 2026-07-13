import { ICProject } from "@/data/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { DataRow, fmt, fmtDate } from "@/components/ui/DataRow";
import { Tag, assetClassVariant } from "@/components/ui/Tag";
import { Warning } from "@/components/ui/Warning";
import { isAssetB, isAssetD } from "@/lib/assetClass";

interface Props {
  project: ICProject;
}

function daysFromToday(isoDate: string): number {
  return Math.round((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/** Absolute limit + optional outstanding / remaining / remaining after this project amount (B & D). */
function AbsoluteLimitCell({
  limit,
  outstanding,
  remaining,
  remainingAfterProposed,
  ccy = "IDR",
}: {
  limit: number | null;
  outstanding?: number;
  remaining?: number | null;
  /** Remaining − requested project amount; shown for Asset B & D only when provided. */
  remainingAfterProposed?: number | null;
  ccy?: "IDR" | "USD";
}) {
  if (limit === null) return <span className="text-gray-300 text-xs">—</span>;

  const isNegRemaining = remaining !== null && remaining !== undefined && remaining < 0;
  const isNegAfter =
    remainingAfterProposed !== null && remainingAfterProposed !== undefined && remainingAfterProposed < 0;

  return (
    <div className="text-xs space-y-0.5">
      <div className="font-semibold text-gray-800">{fmt(limit, ccy)}</div>
      {outstanding != null && <div className="text-gray-500">Outstanding: {fmt(outstanding, ccy)}</div>}
      {remaining != null && (
        <div className={`font-medium ${isNegRemaining ? "text-red-600" : "text-gray-700"}`}>
          Remaining: {fmt(remaining, ccy)}
          {isNegRemaining && " ⚠️"}
        </div>
      )}
      {remainingAfterProposed != null && remainingAfterProposed !== undefined && (
        <div className={`text-[11px] leading-snug ${isNegAfter ? "text-red-600 font-medium" : "text-gray-600"}`}>
          <span className="text-gray-500">Remaining after current proposed: </span>
          <span className="font-semibold">{fmt(remainingAfterProposed, ccy)}</span>
          {isNegAfter && " ⚠️"}
        </div>
      )}
    </div>
  );
}

/** Change vs current, then proposed ceiling as **(to Rp …)**. */
function RequestedDeltaCell({ proposed, current }: { proposed: number; current: number }) {
  const delta = proposed - current;
  const signed =
    delta > 0
      ? `+${fmt(delta)}`
      : delta < 0
      ? `-${fmt(Math.abs(delta))}`
      : fmt(proposed);
  const deltaColor =
    delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-600" : "text-gray-800";
  return (
    <div className="text-xs space-y-0.5">
      <div className={`font-semibold ${deltaColor}`}>{signed}</div>
      <div className="text-gray-400 text-[10px] leading-snug">(to {fmt(proposed)})</div>
    </div>
  );
}

/** Plafond table — Proposed / Current / Superseded limit rows. */
export function PlafondTable({ project }: Props) {
  const p = project.plafond;

  const negativeWarnings: string[] = [];
  if (p.remainingTotal < 0) negativeWarnings.push(`Total Limit Remaining is negative (${fmt(p.remainingTotal)})`);
  if (p.remainingWC < 0) negativeWarnings.push(`WC Sub-Limit Remaining is negative (${fmt(p.remainingWC)})`);
  if (p.remainingPO < 0) negativeWarnings.push(`PO Sub-Limit Remaining is negative (${fmt(p.remainingPO)})`);

  const showProposedDeltas = Boolean(p.proposed && p.current);
  /** First plafond for the brand: proposed limits shown as absolutes (no current to diff against). */
  const showProposedAbsolute = Boolean(p.proposed && !p.current);
  const showBModCols = isAssetB(project.assetClass);
  const wcOutstanding = p.outstandingWC;

  const showRemainingAfterProposed = isAssetB(project.assetClass) || isAssetD(project.assetClass);
  const requestedProjectAmount = project.trancheTargetAmount ?? project.requestedAmount;
  const ccy = project.requestedAmountCurrency;
  /** For B/D, keep Remaining visible on Current row even when Proposed deltas row exists (so “after proposed” sits under it). */
  const hideRemainingOnCurrent = showProposedDeltas && !showRemainingAfterProposed;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        On the <strong className="text-gray-600">Proposed</strong> row, each limit shows the{" "}
        <strong>change</strong> versus current (with <strong className="text-gray-600">+</strong> /{" "}
        <strong className="text-gray-600">−</strong>) and the <strong>proposed ceiling</strong> on the line below as{" "}
        <em>(to Rp …)</em> — or the absolute proposed limits when there is no current plafond yet.{" "}
        <strong className="text-gray-600">Current</strong> and{" "}
        <strong className="text-gray-600">Superseded</strong> rows show absolute limits. Red banners only if a stored
        remaining sub-limit is negative. For <strong className="text-gray-600">Asset B &amp; Asset D</strong>, each
        limit cell also shows <strong className="text-gray-600">Remaining after current proposed</strong> (remaining
        minus this submission&apos;s requested project amount).
        {showBModCols && (
          <>
            {" "}
            <strong className="text-gray-600">Asset B (B_MOD):</strong> WC column uses WC outstanding when provided;
            <strong className="text-gray-600"> Max review date</strong> is shown when set on the limit row.
          </>
        )}
      </p>
      {negativeWarnings.map((w, i) => (
        <Warning key={i} message={w} level="error" />
      ))}

      <div className="overflow-x-auto -mx-1">
        <table
          className={`w-full text-xs border border-gray-100 rounded-lg overflow-hidden ${
            showBModCols ? "min-w-[720px]" : "min-w-[560px]"
          }`}
        >
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-left">
              <th className="py-2 px-3 font-medium w-36">Limit Status</th>
              <th className="py-2 pr-3 font-medium">Total Limit</th>
              <th className="py-2 pr-3 font-medium">PO Sub Limit</th>
              <th className="py-2 pr-3 font-medium">Working Capital Sub Limit</th>
              {showBModCols && (
                <th className="py-2 pr-3 font-medium whitespace-nowrap">Max review date</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {showProposedDeltas && (
              <tr className="bg-purple-50/30">
                <td className="py-3 px-3 font-semibold text-purple-800 align-top">Proposed</td>
                <td className="py-3 pr-3 align-top">
                  <RequestedDeltaCell proposed={p.proposed!.totalLimit} current={p.current!.totalLimit} />
                </td>
                <td className="py-3 pr-3 align-top">
                  <RequestedDeltaCell proposed={p.proposed!.poSubLimit} current={p.current!.poSubLimit} />
                </td>
                <td className="py-3 pr-3 align-top">
                  <RequestedDeltaCell proposed={p.proposed!.wcSubLimit} current={p.current!.wcSubLimit} />
                </td>
                {showBModCols && (
                  <td className="py-3 pr-3 align-top text-gray-700">
                    {p.proposed?.maxReviewDate ? fmtDate(p.proposed.maxReviewDate) : <span className="text-gray-400">—</span>}
                  </td>
                )}
              </tr>
            )}

            {showProposedAbsolute && (
              <tr className="bg-purple-50/30">
                <td className="py-3 px-3 align-top">
                  <div className="font-semibold text-purple-800">Proposed</div>
                  <div className="text-gray-400 text-[11px] mt-0.5">First plafond for this brand</div>
                </td>
                <td className="py-3 pr-3 align-top">
                  <AbsoluteLimitCell limit={p.proposed!.totalLimit} ccy={ccy} />
                </td>
                <td className="py-3 pr-3 align-top">
                  <AbsoluteLimitCell limit={p.proposed!.poSubLimit} ccy={ccy} />
                </td>
                <td className="py-3 pr-3 align-top">
                  <AbsoluteLimitCell limit={p.proposed!.wcSubLimit} ccy={ccy} />
                </td>
                {showBModCols && (
                  <td className="py-3 pr-3 align-top text-gray-700">
                    {p.proposed?.maxReviewDate ? fmtDate(p.proposed.maxReviewDate) : <span className="text-gray-400">—</span>}
                  </td>
                )}
              </tr>
            )}

            {p.current && (
              <tr>
                <td className="py-3 px-3 align-top">
                  <div className="font-semibold text-gray-900">Current</div>
                  <div className={`text-[11px] font-medium mt-0.5 ${p.current.limitStatus === "Active" ? "text-emerald-700" : "text-red-600"}`}>
                    {p.current.limitStatus}
                  </div>
                  <div className="text-gray-500 mt-0.5">
                    {fmtDate(p.current.effectiveDate)} – {fmtDate(p.current.expiryDate)}
                  </div>
                  <div className="text-gray-400 text-[11px]">
                    ({daysFromToday(p.current.expiryDate)} days from today)
                  </div>
                </td>
                <td className="py-3 pr-3 align-top">
                  <AbsoluteLimitCell
                    limit={p.current.totalLimit}
                    outstanding={p.outstandingTotal}
                    remaining={hideRemainingOnCurrent ? null : p.remainingTotal}
                    remainingAfterProposed={
                      showRemainingAfterProposed ? p.remainingTotal - requestedProjectAmount : undefined
                    }
                    ccy={ccy}
                  />
                </td>
                <td className="py-3 pr-3 align-top">
                  <AbsoluteLimitCell
                    limit={p.current.poSubLimit}
                    remaining={hideRemainingOnCurrent ? null : p.remainingPO}
                    remainingAfterProposed={
                      showRemainingAfterProposed ? p.remainingPO - requestedProjectAmount : undefined
                    }
                    ccy={ccy}
                  />
                </td>
                <td className="py-3 pr-3 align-top">
                  <AbsoluteLimitCell
                    limit={p.current.wcSubLimit}
                    outstanding={
                      p.current.wcSubLimit > 0
                        ? showBModCols
                          ? wcOutstanding ?? 0
                          : p.outstandingTotal
                        : undefined
                    }
                    remaining={hideRemainingOnCurrent ? null : p.remainingWC}
                    remainingAfterProposed={
                      showRemainingAfterProposed ? p.remainingWC - requestedProjectAmount : undefined
                    }
                    ccy={ccy}
                  />
                </td>
                {showBModCols && (
                  <td className="py-3 pr-3 align-top text-gray-700">
                    {p.current.maxReviewDate ? fmtDate(p.current.maxReviewDate) : <span className="text-gray-400">—</span>}
                  </td>
                )}
              </tr>
            )}

            {p.superseded.map((s, i) => (
              <tr key={i} className="text-gray-400">
                <td className="py-2 px-3 align-top">
                  <div className="font-medium text-gray-500">Superseded</div>
                  <div className="text-gray-300 text-[11px]">
                    {fmtDate(s.effectiveDate)} – {fmtDate(s.expiryDate)}
                  </div>
                </td>
                <td className="py-2 pr-3 align-top text-xs">{fmt(s.totalLimit)}</td>
                <td className="py-2 pr-3 align-top text-xs">{fmt(s.poSubLimit)}</td>
                <td className="py-2 pr-3 align-top text-xs">{fmt(s.wcSubLimit)}</td>
                {showBModCols && (
                  <td className="py-2 pr-3 align-top text-xs text-gray-300">—</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showProposedDeltas && (
        <p className="text-[10px] text-gray-400">
          After approval: proposed ceilings {fmt(p.proposed!.totalLimit)} total / {fmt(p.proposed!.poSubLimit)} PO /{" "}
          {fmt(p.proposed!.wcSubLimit)} WC. Headroom on proposed line: remaining {fmt(p.remainingTotal)} total,{" "}
          {fmt(p.remainingPO)} PO, {fmt(p.remainingWC)} WC (outstanding {fmt(p.outstandingTotal)}).
        </p>
      )}
    </div>
  );
}

/** Whether the card has any plafond information worth showing. */
export function hasPlafondInfo(project: ICProject): boolean {
  const p = project.plafond;
  return project.approvalType.includes("Plafond") || p.current !== null || p.proposed !== null;
}

/** Project Details section (plafond lives with Financial Reviews). */
export function ProjectDetailsSection({ project }: Props) {
  // Sector display: "Main: Sub" or just "Main" if no sub-sector
  const sectorLabel = project.subSector
    ? `${project.mainSector}: ${project.subSector}`
    : project.mainSector;

  const trancheOrProjectAmount = project.trancheTargetAmount ?? project.requestedAmount;

  // Amount warning logic per CSV:
  // Project type = "Project" → warn if > current plafond
  // Project type includes Plafond → warn if > proposed plafond
  const computedAmountWarning = (() => {
    if (project.amountWarning) return project.amountWarning;
    const isPlafondRequest = project.approvalType.includes("Plafond");
    if (!isPlafondRequest && project.plafond.current) {
      if (trancheOrProjectAmount > project.plafond.current.totalLimit) {
        return "Warning: Requested Project Amount exceeds Current Plafond";
      }
    }
    if (isPlafondRequest && project.plafond.proposed) {
      if (trancheOrProjectAmount > project.plafond.proposed.totalLimit) {
        return "Warning: Requested Project Amount exceeds Proposed Plafond";
      }
    }
    return null;
  })();

  return (
    <SectionCard title="Project Details">
      <div className="mt-2 space-y-0">
        {project.sectorWarning && (
          <Warning message={project.sectorWarning} level="warn" className="mb-3" />
        )}
        {computedAmountWarning && (
          <Warning message={computedAmountWarning} level="warn" className="mb-3" />
        )}

        <DataRow
          label="Sector"
          value={<Tag label={sectorLabel} variant="blue" />}
        />
        <DataRow label="Financing Type" value={<span className="text-gray-800">{project.returnType}</span>} />
        <DataRow
          label="Syariah"
          value={
            project.syariah ? (
              <span className="inline-flex items-center gap-2 flex-wrap">
                <Tag label="Syariah" variant="syariah" />
                {project.syariahNotes && (
                  <span className="text-gray-600">{project.syariahNotes}</span>
                )}
              </span>
            ) : (
              <span className="text-gray-600">No</span>
            )
          }
        />
        <DataRow
          label="Asset Class"
          value={
            <Tag
              label={`Asset Class ${project.assetClass.replace("Asset ", "")}`}
              variant={assetClassVariant(project.assetClass)}
            />
          }
        />
        <DataRow
          label="Financing Use"
          value={<Tag label={project.financingUse} variant="gray" />}
        />
        <DataRow
          label="Requested Project Amount"
          value={
            <span className="font-semibold text-gray-900">
              {fmt(project.trancheTargetAmount ?? project.requestedAmount, project.requestedAmountCurrency)}
            </span>
          }
        />
      </div>
    </SectionCard>
  );
}

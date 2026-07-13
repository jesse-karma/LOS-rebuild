import { Fragment } from "react";
import { ICProject, PastProject } from "@/data/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { Tag, statusVariant } from "@/components/ui/Tag";
import { fmt, fmtDate, fmtPct } from "@/components/ui/DataRow";
import { getPastProjectsRecapRows } from "@/lib/pastProjectsRecap";
import { sortPastProjectsRecapRows } from "@/lib/pastProjectsRecapSort";
import { isAssetB } from "@/lib/assetClass";
import {
  getRecapRowRevShareSnapshot,
  formatMinInvestorReturnPaymentType,
  formatMinReturnMultiple,
  formatMinReturnPayableMonths,
} from "@/lib/revShareTermsComparison";
import {
  effectiveDailyRecap,
  interestTooLow,
  lateFeeBasisWarningAD,
  lateFeeBasisWarningB,
  lateFeeDailyAsnWarningAD,
  lateFeeDailyAsnWarningB,
  lateFeeDailyInvestorWarningAD,
  lateFeeDailyInvestorWarningB,
  lateFeeGraceWarningAD,
  lateFeeGraceWarningB,
  minInterestMismatch,
  pvaClass,
  rowBRecapKind,
  serviceTooLow,
  termDaysTooLong,
} from "@/lib/bRecapRules";

interface Props {
  project: ICProject;
}

/**
 * Spec (A&D card, "Proposed Project"): transposed recap — one column per project
 * (Proposed to the far left), metric rows grouped A–F. Proposed column reads the
 * live project; historical columns read what each row stored at its IC time.
 */
function ADGroupedRecapTable({ project, projects }: { project: ICProject; projects: PastProject[] }) {
  const isLiveRow = (p: PastProject) => Boolean(p.isCurrentSubmission) || p.status === "Proposed";
  const proposedIdx = projects.findIndex(isLiveRow);
  const dash = <span className="text-gray-300">—</span>;

  const rst = project.revenueShareTerms;
  const frt = project.fixedReturnTerms;

  const lateFeeCell = (lf: {
    basis: string;
    gracePeriodDays: number;
    dailyPctInvestors: number;
    dailyPctASN: number;
  }) => (
    <div className="leading-snug">
      <div>
        {fmtPct(lf.dailyPctInvestors)} / day to Investors · {fmtPct(lf.dailyPctASN)} / day to ASN
      </div>
      <div className="text-gray-500 text-[10px] mt-0.5">
        Basis: {lf.basis} · Grace: {lf.gracePeriodDays} days
      </div>
    </div>
  );

  const groups: Array<{
    title: string | null;
    rows: Array<{ label: string; cell: (p: PastProject) => React.ReactNode }>;
  }> = [
    {
      title: null,
      rows: [
        {
          label: "Calculator",
          cell: (p) =>
            isLiveRow(p) && project.financialsLink ? (
              <a
                href={project.financialsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Open calculator
              </a>
            ) : (
              dash
            ),
        },
      ],
    },
    {
      title: "A — Identity & Structure",
      rows: [
        {
          label: "Financing Type",
          cell: (p) => {
            const fixedWarn = p.returnType === "Fixed Return" && p.projectedTermMonths > 36;
            return (
              <div>
                <div>
                  {isLiveRow(p) && project.masterReturnType
                    ? project.masterReturnType
                    : returnTypeLabel(p.returnType)}
                </div>
                {fixedWarn && (
                  <div className="mt-0.5 text-[9px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 inline-block">
                    Warning: &gt;{p.projectedTermMonths > 60 ? 60 : 36} months on Fixed Return
                  </div>
                )}
              </div>
            );
          },
        },
        { label: "Asset Type", cell: (p) => (isLiveRow(p) ? `Asset ${project.assetClass}` : dash) },
        { label: "Financing Use", cell: (p) => (isLiveRow(p) ? project.financingUse : dash) },
        {
          label: "PT (Legal Entity)",
          cell: (p) => (isLiveRow(p) ? project.ptDetails[0]?.name || dash : dash),
        },
        { label: "Amount Disbursed", cell: (p) => <span className="font-medium">{fmt(p.amount)}</span> },
        {
          label: "Principal Outstanding",
          cell: (p) => (p.outstandingAmount > 0 ? fmt(p.outstandingAmount) : dash),
        },
      ],
    },
    {
      title: "B — Return Structure",
      rows: [
        {
          label: "Revenue Share %",
          cell: (p) => {
            const s = getRecapRowRevShareSnapshot(project, p);
            if (!s) return dash;
            return (
              <div>
                <div>{fmtPct(s.preBEPRevSharePct)} Pre-BEP</div>
                <div>{fmtPct(s.postBEPRevSharePct)} Post-BEP</div>
              </div>
            );
          },
        },
        {
          label: "Cap",
          cell: (p) => {
            const s = getRecapRowRevShareSnapshot(project, p);
            if (!s) return dash;
            if (s.capType === "Return Cap" && s.capMultiple != null)
              return `${s.capMultiple}x Investor Return Cap`;
            if (s.capType === "Time Cap" && s.capTimePeriodMonths != null)
              return `${s.capTimePeriodMonths} month Time Cap`;
            return dash;
          },
        },
        {
          label: "Revenue Share Start",
          cell: (p) =>
            isLiveRow(p) && rst
              ? rst.revShareStartType === "Fixed" && rst.revShareStartDate
                ? `Fixed: ${fmtDate(rst.revShareStartDate)}`
                : "Anchored to Branch Opening"
              : dash,
        },
        {
          label: "Fixed Amount / Repayment",
          cell: (p) => {
            if (!isLiveRow(p) || !frt) return dash;
            return (
              <div>
                <div className="font-medium">{fmt(frt.totalRepayment)} total</div>
                <div className="text-gray-500 text-[10px]">
                  {frt.repaymentSchedule.length} months · {fmt(frt.totalPrincipal)} principal ·{" "}
                  {fmt(frt.totalInterest)} interest
                </div>
              </div>
            );
          },
        },
        {
          label: "Target Carry",
          cell: (p) => (isLiveRow(p) && rst ? `${fmtPct(rst.carryPct)} ${rst.carryType}` : dash),
        },
      ],
    },
    {
      title: "C — Timeline & Operation",
      rows: [
        {
          label: "Tenor / Term",
          cell: (p) => (
            <div>
              {p.otfTermMonths != null && <div className="font-medium">{p.otfTermMonths} months OTF</div>}
              <div className={p.otfTermMonths != null ? "text-gray-400" : ""}>
                {p.projectedTermMonths} months{p.otfTermMonths != null ? " original" : ""}
              </div>
            </div>
          ),
        },
        {
          label: "Branch Opening",
          cell: (p) => {
            if (!isLiveRow(p)) return dash;
            const opening = project.branches.filter((b) => b.type === "Opening Branch");
            if (opening.length === 0) return dash;
            return (
              <div className="leading-snug">
                {opening.map((b) => (
                  <div key={b.id}>
                    {b.name}
                    {b.area ? ` (${b.area})` : ""}
                  </div>
                ))}
              </div>
            );
          },
        },
      ],
    },
    {
      title: "D — Performance Metrics",
      rows: [
        {
          label: "PvA",
          cell: (p) =>
            p.pvaPct != null ? (
              <span className={pvaTextClass(pvaClass(p.pvaPct))}>{fmtPct(p.pvaPct)}</span>
            ) : (
              <span className="text-gray-300 text-[10px]">N/A from LMS</span>
            ),
        },
        {
          label: "IRR",
          cell: (p) => (
            <div>
              {p.otfIRR !== null && <div className={irrClass(p.otfIRR)}>{fmtPct(p.otfIRR)} OTF</div>}
              <div
                className={`${irrClass(p.projectedIRR)} ${
                  p.otfIRR !== null ? "text-gray-400 font-normal" : ""
                }`}
              >
                {fmtPct(p.projectedIRR)} {p.otfIRR !== null ? "original" : "projected"}
              </div>
            </div>
          ),
        },
        {
          label: "MOIC",
          cell: (p) => (
            <div>
              <div className="text-gray-300 text-[10px]">OTF: N/A from LMS</div>
              <div>{p.projectedMOIC} projected</div>
            </div>
          ),
        },
        {
          label: "BEP",
          cell: (p) =>
            p.projectedBEPMonths > 0 ? (
              <span className={p.projectedBEPMonths > 30 ? "text-amber-600 font-medium" : ""}>
                Month {p.projectedBEPMonths}
                {p.projectedBEPMonths > 30 && " ⚠️ >30"}
              </span>
            ) : (
              dash
            ),
        },
        {
          label: "Minimum Return",
          cell: (p) => {
            const s = getRecapRowRevShareSnapshot(project, p);
            if (!s || s.minReturn == null) return dash;
            return `${formatMinInvestorReturnPaymentType(s)} ${formatMinReturnMultiple(
              s
            )} at ${formatMinReturnPayableMonths(s)}`;
          },
        },
        {
          label: "DPD",
          cell: (p) => (
            <div>
              {p.currentDPD > 0 && <div className="text-red-600 font-semibold">{p.currentDPD} days now</div>}
              {p.maxDPD > 0 ? (
                <div className={p.maxDPD > 30 ? "text-red-600 font-medium" : "text-amber-600"}>
                  {p.maxDPD} days max
                </div>
              ) : p.currentDPD === 0 ? (
                dash
              ) : null}
              {p.overdueHistory && p.overdueHistory.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {p.overdueHistory.map((ev, i) => (
                    <div key={i} className="text-[10px] text-gray-500">
                      {fmtDate(ev.dueDate)} — {ev.daysOverdue}d —{" "}
                      <span className={ev.status === "Unpaid" ? "text-red-600 font-medium" : "text-gray-400"}>
                        {ev.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ),
        },
      ],
    },
    {
      title: "E — Revenue Model",
      rows: [
        {
          label: "Revenue Projection",
          cell: (p) => {
            if (!isLiveRow(p) || !rst || rst.revProjectionArray.length === 0) return dash;
            const arr = rst.revProjectionArray;
            const avg = arr.reduce((s, r) => s + r.revenue, 0) / arr.length;
            const peak = arr.reduce((a, b) => (b.revenue > a.revenue ? b : a));
            const floor = arr.reduce((a, b) => (b.revenue < a.revenue ? b : a));
            return (
              <div className="leading-snug text-[10px] text-gray-600">
                <div>Avg/month {fmt(Math.round(avg))}</div>
                <div>
                  Peak (Month {peak.month}) {fmt(peak.revenue)}
                </div>
                <div>
                  Floor (Month {floor.month}) {fmt(floor.revenue)}
                </div>
                <div>{arr.length}-month span</div>
              </div>
            );
          },
        },
        {
          label: "Source of Revenue Accrued",
          cell: (p) =>
            isLiveRow(p) && rst ? <span className="leading-snug">{rst.sourceOfRevenueAccrued}</span> : dash,
        },
      ],
    },
    {
      title: "F — Payment Mechanics",
      rows: [
        {
          label: "Payment Frequency",
          cell: (p) =>
            isLiveRow(p) && rst
              ? `${rst.frequency}${rst.dueDate && rst.dueDate !== "—" ? `, ${rst.dueDate}` : ""}`
              : dash,
        },
        {
          label: "Late Fee",
          cell: (p) => {
            if (isLiveRow(p)) return lateFeeCell(project.lateFee);
            if (p.lateFeeRecap) return lateFeeCell(p.lateFeeRecap);
            return dash;
          },
        },
      ],
    },
  ];

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs min-w-[760px]">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="sticky left-0 z-10 bg-white py-2 pl-3 pr-2 font-medium w-44 border-r border-gray-100">
              Metric
            </th>
            {projects.map((p, j) => (
              <th
                key={p.id}
                className={`py-2 px-3 font-medium align-top min-w-[170px] max-w-[240px] ${
                  j === proposedIdx ? "bg-blue-50/60" : ""
                }`}
              >
                <div className="text-gray-800 leading-snug" title={p.projectName}>
                  {p.projectName}
                </div>
                <div className="mt-1">
                  <Tag label={p.status} variant={statusVariant(p.status)} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.title ?? "top"}>
              {g.title && (
                <tr className="border-b border-gray-100">
                  <td className="sticky left-0 z-10 bg-gray-50 py-1.5 pl-3 pr-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-100 whitespace-nowrap">
                    {g.title}
                  </td>
                  <td colSpan={projects.length} className="bg-gray-50"></td>
                </tr>
              )}
              {g.rows.map((row) => (
                <tr key={row.label} className="border-b border-gray-50 align-top">
                  <td className="sticky left-0 z-10 bg-white py-2 pl-3 pr-2 text-gray-500 border-r border-gray-100 leading-snug">
                    {row.label}
                  </td>
                  {projects.map((p, j) => (
                    <td
                      key={p.id}
                      className={`py-2 px-3 text-gray-800 leading-snug ${
                        j === proposedIdx ? "bg-blue-50/40" : ""
                      }`}
                    >
                      {row.cell(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function irrClass(irr: number | null): string {
  if (irr === null) return "text-gray-400";
  if (irr < 15) return "text-red-600 font-semibold";
  if (irr < 20) return "text-amber-600 font-semibold";
  return "text-emerald-700 font-semibold";
}

function returnTypeLabel(rt: string): string {
  const map: Record<string, string> = {
    "Revenue Share (Time-Capped)": "Revenue Share (Time-Capped)",
    "Revenue Share (Return-Capped)": "Revenue Share (Return-Capped)",
    "Fixed Return": "Fixed Return",
    "Daily Interest": "Daily Interest",
  };
  return map[rt] ?? rt;
}

function pvaTextClass(kind: "red" | "amber" | "green" | "muted"): string {
  if (kind === "red") return "text-red-600 font-semibold";
  if (kind === "amber") return "text-amber-600 font-semibold";
  if (kind === "green") return "text-emerald-700 font-semibold";
  return "text-gray-300";
}

function warnLine(text: string, key: string) {
  return (
    <div key={key} className="text-[9px] text-red-600 font-medium leading-tight mt-0.5">
      {text}
    </div>
  );
}

function AssetBRecapTable({ project, projects }: { project: ICProject; projects: PastProject[] }) {
  const totalAmountInclProposed = projects.reduce((s, p) => s + p.amount, 0);
  const totalOutstandingExclProposed = projects
    .filter((p) => p.status !== "Proposed")
    .reduce((s, p) => s + p.outstandingAmount, 0);
  const totalOutstandingInclProposed =
    totalOutstandingExclProposed +
    projects.filter((p) => p.status === "Proposed").reduce((s, p) => s + p.amount, 0);

  const termMonthsAvg =
    projects.length > 0
      ? projects.reduce((s, p) => {
          const daily = effectiveDailyRecap(project, p);
          if (daily) return s + daily.tenorDays / 30;
          return s + p.projectedTermMonths;
        }, 0) / projects.length
      : 0;

  const completedWithIRR = projects.filter((p) => p.otfIRR !== null);
  const avgIRR =
    completedWithIRR.length > 0
      ? completedWithIRR.reduce((s, p) => s + (p.otfIRR ?? 0), 0) / completedWithIRR.length
      : null;

  const statusCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const kindCounts: Record<string, number> = {};
  projects.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
    typeCounts[returnTypeLabel(p.returnType)] = (typeCounts[returnTypeLabel(p.returnType)] ?? 0) + 1;
    kindCounts[rowBRecapKind(p, project)] = (kindCounts[rowBRecapKind(p, project)] ?? 0) + 1;
  });

  return (
    <>
      <p className="text-xs text-gray-500 leading-relaxed">
        <strong>B_MOD layout</strong> (Asset B): wide recap per IC Review Card spec — project type, payors, daily-interest
        economics, late-fee checks (B-I/B-PO vs older A/D rows), PvA where applicable. Rows sorted by status, then IC
        approval date (newest first).
      </p>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[10px] min-w-[1280px]">
          <thead>
            <tr className="border-b text-gray-400 text-left">
              <th className="pb-2 pr-1 font-medium w-6">#</th>
              <th className="pb-2 pr-2 font-medium min-w-[120px]">Project</th>
              <th className="pb-2 pr-2 font-medium">Status</th>
              <th className="pb-2 pr-2 font-medium">Financing</th>
              <th className="pb-2 pr-2 font-medium text-right">Amount</th>
              <th className="pb-2 pr-2 font-medium text-right">Outstd.</th>
              <th className="pb-2 pr-2 font-medium">Type</th>
              <th className="pb-2 pr-2 font-medium min-w-[72px]">Payor(s)</th>
              <th className="pb-2 pr-2 font-medium text-right">Term</th>
              <th className="pb-2 pr-2 font-medium text-right">Min int (d)</th>
              <th className="pb-2 pr-2 font-medium text-right">Int 30d</th>
              <th className="pb-2 pr-2 font-medium text-right">Svc 30d</th>
              <th className="pb-2 pr-2 font-medium">Late basis</th>
              <th className="pb-2 pr-2 font-medium text-right">Grace</th>
              <th className="pb-2 pr-2 font-medium min-w-[88px]">Daily late</th>
              <th className="pb-2 pr-2 font-medium text-right">DPD</th>
              <th className="pb-2 pr-2 font-medium text-right">PvA</th>
              <th className="pb-2 pr-2 font-medium text-right">IRR</th>
              <th className="pb-2 font-medium text-right min-w-[88px]">MOIC / BEP</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => (
              <AssetBRow key={p.id} project={project} p={p} index={i + 1} />
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-[10px]">
            <tr>
              <td className="pt-2 pr-1"></td>
              <td className="pt-2 pr-2 text-gray-500 font-medium">
                {Object.entries(statusCounts)
                  .map(([s, n]) => `${n} ${s}`)
                  .join(", ")}
              </td>
              <td className="pt-2 pr-2"></td>
              <td className="pt-2 pr-2 text-gray-500">
                {Object.entries(typeCounts)
                  .map(([t, n]) => `${n}× ${t}`)
                  .join(", ")}
              </td>
              <td className="pt-2 pr-2 text-right font-medium text-gray-700">{fmt(totalAmountInclProposed)}</td>
              <td className="pt-2 pr-2 text-right">
                <div className="font-medium text-gray-700">{fmt(totalOutstandingExclProposed)}</div>
                <div className="text-gray-400 text-[9px]">excl. proposed</div>
                <div className="font-medium text-gray-600 mt-0.5">{fmt(totalOutstandingInclProposed)}</div>
                <div className="text-gray-400 text-[9px]">incl. proposed</div>
              </td>
              <td className="pt-2 pr-2 text-gray-500">{Object.entries(kindCounts).map(([k, n]) => `${n}× ${k}`).join(", ")}</td>
              <td className="pt-2 pr-2"></td>
              <td className="pt-2 pr-2 text-right text-gray-500">{termMonthsAvg.toFixed(1)} mo eq.</td>
              <td className="pt-2 pr-2 text-right text-gray-300">—</td>
              <td className="pt-2 pr-2 text-right text-gray-300">—</td>
              <td className="pt-2 pr-2 text-right text-gray-300">—</td>
              <td className="pt-2 pr-2"></td>
              <td className="pt-2 pr-2"></td>
              <td className="pt-2 pr-2"></td>
              <td className="pt-2 pr-2 text-right text-gray-300">—</td>
              <td className="pt-2 pr-2 text-right text-gray-300">—</td>
              <td className="pt-2 pr-2 text-right">
                {avgIRR !== null ? (
                  <span className={irrClass(avgIRR)}>{fmtPct(avgIRR)} avg (OTF)</span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="pt-2 text-right text-gray-400 text-[9px]">OTF MOIC N/A</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function AssetBRow({ project, p, index }: { project: ICProject; p: PastProject; index: number }) {
  const isProposed = p.status === "Proposed";
  const kind = rowBRecapKind(p, project);
  const daily = effectiveDailyRecap(project, p);
  const late = p.lateFeeRecap;

  const payorStr = p.payors?.length ? p.payors.join(", ") : "—";

  const termCell = () => {
    if (kind === "A/D") {
      const longOtf = p.otfTermMonths != null && p.otfTermMonths > 60;
      return (
        <div>
          {p.otfTermMonths != null && (
            <div className={longOtf ? "text-amber-600 font-semibold" : ""}>
              {p.otfTermMonths} mo OTF{longOtf ? " ⚠️ >60 mo" : ""}
            </div>
          )}
          <div className="text-gray-500">{p.projectedTermMonths} mo projected</div>
        </div>
      );
    }
    if (daily) {
      const tooLong = termDaysTooLong(daily.tenorDays);
      return (
        <div className={tooLong ? "text-red-600 font-semibold" : "text-gray-700"}>
          {daily.tenorDays} days
          {tooLong ? " ⚠️ >365d" : ""}
        </div>
      );
    }
    return (
      <div>
        {p.otfTermMonths != null && <div>{p.otfTermMonths} mo OTF</div>}
        <div className="text-gray-500">{p.projectedTermMonths} mo</div>
      </div>
    );
  };

  const minIntCell = () => {
    if (!daily || kind === "A/D") return <span className="text-gray-300">—</span>;
    const bad = minInterestMismatch(daily);
    return (
      <div className={bad ? "text-red-600 font-semibold" : "text-gray-700"}>
        {daily.minInterestPeriodDays}
        {bad ? " ⚠️ ≠ tenor/2" : ""}
      </div>
    );
  };

  const int30Cell = () => {
    if (!daily || kind === "A/D") return <span className="text-gray-300">—</span>;
    const iWarn = interestTooLow(kind, daily.interestRate30DayPct);
    return (
      <div>
        <div className={iWarn ? "text-red-600 font-semibold" : "text-gray-700"}>{fmtPct(daily.interestRate30DayPct)}</div>
        {iWarn && warnLine(iWarn, "iw")}
      </div>
    );
  };

  const svc30Cell = () => {
    if (!daily || kind === "A/D") return <span className="text-gray-300">—</span>;
    const sWarn = serviceTooLow(kind, daily.serviceFee30DayPct);
    return (
      <div>
        <div className={sWarn ? "text-red-600 font-semibold" : "text-gray-700"}>{fmtPct(daily.serviceFee30DayPct)}</div>
        {sWarn && warnLine(sWarn, "sw")}
      </div>
    );
  };

  const lateBlock = () => {
    if (daily && (kind === "B-I" || kind === "B-PO")) {
      const w: string[] = [];
      const b1 = lateFeeBasisWarningB(kind, daily.lateFeeBasis);
      const g1 = lateFeeGraceWarningB(kind, daily.gracePeriodDays);
      const d1 = lateFeeDailyInvestorWarningB(daily);
      const d2 = lateFeeDailyAsnWarningB(daily);
      if (b1) w.push(b1);
      if (g1) w.push(g1);
      if (d1) w.push(d1);
      if (d2) w.push(d2);
      return (
        <div className="space-y-0.5">
          <div className="text-gray-700">{daily.lateFeeBasis}</div>
          <div className="text-gray-500">{daily.gracePeriodDays}d grace</div>
          <div className="text-gray-600 leading-tight">
            {fmtPct(daily.dailyPctInvestors)} inv / {fmtPct(daily.dailyPctASN)} ASN / day
          </div>
          {w.map((t, i) => warnLine(t, `lw-${i}`))}
        </div>
      );
    }
    if (kind === "A/D" && late) {
      const w: string[] = [];
      const b = lateFeeBasisWarningAD(late.basis);
      const g = lateFeeGraceWarningAD(late.gracePeriodDays);
      const d1 = lateFeeDailyInvestorWarningAD(late.dailyPctInvestors);
      const d2 = lateFeeDailyAsnWarningAD(late.dailyPctASN);
      if (b) w.push(b);
      if (g) w.push(g);
      if (d1) w.push(d1);
      if (d2) w.push(d2);
      return (
        <div className="space-y-0.5">
          <div className="text-gray-700">{late.basis}</div>
          <div className="text-gray-500">{late.gracePeriodDays}d grace</div>
          <div className="text-gray-600 leading-tight">
            {fmtPct(late.dailyPctInvestors)} inv / {fmtPct(late.dailyPctASN)} ASN / day
          </div>
          {w.map((t, i) => warnLine(t, `ad-${i}`))}
        </div>
      );
    }
    if (late) {
      return (
        <div className="text-gray-600 leading-tight">
          {late.basis} · {late.gracePeriodDays}d · {fmtPct(late.dailyPctInvestors)} / {fmtPct(late.dailyPctASN)}
        </div>
      );
    }
    return <span className="text-gray-300">—</span>;
  };

  const graceCell = () => {
    if (daily && (kind === "B-I" || kind === "B-PO")) {
      return <span className={lateFeeGraceWarningB(kind, daily.gracePeriodDays) ? "text-red-600 font-semibold" : ""}>{daily.gracePeriodDays}</span>;
    }
    if (late) return <span>{late.gracePeriodDays}</span>;
    return <span className="text-gray-300">—</span>;
  };

  const basisShort = () => {
    if (daily && (kind === "B-I" || kind === "B-PO")) {
      const b = lateFeeBasisWarningB(kind, daily.lateFeeBasis);
      return <span className={b ? "text-red-600 font-semibold" : "text-gray-700"}>{daily.lateFeeBasis}</span>;
    }
    if (late) {
      const b = kind === "A/D" ? lateFeeBasisWarningAD(late.basis) : null;
      return <span className={b ? "text-red-600 font-semibold" : "text-gray-700"}>{late.basis}</span>;
    }
    return <span className="text-gray-300">—</span>;
  };

  const pvaCell = () => {
    if (kind !== "A/D") return <span className="text-gray-300 text-[9px]">N/A</span>;
    if (p.pvaPct == null) return <span className="text-gray-300">—</span>;
    const pc = pvaClass(p.pvaPct);
    return <span className={pvaTextClass(pc)}>{fmtPct(p.pvaPct)}</span>;
  };

  const irrCell = () => {
    const showOtf = p.otfIRR !== null;
    return (
      <div>
        {showOtf && <div className={irrClass(p.otfIRR)}>{fmtPct(p.otfIRR!)} OTF</div>}
        <div className={`${irrClass(p.projectedIRR)} ${showOtf ? "text-gray-500 font-normal" : ""}`}>
          {fmtPct(p.projectedIRR)} {showOtf ? "orig." : "proj."}
        </div>
      </div>
    );
  };

  const moicCell = () => {
    const bepWarn = p.projectedBEPMonths > 30;
    return (
      <div>
        <div className="text-gray-300 text-[9px]">OTF MOIC: N/A</div>
        <div className="text-gray-600">{p.projectedMOIC} proj.</div>
        <div className={`text-[9px] mt-0.5 ${bepWarn ? "text-amber-600" : "text-gray-500"}`}>
          BEP mo {p.projectedBEPMonths}
          {bepWarn ? " ⚠️ >30" : ""}
        </div>
      </div>
    );
  };

  const ftWarning =
    kind === "A/D" && p.returnType === "Fixed Return" && p.projectedTermMonths > 60
      ? "long fixed"
      : kind === "A/D" && p.returnType === "Fixed Return" && p.projectedTermMonths > 36
      ? "fixed >36"
      : null;

  return (
    <tr className={`border-b border-gray-50 align-top ${isProposed ? "bg-blue-50/40" : ""}`}>
      <td className="py-2 pr-1 text-gray-400">{index}</td>
      <td className="py-2 pr-2 text-gray-800 font-medium min-w-[120px] leading-snug">{p.projectName}</td>
      <td className="py-2 pr-2">
        <Tag label={p.status} variant={statusVariant(p.status)} />
      </td>
      <td className="py-2 pr-2 text-gray-600">
        <div>{returnTypeLabel(p.returnType)}</div>
        {ftWarning && (
          <div className="mt-0.5 text-[9px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5">
            {ftWarning === "long fixed" ? "Warning: >60 mo" : "Warning: >36 mo Fixed Return"}
          </div>
        )}
      </td>
      <td className="py-2 pr-2 text-right text-gray-700">{fmt(p.amount)}</td>
      <td className="py-2 pr-2 text-right text-gray-700">
        {p.outstandingAmount > 0 ? fmt(p.outstandingAmount) : <span className="text-gray-300">—</span>}
      </td>
      <td className="py-2 pr-2">
        <span className="inline-flex px-1 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">{kind}</span>
      </td>
      <td className="py-2 pr-2 text-gray-600 leading-snug">{payorStr}</td>
      <td className="py-2 pr-2 text-right">{termCell()}</td>
      <td className="py-2 pr-2 text-right">{minIntCell()}</td>
      <td className="py-2 pr-2 text-right align-top">{int30Cell()}</td>
      <td className="py-2 pr-2 text-right align-top">{svc30Cell()}</td>
      <td className="py-2 pr-2 align-top">{basisShort()}</td>
      <td className="py-2 pr-2 text-right align-top">{graceCell()}</td>
      <td className="py-2 pr-2 align-top">{lateBlock()}</td>
      <td className="py-2 pr-2 text-right align-top">
        {p.currentDPD > 0 && <div className="text-red-600 font-semibold">{p.currentDPD}d now</div>}
        {p.maxDPD > 0 && (
          <div className={p.maxDPD > 30 ? "text-red-600 font-medium" : "text-amber-600"}>{p.maxDPD}d max</div>
        )}
        {p.currentDPD === 0 && p.maxDPD === 0 && <span className="text-gray-300">—</span>}
        {p.overdueHistory && p.overdueHistory.length > 0 && (
          <div className="mt-1 space-y-0.5 text-left">
            {p.overdueHistory.map((ev, i) => (
              <div key={i} className="text-[9px] text-gray-500">
                {fmtDate(ev.dueDate)} — {ev.daysOverdue}d —{" "}
                <span className={ev.status === "Unpaid" ? "text-red-600 font-medium" : "text-gray-400"}>{ev.status}</span>
              </div>
            ))}
          </div>
        )}
      </td>
      <td className="py-2 pr-2 text-right">{pvaCell()}</td>
      <td className="py-2 pr-2 text-right">{irrCell()}</td>
      <td className="py-2 text-right">{moicCell()}</td>
    </tr>
  );
}

export function PastProjectsRecap({ project }: Props) {
  const allRows = project.pastProjects;
  const projects = sortPastProjectsRecapRows(getPastProjectsRecapRows(allRows));
  const useAssetBTable = isAssetB(project.assetClass);

  const totalAmountInclProposed = projects.reduce((s, p) => s + p.amount, 0);
  const totalOutstandingExclProposed = projects
    .filter((p) => p.status !== "Proposed")
    .reduce((s, p) => s + p.outstandingAmount, 0);
  const totalOutstandingInclProposed =
    totalOutstandingExclProposed +
    projects.filter((p) => p.status === "Proposed").reduce((s, p) => s + p.amount, 0);

  const completedWithIRR = projects.filter((p) => p.otfIRR !== null);
  const avgIRR =
    completedWithIRR.length > 0
      ? completedWithIRR.reduce((s, p) => s + (p.otfIRR ?? 0), 0) / completedWithIRR.length
      : null;

  const statusCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  projects.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
    typeCounts[returnTypeLabel(p.returnType)] = (typeCounts[returnTypeLabel(p.returnType)] ?? 0) + 1;
  });

  return (
    <SectionCard title="Proposed and Past Projects Recap Table">
      <div className="mt-2 space-y-3">
        {!useAssetBTable && (
          <p className="text-xs text-gray-500 leading-relaxed">
            Includes the <strong>Proposed</strong> row for <em>this</em> submission alongside other projects for the KP.
            Rows are sorted by status (Proposed, in-queue statuses, Active, then Completed), then by{" "}
            <strong>IC approval date</strong> newest first.
          </p>
        )}
        {projects.length === 0 ? (
          <p className="text-sm text-gray-400 italic px-1">No projects in this recap yet.</p>
        ) : useAssetBTable ? (
          <AssetBRecapTable project={project} projects={projects} />
        ) : (
          <>
            {/* Project Recap summary (spec: totals, avg IRR, project mix) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { label: "Total Amount (Incl. Proposed)", value: fmt(totalAmountInclProposed) },
                { label: "Total Outstanding (Incl. Proposed)", value: fmt(totalOutstandingInclProposed) },
                { label: "Outstanding (Excl. Proposed)", value: fmt(totalOutstandingExclProposed) },
                { label: "Avg of IRR", value: avgIRR !== null ? fmtPct(avgIRR) : "—" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                  <div className="text-[10px] text-gray-500">{s.label}</div>
                  <div className="text-sm font-semibold text-gray-800 mt-0.5">{s.value}</div>
                </div>
              ))}
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-500">Project Mix</div>
                <div className="text-[11px] text-gray-700 mt-0.5 leading-snug">
                  <div>
                    {Object.entries(statusCounts)
                      .map(([s, n]) => `${n}× ${s}`)
                      .join(" · ")}
                  </div>
                  <div className="text-gray-500">
                    {Object.entries(typeCounts)
                      .map(([t, n]) => `${n}× ${t}`)
                      .join(" · ")}
                  </div>
                </div>
              </div>
            </div>

            <ADGroupedRecapTable project={project} projects={projects} />
          </>
        )}

        <p className="text-xs text-gray-400 italic">
          ⚠️ OTF MOIC and PvA are not currently available from the LMS Reporting Layer.
        </p>
      </div>
    </SectionCard>
  );
}


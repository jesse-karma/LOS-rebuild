import { Fragment } from "react";
import { ICProject, PastProject } from "@/data/types";
import { SubmissionFormData } from "@/lib/submissionsStore";
import { SectionCard } from "@/components/ui/SectionCard";
import { Tag, statusVariant } from "@/components/ui/Tag";
import { fmt, fmtDate, fmtPct } from "@/components/ui/DataRow";
import { getPastProjectsRecapRows } from "@/lib/pastProjectsRecap";
import { sortPastProjectsRecapRows } from "@/lib/pastProjectsRecapSort";
import { isAssetB } from "@/lib/assetClass";
import {
  getRecapRowRevShareSnapshot,
  getRecapRowFixedAmountSnapshot,
  formatMinInvestorReturnPaymentType,
  formatMinReturnMultiple,
  formatMinReturnPayableMonths,
  previousProjectOfSameType,
} from "@/lib/revShareTermsComparison";
import {
  cohortHasDaily,
  cohortHasFixedOrDaily,
  cohortMixesFixedAndDaily,
  effectiveDailyRecap,
  fixedOrDailyCarryInfo,
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
  termDaysTooLong,
} from "@/lib/bRecapRules";

function isRevShareReturnType(returnType: string): boolean {
  return returnType.includes("Revenue Share") || returnType === "Profit Share";
}

function cohortHasRevShare(projects: PastProject[]): boolean {
  return projects.some((p) => isRevShareReturnType(p.returnType));
}

/** Live inputs for the Proposed column, wired to the submission form's own state — passed only
 *  by SubmissionForm.tsx. Everywhere else (IC review, KP brand page) this is omitted and every
 *  column, including Proposed, renders read-only. */
export interface EditableProposedContext {
  form: SubmissionFormData;
  set: <K extends keyof SubmissionFormData>(key: K, value: SubmissionFormData[K]) => void;
}

const editCellInputCls =
  "w-full border border-gray-200 rounded px-1.5 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white";

function EditNumber({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      step="any"
      inputMode="decimal"
      className={editCellInputCls}
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      placeholder={placeholder}
    />
  );
}

/** Small gray caption under a row label — used throughout for the reference's field-level notes. */
function RowCaption({ text }: { text: string }) {
  return <div className="text-[9px] text-gray-400 font-normal normal-case leading-tight mt-0.5">{text}</div>;
}

interface Props {
  project: ICProject;
  editableProposed?: EditableProposedContext;
}

/** "Scheduled: {date}" alone, or "Actual: {date}" + "Scheduled: {date}" + a days early/late diff. */
function branchOpeningText(scheduledDate: string, actualDate: string | null | undefined): React.ReactNode {
  if (!actualDate) {
    return <div>Scheduled: {fmtDate(scheduledDate)}</div>;
  }
  const diffDays = Math.round(
    (new Date(actualDate).getTime() - new Date(scheduledDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const diffLabel = diffDays === 0 ? "On schedule" : diffDays > 0 ? `${diffDays}d late` : `${-diffDays}d early`;
  return (
    <div className="leading-snug">
      <div>Actual: {fmtDate(actualDate)}</div>
      <div className="text-gray-500 text-[10px]">Scheduled: {fmtDate(scheduledDate)}</div>
      <div className={diffDays > 0 ? "text-amber-600 text-[10px]" : "text-gray-500 text-[10px]"}>{diffLabel}</div>
    </div>
  );
}

/**
 * Spec (A&D card, "Proposed Project"): transposed recap — one column per project
 * (Proposed to the far left), metric rows grouped A–F. Proposed column reads the
 * live project; historical columns read what each row stored at its IC time.
 */
function ADGroupedRecapTable({
  project,
  projects,
  editableProposed,
}: {
  project: ICProject;
  projects: PastProject[];
  editableProposed?: EditableProposedContext;
}) {
  const isLiveRow = (p: PastProject) => Boolean(p.isCurrentSubmission) || p.status === "Proposed";
  const proposedIdx = projects.findIndex(isLiveRow);
  const dash = <span className="text-gray-300">—</span>;

  const rst = project.revenueShareTerms;
  const frt = project.fixedReturnTerms;

  // Mirrors SubmissionForm.tsx's own wantsRevShare/wantsFixed gating, evaluated against the live
  // form state rather than `project.revenueShareTerms` — the latter is only built once a field is
  // non-zero, but the input itself must appear from the first keystroke.
  const ef = editableProposed;
  const wantsRevShareEdit = ef
    ? ef.form.returnType.includes("Revenue Share") || ef.form.returnType === "Profit Share"
    : false;

  // Baseline for the "different from previous project of the same Financing Type" warnings.
  const prevProject = previousProjectOfSameType(project, projects);
  const prevSnapshot = prevProject ? getRecapRowRevShareSnapshot(project, prevProject) : null;
  const differsWarning = (
    <div className="mt-0.5 text-[9px] text-red-700 bg-red-50 border border-red-200 rounded px-1 py-0.5 inline-block">
      Warning: Different from previous project of the same Financing Type
    </div>
  );

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

  const hasRevShare = cohortHasRevShare(projects);
  const hasFixedOrDaily = cohortHasFixedOrDaily(projects);
  const mixesFixedAndDaily = cohortMixesFixedAndDaily(projects);

  const groups: Array<{
    title: string | null;
    rows: Array<{
      label: string;
      sublabel?: string;
      warning?: string;
      hidden?: boolean;
      cell: (p: PastProject) => React.ReactNode;
    }>;
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
          label: "Financing type",
          cell: (p) => {
            const fixedReturnLongWarn = p.returnType === "Fixed Return" && p.projectedTermMonths > 36;
            const generalLongWarn = p.projectedTermMonths > 60;
            return (
              <div>
                <div>
                  {isLiveRow(p) && project.masterReturnType
                    ? project.masterReturnType
                    : returnTypeLabel(p.returnType)}
                </div>
                {fixedReturnLongWarn && (
                  <div className="mt-0.5 text-[9px] text-red-700 bg-red-50 border border-red-200 rounded px-1 py-0.5 inline-block">
                    Warning: &gt;36 months on Fixed Return
                  </div>
                )}
                {generalLongWarn && (
                  <div className="mt-0.5 text-[9px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 inline-block">
                    Warning: &gt;60 months (long)
                  </div>
                )}
              </div>
            );
          },
        },
        {
          label: "PT (legal entity)",
          sublabel: "Same PT = shared liability exposure",
          cell: (p) => (isLiveRow(p) ? project.ptDetails[0]?.name || dash : p.ptName ?? dash),
        },
        { label: "Amount", cell: (p) => <span className="font-medium">{fmt(p.amount)}</span> },
        {
          label: "Principal outstanding",
          sublabel: "N/A if not yet disbursed or fully repaid",
          cell: (p) => (p.outstandingAmount > 0 ? fmt(p.outstandingAmount) : dash),
        },
      ],
    },
    {
      title: "B — Return Structure",
      rows: [
        {
          label: "Revenue Share %",
          hidden: !hasRevShare,
          cell: (p) => {
            if (ef && isLiveRow(p) && wantsRevShareEdit) {
              return (
                <div className="flex gap-1">
                  <EditNumber
                    value={ef.form.rsPreBEPPct}
                    onChange={(n) => ef.set("rsPreBEPPct", n)}
                    placeholder="Pre-BEP"
                  />
                  <EditNumber
                    value={ef.form.rsPostBEPPct}
                    onChange={(n) => ef.set("rsPostBEPPct", n)}
                    placeholder="Post-BEP"
                  />
                </div>
              );
            }
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
          hidden: !hasRevShare,
          cell: (p) => {
            if (ef && isLiveRow(p) && wantsRevShareEdit) {
              return (
                <div className="space-y-1">
                  <select
                    className={editCellInputCls}
                    value={ef.form.rsCapType}
                    onChange={(e) =>
                      ef.set("rsCapType", e.target.value as SubmissionFormData["rsCapType"])
                    }
                  >
                    <option value="Return Cap">Return Cap</option>
                    <option value="Time Cap">Time Cap</option>
                  </select>
                  {ef.form.rsCapType === "Return Cap" ? (
                    <EditNumber
                      value={ef.form.rsCapMultiple}
                      onChange={(n) => ef.set("rsCapMultiple", n)}
                      placeholder="Multiple (x)"
                    />
                  ) : (
                    <EditNumber
                      value={ef.form.rsCapTimeMonths}
                      onChange={(n) => ef.set("rsCapTimeMonths", n)}
                      placeholder="Months"
                    />
                  )}
                </div>
              );
            }
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
          hidden: !hasRevShare,
          cell: (p) => {
            if (ef && isLiveRow(p) && wantsRevShareEdit) {
              return (
                <div className="space-y-1">
                  <select
                    className={editCellInputCls}
                    value={ef.form.rsStartType}
                    onChange={(e) =>
                      ef.set("rsStartType", e.target.value as SubmissionFormData["rsStartType"])
                    }
                  >
                    <option value="Anchored to Branch Opening">Anchored to Branch Opening</option>
                    <option value="Fixed">Fixed start date</option>
                  </select>
                  {ef.form.rsStartType === "Fixed" && (
                    <input
                      type="date"
                      className={editCellInputCls}
                      value={ef.form.rsStartDate}
                      onChange={(e) => ef.set("rsStartDate", e.target.value)}
                    />
                  )}
                </div>
              );
            }
            return isLiveRow(p) && rst
              ? rst.revShareStartType === "Fixed" && rst.revShareStartDate
                ? `Fixed: ${fmtDate(rst.revShareStartDate)}`
                : "Anchored to Branch Opening"
              : dash;
          },
        },
        {
          label: "Fixed amount / repayment",
          sublabel: "Fixed Return = full schedule · Fixed + Revenue Share = fixed leg only",
          hidden: !projects.some((p) => p.returnType === "Fixed Return"),
          cell: (p) => {
            if (isLiveRow(p)) {
              if (!frt) return dash;
              return (
                <div>
                  <div className="font-medium">{fmt(frt.totalRepayment)} total</div>
                  <div className="text-gray-500 text-[10px]">
                    {frt.repaymentSchedule.length} months · {fmt(frt.totalPrincipal)} principal ·{" "}
                    {fmt(frt.totalInterest)} interest
                  </div>
                </div>
              );
            }
            const fa = getRecapRowFixedAmountSnapshot(p);
            if (!fa) return dash;
            return (
              <div>
                <div className="font-medium">
                  {fmt(fa.totalRepayment)}
                  {fa.pctOfDisbursed != null && ` (${fa.pctOfDisbursed}% of Disbursed)`}
                </div>
                <div className="text-gray-500 text-[10px]">{fa.installmentDescription}</div>
              </div>
            );
          },
        },
        {
          label: "Target carry",
          sublabel: "Rate + type",
          cell: (p) => {
            if (ef && isLiveRow(p) && wantsRevShareEdit) {
              return <EditNumber value={ef.form.rsCarryPct} onChange={(n) => ef.set("rsCarryPct", n)} />;
            }
            const s = getRecapRowRevShareSnapshot(project, p);
            if (s && s.carryPct !== undefined) {
              const carryPct = s.carryPct;
              const mismatch =
                prevSnapshot?.carryPct !== undefined &&
                (prevSnapshot.carryPct !== carryPct || prevSnapshot.carryType !== s.carryType);
              return (
                <div>
                  <div>
                    {fmtPct(carryPct)} {s.carryType}
                  </div>
                  {mismatch && differsWarning}
                </div>
              );
            }
            const info = fixedOrDailyCarryInfo(project, p);
            if (!info) return dash;
            return (
              <div>
                <div>
                  {fmtPct(info.carryPct)}
                  {info.unit === "per 30 days" ? " per 30 days" : ""}
                </div>
                <div className="text-gray-500 text-[10px]">Fixed</div>
              </div>
            );
          },
        },
        {
          label: "Fixed payment investor ROIC",
          sublabel: "Per month (Fixed Return) · Per 30 days (Daily Interest)",
          warning: mixesFixedAndDaily
            ? "⚠ Unit differs by type — label explicitly when comparing across Fixed Return and Daily Interest"
            : undefined,
          hidden: !hasFixedOrDaily,
          cell: (p) => {
            const info = fixedOrDailyCarryInfo(project, p);
            if (!info) return dash;
            return (
              <div>
                <div className="font-medium">
                  {fmtPct(info.investorRoicPct)} {info.unit}
                </div>
                <div className="text-gray-500 text-[10px]">to investors</div>
              </div>
            );
          },
        },
        {
          label: "Fixed payment total implied ROIC",
          sublabel: "Investor rate + carry · Same unit caveat as above",
          hidden: !hasFixedOrDaily,
          cell: (p) => {
            const info = fixedOrDailyCarryInfo(project, p);
            if (!info) return dash;
            return (
              <div>
                <div className="font-medium">
                  {fmtPct(info.totalRoicPct)} {info.unit}
                </div>
                <div className="text-gray-500 text-[10px]">
                  {p.returnType === "Daily Interest"
                    ? "investor + carry (service fee)"
                    : "investor + carry (total implied)"}
                </div>
              </div>
            );
          },
        },
      ],
    },
    {
      title: "C — Timeline & Operations",
      rows: [
        {
          label: "Term",
          sublabel: "Months for Revenue Share / Fixed · Days for Daily Interest",
          cell: (p) => {
            if (ef && isLiveRow(p) && p.returnType !== "Daily Interest") {
              return (
                <EditNumber
                  value={ef.form.projectedTermMonths}
                  onChange={(n) => ef.set("projectedTermMonths", n)}
                  placeholder="months"
                />
              );
            }
            if (p.returnType === "Daily Interest") {
              const recap = effectiveDailyRecap(project, p);
              if (!recap) return dash;
              const tooLong = termDaysTooLong(recap.tenorDays);
              return (
                <div className={tooLong ? "text-red-600 font-semibold" : ""}>
                  {recap.tenorDays} days{tooLong ? " ⚠️ >365d" : ""}
                </div>
              );
            }
            return (
              <div>
                {p.otfTermMonths != null && <div className="font-medium">{p.otfTermMonths} months OTF</div>}
                <div className={p.otfTermMonths != null ? "text-gray-400" : ""}>
                  {p.projectedTermMonths} months{p.otfTermMonths != null ? " original" : ""}
                </div>
              </div>
            );
          },
        },
        {
          label: "Branch Opening",
          cell: (p) => {
            if (isLiveRow(p)) {
              const opening = project.branches.filter(
                (b) => b.type === "Opening Branch" && b.scheduledOpeningDate
              );
              if (opening.length === 0) return dash;
              return (
                <div className="space-y-1.5">
                  {opening.map((b) => (
                    <div key={b.id}>{branchOpeningText(b.scheduledOpeningDate!, b.actualOpeningDate)}</div>
                  ))}
                </div>
              );
            }
            if (!p.branchOpening) return dash;
            return branchOpeningText(p.branchOpening.scheduledDate, p.branchOpening.actualDate);
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
          sublabel: "OTF and original projected",
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
          sublabel: "OTF and original projected · OTF not available from LMS",
          cell: (p) => (
            <div>
              <div className="text-gray-300 text-[10px]">OTF: N/A from LMS</div>
              <div>{p.projectedMOIC} projected</div>
            </div>
          ),
        },
        {
          label: "BEP",
          sublabel: "N/A for Daily Interest instruments",
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
          hidden: !hasRevShare,
          cell: (p) => {
            if (ef && isLiveRow(p) && wantsRevShareEdit) {
              return (
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-[10px] text-gray-600">
                    <input
                      type="checkbox"
                      checked={ef.form.rsMinReturnEnabled}
                      onChange={(e) => ef.set("rsMinReturnEnabled", e.target.checked)}
                    />
                    Enabled
                  </label>
                  {ef.form.rsMinReturnEnabled && (
                    <>
                      <select
                        className={editCellInputCls}
                        value={ef.form.rsMinReturnType}
                        onChange={(e) =>
                          ef.set("rsMinReturnType", e.target.value as SubmissionFormData["rsMinReturnType"])
                        }
                      >
                        <option value="Continual Rev Share">Continual Rev Share</option>
                        <option value="Grossed-Up">Grossed-Up</option>
                      </select>
                      {ef.form.rsMinReturnType === "Grossed-Up" ? (
                        <EditNumber
                          value={ef.form.rsMinReturnMultiple}
                          onChange={(n) => ef.set("rsMinReturnMultiple", n)}
                          placeholder="Multiple (x)"
                        />
                      ) : (
                        <EditNumber
                          value={ef.form.rsMinReturnPct}
                          onChange={(n) => ef.set("rsMinReturnPct", n)}
                          placeholder="Min return %"
                        />
                      )}
                      <EditNumber
                        value={ef.form.rsMinReturnPayableMonths}
                        onChange={(n) => ef.set("rsMinReturnPayableMonths", n)}
                        placeholder="Payable within (mo)"
                      />
                    </>
                  )}
                </div>
              );
            }
            const s = getRecapRowRevShareSnapshot(project, p);
            if (!s || s.minReturn == null) return dash;
            const text = `${formatMinInvestorReturnPaymentType(s)} ${formatMinReturnMultiple(
              s
            )} at ${formatMinReturnPayableMonths(s)}`;
            if (!isLiveRow(p)) return text;
            const mismatch =
              !!prevSnapshot &&
              (prevSnapshot.minReturn !== s.minReturn ||
                prevSnapshot.minReturnMultiple !== s.minReturnMultiple ||
                prevSnapshot.minReturnPayableMonths !== s.minReturnPayableMonths);
            return (
              <div>
                <div>{text}</div>
                {mismatch && differsWarning}
              </div>
            );
          },
        },
        {
          label: "DPD",
          sublabel: "Max days ever past due + incident history",
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
                      <span
                        className={
                          ev.status === "Unpaid"
                            ? "text-red-600 font-medium"
                            : ev.status === "Partial Paid"
                            ? "text-amber-600 font-medium"
                            : "text-gray-400"
                        }
                      >
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
          hidden: !hasRevShare,
          cell: (p) => {
            const snap = getRecapRowRevShareSnapshot(project, p);
            const arr = snap?.revProjectionArray ?? [];
            if (arr.length === 0) return dash;
            const avg = arr.reduce((sum, r) => sum + r.revenue, 0) / arr.length;
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
          hidden: !hasRevShare,
          cell: (p) => {
            if (ef && isLiveRow(p) && wantsRevShareEdit) {
              return (
                <input
                  className={editCellInputCls}
                  value={ef.form.rsSourceOfRevenue}
                  onChange={(e) => ef.set("rsSourceOfRevenue", e.target.value)}
                  placeholder="e.g. POS transactions"
                />
              );
            }
            const s = getRecapRowRevShareSnapshot(project, p);
            if (!s || s.sourceOfRevenueAccrued === undefined) return dash;
            const mismatch =
              prevSnapshot?.sourceOfRevenueAccrued !== undefined &&
              prevSnapshot.sourceOfRevenueAccrued !== s.sourceOfRevenueAccrued;
            return (
              <div>
                <span className="leading-snug">{s.sourceOfRevenueAccrued}</span>
                {mismatch && differsWarning}
              </div>
            );
          },
        },
      ],
    },
    {
      title: "F — Payment Mechanics",
      rows: [
        {
          label: "Payment frequency",
          sublabel: "Revenue Share: 3 sub-lines (revenue share / fixed payment / carry) · Fixed: monthly only",
          hidden: !hasRevShare,
          cell: (p) => {
            if (ef && isLiveRow(p) && wantsRevShareEdit) {
              return (
                <div className="space-y-1">
                  <select
                    className={editCellInputCls}
                    value={ef.form.rsFrequency}
                    onChange={(e) => ef.set("rsFrequency", e.target.value)}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Quarterly">Quarterly</option>
                  </select>
                  <input
                    className={editCellInputCls}
                    value={ef.form.rsDueDate}
                    onChange={(e) => ef.set("rsDueDate", e.target.value)}
                    placeholder="Due date, e.g. 5th"
                  />
                </div>
              );
            }
            const s = getRecapRowRevShareSnapshot(project, p);
            if (!s || s.frequency === undefined) return dash;
            const rst = s;
            const text = `${rst.frequency}${rst.dueDate && rst.dueDate !== "—" ? `, ${rst.dueDate}` : ""}`;
            const mismatch =
              (prevSnapshot?.frequency !== undefined && prevSnapshot.frequency !== rst.frequency) ||
              (prevSnapshot?.dueDate !== undefined && prevSnapshot.dueDate !== rst.dueDate);
            return (
              <div>
                <div>{text}</div>
                {mismatch && differsWarning}
              </div>
            );
          },
        },
        {
          label: "Late fee",
          sublabel: "Basis · Grace period · Rate to investor · Rate to ASN",
          cell: (p) => {
            // Asset B derives late fee from Daily Interest terms (submissionToICProject) — no
            // independent input exists for it there, so it stays read-only even in editable mode.
            if (ef && isLiveRow(p) && !isAssetB(project.assetClass)) {
              return (
                <div className="space-y-1">
                  <input
                    className={editCellInputCls}
                    value={ef.form.lfBasis}
                    onChange={(e) => ef.set("lfBasis", e.target.value)}
                    placeholder="Basis"
                  />
                  <EditNumber
                    value={ef.form.lfGraceDays}
                    onChange={(n) => ef.set("lfGraceDays", n)}
                    placeholder="Grace days"
                  />
                  <div className="flex gap-1">
                    <EditNumber
                      value={ef.form.lfDailyPctInvestors}
                      onChange={(n) => ef.set("lfDailyPctInvestors", n)}
                      placeholder="% investors"
                    />
                    <EditNumber
                      value={ef.form.lfDailyPctASN}
                      onChange={(n) => ef.set("lfDailyPctASN", n)}
                      placeholder="% ASN"
                    />
                  </div>
                </div>
              );
            }
            if (isLiveRow(p)) {
              const prevLateFee = prevProject?.lateFeeRecap ?? null;
              const mismatch =
                !!prevLateFee &&
                (prevLateFee.basis !== project.lateFee.basis ||
                  prevLateFee.gracePeriodDays !== project.lateFee.gracePeriodDays ||
                  prevLateFee.dailyPctInvestors !== project.lateFee.dailyPctInvestors ||
                  prevLateFee.dailyPctASN !== project.lateFee.dailyPctASN);
              return (
                <div>
                  {lateFeeCell(project.lateFee)}
                  {mismatch && differsWarning}
                </div>
              );
            }
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
          {groups.map((g) => {
            const visibleRows = g.rows.filter((row) => !row.hidden);
            if (visibleRows.length === 0) return null;
            return (
              <Fragment key={g.title ?? "top"}>
                {g.title && (
                  <tr className="border-b border-gray-100">
                    <td className="sticky left-0 z-10 bg-gray-50 py-1.5 pl-3 pr-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-100 whitespace-nowrap">
                      {g.title}
                    </td>
                    <td colSpan={projects.length} className="bg-gray-50"></td>
                  </tr>
                )}
                {visibleRows.map((row) => (
                  <tr key={row.label} className="border-b border-gray-50 align-top">
                    <td className="sticky left-0 z-10 bg-white py-2 pl-3 pr-2 text-gray-500 border-r border-gray-100 leading-snug">
                      <div>{row.label}</div>
                      {row.sublabel && <RowCaption text={row.sublabel} />}
                      {row.warning && (
                        <div className="text-[9px] text-amber-600 font-medium leading-tight mt-0.5 max-w-[10rem]">
                          {row.warning}
                        </div>
                      )}
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
            );
          })}
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

function AssetBRecapTable({
  project,
  projects,
  editableProposed,
}: {
  project: ICProject;
  projects: PastProject[];
  editableProposed?: EditableProposedContext;
}) {
  const cells = projects.map((p) => bRecapCells(project, p));
  const isLiveRow = (p: PastProject) => Boolean(p.isCurrentSubmission) || p.status === "Proposed";
  const proposedIdx = projects.findIndex(isLiveRow);
  const dash = <span className="text-gray-300">—</span>;

  const hasFixedOrDaily = cohortHasFixedOrDaily(projects);
  const hasDaily = cohortHasDaily(projects);
  const mixesFixedAndDaily = cohortMixesFixedAndDaily(projects);

  // Same A–F grouped, transposed layout as the A/D recap; group E (Revenue
  // Model) doesn't apply to Asset B financings, F keeps its letter.
  const groups: Array<{
    title: string;
    rows: Array<{
      label: string;
      sublabel?: string;
      warning?: string;
      hidden?: boolean;
      cell: (i: number) => React.ReactNode;
    }>;
  }> = [
    {
      title: "A — Identity & Structure",
      rows: [
        { label: "Financing type", cell: (i) => cells[i].financingType },
        {
          label: "PT (legal entity)",
          sublabel: "Same PT = shared liability exposure",
          cell: (i) =>
            isLiveRow(projects[i]) ? project.ptDetails[0]?.name || dash : projects[i].ptName ?? dash,
        },
        { label: "Amount", cell: (i) => cells[i].amount },
        {
          label: "Principal outstanding",
          sublabel: "N/A if not yet disbursed or fully repaid",
          cell: (i) => cells[i].outstanding,
        },
      ],
    },
    {
      title: "B — Return Structure",
      rows: [
        {
          label: "Fixed amount / repayment",
          sublabel: "Fixed Return = full schedule · Fixed + Revenue Share = fixed leg only",
          hidden: !projects.some((p) => p.returnType === "Fixed Return"),
          cell: (i) => cells[i].fixedAmount,
        },
        {
          label: "Target carry",
          sublabel: "Rate + type",
          cell: (i) => {
            const p = projects[i];
            if (editableProposed && isLiveRow(p) && p.returnType === "Daily Interest") {
              return (
                <EditNumber
                  value={editableProposed.form.diServiceFee30d}
                  onChange={(n) => editableProposed.set("diServiceFee30d", n)}
                  placeholder="Service fee %"
                />
              );
            }
            return cells[i].targetCarry;
          },
        },
        {
          label: "Fixed payment investor ROIC",
          sublabel: "Per month (Fixed Return) · Per 30 days (Daily Interest)",
          warning: mixesFixedAndDaily
            ? "⚠ Unit differs by type — label explicitly when comparing across Fixed Return and Daily Interest"
            : undefined,
          hidden: !hasFixedOrDaily,
          cell: (i) => {
            const p = projects[i];
            if (editableProposed && isLiveRow(p) && p.returnType === "Daily Interest") {
              return (
                <EditNumber
                  value={editableProposed.form.diInterestRate30d}
                  onChange={(n) => editableProposed.set("diInterestRate30d", n)}
                  placeholder="Interest rate %"
                />
              );
            }
            return cells[i].roicInvestor;
          },
        },
        {
          label: "Fixed payment total implied ROIC",
          sublabel: "Investor rate + carry · Same unit caveat as above",
          hidden: !hasFixedOrDaily,
          cell: (i) => cells[i].roicTotal,
        },
      ],
    },
    {
      title: "C — Timeline & Operations",
      rows: [
        {
          label: "Term",
          sublabel: "Months for Revenue Share / Fixed · Days for Daily Interest",
          cell: (i) => {
            const p = projects[i];
            if (editableProposed && isLiveRow(p) && p.returnType === "Daily Interest") {
              return (
                <EditNumber
                  value={editableProposed.form.diTenorDays}
                  onChange={(n) => editableProposed.set("diTenorDays", n)}
                  placeholder="days"
                />
              );
            }
            return cells[i].term;
          },
        },
        {
          label: "Minimum payment period",
          sublabel: "Shown if any project in this set is Daily Interest",
          hidden: !hasDaily,
          cell: (i) => {
            const p = projects[i];
            if (editableProposed && isLiveRow(p) && p.returnType === "Daily Interest") {
              return (
                <EditNumber
                  value={editableProposed.form.diMinInterestDays}
                  onChange={(n) => editableProposed.set("diMinInterestDays", n)}
                  placeholder="days"
                />
              );
            }
            return cells[i].minInt;
          },
        },
      ],
    },
    {
      title: "D — Performance Metrics",
      rows: [
        { label: "IRR", sublabel: "OTF and original projected", cell: (i) => cells[i].irr },
        {
          label: "MOIC",
          sublabel: "OTF and original projected · OTF not available from LMS",
          cell: (i) => cells[i].moic,
        },
        { label: "BEP", sublabel: "N/A for Daily Interest instruments", cell: (i) => cells[i].bep },
        { label: "DPD", sublabel: "Max days ever past due + incident history", cell: (i) => cells[i].dpd },
      ],
    },
    {
      title: "F — Payment Mechanics",
      rows: [
        {
          label: "Payment frequency",
          cell: () => "At maturity / bullet repayment",
        },
        {
          label: "Late fee",
          sublabel: "Basis · Grace period · Rate to investor · Rate to ASN",
          cell: (i) => cells[i].lateFee,
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
          {groups.map((g) => {
            const visibleRows = g.rows.filter((row) => !row.hidden);
            if (visibleRows.length === 0) return null;
            return (
              <Fragment key={g.title}>
                <tr className="border-b border-gray-100">
                  <td className="sticky left-0 z-10 bg-gray-50 py-1.5 pl-3 pr-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-100 whitespace-nowrap">
                    {g.title}
                  </td>
                  <td colSpan={projects.length} className="bg-gray-50"></td>
                </tr>
                {visibleRows.map((row) => (
                  <tr key={row.label} className="border-b border-gray-50 align-top">
                    <td className="sticky left-0 z-10 bg-white py-2 pl-3 pr-2 text-gray-500 border-r border-gray-100 leading-snug">
                      <div>{row.label}</div>
                      {row.sublabel && <RowCaption text={row.sublabel} />}
                      {row.warning && (
                        <div className="text-[9px] text-amber-600 font-medium leading-tight mt-0.5 max-w-[10rem]">
                          {row.warning}
                        </div>
                      )}
                    </td>
                    {projects.map((p, j) => (
                      <td
                        key={p.id}
                        className={`py-2 px-3 text-gray-800 leading-snug ${
                          j === proposedIdx ? "bg-blue-50/40" : ""
                        }`}
                      >
                        {row.cell(j)}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Shared cell renderers for the Asset B recap — one column per project. */
function bRecapCells(project: ICProject, p: PastProject) {
  const kind = rowBRecapKind(p, project);
  const daily = effectiveDailyRecap(project, p);
  const late = p.lateFeeRecap;
  const isLive = Boolean(p.isCurrentSubmission) || p.status === "Proposed";

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
        {p.otfTermMonths != null && <div className="font-medium">{p.otfTermMonths} months OTF</div>}
        <div className={p.otfTermMonths != null ? "text-gray-400" : "text-gray-500"}>
          {p.projectedTermMonths} months {p.otfTermMonths != null ? "original" : "projected"}
        </div>
      </div>
    );
  };

  const minIntCell = () => {
    if (!daily || kind === "A/D") return <span className="text-gray-300">—</span>;
    const bad = minInterestMismatch(daily);
    return (
      <div className={bad ? "text-red-600 font-semibold" : "text-gray-700"}>
        {daily.minInterestPeriodDays} days
        {bad ? " ⚠️ ≠ tenor/2" : ""}
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

  const moicCell = () => (
    <div>
      <div className="text-gray-300 text-[9px]">OTF MOIC: N/A</div>
      <div className="text-gray-600">{p.projectedMOIC} proj.</div>
    </div>
  );

  const bepCell = () => {
    const bepWarn = p.projectedBEPMonths > 30;
    return (
      <div className={bepWarn ? "text-amber-600 font-medium" : ""}>
        Month {p.projectedBEPMonths}
        {bepWarn ? " ⚠️ >30" : ""}
      </div>
    );
  };

  const fixedReturnLongWarn = kind === "A/D" && p.returnType === "Fixed Return" && p.projectedTermMonths > 36;
  const generalLongWarn = kind === "A/D" && p.projectedTermMonths > 60;

  const fixedAmountCell = () => {
    if (isLive) {
      const frt = project.fixedReturnTerms;
      if (!frt) return <span className="text-gray-300">—</span>;
      return (
        <div>
          <div className="font-medium">{fmt(frt.totalRepayment)} total</div>
          <div className="text-gray-500 text-[10px]">
            {frt.repaymentSchedule.length} months · {fmt(frt.totalPrincipal)} principal ·{" "}
            {fmt(frt.totalInterest)} interest
          </div>
        </div>
      );
    }
    const fa = getRecapRowFixedAmountSnapshot(p);
    if (!fa) return <span className="text-gray-300">—</span>;
    return (
      <div>
        <div className="font-medium">
          {fmt(fa.totalRepayment)}
          {fa.pctOfDisbursed != null && ` (${fa.pctOfDisbursed}% of Disbursed)`}
        </div>
        <div className="text-gray-500 text-[10px]">{fa.installmentDescription}</div>
      </div>
    );
  };

  const carryInfo = fixedOrDailyCarryInfo(project, p);

  const targetCarryCell = carryInfo ? (
    <div>
      <div>
        {fmtPct(carryInfo.carryPct)}
        {carryInfo.unit === "per 30 days" ? " per 30 days" : ""}
      </div>
      <div className="text-gray-500 text-[10px]">Fixed</div>
    </div>
  ) : (
    <span className="text-gray-300">—</span>
  );

  const roicInvestorCell = carryInfo ? (
    <div>
      <div className="font-medium">
        {fmtPct(carryInfo.investorRoicPct)} {carryInfo.unit}
      </div>
      <div className="text-gray-500 text-[10px]">to investors</div>
    </div>
  ) : (
    <span className="text-gray-300">—</span>
  );
  const roicTotalCell = carryInfo ? (
    <div>
      <div className="font-medium">
        {fmtPct(carryInfo.totalRoicPct)} {carryInfo.unit}
      </div>
      <div className="text-gray-500 text-[10px]">
        {p.returnType === "Daily Interest" ? "investor + carry (service fee)" : "investor + carry (total implied)"}
      </div>
    </div>
  ) : (
    <span className="text-gray-300">—</span>
  );

  return {
    kind,
    roicInvestor: roicInvestorCell,
    roicTotal: roicTotalCell,
    financingType: (
      <div>
        <div>{returnTypeLabel(p.returnType)}</div>
        {fixedReturnLongWarn && (
          <div className="mt-0.5 text-[9px] text-red-700 bg-red-50 border border-red-200 rounded px-1 py-0.5 inline-block">
            Warning: &gt;36 mo Fixed Return
          </div>
        )}
        {generalLongWarn && (
          <div className="mt-0.5 text-[9px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 inline-block">
            Warning: &gt;60 mo (long)
          </div>
        )}
      </div>
    ),
    amount: <span className="font-medium">{fmt(p.amount)}</span>,
    outstanding:
      p.outstandingAmount > 0 ? fmt(p.outstandingAmount) : <span className="text-gray-300">—</span>,
    term: termCell(),
    minInt: minIntCell(),
    fixedAmount: fixedAmountCell(),
    targetCarry: targetCarryCell,
    lateFee: lateBlock(),
    dpd: (
      <div>
        {p.currentDPD > 0 && <div className="text-red-600 font-semibold">{p.currentDPD}d current</div>}
        {p.maxDPD > 0 && (
          <div className={p.maxDPD > 30 ? "text-red-600 font-medium" : "text-amber-600"}>
            {p.maxDPD}d max ever
          </div>
        )}
        {p.currentDPD === 0 && p.maxDPD === 0 && <span className="text-gray-300">—</span>}
        {p.overdueHistory && p.overdueHistory.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {p.overdueHistory.map((ev, i) => (
              <div key={i} className="text-[9px] text-gray-500">
                {fmtDate(ev.dueDate)} — {ev.daysOverdue}d —{" "}
                <span
                  className={
                    ev.status === "Unpaid"
                      ? "text-red-600 font-medium"
                      : ev.status === "Partial Paid"
                      ? "text-amber-600 font-medium"
                      : "text-gray-400"
                  }
                >
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    irr: irrCell(),
    moic: moicCell(),
    bep: bepCell(),
  };
}

export function PastProjectsRecap({ project, editableProposed }: Props) {
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

  // "(Completed)" describes the OTF data itself — a non-null OTF IRR means the on-the-facts term
  // has actually played out — not the project's lifecycle `status` (Active rows can have it too).
  const completedWithOtfIrr = projects.filter((p) => p.otfIRR !== null);
  const avgOtfIrrCompleted =
    completedWithOtfIrr.length > 0
      ? completedWithOtfIrr.reduce((s, p) => s + (p.otfIRR ?? 0), 0) / completedWithOtfIrr.length
      : null;

  const statusCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  projects.forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
    typeCounts[returnTypeLabel(p.returnType)] = (typeCounts[returnTypeLabel(p.returnType)] ?? 0) + 1;
  });

  return (
    <SectionCard title="Proposed & Past Project Recap">
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
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Total Amount (Incl. Proposed)
                </div>
                <div className="text-sm font-semibold text-gray-800 mt-0.5">{fmt(totalAmountInclProposed)}</div>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Outstanding (Excl. Proposed)</div>
                <div className="text-sm font-semibold text-gray-800 mt-0.5">{fmt(totalOutstandingExclProposed)}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {fmt(totalOutstandingInclProposed)} incl. proposed
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Avg OTF IRR (Completed)</div>
                <div className="text-sm font-semibold text-gray-800 mt-0.5">
                  {avgOtfIrrCompleted !== null ? fmtPct(avgOtfIrrCompleted) : "—"}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {completedWithOtfIrr.length} project(s) with OTF IRR
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">Project Mix</div>
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

            {useAssetBTable ? (
              <AssetBRecapTable project={project} projects={projects} editableProposed={editableProposed} />
            ) : (
              <ADGroupedRecapTable project={project} projects={projects} editableProposed={editableProposed} />
            )}
          </>
        )}

        <p className="text-xs text-gray-400 italic">
          ⚠️ OTF MOIC and PvA are not currently available from the LMS Reporting Layer. Rows sorted:
          Proposed first, then by IC approval date (newest first).
        </p>
      </div>
    </SectionCard>
  );
}


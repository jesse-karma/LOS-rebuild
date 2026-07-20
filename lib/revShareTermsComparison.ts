import type { FixedAmountSnapshot, ICProject, PastProject, RevenueShareTerms, RevShareTermsSnapshot } from "@/data/types";
import { fmtPct } from "@/components/ui/DataRow";

export function toRevShareSnapshot(rst: RevenueShareTerms): RevShareTermsSnapshot {
  return {
    capType: rst.capType,
    capMultiple: rst.capMultiple,
    capTimePeriodMonths: rst.capTimePeriodMonths,
    preBEPRevSharePct: rst.preBEPRevSharePct,
    postBEPRevSharePct: rst.postBEPRevSharePct,
    minReturn: rst.minReturn,
    minReturnMultiple: rst.minReturnMultiple,
    minReturnPayableMonths: rst.minReturnPayableMonths,
    carryType: rst.carryType,
    carryPct: rst.carryPct,
    sourceOfRevenueAccrued: rst.sourceOfRevenueAccrued,
    frequency: rst.frequency,
    dueDate: rst.dueDate,
    revProjectionArray: rst.revProjectionArray,
  };
}

/**
 * The most recent non-proposed project of the same financing type — the comparison baseline for
 * the "different from previous project of the same Financing Type" recap warnings.
 */
export function previousProjectOfSameType(project: ICProject, projects: PastProject[]): PastProject | null {
  return (
    projects.find(
      (p) => !p.isCurrentSubmission && p.status !== "Proposed" && p.returnType === project.returnType
    ) ?? null
  );
}

/** Proposed row uses live `project.revenueShareTerms`; historical rows use `revShareTermsSnapshot` when present. */
export function getRecapRowRevShareSnapshot(project: ICProject, p: PastProject): RevShareTermsSnapshot | null {
  if (p.isCurrentSubmission && project.revenueShareTerms) {
    return toRevShareSnapshot(project.revenueShareTerms);
  }
  return p.revShareTermsSnapshot ?? null;
}

/**
 * Fixed-schedule specifics for a recap row (Cross Projects Table "Fixed Amount" + ROIC rows).
 * Only historical rows carry this today — the live row has no equivalent narrative/ROIC computation
 * yet (pctOfDisbursed / installmentDescription / ROIC-per-month aren't derivable from FixedReturnTerms
 * alone), so a live pure-Fixed Proposed row shows dash here rather than guessing at the figures.
 */
export function getRecapRowFixedAmountSnapshot(p: PastProject): FixedAmountSnapshot | null {
  return p.fixedAmountSnapshot ?? null;
}

/** True when this row's financing is Fixed-only (no revenue-share component) — the CSV spec's
 *  distinction between Format A (includes a pure-Fixed row, adds the two ROIC-per-month rows)
 *  and Format B (Revenue Share family only, those two rows don't apply). */
export function isPureFixedRow(project: ICProject, p: PastProject): boolean {
  if (p.isCurrentSubmission) {
    return Boolean(project.fixedReturnTerms) && !project.revenueShareTerms;
  }
  return Boolean(p.fixedAmountSnapshot);
}

export function formatTimeCapPeriodMonths(s: RevShareTermsSnapshot): string {
  if (s.capType === "Time Cap" && s.capTimePeriodMonths != null) {
    return `${s.capTimePeriodMonths} mo`;
  }
  return "—";
}

export function formatInvestorCapExcCarry(s: RevShareTermsSnapshot): string {
  if (s.capType === "Return Cap" && s.capMultiple != null) {
    return `${s.capMultiple}x`;
  }
  return "—";
}

/** IC recap: discrete payment-type bucket (detail lives in multiple / payable columns). */
export function formatMinInvestorReturnPaymentType(s: RevShareTermsSnapshot): string {
  if (s.minReturn == null) return "—";
  if (s.minReturnMultiple != null) return "Grossed-Up";
  return "Continual Rev Share";
}

function fmtPctUpToTwoDecimals(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return `${Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(rounded)}%`;
}

/** Grossed-up: multiple (e.g. 1.2x). Continual: minimum return floor as % of invested fund. */
export function formatMinReturnMultiple(s: RevShareTermsSnapshot): string {
  if (s.minReturnMultiple != null) return `${s.minReturnMultiple}x`;
  if (s.minReturn != null) return fmtPctUpToTwoDecimals(s.minReturn);
  return "—";
}

export function formatMinReturnPayableMonths(s: RevShareTermsSnapshot): string {
  if (s.minReturnPayableMonths != null) return `${s.minReturnPayableMonths} mo`;
  return "—";
}

export type RevShareCompareMetric = {
  label: string;
  sublabel?: string;
  format: (s: RevShareTermsSnapshot) => string;
};

export const REV_SHARE_RECAP_COMPARE_METRICS: RevShareCompareMetric[] = [
  { label: "Pre-BEP Revenue share", sublabel: "percentage", format: (s) => fmtPct(s.preBEPRevSharePct) },
  { label: "Post-BEP Revenue share", sublabel: "percentage", format: (s) => fmtPct(s.postBEPRevSharePct) },
  { label: "Time Cap Period", sublabel: "(months)", format: formatTimeCapPeriodMonths },
  { label: "Investor Cap", sublabel: "EXC. Carry", format: formatInvestorCapExcCarry },
  {
    label: "Minimum Investor Return",
    sublabel: "Payment Type*",
    format: formatMinInvestorReturnPaymentType,
  },
  {
    label: "Minimum Return",
    sublabel: "(multiple of invested fund)*",
    format: formatMinReturnMultiple,
  },
  {
    label: "Minimum Return Payable In",
    sublabel: "(mos)*",
    format: formatMinReturnPayableMonths,
  },
];

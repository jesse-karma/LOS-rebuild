import { DailyInterestRecapSnapshot, ICProject, PastProject } from "@/data/types";
import { isAssetBI, isAssetBPO } from "@/lib/assetClass";

export type BRecapKind = "B-I" | "B-PO" | "A/D";

export function rowBRecapKind(row: PastProject, project: ICProject): BRecapKind {
  if (row.bRecapKind) return row.bRecapKind;
  if (isAssetBI(project.assetClass)) return "B-I";
  if (isAssetBPO(project.assetClass)) return "B-PO";
  return "A/D";
}

/** Build recap snapshot for the proposed row from live project terms when not stored on the row. */
export function dailyRecapFromProject(project: ICProject): DailyInterestRecapSnapshot | null {
  const d = project.dailyInterestTerms;
  if (!d) return null;
  const { lateFee } = project;
  return {
    interestRate30DayPct: d.interestRate30DayPct,
    serviceFee30DayPct: d.serviceFee30DayPct,
    tenorDays: d.tenorDays,
    minInterestPeriodDays: d.minInterestPeriodDays,
    serviceFeeDailyBasis: d.serviceFeeDailyBasis,
    lateFeeBasis: lateFee.basis,
    gracePeriodDays: lateFee.gracePeriodDays,
    dailyPctInvestors: lateFee.dailyPctInvestors,
    dailyPctASN: lateFee.dailyPctASN,
  };
}

export function effectiveDailyRecap(project: ICProject, row: PastProject): DailyInterestRecapSnapshot | null {
  if (row.dailyInterestRecap !== undefined && row.dailyInterestRecap !== null) {
    return row.dailyInterestRecap;
  }
  if (row.returnType === "Daily Interest" && row.isCurrentSubmission) {
    return dailyRecapFromProject(project);
  }
  return null;
}

export function expectedInvestorDailyPct(recap: DailyInterestRecapSnapshot): number {
  return recap.interestRate30DayPct / 30;
}

export function expectedAsnDailyPct(recap: DailyInterestRecapSnapshot): number {
  return recap.serviceFee30DayPct / 30;
}

export function termDaysTooLong(days: number): boolean {
  return days > 365;
}

export function minInterestMismatch(recap: DailyInterestRecapSnapshot): boolean {
  const half = recap.tenorDays / 2;
  return recap.minInterestPeriodDays !== half;
}

export function interestTooLow(kind: BRecapKind, pct: number): string | null {
  if (kind === "A/D") return null;
  if (kind === "B-PO" && pct < 1.6) return "Warning: too low for PO";
  if (kind === "B-I" && pct < 1.5) return "Warning: too low for invoice";
  return null;
}

export function serviceTooLow(kind: BRecapKind, pct: number): string | null {
  if (kind !== "B-PO") return null;
  if (pct < 0.6) return "Warning: below standard of 0.6%";
  return null;
}

export function lateFeeBasisWarningB(kind: BRecapKind, basis: string): string | null {
  if (kind === "A/D") return null;
  if (basis !== "Outstanding Principal") {
    return 'Warning: different from default value of Outstanding Principal';
  }
  return null;
}

export function lateFeeGraceWarningB(kind: BRecapKind, grace: number): string | null {
  if (kind === "A/D") return null;
  if (grace !== 0) {
    return "Warning: different from default value of 0 days for this project type";
  }
  return null;
}

export function lateFeeBasisWarningAD(basis: string): string | null {
  if (basis !== "Overdue Amount") {
    return 'Warning: different from default value of Overdue Amount';
  }
  return null;
}

export function lateFeeGraceWarningAD(grace: number): string | null {
  if (grace !== 5) {
    return "Warning: different from default value of 5 days for this project type";
  }
  return null;
}

const AD_INV = 0.08;
const AD_ASN = 0.02;

export function lateFeeDailyInvestorWarningAD(pct: number): string | null {
  if (pct !== AD_INV) {
    return "Warning: different from default value 0.08% per day to Investors for this project type";
  }
  return null;
}

export function lateFeeDailyAsnWarningAD(pct: number): string | null {
  if (pct !== AD_ASN) {
    return "Warning: different from default value 0.02% per day to ASN for this project type";
  }
  return null;
}

export function lateFeeDailyInvestorWarningB(recap: DailyInterestRecapSnapshot): string | null {
  const exp = expectedInvestorDailyPct(recap);
  if (Math.abs(recap.dailyPctInvestors - exp) > 1e-6) {
    return "Warning: different from default value of daily interest rate to Investors for this project type";
  }
  return null;
}

export function lateFeeDailyAsnWarningB(recap: DailyInterestRecapSnapshot): string | null {
  const exp = expectedAsnDailyPct(recap);
  if (Math.abs(recap.dailyPctASN - exp) > 1e-6) {
    return "Warning: different from default value of daily service fee rate to ASN for this project type";
  }
  return null;
}

export function pvaClass(pct: number | null | undefined): "red" | "amber" | "green" | "muted" {
  if (pct == null) return "muted";
  if (pct < 70) return "red";
  if (pct < 90) return "amber";
  return "green";
}

export type FixedOrDailyUnit = "per month" | "per 30 days";

export interface FixedOrDailyCarryInfo {
  carryPct: number;
  investorRoicPct: number;
  totalRoicPct: number;
  unit: FixedOrDailyUnit;
}

function isLiveRecapRow(row: PastProject): boolean {
  return Boolean(row.isCurrentSubmission) || row.status === "Proposed";
}

/**
 * Target Carry / ROIC figures for Fixed Return and Daily Interest recap rows (Cross Projects
 * Table Band B). Revenue Share rows keep using `getRecapRowRevShareSnapshot`'s own
 * `carryPct`/`carryType` — this only covers the two return types that don't carry a rev-share
 * snapshot.
 */
export function fixedOrDailyCarryInfo(project: ICProject, row: PastProject): FixedOrDailyCarryInfo | null {
  if (row.returnType === "Daily Interest") {
    const recap = effectiveDailyRecap(project, row);
    if (!recap) return null;
    return {
      carryPct: recap.serviceFee30DayPct,
      investorRoicPct: recap.interestRate30DayPct,
      totalRoicPct: recap.interestRate30DayPct + recap.serviceFee30DayPct,
      unit: "per 30 days",
    };
  }
  if (row.returnType === "Fixed Return") {
    if (isLiveRecapRow(row)) {
      const frt = project.fixedReturnTerms;
      if (!frt || frt.repaymentSchedule.length === 0 || frt.totalPrincipal <= 0) return null;
      const months = frt.repaymentSchedule.length;
      const investorRoicPct = (frt.totalInterest / frt.totalPrincipal / months) * 100;
      const totalRoicPct = ((frt.totalInterest + frt.carry) / frt.totalPrincipal / months) * 100;
      return { carryPct: totalRoicPct - investorRoicPct, investorRoicPct, totalRoicPct, unit: "per month" };
    }
    const fa = row.fixedAmountSnapshot;
    if (!fa) return null;
    return {
      carryPct: fa.totalRoicPerMonthPct - fa.investorRoicPerMonthPct,
      investorRoicPct: fa.investorRoicPerMonthPct,
      totalRoicPct: fa.totalRoicPerMonthPct,
      unit: "per month",
    };
  }
  return null;
}

/** Cohort-level visibility gates for the recap table's conditionally-shown Band B/C rows. */
export function cohortHasFixedOrDaily(projects: PastProject[]): boolean {
  return projects.some((p) => p.returnType === "Fixed Return" || p.returnType === "Daily Interest");
}

export function cohortHasDaily(projects: PastProject[]): boolean {
  return projects.some((p) => p.returnType === "Daily Interest");
}

/** Drives the "⚠ Unit differs by type" warning — only relevant when a cohort mixes both. */
export function cohortMixesFixedAndDaily(projects: PastProject[]): boolean {
  return cohortHasDaily(projects) && projects.some((p) => p.returnType === "Fixed Return");
}

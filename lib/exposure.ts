import { ConcentrationCheck, LimitDimensionCheck } from "@/data/types";
import { mockProjects } from "@/data/mock";
import { allReviewProjects } from "@/lib/submissionsStore";
import { getWorkflow } from "@/lib/workflowStore";
import {
  currentConfig,
  ENTITY_POLICIES,
  EntityId,
  tierAmount,
} from "@/lib/limitsStore";

/**
 * Cumulative exposure calculation for concentration limit checks.
 *
 * Prototype data sources: a brand's existing exposure is the outstanding
 * amount of its Active/Rescheduled past projects (mock history) plus the
 * disbursed amounts of projects onboarded through the in-app flow. In-flight
 * submissions (IC/Legal/Finance) are not yet disbursed and don't count.
 */

/** Outstanding exposure to a brand from its mock project history (assumed on-balance / KF). */
function mockBrandOutstanding(brandName: string): number {
  const key = brandName.trim().toLowerCase();
  const seen = new Set<string>();
  return mockProjects
    .filter((p) => p.brandName.trim().toLowerCase() === key)
    .flatMap((p) => p.pastProjects.filter((pp) => !pp.isCurrentSubmission))
    .filter((pp) => (seen.has(pp.id) ? false : (seen.add(pp.id), true)))
    .filter((pp) => pp.status === "Active" || pp.status === "Rescheduled")
    .reduce((sum, pp) => sum + pp.outstandingAmount, 0);
}

/** KF/KCF splits of projects onboarded through the in-app flow. */
function onboardedFundExposure(brandName: string): { kf: number; kcf: number } {
  const key = brandName.trim().toLowerCase();
  let kf = 0;
  let kcf = 0;
  for (const p of allReviewProjects()) {
    if (p.brandName.trim().toLowerCase() !== key) continue;
    const wf = getWorkflow(p.id);
    if (!wf.finance.completedAt) continue;
    kf += wf.finance.kfAmount;
    kcf += wf.finance.kcfAmount;
  }
  return { kf, kcf };
}

/** Total existing exposure to an entrepreneur/brand across funds (IDR). */
export function existingBrandExposure(brandName: string): number {
  if (!brandName.trim()) return 0;
  const funds = onboardedFundExposure(brandName);
  return mockBrandOutstanding(brandName) + funds.kf + funds.kcf;
}

/** Existing exposure per fund, for the Finance-stage per-slot checks. */
export function existingFundExposure(brandName: string): { kf: number; kcf: number } {
  if (!brandName.trim()) return { kf: 0, kcf: 0 };
  const funds = onboardedFundExposure(brandName);
  // Mock outstanding predates the fund split — treated as on-balance (KF).
  return { kf: mockBrandOutstanding(brandName) + funds.kf, kcf: funds.kcf };
}

// ─── The check itself ─────────────────────────────────────────────────────────

export interface CheckInputs {
  /** Proposed new amount in IDR. */
  proposedAmount: number;
  /** Existing exposure to this entrepreneur/brand (IDR). */
  existingEntrepreneur: number;
  /** Existing exposure to this specific project (0 for a new project). */
  existingProject?: number;
  /** Existing exposure to the Ultimate Beneficiary Owner (IDR); null/omitted = skip the UBO dim. */
  existingUbo?: number | null;
}

function dimStatus(
  cumulative: number,
  normalLimit: number | null,
  maxLimit: number
): LimitDimensionCheck["status"] {
  if (cumulative > maxLimit) return "over";
  if (normalLimit !== null && cumulative > normalLimit) return "stretch";
  return "ok";
}

/**
 * Check a proposed amount against an entity's configured limits.
 * Returns null when the entity has no configuration yet.
 */
export function checkConcentration(entity: EntityId, inputs: CheckInputs): ConcentrationCheck | null {
  const config = currentConfig(entity);
  if (!config) return null;
  const policy = ENTITY_POLICIES[entity];
  const { proposedAmount } = inputs;

  const dims: LimitDimensionCheck[] = [];

  const pushDim = (
    dimension: LimitDimensionCheck["dimension"],
    label: string,
    existing: number,
    limits: { normalPct: number | null; maxPct: number }
  ) => {
    const normalLimit = limits.normalPct !== null ? tierAmount(config.baseAmount, limits.normalPct) : null;
    const maxLimit = tierAmount(config.baseAmount, limits.maxPct);
    const cumulative = existing + proposedAmount;
    dims.push({
      dimension,
      label,
      existing,
      cumulative,
      normalLimit,
      maxLimit,
      status: dimStatus(cumulative, normalLimit, maxLimit),
    });
  };

  pushDim("project", "Per Project", inputs.existingProject ?? 0, policy.dims.project);
  pushDim("entrepreneur", "Per Entrepreneur", inputs.existingEntrepreneur, policy.dims.entrepreneur);
  if (policy.dims.ubo && inputs.existingUbo !== null && inputs.existingUbo !== undefined) {
    pushDim("ubo", "Per Ultimate Beneficiary Owner", inputs.existingUbo, policy.dims.ubo);
  }

  const outcome: ConcentrationCheck["outcome"] = dims.some((d) => d.status === "over")
    ? "blocked"
    : dims.some((d) => d.status === "stretch")
    ? "stretch"
    : "ok";

  return {
    entity,
    entityName: policy.name,
    basisLabel: policy.basisLabel,
    baseAmount: config.baseAmount,
    quarterLabel: config.quarterLabel,
    configSetAt: config.setAt,
    proposedAmount,
    dims,
    outcome,
  };
}

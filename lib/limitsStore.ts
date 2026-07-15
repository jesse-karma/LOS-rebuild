/**
 * Concentration limit configuration (policy: Concentration Limits).
 *
 * Limits prevent one investee's failure from failing Karma or posting a
 * negative fund return. The basis differs by entity:
 *  - KarmaFood (on-balance sheet): % of Karma's Net Assets (Equity), reset quarterly.
 *  - KarmaCap Fund 1 (off-balance sheet): % of Aggregate Capital Commitments,
 *    locked at fund close.
 *
 * Config is an append-only version history per entity — the history IS the
 * audit log (who changed it, old → new, when) and lets us answer "what was
 * the limit at the time of a past approval". Rupiah thresholds are always
 * derived from the current version, never cached.
 */

export type EntityId = "karmafood" | "karmacap1";

export interface EntityLimitDim {
  /** Normal maximum (% of base); exceeding it requires full IC sign-off. Null = no normal tier. */
  normalPct: number | null;
  /** Hard maximum (% of base); exceeding it blocks the submission. */
  maxPct: number;
}

export interface EntityLimitPolicy {
  id: EntityId;
  name: string;
  basisLabel: string;
  resetRule: string;
  /** Rows for the admin "Implementation" preview, mirroring the policy doc. */
  display: Array<{ label: string; pct: number; requiresCommittee?: boolean }>;
  dims: {
    project: EntityLimitDim;
    entrepreneur: EntityLimitDim;
    ubo: EntityLimitDim | null;
  };
}

export const ENTITY_POLICIES: Record<EntityId, EntityLimitPolicy> = {
  karmafood: {
    id: "karmafood",
    name: "KarmaFood (on-balance sheet)",
    basisLabel: "Net Assets (Equity)",
    resetRule: "Re-set and adjusted every quarter",
    display: [
      { label: "Normal Maximum Exposure per Project", pct: 3 },
      { label: "Normal Maximum Exposure per Entrepreneur", pct: 5 },
      { label: "Stretch Maximum Exposure per Project/Entrepreneur", pct: 10, requiresCommittee: true },
      { label: "Stretch Maximum Exposure per Ultimate Beneficiary Owner", pct: 15, requiresCommittee: true },
    ],
    dims: {
      project: { normalPct: 3, maxPct: 10 },
      entrepreneur: { normalPct: 5, maxPct: 10 },
      ubo: { normalPct: null, maxPct: 15 },
    },
  },
  karmacap1: {
    id: "karmacap1",
    name: "KarmaCap Fund 1 (off-balance sheet)",
    basisLabel: "Aggregate Capital Commitments",
    resetRule: "Locked at fund close",
    display: [
      { label: "Project Limit", pct: 10 },
      { label: "Entrepreneur Limit", pct: 25 },
    ],
    dims: {
      project: { normalPct: null, maxPct: 10 },
      entrepreneur: { normalPct: null, maxPct: 25 },
      ubo: null,
    },
  },
};

export const ENTITY_IDS: EntityId[] = ["karmafood", "karmacap1"];

export function tierAmount(baseAmount: number, pct: number): number {
  return Math.round((baseAmount * pct) / 100);
}

// ─── Config versions (append-only; doubles as the audit log) ─────────────────

export interface LimitConfigVersion {
  id: string;
  entity: EntityId;
  baseAmount: number; // IDR
  /** e.g. "Q3 2026" — which quarterly reset (or fund close) this value is for. */
  quarterLabel: string;
  setBy: string;
  setAt: string; // ISO
  previousAmount: number | null;
}

const STORAGE_KEY = "kc-los-limit-config";

export function listConfigVersions(): LimitConfigVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LimitConfigVersion[]) : [];
  } catch {
    return [];
  }
}

/** The live config for an entity — newest version wins. */
export function currentConfig(entity: EntityId): LimitConfigVersion | null {
  return listConfigVersions().find((v) => v.entity === entity) ?? null;
}

/** What applied at a past date (historical / audit lookups). */
export function configAsOf(entity: EntityId, isoDate: string): LimitConfigVersion | null {
  return listConfigVersions().find((v) => v.entity === entity && v.setAt <= isoDate) ?? null;
}

export function saveConfig(
  entity: EntityId,
  baseAmount: number,
  quarterLabel: string,
  setBy: string
): LimitConfigVersion {
  const versions = listConfigVersions();
  const version: LimitConfigVersion = {
    id: `lim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    entity,
    baseAmount,
    quarterLabel,
    setBy,
    setAt: new Date().toISOString(),
    previousAmount: currentConfig(entity)?.baseAmount ?? null,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([version, ...versions]));
  return version;
}

/** One-time seed so limit checks work out of the box (demo values). */
export function seedDefaultLimitConfigs() {
  if (typeof window === "undefined") return;
  if (listConfigVersions().length > 0) return;
  const seed: LimitConfigVersion[] = [
    {
      id: "lim-seed-karmafood",
      entity: "karmafood",
      baseAmount: 100_000_000_000,
      quarterLabel: "Q3 2026",
      setBy: "System (seed)",
      setAt: "2026-07-01T00:00:00.000Z",
      previousAmount: null,
    },
    {
      id: "lim-seed-karmacap1",
      entity: "karmacap1",
      baseAmount: 50_000_000_000,
      quarterLabel: "Fund close (2025)",
      setBy: "System (seed)",
      setAt: "2026-07-01T00:00:00.000Z",
      previousAmount: null,
    },
  ];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { useProfile } from "@/lib/profileStore";
import { canEditLimitConfig } from "@/lib/access";
import {
  ENTITY_IDS,
  ENTITY_POLICIES,
  EntityId,
  LimitConfigVersion,
  listConfigVersions,
  saveConfig,
  seedDefaultLimitConfigs,
  tierAmount,
} from "@/lib/limitsStore";

function fmt(n: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseAmount(text: string): number {
  const digits = text.replace(/[^\d]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function formatAmountInput(n: number): string {
  return n > 0 ? new Intl.NumberFormat("id-ID").format(n) : "";
}

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50 disabled:text-gray-500";

/** One entity's config card: base input with live tier preview + save. */
function EntityConfigCard({
  entity,
  current,
  editable,
  onSaved,
}: {
  entity: EntityId;
  current: LimitConfigVersion | null;
  editable: boolean;
  onSaved: () => void;
}) {
  const { user } = useProfile();
  const policy = ENTITY_POLICIES[entity];
  const [amountText, setAmountText] = useState(formatAmountInput(current?.baseAmount ?? 0));
  const [quarterLabel, setQuarterLabel] = useState(current?.quarterLabel ?? "");
  const [saved, setSaved] = useState(false);

  // Preview follows the input live (before saving) so IC/Admin can see the effect first.
  const previewAmount = parseAmount(amountText);
  const dirty = current === null || previewAmount !== current.baseAmount || quarterLabel !== current.quarterLabel;

  function handleSave() {
    if (previewAmount <= 0 || !quarterLabel.trim()) return;
    saveConfig(entity, previewAmount, quarterLabel.trim(), user.name);
    setSaved(true);
    onSaved();
  }

  return (
    <SectionCard
      title={policy.name}
      badge={
        current ? (
          <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
            {current.quarterLabel} · set {fmtDateTime(current.setAt)} by {current.setBy}
          </span>
        ) : (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
            Not configured
          </span>
        )
      }
    >
      <div className="mt-2 space-y-4">
        <p className="text-xs text-gray-500">
          Basis: <span className="font-medium text-gray-700">{policy.basisLabel}</span> · {policy.resetRule}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">{policy.basisLabel} (IDR)</span>
            <input
              className={inputCls}
              inputMode="numeric"
              value={amountText}
              disabled={!editable}
              onChange={(e) => {
                setAmountText(formatAmountInput(parseAmount(e.target.value)));
                setSaved(false);
              }}
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Period label</span>
            <input
              className={inputCls}
              value={quarterLabel}
              disabled={!editable}
              onChange={(e) => {
                setQuarterLabel(e.target.value);
                setSaved(false);
              }}
              placeholder={entity === "karmafood" ? "e.g. Q3 2026" : "e.g. Fund close (2025)"}
            />
          </label>
        </div>

        {/* Live "Implementation" preview — mirrors the policy doc format */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 flex items-center justify-between">
            <span>Resulting limits{dirty && editable ? " (preview — not saved yet)" : ""}</span>
            <span className="font-normal text-gray-400">
              base {previewAmount > 0 ? fmt(previewAmount) : "—"}
            </span>
          </div>
          <div className="divide-y divide-gray-50 text-sm">
            {policy.display.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between px-3 py-2 gap-3">
                <span className="text-gray-700">
                  {row.label} <span className="text-xs text-gray-400">({row.pct}%)</span>
                  {row.requiresCommittee && (
                    <span className="ml-2 text-[11px] text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                      requires full Investment Committee sign-off
                    </span>
                  )}
                </span>
                <span className="font-semibold text-gray-900 whitespace-nowrap">
                  {previewAmount > 0 ? fmt(tierAmount(previewAmount, row.pct)) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {editable ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={previewAmount <= 0 || !quarterLabel.trim() || !dirty}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save {policy.basisLabel}
            </button>
            {saved && !dirty && (
              <span className="text-xs text-emerald-700">Saved — new limits are live immediately.</span>
            )}
            {dirty && current !== null && (
              <span className="text-xs text-amber-700">
                Unsaved change from {fmt(current.baseAmount)} — limits still use the saved value.
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Editable by the Investment Committee or System Admin. Your team ({user.team}) has view access.
          </p>
        )}
      </div>
    </SectionCard>
  );
}

export default function LimitsAdminPage() {
  const { user } = useProfile();
  const editable = canEditLimitConfig(user.team);
  // localStorage is client-only: resolve after mount to avoid hydration mismatch.
  const [versions, setVersions] = useState<LimitConfigVersion[] | null>(null);

  function reload() {
    setVersions(listConfigVersions());
  }

  useEffect(() => {
    seedDefaultLimitConfigs();
    reload();
  }, []);

  if (versions === null) {
    return <p className="text-sm text-gray-400">Loading limit configuration…</p>;
  }

  const currentFor = (entity: EntityId) => versions.find((v) => v.entity === entity) ?? null;

  return (
    <div>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        All submissions
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Concentration Limits</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure the base values that concentration limit thresholds are calculated from. Every
          submission is checked against the live values below — changes take effect immediately and
          are logged for audit.
        </p>
      </div>

      <div className="space-y-4 mb-4">
        {ENTITY_IDS.map((entity) => (
          <EntityConfigCard
            key={`${entity}-${currentFor(entity)?.id ?? "none"}`}
            entity={entity}
            current={currentFor(entity)}
            editable={editable}
            onSaved={reload}
          />
        ))}
      </div>

      {/* Audit log — the append-only version history */}
      <SectionCard title="Change Log">
        <div className="mt-2 overflow-x-auto -mx-1">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="border-b text-gray-400 text-left">
                <th className="pb-2 pr-3 font-medium">When</th>
                <th className="pb-2 pr-3 font-medium">Entity</th>
                <th className="pb-2 pr-3 font-medium">Period</th>
                <th className="pb-2 pr-3 font-medium text-right">Old value</th>
                <th className="pb-2 pr-3 font-medium text-right">New value</th>
                <th className="pb-2 font-medium">Changed by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {versions.map((v) => (
                <tr key={v.id}>
                  <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap">{fmtDateTime(v.setAt)}</td>
                  <td className="py-2.5 pr-3 text-gray-800">{ENTITY_POLICIES[v.entity].name}</td>
                  <td className="py-2.5 pr-3 text-gray-700 whitespace-nowrap">{v.quarterLabel}</td>
                  <td className="py-2.5 pr-3 text-right text-gray-500 whitespace-nowrap">
                    {v.previousAmount !== null ? fmt(v.previousAmount) : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {fmt(v.baseAmount)}
                  </td>
                  <td className="py-2.5 text-gray-700 whitespace-nowrap">{v.setBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {versions.length === 0 && (
            <p className="text-sm text-gray-400 px-3 py-6 text-center">No configuration changes yet.</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

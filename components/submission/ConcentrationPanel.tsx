import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { ConcentrationCheck, LimitDimensionCheck } from "@/data/types";

function fmt(n: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
}

function pctOfBase(amount: number, base: number): string {
  return `${((amount / base) * 100).toFixed(2)}%`;
}

function DimStatus({ dim }: { dim: LimitDimensionCheck }) {
  if (dim.status === "over")
    return <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded whitespace-nowrap">Over max</span>;
  if (dim.status === "stretch")
    return <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded whitespace-nowrap">Stretch</span>;
  return <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded whitespace-nowrap">Within normal</span>;
}

/**
 * Concentration limit check panel — shown live on the submission form and,
 * once stamped, on the IC card. Compares cumulative exposure (existing +
 * proposed) per dimension against the configured limits.
 */
export function ConcentrationPanel({
  check,
  title = "Concentration Limit Check",
}: {
  check: ConcentrationCheck;
  title?: string;
}) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm px-5 py-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <span className="text-xs text-gray-400">
          {check.entityName} · {check.basisLabel} {fmt(check.baseAmount)} ({check.quarterLabel})
        </span>
      </div>

      {/* Outcome banner */}
      <div className="mt-3">
        {check.outcome === "ok" && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-800">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Within normal concentration limits — submission can proceed normally.
          </div>
        )}
        {check.outcome === "stretch" && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Exceeds the Normal Maximum but is within the Stretch Maximum — full Investment Committee
            sign-off (all 3 votes) is required.
          </div>
        )}
        {check.outcome === "blocked" && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800">
            <XCircle className="w-4 h-4 shrink-0" />
            Exceeds the Stretch Maximum — this submission cannot proceed.
          </div>
        )}
      </div>

      {/* Per-dimension breakdown */}
      <div className="mt-3 overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="border-b text-gray-400 text-left">
              <th className="pb-2 pr-3 font-medium">Exposure</th>
              <th className="pb-2 pr-3 font-medium text-right">Existing</th>
              <th className="pb-2 pr-3 font-medium text-right">With this project</th>
              <th className="pb-2 pr-3 font-medium text-right">Normal max</th>
              <th className="pb-2 pr-3 font-medium text-right">Stretch / hard max</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {check.dims.map((dim) => (
              <tr key={dim.dimension}>
                <td className="py-2.5 pr-3 text-gray-800 font-medium whitespace-nowrap">{dim.label}</td>
                <td className="py-2.5 pr-3 text-right text-gray-500 whitespace-nowrap">
                  {dim.existing > 0 ? fmt(dim.existing) : "—"}
                </td>
                <td className="py-2.5 pr-3 text-right whitespace-nowrap">
                  <span
                    className={
                      dim.status === "over"
                        ? "text-red-700 font-semibold"
                        : dim.status === "stretch"
                        ? "text-amber-700 font-semibold"
                        : "text-gray-800 font-medium"
                    }
                  >
                    {fmt(dim.cumulative)}
                  </span>
                  <span className="text-gray-400 ml-1">({pctOfBase(dim.cumulative, check.baseAmount)})</span>
                </td>
                <td className="py-2.5 pr-3 text-right text-gray-500 whitespace-nowrap">
                  {dim.normalLimit !== null ? (
                    <>
                      {fmt(dim.normalLimit)}{" "}
                      <span className="text-gray-400">({pctOfBase(dim.normalLimit, check.baseAmount)})</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right text-gray-500 whitespace-nowrap">
                  {fmt(dim.maxLimit)}{" "}
                  <span className="text-gray-400">({pctOfBase(dim.maxLimit, check.baseAmount)})</span>
                </td>
                <td className="py-2.5">
                  <DimStatus dim={dim} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

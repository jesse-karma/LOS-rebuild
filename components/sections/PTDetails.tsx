import { ICProject } from "@/data/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { ExternalLink } from "lucide-react";

interface Props {
  project: ICProject;
  /** Field-level access: SLIK columns are hidden from Legal/Finance. */
  showSlik?: boolean;
}

export function PTDetails({ project, showSlik = true }: Props) {
  return (
    <SectionCard title="PT Details">
      <div className="mt-2 overflow-x-auto -mx-1">
        <table className={`w-full text-xs ${showSlik ? "min-w-[700px]" : "min-w-[520px]"}`}>
          <thead>
            <tr className="border-b text-gray-400 text-left">
              <th className="pb-2 pr-3 font-medium">PT Record</th>
              <th className="pb-2 pr-3 font-medium">Bank</th>
              <th className="pb-2 pr-3 font-medium">Account Number</th>
              <th className="pb-2 pr-3 font-medium">Accountholder Name</th>
              {showSlik && (
                <>
                  <th className="pb-2 pr-3 font-medium">SLIK-PT File URL</th>
                  <th className="pb-2 pr-3 font-medium">SLIK-PT Exec Summary</th>
                </>
              )}
              <th className="pb-2 font-medium">Warnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {project.ptDetails.map((pt) => {
              const nameMismatch = pt.accountholderName !== pt.name;
              const allWarnings = [
                ...(nameMismatch ? ["Mismatch on accountholder and PT names"] : []),
                ...pt.warnings,
              ];

              return (
                <tr key={pt.id} className="align-top">
                  <td className="py-3 pr-3 font-semibold text-gray-900">{pt.name}</td>
                  <td className="py-3 pr-3 text-gray-700">{pt.bank}</td>
                  <td className="py-3 pr-3">
                    <span className="font-mono text-gray-800">{pt.accountNumber}</span>
                  </td>
                  <td className={`py-3 pr-3 ${nameMismatch ? "text-amber-700 font-medium" : "text-gray-700"}`}>
                    {pt.accountholderName}
                  </td>
                  {showSlik && (
                    <>
                      <td className="py-3 pr-3">
                        {pt.slikFileUrl ? (
                          <a
                            href={pt.slikFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-red-600 font-medium">Missing ⚠️</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 max-w-[200px]">
                        {pt.slikExecSummary ? (
                          <div className="bg-pink-50 border border-pink-200 rounded px-2 py-1.5 text-gray-800 leading-relaxed">
                            {pt.slikExecSummary}
                          </div>
                        ) : (
                          <span className="text-red-600 font-medium">Missing ⚠️</span>
                        )}
                      </td>
                    </>
                  )}
                  <td className="py-3 max-w-[180px]">
                    {allWarnings.length > 0 ? (
                      <ul className="space-y-1">
                        {allWarnings.map((w, i) => (
                          <li key={i} className="text-amber-700 text-[11px] bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            {w}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!showSlik && (
          <p className="text-[11px] text-gray-400 mt-2 px-1">
            SLIK details are visible to the Investments Team, Credit Ops Team, and IC only.
          </p>
        )}
      </div>
    </SectionCard>
  );
}

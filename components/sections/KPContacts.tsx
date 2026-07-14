import { ICProject } from "@/data/types";
import { SectionCard } from "@/components/ui/SectionCard";
import { fmt } from "@/components/ui/DataRow";
import { ExternalLink } from "lucide-react";

interface Props {
  project: ICProject;
  /** Field-level access: SLIK files, exec summaries, and UBO exposure are hidden from Legal/Finance. */
  showSlik?: boolean;
}

export function KPContacts({ project, showSlik = true }: Props) {
  const hasSlikMissing = project.kpContacts.some((c) => c.isKeyPerson && !c.slikFileUrl);

  const badge =
    showSlik && hasSlikMissing ? (
      <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
        SLIK missing
      </span>
    ) : null;

  return (
    <SectionCard title="Karmapreneur Contacts" badge={badge}>
      <div className="mt-2 overflow-x-auto -mx-1">
        <table className={`w-full text-xs ${showSlik ? "min-w-[700px]" : "min-w-[520px]"}`}>
          <thead>
            <tr className="border-b text-gray-400 text-left">
              <th className="pb-2 pr-2 font-medium w-6">#</th>
              <th className="pb-2 pr-3 font-medium">Name</th>
              <th className="pb-2 pr-3 font-medium">Role</th>
              <th className="pb-2 pr-3 font-medium">Notes</th>
              <th className="pb-2 pr-3 font-medium">Connections</th>
              <th className="pb-2 pr-3 font-medium">Key Person?</th>
              {showSlik && (
                <>
                  <th className="pb-2 pr-3 font-medium">SLIK-Key Person File URL</th>
                  <th className="pb-2 pr-3 font-medium">SLIK-Key Person Exec Summary</th>
                  <th className="pb-2 font-medium">UBO Exposure</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {project.kpContacts.map((contact, i) => {
              const connectionParts: string[] = [];
              if (contact.referredProjects.length > 0) {
                connectionParts.push(`Referror of ${contact.referredProjects.join(", ")}`);
              }
              if (contact.associatedKPs.length > 0) {
                connectionParts.push(`Associated with other Karmapreneurs of ${contact.associatedKPs.join(", ")}`);
              }

              return (
                <tr key={contact.id} className="align-top">
                  <td className="py-3 pr-2 text-gray-400 font-medium">{i + 1}</td>
                  <td className="py-3 pr-3 font-semibold text-gray-900 whitespace-nowrap">
                    {contact.name}
                  </td>
                  <td className="py-3 pr-3 text-gray-700">{contact.role}</td>
                  <td className="py-3 pr-3 text-gray-700 max-w-[180px]">
                    {contact.notesOnPerson || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 pr-3 text-gray-700">
                    {connectionParts.length > 0 ? (
                      <div className="space-y-0.5">
                        {connectionParts.map((c, j) => <div key={j}>{c}</div>)}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-gray-700">
                    {contact.isKeyPerson ? "Yes" : "No"}
                  </td>
                  {showSlik && (
                    <>
                      <td className="py-3 pr-3">
                        {contact.slikFileUrl ? (
                          <a
                            href={contact.slikFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : contact.isKeyPerson ? (
                          <span className="text-red-600 font-medium">Missing ⚠️</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 max-w-[200px]">
                        {contact.slikExecSummary ? (
                          <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1.5 text-gray-800 leading-relaxed">
                            {contact.slikExecSummary}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-700">
                        {contact.uboExposure > 0 ? (
                          <span className="font-medium">{fmt(contact.uboExposure)}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!showSlik && (
          <p className="text-[11px] text-gray-400 mt-2 px-1">
            SLIK &amp; UBO exposure details are visible to the Investments Team, Credit Ops Team, and IC only.
          </p>
        )}
      </div>
    </SectionCard>
  );
}

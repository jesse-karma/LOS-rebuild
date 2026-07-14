import Link from "next/link";
import { mockProjects } from "@/data/mock";
import { computeWarnings } from "@/lib/warnings";
import { Tag, approvalTypeVariant, assetClassVariant } from "@/components/ui/Tag";
import { fieldGuideHtmlPath, fieldGuideSlugForProjectId } from "@/lib/fieldGuideSlug";

function fmt(n: number): string {
  return `IDR ${new Intl.NumberFormat("id-ID").format(n)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function FieldGuideIndexPage() {
  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          ← Back to pending reviews
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">Interactive field guide</h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Pick a project to open the static field guide (same markup as{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">public/field-guide.html</code>
          ). The list below is built from the same <code className="text-xs bg-gray-100 px-1 rounded">mockProjects</code>{" "}
          array as the home page, so new mock rows appear here automatically.
        </p>
      </div>

      <div className="space-y-3">
        {mockProjects.map((project) => {
          const warnings = computeWarnings(project);
          const errorCount = warnings.filter((w) => w.level === "error").length;
          const warnCount = warnings.filter((w) => w.level === "warn").length;
          const hasIssues = errorCount > 0 || warnCount > 0;
          const slug = fieldGuideSlugForProjectId(project.id);
          const href = fieldGuideHtmlPath(slug);

          return (
            <a
              key={project.id}
              href={href}
              className="block bg-white border border-gray-200 rounded-xl px-6 py-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-gray-500">{project.brandName}</span>
                    {project.brandIsNew && (
                      <span className="text-xs bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded">New KP</span>
                    )}
                    <Tag label={project.assetClass} variant={assetClassVariant(project.assetClass)} />
                    {project.syariah && <Tag label="Syariah" variant="syariah" />}
                  </div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h2 className="text-base font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                      {project.projectName}
                    </h2>
                    <span className="text-sm font-semibold text-gray-700 shrink-0">
                      {project.requestedAmountCurrency === "IDR"
                        ? fmt(project.trancheTargetAmount ?? project.requestedAmount)
                        : `USD ${(project.trancheTargetAmount ?? project.requestedAmount).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-500">
                    <span>
                      <span className="text-gray-400">Analyst:</span> {project.pic.primaryAnalyst}
                    </span>
                    <span>·</span>
                    <span>
                      <span className="text-gray-400">By:</span> {project.pic.submitter}
                    </span>
                    <span>·</span>
                    <span>Submitted {fmtDate(project.submittedAt)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Tag label={project.approvalType} variant={approvalTypeVariant(project.approvalType)} />
                  {hasIssues && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {errorCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded">
                          {errorCount} error{errorCount > 1 ? "s" : ""}
                        </span>
                      )}
                      {warnCount > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded">
                          {warnCount} warning{warnCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-gray-400">
                    {project.icVotes.filter((v) => v.vote !== null).length}/{project.icVotes.length} voted
                  </span>
                  <span className="text-[10px] text-indigo-500 font-medium">Open field guide →</span>
                </div>
              </div>

              {hasIssues && (
                <div className="mt-3 border-t border-gray-50 pt-3 space-y-1">
                  {warnings.slice(0, 2).map((w, i) => (
                    <div
                      key={i}
                      className={`text-xs flex items-start gap-1.5 ${w.level === "error" ? "text-red-600" : "text-amber-600"}`}
                    >
                      <span className="shrink-0">{w.level === "error" ? "✖" : "▲"}</span>
                      <span className="line-clamp-2">{w.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

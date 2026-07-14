import { NextResponse } from "next/server";
import { mockProjects } from "@/data/mock";
import { computeWarnings } from "@/lib/warnings";
import {
  fieldGuideSlugForProjectId,
  fieldGuideHtmlPath,
  FIELD_GUIDE_TOPBAR_LABEL,
} from "@/lib/fieldGuideSlug";

function fmtIdr(n: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(n)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function GET() {
  const projects = mockProjects.map((p) => {
    const slug = fieldGuideSlugForProjectId(p.id);
    const warnings = computeWarnings(p);
    const errors = warnings.filter((w) => w.level === "error");
    const warns = warnings.filter((w) => w.level === "warn");
    const amt =
      p.requestedAmountCurrency === "IDR"
        ? fmtIdr(p.trancheTargetAmount ?? p.requestedAmount)
        : `USD ${(p.trancheTargetAmount ?? p.requestedAmount).toLocaleString("en-US")}`;
    const voted = p.icVotes.filter((v) => v.vote !== null).length;
    const voteLabel = `${voted}/${p.icVotes.length} voted`;

    return {
      slug,
      topbarLabel: FIELD_GUIDE_TOPBAR_LABEL[slug] ?? slug,
      href: fieldGuideHtmlPath(slug),
      brandName: p.brandName,
      brandIsNew: p.brandIsNew,
      assetClass: p.assetClass,
      syariah: p.syariah,
      approvalType: p.approvalType,
      projectName: p.projectName,
      amountLabel: amt,
      primaryAnalyst: p.pic.primaryAnalyst,
      submitter: p.pic.submitter,
      submittedLabel: fmtDate(p.submittedAt),
      voteLabel,
      errorCount: errors.length,
      warnCount: warns.length,
      issueLines: warnings.slice(0, 2).map((w) => ({ level: w.level, message: w.message })),
    };
  });

  return NextResponse.json({ projects });
}

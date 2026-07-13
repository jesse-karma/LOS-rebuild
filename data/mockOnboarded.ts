import { ApprovalType } from "@/data/types";

/**
 * Onboarded projects — approved by IC and disbursed. Lightweight display rows
 * for the home page's Onboarded tab (prototype: no full ICProject behind them).
 */
export interface OnboardedProject {
  id: string;
  brandName: string;
  projectName: string;
  approvalType: ApprovalType;
  assetClass: string;
  requestedAmountCurrency: "IDR" | "USD";
  amount: number;
  primaryAnalyst: string;
  secondaryAnalyst: string | null;
  icApprovedAt: string; // ISO date
  onboardedAt: string; // ISO date — first disbursement / facility activation
}

export const mockOnboarded: OnboardedProject[] = [
  {
    id: "onb-holycow-3",
    brandName: "Steak Hotel by Holycow",
    projectName: "Steak Hotel by Holycow (#3) — Branch Opening: Bintaro",
    approvalType: "Project",
    assetClass: "A",
    requestedAmountCurrency: "IDR",
    amount: 1_800_000_000,
    primaryAnalyst: "Priska Ponggawa",
    secondaryAnalyst: "Nila Layla Melinda",
    icApprovedAt: "2026-05-12",
    onboardedAt: "2026-05-20",
  },
  {
    id: "onb-shushu-2",
    brandName: "Shushu",
    projectName: "Shushu (#2) — Central Kitchen Buildout",
    approvalType: "Project",
    assetClass: "A",
    requestedAmountCurrency: "IDR",
    amount: 2_200_000_000,
    primaryAnalyst: "Priska Ponggawa",
    secondaryAnalyst: null,
    icApprovedAt: "2026-04-02",
    onboardedAt: "2026-04-10",
  },
  {
    id: "onb-cum-25",
    brandName: "Cipta Usaha Media",
    projectName: "Cipta Usaha Media (#25) — PO - Orang Tua (Jan 2026)",
    approvalType: "PO/Invoice",
    assetClass: "B - PO",
    requestedAmountCurrency: "IDR",
    amount: 4_000_000_000,
    primaryAnalyst: "Nila Layla Melinda",
    secondaryAnalyst: null,
    icApprovedAt: "2026-01-15",
    onboardedAt: "2026-01-22",
  },
];

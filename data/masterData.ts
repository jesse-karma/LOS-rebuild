/**
 * Master data hardcoded from "LOS Master Data - ENUM Reference.md" (Coda export).
 * Fields backed by one of these lists are CLOSED ENUMS in the production database;
 * everything else on the submission form is free input.
 *
 * Asset Class enum simplified to A, B - I, B - PO, D (July 2026 product call:
 * park C and E for now; the reference doc's O and E rows are dead data).
 */

// ─── §1 Lead Status (lifecycle subset covered by this app) ───────────────────

export interface LeadStatus {
  code: string;
  label: string;
  stage: "Before IC Review" | "During IC Review" | "After IC Review";
}

export const LEAD_STATUS_FUNDING_LEAD: LeadStatus = {
  code: "2",
  label: "2. Funding Lead",
  stage: "Before IC Review",
};

export const LEAD_STATUS_DUE_DILIGENCE: LeadStatus = {
  code: "3",
  label: "3. Due Diligence",
  stage: "Before IC Review",
};

export const LEAD_STATUS_DISCUSSING_RETURN: LeadStatus = {
  code: "3.9",
  label: "3.9 Discussing Return/Repayment Options",
  stage: "Before IC Review",
};

export const LEAD_STATUS_IC_CREDIT_REVIEW: LeadStatus = {
  code: "IC",
  label: "IC Credit Review",
  stage: "During IC Review",
};

// ─── §2 Request State ─────────────────────────────────────────────────────────

export const REQUEST_STATES = [
  "Not Submitted",
  "Pending review",
  "Pre-Approved",
  "Approved",
  "Rejected",
] as const;

export type RequestState = (typeof REQUEST_STATES)[number];

// ─── §4 Asset Class ───────────────────────────────────────────────────────────

export const ASSET_CLASSES = ["A", "B - I", "B - PO", "D"] as const;

export type MasterAssetClass = (typeof ASSET_CLASSES)[number];

// ─── §3 Approval Type → allowed asset classes ────────────────────────────────
// Keys match the app's existing ApprovalType strings (data/types.ts).

export const APPROVAL_TYPE_ASSET_CLASSES: Record<string, MasterAssetClass[]> = {
  Project: ["A", "D"],
  "PO/Invoice": ["B - I", "B - PO"],
  "Project+Plafond": ["D"],
  "PO/Invoice+Plafond": ["B - I", "B - PO"],
  Plafond: ["D", "B - PO", "B - I"],
};

export function approvalTypesForAssetClass(assetClass: string): string[] {
  return Object.entries(APPROVAL_TYPE_ASSET_CLASSES)
    .filter(([, classes]) => classes.includes(assetClass as MasterAssetClass))
    .map(([type]) => type);
}

// ─── §6 Type label → derived from Asset Class ────────────────────────────────
// The "Type" tag shown to users (home table, project header, KP page) describes
// the financing shape, not the Approval Type enum — auto-derived from Asset Class.

const ASSET_CLASS_TYPE_LABELS: Record<MasterAssetClass, string> = {
  A: "Branch Opening",
  "B - I": "Invoice Financing",
  "B - PO": "PO Financing",
  D: "Working Capital",
};

export function typeLabelForAssetClass(assetClass: string): string {
  return ASSET_CLASS_TYPE_LABELS[assetClass as MasterAssetClass] ?? assetClass;
}

// ─── §5b Financing Type → Asset Class ─────────────────────────────────────────
// Per product spec: Asset A/D choose among four return types; Asset B is Daily
// Interest only (values match the strings below, kept independent of §5 since
// that mapping doesn't cleanly separate by asset class). B - I and B - PO share
// the same allowed financing types.

export type AssetClassGroup = "A" | "D" | "B";

export function assetClassGroup(assetClass: string): AssetClassGroup {
  if (assetClass === "A") return "A";
  if (assetClass === "D") return "D";
  return "B";
}

export const ASSET_CLASS_FINANCING_TYPES: Record<AssetClassGroup, string[]> = {
  A: ["Revenue Share", "Fixed Amount Repayment", "Fixed Amount Repayment + Revenue Share", "Profit Share"],
  D: ["Revenue Share", "Fixed Amount Repayment", "Fixed Amount Repayment + Revenue Share", "Profit Share"],
  B: ["Daily Interest"],
};

export function financingTypesForAssetClass(assetClass: string): string[] {
  return ASSET_CLASS_FINANCING_TYPES[assetClassGroup(assetClass)];
}

// ─── §5 Return Types → applicable approval types ─────────────────────────────

export const RETURN_TYPE_APPROVAL_TYPES: Record<string, string[]> = {
  "Revenue Share": ["Project"],
  "Daily Interest": ["PO/Invoice", "PO/Invoice+Plafond", "Plafond", "Project", "Project+Plafond"],
  "Fixed Amount Repayment + Revenue Share": ["Project", "Project+Plafond"],
  "Fixed Amount Repayment": ["Project", "Project+Plafond", "Plafond"],
  "Profit Share": ["Project"],
};

export const MASTER_RETURN_TYPES = Object.keys(RETURN_TYPE_APPROVAL_TYPES);

export function returnTypesForApprovalType(approvalType: string): string[] {
  return MASTER_RETURN_TYPES.filter((rt) =>
    RETURN_TYPE_APPROVAL_TYPES[rt].includes(approvalType)
  );
}

/** Intersection of what's legal for this Asset Class and this Submission Type. */
export function financingTypesForAssetClassAndApprovalType(assetClass: string, approvalType: string): string[] {
  const byApprovalType = returnTypesForApprovalType(approvalType);
  return financingTypesForAssetClass(assetClass).filter((t) => byApprovalType.includes(t));
}

// ─── §12 Funding Source ───────────────────────────────────────────────────────

export const FUNDING_SOURCES = ["Members", "KF/ KCF/KS", "TradingCo"] as const;

// ─── §13 Referral Source ──────────────────────────────────────────────────────

export const REFERRAL_SOURCES = [
  "Cold calling",
  "Karma.Club Website",
  "KarmaClub Member",
  "Karmapreneur",
  "2nd+ Project",
  "Karma Node",
  "Ex-Karma Staff",
  "Karma Staff",
  "Potential Karmapreneur",
] as const;

// ─── §13b Referral Source → Human / Marketing ────────────────────────────────
// Marketing channels (cold outreach, the website) have no person behind them,
// so there's no Referror to record. Every other source is a human, identified
// by name on the submission form — see classifyReferror() there.

export const MARKETING_REFERRAL_SOURCES = ["Cold calling", "Karma.Club Website"] as const;

// ─── §16 Structured Loan Use (Financing Use) ─────────────────────────────────

export const STRUCTURED_LOAN_USES = [
  "Branch Opening/Expansion",
  "Branch Renovation",
  "Rent-Only Financing",
  "Factory Expansion",
  "Moveable Asset Financing",
  "Export Invoice Financing",
  "Export PO Financing",
  "Domestic Invoice Financing",
  "Domestic PO Financing",
  "Temp Financing",
  "Previous Investor Buyout",
  "Working Capital Financing",
  "Movie/Concert",
  "Agri Plot Growing",
  "General Equity",
] as const;

// ─── §19 Sector ───────────────────────────────────────────────────────────────

export const SECTORS = [
  "Agriculture",
  "Commodities Trading, Processing, & Distribution",
  "Agencies",
  "Retail Brands",
  "Assorted Retail Services",
  "Entertainment",
  "F&B",
  "Sports, Recreation, and Wellness",
  "Healthcare and Petcare Clinics",
  "Hotel and Tourism",
  "Assorted B2B Services and Manufacturing",
  "Other",
] as const;

// ─── §20 Sub-Sector (83 entries, mapped to parent Sector) ────────────────────

export const SUB_SECTORS: Array<{ name: string; sector: string }> = [
  { name: "🧑‍🌾Agri-Growing", sector: "Agriculture" },
  { name: "🫘Coffee", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🍚Rice", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "⛽Fuel", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🪨Minerals", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🥥Coconut", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🌴Palm Oil", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🎨Creative Agency", sector: "Agencies" },
  { name: "🎪Activation Agency", sector: "Agencies" },
  { name: "🎈Event Organizing", sector: "Agencies" },
  { name: "🏍️ Workforce Outsourcing", sector: "Agencies" },
  { name: "👄Beauty & Personal Care", sector: "Retail Brands" },
  { name: "👕Fashion & Apparel", sector: "Retail Brands" },
  { name: "🧃🫘Packaged Food, Packaged Beverage, and Roasted Coffee (branded)", sector: "Retail Brands" },
  { name: "🔋Home Appliances", sector: "Retail Brands" },
  { name: "🐕🥫Pet Food", sector: "Retail Brands" },
  { name: "👶Baby & Kids Products", sector: "Retail Brands" },
  { name: "🎹Equipment Rental", sector: "Assorted Retail Services" },
  { name: "🎥Movie", sector: "Entertainment" },
  { name: "🎵Concert", sector: "Entertainment" },
  { name: "🍷Bar", sector: "F&B" },
  { name: "☕Cafe", sector: "F&B" },
  { name: "🍲Full Service Resto", sector: "F&B" },
  { name: "🍔QSR - Full Meal", sector: "F&B" },
  { name: "🧋Snacks, Drinks, & Desserts", sector: "F&B" },
  { name: "🍲Food Court Operation", sector: "F&B" },
  { name: "🥘Catering", sector: "F&B" },
  { name: "🎾Sports Court", sector: "Sports, Recreation, and Wellness" },
  { name: "🛝Playground", sector: "Sports, Recreation, and Wellness" },
  { name: "Electric Charging Station", sector: "Assorted Retail Services" },
  { name: "💪Gym", sector: "Sports, Recreation, and Wellness" },
  { name: "💆‍♀️Massage & Reflexology", sector: "Sports, Recreation, and Wellness" },
  { name: "🧘Yoga Clinic", sector: "Sports, Recreation, and Wellness" },
  { name: "😬Dentist", sector: "Healthcare and Petcare Clinics" },
  { name: "🩺Doctor Clinic (GP and Specialist)", sector: "Healthcare and Petcare Clinics" },
  { name: "💇Beauty Clinic", sector: "Sports, Recreation, and Wellness" },
  { name: "🙆‍♂️Physiotherapy", sector: "Sports, Recreation, and Wellness" },
  { name: "🏅Sports Competition", sector: "Entertainment" },
  { name: "🦐 Seafood", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🗑️ E-Waste", sector: "Assorted B2B Services and Manufacturing" },
  { name: "🚿 Shower Facilities", sector: "Assorted Retail Services" },
  { name: "⚙️ Engineering Products and Services", sector: "Assorted B2B Services and Manufacturing" },
  { name: "🩺Health Supplies", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🥚Eggs", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "Pharmacy", sector: "Healthcare and Petcare Clinics" },
  { name: "🐕🩺Pet Clinic", sector: "Healthcare and Petcare Clinics" },
  { name: "🚐Van Rental", sector: "Hotel and Tourism" },
  { name: "🏠Villa", sector: "Hotel and Tourism" },
  { name: "🏨Hotel", sector: "Hotel and Tourism" },
  { name: "💇Barber", sector: "Assorted Retail Services" },
  { name: "Laundry", sector: "Assorted Retail Services" },
  { name: "💇Salon", sector: "Sports, Recreation, and Wellness" },
  { name: "👝Bag Cleaning and Repair", sector: "Assorted Retail Services" },
  { name: "🏎️Car Wash, Maintenance, and Repair", sector: "Assorted Retail Services" },
  { name: "🅿️Parking Lot", sector: "Assorted Retail Services" },
  { name: "🎒Schools and Education", sector: "Assorted Retail Services" },
  { name: "🏢Coworking Space", sector: "Assorted Retail Services" },
  { name: "🚰Wastewater Treatment", sector: "Assorted B2B Services and Manufacturing" },
  { name: "🛢️Oil and Gas Services", sector: "Assorted B2B Services and Manufacturing" },
  { name: "🤖 Contracted IT Development (spec by client)", sector: "Assorted B2B Services and Manufacturing" },
  { name: "♳ Plastics Manufacturing", sector: "Assorted B2B Services and Manufacturing" },
  { name: "🎽Clothing Manufacturing", sector: "Assorted B2B Services and Manufacturing" },
  { name: "👷Construction", sector: "Assorted B2B Services and Manufacturing" },
  { name: "🏬Department Store", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🥨FMCG Distribution", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🔌Electronics Distribution", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🤖Tech Startups", sector: "Other" },
  { name: "🚚Logistics", sector: "Assorted B2B Services and Manufacturing" },
  { name: "📖Book Store", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "📖Eyewear/Contact Lenses", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🌲Cinnamon", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🧋Tea", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "Fruit Syrup", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🧘Wellness Clinic", sector: "Sports, Recreation, and Wellness" },
  { name: "🍗 Chicken", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "👨‍💻SaaS Software Services", sector: "Assorted B2B Services and Manufacturing" },
  { name: "⚽Sports Equipment", sector: "Assorted Retail Services" },
  { name: "🎮Home Improvement", sector: "Assorted Retail Services" },
  { name: "Assorted Manufacturing", sector: "Assorted B2B Services and Manufacturing" },
  { name: "🐙Octopus", sector: "Commodities Trading, Processing, & Distribution" },
  { name: "🎮Game Development", sector: "Agencies" },
  { name: "📽️Production House", sector: "Agencies" },
  { name: "🗺️Geo and Mapping Services", sector: "Assorted B2B Services and Manufacturing" },
];

export function subSectorsForSector(sector: string): string[] {
  return SUB_SECTORS.filter((s) => s.sector === sector).map((s) => s.name);
}

// ─── §14 Karma Team (people directory, not an enum — names from team table) ──

export const ANALYSTS = [
  "Priska Ponggawa",
  "Nila Layla Melinda",
  "Sharfina Nindita",
  "Juang Angger Pamungkas",
  "Armeno Devan",
  "Wesly Simatupang",
];

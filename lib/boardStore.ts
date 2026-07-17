// Board — pre-submission CRM board (Tend-side).
// Persists to localStorage; no server sync in this prototype.

export type BoardStage = 1 | 2 | 3;

export interface BoardAnalyst {
  id: string;
  name: string;
}

export interface BoardNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface BoardChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface BoardCard {
  id: string;
  kpName: string;
  projectName: string;
  primaryAnalyst: BoardAnalyst | null;
  stage: BoardStage;
  notes: BoardNote[];
  checklist: BoardChecklistItem[];
  createdAt: string;
}

// Fixed template — same items for every card, stamped in at creation time.
export const CHECKLIST_TEMPLATE: Pick<BoardChecklistItem, "id" | "label">[] = [
  { id: "ktp",       label: "KTP / National ID (scanned)" },
  { id: "npwp",      label: "NPWP (Tax ID)" },
  { id: "nib",       label: "NIB / SIUP (Business license)" },
  { id: "fin_stmt",  label: "Last 2 years financial statements" },
  { id: "bank_stmt", label: "Last 3 months bank statements" },
  { id: "slik",      label: "SLIK report obtained" },
  { id: "profile",   label: "Company profile / pitch deck" },
  { id: "revenue",   label: "Revenue & sales data (last 12 months)" },
  { id: "amount",    label: "Financing amount & purpose agreed" },
  { id: "contacts",  label: "Contact details verified (WA + email)" },
  { id: "past",      label: "Past project recap (if existing KP)" },
  { id: "site",      label: "Site / branch visit notes" },
];

const KEY = "board_cards_v2";

export function getCards(): BoardCard[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(cards: BoardCard[]) {
  localStorage.setItem(KEY, JSON.stringify(cards));
}

function blankChecklist(): BoardChecklistItem[] {
  return CHECKLIST_TEMPLATE.map((t) => ({ ...t, done: false }));
}

export function createCard(
  kpName: string,
  projectName: string,
  primaryAnalyst: BoardAnalyst | null
): BoardCard {
  const card: BoardCard = {
    id: `bd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kpName: kpName.trim(),
    projectName: projectName.trim(),
    primaryAnalyst,
    stage: 1,
    notes: [],
    checklist: blankChecklist(),
    createdAt: new Date().toISOString(),
  };
  save([card, ...getCards()]);
  return card;
}

export function updateCard(updated: BoardCard): void {
  save(getCards().map((c) => (c.id === updated.id ? updated : c)));
}

export function deleteCard(id: string): void {
  save(getCards().filter((c) => c.id !== id));
}

export function addNote(cardId: string, text: string): BoardCard | null {
  let result: BoardCard | null = null;
  save(
    getCards().map((c) => {
      if (c.id !== cardId) return c;
      const note: BoardNote = {
        id: `n-${Date.now()}`,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };
      result = { ...c, notes: [...c.notes, note] };
      return result;
    })
  );
  return result;
}

export function toggleChecklist(cardId: string, itemId: string): BoardCard | null {
  let result: BoardCard | null = null;
  save(
    getCards().map((c) => {
      if (c.id !== cardId) return c;
      result = {
        ...c,
        checklist: c.checklist.map((it) =>
          it.id === itemId ? { ...it, done: !it.done } : it
        ),
      };
      return result;
    })
  );
  return result;
}

export function advanceStage(cardId: string): BoardCard | null {
  let result: BoardCard | null = null;
  save(
    getCards().map((c) => {
      if (c.id !== cardId || c.stage >= 3) return c;
      result = { ...c, stage: (c.stage + 1) as BoardStage };
      return result;
    })
  );
  return result;
}

export function moveToStage(cardId: string, stage: BoardStage): BoardCard | null {
  let result: BoardCard | null = null;
  save(
    getCards().map((c) => {
      if (c.id !== cardId || c.stage === stage) return c;
      result = { ...c, stage };
      return result;
    })
  );
  return result;
}

// Seeds example cards the first time the board is opened (only if empty).
export function seedExampleCards(): void {
  if (getCards().length > 0) return;

  const nila: BoardAnalyst = { id: "nila", name: "Nila Layla Melinda" };
  const priska: BoardAnalyst = { id: "priska", name: "Priska Ponggawa" };

  const cards: BoardCard[] = [
    // ── Stage 3 — Due Diligence (5 cards) ──────────────────────────────────
    {
      id: "bd-s3-1",
      kpName: "Banyuwangi Octopus Co.",
      projectName: "WC Facility — Revenue Share",
      primaryAnalyst: priska,
      stage: 3,
      notes: [
        { id: "n-s3-1-a", text: "Great meeting with founder. Keen on revenue-share structure. Cap table sent over — looks clean.", createdAt: "2026-07-08T09:15:00.000Z" },
        { id: "n-s3-1-b", text: "All docs collected. Financials reviewed, no red flags. Ready to move to formal submission.", createdAt: "2026-07-14T14:30:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t) => ({ ...t, done: true })),
      createdAt: "2026-07-01T08:00:00.000Z",
    },
    {
      id: "bd-s3-2",
      kpName: "Cipta Usaha Media",
      projectName: "PO Payroll Financing — Jul 2026",
      primaryAnalyst: nila,
      stage: 3,
      notes: [
        { id: "n-s3-2-a", text: "PO for July payroll to Orang Tua Group confirmed. Payor is blue-chip, terms clear.", createdAt: "2026-07-02T10:00:00.000Z" },
        { id: "n-s3-2-b", text: "SLIK clean. Bank statements show consistent monthly inflow. Sending term sheet Monday.", createdAt: "2026-07-11T15:00:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t) => ({ ...t, done: true })),
      createdAt: "2026-06-28T09:00:00.000Z",
    },
    {
      id: "bd-s3-3",
      kpName: "Elegant Fashion Group",
      projectName: "Plafond Expansion — Asset A",
      primaryAnalyst: priska,
      stage: 3,
      notes: [
        { id: "n-s3-3-a", text: "Existing KP, track record solid — 2 completed projects, zero late payments. Requesting plafond increase to IDR 3B.", createdAt: "2026-06-20T11:00:00.000Z" },
        { id: "n-s3-3-b", text: "Updated financials received. Revenue up 22% YoY. All docs in order.", createdAt: "2026-07-05T09:30:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t) => ({ ...t, done: true })),
      createdAt: "2026-06-18T08:00:00.000Z",
    },
    {
      id: "bd-s3-4",
      kpName: "Prima Karya Konstruksi",
      projectName: "WC Facility — Fixed Return",
      primaryAnalyst: nila,
      stage: 3,
      notes: [
        { id: "n-s3-4-a", text: "Civil contractor, government subcontract pipeline. Fixed-return structure agreed. Director signed off on terms.", createdAt: "2026-07-07T14:00:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t) => ({ ...t, done: true })),
      createdAt: "2026-07-04T10:00:00.000Z",
    },
    {
      id: "bd-s3-5",
      kpName: "Nusantara Digital Hub",
      projectName: "Invoice Financing — Asset B",
      primaryAnalyst: priska,
      stage: 3,
      notes: [
        { id: "n-s3-5-a", text: "SaaS company, invoices from 3 enterprise clients. Invoice amounts verified against contracts.", createdAt: "2026-07-09T10:30:00.000Z" },
        { id: "n-s3-5-b", text: "All 12 items collected. SLIK attached. Ready to go.", createdAt: "2026-07-15T16:00:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t) => ({ ...t, done: true })),
      createdAt: "2026-07-06T09:00:00.000Z",
    },

    // ── Stage 2 — Data Collection (7 cards) ────────────────────────────────
    {
      id: "bd-s2-1",
      kpName: "Lanting Label",
      projectName: "PO Financing — Q3 2026",
      primaryAnalyst: nila,
      stage: 2,
      notes: [
        { id: "n-s2-1-a", text: "Met founder at Fashion Lunch. Asked for a PO-financing explainer — sent across after the event.", createdAt: "2026-07-05T17:00:00.000Z" },
        { id: "n-s2-1-b", text: "Follow-up call done. Confirmed PO amounts and buyer names. Financials incoming next week.", createdAt: "2026-07-10T11:20:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t, i) => ({ ...t, done: i < 7 })),
      createdAt: "2026-07-05T10:00:00.000Z",
    },
    {
      id: "bd-s2-2",
      kpName: "Cahaya Baru Elektronik",
      projectName: "WC Facility — Revenue Share",
      primaryAnalyst: priska,
      stage: 2,
      notes: [
        { id: "n-s2-2-a", text: "Electronics distributor, 4 years operating. Revenue consistent at ~IDR 8B/year. Wants WC to stock up ahead of Lebaran.", createdAt: "2026-06-25T10:00:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t, i) => ({ ...t, done: i < 5 })),
      createdAt: "2026-06-22T09:00:00.000Z",
    },
    {
      id: "bd-s2-3",
      kpName: "Panen Raya Agrikultur",
      projectName: "Harvest Pre-Finance — Revenue Share",
      primaryAnalyst: nila,
      stage: 2,
      notes: [
        { id: "n-s2-3-a", text: "Rice exporter, buyer contracts in hand for Q3 harvest. Revenue-share on export proceeds.", createdAt: "2026-06-30T09:00:00.000Z" },
        { id: "n-s2-3-b", text: "KTP, NPWP, NIB, financials, bank statements, SLIK all received. Waiting on site visit notes.", createdAt: "2026-07-08T11:00:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t, i) => ({ ...t, done: i < 9 })),
      createdAt: "2026-06-28T08:00:00.000Z",
    },
    {
      id: "bd-s2-4",
      kpName: "Moda Kreatif Indonesia",
      projectName: "Plafond New — Asset A",
      primaryAnalyst: priska,
      stage: 2,
      notes: [
        { id: "n-s2-4-a", text: "Apparel brand, primarily sells through Tokopedia and Shopee. New KP — first plafond application. Founder cooperative.", createdAt: "2026-07-01T14:00:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t, i) => ({ ...t, done: i < 3 })),
      createdAt: "2026-06-30T10:00:00.000Z",
    },
    {
      id: "bd-s2-5",
      kpName: "Segar Bugar Catering",
      projectName: "WC Facility — Fixed Return",
      primaryAnalyst: nila,
      stage: 2,
      notes: [
        { id: "n-s2-5-a", text: "Corporate catering, 12 recurring clients including 2 banks. Very stable monthly revenue. Fixed-return preferred.", createdAt: "2026-07-03T10:00:00.000Z" },
        { id: "n-s2-5-b", text: "Almost there — site visit done, just waiting on updated cap table from founder.", createdAt: "2026-07-12T15:30:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t, i) => ({ ...t, done: i < 10 })),
      createdAt: "2026-07-01T09:00:00.000Z",
    },
    {
      id: "bd-s2-6",
      kpName: "Teknologi Maju Digital",
      projectName: "Invoice Financing — Asset B",
      primaryAnalyst: priska,
      stage: 2,
      notes: [
        { id: "n-s2-6-a", text: "IT services firm, invoices from 2 SOEs. Invoice amounts IDR 1.2B total across 3 invoices. Payor risk low.", createdAt: "2026-07-06T13:00:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t, i) => ({ ...t, done: i < 6 })),
      createdAt: "2026-07-04T08:00:00.000Z",
    },
    {
      id: "bd-s2-7",
      kpName: "Rapi Bersih Laundry",
      projectName: "Branch Expansion — WC",
      primaryAnalyst: nila,
      stage: 2,
      notes: [
        { id: "n-s2-7-a", text: "Laundry chain, 8 existing branches in Surabaya. Wants to open 2 more. Founder has clear ops metrics.", createdAt: "2026-07-10T10:00:00.000Z" },
      ],
      checklist: CHECKLIST_TEMPLATE.map((t, i) => ({ ...t, done: i < 2 })),
      createdAt: "2026-07-09T09:00:00.000Z",
    },

    // ── Stage 1 — Lead (9 cards) ────────────────────────────────────────────
    {
      id: "bd-s1-1",
      kpName: "Ciomy",
      projectName: "Agency WC — Initial Exploration",
      primaryAnalyst: nila,
      stage: 1,
      notes: [
        { id: "n-s1-1-a", text: "Warm intro via KP node. Founder open to revenue-share. Wants a one-pager before next call.", createdAt: "2026-07-12T14:20:00.000Z" },
        { id: "n-s1-1-b", text: "Second call done. Met the CFO — will send term sheet outline. Asked for PO checklist from our side.", createdAt: "2026-07-15T10:45:00.000Z" },
      ],
      checklist: blankChecklist(),
      createdAt: "2026-07-12T09:00:00.000Z",
    },
    {
      id: "bd-s1-2",
      kpName: "Kembang Retail",
      projectName: "Plafond Review — Expansion",
      primaryAnalyst: priska,
      stage: 1,
      notes: [
        { id: "n-s1-2-a", text: "Intro call done. Looking to expand to 3 new branches in Bandung. Needs plafond increase to IDR 5B.", createdAt: "2026-07-03T16:00:00.000Z" },
      ],
      checklist: blankChecklist(),
      createdAt: "2026-07-03T15:00:00.000Z",
    },
    {
      id: "bd-s1-3",
      kpName: "Karya Mandiri Tekstil",
      projectName: "PO Financing — Garment Export",
      primaryAnalyst: nila,
      stage: 1,
      notes: [
        { id: "n-s1-3-a", text: "Textile manufacturer, exports to Middle East. PO from Saudi buyer for IDR 2.5B. First contact went well.", createdAt: "2026-07-11T11:00:00.000Z" },
      ],
      checklist: blankChecklist(),
      createdAt: "2026-07-11T10:00:00.000Z",
    },
    {
      id: "bd-s1-4",
      kpName: "Studio Tiga Roda",
      projectName: "Content Production WC",
      primaryAnalyst: priska,
      stage: 1,
      notes: [
        { id: "n-s1-4-a", text: "Creative production house, 3 ongoing brand contracts. Monthly retainer revenue ~IDR 800M. Needs WC for crew payroll between billing cycles.", createdAt: "2026-07-13T09:30:00.000Z" },
        { id: "n-s1-4-b", text: "Second meeting. Director shared P&L — margins healthy. Exploring fixed-return or revenue-share.", createdAt: "2026-07-16T14:00:00.000Z" },
      ],
      checklist: blankChecklist(),
      createdAt: "2026-07-13T09:00:00.000Z",
    },
    {
      id: "bd-s1-5",
      kpName: "Mitra Jaya Seafood",
      projectName: "Cold Chain WC Facility",
      primaryAnalyst: nila,
      stage: 1,
      notes: [
        { id: "n-s1-5-a", text: "Seafood distributor, supplies 5 hotel chains in Bali. Seasonal cash flow gap every Q2. Wants IDR 1.5B WC.", createdAt: "2026-07-14T15:00:00.000Z" },
      ],
      checklist: blankChecklist(),
      createdAt: "2026-07-14T14:00:00.000Z",
    },
    {
      id: "bd-s1-6",
      kpName: "Batik Nusantara",
      projectName: "Heritage Collection — Plafond New",
      primaryAnalyst: priska,
      stage: 1,
      notes: [],
      checklist: blankChecklist(),
      createdAt: "2026-07-15T08:00:00.000Z",
    },
    {
      id: "bd-s1-7",
      kpName: "Sinar Harapan Logistics",
      projectName: "Fleet Expansion — Asset B",
      primaryAnalyst: nila,
      stage: 1,
      notes: [
        { id: "n-s1-7-a", text: "Last-mile logistics, 40 trucks. Invoice from Lazada for fulfilled deliveries. Wants to add 10 more trucks. Referral from Banyuwangi Octopus.", createdAt: "2026-07-16T10:00:00.000Z" },
      ],
      checklist: blankChecklist(),
      createdAt: "2026-07-16T09:30:00.000Z",
    },
    {
      id: "bd-s1-8",
      kpName: "Kedai Kopi Archipelago",
      projectName: "Multi-Branch WC",
      primaryAnalyst: priska,
      stage: 1,
      notes: [
        { id: "n-s1-8-a", text: "Specialty coffee chain, 12 branches in Jakarta. Expansion plan to Surabaya. Same founder as a completed KP — strong relationship.", createdAt: "2026-07-10T16:00:00.000Z" },
        { id: "n-s1-8-b", text: "Third meeting. COO joining next call. They want to move fast — target disburse before August.", createdAt: "2026-07-14T11:00:00.000Z" },
      ],
      checklist: blankChecklist(),
      createdAt: "2026-07-10T15:00:00.000Z",
    },
    {
      id: "bd-s1-9",
      kpName: "Griya Sehat Farmasi",
      projectName: "Pharma Distribution WC",
      primaryAnalyst: nila,
      stage: 1,
      notes: [
        { id: "n-s1-9-a", text: "Pharmaceutical distributor, supplies clinics and hospitals in West Java. Very stable demand. First call went well — sharing financials next week.", createdAt: "2026-07-16T13:30:00.000Z" },
      ],
      checklist: blankChecklist(),
      createdAt: "2026-07-16T13:00:00.000Z",
    },
  ];

  save(cards);
}

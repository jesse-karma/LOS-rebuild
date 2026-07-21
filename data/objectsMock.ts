// Mock fixtures for the Objects layer (Payors / PT registry / Invoices / Feed / Tasks) —
// see the "Objects layer" section at the end of types.ts for the entity shapes.
// Cross-linked to mockProjects (data/mock.ts) and ANALYSTS (data/masterData.ts) so
// relatedKP / relatedProjectId / owner values resolve to real fixtures rather than
// dangling strings.

import { FeedItem, InvoiceRecord, Payor, PTRegistryEntry, TaskItem } from "./types";
import { ANALYSTS } from "./masterData";

// ─── Payors ───────────────────────────────────────────────────────────────────

export const mockPayors: Payor[] = [
  {
    id: "payor-indomaret",
    name: "PT Indomarco Prismatama (Indomaret)",
    payorType: "Tier 1 Conglomerate/Private Company",
    relatedKP: "Cahaya Energi Asia",
    relatedProjectId: "proj-cea-aztech",
    exposure: 850_000_000,
    riskLevel: "Low",
  },
  {
    id: "payor-alfamart",
    name: "PT Sumber Alfaria Trijaya (Alfamart)",
    payorType: "Tier 1 Conglomerate/Private Company",
    relatedKP: "Distribusi Pangan Sejahtera",
    relatedProjectId: "proj-distribusi-pangan",
    exposure: 620_000_000,
    riskLevel: "Low",
  },
  {
    id: "payor-pertamina",
    name: "PT Pertamina (Persero)",
    payorType: "Tier 1 BUMN",
    relatedKP: "Karya Logistik Prima",
    relatedProjectId: "proj-karya-logistik",
    exposure: 1_450_000_000,
    riskLevel: "Low",
  },
  {
    id: "payor-pln",
    name: "PT PLN (Persero)",
    payorType: "Tier 1 BUMN",
    relatedKP: "Elektronik Jaya Abadi",
    relatedProjectId: "proj-elektronik-jaya",
    exposure: 390_000_000,
    riskLevel: "Medium",
  },
  {
    id: "payor-kabupaten-bogor",
    name: "Pemerintah Kabupaten Bogor",
    payorType: "National/Regional Government",
    relatedKP: "Agro Makmur Distribusi",
    relatedProjectId: "proj-agro-makmur",
    exposure: 210_000_000,
    riskLevel: "Medium",
  },
  {
    id: "payor-mitra10",
    name: "PT Kawan Lama Sejahtera (Mitra10)",
    payorType: "Tier 2 Conglomerate/Private Company",
    relatedKP: "Toko Bangunan Sentosa",
    relatedProjectId: "proj-toko-bangunan",
    exposure: 175_000_000,
    riskLevel: "Medium",
  },
  {
    id: "payor-transmart",
    name: "PT Trans Retail Indonesia (Transmart)",
    payorType: "Tier 2 Conglomerate/Private Company",
    relatedKP: "Grosir Sembako Makmur",
    relatedProjectId: "proj-grosir-sembako-plafond",
    exposure: 540_000_000,
    riskLevel: "Low",
  },
  {
    id: "payor-cocacola-amatil",
    name: "PT Coca-Cola Europacific Partners Indonesia",
    payorType: "Tier 1 Foreign Government/Multi-Laterals",
    relatedKP: "Dapur Cokelat",
    relatedProjectId: "proj-dc-plafond-hist",
    exposure: 95_000_000,
    riskLevel: "Low",
  },
  {
    id: "payor-warung-mitra-budi",
    name: "Warung Mitra Budi (individual reseller)",
    payorType: "KP SME",
    relatedKP: "Distribusi Pangan Sejahtera",
    relatedProjectId: "proj-distribusi-pangan",
    exposure: 32_000_000,
    riskLevel: "Elevated",
  },
  {
    id: "payor-toko-jaya-abadi",
    name: "Toko Jaya Abadi (independent retailer)",
    payorType: "Other SME",
    relatedKP: "Karya Logistik Prima",
    relatedProjectId: "proj-karya-logistik",
    exposure: 48_000_000,
    riskLevel: "Elevated",
  },
];

export function getPayorById(id: string): Payor | undefined {
  return mockPayors.find((p) => p.id === id);
}

// ─── PT registry ──────────────────────────────────────────────────────────────

export const mockPTRegistry: PTRegistryEntry[] = [
  {
    id: "pt-cea-aztech",
    ptName: "PT Cahaya Energi Asia",
    bank: "BCA",
    accountNumber: "0123456789",
    accountholderName: "PT Cahaya Energi Asia",
    relatedKP: "Cahaya Energi Asia",
    slikPtStatus: "Performing",
  },
  {
    id: "pt-distribusi-pangan",
    ptName: "PT Distribusi Pangan Sejahtera",
    bank: "Mandiri",
    accountNumber: "1300987654",
    accountholderName: "PT Distribusi Pangan Sejahtera",
    relatedKP: "Distribusi Pangan Sejahtera",
    slikPtStatus: "Performing",
  },
  {
    id: "pt-karya-logistik",
    ptName: "PT Karya Logistik Prima",
    bank: "BNI",
    accountNumber: "0456123789",
    accountholderName: "PT Karya Logistik Prima",
    relatedKP: "Karya Logistik Prima",
    slikPtStatus: "Review",
  },
  {
    id: "pt-elektronik-jaya",
    ptName: "PT Elektronik Jaya Abadi",
    bank: "BRI",
    accountNumber: "0987654321",
    accountholderName: "PT Elektronik Jaya Abadi",
    relatedKP: "Elektronik Jaya Abadi",
    slikPtStatus: "Performing",
  },
  {
    id: "pt-agro-makmur",
    ptName: "PT Agro Makmur Distribusi",
    bank: "BCA",
    accountNumber: "0234567891",
    accountholderName: "PT Agro Makmur Distribusi",
    relatedKP: "Agro Makmur Distribusi",
    slikPtStatus: "Pending",
  },
  {
    id: "pt-toko-bangunan",
    ptName: "PT Toko Bangunan Sentosa",
    bank: "Mandiri",
    accountNumber: "1345678902",
    accountholderName: "PT Toko Bangunan Sentosa",
    relatedKP: "Toko Bangunan Sentosa",
    slikPtStatus: "Performing",
  },
  {
    id: "pt-grosir-sembako",
    ptName: "PT Grosir Sembako Makmur",
    bank: "BNI",
    accountNumber: "0567891234",
    accountholderName: "PT Grosir Sembako Makmur",
    relatedKP: "Grosir Sembako Makmur",
    slikPtStatus: "Performing",
  },
  {
    id: "pt-dapur-cokelat",
    ptName: "PT Dapur Cokelat Indonesia",
    bank: "BCA",
    accountNumber: "TBD",
    accountholderName: "PT Dapur Cokelat Indonesia",
    relatedKP: "Dapur Cokelat",
    slikPtStatus: "Missing",
  },
  {
    id: "pt-tekstil-makmur",
    ptName: "PT Tekstil Makmur Sentosa",
    bank: "BRI",
    accountNumber: "0678912345",
    accountholderName: "PT Tekstil Makmur Sentosa",
    relatedKP: "Tekstil Makmur Sentosa",
    slikPtStatus: "Review",
  },
];

export function getPTRegistryEntryById(id: string): PTRegistryEntry | undefined {
  return mockPTRegistry.find((p) => p.id === id);
}

// ─── Invoices & POs ───────────────────────────────────────────────────────────

export const mockInvoices: InvoiceRecord[] = [
  {
    id: "inv-po-1024",
    documentNumber: "PO-1024",
    docType: "PO",
    payorId: "payor-indomaret",
    payorName: "PT Indomarco Prismatama (Indomaret)",
    relatedKP: "Cahaya Energi Asia",
    relatedProjectId: "proj-cea-aztech",
    amount: 420_000_000,
    dueDate: "2026-08-15",
    status: "Financed – Performing",
  },
  {
    id: "inv-inv-2031",
    documentNumber: "INV-2031",
    docType: "Invoice",
    payorId: "payor-alfamart",
    payorName: "PT Sumber Alfaria Trijaya (Alfamart)",
    relatedKP: "Distribusi Pangan Sejahtera",
    relatedProjectId: "proj-distribusi-pangan",
    amount: 310_000_000,
    dueDate: "2026-07-30",
    status: "Financed – In IC",
  },
  {
    id: "inv-po-1031",
    documentNumber: "PO-1031",
    docType: "PO",
    payorId: "payor-pertamina",
    payorName: "PT Pertamina (Persero)",
    relatedKP: "Karya Logistik Prima",
    relatedProjectId: "proj-karya-logistik",
    amount: 725_000_000,
    dueDate: "2026-07-05",
    status: "Overdue",
    dpd: 16,
  },
  {
    id: "inv-inv-2044",
    documentNumber: "INV-2044",
    docType: "Invoice",
    payorId: "payor-pln",
    payorName: "PT PLN (Persero)",
    relatedKP: "Elektronik Jaya Abadi",
    relatedProjectId: "proj-elektronik-jaya",
    amount: 195_000_000,
    dueDate: "2026-08-01",
    status: "Financed – Performing",
  },
  {
    id: "inv-po-1039",
    documentNumber: "PO-1039",
    docType: "PO",
    payorId: "payor-kabupaten-bogor",
    payorName: "Pemerintah Kabupaten Bogor",
    relatedKP: "Agro Makmur Distribusi",
    relatedProjectId: "proj-agro-makmur",
    amount: 140_000_000,
    dueDate: "2026-06-20",
    status: "Overdue",
    dpd: 31,
  },
  {
    id: "inv-inv-2057",
    documentNumber: "INV-2057",
    docType: "Invoice",
    payorId: "payor-mitra10",
    payorName: "PT Kawan Lama Sejahtera (Mitra10)",
    relatedKP: "Toko Bangunan Sentosa",
    relatedProjectId: "proj-toko-bangunan",
    amount: 88_000_000,
    dueDate: "2026-08-10",
    status: "Financed – Performing",
  },
  {
    id: "inv-inv-2061",
    documentNumber: "INV-2061",
    docType: "Invoice",
    payorId: "payor-transmart",
    payorName: "PT Trans Retail Indonesia (Transmart)",
    relatedKP: "Grosir Sembako Makmur",
    relatedProjectId: "proj-grosir-sembako-plafond",
    amount: 260_000_000,
    dueDate: "2026-07-22",
    status: "Financed – Performing",
  },
  {
    id: "inv-po-1046",
    documentNumber: "PO-1046",
    docType: "PO",
    payorId: "payor-warung-mitra-budi",
    payorName: "Warung Mitra Budi (individual reseller)",
    relatedKP: "Distribusi Pangan Sejahtera",
    relatedProjectId: "proj-distribusi-pangan",
    amount: 22_000_000,
    dueDate: "2026-06-10",
    status: "Overdue",
    dpd: 41,
  },
  {
    id: "inv-inv-2069",
    documentNumber: "INV-2069",
    docType: "Invoice",
    payorId: "payor-toko-jaya-abadi",
    payorName: "Toko Jaya Abadi (independent retailer)",
    relatedKP: "Karya Logistik Prima",
    relatedProjectId: "proj-karya-logistik",
    amount: 31_000_000,
    dueDate: "2026-08-05",
    status: "Financed – In IC",
  },
];

export function getInvoiceById(id: string): InvoiceRecord | undefined {
  return mockInvoices.find((i) => i.id === id);
}

// ─── Feed / Objects-Notes ─────────────────────────────────────────────────────
// ANALYSTS[0..5] = Priska Ponggawa, Nila Layla Melinda, Sharfina Nindita,
// Juang Angger Pamungkas, Armeno Devan, Wesly Simatupang.

export const mockFeedItems: FeedItem[] = [
  {
    id: "feed-1",
    type: "Promise to Pay",
    author: ANALYSTS[0],
    timestamp: "2026-07-18T09:15:00+07:00",
    relatedKP: "Karya Logistik Prima",
    relatedProjectId: "proj-karya-logistik",
    text: "KP committed to settling PO-1031 by 2026-07-25 after a cashflow gap from Pertamina's payment cycle.",
    read: true,
  },
  {
    id: "feed-2",
    type: "Analyst Help Request",
    author: ANALYSTS[1],
    timestamp: "2026-07-18T11:40:00+07:00",
    relatedKP: "Agro Makmur Distribusi",
    relatedProjectId: "proj-agro-makmur",
    text: "Need a second read on the Kabupaten Bogor PO-1039 overdue file before I escalate to Head of Risk.",
    read: false,
  },
  {
    id: "feed-3",
    type: "Monitoring Visit Note",
    author: ANALYSTS[2],
    timestamp: "2026-07-17T14:00:00+07:00",
    relatedKP: "Toko Bangunan Sentosa",
    relatedProjectId: "proj-toko-bangunan",
    text: "Site visit to the Bogor branch — stock levels healthy, staff count matches submission, no red flags.",
    read: true,
  },
  {
    id: "feed-4",
    type: "Payment",
    author: "System",
    timestamp: "2026-07-16T08:00:00+07:00",
    relatedKP: "Distribusi Pangan Sejahtera",
    relatedProjectId: "proj-distribusi-pangan",
    text: "Payment applied against INV-2031.",
    payment: {
      principal: { before: 310_000_000, after: 280_000_000 },
      interest: { before: 4_200_000, after: 0 },
      lateFee: { before: 0, after: 0 },
      asn: { before: 1_100_000, after: 0 },
    },
    read: true,
  },
  {
    id: "feed-5",
    type: "IC Note",
    author: ANALYSTS[3],
    timestamp: "2026-07-15T16:20:00+07:00",
    relatedKP: "Cahaya Energi Asia",
    relatedProjectId: "proj-cea-aztech",
    text: "IC flagged Indomaret concentration on this PO — capped at current exposure until next review.",
    read: true,
  },
  {
    id: "feed-6",
    type: "Workflow",
    author: "System",
    timestamp: "2026-07-14T10:05:00+07:00",
    relatedKP: "Elektronik Jaya Abadi",
    relatedProjectId: "proj-elektronik-jaya",
    text: "Workflow · IC Approved",
    read: true,
  },
  {
    id: "feed-7",
    type: "Monitoring Note",
    author: ANALYSTS[4],
    timestamp: "2026-07-13T13:30:00+07:00",
    relatedKP: "Grosir Sembako Makmur",
    relatedProjectId: "proj-grosir-sembako-plafond",
    text: "Transmart PvA tracking at 94% this month, on pace.",
    read: false,
  },
  {
    id: "feed-8",
    type: "Project Credit Memo",
    author: ANALYSTS[5],
    timestamp: "2026-07-12T09:00:00+07:00",
    relatedKP: "Dapur Cokelat",
    relatedProjectId: "proj-dc-plafond-hist",
    text: "Updated the plafond continuity memo with the Coca-Cola Europacific PO history.",
    read: true,
  },
];

export function getFeedItemById(id: string): FeedItem | undefined {
  return mockFeedItems.find((f) => f.id === id);
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const mockTasks: TaskItem[] = [
  {
    id: "task-1",
    title: "Follow up on PO-1031 promise to pay",
    relatedKP: "Karya Logistik Prima",
    relatedProjectId: "proj-karya-logistik",
    owner: ANALYSTS[0],
    dueDate: "2026-07-25",
    status: "Open",
  },
  {
    id: "task-2",
    title: "Escalate Kabupaten Bogor overdue PO to Head of Risk",
    relatedKP: "Agro Makmur Distribusi",
    relatedProjectId: "proj-agro-makmur",
    owner: ANALYSTS[1],
    dueDate: "2026-07-22",
    status: "In Progress",
  },
  {
    id: "task-3",
    title: "Schedule next monitoring visit — Toko Bangunan Sentosa",
    relatedKP: "Toko Bangunan Sentosa",
    relatedProjectId: "proj-toko-bangunan",
    owner: ANALYSTS[2],
    dueDate: "2026-08-01",
    status: "Open",
  },
  {
    id: "task-4",
    title: "Confirm SLIK-PT refresh for PT Dapur Cokelat Indonesia",
    relatedKP: "Dapur Cokelat",
    relatedProjectId: "proj-dc-plafond-hist",
    owner: ANALYSTS[5],
    dueDate: "2026-07-28",
    status: "Open",
  },
  {
    id: "task-5",
    title: "Review Indomaret concentration cap before next disbursement",
    relatedKP: "Cahaya Energi Asia",
    relatedProjectId: "proj-cea-aztech",
    owner: ANALYSTS[3],
    dueDate: "2026-07-24",
    status: "In Progress",
  },
  {
    id: "task-6",
    title: "Close out July branch check-in note",
    relatedKP: "Grosir Sembako Makmur",
    relatedProjectId: "proj-grosir-sembako-plafond",
    owner: ANALYSTS[4],
    dueDate: "2026-07-31",
    status: "Done",
  },
];

export function getTaskById(id: string): TaskItem | undefined {
  return mockTasks.find((t) => t.id === id);
}

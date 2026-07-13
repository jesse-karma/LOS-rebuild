import { ICProject } from "./types";

function monthsRevenueProjection(months: number, revenue: number) {
  return Array.from({ length: months }, (_, i) => ({ month: i + 1, revenue }));
}

/** Split `total` into `months` whole-rupiah parts (largest shares absorb remainder). */
function equalMonthlyParts(total: number, months: number): number[] {
  const base = Math.floor(total / months);
  const rem = total - base * months;
  return Array.from({ length: months }, (_, i) => base + (i < rem ? 1 : 0));
}

function fixedReturnScheduleFromTotals(
  months: number,
  principalTotal: number,
  interestTotal: number,
  carryTotal: number
) {
  const principals = equalMonthlyParts(principalTotal, months);
  const interests = equalMonthlyParts(interestTotal, months);
  const carries = equalMonthlyParts(carryTotal, months);
  return principals.map((principal, i) => ({
    month: i + 1,
    principal,
    interest: interests[i],
    carry: carries[i],
  }));
}

// ─── Project 1: Steak Hotel by Holycow Medan ─────────────────────────────────
// Coda row: i-iNREe2I8Sx
// Brand: Steak Hotel by Holycow | PT: PT AHARA BHADRANAYA INDONESIA
// Status at time of IC: **IC Credit Review → Pending review
// F&B / Full Service Resto | Asset A | Branch Opening/Expansion | IDR 3.1B
// Return: Fixed Amount Repayment + Revenue Share | 8% rev share | 1.4x cap
// IC: 5 members, 4 votes submitted (1 pending)

const projectHolycow: ICProject = {
  id: "proj-holycow",
  brandName: "Steak Hotel by Holycow",
  brandIsNew: false,
  projectName: "Steak Hotel by Holycow Medan",
  approvalType: "Project",
  submittedAt: "2026-02-19T11:05:14Z",

  pic: {
    submitter: "Priska Ponggawa",
    primaryAnalyst: "Priska Ponggawa",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 3,
  brandActiveProjects: 1,
  brandCompletedProjects: 2,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "F&B",
  subSector: "Full Service Resto",
  syariah: true,
  assetClass: "A",
  requestedAmountCurrency: "IDR",
  requestedAmount: 3_100_000_000,
  amountWarning: null,
  financingUse: "Branch Opening/Expansion",
  sectorWarning: null,

  plafond: {
    proposed: null,
    current: {
      totalLimit: 5_000_000_000,
      poSubLimit: 0,
      wcSubLimit: 5_000_000_000,
      effectiveDate: "2024-06-01",
      expiryDate: "2026-06-01",
      limitStatus: "Active",
    },
    outstandingTotal: 3_200_000_000,
    remainingTotal: 1_775_704_151,
    remainingPO: 0,
    remainingWC: 1_775_704_151,
    superseded: [
      {
        totalLimit: 2_000_000_000,
        poSubLimit: 0,
        wcSubLimit: 2_000_000_000,
        effectiveDate: "2022-09-01",
        expiryDate: "2024-05-31",
      },
    ],
  },

  financialReviews: [
    {
      submissionDate: "2026-02-24",
      financialReportsReviewed: "Management Accounts Jan–Dec 2025",
      periodEndingDate: "2025-12-31",
      limitRecommendation: "Keep",
      limitCurrentIdr: 5_000_000_000,
      reviewNotes:
        "Revenue 2025 dari outlet existing Holycow Jakarta: IDR 28B total (3 outlet). Outlet Medan (baru dibuka Okt 2024) masih ramp-up — revenue per bulan IDR 580-620jt, gross margin ~68%. Tidak ada perubahan hutang. Plafond dipertahankan IDR 5B. Proyek #3 (Medan expansion) dalam proses IC review.",
    },
    {
      submissionDate: "2025-03-10",
      financialReportsReviewed: "Audited 2024",
      periodEndingDate: "2024-12-31",
      limitRecommendation: "Increase",
      limitCurrentIdr: 2_000_000_000,
      limitRecommendedIdr: 5_000_000_000,
      reviewNotes:
        "Revenue 2024: IDR 24B (+20% YoY) dari 2 outlet Jakarta. Laporan audit bersih. Outlet Medan dibuka Q4 2024 dengan investasi sendiri — performa awal kuat. Direkomendasikan kenaikan plafond dari IDR 2B ke IDR 5B untuk mendukung rencana full renovation Medan dan potensi outlet berikutnya.",
    },
  ],

  referralSource: "2nd+ project",
  specificReferror: null,
  referrorBelongsToKP: null,
  firstProjectReferralOverride: {
    referralSource: "Karmapreneur",
    specificReferror: "Melisa Anggraini",
    referrorBelongsToKP: null,
  },
  otherReferees: [],

  submissionProjectedBEPMonths: 13,

  kpContacts: [
    {
      id: "kpc-hc1",
      name: "Regina Tiffani",
      role: "Direktur Utama / Co-Founder",
      notesOnPerson:
        "Co-founder Holycow sejak 2010. Background marketing — bertanggung jawab atas ekspansi brand dan hubungan investor. Sangat komunikatif dan responsif dalam proses due diligence. Menanggani operasional seluruh outlet.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-regina-tiffani",
      slikExecSummary:
        "KTP Jakarta Selatan. KPR di BCA (aktif, performing). Tidak ada kredit konsumer lain. SLIK bersih per Februari 2026.",
      uboExposure: 3_200_000_000,
    },
    {
      id: "kpc-hc2",
      name: "Syifa Sarini",
      role: "CFO / Direktur Keuangan",
      notesOnPerson:
        "Bergabung 2018. Ex-Deloitte (4 tahun), sebelumnya konsultan F&B di Jakarta. Penanggung jawab laporan keuangan, rekening koran, dan hubungan dengan perbankan. Sangat transparan dalam disclosure.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-syifa-sarini",
      slikExecSummary:
        "KTP Jakarta Pusat. Kredit motor lunas 2022. Tidak ada catatan negatif. SLIK bersih per Februari 2026.",
      uboExposure: 0,
    },
    {
      id: "kpc-hc3",
      name: "Iswanda Mardio",
      role: "General Manager",
      notesOnPerson:
        "GM operasional untuk outlet luar Jakarta. Penanggung jawab ekspansi Medan. Menandatangani perjanjian sebagai kuasa direksi.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: false,
      slikFileUrl: null,
      slikExecSummary: null,
      uboExposure: 0,
    },
    {
      id: "kpc-hc4",
      name: "Erwynda Semiartie",
      role: "Finance & Admin Manager",
      notesOnPerson:
        "Bertanggung jawab atas rekening koran dan koordinasi pembayaran di outlet luar Jakarta.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: false,
      slikFileUrl: null,
      slikExecSummary: null,
      uboExposure: 0,
    },
  ],

  pastProjects: [
    {
      id: "pp-hc1",
      projectName: "Steak Hotel by Holycow (#1) — Renovasi & Capex, Wolter Monginsidi",
      status: "Completed",
      icApprovalDate: "2021-03-15",
      returnType: "Revenue Share (Return-Capped)",
      amount: 1_500_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 20,
      otfTermMonths: 18,
      otfIRR: 22.1,
      projectedIRR: 19.5,
      otfMOIC: null,
      projectedMOIC: "1.38x",
      projectedBEPMonths: 12,
      currentDPD: 0,
      maxDPD: 0,
      revShareTermsSnapshot: {
        capType: "Return Cap",
        capMultiple: 1.35,
        capTimePeriodMonths: null,
        preBEPRevSharePct: 7.5,
        postBEPRevSharePct: 8.0,
        minReturn: null,
        minReturnMultiple: null,
        minReturnPayableMonths: null,
      },
    },
    {
      id: "pp-hc2",
      projectName: "Steak Hotel by Holycow (#2) — Working Capital, Fatmawati",
      status: "Active",
      icApprovalDate: "2022-11-20",
      returnType: "Revenue Share (Return-Capped)",
      amount: 2_000_000_000,
      outstandingAmount: 1_340_000_000,
      projectedTermMonths: 24,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 19.5,
      otfMOIC: null,
      projectedMOIC: "1.40x",
      projectedBEPMonths: 14,
      currentDPD: 0,
      maxDPD: 14,
      overdueHistory: [
        { dueDate: "2024-04-15", daysOverdue: 14, status: "Paid" },
      ],
      revShareTermsSnapshot: {
        capType: "Return Cap",
        capMultiple: 1.4,
        capTimePeriodMonths: null,
        preBEPRevSharePct: 8.0,
        postBEPRevSharePct: 8.0,
        minReturn: 1.25,
        minReturnMultiple: null,
        minReturnPayableMonths: 20,
      },
    },
    {
      id: "pp-hc3",
      projectName: "Steak Hotel by Holycow (#3) — Branch Opening/Expansion: Medan [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-02-19",
      isCurrentSubmission: true,
      returnType: "Revenue Share (Return-Capped)",
      amount: 3_100_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 24,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 25.6,
      otfMOIC: null,
      projectedMOIC: "1.55x",
      projectedBEPMonths: 13,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Revenue Share (Return-Capped)",
  disbursements: [
    { tranche: 1, plannedAmount: 3_100_000_000, plannedDate: "2026-04-14" },
  ],
  branches: [
    {
      id: "br-hc1",
      name: "Medan — Sun Plaza Level 3",
      area: "Medan, Sumatera Utara",
      gmapsLink: "https://maps.google.com/?q=Sun+Plaza+Medan",
      notes:
        "Outlet Medan pertama Holycow. Lokasi premium di Sun Plaza — anchor tenant di Medan. Total area 350m², kapasitas 120 covers. Pembukaan awal Okt 2024, sekarang sedang dalam tahap full renovation untuk upgrade layout dan kitchen. Kontrak sewa 5 tahun + opsi perpanjang 3 tahun.",
      type: "Opening Branch",
    },
  ],
  revenueShareTerms: {
    sourceOfRevenueAccrued:
      "Sales setelah dikurangi diskon, sebelum PB1/PPN, sebelum Service Charge, sebelum komisi online dan biaya EDC/QRIS",
    frequency: "Monthly",
    dueDate: "Tanggal 15 setiap bulan",
    capType: "Return Cap",
    capMultiple: 1.4,
    capTimePeriodMonths: null,
    revShareStartType: "Anchored to Branch Opening",
    revShareStartDate: null,
    preBEPRevSharePct: 8.0,
    postBEPRevSharePct: 8.0,
    carryType: "Fixed Platform Fee",
    carryPct: 2.16,
    minReturn: null,
    minReturnMultiple: null,
    minReturnPayableMonths: null,
    revProjectionArray: monthsRevenueProjection(123, 600_740_842),
  },
  fixedReturnTerms: null,
  lateFee: {
    basis: "Overdue Amount",
    gracePeriodDays: 5,
    dailyPctInvestors: 0.02,
    dailyPctASN: 0.08,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Steak Hotel by Holycow**\n\nKP existing dengan 2 proyek sebelumnya, keduanya completed dengan OTF IRR di atas proyeksi (22.1% dan 20.4%). Proyek #2 ada DPD 14 hari di bulan ke-18 — satu kali, diselesaikan cepat, tidak ada pola berulang.\n\nBrand sudah berdiri sejak 2010, kini memiliki 3 outlet Jakarta. Outlet Medan baru dibuka Okt 2024 dengan modal sendiri — performa awal kuat. Revenue Medan IDR 580-620jt/bulan, GM ~68%. Management profesional, laporan keuangan transparan. Tidak ada hutang bank.\n\nRisiko utama: ekspansi ke kota baru (Medan), sensitif terhadap daya beli konsumen lokal dan persaingan restoran premium.",
  projectCreditMemo:
    "**Project Credit Memo — Branch Opening/Expansion: Medan**\n\nProyek ke-3. Revenue Share return-capped 1.4x. Dana digunakan untuk full renovation Sun Plaza Medan (IDR 3.1B) — upgrade layout, kitchen equipment, dan AC. Proyeksi revenue flat IDR 600jt/bulan setelah renovasi selesai (bulan 3). IRR proyeksi 25.6% dengan MOIC 1.55x.\n\nSatu tranche disbursement 14 Apr 2026. Disbursement status: Planned — KF:KCF split belum valid, perlu diverifikasi sebelum disbursement.",
  financialsLink:
    "https://docs.google.com/spreadsheets/d/1sh7vI1nmolAwz-_jZ39tGKNU1NtZdfyv7aMwq42y_Q8",
  projectNotes: [
    {
      author: "Priska Ponggawa",
      date: "2026-04-07",
      content:
        "Rev. 7 Apr 2026: Update dari KP — kontraktor renovasi sudah mulai. Estimasi selesai akhir Mei 2026. KCF split masih belum resolved, sedang di-follow up oleh tim Finance.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-03-12",
      content:
        "Rev. 12 Mar 2026: Site visit Sun Plaza Medan — lokasi strategis di lantai 3 dekat bioskop. Traffic makan siang dan malam kuat. Kompetitor terdekat: Abuba Steak (lantai 1) tapi segmen berbeda. KP sangat yakin dengan performa Medan.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-02-24",
      content:
        "24 Feb 2026: Submission pertama. Semua dokumen lengkap. Financial review selesai hari ini. Calculator file sudah diekstrak — data valid. KCF split belum diisi, perlu konfirmasi ke tim Finance.",
    },
  ],

  ptDetails: [
    {
      id: "pt-hc1",
      name: "PT AHARA BHADRANAYA INDONESIA",
      bank: "Bank Maybank",
      accountNumber: "2534000051",
      accountholderName: "AHARA BHADRANAYA INDONESIA",
      slikFileUrl: "https://drive.google.com/file/slik-pt-ahara",
      slikExecSummary:
        "PT aktif sejak 2018. Rekening Maybank digunakan untuk semua transaksi proyek Holycow bersama Karma. Tidak ada pinjaman korporat. Cashflow konsisten dengan revenue yang dilaporkan. SLIK bersih per Maret 2026.",
      warnings: [],
    },
  ],

  fundingSource: "KF & KCF",
  bankDetailsReviewed: true,
  taxWithholdings: "Yes",
  icVotes: [
    { memberId: "ic-1", memberName: "Ben Elberger", isPrincipal: true, vote: "Approve", votedAt: "2026-04-07T09:15:00Z" },
    { memberId: "ic-2", memberName: "Aldi Haryopratomo", isPrincipal: false, vote: null, votedAt: null },
    { memberId: "ic-3", memberName: "Junaidi", isPrincipal: false, vote: null, votedAt: null },
  ],
  approvalNotes: "",
  specialNotesForIC:
    "⚠️ KF:KCF Disbursement Split belum valid — harus diselesaikan sebelum disbursement. IC dapat approve dengan CS ini.\n\nProyek ini melebihi sisa plafond saat ini (IDR 1.78B remaining vs IDR 3.1B requested) — namun ini adalah proyek tunggal tanpa request kenaikan plafond. Perlu konfirmasi dari tim Finance apakah plafond perlu di-update.",
  conditionsSubsequent: [
    "Selesaikan KF:KCF Disbursement Split sebelum disbursement",
    "Submit executed renovation contract sebelum disbursement",
    "Submit updated bank statements Q1 2026 untuk PT Ahara Bhadranaya",
  ],
};

// ─── Project 2: Shushu ────────────────────────────────────────────────────────
// Coda row: i-V5VX_zQKpP
// Brand: Shushu | PT: PT. Mitra Mulia Manunggal
// Status: APPROVED (4.2 Legal Preparing Contract for 1st Disbursement)
// F&B / Snacks, Drinks & Desserts | Asset A | Branch Renovation | IDR 250jt
// Return: Fixed Amount Repayment | 12 installments | MOIC 1.2x | IRR 24.3%

const projectShushu: ICProject = {
  id: "proj-shushu",
  codaRowId: "i-V5VX_zQKpP",
  brandName: "Shushu",
  brandIsNew: true,
  projectName: "Shushu (#1) — Branch Renovation",
  approvalType: "Project",
  /** Aligned with IC / Legal timeline (Apr 2026 disbursement prep). */
  submittedAt: "2026-03-28T14:10:45Z",

  pic: {
    submitter: "Juang Angger Pamungkas",
    primaryAnalyst: "Nila Layla Melinda",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 1,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 0,
  brandPendingDisbursementProjects: 0,
  mainSector: "F&B",
  subSector: "Snacks, Drinks, & Desserts",
  syariah: false,
  assetClass: "A",
  requestedAmountCurrency: "IDR",
  requestedAmount: 250_000_000,
  amountWarning: null,
  financingUse: "Branch Renovation",
  sectorWarning: null,

  plafond: {
    proposed: null,
    current: null,
    outstandingTotal: 0,
    remainingTotal: 0,
    remainingPO: 0,
    remainingWC: 0,
    superseded: [],
  },

  financialReviews: [
    {
      submissionDate: "2026-04-02",
      financialReportsReviewed: "Management Accounts Jan–Dec 2025 + Bank Statements",
      periodEndingDate: "2025-12-31",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "Brand Shushu beroperasi sejak 2023 di PIK2 dengan konsep minuman premium dan dessert. Revenue 2025: IDR 2.4B dari 1 outlet (rata-rata IDR 200jt/bulan). Gross margin 61%. Tidak ada hutang. Owner mengajukan dana untuk renovasi gerai agar lebih sesuai dengan konsep terbaru brand.\n\nCatatan: ini adalah proyek pertama bersama Karma. Plafond tidak diminta saat ini — akan di-review setelah proyek pertama selesai.",
    },
  ],

  referralSource: "Cold calling",
  specificReferror: "Karma BD — PIK2 tenant outreach",
  referrorBelongsToKP: null,
  otherReferees: [],

  submissionProjectedBEPMonths: 6,

  kpContacts: [
    {
      id: "kpc-ss1",
      name: "Sandy Wiguna",
      role: "Founder / Direktur Utama",
      notesOnPerson:
        "Founder Shushu, 31 tahun. Background barista dan F&B ops — pernah bekerja di Kopi Kenangan sebagai area manager sebelum keluar dan build brand sendiri 2023. Sangat detail soal produk dan operasional. Handles semua aspek bisnis sendiri dengan 1 manajer operasional.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-sandy-wiguna",
      slikExecSummary:
        "KTP Tangerang Utara. Kredit motor lunas 2022. Tidak ada KPR. SLIK bersih per April 2026.",
      uboExposure: 0,
    },
  ],

  pastProjects: [
    {
      id: "pp-ss1",
      projectName: "Shushu (#1) — Branch Renovation [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-04-02",
      isCurrentSubmission: true,
      returnType: "Fixed Return",
      amount: 250_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 12,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 24.3,
      otfMOIC: null,
      projectedMOIC: "1.20x",
      projectedBEPMonths: 6,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Fixed Return",
  disbursements: [
    { tranche: 1, plannedAmount: 250_000_000, plannedDate: "2026-04-09" },
  ],
  branches: [
    {
      id: "br-ss1",
      name: "PIK2 — Sedayu City Mall",
      area: "Jakarta Utara",
      gmapsLink: "https://maps.google.com/?q=Sedayu+City+PIK2",
      notes:
        "Outlet pertama Shushu di PIK2 Sedayu City. Total area 45m² — konsep kiosk premium. Renovasi mencakup upgrade display case, LED signage, dan kitchen equipment. Kontrak sewa 2 tahun, opsi perpanjang.",
      type: "Opening Branch",
    },
  ],
  revenueShareTerms: null,
  fixedReturnTerms: {
    repaymentSchedule: fixedReturnScheduleFromTotals(12, 250_000_000, 37_350_000, 12_500_000),
    totalRepayment: 299_850_000,
    totalPrincipal: 250_000_000,
    totalInterest: 37_350_000,
    carry: 12_500_000,
  },
  lateFee: {
    basis: "Overdue Amount",
    gracePeriodDays: 5,
    dailyPctInvestors: 0.02,
    dailyPctASN: 0.08,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Shushu**\n\nKP baru. Brand Shushu berdiri 2023 di PIK2 dengan konsep minuman dan dessert premium. Revenue 2025: IDR 2.4B (1 outlet), GM 61%. Tidak ada hutang.\n\nOwner Sandy Wiguna memiliki background F&B yang kuat (ex-Kopi Kenangan Area Manager). Brand positioning kuat di segmen premium PIK2. Risiko utama: KP baru, single outlet, ketergantungan penuh pada founder.\n\nSumber: Cold calling (Karma outreach ke tenant PIK2).",
  projectCreditMemo:
    "**Project Credit Memo — Branch Renovation**\n\nProyek pertama bersama Karma. Fixed return 12 bulan, satu tranche disbursement. Dana digunakan untuk renovasi outlet PIK2 — upgrade display case, LED signage, dan kitchen equipment. MOIC proyeksi 1.20x, IRR 24.3%. Disbursement planned 9 Apr 2026.",
  financialsLink:
    "https://docs.google.com/spreadsheets/d/1BFsWNVlrKsCkrYL52Vn8EZDpV6ixcewkNzLMmyQ8QoQ",
  projectNotes: [
    {
      author: "Juang Angger Pamungkas",
      date: "2026-04-02",
      content:
        "2 Apr 2026: Submission. Semua dokumen lengkap. Financial review selesai hari ini. KP mereview agreement — sedang dalam proses Legal. Target disbursement 9 Apr.",
    },
    {
      author: "Sharfina Nindita",
      date: "2026-01-28",
      content:
        "28 Jan 2026: First meeting dengan Sandy Wiguna di PIK2. Outlet bersih dan terkelola dengan baik. Traffic peak di weekend dan sore hari. Sandy sangat paham P&L dan sangat antusias untuk ekspansi.",
    },
  ],

  ptDetails: [
    {
      id: "pt-ss1",
      name: "PT. Mitra Mulia Manunggal",
      bank: "BCA",
      accountNumber: "1625599999",
      accountholderName: "PT. Mitra Mulia Manunggal",
      slikFileUrl: null,
      slikExecSummary: null,
      warnings: ["This is the 1st project from the PT — no prior bank history with Karma"],
    },
  ],

  fundingSource: "KF & KCF",
  bankDetailsReviewed: false,
  taxWithholdings: "Yes",
  icVotes: [
    { memberId: "ic-1", memberName: "Ben Elberger", isPrincipal: true, vote: null, votedAt: null },
    { memberId: "ic-2", memberName: "Aldi Haryopratomo", isPrincipal: false, vote: null, votedAt: null },
    { memberId: "ic-3", memberName: "Junaidi", isPrincipal: false, vote: null, votedAt: null },
  ],
  approvalNotes:
    "Approved unanimously. KP pertama dengan fixed return — amount kecil, risiko terkendali. Perlu dipantau progress renovasi dan performa revenue post-renovation.",
  specialNotesForIC: null,
  conditionsSubsequent: [
    "Submit executed renovation invoice / work order sebelum disbursement",
    "Submit financial statements Q1 2026 sebelum disbursement",
    "Update performa revenue 3 bulan post-renovation (Juli 2026)",
  ],
};

// ─── Project 3: Cipta Usaha Media — PO Financing (Orang Tua) ─────────────────
// Coda row: i-MWtJ6auN3O
// Brand: Cipta Usaha Media | PT: PT Cipta Usaha Media
// Status: APPROVED (4.2 Legal Preparing Contract for 1st Disbursement)
// Agencies / Workforce Outsourcing | Asset B-PO | Domestic PO Financing | IDR 249jt
// Return: Daily Interest | 2-month tenor | MOIC 1.032x | IRR 21.1%
// Payor: Orang Tua (whitelisted)
// Note: accounting team changed May 2025, cannot produce recent balance sheet

const projectCUM: ICProject = {
  id: "proj-cum",
  brandName: "Cipta Usaha Media",
  brandIsNew: false,
  projectName: "Cipta Usaha Media (#26) — PO Financing: Orang Tua",
  approvalType: "PO/Invoice",
  submittedAt: "2026-03-31T14:53:44Z",

  pic: {
    submitter: "Nila Layla Melinda",
    primaryAnalyst: "Nila Layla Melinda",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 26,
  brandActiveProjects: 3,
  brandCompletedProjects: 22,
  brandBeforeICProjects: 0,
  brandPendingDisbursementProjects: 1,
  mainSector: "Agencies",
  subSector: "Workforce Outsourcing",
  syariah: false,
  assetClass: "B - PO",
  requestedAmountCurrency: "IDR",
  requestedAmount: 249_000_000,
  trancheTargetAmount: 249_000_000,
  amountWarning: null,
  financingUse: "Domestic PO Financing",
  sectorWarning: null,

  plafond: {
    proposed: null,
    current: {
      totalLimit: 4_000_000_000,
      poSubLimit: 2_000_000_000,
      wcSubLimit: 2_000_000_000,
      effectiveDate: "2025-01-01",
      expiryDate: "2027-01-01",
      limitStatus: "Active",
      maxReviewDate: "2026-06-30",
    },
    outstandingTotal: 323_172_379,
    outstandingWC: 0,
    remainingTotal: 3_676_827_621,
    remainingPO: 1_676_827_621,
    remainingWC: 2_000_000_000,
    superseded: [
      {
        totalLimit: 2_500_000_000,
        poSubLimit: 1_500_000_000,
        wcSubLimit: 1_000_000_000,
        effectiveDate: "2023-06-01",
        expiryDate: "2024-12-31",
      },
    ],
  },

  financialReviews: [
    {
      submissionDate: "2026-04-09",
      financialReportsReviewed: "Bank Statements Jan–Mar 2026 (Proxy)",
      periodEndingDate: "2026-03-31",
      limitRecommendation: "Keep",
      limitCurrentIdr: 4_000_000_000,
      reviewNotes:
        "CUM mengganti tim akuntan internal pada Mei 2025 — tidak dapat memproduksi neraca terbaru karena proses transisi. Rekening koran Jan–Mar 2026 digunakan sebagai proxy: cashflow masuk/keluar konsisten dengan volume PO historis (IDR 1.5-2B/bulan). Limit dipertahankan IDR 4B sambil menunggu laporan keuangan formal selesai dipersiapkan.\n\n⚠️ Catatan: Balance sheet formal belum tersedia. KP diminta submit balance sheet terbaru sebelum disbursement berikutnya.",
    },
    {
      submissionDate: "2025-03-03",
      financialReportsReviewed: "Management Accounts Jan–Dec 2024",
      periodEndingDate: "2024-12-31",
      limitRecommendation: "Increase",
      limitCurrentIdr: 2_500_000_000,
      limitRecommendedIdr: 4_000_000_000,
      reviewNotes:
        "Revenue 2024: IDR 18B (workforce outsourcing + logistik). Pertumbuhan 35% YoY. Kontrak dengan Orang Tua Group diperbarui — volume PO meningkat signifikan. Direkomendasikan kenaikan plafond dari IDR 2.5B ke IDR 4B untuk mendukung volume PO yang lebih besar.",
    },
  ],

  referralSource: "2nd+ project",
  specificReferror: null,
  referrorBelongsToKP: null,
  firstProjectReferralOverride: {
    referralSource: "Cold calling",
    specificReferror: "Dian Kusuma",
    referrorBelongsToKP: null,
  },
  otherReferees: [],

  kpContacts: [
    {
      id: "kpc-cum1",
      name: "Dwi Wicaksono Wibowo",
      role: "Direktur Utama",
      notesOnPerson:
        "Founder dan Direktur Utama CUM. Background di bidang HR outsourcing dan logistik sejak 2010. Sangat berpengalaman dalam mengelola kontrak korporat besar — klien utama termasuk Orang Tua Group, Indofood, dan Wings. Responsif dan profesional dalam semua komunikasi.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-dwi-wicaksono",
      slikExecSummary:
        "KTP Jakarta Timur. KPR di BNI (aktif, performing). Kredit kendaraan lunas 2021. Tidak ada catatan negatif. SLIK bersih per Maret 2026.",
      uboExposure: 323_172_379,
    },
    {
      id: "kpc-cum2",
      name: "Nofriwan",
      role: "Direktur Operasional",
      notesOnPerson:
        "Co-founder. Penanggung jawab operasional lapangan — koordinasi tim workforce dan delivery. Memegang 35% saham.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-nofriwan",
      slikExecSummary:
        "KTP Bekasi. Tidak ada kredit aktif. SLIK bersih per Maret 2026.",
      uboExposure: 0,
    },
  ],

  pastProjects: [
    {
      id: "pp-cum-22",
      projectName: "Cipta Usaha Media (#22) — PO - Orang Tua (Apr 2025)",
      status: "Completed",
      icApprovalDate: "2025-04-18",
      bRecapKind: "B-PO",
      payors: ["Orang Tua Group"],
      lateFeeRecap: {
        basis: "Outstanding Principal",
        gracePeriodDays: 0,
        dailyPctInvestors: 0.1,
        dailyPctASN: 0,
      },
      returnType: "Fixed Return",
      amount: 375_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: 2,
      otfIRR: 21.8,
      projectedIRR: 21.0,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
    {
      id: "pp-cum-23",
      projectName: "Cipta Usaha Media (#23) — PO - Orang Tua (Jun 2025)",
      status: "Completed",
      icApprovalDate: "2025-06-22",
      bRecapKind: "B-PO",
      payors: ["Orang Tua Group"],
      lateFeeRecap: {
        basis: "Outstanding Principal",
        gracePeriodDays: 0,
        dailyPctInvestors: 0.1,
        dailyPctASN: 0,
      },
      returnType: "Fixed Return",
      amount: 300_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: 2,
      otfIRR: 21.2,
      projectedIRR: 21.0,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
    {
      id: "pp-cum-24",
      projectName: "Cipta Usaha Media (#24) — PO - Orang Tua (Sep 2025)",
      status: "Completed",
      icApprovalDate: "2025-09-30",
      bRecapKind: "B-PO",
      payors: ["Orang Tua Group"],
      lateFeeRecap: {
        basis: "Outstanding Principal",
        gracePeriodDays: 0,
        dailyPctInvestors: 0.1,
        dailyPctASN: 0,
      },
      returnType: "Fixed Return",
      amount: 249_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: 2,
      otfIRR: 21.1,
      projectedIRR: 21.0,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
    {
      id: "pp-cum-25",
      projectName: "Cipta Usaha Media (#25) — PO - Orang Tua (Jan 2026)",
      status: "Active",
      icApprovalDate: "2026-01-12",
      bRecapKind: "B-PO",
      payors: ["Orang Tua Group"],
      lateFeeRecap: {
        basis: "Outstanding Principal",
        gracePeriodDays: 0,
        dailyPctInvestors: 0.1,
        dailyPctASN: 0,
      },
      returnType: "Fixed Return",
      amount: 323_172_379,
      outstandingAmount: 323_172_379,
      projectedTermMonths: 2,
      otfTermMonths: null,
      otfIRR: 21.1,
      projectedIRR: 21.0,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 3,
      maxDPD: 3,
      overdueHistory: [
        { dueDate: "2026-03-15", daysOverdue: 3, status: "Paid" },
      ],
    },
    {
      id: "pp-cum-queue-27",
      projectName: "Cipta Usaha Media (#27) — PO: Orang Tua (draft, pending submission)",
      status: "Pending IC submission",
      icApprovalDate: null,
      bRecapKind: "B-PO",
      payors: ["Orang Tua Group"],
      lateFeeRecap: {
        basis: "Outstanding Principal",
        gracePeriodDays: 0,
        dailyPctInvestors: 0.1,
        dailyPctASN: 0,
      },
      returnType: "Fixed Return",
      amount: 180_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 21.0,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
    {
      id: "pp-cum-26",
      projectName: "Cipta Usaha Media (#26) — PO Financing: Orang Tua [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-03-31",
      isCurrentSubmission: true,
      bRecapKind: "B-PO",
      payors: ["Orang Tua Group"],
      returnType: "Daily Interest",
      amount: 249_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 21.1,
      otfMOIC: null,
      projectedMOIC: "1.032x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Daily Interest",
  disbursements: [
    { tranche: 1, plannedAmount: 249_000_000, plannedDate: "2026-04-09" },
  ],
  branches: [],
  revenueShareTerms: null,
  fixedReturnTerms: null,
  dailyInterestTerms: {
    interestRate30DayPct: 1.6,
    serviceFee30DayPct: 0.6,
    tenorDays: 60,
    minInterestPeriodDays: 30,
    serviceFeeDailyBasis: "Outstanding Principal",
  },
  // Coda / IC card: 0.1% per day to Investors, 0% to ASN (differs from B_MOD default derived from 1.6%/30 & 0.6%/30).
  lateFee: {
    basis: "Outstanding Principal",
    gracePeriodDays: 0,
    dailyPctInvestors: 0.1,
    dailyPctASN: 0,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Cipta Usaha Media**\n\nKP existing dengan 25 proyek sebelumnya (sejak 2021), semua PO financing dari Orang Tua Group. Track record sangat konsisten — dari 25 proyek, hanya 1 kali DPD (project #25, 3 hari, sudah diselesaikan).\n\nBrand bergerak di workforce outsourcing dan logistik. Klien utama: Orang Tua Group (kontrak terbarukan tahunan). Revenue 2024: IDR 18B.\n\n⚠️ Catatan: CUM mengganti tim akuntan internal Mei 2025 — belum bisa produksi balance sheet terbaru. Bank statements Jan–Mar 2026 digunakan sebagai proxy sementara. Perlu laporan keuangan formal sebelum disbursement berikutnya.",
  projectCreditMemo:
    "**Project Credit Memo — PO Financing: Orang Tua**\n\nProyek ke-26 dengan struktur PO Financing yang sama seperti sebelumnya. Payor: Orang Tua Group (whitelisted). Daily interest 1.6%/bulan (KF), 0.6%/bulan (KCF). Tenor 2 bulan. MOIC 1.032x, IRR 21.1%.\n\nDisbursement planned 9 Apr 2026. KF:KCF Disbursement Letter masih missing — perlu dilengkapi sebelum disbursement.",
  financialsLink:
    "https://docs.google.com/spreadsheets/d/1_duQQLPRU005JSsDGXUcaCs991JKjYi_2YveeROkucA",
  projectNotes: [
    {
      author: "Nila Layla Melinda",
      date: "2026-04-09",
      content:
        "[DRAFT] Project Note: 9 Apr 2026. Proyek #26 disetujui IC. KF:KCF Disbursement Letter dalam proses. Target disbursement akhir pekan ini.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-03-31",
      content:
        "Submission proyek #26 — PO Orang Tua April cycle. CUM masih belum bisa produce balance sheet terbaru (accounting team baru belum fully onboarded). Bank statements Jan–Mar 2026 sudah ada dan cashflow konsisten. Koordinasi dengan Legal untuk persiapan contract.",
    },
  ],

  ptDetails: [
    {
      id: "pt-cum1",
      name: "PT Cipta Usaha Media",
      bank: "BCA",
      accountNumber: "0700441679",
      accountholderName: "PT Cipta Usaha Media",
      slikFileUrl: "https://drive.google.com/file/slik-pt-cum",
      slikExecSummary:
        "Rekening BCA aktif sejak 2019. Tidak ada pinjaman korporat di perbankan. SLIK bersih per Maret 2026. Cashflow rekening konsisten dengan volume PO yang dilaporkan (IDR 1.5-2B/bulan). Bank details match those for the last project by the same PT as of IC Review.",
      warnings: [],
    },
  ],

  payorInvoices: [
    {
      id: "pay-cum-1",
      payorLabel: "Orang Tua Group",
      poOrInvoiceNumber: "PO-OT-2026-APR-0142",
      dueDate: "2026-06-08",
      amount: 249_000_000,
      currency: "IDR",
      payorType: "Corporate PO (whitelisted)",
      payeeProjects: "Cipta Usaha Media (#26)",
      notes: "Underlying PO aligned to April 2026 production cycle.",
      riskLevel: "Low",
    },
  ],

  fundingSource: "KF & KCF",
  bankDetailsReviewed: true,
  taxWithholdings: "Yes",
  icVotes: [
    { memberId: "ic-1", memberName: "Ben Elberger", isPrincipal: true, vote: null, votedAt: null },
    { memberId: "ic-2", memberName: "Aldi Haryopratomo", isPrincipal: false, vote: null, votedAt: null },
    { memberId: "ic-3", memberName: "Junaidi", isPrincipal: false, vote: null, votedAt: null },
  ],
  approvalNotes:
    "Approved unanimously. PO financing rutin dari KP yang track record-nya sangat baik. Catatan: balance sheet terbaru belum tersedia — perlu disubmit sebagai CS sebelum disbursement cycle berikutnya.",
  specialNotesForIC:
    "⚠️ KF:KCF Disbursement Letter masih missing — perlu dilengkapi sebelum disbursement.\n\n⚠️ Balance sheet formal belum dapat diproduksi oleh KP (tim akuntan baru). Bank statements digunakan sebagai proxy. Perlu laporan keuangan formal sebelum disbursement proyek berikutnya.",
  conditionsSubsequent: [
    "KF:KCF Disbursement Letter harus dilengkapi sebelum disbursement",
    "Submit balance sheet formal (per Des 2025 atau Mar 2026) sebelum proyek #27",
    "Submit PO / Invoice dari Orang Tua sebelum disbursement",
  ],
};

// ─── Project 4: Cahaya Energi Asia — Aztech #1 (PO/Invoice + Plafond) ─────────
// Coda row: i-vd0F644zu0 | Approval: PO/Invoice + Plafond | Daily Interest | Domestic PO
// Target tranche IDR 6B; proposed KP-wide ceiling IDR 15B (PO sub-limit 15B, WC 0)
// Seeded from Coda Oct 2025 — IC card shows platform (plafond) vs tranche fields

const projectCEA: ICProject = {
  id: "proj-cea-aztech",
  codaRowId: "i-vd0F644zu0",
  brandName: "Cahaya Energi Asia",
  brandIsNew: false,
  projectName: "Cahaya Energi Asia - Aztech #1",
  approvalType: "PO/Invoice+Plafond",
  submittedAt: "2025-10-23T08:56:15Z",

  pic: {
    submitter: "Junaidi",
    primaryAnalyst: "Priska Ponggawa",
    secondaryAnalyst: "Armeno Devan",
  },

  projectNumberForKP: 1,
  brandActiveProjects: 1,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 0,
  brandPendingDisbursementProjects: 0,
  mainSector: "Assorted B2B Services and Manufacturing",
  subSector: "Oil and Gas Services",
  syariah: false,
  assetClass: "B - PO",
  requestedAmountCurrency: "IDR",
  requestedAmount: 6_000_000_000,
  trancheTargetAmount: 6_000_000_000,
  icVoteBasisAmount: 15_000_000_000,
  amountWarning: null,
  financingUse: "Domestic PO Financing",
  sectorWarning: null,

  plafond: {
    proposed: {
      totalLimit: 15_000_000_000,
      poSubLimit: 15_000_000_000,
      wcSubLimit: 0,
      maxReviewDate: "2026-09-30",
    },
    current: {
      totalLimit: 12_000_000_000,
      poSubLimit: 12_000_000_000,
      wcSubLimit: 0,
      effectiveDate: "2024-04-01",
      expiryDate: "2027-04-01",
      limitStatus: "Active",
      maxReviewDate: "2026-03-31",
    },
    outstandingTotal: 6_000_000_000,
    outstandingWC: 0,
    remainingTotal: 9_000_000_000,
    remainingPO: 9_000_000_000,
    remainingWC: 0,
    superseded: [
      {
        totalLimit: 10_000_000_000,
        poSubLimit: 10_000_000_000,
        wcSubLimit: 0,
        effectiveDate: "2022-01-01",
        expiryDate: "2024-03-31",
      },
    ],
  },

  financialReviews: [
    {
      submissionDate: "2025-10-20",
      financialReportsReviewed: "Management accounts + rekening koran Q3 2025",
      periodEndingDate: "2025-09-30",
      limitRecommendation: "Increase",
      limitCurrentIdr: 12_000_000_000,
      limitRecommendedIdr: 15_000_000_000,
      reviewNotes:
        "Oil & gas services vendor to Aztech. Volume PO naik — rekomendasi menyesuaikan plafond PO agar sesai dengan pipeline kontrak 12 bulan ke depan. Tranche pertama Aztech #1 sebesar IDR 6B dengan tenor 90 hari.",
    },
  ],

  referralSource: "Karmapreneur",
  specificReferror: null,
  referrorBelongsToKP: null,
  otherReferees: [],

  kpContacts: [
    {
      id: "kpc-cea1",
      name: "KP signatory (from diligence)",
      role: "Direktur Utama",
      notesOnPerson:
        "Prototype placeholder — sync full KP contact grid from Coda in production. Oil & gas services; primary relationship with Aztech Group POs.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: null,
      slikExecSummary: "SLIK on file per diligence folder (prototype).",
      uboExposure: 6_000_000_000,
    },
  ],

  pastProjects: [
    {
      id: "pp-cea-az1",
      projectName: "Cahaya Energi Asia - Aztech #1",
      status: "Proposed",
      icApprovalDate: "2025-10-23",
      isCurrentSubmission: true,
      bRecapKind: "B-PO",
      payors: ["Aztech Group"],
      returnType: "Daily Interest",
      amount: 6_000_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 3,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 18.5,
      otfMOIC: null,
      projectedMOIC: "1.05x",
      projectedBEPMonths: 2,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Daily Interest",
  disbursements: [{ tranche: 1, plannedAmount: 6_000_000_000, plannedDate: "2025-11-15" }],
  branches: [],
  revenueShareTerms: null,
  fixedReturnTerms: null,
  dailyInterestTerms: {
    interestRate30DayPct: 1.6,
    serviceFee30DayPct: 0.6,
    tenorDays: 90,
    minInterestPeriodDays: 45,
    serviceFeeDailyBasis: "Outstanding Principal",
  },
  // Late fee: Coda uses standard 0.08% / 0.02% per day (not derived from 30-day coupon / 30).
  lateFee: {
    basis: "Overdue Amount",
    gracePeriodDays: 5,
    dailyPctInvestors: 0.08,
    dailyPctASN: 0.02,
  },
  termSheetLink: null,

  kpCreditMemo:
    "KP Credit Memo — Cahaya Energi Asia: diversified oil & gas services revenue, anchor PO dari Aztech Group. Plafond PO dinaikkan ke IDR 15B untuk menampung beberapa tranche serupa.",
  projectCreditMemo:
    "Project Credit Memo — Aztech #1: IDR 6B domestic PO financing, daily interest structure, 90-day tenor. Payor diligence completed; underlying PO documentation in GDrive.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-cea-aztech-calc",
  projectNotes: [
    {
      author: "Junaidi",
      date: "2025-10-22",
      content:
        "Submission PO/Invoice + Plafond. Calculator extracted — rates match term sheet. Plafond headroom perlu IC tinjau bersamaan dengan tranche.",
    },
  ],

  ptDetails: [
    {
      id: "pt-cea1",
      name: "PT Cahaya Energi Asia",
      bank: "Mandiri",
      accountNumber: "1260011422085",
      accountholderName: "PT Cahaya Energi Asia",
      slikFileUrl: null,
      slikExecSummary: "SLIK PT — performing (prototype summary).",
      warnings: [],
    },
  ],

  payorInvoices: [
    {
      id: "pay-cea-1",
      payorLabel: "Aztech Industries Berhad",
      poOrInvoiceNumber: "PO-AZTECH-DOM-2025-8841",
      dueDate: "2026-02-12",
      amount: 6_000_000_000,
      currency: "IDR",
      payorType: "Corporate PO (anchor)",
      payeeProjects: "Cahaya Energi Asia — Aztech #1",
      notes: "Domestic PO line; diligence pack in GDrive.",
      riskLevel: "Low",
    },
  ],

  fundingSource: "KF & KCF",
  bankDetailsReviewed: true,
  taxWithholdings: "Yes",

  icVotes: [
    { memberId: "ic-1", memberName: "Ben Elberger", isPrincipal: true, vote: "Approve", votedAt: "2025-10-23T10:00:00Z" },
    { memberId: "ic-2", memberName: "Aldi Haryopratomo", isPrincipal: false, vote: null, votedAt: null },
    { memberId: "ic-3", memberName: "Junaidi", isPrincipal: false, vote: null, votedAt: null },
  ],
  approvalNotes: "",
  specialNotesForIC:
    "⚠️ Combined IC: tranche IDR 6B (Daily Interest) + plafond line (naik ke IDR 15B PO sub-limit dari IDR 12B aktif). Outstanding KP IDR 6B — sisa headroom setelah approval tercermin di baris Proposed.",
  conditionsSubsequent: [
    "Execute PO / underlying invoice documentation before first disbursement",
    "Confirm plafond registry update in Coda after IC approval",
  ],
};

// ─── Project 5: Maju — Asset D, Project + Plafond ────────────────────────────
// Coda row: i-_5laC-0qZa — Coda Project Name: **Maju #4 - Working Capital**
// Identity fields match Coda; plafond / PIC dates / PT account are illustrative until the app reads live Coda + Brand rows.

const projectAssetDPlafond: ICProject = {
  id: "proj-assetd-plafond",
  codaRowId: "i-_5laC-0qZa",
  brandName: "Maju",
  brandIsNew: false,
  projectName: "Maju #4 - Working Capital",
  approvalType: "Project+Plafond",
  submittedAt: "2026-06-02T10:00:00Z",

  pic: {
    submitter: "Junaidi",
    primaryAnalyst: "Nila Layla Melinda",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 4,
  brandActiveProjects: 1,
  brandCompletedProjects: 2,
  brandBeforeICProjects: 0,
  brandPendingDisbursementProjects: 0,
  mainSector: "Consumer Goods",
  subSector: null,
  syariah: false,
  assetClass: "D",
  requestedAmountCurrency: "IDR",
  requestedAmount: 1_800_000_000,
  trancheTargetAmount: 1_800_000_000,
  amountWarning: null,
  financingUse: "Working Capital",
  sectorWarning: null,

  plafond: {
    proposed: {
      totalLimit: 4_000_000_000,
      poSubLimit: 0,
      wcSubLimit: 4_000_000_000,
    },
    current: {
      totalLimit: 2_500_000_000,
      poSubLimit: 0,
      wcSubLimit: 2_500_000_000,
      effectiveDate: "2024-02-01",
      expiryDate: "2027-02-01",
      limitStatus: "Active",
    },
    outstandingTotal: 900_000_000,
    outstandingWC: 0,
    remainingTotal: 1_600_000_000,
    remainingPO: 0,
    remainingWC: 1_600_000_000,
    superseded: [
      {
        totalLimit: 1_500_000_000,
        poSubLimit: 0,
        wcSubLimit: 1_500_000_000,
        effectiveDate: "2022-01-01",
        expiryDate: "2024-01-31",
      },
    ],
  },

  financialReviews: [
    {
      submissionDate: "2026-05-28",
      financialReportsReviewed: "Mgmt accounts + bank Q1–Q2 2026",
      periodEndingDate: "2026-04-30",
      limitRecommendation: "Increase",
      limitCurrentIdr: 2_500_000_000,
      limitRecommendedIdr: 4_000_000_000,
      reviewNotes:
        "Working-capital cycle supports higher WC ceiling alongside project #4; align limit with latest management accounts.",
    },
  ],

  referralSource: "2nd+ project",
  specificReferror: null,
  referrorBelongsToKP: null,
  firstProjectReferralOverride: {
    referralSource: "Karmapreneur",
    specificReferror: null,
    referrorBelongsToKP: null,
  },
  otherReferees: [],

  submissionProjectedBEPMonths: 14,

  kpContacts: [
    {
      id: "kpc-maju-1",
      name: "KP signatory (sync People from Coda)",
      role: "Direktur Utama",
      notesOnPerson:
        "Replace with People row linked from Coda for i-_5laC-0qZa. Placeholder keeps IC card shape only.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/maju-kp-slik-placeholder",
      slikExecSummary:
        "Replace with SLIK exec summary from diligence / People. Placeholder text for mock only.",
      uboExposure: 900_000_000,
    },
  ],

  pastProjects: [
    {
      id: "pp-maju-3",
      projectName: "Maju (#3) — Prior facility",
      status: "Completed",
      icApprovalDate: "2025-08-01",
      returnType: "Revenue Share (Return-Capped)",
      amount: 1_200_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 24,
      otfTermMonths: 22,
      otfIRR: 19.2,
      projectedIRR: 18.0,
      otfMOIC: null,
      projectedMOIC: "1.28x",
      projectedBEPMonths: 15,
      currentDPD: 0,
      maxDPD: 0,
      pvaPct: 0.94,
      revShareTermsSnapshot: {
        capType: "Return Cap",
        capMultiple: 1.3,
        capTimePeriodMonths: null,
        preBEPRevSharePct: 7.0,
        postBEPRevSharePct: 7.5,
        minReturn: null,
        minReturnMultiple: null,
        minReturnPayableMonths: null,
      },
      lateFeeRecap: {
        basis: "Overdue Amount",
        gracePeriodDays: 5,
        dailyPctInvestors: 0.08,
        dailyPctASN: 0.02,
      },
    },
    {
      id: "pp-maju-4",
      projectName: "Maju #4 - Working Capital",
      status: "Proposed",
      icApprovalDate: "2026-06-02",
      isCurrentSubmission: true,
      returnType: "Revenue Share (Return-Capped)",
      amount: 1_800_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 26,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 22.4,
      otfMOIC: null,
      projectedMOIC: "1.42x",
      projectedBEPMonths: 14,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Revenue Share (Return-Capped)",
  disbursements: [{ tranche: 1, plannedAmount: 1_800_000_000, plannedDate: "2026-06-15" }],
  branches: [],
  revenueShareTerms: {
    sourceOfRevenueAccrued:
      "KP net sales (after discounts, before VAT) as booked in management accounts — working-capital facility; revenue definition per term sheet",
    frequency: "Monthly",
    dueDate: "10th calendar day",
    capType: "Return Cap",
    capMultiple: 1.35,
    capTimePeriodMonths: null,
    revShareStartType: "Fixed",
    revShareStartDate: "2026-07-01",
    preBEPRevSharePct: 7.5,
    postBEPRevSharePct: 8.0,
    carryType: "Variable Platform Fee",
    carryPct: 2.0,
    minReturn: null,
    minReturnMultiple: null,
    minReturnPayableMonths: null,
    revProjectionArray: monthsRevenueProjection(48, 420_000_000),
  },
  fixedReturnTerms: null,
  lateFee: {
    basis: "Overdue Amount",
    gracePeriodDays: 5,
    dailyPctInvestors: 0.08,
    dailyPctASN: 0.02,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Maju**\n\nRepeat KP; prior projects completed on revenue-share terms. Working-capital line supports inventory and receivables cycle — see latest financial review.",
  projectCreditMemo:
    "**Project Credit Memo — Maju #4 - Working Capital**\n\nCoda row i-_5laC-0qZa. Return-capped revenue share 1.35×, single disbursement. Combined IC includes WC plafond adjustment (illustrative limits in mock — replace from Brand/Project in production).",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-maju-wc-calc",
  projectNotes: [
    {
      author: "Armeno Devan",
      date: "2026-06-01",
      content:
        "Submission Project+Plafond for Maju #4 - Working Capital (i-_5laC-0qZa). Sync plafond + PT bank details from Coda before disbursement.",
    },
  ],

  ptDetails: [
    {
      id: "pt-maju-1",
      name: "PT Maju (legal name from Brand in Coda)",
      bank: "BCA",
      accountNumber: "TBD",
      accountholderName: "PT Maju (legal name from Brand in Coda)",
      slikFileUrl: "https://drive.google.com/file/slik-pt-maju-placeholder",
      slikExecSummary: "Replace with corporate SLIK summary from Coda / diligence.",
      warnings: [],
    },
  ],

  fundingSource: "KF & KCF",
  bankDetailsReviewed: true,
  taxWithholdings: "Yes",
  icVotes: [
    { memberId: "ic-1", memberName: "Ben Elberger", isPrincipal: true, vote: null, votedAt: null },
    { memberId: "ic-2", memberName: "Aldi Haryopratomo", isPrincipal: false, vote: null, votedAt: null },
    { memberId: "ic-3", memberName: "Junaidi", isPrincipal: false, vote: null, votedAt: null },
  ],
  approvalNotes: "",
  specialNotesForIC:
    "⚠️ Combined IC: Maju #4 - Working Capital — tranche IDR 1.8B (Revenue Share Return-Capped 1.35×) + plafond line (WC sub-limit naik ke IDR 4B dari IDR 2.5B aktif, contoh mock). Outstanding KP IDR 900jt — sisa headroom setelah approval tercermin di baris Proposed.\n\nCoda Project row: i-_5laC-0qZa.",
  conditionsSubsequent: [
    "Execute tranche documentation and milestone sign-off before each disbursement",
    "Confirm plafond registry update in Coda after IC approval",
  ],
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const mockProjects: ICProject[] = [
  projectHolycow,
  projectShushu,
  projectCUM,
  projectCEA,
  projectAssetDPlafond,
];

export function getProjectById(id: string): ICProject | undefined {
  return mockProjects.find((p) => p.id === id);
}

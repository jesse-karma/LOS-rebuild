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
      whatsapp: "+62 - 811 2345 6781",
      email: "regina.tiffani@steakhotelbyholycow.com",
      role: "Direktur Utama / Co-Founder",
      notesOnPerson:
        "Co-founder Holycow sejak 2010. Background marketing — bertanggung jawab atas ekspansi brand dan hubungan investor. Sangat komunikatif dan responsif dalam proses due diligence. Menanggani operasional seluruh outlet.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-regina-tiffani",
      slikExecSummary:
        "KTP Jakarta Selatan. KPR di BCA (aktif, performing). Tidak ada kredit konsumer lain. SLIK bersih per Februari 2026.",
    },
    {
      id: "kpc-hc2",
      name: "Syifa Sarini",
      whatsapp: "+62 - 812 3344 5566",
      email: "syifa.sarini@steakhotelbyholycow.com",
      role: "CFO / Direktur Keuangan",
      notesOnPerson:
        "Bergabung 2018. Ex-Deloitte (4 tahun), sebelumnya konsultan F&B di Jakarta. Penanggung jawab laporan keuangan, rekening koran, dan hubungan dengan perbankan. Sangat transparan dalam disclosure.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-syifa-sarini",
      slikExecSummary:
        "KTP Jakarta Pusat. Kredit motor lunas 2022. Tidak ada catatan negatif. SLIK bersih per Februari 2026.",
    },
    {
      id: "kpc-hc3",
      name: "Iswanda Mardio",
      whatsapp: "+62 - 813 4455 6677",
      email: "iswanda.mardio@steakhotelbyholycow.com",
      role: "General Manager",
      notesOnPerson:
        "GM operasional untuk outlet luar Jakarta. Penanggung jawab ekspansi Medan. Menandatangani perjanjian sebagai kuasa direksi.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: false,
      slikFileUrl: null,
      slikExecSummary: null,
    },
    {
      id: "kpc-hc4",
      name: "Erwynda Semiartie",
      whatsapp: "+62 - 814 5566 7788",
      email: "erwynda.semiartie@steakhotelbyholycow.com",
      role: "Finance & Admin Manager",
      notesOnPerson:
        "Bertanggung jawab atas rekening koran dan koordinasi pembayaran di outlet luar Jakarta.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: false,
      slikFileUrl: null,
      slikExecSummary: null,
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
        carryType: "Fixed Platform Fee",
        carryPct: 2.0,
        sourceOfRevenueAccrued: "Sales setelah dikurangi diskon, sebelum PB1/PPN, sebelum Service Charge",
        frequency: "Monthly",
        dueDate: "Tanggal 15 setiap bulan",
      },
    },
    {
      id: "pp-hc2",
      projectName: "Steak Hotel by Holycow (#2) — Working Capital, Fatmawati",
      status: "Active",
      icApprovalDate: "2022-11-20",
      sector: "F&B",
      subSector: "Full Service Resto",
      taxWithholdings: "Yes",
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
        carryType: "Fixed Platform Fee",
        carryPct: 2.16,
        sourceOfRevenueAccrued:
          "Sales setelah dikurangi diskon, sebelum PB1/PPN, sebelum Service Charge, sebelum komisi online dan biaya EDC/QRIS",
        frequency: "Monthly",
        dueDate: "Tanggal 15 setiap bulan",
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
      noteType: "Project Note",
      content:
        "Rev. 7 Apr 2026: Update dari KP — kontraktor renovasi sudah mulai. Estimasi selesai akhir Mei 2026. KCF split masih belum resolved, sedang di-follow up oleh tim Finance.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-03-12",
      noteType: "Project Note",
      content:
        "Rev. 12 Mar 2026: Site visit Sun Plaza Medan — lokasi strategis di lantai 3 dekat bioskop. Traffic makan siang dan malam kuat. Kompetitor terdekat: Abuba Steak (lantai 1) tapi segmen berbeda. KP sangat yakin dengan performa Medan.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-02-24",
      noteType: "Project Note",
      content:
        "24 Feb 2026: Submission pertama. Semua dokumen lengkap. Financial review selesai hari ini. Calculator file sudah diekstrak — data valid. KCF split belum diisi, perlu konfirmasi ke tim Finance.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-02-10",
      noteType: "KP Note",
      attendee: "Regina Tiffani",
      content:
        "Coffee catch-up dengan Regina di kantor pusat Holycow. Membahas rencana ekspansi ke 3 kota baru tahun ini. Regina update bahwa outlet Bandung baru saja mencatat rekor penjualan bulanan.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-01-15",
      noteType: "KP Note",
      attendee: "Syifa Sarini",
      content:
        "Meeting rutin triwulanan dengan Syifa untuk review laporan keuangan Q4 2025. Margin outlet stabil, tidak ada red flag. Syifa share bahwa mereka sedang evaluasi POS system baru.",
    },
    {
      author: "Priska Ponggawa",
      date: "2025-12-05",
      noteType: "KP Note",
      attendee: "Iswanda Mardio",
      content:
        "Site visit ke outlet Medan bersama Iswanda. Operasional berjalan lancar, traffic weekend tinggi. Iswanda flag potensi lokasi baru di Batam untuk dieksplorasi 2026.",
    },
    {
      author: "Priska Ponggawa",
      date: "2025-11-18",
      noteType: "KP Note",
      attendee: "Erwynda Semiartie",
      content:
        "Follow-up call dengan Erwynda soal rekening koran outlet luar Jakarta — semua dokumen sudah lengkap dan konsisten dengan laporan bulanan.",
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
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Selesaikan KF:KCF Disbursement Split sebelum disbursement", approver: "" },
    { letter: "B", name: "", condition: "Submit executed renovation contract sebelum disbursement", approver: "" },
    {
      letter: "C",
      name: "",
      condition: "Submit updated bank statements Q1 2026 untuk PT Ahara Bhadranaya",
      approver: "",
    },
  ],
  conditionsSubsequentLogic: "",
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
      whatsapp: "+62 - 815 6677 8899",
      email: "sandy.wiguna@shushu.id",
      role: "Founder / Direktur Utama",
      notesOnPerson:
        "Founder Shushu, 31 tahun. Background barista dan F&B ops — pernah bekerja di Kopi Kenangan sebagai area manager sebelum keluar dan build brand sendiri 2023. Sangat detail soal produk dan operasional. Handles semua aspek bisnis sendiri dengan 1 manajer operasional.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-sandy-wiguna",
      slikExecSummary:
        "KTP Tangerang Utara. Kredit motor lunas 2022. Tidak ada KPR. SLIK bersih per April 2026.",
    },
    {
      id: "kpc-ss2",
      name: "Regina Tiffani",
      whatsapp: "+62 - 813 2244 5566",
      email: "regina.tiffani@gmail.com",
      role: "Investor",
      notesOnPerson: "Also an investor/contact on Steak Hotel by Holycow — cross-brand UBO exposure.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: false,
      slikFileUrl: "",
      slikExecSummary: "",
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
      noteType: "Project Note",
      content:
        "2 Apr 2026: Submission. Semua dokumen lengkap. Financial review selesai hari ini. KP mereview agreement — sedang dalam proses Legal. Target disbursement 9 Apr.",
    },
    {
      author: "Sharfina Nindita",
      date: "2026-01-28",
      noteType: "KP Note",
      content:
        "28 Jan 2026: First meeting dengan Sandy Wiguna di PIK2. Outlet bersih dan terkelola dengan baik. Traffic peak di weekend dan sore hari. Sandy sangat paham P&L dan sangat antusias untuk ekspansi.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-03-20",
      noteType: "KP Note",
      attendee: "Sandy Wiguna",
      content:
        "Follow-up meeting dengan Sandy di outlet PIK2. Renovasi berjalan sesuai jadwal, target selesai akhir Mei. Sandy juga cerita rencana buka outlet ke-2 di BSD tahun depan.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-02-25",
      noteType: "KP Note",
      attendee: "Sandy Wiguna",
      content:
        "Check-in call — progress renovasi 60%. Sandy kirim foto progress kitchen equipment baru. Semua sesuai budget awal.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-02-05",
      noteType: "KP Note",
      attendee: "Regina Tiffani",
      content:
        "Ngobrol singkat dengan Regina (investor) soal keterlibatannya di Shushu — dia lebih pasif, fokus di Holycow. Tidak ada red flag exposure silang.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-01-10",
      noteType: "KP Note",
      attendee: "Sandy Wiguna",
      content:
        "First deep-dive call dengan Sandy sebelum submission. Sangat terbuka soal angka penjualan harian dan rencana renovasi. Kesan positif untuk kelanjutan hubungan.",
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
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    {
      letter: "A",
      name: "",
      condition: "Submit executed renovation invoice / work order sebelum disbursement",
      approver: "",
    },
    { letter: "B", name: "", condition: "Submit financial statements Q1 2026 sebelum disbursement", approver: "" },
    {
      letter: "C",
      name: "",
      condition: "Update performa revenue 3 bulan post-renovation (Juli 2026)",
      approver: "",
    },
  ],
  conditionsSubsequentLogic: "",
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
      whatsapp: "+62 - 816 7788 9900",
      email: "dwi.wicaksono@ciptausahamedia.co.id",
      role: "Direktur Utama",
      notesOnPerson:
        "Founder dan Direktur Utama CUM. Background di bidang HR outsourcing dan logistik sejak 2010. Sangat berpengalaman dalam mengelola kontrak korporat besar — klien utama termasuk Orang Tua Group, Indofood, dan Wings. Responsif dan profesional dalam semua komunikasi.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-dwi-wicaksono",
      slikExecSummary:
        "KTP Jakarta Timur. KPR di BNI (aktif, performing). Kredit kendaraan lunas 2021. Tidak ada catatan negatif. SLIK bersih per Maret 2026.",
    },
    {
      id: "kpc-cum2",
      name: "Nofriwan",
      whatsapp: "+62 - 817 8899 0011",
      email: "nofriwan@ciptausahamedia.co.id",
      role: "Direktur Operasional",
      notesOnPerson:
        "Co-founder. Penanggung jawab operasional lapangan — koordinasi tim workforce dan delivery. Memegang 35% saham.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-nofriwan",
      slikExecSummary:
        "KTP Bekasi. Tidak ada kredit aktif. SLIK bersih per Maret 2026.",
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
      sector: "Agencies",
      subSector: "Workforce Outsourcing",
      taxWithholdings: "Yes",
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
      noteType: "Project Note",
      content:
        "[DRAFT] Project Note: 9 Apr 2026. Proyek #26 disetujui IC. KF:KCF Disbursement Letter dalam proses. Target disbursement akhir pekan ini.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-03-31",
      noteType: "Project Note",
      content:
        "Submission proyek #26 — PO Orang Tua April cycle. CUM masih belum bisa produce balance sheet terbaru (accounting team baru belum fully onboarded). Bank statements Jan–Mar 2026 sudah ada dan cashflow konsisten. Koordinasi dengan Legal untuk persiapan contract.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-03-15",
      noteType: "KP Note",
      attendee: "Dwi Wicaksono Wibowo",
      content:
        "Quarterly check-in dengan Dwi — kontrak Orang Tua Group diperpanjang lagi untuk 2026. Dwi juga explore kemungkinan tambah klien baru di Wings Group.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-02-20",
      noteType: "KP Note",
      attendee: "Nofriwan",
      content:
        "Site visit ke gudang operasional CUM bersama Nofriwan. Koordinasi tim workforce terlihat rapi, tidak ada isu keterlambatan delivery.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-01-18",
      noteType: "KP Note",
      attendee: "Dwi Wicaksono Wibowo",
      content:
        "Diskusi soal potensi kenaikan plafond PO untuk menampung volume Orang Tua yang bertambah. Dwi akan siapkan data historis 12 bulan terakhir.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2025-12-10",
      noteType: "KP Note",
      attendee: "Nofriwan",
      content:
        "Year-end review call. Semua proyek #22-24 lunas tepat waktu, tidak ada DPD. Hubungan sangat solid.",
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
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "KF:KCF Disbursement Letter harus dilengkapi sebelum disbursement", approver: "" },
    {
      letter: "B",
      name: "",
      condition: "Submit balance sheet formal (per Des 2025 atau Mar 2026) sebelum proyek #27",
      approver: "",
    },
    { letter: "C", name: "", condition: "Submit PO / Invoice dari Orang Tua sebelum disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
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
      whatsapp: "",
      email: "",
      role: "Direktur Utama",
      notesOnPerson:
        "Prototype placeholder — sync full KP contact grid from Coda in production. Oil & gas services; primary relationship with Aztech Group POs.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: null,
      slikExecSummary: "SLIK on file per diligence folder (prototype).",
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
      noteType: "Project Note",
      content:
        "Submission PO/Invoice + Plafond. Calculator extracted — rates match term sheet. Plafond headroom perlu IC tinjau bersamaan dengan tranche.",
    },
    {
      author: "Junaidi",
      date: "2025-09-10",
      noteType: "KP Note",
      content:
        "Intro call dengan tim Cahaya Energi Asia soal kebutuhan pembiayaan PO Aztech Group berikutnya. Volume proyeksi meningkat untuk Q4.",
    },
    {
      author: "Junaidi",
      date: "2025-08-22",
      noteType: "KP Note",
      content:
        "Follow-up soal dokumentasi kontrak Aztech — masih menunggu update Coda sync untuk detail signatory KP.",
    },
    {
      author: "Junaidi",
      date: "2025-07-30",
      noteType: "KP Note",
      content:
        "Diskusi awal ekspansi plafond PO ke IDR 15B untuk menampung beberapa tranche serupa ke depannya.",
    },
    {
      author: "Junaidi",
      date: "2025-06-15",
      noteType: "KP Note",
      content:
        "Pertemuan pertama membahas profil bisnis oil & gas services — revenue terdiversifikasi dengan anchor klien Aztech Group.",
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
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    {
      letter: "A",
      name: "",
      condition: "Execute PO / underlying invoice documentation before first disbursement",
      approver: "",
    },
    { letter: "B", name: "", condition: "Confirm plafond registry update in Coda after IC approval", approver: "" },
  ],
  conditionsSubsequentLogic: "",
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
      whatsapp: "",
      email: "",
      role: "Direktur Utama",
      notesOnPerson:
        "Replace with People row linked from Coda for i-_5laC-0qZa. Placeholder keeps IC card shape only.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/maju-kp-slik-placeholder",
      slikExecSummary:
        "Replace with SLIK exec summary from diligence / People. Placeholder text for mock only.",
    },
  ],

  pastProjects: [
    {
      id: "pp-maju-3",
      projectName: "Maju (#3) — Prior facility",
      status: "Completed",
      icApprovalDate: "2025-08-01",
      sector: "Consumer Goods",
      taxWithholdings: "Yes",
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
        carryType: "Variable Platform Fee",
        carryPct: 2.0,
        sourceOfRevenueAccrued:
          "KP net sales (after discounts, before VAT) as booked in management accounts — working-capital facility; revenue definition per term sheet",
        frequency: "Monthly",
        dueDate: "10th calendar day",
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
      noteType: "Project Note",
      content:
        "Submission Project+Plafond for Maju #4 - Working Capital (i-_5laC-0qZa). Sync plafond + PT bank details from Coda before disbursement.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-05-20",
      noteType: "KP Note",
      content:
        "Check-in soal performa fasilitas #3 sebelum submission #4. Revenue share payment konsisten, tidak ada keterlambatan.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-04-25",
      noteType: "KP Note",
      content:
        "Diskusi rencana ekspansi consumer goods line — KP explore tambahan SKU baru untuk musim liburan.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-03-30",
      noteType: "KP Note",
      content:
        "Follow-up dokumentasi People/Coda sync untuk update signatory KP — masih pending dari tim ops.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-02-14",
      noteType: "KP Note",
      content:
        "Quarterly review — hubungan berjalan baik sejak fasilitas #3, tidak ada isu material.",
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
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    {
      letter: "A",
      name: "",
      condition: "Execute tranche documentation and milestone sign-off before each disbursement",
      approver: "",
    },
    { letter: "B", name: "", condition: "Confirm plafond registry update in Coda after IC approval", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Project 7: Tekstil Makmur Sentosa — Asset B-I, IC Review (no votes) ─────
// Assorted B2B Services and Manufacturing / Clothing Manufacturing | Asset B-I | Domestic Invoice Financing | IDR 350jt

const projectTekstilMakmur: ICProject = {
  id: "proj-tekstil-makmur",
  brandName: "Tekstil Makmur Sentosa",
  brandIsNew: true,
  projectName: "Tekstil Makmur Sentosa (#1) — Invoice Financing: Uniqlo Indonesia",
  approvalType: "PO/Invoice",
  submittedAt: "2026-06-22T10:30:00Z",

  pic: {
    submitter: "Juang Angger Pamungkas",
    primaryAnalyst: "Juang Angger Pamungkas",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 0,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "Assorted B2B Services and Manufacturing",
  subSector: "🎽Clothing Manufacturing",
  syariah: false,
  assetClass: "B - I",
  requestedAmountCurrency: "IDR",
  requestedAmount: 350_000_000,
  trancheTargetAmount: 350_000_000,
  amountWarning: null,
  financingUse: "Domestic Invoice Financing",
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
      submissionDate: "2026-06-20",
      financialReportsReviewed: "Bank Statements Mar–May 2026",
      periodEndingDate: "2026-05-31",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "KP baru, belum ada plafond. Kontrak manufaktur garmen dengan Uniqlo Indonesia sudah berjalan 2 tahun. Cashflow konsisten dengan volume invoice historis.",
    },
  ],

  referralSource: "Cold calling",
  specificReferror: null,
  referrorBelongsToKP: null,
  otherReferees: [],

  kpContacts: [
    {
      id: "kpc-tms1",
      name: "Hendra Wijaya Kusuma",
      whatsapp: "+62 - 819 3344 5566",
      email: "hendra.kusuma@tekstilmakmur.co.id",
      role: "Direktur Utama",
      notesOnPerson:
        "Founder pabrik konveksi sejak 2015. Kontrak manufaktur dengan Uniqlo Indonesia dan beberapa brand lokal. Responsif dalam proses diligence.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-hendra-kusuma",
      slikExecSummary: "KTP Bandung. Tidak ada kredit aktif. SLIK bersih per Juni 2026.",
    },
  ],

  pastProjects: [
    {
      id: "pp-tms-1",
      projectName: "Tekstil Makmur Sentosa (#1) — Invoice Financing: Uniqlo Indonesia [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-06-22",
      isCurrentSubmission: true,
      bRecapKind: "B-I",
      payors: ["Uniqlo Indonesia"],
      returnType: "Daily Interest",
      amount: 350_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 20.5,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Daily Interest",
  disbursements: [{ tranche: 1, plannedAmount: 350_000_000, plannedDate: "2026-07-01" }],
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
  lateFee: {
    basis: "Outstanding Principal",
    gracePeriodDays: 0,
    dailyPctInvestors: 0.1,
    dailyPctASN: 0,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Tekstil Makmur Sentosa**\n\nKP baru, submission pertama. Pabrik konveksi garmen dengan kontrak manufaktur ke Uniqlo Indonesia selama 2 tahun terakhir. Bank statements menunjukkan cashflow konsisten dengan volume invoice historis.",
  projectCreditMemo:
    "**Project Credit Memo — Invoice Financing: Uniqlo Indonesia**\n\nProyek pertama. Underlying invoice ke Uniqlo Indonesia. Daily interest 1.6%/bulan (KF), 0.6%/bulan (KCF). Tenor 2 bulan. MOIC 1.03x, IRR 20.5%.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-tekstil-makmur-calc",
  projectNotes: [
    {
      author: "Juang Angger Pamungkas",
      date: "2026-06-22",
      noteType: "Project Note",
      content: "Submission pertama. Menunggu review IC — belum ada vote masuk.",
    },
    {
      author: "Juang Angger Pamungkas",
      date: "2026-06-10",
      noteType: "KP Note",
      attendee: "Hendra Wijaya Kusuma",
      content:
        "Site visit ke pabrik Bandung bersama Hendra. Kapasitas produksi sesuai klaim, kontrak Uniqlo terverifikasi langsung dengan tim procurement mereka.",
    },
    {
      author: "Juang Angger Pamungkas",
      date: "2026-05-28",
      noteType: "KP Note",
      attendee: "Hendra Wijaya Kusuma",
      content:
        "Follow-up soal invoice financing untuk cycle berikutnya. Hendra sangat kooperatif share data historis pembayaran Uniqlo.",
    },
    {
      author: "Juang Angger Pamungkas",
      date: "2026-05-10",
      noteType: "KP Note",
      attendee: "Hendra Wijaya Kusuma",
      content:
        "First call — Hendra jelaskan model bisnis manufaktur kontrak dan hubungan jangka panjang dengan brand lokal.",
    },
    {
      author: "Juang Angger Pamungkas",
      date: "2026-04-22",
      noteType: "KP Note",
      attendee: "Hendra Wijaya Kusuma",
      content:
        "Referral dari KP lain di industri sejenis. Kesan awal positif, responsif dan transparan.",
    },
  ],

  ptDetails: [
    {
      id: "pt-tms1",
      name: "PT Tekstil Makmur Sentosa",
      bank: "BNI",
      accountNumber: "0198877665",
      accountholderName: "PT Tekstil Makmur Sentosa",
      slikFileUrl: "https://drive.google.com/file/slik-pt-tms",
      slikExecSummary: "PT aktif sejak 2015. Rekening BNI aktif, tidak ada pinjaman korporat. SLIK bersih per Juni 2026.",
      warnings: [],
    },
  ],

  payorInvoices: [
    {
      id: "pay-tms-1",
      payorLabel: "Uniqlo Indonesia",
      poOrInvoiceNumber: "INV-UNQ-2026-06-0088",
      dueDate: "2026-08-21",
      amount: 350_000_000,
      currency: "IDR",
      payorType: "Corporate Invoice (whitelisted)",
      payeeProjects: "Tekstil Makmur Sentosa (#1)",
      notes: "Underlying invoice for June 2026 production batch.",
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
  approvalNotes: "",
  specialNotesForIC: null,
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Submit executed invoice / PO documentation before disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Project 8: Distribusi Pangan Sejahtera — Asset B-PO, IC Review (no votes) ─
// Commodities Trading, Processing & Distribution / FMCG Distribution | Asset B-PO | Domestic PO Financing | IDR 400jt

const projectDistribusiPangan: ICProject = {
  id: "proj-distribusi-pangan",
  brandName: "Distribusi Pangan Sejahtera",
  brandIsNew: true,
  projectName: "Distribusi Pangan Sejahtera (#1) — PO Financing: Indofood",
  approvalType: "PO/Invoice",
  submittedAt: "2026-06-24T08:15:00Z",

  pic: {
    submitter: "Wesly Simatupang",
    primaryAnalyst: "Wesly Simatupang",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 0,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "Commodities Trading, Processing, & Distribution",
  subSector: "🥨FMCG Distribution",
  syariah: false,
  assetClass: "B - PO",
  requestedAmountCurrency: "IDR",
  requestedAmount: 400_000_000,
  trancheTargetAmount: 400_000_000,
  amountWarning: null,
  financingUse: "Domestic PO Financing",
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
      submissionDate: "2026-06-22",
      financialReportsReviewed: "Bank Statements Mar–May 2026",
      periodEndingDate: "2026-05-31",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "KP baru, belum ada plafond. Distributor FMCG dengan kontrak PO rutin dari Indofood. Cashflow konsisten dengan volume PO historis.",
    },
  ],

  referralSource: "KarmaClub Member",
  specificReferror: "Wesly Simatupang",
  referrorBelongsToKP: null,
  otherReferees: [],

  kpContacts: [
    {
      id: "kpc-dps1",
      name: "Anita Rahmawati Putri",
      whatsapp: "+62 - 821 4455 6677",
      email: "anita.putri@distribusipangan.co.id",
      role: "Direktur Utama",
      notesOnPerson:
        "Founder distributor FMCG sejak 2017. Kontrak PO rutin dengan Indofood untuk area Jawa Barat. Sangat kooperatif dalam diligence.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-anita-putri",
      slikExecSummary: "KTP Bandung. Kredit mobil aktif, performing. SLIK bersih per Juni 2026.",
    },
  ],

  pastProjects: [
    {
      id: "pp-dps-1",
      projectName: "Distribusi Pangan Sejahtera (#1) — PO Financing: Indofood [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-06-24",
      isCurrentSubmission: true,
      bRecapKind: "B-PO",
      payors: ["Indofood"],
      returnType: "Daily Interest",
      amount: 400_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 20.9,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Daily Interest",
  disbursements: [{ tranche: 1, plannedAmount: 400_000_000, plannedDate: "2026-07-05" }],
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
  lateFee: {
    basis: "Outstanding Principal",
    gracePeriodDays: 0,
    dailyPctInvestors: 0.1,
    dailyPctASN: 0,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Distribusi Pangan Sejahtera**\n\nKP baru, submission pertama. Distributor FMCG dengan kontrak PO rutin dari Indofood area Jawa Barat sejak 2017. Bank statements menunjukkan cashflow konsisten.",
  projectCreditMemo:
    "**Project Credit Memo — PO Financing: Indofood**\n\nProyek pertama. Underlying PO dari Indofood. Daily interest 1.6%/bulan (KF), 0.6%/bulan (KCF). Tenor 2 bulan. MOIC 1.03x, IRR 20.9%.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-distribusi-pangan-calc",
  projectNotes: [
    {
      author: "Wesly Simatupang",
      date: "2026-06-24",
      noteType: "Project Note",
      content: "Submission pertama. Menunggu review IC — belum ada vote masuk.",
    },
    {
      author: "Wesly Simatupang",
      date: "2026-06-12",
      noteType: "KP Note",
      attendee: "Anita Rahmawati Putri",
      content:
        "Site visit gudang distribusi Bandung bersama Anita. Stok dan rotasi barang terkelola rapi, sesuai standar Indofood.",
    },
    {
      author: "Wesly Simatupang",
      date: "2026-05-30",
      noteType: "KP Note",
      attendee: "Anita Rahmawati Putri",
      content:
        "Follow-up call — Anita share proyeksi volume PO meningkat untuk semester 2, sudah dikonfirmasi buyer.",
    },
    {
      author: "Wesly Simatupang",
      date: "2026-05-08",
      noteType: "KP Note",
      attendee: "Anita Rahmawati Putri",
      content:
        "First meeting — Anita sangat kooperatif, langsung share kontrak PO Indofood untuk verifikasi payor.",
    },
    {
      author: "Wesly Simatupang",
      date: "2026-04-20",
      noteType: "KP Note",
      attendee: "Anita Rahmawati Putri",
      content:
        "Warm intro dari jaringan distributor FMCG Jawa Barat. Profil bisnis solid sejak 2017.",
    },
  ],

  ptDetails: [
    {
      id: "pt-dps1",
      name: "PT Distribusi Pangan Sejahtera",
      bank: "BCA",
      accountNumber: "4460098123",
      accountholderName: "PT Distribusi Pangan Sejahtera",
      slikFileUrl: "https://drive.google.com/file/slik-pt-dps",
      slikExecSummary: "PT aktif sejak 2017. Rekening BCA aktif. SLIK bersih per Juni 2026.",
      warnings: [],
    },
  ],

  payorInvoices: [
    {
      id: "pay-dps-1",
      payorLabel: "Indofood",
      poOrInvoiceNumber: "PO-IDF-2026-06-0231",
      dueDate: "2026-08-24",
      amount: 400_000_000,
      currency: "IDR",
      payorType: "Corporate PO (whitelisted)",
      payeeProjects: "Distribusi Pangan Sejahtera (#1)",
      notes: "Underlying PO aligned to June 2026 distribution cycle.",
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
  approvalNotes: "",
  specialNotesForIC: null,
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Submit executed PO documentation before disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Project 9: Karya Logistik Prima — Asset B-I, Finance Slotting ───────────
// Assorted B2B Services and Manufacturing / Logistics | Asset B-I | Domestic Invoice Financing | IDR 300jt
// Baked-in Principal approval (1 vote required, ≤4B tier) reaches Finance Slotting with no workflow override.

const projectKaryaLogistik: ICProject = {
  id: "proj-karya-logistik",
  brandName: "Karya Logistik Prima",
  brandIsNew: true,
  projectName: "Karya Logistik Prima (#1) — Invoice Financing: JNE Express",
  approvalType: "PO/Invoice",
  submittedAt: "2026-06-10T09:45:00Z",

  pic: {
    submitter: "Priska Ponggawa",
    primaryAnalyst: "Priska Ponggawa",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 0,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "Assorted B2B Services and Manufacturing",
  subSector: "🚚Logistics",
  syariah: false,
  assetClass: "B - I",
  requestedAmountCurrency: "IDR",
  requestedAmount: 300_000_000,
  trancheTargetAmount: 300_000_000,
  amountWarning: null,
  financingUse: "Domestic Invoice Financing",
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
      submissionDate: "2026-06-08",
      financialReportsReviewed: "Bank Statements Mar–May 2026",
      periodEndingDate: "2026-05-31",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "KP baru, belum ada plafond. Perusahaan logistik pihak ketiga dengan kontrak subkontrak dari JNE Express. Cashflow konsisten.",
    },
  ],

  referralSource: "Karma Node",
  specificReferror: "Dian Kusuma",
  referrorBelongsToKP: null,
  otherReferees: [],

  kpContacts: [
    {
      id: "kpc-klp1",
      name: "Bayu Setiawan Halim",
      whatsapp: "+62 - 822 5566 7788",
      email: "bayu.halim@karyalogistikprima.co.id",
      role: "Direktur Utama",
      notesOnPerson: "Founder perusahaan logistik pihak ketiga sejak 2019. Kontrak subkontrak dengan JNE Express untuk area Jabodetabek.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-bayu-halim",
      slikExecSummary: "KTP Tangerang. Tidak ada kredit aktif. SLIK bersih per Juni 2026.",
    },
  ],

  pastProjects: [
    {
      id: "pp-klp-1",
      projectName: "Karya Logistik Prima (#1) — Invoice Financing: JNE Express [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-06-10",
      isCurrentSubmission: true,
      bRecapKind: "B-I",
      payors: ["JNE Express"],
      returnType: "Daily Interest",
      amount: 300_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 20.6,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Daily Interest",
  disbursements: [{ tranche: 1, plannedAmount: 300_000_000, plannedDate: "2026-06-25" }],
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
  lateFee: {
    basis: "Outstanding Principal",
    gracePeriodDays: 0,
    dailyPctInvestors: 0.1,
    dailyPctASN: 0,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Karya Logistik Prima**\n\nKP baru, submission pertama. Perusahaan logistik pihak ketiga dengan kontrak subkontrak JNE Express sejak 2019. Bank statements menunjukkan cashflow konsisten.",
  projectCreditMemo:
    "**Project Credit Memo — Invoice Financing: JNE Express**\n\nProyek pertama. Underlying invoice ke JNE Express. Daily interest 1.6%/bulan (KF), 0.6%/bulan (KCF). Tenor 2 bulan. MOIC 1.03x, IRR 20.6%.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-karya-logistik-calc",
  projectNotes: [
    {
      author: "Priska Ponggawa",
      date: "2026-06-10",
      noteType: "Project Note",
      content: "Submission pertama. Approved by Principal — menunggu Finance untuk KF:KCF split.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-05-28",
      noteType: "KP Note",
      attendee: "Bayu Setiawan Halim",
      content:
        "Site visit ke fasilitas logistik Jabodetabek bersama Bayu. Armada dan tim ops terkoordinasi baik, subkontrak JNE berjalan lancar.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-05-15",
      noteType: "KP Note",
      attendee: "Bayu Setiawan Halim",
      content:
        "Follow-up soal invoice financing pertama — Bayu share history pembayaran JNE 12 bulan terakhir, konsisten tanpa keterlambatan.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-04-30",
      noteType: "KP Note",
      attendee: "Bayu Setiawan Halim",
      content:
        "First call — Bayu jelaskan model bisnis subkontrak logistik pihak ketiga sejak 2019.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-04-10",
      noteType: "KP Note",
      attendee: "Bayu Setiawan Halim",
      content:
        "Referral dari KP existing di sektor logistik. Kesan awal profesional dan terbuka.",
    },
  ],

  ptDetails: [
    {
      id: "pt-klp1",
      name: "PT Karya Logistik Prima",
      bank: "Bank Maybank",
      accountNumber: "2201155678",
      accountholderName: "KARYA LOGISTIK PRIMA",
      slikFileUrl: "https://drive.google.com/file/slik-pt-klp",
      slikExecSummary: "PT aktif sejak 2019. Rekening Maybank aktif. SLIK bersih per Juni 2026.",
      warnings: [],
    },
  ],

  payorInvoices: [
    {
      id: "pay-klp-1",
      payorLabel: "JNE Express",
      poOrInvoiceNumber: "INV-JNE-2026-06-0512",
      dueDate: "2026-08-09",
      amount: 300_000_000,
      currency: "IDR",
      payorType: "Corporate Invoice (whitelisted)",
      payeeProjects: "Karya Logistik Prima (#1)",
      notes: "Underlying invoice for June 2026 subcontract cycle.",
      riskLevel: "Low",
    },
  ],

  fundingSource: "KF & KCF",
  bankDetailsReviewed: true,
  taxWithholdings: "Yes",
  icVotes: [
    { memberId: "ic-1", memberName: "Ben Elberger", isPrincipal: true, vote: "Approve", votedAt: "2026-06-12T09:00:00Z" },
    { memberId: "ic-2", memberName: "Aldi Haryopratomo", isPrincipal: false, vote: null, votedAt: null },
    { memberId: "ic-3", memberName: "Junaidi", isPrincipal: false, vote: null, votedAt: null },
  ],
  approvalNotes: "Approved by Principal — amount kecil, KP baru dengan kontrak subkontrak yang jelas.",
  specialNotesForIC: null,
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Submit executed invoice / PO documentation before disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Project 10: Elektronik Jaya Abadi — Asset B-PO, Finance Slotting ────────
// Commodities Trading, Processing & Distribution / Electronics Distribution | Asset B-PO | Domestic PO Financing | IDR 280jt

const projectElektronikJaya: ICProject = {
  id: "proj-elektronik-jaya",
  brandName: "Elektronik Jaya Abadi",
  brandIsNew: true,
  projectName: "Elektronik Jaya Abadi (#1) — PO Financing: Electronic City",
  approvalType: "PO/Invoice",
  submittedAt: "2026-06-11T11:20:00Z",

  pic: {
    submitter: "Nila Layla Melinda",
    primaryAnalyst: "Nila Layla Melinda",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 0,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "Commodities Trading, Processing, & Distribution",
  subSector: "🔌Electronics Distribution",
  syariah: false,
  assetClass: "B - PO",
  requestedAmountCurrency: "IDR",
  requestedAmount: 280_000_000,
  trancheTargetAmount: 280_000_000,
  amountWarning: null,
  financingUse: "Domestic PO Financing",
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
      submissionDate: "2026-06-09",
      financialReportsReviewed: "Bank Statements Mar–May 2026",
      periodEndingDate: "2026-05-31",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "KP baru, belum ada plafond. Distributor elektronik dengan kontrak PO rutin dari Electronic City. Cashflow konsisten.",
    },
  ],

  referralSource: "Potential Karmapreneur",
  specificReferror: null,
  referrorBelongsToKP: null,
  otherReferees: [],

  kpContacts: [
    {
      id: "kpc-eja1",
      name: "Rendra Kusumo Aji",
      whatsapp: "+62 - 823 6677 8899",
      email: "rendra.aji@elektronikjayaabadi.co.id",
      role: "Direktur Utama",
      notesOnPerson: "Founder distributor elektronik sejak 2016. Kontrak PO rutin dengan Electronic City area Surabaya.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-rendra-aji",
      slikExecSummary: "KTP Surabaya. Kredit mobil lunas 2022. SLIK bersih per Juni 2026.",
    },
  ],

  pastProjects: [
    {
      id: "pp-eja-1",
      projectName: "Elektronik Jaya Abadi (#1) — PO Financing: Electronic City [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-06-11",
      isCurrentSubmission: true,
      bRecapKind: "B-PO",
      payors: ["Electronic City"],
      returnType: "Daily Interest",
      amount: 280_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 20.7,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Daily Interest",
  disbursements: [{ tranche: 1, plannedAmount: 280_000_000, plannedDate: "2026-06-26" }],
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
  lateFee: {
    basis: "Outstanding Principal",
    gracePeriodDays: 0,
    dailyPctInvestors: 0.1,
    dailyPctASN: 0,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Elektronik Jaya Abadi**\n\nKP baru, submission pertama. Distributor elektronik dengan kontrak PO rutin dari Electronic City area Surabaya sejak 2016. Cashflow konsisten dengan volume PO historis.",
  projectCreditMemo:
    "**Project Credit Memo — PO Financing: Electronic City**\n\nProyek pertama. Underlying PO dari Electronic City. Daily interest 1.6%/bulan (KF), 0.6%/bulan (KCF). Tenor 2 bulan. MOIC 1.03x, IRR 20.7%.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-elektronik-jaya-calc",
  projectNotes: [
    {
      author: "Nila Layla Melinda",
      date: "2026-06-11",
      noteType: "Project Note",
      content: "Submission pertama. Approved by Principal — menunggu Finance untuk KF:KCF split.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-05-29",
      noteType: "KP Note",
      attendee: "Rendra Kusumo Aji",
      content:
        "Site visit gudang elektronik Surabaya bersama Rendra. Stok terkontrol dengan sistem inventory yang rapi.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-05-16",
      noteType: "KP Note",
      attendee: "Rendra Kusumo Aji",
      content:
        "Follow-up — Rendra share kontrak PO Electronic City untuk cycle berikutnya, volume stabil.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-05-01",
      noteType: "KP Note",
      attendee: "Rendra Kusumo Aji",
      content:
        "First meeting — Rendra ceritakan perjalanan distributor elektronik sejak 2016, fokus area Surabaya.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-04-12",
      noteType: "KP Note",
      attendee: "Rendra Kusumo Aji",
      content:
        "Warm intro dari jaringan distributor elektronik. Profil kooperatif dan transparan soal data penjualan.",
    },
  ],

  ptDetails: [
    {
      id: "pt-eja1",
      name: "PT Elektronik Jaya Abadi",
      bank: "BNI",
      accountNumber: "0177665544",
      accountholderName: "PT Elektronik Jaya Abadi",
      slikFileUrl: "https://drive.google.com/file/slik-pt-eja",
      slikExecSummary: "PT aktif sejak 2016. Rekening BNI aktif. SLIK bersih per Juni 2026.",
      warnings: [],
    },
  ],

  payorInvoices: [
    {
      id: "pay-eja-1",
      payorLabel: "Electronic City",
      poOrInvoiceNumber: "PO-ECT-2026-06-0077",
      dueDate: "2026-08-10",
      amount: 280_000_000,
      currency: "IDR",
      payorType: "Corporate PO (whitelisted)",
      payeeProjects: "Elektronik Jaya Abadi (#1)",
      notes: "Underlying PO aligned to June 2026 distribution cycle.",
      riskLevel: "Low",
    },
  ],

  fundingSource: "KF & KCF",
  bankDetailsReviewed: true,
  taxWithholdings: "Yes",
  icVotes: [
    { memberId: "ic-1", memberName: "Ben Elberger", isPrincipal: true, vote: "Approve", votedAt: "2026-06-13T09:00:00Z" },
    { memberId: "ic-2", memberName: "Aldi Haryopratomo", isPrincipal: false, vote: null, votedAt: null },
    { memberId: "ic-3", memberName: "Junaidi", isPrincipal: false, vote: null, votedAt: null },
  ],
  approvalNotes: "Approved by Principal — PO financing rutin dengan payor whitelisted.",
  specialNotesForIC: null,
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Submit executed PO documentation before disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Project 11: Griya Sehat Farma — Asset D, Finance Slotting ───────────────
// Healthcare and Petcare Clinics / Pharmacy | Asset D | Working Capital | IDR 1.5B

const projectGriyaSehat: ICProject = {
  id: "proj-griya-sehat",
  brandName: "Griya Sehat Farma",
  brandIsNew: true,
  projectName: "Griya Sehat Farma (#1) — Working Capital",
  approvalType: "Project",
  submittedAt: "2026-06-13T09:00:00Z",

  pic: {
    submitter: "Armeno Devan",
    primaryAnalyst: "Armeno Devan",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 0,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "Healthcare and Petcare Clinics",
  subSector: "Pharmacy",
  syariah: false,
  assetClass: "D",
  requestedAmountCurrency: "IDR",
  requestedAmount: 1_500_000_000,
  amountWarning: null,
  financingUse: "Working Capital Financing",
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
      submissionDate: "2026-06-11",
      financialReportsReviewed: "Management Accounts Jan–May 2026",
      periodEndingDate: "2026-05-31",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "KP baru, belum ada plafond. Jaringan apotek dengan 3 outlet di Bandung. Cashflow konsisten, dana untuk restock inventory.",
    },
  ],

  referralSource: "Ex-Karma Staff",
  specificReferror: "Maya Kusuma",
  referrorBelongsToKP: null,
  otherReferees: [],

  submissionProjectedBEPMonths: 12,

  kpContacts: [
    {
      id: "kpc-gsf1",
      name: "Dewi Anggraeni Suryana",
      whatsapp: "+62 - 824 7788 9900",
      email: "dewi.suryana@griyasehatfarma.co.id",
      role: "Direktur Utama",
      notesOnPerson: "Founder jaringan apotek sejak 2019, kini 3 outlet di Bandung. Background farmasi — apoteker bersertifikat.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-dewi-suryana",
      slikExecSummary: "KTP Bandung. KPR di BCA, performing. SLIK bersih per Juni 2026.",
    },
  ],

  pastProjects: [
    {
      id: "pp-gsf-1",
      projectName: "Griya Sehat Farma (#1) — Working Capital [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-06-13",
      isCurrentSubmission: true,
      returnType: "Revenue Share (Return-Capped)",
      amount: 1_500_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 20,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 19.8,
      otfMOIC: null,
      projectedMOIC: "1.32x",
      projectedBEPMonths: 12,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Revenue Share (Return-Capped)",
  disbursements: [{ tranche: 1, plannedAmount: 1_500_000_000, plannedDate: "2026-06-28" }],
  branches: [],
  revenueShareTerms: {
    sourceOfRevenueAccrued: "KP net sales (after discounts, before VAT) as booked in management accounts",
    frequency: "Monthly",
    dueDate: "Tanggal 5 setiap bulan",
    capType: "Return Cap",
    capMultiple: 1.32,
    capTimePeriodMonths: null,
    revShareStartType: "Fixed",
    revShareStartDate: "2026-07-05",
    preBEPRevSharePct: 7.0,
    postBEPRevSharePct: 7.5,
    carryType: "Variable Platform Fee",
    carryPct: 2.0,
    minReturn: null,
    minReturnMultiple: null,
    minReturnPayableMonths: null,
    revProjectionArray: monthsRevenueProjection(20, 200_000_000),
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
    "**KP Credit Memo — Griya Sehat Farma**\n\nKP baru, submission pertama. Jaringan apotek dengan 3 outlet di Bandung, berdiri sejak 2019. Founder apoteker bersertifikat. Cashflow konsisten, tidak ada hutang bank.",
  projectCreditMemo:
    "**Project Credit Memo — Working Capital**\n\nProyek pertama. Revenue Share return-capped 1.32x. Dana untuk restock inventory 3 outlet. IRR proyeksi 19.8%, MOIC 1.32x.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-griya-sehat-calc",
  projectNotes: [
    {
      author: "Armeno Devan",
      date: "2026-06-13",
      noteType: "Project Note",
      content: "Submission pertama. Approved by Principal — menunggu Finance untuk KF:KCF split.",
    },
    {
      author: "Armeno Devan",
      date: "2026-06-01",
      noteType: "KP Note",
      attendee: "Dewi Anggraeni Suryana",
      content:
        "Site visit ke 3 outlet apotek Bandung bersama Dewi. Operasional rapi, semua staf bersertifikat farmasi.",
    },
    {
      author: "Armeno Devan",
      date: "2026-05-18",
      noteType: "KP Note",
      attendee: "Dewi Anggraeni Suryana",
      content:
        "Follow-up soal rencana modal kerja untuk restock musim flu — Dewi share data penjualan bulanan 6 bulan terakhir.",
    },
    {
      author: "Armeno Devan",
      date: "2026-05-02",
      noteType: "KP Note",
      attendee: "Dewi Anggraeni Suryana",
      content:
        "First call dengan Dewi, apoteker bersertifikat dan sangat detail soal compliance farmasi.",
    },
    {
      author: "Armeno Devan",
      date: "2026-04-14",
      noteType: "KP Note",
      attendee: "Dewi Anggraeni Suryana",
      content:
        "Referral dari jaringan apotek lain. Kesan awal sangat profesional.",
    },
  ],

  ptDetails: [
    {
      id: "pt-gsf1",
      name: "PT Griya Sehat Farma",
      bank: "BCA",
      accountNumber: "6650012234",
      accountholderName: "PT Griya Sehat Farma",
      slikFileUrl: "https://drive.google.com/file/slik-pt-gsf",
      slikExecSummary: "PT aktif sejak 2019. Rekening BCA aktif. SLIK bersih per Juni 2026.",
      warnings: [],
    },
  ],

  fundingSource: "KF & KCF",
  bankDetailsReviewed: true,
  taxWithholdings: "Yes",
  icVotes: [
    { memberId: "ic-1", memberName: "Ben Elberger", isPrincipal: true, vote: "Approve", votedAt: "2026-06-15T09:00:00Z" },
    { memberId: "ic-2", memberName: "Aldi Haryopratomo", isPrincipal: false, vote: null, votedAt: null },
    { memberId: "ic-3", memberName: "Junaidi", isPrincipal: false, vote: null, votedAt: null },
  ],
  approvalNotes: "Approved by Principal — jaringan apotek dengan cashflow stabil.",
  specialNotesForIC: null,
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Submit updated inventory report before disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Project 12: Konveksi Berkah Jaya — Asset B-I, Legal ─────────────────────
// Assorted B2B Services and Manufacturing / Clothing Manufacturing | Asset B-I | Domestic Invoice Financing | IDR 320jt
// IC-approved + KF/KCF slotted via seedDefaultWorkflows(), awaiting Legal.

const projectKonveksiBerkah: ICProject = {
  id: "proj-konveksi-berkah",
  brandName: "Konveksi Berkah Jaya",
  brandIsNew: true,
  projectName: "Konveksi Berkah Jaya (#1) — Invoice Financing: Matahari Department Store",
  approvalType: "PO/Invoice",
  submittedAt: "2026-05-20T09:30:00Z",

  pic: {
    submitter: "Sharfina Nindita",
    primaryAnalyst: "Sharfina Nindita",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 0,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "Assorted B2B Services and Manufacturing",
  subSector: "🎽Clothing Manufacturing",
  syariah: false,
  assetClass: "B - I",
  requestedAmountCurrency: "IDR",
  requestedAmount: 320_000_000,
  trancheTargetAmount: 320_000_000,
  amountWarning: null,
  financingUse: "Domestic Invoice Financing",
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
      submissionDate: "2026-05-18",
      financialReportsReviewed: "Bank Statements Feb–Apr 2026",
      periodEndingDate: "2026-04-30",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "KP baru, belum ada plafond. Konveksi garmen dengan kontrak supply ke Matahari Department Store. Cashflow konsisten.",
    },
  ],

  referralSource: "Karma Staff",
  specificReferror: "Wesly Simatupang",
  referrorBelongsToKP: null,
  otherReferees: [],

  kpContacts: [
    {
      id: "kpc-kbj1",
      name: "Yoga Pratama Nugraha",
      whatsapp: "+62 - 825 8899 0011",
      email: "yoga.nugraha@konveksiberkahjaya.co.id",
      role: "Direktur Utama",
      notesOnPerson: "Founder konveksi garmen sejak 2014. Kontrak supply rutin ke Matahari Department Store.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-yoga-nugraha",
      slikExecSummary: "KTP Bandung. Tidak ada kredit aktif. SLIK bersih per Mei 2026.",
    },
  ],

  pastProjects: [
    {
      id: "pp-kbj-1",
      projectName: "Konveksi Berkah Jaya (#1) — Invoice Financing: Matahari Department Store [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-05-22",
      isCurrentSubmission: true,
      bRecapKind: "B-I",
      payors: ["Matahari Department Store"],
      returnType: "Daily Interest",
      amount: 320_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 20.4,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Daily Interest",
  disbursements: [{ tranche: 1, plannedAmount: 320_000_000, plannedDate: "2026-06-02" }],
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
  lateFee: {
    basis: "Outstanding Principal",
    gracePeriodDays: 0,
    dailyPctInvestors: 0.1,
    dailyPctASN: 0,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Konveksi Berkah Jaya**\n\nKP baru, submission pertama. Konveksi garmen dengan kontrak supply ke Matahari Department Store sejak 2014. Cashflow konsisten.",
  projectCreditMemo:
    "**Project Credit Memo — Invoice Financing: Matahari Department Store**\n\nProyek pertama. Underlying invoice ke Matahari Department Store. Daily interest 1.6%/bulan (KF), 0.6%/bulan (KCF). Tenor 2 bulan. MOIC 1.03x, IRR 20.4%.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-konveksi-berkah-calc",
  projectNotes: [
    {
      author: "Sharfina Nindita",
      date: "2026-05-26",
      noteType: "Project Note",
      content: "Disetujui IC, KF:KCF split selesai. Menunggu Legal untuk persiapan kontrak.",
    },
    {
      author: "Sharfina Nindita",
      date: "2026-05-10",
      noteType: "KP Note",
      attendee: "Yoga Pratama Nugraha",
      content:
        "Site visit pabrik konveksi Bandung bersama Yoga. Kapasitas produksi sesuai kontrak Matahari Department Store.",
    },
    {
      author: "Sharfina Nindita",
      date: "2026-04-28",
      noteType: "KP Note",
      attendee: "Yoga Pratama Nugraha",
      content: "Follow-up — Yoga konfirmasi volume supply meningkat untuk musim Lebaran.",
    },
    {
      author: "Sharfina Nindita",
      date: "2026-04-05",
      noteType: "KP Note",
      attendee: "Yoga Pratama Nugraha",
      content:
        "First meeting — Yoga jelaskan sejarah konveksi garmen sejak 2014 dan hubungan panjang dengan Matahari.",
    },
    {
      author: "Sharfina Nindita",
      date: "2026-03-18",
      noteType: "KP Note",
      attendee: "Yoga Pratama Nugraha",
      content: "Warm intro dari referral existing KP tekstil. Kesan awal kooperatif.",
    },
  ],

  ptDetails: [
    {
      id: "pt-kbj1",
      name: "PT Konveksi Berkah Jaya",
      bank: "BNI",
      accountNumber: "0166554433",
      accountholderName: "PT Konveksi Berkah Jaya",
      slikFileUrl: "https://drive.google.com/file/slik-pt-kbj",
      slikExecSummary: "PT aktif sejak 2014. Rekening BNI aktif. SLIK bersih per Mei 2026.",
      warnings: [],
    },
  ],

  payorInvoices: [
    {
      id: "pay-kbj-1",
      payorLabel: "Matahari Department Store",
      poOrInvoiceNumber: "INV-MDS-2026-05-0344",
      dueDate: "2026-07-21",
      amount: 320_000_000,
      currency: "IDR",
      payorType: "Corporate Invoice (whitelisted)",
      payeeProjects: "Konveksi Berkah Jaya (#1)",
      notes: "Underlying invoice for May 2026 supply cycle.",
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
  approvalNotes: "Approved unanimously. KP baru dengan kontrak supply yang jelas dan payor whitelisted.",
  specialNotesForIC: null,
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Submit executed invoice / PO documentation before disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Project 13: Agro Makmur Distribusi — Asset B-PO, Legal ──────────────────
// Commodities Trading, Processing & Distribution / FMCG Distribution | Asset B-PO | Domestic PO Financing | IDR 260jt

const projectAgroMakmur: ICProject = {
  id: "proj-agro-makmur",
  brandName: "Agro Makmur Distribusi",
  brandIsNew: true,
  projectName: "Agro Makmur Distribusi (#1) — PO Financing: Wings Group",
  approvalType: "PO/Invoice",
  submittedAt: "2026-05-22T10:00:00Z",

  pic: {
    submitter: "Wesly Simatupang",
    primaryAnalyst: "Wesly Simatupang",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 0,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "Commodities Trading, Processing, & Distribution",
  subSector: "🥨FMCG Distribution",
  syariah: false,
  assetClass: "B - PO",
  requestedAmountCurrency: "IDR",
  requestedAmount: 260_000_000,
  trancheTargetAmount: 260_000_000,
  amountWarning: null,
  financingUse: "Domestic PO Financing",
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
      submissionDate: "2026-05-20",
      financialReportsReviewed: "Bank Statements Feb–Apr 2026",
      periodEndingDate: "2026-04-30",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "KP baru, belum ada plafond. Distributor agro dengan kontrak PO rutin dari Wings Group. Cashflow konsisten.",
    },
  ],

  referralSource: "2nd+ Project",
  specificReferror: null,
  referrorBelongsToKP: null,
  otherReferees: [],

  kpContacts: [
    {
      id: "kpc-amd1",
      name: "Siti Nurhaliza Putri",
      whatsapp: "+62 - 826 9900 1122",
      email: "siti.putri@agromakmur.co.id",
      role: "Direktur Utama",
      notesOnPerson: "Founder distributor agro sejak 2018. Kontrak PO rutin dengan Wings Group area Jawa Tengah.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-siti-putri",
      slikExecSummary: "KTP Semarang. Tidak ada kredit aktif. SLIK bersih per Mei 2026.",
    },
  ],

  pastProjects: [
    {
      id: "pp-amd-1",
      projectName: "Agro Makmur Distribusi (#1) — PO Financing: Wings Group [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-05-24",
      isCurrentSubmission: true,
      bRecapKind: "B-PO",
      payors: ["Wings Group"],
      returnType: "Daily Interest",
      amount: 260_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 20.3,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Daily Interest",
  disbursements: [{ tranche: 1, plannedAmount: 260_000_000, plannedDate: "2026-06-05" }],
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
  lateFee: {
    basis: "Outstanding Principal",
    gracePeriodDays: 0,
    dailyPctInvestors: 0.1,
    dailyPctASN: 0,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Agro Makmur Distribusi**\n\nKP baru, submission pertama. Distributor agro dengan kontrak PO rutin dari Wings Group area Jawa Tengah sejak 2018. Cashflow konsisten.",
  projectCreditMemo:
    "**Project Credit Memo — PO Financing: Wings Group**\n\nProyek pertama. Underlying PO dari Wings Group. Daily interest 1.6%/bulan (KF), 0.6%/bulan (KCF). Tenor 2 bulan. MOIC 1.03x, IRR 20.3%.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-agro-makmur-calc",
  projectNotes: [
    {
      author: "Wesly Simatupang",
      date: "2026-05-28",
      noteType: "Project Note",
      content: "Disetujui IC, KF:KCF split selesai. Menunggu Legal untuk persiapan kontrak.",
    },
    {
      author: "Wesly Simatupang",
      date: "2026-05-12",
      noteType: "KP Note",
      attendee: "Siti Nurhaliza Putri",
      content:
        "Site visit gudang agro Semarang bersama Siti. Stok dan distribusi Wings Group terorganisir baik.",
    },
    {
      author: "Wesly Simatupang",
      date: "2026-04-29",
      noteType: "KP Note",
      attendee: "Siti Nurhaliza Putri",
      content: "Follow-up — Siti share proyeksi volume PO meningkat area Jawa Tengah untuk Q3.",
    },
    {
      author: "Wesly Simatupang",
      date: "2026-04-08",
      noteType: "KP Note",
      attendee: "Siti Nurhaliza Putri",
      content: "First call — Siti ceritakan perjalanan distributor agro sejak 2018.",
    },
    {
      author: "Wesly Simatupang",
      date: "2026-03-20",
      noteType: "KP Note",
      attendee: "Siti Nurhaliza Putri",
      content: "Referral dari jaringan distributor FMCG. Kesan awal terbuka dan kooperatif.",
    },
  ],

  ptDetails: [
    {
      id: "pt-amd1",
      name: "PT Agro Makmur Distribusi",
      bank: "BCA",
      accountNumber: "7780034512",
      accountholderName: "PT Agro Makmur Distribusi",
      slikFileUrl: "https://drive.google.com/file/slik-pt-amd",
      slikExecSummary: "PT aktif sejak 2018. Rekening BCA aktif. SLIK bersih per Mei 2026.",
      warnings: [],
    },
  ],

  payorInvoices: [
    {
      id: "pay-amd-1",
      payorLabel: "Wings Group",
      poOrInvoiceNumber: "PO-WG-2026-05-0198",
      dueDate: "2026-07-24",
      amount: 260_000_000,
      currency: "IDR",
      payorType: "Corporate PO (whitelisted)",
      payeeProjects: "Agro Makmur Distribusi (#1)",
      notes: "Underlying PO aligned to May 2026 distribution cycle.",
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
  approvalNotes: "Approved unanimously. PO financing dengan payor whitelisted.",
  specialNotesForIC: null,
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Submit executed PO documentation before disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Project 14: Klinik Sehat Keluarga — Asset D, Legal ──────────────────────
// Healthcare and Petcare Clinics / Doctor Clinic | Asset D | Working Capital | IDR 900jt
// Fixed Amount Repayment terms (for variety vs. the Revenue Share D examples above).

const projectKlinikSehat: ICProject = {
  id: "proj-klinik-sehat",
  brandName: "Klinik Sehat Keluarga",
  brandIsNew: true,
  projectName: "Klinik Sehat Keluarga (#1) — Working Capital",
  approvalType: "Project",
  submittedAt: "2026-05-15T09:00:00Z",

  pic: {
    submitter: "Juang Angger Pamungkas",
    primaryAnalyst: "Juang Angger Pamungkas",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 0,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "Healthcare and Petcare Clinics",
  subSector: "🩺Doctor Clinic (GP and Specialist)",
  syariah: false,
  assetClass: "D",
  requestedAmountCurrency: "IDR",
  requestedAmount: 900_000_000,
  amountWarning: null,
  financingUse: "Working Capital Financing",
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
      submissionDate: "2026-05-13",
      financialReportsReviewed: "Management Accounts Jan–Apr 2026",
      periodEndingDate: "2026-04-30",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "KP baru, belum ada plafond. Klinik keluarga dengan 2 cabang di Yogyakarta. Dana untuk restock alat medis dan obat.",
    },
  ],

  referralSource: "Karmapreneur",
  specificReferror: "Sinta Wulandari",
  referrorBelongsToKP: null,
  otherReferees: [],

  submissionProjectedBEPMonths: 10,

  kpContacts: [
    {
      id: "kpc-ksk1",
      name: "dr. Ratna Kusumawardhani",
      whatsapp: "+62 - 827 0011 2233",
      email: "ratna.kusumawardhani@kliniksehatkeluarga.co.id",
      role: "Direktur Utama / Dokter Penanggung Jawab",
      notesOnPerson: "Founder dan dokter penanggung jawab klinik keluarga sejak 2020, kini 2 cabang di Yogyakarta.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-ratna-kusumawardhani",
      slikExecSummary: "KTP Yogyakarta. Tidak ada kredit aktif. SLIK bersih per Mei 2026.",
    },
  ],

  pastProjects: [
    {
      id: "pp-ksk-1",
      projectName: "Klinik Sehat Keluarga (#1) — Working Capital [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-05-17",
      isCurrentSubmission: true,
      returnType: "Fixed Return",
      amount: 900_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 12,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 22.0,
      otfMOIC: null,
      projectedMOIC: "1.20x",
      projectedBEPMonths: 10,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Fixed Return",
  disbursements: [{ tranche: 1, plannedAmount: 900_000_000, plannedDate: "2026-05-30" }],
  branches: [],
  revenueShareTerms: null,
  fixedReturnTerms: {
    repaymentSchedule: fixedReturnScheduleFromTotals(12, 900_000_000, 165_600_000, 18_000_000),
    totalRepayment: 1_083_600_000,
    totalPrincipal: 900_000_000,
    totalInterest: 165_600_000,
    carry: 18_000_000,
  },
  lateFee: {
    basis: "Overdue Amount",
    gracePeriodDays: 5,
    dailyPctInvestors: 0.08,
    dailyPctASN: 0.02,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Klinik Sehat Keluarga**\n\nKP baru, submission pertama. Klinik keluarga dengan 2 cabang di Yogyakarta, berdiri sejak 2020. Founder dokter penanggung jawab langsung. Cashflow konsisten, tidak ada hutang bank.",
  projectCreditMemo:
    "**Project Credit Memo — Working Capital**\n\nProyek pertama. Fixed Amount Repayment, 12 kali cicilan. MOIC 1.20x, IRR 22.0%. Dana untuk restock alat medis dan obat.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-klinik-sehat-calc",
  projectNotes: [
    {
      author: "Juang Angger Pamungkas",
      date: "2026-05-19",
      noteType: "Project Note",
      content: "Disetujui IC, KF:KCF split selesai. Menunggu Legal untuk persiapan kontrak.",
    },
    {
      author: "Juang Angger Pamungkas",
      date: "2026-05-05",
      noteType: "KP Note",
      attendee: "dr. Ratna Kusumawardhani",
      content:
        "Site visit ke 2 cabang klinik Yogyakarta bersama dr. Ratna. Operasional rapi, semua compliance kesehatan terpenuhi.",
    },
    {
      author: "Juang Angger Pamungkas",
      date: "2026-04-20",
      noteType: "KP Note",
      attendee: "dr. Ratna Kusumawardhani",
      content:
        "Follow-up soal rencana modal kerja untuk restock alat medis — dr. Ratna share data pasien bulanan.",
    },
    {
      author: "Juang Angger Pamungkas",
      date: "2026-04-01",
      noteType: "KP Note",
      attendee: "dr. Ratna Kusumawardhani",
      content:
        "First call — dr. Ratna, dokter penanggung jawab, sangat detail soal compliance dan SOP klinik.",
    },
    {
      author: "Juang Angger Pamungkas",
      date: "2026-03-10",
      noteType: "KP Note",
      attendee: "dr. Ratna Kusumawardhani",
      content: "Referral dari jaringan klinik keluarga lain. Kesan awal profesional.",
    },
  ],

  ptDetails: [
    {
      id: "pt-ksk1",
      name: "PT Klinik Sehat Keluarga",
      bank: "BCA",
      accountNumber: "8890045671",
      accountholderName: "PT Klinik Sehat Keluarga",
      slikFileUrl: "https://drive.google.com/file/slik-pt-ksk",
      slikExecSummary: "PT aktif sejak 2020. Rekening BCA aktif. SLIK bersih per Mei 2026.",
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
  approvalNotes: "Approved unanimously. Klinik dengan dokter penanggung jawab yang jelas dan cashflow stabil.",
  specialNotesForIC: null,
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Submit updated inventory report before disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Project 15: Bakmi Naga Emas — Asset A, Finance Disbursed ────────────────
// F&B / Full Service Resto | Asset A | Branch Opening/Expansion | IDR 1.8B
// IC-approved, through Legal, awaiting Finance Disbursement.

const projectBakmiNaga: ICProject = {
  id: "proj-bakmi-naga",
  brandName: "Bakmi Naga Emas",
  brandIsNew: true,
  projectName: "Bakmi Naga Emas (#1) — Branch Opening: Semarang",
  approvalType: "Project",
  submittedAt: "2026-04-10T09:00:00Z",

  pic: {
    submitter: "Priska Ponggawa",
    primaryAnalyst: "Priska Ponggawa",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 0,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "F&B",
  subSector: "🍲Full Service Resto",
  syariah: false,
  assetClass: "A",
  requestedAmountCurrency: "IDR",
  requestedAmount: 1_800_000_000,
  amountWarning: null,
  financingUse: "Branch Opening/Expansion",
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
      submissionDate: "2026-04-08",
      financialReportsReviewed: "Management Accounts Jan–Mar 2026",
      periodEndingDate: "2026-03-31",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "KP baru, belum ada plafond. Outlet pertama (Solo) profitable sejak 2023. Dana untuk pembukaan outlet ke-2 di Semarang.",
    },
  ],

  referralSource: "Karma.Club Website",
  specificReferror: null,
  referrorBelongsToKP: null,
  otherReferees: [],

  submissionProjectedBEPMonths: 12,

  kpContacts: [
    {
      id: "kpc-bne1",
      name: "Cahyo Adi Wibowo",
      whatsapp: "+62 - 828 1122 3344",
      email: "cahyo.wibowo@bakminagaemas.co.id",
      role: "Founder / Direktur Utama",
      notesOnPerson: "Founder Bakmi Naga Emas, membuka outlet pertama di Solo 2023. Sangat detail soal resep dan konsistensi rasa antar outlet.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-cahyo-wibowo",
      slikExecSummary: "KTP Solo. Tidak ada kredit aktif. SLIK bersih per April 2026.",
    },
  ],

  pastProjects: [
    {
      id: "pp-bne-1",
      projectName: "Bakmi Naga Emas (#1) — Branch Opening: Semarang [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-04-14",
      isCurrentSubmission: true,
      returnType: "Revenue Share (Return-Capped)",
      amount: 1_800_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 22,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 21.5,
      otfMOIC: null,
      projectedMOIC: "1.38x",
      projectedBEPMonths: 12,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Revenue Share (Return-Capped)",
  disbursements: [{ tranche: 1, plannedAmount: 1_800_000_000, plannedDate: "2026-05-05" }],
  branches: [
    {
      id: "br-bne1",
      name: "Semarang — Simpang Lima",
      area: "Semarang, Jawa Tengah",
      gmapsLink: "https://maps.google.com/?q=Simpang+Lima+Semarang",
      notes: "Outlet ke-2. Lokasi pusat kota, traffic tinggi. Area 120m², kapasitas 60 covers. Kontrak sewa 4 tahun.",
      type: "Opening Branch",
    },
  ],
  revenueShareTerms: {
    sourceOfRevenueAccrued: "Sales setelah dikurangi diskon, sebelum PB1/PPN, sebelum biaya EDC/QRIS",
    frequency: "Monthly",
    dueDate: "Tanggal 12 setiap bulan",
    capType: "Return Cap",
    capMultiple: 1.38,
    capTimePeriodMonths: null,
    revShareStartType: "Anchored to Branch Opening",
    revShareStartDate: null,
    preBEPRevSharePct: 7.5,
    postBEPRevSharePct: 8.0,
    carryType: "Fixed Platform Fee",
    carryPct: 2.0,
    minReturn: null,
    minReturnMultiple: null,
    minReturnPayableMonths: null,
    revProjectionArray: monthsRevenueProjection(22, 190_000_000),
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
    "**KP Credit Memo — Bakmi Naga Emas**\n\nKP baru, submission pertama. Outlet Solo (dibuka 2023) profitable dengan traffic konsisten. Founder detail soal konsistensi rasa. Dana untuk ekspansi outlet ke-2 di Semarang.",
  projectCreditMemo:
    "**Project Credit Memo — Branch Opening: Semarang**\n\nProyek pertama. Revenue Share return-capped 1.38x. Proyeksi revenue IDR 190jt/bulan setelah ramp-up. IRR proyeksi 21.5%, MOIC 1.38x.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-bakmi-naga-calc",
  projectNotes: [
    {
      author: "Priska Ponggawa",
      date: "2026-04-20",
      noteType: "Project Note",
      content: "Legal selesai, kontrak sudah ditandatangani. Menunggu Finance untuk disbursement.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-04-08",
      noteType: "KP Note",
      attendee: "Cahyo Adi Wibowo",
      content:
        "Site visit outlet Solo bersama Cahyo. Konsistensi rasa antar shift terjaga, resep terstandarisasi dengan baik.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-03-25",
      noteType: "KP Note",
      attendee: "Cahyo Adi Wibowo",
      content:
        "Follow-up — Cahyo update lokasi Semarang sudah deal sewa, tinggal proses renovasi outlet ke-2.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-03-05",
      noteType: "KP Note",
      attendee: "Cahyo Adi Wibowo",
      content:
        "First meeting — Cahyo ceritakan perjalanan dari outlet pertama di Solo 2023 hingga rencana ekspansi.",
    },
    {
      author: "Priska Ponggawa",
      date: "2026-02-15",
      noteType: "KP Note",
      attendee: "Cahyo Adi Wibowo",
      content: "Warm intro dari komunitas F&B lokal. Kesan awal sangat detail dan passionate soal produk.",
    },
  ],

  ptDetails: [
    {
      id: "pt-bne1",
      name: "PT Bakmi Naga Emas Nusantara",
      bank: "Bank Maybank",
      accountNumber: "2299887766",
      accountholderName: "BAKMI NAGA EMAS NUSANTARA",
      slikFileUrl: "https://drive.google.com/file/slik-pt-bne",
      slikExecSummary: "PT aktif sejak 2023. Rekening Maybank aktif. SLIK bersih per April 2026.",
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
  approvalNotes: "Approved unanimously. KP baru dengan outlet pertama yang sudah profitable.",
  specialNotesForIC: null,
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Execute lease agreement for Semarang outlet before disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Project 16: Percetakan Media Cipta — Asset B-I, Finance Disbursed ───────
// Assorted B2B Services and Manufacturing / Assorted Manufacturing | Asset B-I | Domestic Invoice Financing | IDR 340jt

const projectPercetakanMedia: ICProject = {
  id: "proj-percetakan-media",
  brandName: "Percetakan Media Cipta",
  brandIsNew: true,
  projectName: "Percetakan Media Cipta (#1) — Invoice Financing: Gramedia",
  approvalType: "PO/Invoice",
  submittedAt: "2026-04-12T10:00:00Z",

  pic: {
    submitter: "Nila Layla Melinda",
    primaryAnalyst: "Nila Layla Melinda",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 0,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "Assorted B2B Services and Manufacturing",
  subSector: "Assorted Manufacturing",
  syariah: false,
  assetClass: "B - I",
  requestedAmountCurrency: "IDR",
  requestedAmount: 340_000_000,
  trancheTargetAmount: 340_000_000,
  amountWarning: null,
  financingUse: "Domestic Invoice Financing",
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
      submissionDate: "2026-04-10",
      financialReportsReviewed: "Bank Statements Jan–Mar 2026",
      periodEndingDate: "2026-03-31",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "KP baru, belum ada plafond. Percetakan dengan kontrak cetak rutin untuk Gramedia. Cashflow konsisten.",
    },
  ],

  referralSource: "2nd+ Project",
  specificReferror: null,
  referrorBelongsToKP: null,
  otherReferees: [],

  kpContacts: [
    {
      id: "kpc-pmc1",
      name: "Agus Setiadi Halim",
      whatsapp: "+62 - 829 2233 4455",
      email: "agus.halim@percetakanmediacipta.co.id",
      role: "Direktur Utama",
      notesOnPerson: "Founder percetakan sejak 2012. Kontrak cetak rutin untuk Gramedia dan beberapa penerbit lokal.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-agus-halim",
      slikExecSummary: "KTP Jakarta Barat. Tidak ada kredit aktif. SLIK bersih per April 2026.",
    },
  ],

  pastProjects: [
    {
      id: "pp-pmc-1",
      projectName: "Percetakan Media Cipta (#1) — Invoice Financing: Gramedia [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-04-16",
      isCurrentSubmission: true,
      bRecapKind: "B-I",
      payors: ["Gramedia"],
      returnType: "Daily Interest",
      amount: 340_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 2,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 20.6,
      otfMOIC: null,
      projectedMOIC: "1.03x",
      projectedBEPMonths: 1,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Daily Interest",
  disbursements: [{ tranche: 1, plannedAmount: 340_000_000, plannedDate: "2026-05-02" }],
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
  lateFee: {
    basis: "Outstanding Principal",
    gracePeriodDays: 0,
    dailyPctInvestors: 0.1,
    dailyPctASN: 0,
  },
  termSheetLink: null,

  kpCreditMemo:
    "**KP Credit Memo — Percetakan Media Cipta**\n\nKP baru, submission pertama. Percetakan dengan kontrak cetak rutin untuk Gramedia sejak 2012. Cashflow konsisten dengan volume invoice historis.",
  projectCreditMemo:
    "**Project Credit Memo — Invoice Financing: Gramedia**\n\nProyek pertama. Underlying invoice ke Gramedia. Daily interest 1.6%/bulan (KF), 0.6%/bulan (KCF). Tenor 2 bulan. MOIC 1.03x, IRR 20.6%.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-percetakan-media-calc",
  projectNotes: [
    {
      author: "Nila Layla Melinda",
      date: "2026-04-22",
      noteType: "Project Note",
      content: "Legal selesai, kontrak sudah ditandatangani. Menunggu Finance untuk disbursement.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-04-10",
      noteType: "KP Note",
      attendee: "Agus Setiadi Halim",
      content:
        "Site visit percetakan Jakarta Barat bersama Agus. Mesin cetak terawat baik, kontrak Gramedia terverifikasi.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-03-28",
      noteType: "KP Note",
      attendee: "Agus Setiadi Halim",
      content:
        "Follow-up — Agus share volume cetak meningkat untuk musim penerbitan buku pelajaran baru.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-03-08",
      noteType: "KP Note",
      attendee: "Agus Setiadi Halim",
      content:
        "First call — Agus ceritakan sejarah percetakan sejak 2012 dan hubungan panjang dengan Gramedia.",
    },
    {
      author: "Nila Layla Melinda",
      date: "2026-02-20",
      noteType: "KP Note",
      attendee: "Agus Setiadi Halim",
      content: "Referral dari penerbit lokal. Kesan awal kooperatif dan transparan.",
    },
  ],

  ptDetails: [
    {
      id: "pt-pmc1",
      name: "PT Percetakan Media Cipta",
      bank: "BNI",
      accountNumber: "0155443322",
      accountholderName: "PT Percetakan Media Cipta",
      slikFileUrl: "https://drive.google.com/file/slik-pt-pmc",
      slikExecSummary: "PT aktif sejak 2012. Rekening BNI aktif. SLIK bersih per April 2026.",
      warnings: [],
    },
  ],

  payorInvoices: [
    {
      id: "pay-pmc-1",
      payorLabel: "Gramedia",
      poOrInvoiceNumber: "INV-GRM-2026-04-0221",
      dueDate: "2026-06-11",
      amount: 340_000_000,
      currency: "IDR",
      payorType: "Corporate Invoice (whitelisted)",
      payeeProjects: "Percetakan Media Cipta (#1)",
      notes: "Underlying invoice for April 2026 print cycle.",
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
  approvalNotes: "Approved unanimously. Invoice financing rutin dengan payor whitelisted.",
  specialNotesForIC: null,
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Submit executed invoice / PO documentation before disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Project 17: Toko Bangunan Sentosa — Asset D, Finance Disbursed ──────────
// Assorted Retail Services / Home Improvement | Asset D | Working Capital | IDR 1.6B

const projectTokoBangunan: ICProject = {
  id: "proj-toko-bangunan",
  brandName: "Toko Bangunan Sentosa",
  brandIsNew: true,
  projectName: "Toko Bangunan Sentosa (#1) — Working Capital",
  approvalType: "Project",
  submittedAt: "2026-04-15T09:00:00Z",

  pic: {
    submitter: "Armeno Devan",
    primaryAnalyst: "Armeno Devan",
    secondaryAnalyst: null,
  },

  projectNumberForKP: 1,
  brandActiveProjects: 0,
  brandCompletedProjects: 0,
  brandBeforeICProjects: 1,
  brandPendingDisbursementProjects: 0,
  mainSector: "Assorted Retail Services",
  subSector: "🎮Home Improvement",
  syariah: false,
  assetClass: "D",
  requestedAmountCurrency: "IDR",
  requestedAmount: 1_600_000_000,
  amountWarning: null,
  financingUse: "Working Capital Financing",
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
      submissionDate: "2026-04-13",
      financialReportsReviewed: "Management Accounts Jan–Mar 2026",
      periodEndingDate: "2026-03-31",
      limitRecommendation: "Keep",
      limitCurrentIdr: null,
      reviewNotes:
        "KP baru, belum ada plafond. Toko material bangunan dengan 2 outlet di Surabaya. Dana untuk restock inventory menjelang musim konstruksi.",
    },
  ],

  referralSource: "Karma Node",
  specificReferror: "Dian Kusuma",
  referrorBelongsToKP: null,
  otherReferees: [],

  submissionProjectedBEPMonths: 13,

  kpContacts: [
    {
      id: "kpc-tbs1",
      name: "Wahyu Setiadi Kurniawan",
      whatsapp: "+62 - 830 3344 5566",
      email: "wahyu.kurniawan@tokobangunansentosa.co.id",
      role: "Direktur Utama",
      notesOnPerson: "Founder toko material bangunan sejak 2015, kini 2 outlet di Surabaya. Sangat berpengalaman di industri konstruksi lokal.",
      referredProjects: [],
      associatedKPs: [],
      isKeyPerson: true,
      slikFileUrl: "https://drive.google.com/file/slik-wahyu-kurniawan",
      slikExecSummary: "KTP Surabaya. KPR di Bank Maybank, performing. SLIK bersih per April 2026.",
    },
  ],

  pastProjects: [
    {
      id: "pp-tbs-1",
      projectName: "Toko Bangunan Sentosa (#1) — Working Capital [PROPOSED]",
      status: "Proposed",
      icApprovalDate: "2026-04-19",
      isCurrentSubmission: true,
      returnType: "Revenue Share (Return-Capped)",
      amount: 1_600_000_000,
      outstandingAmount: 0,
      projectedTermMonths: 20,
      otfTermMonths: null,
      otfIRR: null,
      projectedIRR: 20.1,
      otfMOIC: null,
      projectedMOIC: "1.30x",
      projectedBEPMonths: 13,
      currentDPD: 0,
      maxDPD: 0,
    },
  ],

  returnType: "Revenue Share (Return-Capped)",
  disbursements: [{ tranche: 1, plannedAmount: 1_600_000_000, plannedDate: "2026-05-06" }],
  branches: [],
  revenueShareTerms: {
    sourceOfRevenueAccrued: "KP net sales (after discounts, before VAT) as booked in management accounts",
    frequency: "Monthly",
    dueDate: "Tanggal 8 setiap bulan",
    capType: "Return Cap",
    capMultiple: 1.3,
    capTimePeriodMonths: null,
    revShareStartType: "Fixed",
    revShareStartDate: "2026-05-08",
    preBEPRevSharePct: 7.0,
    postBEPRevSharePct: 7.5,
    carryType: "Variable Platform Fee",
    carryPct: 2.0,
    minReturn: null,
    minReturnMultiple: null,
    minReturnPayableMonths: null,
    revProjectionArray: monthsRevenueProjection(20, 210_000_000),
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
    "**KP Credit Memo — Toko Bangunan Sentosa**\n\nKP baru, submission pertama. Toko material bangunan dengan 2 outlet di Surabaya, berdiri sejak 2015. Dana untuk restock inventory menjelang musim konstruksi.",
  projectCreditMemo:
    "**Project Credit Memo — Working Capital**\n\nProyek pertama. Revenue Share return-capped 1.3x. IRR proyeksi 20.1%, MOIC 1.30x.",
  financialsLink: "https://docs.google.com/spreadsheets/d/example-toko-bangunan-calc",
  projectNotes: [
    {
      author: "Armeno Devan",
      date: "2026-04-25",
      noteType: "Project Note",
      content: "Legal selesai, kontrak sudah ditandatangani. Menunggu Finance untuk disbursement.",
    },
    {
      author: "Armeno Devan",
      date: "2026-04-12",
      noteType: "KP Note",
      attendee: "Wahyu Setiadi Kurniawan",
      content:
        "Site visit ke 2 outlet material bangunan Surabaya bersama Wahyu. Stok dan operasional terkelola rapi.",
    },
    {
      author: "Armeno Devan",
      date: "2026-03-30",
      noteType: "KP Note",
      attendee: "Wahyu Setiadi Kurniawan",
      content:
        "Follow-up soal rencana modal kerja musim konstruksi — Wahyu share data penjualan 6 bulan terakhir.",
    },
    {
      author: "Armeno Devan",
      date: "2026-03-10",
      noteType: "KP Note",
      attendee: "Wahyu Setiadi Kurniawan",
      content:
        "First call — Wahyu ceritakan pengalaman panjang di industri konstruksi lokal sejak 2015.",
    },
    {
      author: "Armeno Devan",
      date: "2026-02-22",
      noteType: "KP Note",
      attendee: "Wahyu Setiadi Kurniawan",
      content: "Referral dari kontraktor lokal. Kesan awal berpengalaman dan kooperatif.",
    },
  ],

  ptDetails: [
    {
      id: "pt-tbs1",
      name: "PT Toko Bangunan Sentosa",
      bank: "Bank Maybank",
      accountNumber: "2255667788",
      accountholderName: "TOKO BANGUNAN SENTOSA",
      slikFileUrl: "https://drive.google.com/file/slik-pt-tbs",
      slikExecSummary: "PT aktif sejak 2015. Rekening Maybank aktif. SLIK bersih per April 2026.",
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
  approvalNotes: "Approved unanimously. Toko material dengan cashflow stabil menjelang musim konstruksi.",
  specialNotesForIC: null,
  conditionsPrecedent: [],
  conditionsPrecedentLogic: "",
  conditionsSubsequent: [
    { letter: "A", name: "", condition: "Submit updated inventory report before disbursement", approver: "" },
  ],
  conditionsSubsequentLogic: "",
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const mockProjects: ICProject[] = [
  projectHolycow,
  projectShushu,
  projectCUM,
  projectCEA,
  projectAssetDPlafond,
  projectTekstilMakmur,
  projectDistribusiPangan,
  projectKaryaLogistik,
  projectElektronikJaya,
  projectGriyaSehat,
  projectKonveksiBerkah,
  projectAgroMakmur,
  projectKlinikSehat,
  projectBakmiNaga,
  projectPercetakanMedia,
  projectTokoBangunan,
];

export function getProjectById(id: string): ICProject | undefined {
  return mockProjects.find((p) => p.id === id);
}

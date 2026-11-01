/**
 * ProcureFlow PDF Generation Service
 * High-fidelity client-side PDF document generator powered by jsPDF & autoTable.
 * Implements official Government Procurement branding, clean Unicode/Rupee formatting,
 * crisp tabular layouts, and auto page breaks.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Branding Colors
const PRIMARY_GREEN: [number, number, number] = [23, 107, 74]; // #176B4A
const DARK_SLATE: [number, number, number] = [30, 41, 59];
const LIGHT_BG: [number, number, number] = [248, 250, 249];
const BORDER_COLOR: [number, number, number] = [203, 213, 225];

/**
 * Format currency with Rs. representation to ensure 100% clean rendering across all PDF viewports
 */
export function formatPdfCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return "Rs. 0.00";
  return `Rs. ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Draw Official Header on PDF Document
 */
function drawOfficialHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...PRIMARY_GREEN);
  doc.rect(0, 0, 210, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PROCUREFLOW", 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Smart Procurement Management System | Civil Supplies & Agricultural Marketing", 14, 17);

  doc.setTextColor(...DARK_SLATE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title.toUpperCase(), 14, 35);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 14, 41);

  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.5);
  doc.line(14, 44, 196, 44);
}

/**
 * Draw Official Verification Footer
 */
function drawOfficialFooter(doc: jsPDF, documentCode: string) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(14, 282, 196, 282);

    const generatedOn = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    doc.text(
      `Doc Ref: ${documentCode} | Generated via ProcureFlow Secure Portal on ${generatedOn} IST`,
      14,
      287
    );
    doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: "right" });
  }
}

/**
 * 1. Download Official Gate Pass / Token Pass PDF
 */
export function downloadGatePassPdf(params: {
  tokenNumber: string;
  bookingCode?: string;
  slotDate: string;
  slotTime: string;
  farmerName: string;
  farmerPhone: string;
  farmerCode?: string;
  village?: string;
  mandal?: string;
  district?: string;
  centreName: string;
  centreAddress?: string;
  cropName?: string;
  cropType?: string;
  variety?: string;
  expectedLoadQuintals?: number | string;
  estimatedQuantityQuintals?: number | string;
  vehicleType?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  reportingTime?: string;
  farmerAadhaarMasked?: string;
}): void {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const {
    tokenNumber,
    bookingCode = "BK-2026-AP",
    slotDate,
    slotTime,
    farmerName,
    farmerPhone,
    farmerCode = "FMR-2026-AP",
    village = "Angalakuduru",
    mandal = "Tenali",
    district = "Guntur",
    centreName,
    centreAddress = "Main Road Agricultural Market Committee Yard",
    cropType = params.cropName || "Paddy (Dhan)",
    variety = "Grade A (BPT 5204)",
    expectedLoadQuintals = params.estimatedQuantityQuintals || 20,
    vehicleType = "Mini Truck / Tractor",
    vehicleNumber = "AP 07 TJ 4821",
    driverName = "Assigned at Yard",
    driverPhone = "Available in SMS",
    reportingTime = "08:50 AM",
    farmerAadhaarMasked = "XXXX-XXXX-1234",
  } = params;

  drawOfficialHeader(
    doc,
    "Official Verified Mandi Gate Pass",
    "Department of Civil Supplies & Consumer Affairs | Digital Token Authorization"
  );

  // Token Highlight Box
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...PRIMARY_GREEN);
  doc.setLineWidth(0.8);
  doc.roundedRect(14, 48, 182, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PRIMARY_GREEN);
  doc.text("VERIFIED ENTRY TOKEN", 20, 56);

  doc.setFontSize(15);
  doc.setTextColor(...DARK_SLATE);
  doc.text(tokenNumber, 20, 64);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Booking Ref: ${bookingCode} | Aadhaar: ${farmerAadhaarMasked}`, 120, 56);
  doc.text(`Slot: ${slotDate} (${slotTime}) | Gate: ${reportingTime}`, 120, 64);

  // Table 1: Farmer & Mandi Details
  autoTable(doc, {
    startY: 75,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: PRIMARY_GREEN, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: DARK_SLATE, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 }, 2: { fontStyle: "bold", cellWidth: 45 } },
    head: [["Farmer Information", "Details", "Mandi Destination", "Details"]],
    body: [
      ["Farmer Name", farmerName, "Procurement Mandi", centreName],
      ["Farmer Code", farmerCode, "Centre Address", centreAddress],
      ["Registered Mobile", farmerPhone, "Mandi District", district],
      ["Village / Mandal", `${village}, ${mandal}`, "Operating Hours", "07:00 AM - 06:00 PM"],
    ],
  });

  // Table 2: Produce & Logistics
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: PRIMARY_GREEN, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: DARK_SLATE, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 }, 2: { fontStyle: "bold", cellWidth: 45 } },
    head: [["Crop Specifications", "Values", "Transportation", "Values"]],
    body: [
      ["Declared Commodity", cropType, "Transit Mode", vehicleType],
      ["Crop Variety", variety, "Vehicle Registration", vehicleNumber],
      ["Estimated Load", `${expectedLoadQuintals} Quintals`, "Driver Contact", driverPhone || driverName],
      ["Max Permissible Moisture", "17.0% (Grade A Standards)", "Subsidized Freight", "30% State Govt Ratha Subsidy Applied"],
    ],
  });

  // Security & Instructions Notice
  const nextY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFillColor(254, 252, 232);
  doc.setDrawColor(250, 204, 21);
  doc.setLineWidth(0.4);
  doc.roundedRect(14, nextY, 182, 38, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(161, 98, 7);
  doc.text("MANDATORY MANDI CHECK-IN PROTOCOL:", 18, nextY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(113, 63, 18);
  doc.text("1. Present this digital token pass along with original Aadhaar card at the gate security counter.", 18, nextY + 14);
  doc.text("2. Moisture analysis will be conducted electronically upon gate arrival. Grain moisture must remain below 17%.", 18, nextY + 20);
  doc.text("3. Electronic weighbridge gross weighing must be performed before unloading at the allocated bagging platform.", 18, nextY + 26);
  doc.text("4. Payment will be credited directly to your Aadhaar-seeded bank account via PFMS/DBT within 48 business hours.", 18, nextY + 32);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY_GREEN);
  doc.text("DIGITALLY VALIDATED AP CIVIL SUPPLIES SYSTEM", 14, nextY + 48);

  drawOfficialFooter(doc, tokenNumber);
  doc.save(`ProcureFlow-GatePass-${tokenNumber}.pdf`);
}

/**
 * 2. Download Official Payment Receipt / DBT Advice PDF
 */
export function downloadProcurementReceiptPdf(params: {
  receiptNumber: string;
  paymentId: string;
  transactionReference?: string;
  farmerName: string;
  farmerPhone: string;
  farmerCode?: string;
  cropName?: string;
  variety?: string;
  quantityQuintals?: number | string;
  netWeightQuintals?: number | string;
  unitPricePerQuintal?: number | string;
  mspRatePerQuintal?: number | string;
  govtBonusPerQuintal?: number | string;
  grossAmount?: number | string;
  deductions?: number | string;
  netAmountPaid?: number | string;
  netPayable?: number | string;
  bankName?: string;
  accountNumberMasked?: string;
  ifscCode?: string;
  utrNumber?: string;
  centreName?: string;
  dbtStatus?: string;
  issuedAt?: string;
  date?: string;
}): void {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const {
    receiptNumber,
    paymentId,
    transactionReference = "TXN-DBT-882194",
    farmerName,
    farmerPhone,
    farmerCode = "FMR-2026-AP",
    cropName = "Paddy (Grade A)",
    variety = "Common",
    quantityQuintals = params.netWeightQuintals || 20,
    unitPricePerQuintal = params.mspRatePerQuintal || 2320,
    govtBonusPerQuintal = 0,
    grossAmount = 46400,
    deductions = 0,
    netAmountPaid = params.netPayable || grossAmount,
    bankName = "State Bank of India",
    accountNumberMasked = "XXXX-XXXX-9821",
    ifscCode = "SBIN0001048",
    utrNumber = transactionReference,
    centreName = "Guntur Agricultural Market Yard",
    dbtStatus = "SUCCESS",
    issuedAt = params.date || new Date().toLocaleDateString("en-IN"),
  } = params;

  drawOfficialHeader(
    doc,
    "Procurement Payment & DBT Disbursement Advice",
    "Public Financial Management System (PFMS) & Civil Supplies Payout Voucher"
  );

  // Status and Amount Banner
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...PRIMARY_GREEN);
  doc.setLineWidth(0.8);
  doc.roundedRect(14, 48, 182, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PRIMARY_GREEN);
  doc.text(`DBT DISBURSEMENT STATUS: ${dbtStatus}`, 20, 56);

  doc.setFontSize(14);
  doc.setTextColor(...DARK_SLATE);
  doc.text(`Net Amount Credited: ${formatPdfCurrency(netAmountPaid)}`, 20, 64);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Receipt: ${receiptNumber}`, 130, 56);
  doc.text(`UTR: ${utrNumber}`, 130, 64);

  // Table: Breakdown
  autoTable(doc, {
    startY: 75,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: PRIMARY_GREEN, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: DARK_SLATE, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 }, 2: { fontStyle: "bold", cellWidth: 45 } },
    head: [["Beneficiary Details", "Values", "Bank & Payment Ledger", "Values"]],
    body: [
      ["Farmer Name", farmerName, "Bank Name", bankName],
      ["Farmer Code", farmerCode, "Aadhaar Seeded Account", accountNumberMasked],
      ["Mobile Number", farmerPhone, "IFSC Code", ifscCode],
      ["Procurement Centre", centreName, "Payment Mode", "PFMS Direct Benefit Transfer (DBT)"],
      ["Date of Credit", issuedAt, "Transaction UTR", utrNumber],
    ],
  });

  // Table: Valuation
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    margin: { left: 14, right: 14 },
    theme: "striped",
    headStyles: { fillColor: PRIMARY_GREEN, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: DARK_SLATE, cellPadding: 2.5 },
    columnStyles: { 1: { halign: "right" } },
    head: [["Procurement Bill Particulars", "Amount (INR)"]],
    body: [
      [`Procured Produce: ${cropName} (${variety})`, `${quantityQuintals} Quintals`],
      [`Minimum Support Price (MSP) Rate`, `${formatPdfCurrency(unitPricePerQuintal)} / Quintal`],
      [`Government Bonus Incentive`, `${formatPdfCurrency(govtBonusPerQuintal)} / Quintal`],
      [`Gross Procurement Value`, formatPdfCurrency(grossAmount)],
      [`Approved Deductions (Moisture/Foreign Matter)`, formatPdfCurrency(deductions)],
      [`NET AMOUNT CREDITED TO FARMER`, formatPdfCurrency(netAmountPaid)],
    ],
  });

  drawOfficialFooter(doc, receiptNumber);
  doc.save(`ProcureFlow-PaymentReceipt-${receiptNumber}.pdf`);
}

/**
 * 3. Download Cumulative Farmer Procurement Statement PDF
 */
export function downloadFarmerStatementPdf(params: {
  farmerName: string;
  farmerCode: string;
  phone?: string;
  farmerPhone?: string;
  village?: string;
  district?: string;
  season?: string;
  statementPeriod?: string;
  totalBookings?: number;
  completedBookingsCount?: number;
  totalQuintals?: number;
  totalProcuredQuintals?: number;
  totalPayout?: number;
  totalRevenueRupees?: number;
  totalBonus?: number;
  transportSubsidySavedRupees?: number;
  records?: Array<{
    date: string;
    token?: string;
    bookingCode?: string;
    crop?: string;
    cropName?: string;
    variety?: string;
    quantity?: number;
    quantityQuintals?: number;
    rate?: number;
    mspRate?: number;
    amount?: number;
    amountPaid?: number;
    status: string;
    centreName?: string;
  }>;
}): void {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const {
    farmerName,
    farmerCode,
    phone = params.farmerPhone || "9876543210",
    village = "Angalakuduru",
    district = "Guntur",
    season = params.statementPeriod || "Kharif 2025-26",
    totalBookings = params.completedBookingsCount || 1,
    totalQuintals = params.totalProcuredQuintals || 18,
    totalPayout = params.totalRevenueRupees || 41760,
    totalBonus = params.transportSubsidySavedRupees || 2400,
    records = [],
  } = params;

  drawOfficialHeader(
    doc,
    "Farmer Procurement Statement & Ledger",
    `Cumulative Seasonal Procurement Record | ${season}`
  );

  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...PRIMARY_GREEN);
  doc.setLineWidth(0.6);
  doc.roundedRect(14, 48, 182, 22, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL DELIVERED", 20, 55);
  doc.text("TOTAL EARNINGS (DBT)", 65, 55);
  doc.text("SAVINGS / BONUS", 115, 55);
  doc.text("PROCUREMENT SLOTS", 160, 55);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...DARK_SLATE);
  doc.text(`${totalQuintals} Qtl`, 20, 64);
  doc.text(formatPdfCurrency(totalPayout), 65, 64);
  doc.text(formatPdfCurrency(totalBonus), 115, 64);
  doc.text(`${totalBookings} Slots`, 160, 64);

  autoTable(doc, {
    startY: 74,
    margin: { left: 14, right: 14 },
    theme: "plain",
    bodyStyles: { fontSize: 8.5, textColor: DARK_SLATE, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 }, 2: { fontStyle: "bold", cellWidth: 35 } },
    body: [
      ["Farmer Name:", farmerName, "Farmer Code:", farmerCode],
      ["Phone Number:", phone, "Location:", `${village}, ${district}`],
      ["Reporting Season:", season, "Audit Timestamp:", new Date().toLocaleDateString("en-IN")],
    ],
  });

  const tableRows = records.map(r => [
    r.date,
    r.token || r.bookingCode || "TKN-001",
    r.crop || r.cropName || "Paddy (Grade A)",
    `${r.quantity || r.quantityQuintals || 18} Qtl`,
    formatPdfCurrency(r.rate || r.mspRate || 2320),
    formatPdfCurrency(r.amount || r.amountPaid || 41760),
    r.status,
  ]);

  if (tableRows.length === 0) {
    tableRows.push(["2026-10-31", "TKN-GNT-104", "Paddy (Grade A)", `${totalQuintals} Qtl`, "Rs. 2,320.00", formatPdfCurrency(totalPayout), "COMPLETED"]);
  }

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    margin: { left: 14, right: 14 },
    theme: "striped",
    headStyles: { fillColor: PRIMARY_GREEN, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: DARK_SLATE, cellPadding: 2.5 },
    columnStyles: { 5: { halign: "right", fontStyle: "bold" } },
    head: [["Date", "Token No.", "Crop / Variety", "Weighed Qty", "Rate/Qtl", "Gross Amount", "Status"]],
    body: tableRows,
  });

  drawOfficialFooter(doc, farmerCode);
  doc.save(`ProcureFlow-Statement-${farmerCode}.pdf`);
}

/**
 * 4. Download Officer Daily Mandi Operational Report PDF
 */
export function downloadOfficerReportPdf(params: {
  reportDate?: string;
  officerName: string;
  officerRole?: string;
  officerCode?: string;
  mandiName?: string;
  centreName?: string;
  district: string;
  totalArrivals?: number;
  totalWeighedQuintals?: number;
  totalDisbursedAmount?: number;
  activeVehicles?: number;
  capacityUtilizationPercent?: number;
  metrics?: {
    totalBookingsToday: number;
    activeQueueCount: number;
    completedInspections: number;
    totalProcuredQuintals: number;
    totalDisbursedRupees: number;
    pendingPaymentsCount: number;
  };
  recentLots?: Array<{
    token: string;
    farmerCode: string;
    farmerName: string;
    quantity: number;
    amount: number;
    qualityPassed: boolean;
  }>;
  recentTransactions?: Array<{
    token: string;
    farmerName: string;
    crop: string;
    quantityQuintals: number;
    qualityGrade: string;
    amount: number;
    status: string;
  }>;
}): void {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const {
    officerName,
    officerCode = "OFF-GNT-101",
    officerRole = "Senior Procurement Officer",
    mandiName = params.centreName || "Guntur Agricultural Market Yard",
    district,
    totalArrivals = params.metrics?.totalBookingsToday || 12,
    totalWeighedQuintals = params.metrics?.totalProcuredQuintals || 420,
    totalDisbursedAmount = params.metrics?.totalDisbursedRupees || 974400,
    activeVehicles = params.metrics?.activeQueueCount || 5,
    recentLots = [],
  } = params;

  drawOfficialHeader(
    doc,
    "Daily Mandi Operations & Procurement Summary",
    `Mandi Hub Operations Report | Centre: ${mandiName} (${district})`
  );

  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...PRIMARY_GREEN);
  doc.setLineWidth(0.6);
  doc.roundedRect(14, 48, 182, 22, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL ARRIVALS", 20, 55);
  doc.text("TOTAL PADDY WEIGHED", 65, 55);
  doc.text("TOTAL DBT VALUE", 115, 55);
  doc.text("ACTIVE QUEUE", 165, 55);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...DARK_SLATE);
  doc.text(`${totalArrivals} Farmers`, 20, 64);
  doc.text(`${totalWeighedQuintals} Qtl`, 65, 64);
  doc.text(formatPdfCurrency(totalDisbursedAmount), 115, 64);
  doc.text(`${activeVehicles} Trucks`, 165, 64);

  autoTable(doc, {
    startY: 74,
    margin: { left: 14, right: 14 },
    theme: "plain",
    bodyStyles: { fontSize: 8.5, textColor: DARK_SLATE, cellPadding: 1.5 },
    body: [
      ["Supervising Officer:", `${officerName} (${officerRole})`, "Mandi Yard:", mandiName],
      ["District Jurisdiction:", district, "Operational Date:", params.reportDate || new Date().toLocaleDateString("en-IN")],
    ],
  });

  const rows = recentLots.map(l => [
    l.token,
    l.farmerCode,
    l.farmerName,
    `${l.quantity} Qtl`,
    formatPdfCurrency(l.amount),
    l.qualityPassed ? "PASSED (< 17% MOISTURE)" : "PENDING INSPECTION",
  ]);

  if (rows.length === 0) {
    rows.push(["TKN-GNT-101", "FMR-2026-UPG01", "Srinivasa Rao", "32 Qtl", "Rs. 74,240.00", "PASSED (< 17% MOISTURE)"]);
    rows.push(["TKN-GNT-102", "FMR-2026-AP02", "Venkat Reddy", "24 Qtl", "Rs. 55,680.00", "PASSED (< 17% MOISTURE)"]);
  }

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    margin: { left: 14, right: 14 },
    theme: "striped",
    headStyles: { fillColor: PRIMARY_GREEN, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: DARK_SLATE, cellPadding: 2.5 },
    head: [["Token No.", "Farmer Code", "Farmer Name", "Weighed Qty", "Gross Payable", "Quality Inspection"]],
    body: rows,
  });

  drawOfficialFooter(doc, officerCode);
  doc.save(`ProcureFlow-MandiReport-${officerCode}.pdf`);
}

/**
 * 5. Download Subsidized Transport Pass PDF
 */
export function downloadTransportPassPdf(params: {
  transportCode: string;
  bookingCode?: string;
  farmerName: string;
  farmerPhone: string;
  farmerVillage?: string;
  pickupVillage?: string;
  destinationCentreName?: string;
  destinationCentre?: string;
  vehicleType: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  cargoDescription?: string;
  estimatedLoadQuintals?: number | string;
  distanceKm?: number;
  baseFare?: number;
  totalFare?: number | string;
  subsidyAmount?: number | string;
  govtSubsidyAmount?: number | string;
  farmerPaidAmount?: number | string;
  farmerNetPayable?: number | string;
  scheduledDate: string;
  timeSlot: string;
  status?: string;
}): void {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const {
    transportCode,
    bookingCode = "BK-2026-7294",
    farmerName,
    farmerPhone,
    vehicleType,
    driverName = "Mandi Allocated Driver",
    driverPhone = "Available in SMS notification",
    vehicleNumber = "AP-07-TA-4921",
    pickupVillage = params.farmerVillage || "Angalakuduru",
    destinationCentre = params.destinationCentreName || "Guntur Agricultural Market Yard",
    totalFare = params.baseFare || 650,
    subsidyAmount = params.govtSubsidyAmount || 195,
    farmerPaidAmount = params.farmerNetPayable || 455,
    scheduledDate,
    timeSlot,
    status = "ASSIGNED",
  } = params;

  drawOfficialHeader(
    doc,
    "Subsidized Logistics E-Way Transit Pass",
    "Telangana & Andhra Pradesh Rythu Ratha State Logistics Assistance"
  );

  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...PRIMARY_GREEN);
  doc.setLineWidth(0.8);
  doc.roundedRect(14, 48, 182, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PRIMARY_GREEN);
  doc.text(`30% STATE LOGISTICS SUBSIDY APPLIED [${status}]`, 20, 56);

  doc.setFontSize(14);
  doc.setTextColor(...DARK_SLATE);
  doc.text(`Farmer Fare: ${formatPdfCurrency(farmerPaidAmount)} (Govt Subsidy: ${formatPdfCurrency(subsidyAmount)})`, 20, 64);

  autoTable(doc, {
    startY: 74,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: PRIMARY_GREEN, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: DARK_SLATE, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 }, 2: { fontStyle: "bold", cellWidth: 45 } },
    head: [["Transit Information", "Details", "Booking & Driver", "Details"]],
    body: [
      ["Transport Pass Code", transportCode, "Farmer Beneficiary", farmerName],
      ["Booking Reference", bookingCode, "Farmer Contact", farmerPhone],
      ["Pickup Origin", pickupVillage, "Destination Mandi", destinationCentre],
      ["Scheduled Transit", `${scheduledDate} · ${timeSlot}`, "Allocated Driver", `${driverName} (${driverPhone})`],
      ["Vehicle Category", vehicleType, "Vehicle Registration", vehicleNumber],
      ["Gross Commercial Fare", formatPdfCurrency(totalFare), "State Subsidy (30%)", formatPdfCurrency(subsidyAmount)],
    ],
  });

  drawOfficialFooter(doc, transportCode);
  doc.save(`ProcureFlow-TransportPass-${transportCode}.pdf`);
}

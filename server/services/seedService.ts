import { and, eq } from "drizzle-orm";
import {
  bookings,
  cropPrices,
  farmers,
  officers,
  procurementCentres,
  procurements,
  queueEntries,
  registrations,
  slots,
  transportBookings,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { hashPassword } from "./passwordService";

let seedPromise: Promise<void> | null = null;

const prototypeCentres = [
  { name: "Guntur Agricultural Market Yard", place: "Collectorate Road, Guntur", district: "Guntur", latitude: "16.2970000", longitude: "80.4350000", distanceKm: "2.40", status: "OPEN" as const, queueCapacity: 60, currentToken: "AP-GNT-024" },
  { name: "Vijayawada Central Paddy Hub", place: "Gollapudi Market Yard", district: "NTR District", latitude: "16.5417000", longitude: "80.5847000", distanceKm: "4.80", status: "OPEN" as const, queueCapacity: 55, currentToken: "AP-VJA-009" },
  { name: "Kurnool Rythu Bharosa Kendra", place: "C-Camp Agri Centre", district: "Kurnool", latitude: "15.8281000", longitude: "78.0373000", distanceKm: "6.50", status: "BUSY" as const, queueCapacity: 45, currentToken: "AP-KNL-038" },
  { name: "Rajahmundry Godavari Collection Point", place: "Katheru Road", district: "East Godavari", latitude: "17.0005000", longitude: "81.8040000", distanceKm: "8.20", status: "LIMITED" as const, queueCapacity: 35, currentToken: "AP-RJY-016" },
  { name: "Eluru District Procurement Yard", place: "Sanivarapupeta", district: "Eluru", latitude: "16.7107000", longitude: "81.0952000", distanceKm: "10.50", status: "OPEN" as const, queueCapacity: 40, currentToken: "AP-ELR-012" },
  { name: "Nellore Coastal Paddy Mandi", place: "Podalakur Road", district: "Nellore", latitude: "14.4426000", longitude: "79.9865000", distanceKm: "13.80", status: "OPEN" as const, queueCapacity: 50, currentToken: "AP-NLR-007" },
  { name: "Tirupati Rayalaseema Grain Yard", place: "Renigunta Road", district: "Tirupati", latitude: "13.6288000", longitude: "79.4192000", distanceKm: "15.20", status: "BUSY" as const, queueCapacity: 40, currentToken: "AP-TPT-019" },
  { name: "Visakhapatnam Anandapuram Yard", place: "Anandapuram Junction", district: "Visakhapatnam", latitude: "17.8864000", longitude: "83.3980000", distanceKm: "18.50", status: "OPEN" as const, queueCapacity: 45, currentToken: "AP-VSP-005" },
];

export const prototypeSlots = [
  ["07:00 AM", "08:00 AM", 25, 7],
  ["08:00 AM", "09:00 AM", 25, 12],
  ["09:00 AM", "10:00 AM", 25, 18],
  ["10:00 AM", "11:00 AM", 25, 22],
  ["11:00 AM", "12:00 PM", 25, 15],
  ["02:00 PM", "03:00 PM", 25, 9],
  ["03:00 PM", "04:00 PM", 25, 14],
  ["04:00 PM", "05:00 PM", 25, 20],
] as const;

export const prototypeCropPrices = [
  { cropName: "Paddy (Common)", variety: "Standard / MTU 1010", category: "Cereals", mspPerQuintal: "2300.00", marketRatePerQuintal: "2280.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "17.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-01" },
  { cropName: "Paddy (Grade A)", variety: "Grade A / BPT 5204", category: "Cereals", mspPerQuintal: "2320.00", marketRatePerQuintal: "2310.00", govtBonusPerQuintal: "50.00", maxMoisturePercent: "17.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-02" },
  { cropName: "Paddy (Parboiled)", variety: "Boiled Grade A", category: "Cereals", mspPerQuintal: "2320.00", marketRatePerQuintal: "2340.00", govtBonusPerQuintal: "30.00", maxMoisturePercent: "15.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-03" },
  { cropName: "Wheat (Gehun)", variety: "Kalyan Sona / Sharbati", category: "Cereals", mspPerQuintal: "2275.00", marketRatePerQuintal: "2250.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "12.0", effectiveSeason: "Rabi 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-04" },
  { cropName: "Maize (Makka)", variety: "Hybrid Yellow", category: "Coarse Cereals", mspPerQuintal: "2225.00", marketRatePerQuintal: "2180.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "14.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-05" },
  { cropName: "Jowar (Sorghum)", variety: "Maldandi / Hybrid", category: "Coarse Cereals", mspPerQuintal: "3371.00", marketRatePerQuintal: "3300.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-06" },
  { cropName: "Bajra (Pearl Millet)", variety: "Hybrid Pearl", category: "Coarse Cereals", mspPerQuintal: "2625.00", marketRatePerQuintal: "2580.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-07" },
  { cropName: "Ragi (Finger Millet)", variety: "GPU-28 / Indaf", category: "Coarse Cereals", mspPerQuintal: "4290.00", marketRatePerQuintal: "4210.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-08" },
  { cropName: "Bengal Gram (Chickpea / Chana)", variety: "Desi / Kabuli", category: "Pulses", mspPerQuintal: "5440.00", marketRatePerQuintal: "5380.00", govtBonusPerQuintal: "100.00", maxMoisturePercent: "12.0", effectiveSeason: "Rabi 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-09" },
  { cropName: "Red Gram (Tur / Arhar)", variety: "Maruti / Asha", category: "Pulses", mspPerQuintal: "7550.00", marketRatePerQuintal: "7480.00", govtBonusPerQuintal: "200.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-10" },
  { cropName: "Green Gram (Moong)", variety: "Shin Moong", category: "Pulses", mspPerQuintal: "8558.00", marketRatePerQuintal: "8400.00", govtBonusPerQuintal: "200.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-11" },
  { cropName: "Black Gram (Urad)", variety: "PU-19 / VBN", category: "Pulses", mspPerQuintal: "7400.00", marketRatePerQuintal: "7320.00", govtBonusPerQuintal: "150.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-12" },
  { cropName: "Groundnut (In Shell)", variety: "TMV-2 / Kadiri-6", category: "Oilseeds", mspPerQuintal: "6783.00", marketRatePerQuintal: "6600.00", govtBonusPerQuintal: "150.00", maxMoisturePercent: "8.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-13" },
  { cropName: "Sunflower", variety: "KBSH-44", category: "Oilseeds", mspPerQuintal: "7280.00", marketRatePerQuintal: "7190.00", govtBonusPerQuintal: "100.00", maxMoisturePercent: "9.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-14" },
  { cropName: "Soybean (Yellow)", variety: "JS 335", category: "Oilseeds", mspPerQuintal: "4892.00", marketRatePerQuintal: "4650.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "12.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-15" },
  { cropName: "Cotton (Medium Staple)", variety: "Surabhi", category: "Commercial", mspPerQuintal: "7121.00", marketRatePerQuintal: "6950.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "8.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-16" },
  { cropName: "Cotton (Long Staple)", variety: "BT Cotton / DCH-32", category: "Commercial", mspPerQuintal: "7521.00", marketRatePerQuintal: "7480.00", govtBonusPerQuintal: "0.00", maxMoisturePercent: "8.0", effectiveSeason: "Kharif 2025-26", notificationRef: "MoA&FW/CACP-2025/MSP-17" },
  { cropName: "Sugarcane", variety: "Co 86032 / Mandya", category: "Commercial", mspPerQuintal: "340.00", marketRatePerQuintal: "335.00", govtBonusPerQuintal: "15.00", maxMoisturePercent: "10.0", effectiveSeason: "Annual 2025-26", notificationRef: "MoA&FW/CACP-2025/FRP-18" },
];

export async function ensurePrototypeSeed(): Promise<void> {
  if (!seedPromise) seedPromise = seedDatabase();
  return seedPromise;
}

async function seedDatabase(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection is unavailable.");

  // Seed Crop MSP Prices
  const existingCropPrices = await db.select().from(cropPrices);
  if (existingCropPrices.length === 0) {
    await db.insert(cropPrices).values(prototypeCropPrices);
  } else {
    for (const p of prototypeCropPrices) {
      const found = existingCropPrices.find(e => e.cropName === p.cropName && e.variety === p.variety);
      if (!found) {
        await db.insert(cropPrices).values(p);
      }
    }
  }

  const seededOfficers = [
    {
      officerCode: "OFF-NZM-104",
      employeeId: "EMP-HO-104",
      name: "K. Venkata Rao (Head Officer)",
      email: "head.officer@smartprocure.gov.in",
      phone: "9848012345",
      passwordHash: hashPassword("Officer@2026"),
      role: "HEAD_OFFICER" as const,
      department: "Administration",
      designation: "Chief District Procurement Officer",
      branch: "Guntur",
      district: "Guntur",
      status: "ACTIVE" as const,
      mustChangePassword: 0,
    },
    {
      officerCode: "QC-2026-4892",
      employeeId: "EMP-QC-4892",
      name: "Dr. S. Madhavan",
      email: "qc.madhavan@smartprocure.gov.in",
      phone: "9848012346",
      passwordHash: hashPassword("Officer@2026"),
      role: "QUALITY_CONTROL_INSPECTOR" as const,
      department: "Quality Assurance & Lab",
      designation: "Chief Quality Inspector",
      branch: "Guntur Agricultural Market Yard",
      district: "Guntur",
      status: "ACTIVE" as const,
      mustChangePassword: 0,
    },
    {
      officerCode: "LOG-2026-1042",
      employeeId: "EMP-LOG-1042",
      name: "B. Prabhakar Reddy",
      email: "logistics.prabhakar@smartprocure.gov.in",
      phone: "9848012347",
      passwordHash: hashPassword("Officer@2026"),
      role: "LOGISTICS_OFFICER" as const,
      department: "Logistics & Transportation",
      designation: "District Fleet Coordinator",
      branch: "Guntur Transport Hub",
      district: "Guntur",
      status: "ACTIVE" as const,
      mustChangePassword: 0,
    },
    {
      officerCode: "PAY-2026-9041",
      employeeId: "EMP-PAY-9041",
      name: "N. Anjaneyulu",
      email: "finance.anjaneyulu@smartprocure.gov.in",
      phone: "9848012348",
      passwordHash: hashPassword("Officer@2026"),
      role: "PAYMENT_OFFICER" as const,
      department: "Finance & Accounts (DBT)",
      designation: "Senior Treasury Officer",
      branch: "Guntur",
      district: "Guntur",
      status: "ACTIVE" as const,
      mustChangePassword: 0,
    },
    {
      officerCode: "PO-2026-3391",
      employeeId: "EMP-PO-3391",
      name: "T. Rajasekhar",
      email: "mandi.rajasekhar@smartprocure.gov.in",
      phone: "9848012349",
      passwordHash: hashPassword("Officer@2026"),
      role: "PROCUREMENT_OFFICER" as const,
      department: "Mandi Operations",
      designation: "Procurement Yard Officer",
      branch: "Guntur Agricultural Market Yard",
      district: "Guntur",
      status: "ACTIVE" as const,
      mustChangePassword: 0,
    },
  ];

  for (const off of seededOfficers) {
    const existingOfficer = await db.select({ id: officers.id }).from(officers).where(eq(officers.officerCode, off.officerCode)).limit(1);
    if (!existingOfficer[0]) {
      await db.insert(officers).values(off);
    }
  }

  const existingCentres = await db.select({ id: procurementCentres.id }).from(procurementCentres).limit(1);
  if (!existingCentres[0]) {
    await db.insert(procurementCentres).values(prototypeCentres);
  }
  const currentCentres = await db.select({ id: procurementCentres.id }).from(procurementCentres);
  const datesToSeed = ["2026-03-17", "2026-03-18", "2026-03-19", "2026-03-20"];
  for (const centre of currentCentres) {
    const existingCentreSlots = await db.select({ id: slots.id }).from(slots).where(eq(slots.centreId, centre.id)).limit(1);
    if (!existingCentreSlots[0]) {
      for (const d of datesToSeed) {
        await db.insert(slots).values(
          prototypeSlots.map(([startTime, endTime, capacity, bookedCount]) => ({
            centreId: centre.id,
            slotDate: d,
            startTime,
            endTime,
            capacity,
            bookedCount,
            isActive: 1,
          }))
        );
      }
    }
  }

  const existingFarmer = await db.select().from(farmers).where(eq(farmers.phone, "9876543210")).limit(1);
  if (!existingFarmer[0]) {
    await db.insert(farmers).values({ farmerCode: "FMR-2026-11842", name: "Ramesh Kumar", phone: "9876543210", passwordHash: hashPassword("Farmer@2026"), village: "Mangalagiri", district: "Guntur", primaryCrop: "Paddy", status: "APPROVED" });
  }
  const farmer = (await db.select().from(farmers).where(eq(farmers.phone, "9876543210")).limit(1))[0];
  if (!farmer) return;

  const additionalPrototypeFarmers = [
    { farmerCode: "FMR-2026-11843", name: "Lakshmi Devi", phone: "9876543211", passwordHash: hashPassword("Farmer@2026"), village: "Tenali", district: "Guntur", primaryCrop: "Paddy", status: "APPROVED" as const },
    { farmerCode: "FMR-2026-11844", name: "Srinivas Rao", phone: "9876543212", passwordHash: hashPassword("Farmer@2026"), village: "Tadepalle", district: "Guntur", primaryCrop: "Paddy", status: "APPROVED" as const },
  ];
  for (const prototypeFarmer of additionalPrototypeFarmers) {
    const exists = await db.select({ id: farmers.id }).from(farmers).where(eq(farmers.phone, prototypeFarmer.phone)).limit(1);
    if (!exists[0]) {
      await db.insert(farmers).values(prototypeFarmer);
      const created = (await db.select({ id: farmers.id }).from(farmers).where(eq(farmers.phone, prototypeFarmer.phone)).limit(1))[0];
      if (created) await db.insert(registrations).values({ farmerId: created.id, aadhaarMasked: "XXXX XXXX 2194", declarationAccepted: 1, status: "APPROVED" });
    }
  }

  const existingRegistration = await db.select().from(registrations).where(eq(registrations.farmerId, farmer.id)).limit(1);
  if (!existingRegistration[0]) {
    const officer = (await db.select().from(officers).where(eq(officers.officerCode, "OFF-NZM-104")).limit(1))[0];
    await db.insert(registrations).values({ farmerId: farmer.id, aadhaarMasked: "XXXX XXXX 4512", declarationAccepted: 1, status: "APPROVED", reviewedByOfficerId: officer?.id, reviewedAt: new Date() });
  }

  const existingTransport = await db.select({ id: transportBookings.id }).from(transportBookings).limit(1);
  if (!existingTransport[0]) {
    await db.insert(transportBookings).values([
      {
        transportCode: "TR-2026-7160",
        farmerId: farmer.id,
        bookingId: null,
        vehicleType: "TRACTOR_TROLLEY",
        pickupVillage: "Mangalagiri",
        destinationCentreId: 1,
        scheduledDate: "2026-09-04",
        timeSlot: "Morning (07:00 - 11:00 AM)",
        estimatedLoadQuintals: "24.00",
        driverName: "B. Venkatesham",
        driverPhone: "9440192831",
        vehicleNumber: "TS-16-TR-4921",
        distanceKm: "14.00",
        baseFare: "502.00",
        subsidyAmount: "150.60",
        netPayable: "351.40",
        status: "ASSIGNED",
      },
      {
        transportCode: "TR-2026-4891",
        farmerId: farmer.id,
        bookingId: null,
        vehicleType: "MINI_TRUCK",
        pickupVillage: "Tenali",
        destinationCentreId: 1,
        scheduledDate: "2026-09-04",
        timeSlot: "Afternoon (12:00 - 04:00 PM)",
        estimatedLoadQuintals: "35.00",
        driverName: "K. Mohan Reddy",
        driverPhone: "9848039218",
        vehicleNumber: "AP-16-PK-8812",
        distanceKm: "18.00",
        baseFare: "746.00",
        subsidyAmount: "223.80",
        netPayable: "522.20",
        status: "REQUESTED",
      },
    ]);
  }

}


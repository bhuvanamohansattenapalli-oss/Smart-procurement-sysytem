import { and, desc, eq, lte, ne, or, sql } from "drizzle-orm";
import { Router, type ErrorRequestHandler, type NextFunction, type Response } from "express";
import { z } from "zod";
import {
  bookings,
  cropPrices,
  farmers,
  notifications,
  officers,
  otpChallenges,
  payments,
  procurementCentres,
  procurements,
  queueEntries,
  registrations,
  slots,
  transportBookings,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { requireApiAuth, requireRole } from "../middleware/apiAuth";
import { createMockAssistantReply } from "../services/mockAiService";
import { hashPassword, verifyPassword } from "../services/passwordService";
import { OTP_MAX_ATTEMPTS, OTP_MAX_REQUESTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS, createOtpCode, deliverOtp, hashOtp, verifyOtp } from "../services/otpService";
import { ensurePrototypeSeed, prototypeCropPrices } from "../services/seedService";
import { issueAccessToken, verifyAccessToken } from "../services/tokenService";
import { paymentGateway, type PaymentOutcome } from "../services/paymentGatewayService";
import { createRazorpayOrder, getRazorpayPublicConfig, isRazorpayConfigured, verifyRazorpaySignature } from "../services/razorpayService";
import type { AuthenticatedRequest, BookingContext } from "../types/api";

const phoneSchema = z.string().trim().regex(/^\d{10}$/, "Phone must be a 10-digit Indian mobile number.");
const passwordSchema = z.string().min(8, "Password must contain at least 8 characters.");
const idSchema = z.coerce.number().int().positive();
const registrationSchema = z.object({ name: z.string().trim().min(2).max(160), phone: phoneSchema, password: passwordSchema, village: z.string().trim().min(2).max(160), district: z.string().trim().min(2).max(160), primaryCrop: z.string().trim().min(2).max(80), aadhaarMasked: z.string().trim().regex(/^X{4}\sX{4}\s\d{4}$|^\d{4}\s\d{4}\s\d{4}$/, "Provide masked Aadhaar as XXXX XXXX 1234."), declarationAccepted: z.literal(true) });
const otpChallengeSchema = z.object({ challengeId: idSchema, otp: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit OTP.") });
const otpResendSchema = z.object({ challengeId: idSchema });
const loginSchema = z.object({ phone: phoneSchema, password: passwordSchema });
const officerLoginSchema = z.object({ officerCode: z.string().trim().min(4).max(40), password: passwordSchema });
const bookingSchema = z.object({ centreId: idSchema, slotId: idSchema, paddyVariety: z.string().trim().min(2).max(120), paddyGrade: z.string().trim().min(1).max(32), expectedQuantityQuintals: z.coerce.number().positive().max(1000) });
const transportBookingSchema = z.object({
  bookingId: idSchema.optional(),
  vehicleType: z.enum(["TRACTOR_TROLLEY", "MINI_TRUCK", "HEAVY_LORRY"]),
  pickupVillage: z.string().trim().min(2).max(160),
  destinationCentreId: idSchema,
  scheduledDate: z.string().trim().min(4).max(24),
  timeSlot: z.string().trim().min(2).max(32).default("Morning (07:00 - 11:00 AM)"),
  estimatedLoadQuintals: z.coerce.number().positive().max(500),
  distanceKm: z.coerce.number().positive().optional().default(12),
});
const paymentSchema = z.object({ bookingId: idSchema, method: z.enum(["UPI", "CARD", "NET_BANKING"]) });
const paymentOutcomeSchema = z.object({ outcome: z.enum(["SUCCESS", "FAILED"]), failureReason: z.string().trim().max(240).optional() });
const statusSchema = z.object({ status: z.enum(["BOOKED", "ARRIVED", "DOCUMENT_VERIFICATION", "WEIGHING", "QUALITY_CHECK", "PROCESSING", "COMPLETED"]), weighedQuantityQuintals: z.coerce.number().positive().optional(), qualityGrade: z.string().trim().max(32).optional() });
const questionSchema = z.object({ question: z.string().trim().min(2).max(600), bookingId: idSchema.optional(), language: z.enum(["EN", "HI", "TE"]).default("EN") });

const VEHICLE_CATALOG = {
  TRACTOR_TROLLEY: {
    type: "TRACTOR_TROLLEY",
    name: "Tractor Trolley",
    capacityQuintals: "30 – 50 quintals",
    capacityTonnes: "3.0 – 5.0 tonnes",
    ratePerKm: 18,
    baseFare: 350,
    subsidyPercent: 30,
    suitableFor: "Village to mandi transit, unpaved farm roads",
    icon: "Tractor",
  },
  MINI_TRUCK: {
    type: "MINI_TRUCK",
    name: "Mini Truck (Tata Ace / Bolero)",
    capacityQuintals: "15 – 25 quintals",
    capacityTonnes: "1.5 – 2.5 tonnes",
    ratePerKm: 22,
    baseFare: 400,
    subsidyPercent: 30,
    suitableFor: "Fast transit for small & marginal farmer harvests",
    icon: "Truck",
  },
  HEAVY_LORRY: {
    type: "HEAVY_LORRY",
    name: "Heavy Lorry (10-Wheeler)",
    capacityQuintals: "100 – 160 quintals",
    capacityTonnes: "10.0 – 16.0 tonnes",
    ratePerKm: 35,
    baseFare: 800,
    subsidyPercent: 30,
    suitableFor: "FPO / Farmer group pooled bulk harvest",
    icon: "Truck",
  },
} as const;

function respondValidation<T extends z.ZodTypeAny>(res: Response, input: T, body: unknown): z.infer<T> | undefined {
  const parsed = input.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "Please correct the submitted fields.", details: parsed.error.flatten() });
    return undefined;
  }
  return parsed.data;
}

function formatFarmer(farmer: typeof farmers.$inferSelect) {
  return { id: farmer.id, farmerCode: farmer.farmerCode, name: farmer.name, phone: farmer.phone, village: farmer.village, district: farmer.district, primaryCrop: farmer.primaryCrop, status: farmer.status };
}

function formatCentre(centre: typeof procurementCentres.$inferSelect, queueCount: number, availableSlots: number) {
  return { id: centre.id, name: centre.name, place: centre.place, district: centre.district, latitude: Number(centre.latitude), longitude: Number(centre.longitude), distanceKm: Number(centre.distanceKm), status: centre.status, currentToken: centre.currentToken, currentQueue: queueCount, availableSlots };
}

function createPrototypePaymentQuote(paddyVariety: string, expectedQuantityQuintals: number) {
  const unitPrice = paddyVariety.toLowerCase().includes("parboiled") ? 2320 : paddyVariety.toLowerCase().includes("fine") ? 2203 : 2300;
  const qualityAdjustment = 0;
  return { unitPrice, qualityAdjustment, demoPayable: Number((expectedQuantityQuintals * unitPrice + qualityAdjustment).toFixed(2)), currency: "INR", isOfficial: false };
}

function paymentView(payment: typeof payments.$inferSelect) {
  return { paymentId: payment.paymentCode, transactionReference: payment.transactionReference, receiptNumber: payment.receiptNumber, amount: Number(payment.amount), method: payment.method, gateway: payment.gateway, gatewayPaymentId: payment.gatewayPaymentId, status: payment.status, failureReason: payment.failureReason, initiatedAt: payment.initiatedAt, processedAt: payment.processedAt, completedAt: payment.completedAt, updatedAt: payment.updatedAt };
}

async function getQueueCount(centreId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  return (await db.select().from(queueEntries).where(and(eq(queueEntries.centreId, centreId), eq(queueEntries.status, "WAITING")))).length;
}

async function getBookingContext(bookingId: number): Promise<{ booking: typeof bookings.$inferSelect; farmer: typeof farmers.$inferSelect; centre: typeof procurementCentres.$inferSelect; slot: typeof slots.$inferSelect; queue: typeof queueEntries.$inferSelect | undefined; procurement: typeof procurements.$inferSelect | undefined } | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable.");
  const booking = (await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1))[0];
  if (!booking) return undefined;
  const [farmer, centre, slot, queue, procurement] = await Promise.all([
    db.select().from(farmers).where(eq(farmers.id, booking.farmerId)).limit(1).then(rows => rows[0]),
    db.select().from(procurementCentres).where(eq(procurementCentres.id, booking.centreId)).limit(1).then(rows => rows[0]),
    db.select().from(slots).where(eq(slots.id, booking.slotId)).limit(1).then(rows => rows[0]),
    db.select().from(queueEntries).where(eq(queueEntries.bookingId, booking.id)).limit(1).then(rows => rows[0]),
    db.select().from(procurements).where(eq(procurements.bookingId, booking.id)).limit(1).then(rows => rows[0]),
  ]);
  if (!farmer || !centre || !slot) return undefined;
  return { booking, farmer, centre, slot, queue, procurement };
}

async function requireBookingAccess(req: AuthenticatedRequest, res: Response, bookingId: number) {
  const context = await getBookingContext(bookingId);
  if (!context) { res.status(404).json({ error: "BOOKING_NOT_FOUND", message: "Booking was not found." }); return undefined; }
  if (req.principal?.role === "farmer" && req.principal.id !== context.booking.farmerId) { res.status(403).json({ error: "FORBIDDEN", message: "You cannot access another farmer's booking." }); return undefined; }
  return context;
}

function publicBooking(context: Awaited<ReturnType<typeof getBookingContext>>) {
  if (!context) return undefined;
  const quantity = Number(context.booking.expectedQuantityQuintals);
  return { id: context.booking.id, bookingCode: context.booking.bookingCode, status: context.booking.status, paddyVariety: context.booking.paddyVariety, paddyGrade: context.booking.paddyGrade, expectedQuantityQuintals: quantity, tokenNumber: context.booking.tokenNumber, createdAt: context.booking.createdAt, farmer: formatFarmer(context.farmer), centre: { id: context.centre.id, name: context.centre.name, place: context.centre.place, distanceKm: Number(context.centre.distanceKm) }, slot: { id: context.slot.id, date: context.slot.slotDate, startTime: context.slot.startTime, endTime: context.slot.endTime }, queue: context.queue ? { position: context.queue.position, peopleAhead: Math.max(0, context.queue.position - 1), estimatedWaitMinutes: context.queue.estimatedWaitMinutes, status: context.queue.status, currentToken: context.centre.currentToken } : null, procurement: context.procurement ? { status: context.procurement.status, weighedQuantityQuintals: context.procurement.weighedQuantityQuintals ? Number(context.procurement.weighedQuantityQuintals) : null, qualityGrade: context.procurement.qualityGrade, updatedAt: context.procurement.updatedAt } : null, paymentQuote: createPrototypePaymentQuote(context.booking.paddyVariety, quantity) };
}

function apiCors(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const configuredOrigins = (process.env.CORS_ORIGIN ?? "").split(",").map(origin => origin.trim()).filter(Boolean);
  const origin = req.header("origin");
  if (origin && configuredOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
}

export function createProcurementApi() {
  const api = Router();
  api.use(apiCors);
  api.use(async (_req, res, next) => { try { await ensurePrototypeSeed(); next(); } catch { res.status(503).json({ error: "SERVICE_UNAVAILABLE", message: "Prototype database is unavailable." }); } });

  api.post(["/registration", "/farmers/register"], async (req, res) => {
    const input = respondValidation(res, registrationSchema, req.body);
    if (!input) return;
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    if ((await db.select().from(farmers).where(eq(farmers.phone, input.phone)).limit(1))[0]) {
      return res.status(409).json({ error: "PHONE_EXISTS", message: "A farmer is already registered with this mobile number." });
    }
    const farmerCode = `FMR-${new Date().getUTCFullYear()}-${String(Date.now()).slice(-6)}`;
    await db.insert(farmers).values({
      farmerCode,
      name: input.name,
      phone: input.phone,
      passwordHash: hashPassword(input.password),
      village: input.village,
      district: input.district,
      primaryCrop: input.primaryCrop,
      status: "PENDING",
    });
    const farmer = (await db.select().from(farmers).where(eq(farmers.phone, input.phone)).limit(1))[0];
    if (!farmer) return res.status(500).json({ error: "REGISTRATION_FAILED" });
    await db.insert(registrations).values({
      farmerId: farmer.id,
      aadhaarMasked: input.aadhaarMasked,
      declarationAccepted: 1,
      status: "PENDING",
    });
    const registration = (await db.select().from(registrations).where(eq(registrations.farmerId, farmer.id)).limit(1))[0];
    // Create farmer notification
    await db.insert(notifications).values({
      farmerId: farmer.id,
      title: "Registration submitted",
      message: "Your registration has been submitted and is awaiting officer verification.",
      category: "REGISTRATION",
    });
    // Create officer notification
    await db.insert(notifications).values({
      farmerId: farmer.id,
      title: "New farmer registration submitted",
      message: `Farmer ${farmer.name} (${farmer.phone}) from ${farmer.village}, ${farmer.district} submitted registration and is awaiting officer verification.`,
      category: "REGISTRATION",
    });
    return res.status(201).json({
      message: "Registration submitted — awaiting officer verification.",
      registrationId: registration?.id,
      farmer: formatFarmer(farmer),
      status: "PENDING",
    });
  });

  api.post("/farmers/login", async (req, res) => {
    const input = respondValidation(res, loginSchema, req.body); if (!input) return;
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const farmer = (await db.select().from(farmers).where(eq(farmers.phone, input.phone)).limit(1))[0];
    if (!farmer || !verifyPassword(input.password, farmer.passwordHash)) return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Mobile number or password is incorrect." });
    if (farmer.status !== "APPROVED") return res.status(403).json({ error: "REGISTRATION_NOT_APPROVED", message: `Your registration is ${farmer.status.toLowerCase()}. Officer approval is required before login.`, status: farmer.status });
    const token = await issueAccessToken({ id: farmer.id, role: "farmer", code: farmer.farmerCode, name: farmer.name });
    return res.json({ accessToken: token, tokenType: "Bearer", expiresInSeconds: 28800, farmer: formatFarmer(farmer) });
  });

  api.post("/officers/login", async (req, res) => {
    const input = respondValidation(res, officerLoginSchema, req.body); if (!input) return;
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const officer = (await db.select().from(officers).where(eq(officers.officerCode, input.officerCode)).limit(1))[0];
    if (!officer || !verifyPassword(input.password, officer.passwordHash)) return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Officer ID or password is incorrect." });
    const token = await issueAccessToken({ id: officer.id, role: "officer", code: officer.officerCode, name: officer.name });
    return res.json({ accessToken: token, tokenType: "Bearer", expiresInSeconds: 28800, officer: { id: officer.id, officerCode: officer.officerCode, name: officer.name, district: officer.district } });
  });

  api.get("/officers/registrations/pending", requireApiAuth, requireRole("officer"), async (_req, res) => {
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const pending = await db.select().from(registrations).where(eq(registrations.status, "PENDING")).orderBy(desc(registrations.submittedAt));
    const rows = await Promise.all(pending.map(async registration => ({ ...registration, farmer: formatFarmer((await db.select().from(farmers).where(eq(farmers.id, registration.farmerId)).limit(1))[0]!) })));
    return res.json({ registrations: rows });
  });

  api.get("/officers/registrations/:id", requireApiAuth, requireRole("officer"), async (req, res) => {
    const id = idSchema.safeParse(req.params.id); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const registration = (await db.select().from(registrations).where(eq(registrations.id, id.data)).limit(1))[0];
    if (!registration) return res.status(404).json({ error: "REGISTRATION_NOT_FOUND" });
    const farmer = (await db.select().from(farmers).where(eq(farmers.id, registration.farmerId)).limit(1))[0];
    return res.json({ registration, farmer: farmer && formatFarmer(farmer) });
  });

  api.put("/officers/registrations/:id/approve", requireApiAuth, requireRole("officer"), async (req: AuthenticatedRequest, res) => {
    const id = idSchema.safeParse(req.params.id); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const registration = (await db.select().from(registrations).where(eq(registrations.id, id.data)).limit(1))[0];
    if (!registration) return res.status(404).json({ error: "REGISTRATION_NOT_FOUND" });
    if (registration.status !== "PENDING") return res.status(409).json({ error: "REGISTRATION_ALREADY_REVIEWED" });
    await db.update(registrations).set({ status: "APPROVED", reviewedByOfficerId: req.principal!.id, reviewedAt: new Date(), rejectionReason: null }).where(eq(registrations.id, registration.id));
    await db.update(farmers).set({ status: "APPROVED" }).where(eq(farmers.id, registration.farmerId));
    await db.insert(notifications).values({ farmerId: registration.farmerId, title: "Registration approved", message: "Your profile is approved. You can now login and book a procurement slot.", category: "REGISTRATION" });
    return res.json({ message: "Farmer registration approved.", registrationId: registration.id, status: "APPROVED" });
  });

  api.put("/officers/registrations/:id/reject", requireApiAuth, requireRole("officer"), async (req: AuthenticatedRequest, res) => {
    const id = idSchema.safeParse(req.params.id); const input = respondValidation(res, z.object({ reason: z.string().trim().min(3).max(500) }), req.body); if (!id.success || !input) return res.status(400).json({ error: "VALIDATION_ERROR", message: "A rejection reason is required." });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const registration = (await db.select().from(registrations).where(eq(registrations.id, id.data)).limit(1))[0];
    if (!registration) return res.status(404).json({ error: "REGISTRATION_NOT_FOUND" });
    if (registration.status !== "PENDING") return res.status(409).json({ error: "REGISTRATION_ALREADY_REVIEWED" });
    await db.update(registrations).set({ status: "REJECTED", rejectionReason: input.reason, reviewedByOfficerId: req.principal!.id, reviewedAt: new Date() }).where(eq(registrations.id, registration.id));
    await db.update(farmers).set({ status: "REJECTED" }).where(eq(farmers.id, registration.farmerId));
    await db.insert(notifications).values({ farmerId: registration.farmerId, title: "Registration needs attention", message: `Officer note: ${input.reason}`, category: "REGISTRATION" });
    return res.json({ message: "Farmer registration rejected.", registrationId: registration.id, status: "REJECTED" });
  });

  api.get("/centres", async (_req, res) => {
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const centres = await db.select().from(procurementCentres);
    const response = await Promise.all(centres.map(async centre => {
      const [waiting, centreSlots] = await Promise.all([db.select().from(queueEntries).where(and(eq(queueEntries.centreId, centre.id), eq(queueEntries.status, "WAITING"))), db.select().from(slots).where(and(eq(slots.centreId, centre.id), eq(slots.isActive, 1)))]);
      return formatCentre(centre, waiting.length, centreSlots.reduce((sum, slot) => sum + Math.max(0, slot.capacity - slot.bookedCount), 0));
    }));
    return res.json({ centres: response, prototypeData: true });
  });

  api.get("/centres/:id", async (req, res) => {
    const id = idSchema.safeParse(req.params.id); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const centre = (await db.select().from(procurementCentres).where(eq(procurementCentres.id, id.data)).limit(1))[0];
    if (!centre) return res.status(404).json({ error: "CENTRE_NOT_FOUND" });
    const [waiting, centreSlots] = await Promise.all([db.select().from(queueEntries).where(and(eq(queueEntries.centreId, centre.id), eq(queueEntries.status, "WAITING"))), db.select().from(slots).where(and(eq(slots.centreId, centre.id), eq(slots.isActive, 1)))]);
    return res.json({ centre: formatCentre(centre, waiting.length, centreSlots.reduce((sum, slot) => sum + Math.max(0, slot.capacity - slot.bookedCount), 0)) });
  });

  api.get("/centres/:id/slots", async (req, res) => {
    const id = idSchema.safeParse(req.params.id); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const centre = (await db.select().from(procurementCentres).where(eq(procurementCentres.id, id.data)).limit(1))[0];
    if (!centre) return res.status(404).json({ error: "CENTRE_NOT_FOUND" });
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const available = await db.select().from(slots).where(and(eq(slots.centreId, centre.id), eq(slots.isActive, 1), ...(date ? [eq(slots.slotDate, date)] : [])));
    return res.json({ centreId: centre.id, slots: available.map(slot => ({ id: slot.id, date: slot.slotDate, startTime: slot.startTime, endTime: slot.endTime, capacity: slot.capacity, bookedCount: slot.bookedCount, available: Math.max(0, slot.capacity - slot.bookedCount), isFull: slot.bookedCount >= slot.capacity })) });
  });

  api.post("/bookings", requireApiAuth, requireRole("farmer"), async (req: AuthenticatedRequest, res) => {
    const input = respondValidation(res, bookingSchema, req.body); if (!input) return;
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const farmer = (await db.select().from(farmers).where(eq(farmers.id, req.principal!.id)).limit(1))[0];
    if (!farmer || farmer.status !== "APPROVED") return res.status(403).json({ error: "REGISTRATION_NOT_APPROVED", message: "Only approved farmers can book a slot." });
    const activeBooking = (await db.select().from(bookings).where(and(eq(bookings.farmerId, farmer.id), eq(bookings.status, "ACTIVE"))).limit(1))[0];
    if (activeBooking) return res.status(409).json({ error: "ACTIVE_BOOKING_EXISTS", message: "This farmer already has an active booking.", bookingId: activeBooking.id });
    const [centre, slot] = await Promise.all([db.select().from(procurementCentres).where(eq(procurementCentres.id, input.centreId)).limit(1).then(rows => rows[0]), db.select().from(slots).where(eq(slots.id, input.slotId)).limit(1).then(rows => rows[0])]);
    if (!centre || !slot || slot.centreId !== centre.id || slot.isActive !== 1) return res.status(400).json({ error: "INVALID_SLOT", message: "The selected slot is not available at this centre." });
    if (slot.bookedCount >= slot.capacity) return res.status(409).json({ error: "SLOT_FULL", message: "The selected slot is full. Please choose another time." });
    const queuePosition = (await getQueueCount(centre.id)) + 1;
    const timestamp = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    const bookingCode = `BK-${new Date().getUTCFullYear()}-${timestamp.slice(-9)}`;
    const tokenNumber = `P-${timestamp.slice(-9)}`;
    await db.insert(bookings).values({ bookingCode, farmerId: farmer.id, centreId: centre.id, slotId: slot.id, paddyVariety: input.paddyVariety, paddyGrade: input.paddyGrade, expectedQuantityQuintals: input.expectedQuantityQuintals.toFixed(2), tokenNumber, status: "ACTIVE" });
    const booking = (await db.select().from(bookings).where(eq(bookings.bookingCode, bookingCode)).limit(1))[0];
    if (!booking) return res.status(500).json({ error: "BOOKING_CREATE_FAILED" });
    await db.update(slots).set({ bookedCount: slot.bookedCount + 1 }).where(eq(slots.id, slot.id));
    await db.insert(queueEntries).values({ bookingId: booking.id, centreId: centre.id, position: queuePosition, estimatedWaitMinutes: queuePosition * 2, status: "WAITING" });
    await db.insert(procurements).values({ bookingId: booking.id, status: "BOOKED" });
    await db.insert(notifications).values([{ farmerId: farmer.id, title: "Booking confirmed", message: `${bookingCode} is confirmed at ${centre.name}.`, category: "BOOKING" }, { farmerId: farmer.id, title: "Token generated", message: `Your queue token is ${tokenNumber}.`, category: "TOKEN" }, ...(queuePosition <= 3 ? [{ farmerId: farmer.id, title: "Queue approaching", message: `Only ${Math.max(0, queuePosition - 1)} farmer(s) are ahead of your token ${tokenNumber}.`, category: "QUEUE" }] : [])]);
    const context = await getBookingContext(booking.id);
    return res.status(201).json({ message: "Booking confirmed and token generated.", booking: publicBooking(context) });
  });

  api.get("/bookings/:id", requireApiAuth, async (req: AuthenticatedRequest, res) => {
    const id = idSchema.safeParse(req.params.id); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const context = await requireBookingAccess(req, res, id.data); if (!context) return;
    return res.json({ booking: publicBooking(context) });
  });

  api.get("/farmers/:id/bookings", requireApiAuth, async (req: AuthenticatedRequest, res) => {
    const farmerId = idSchema.safeParse(req.params.id); if (!farmerId.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    if (req.principal?.role === "farmer" && req.principal.id !== farmerId.data) return res.status(403).json({ error: "FORBIDDEN", message: "You cannot access another farmer's bookings." });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const found = await db.select().from(bookings).where(eq(bookings.farmerId, farmerId.data)).orderBy(desc(bookings.createdAt));
    return res.json({ bookings: await Promise.all(found.map(async booking => publicBooking(await getBookingContext(booking.id)))) });
  });

  api.get("/queue/:bookingId", requireApiAuth, async (req: AuthenticatedRequest, res) => {
    const id = idSchema.safeParse(req.params.bookingId); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const context = await requireBookingAccess(req, res, id.data); if (!context) return;
    if (!context.queue) return res.status(404).json({ error: "QUEUE_NOT_FOUND" });
    return res.json({ bookingId: context.booking.id, tokenNumber: context.booking.tokenNumber, currentToken: context.centre.currentToken, position: context.queue.position, peopleAhead: Math.max(0, context.queue.position - 1), estimatedWaitMinutes: context.queue.estimatedWaitMinutes, status: context.queue.status, updatedAt: context.queue.updatedAt });
  });

  api.get("/procurement/:bookingId", requireApiAuth, async (req: AuthenticatedRequest, res) => {
    const id = idSchema.safeParse(req.params.bookingId); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const context = await requireBookingAccess(req, res, id.data); if (!context) return;
    if (!context.procurement) return res.status(404).json({ error: "PROCUREMENT_NOT_FOUND" });
    return res.json({ bookingId: context.booking.id, procurement: { status: context.procurement.status, weighedQuantityQuintals: context.procurement.weighedQuantityQuintals ? Number(context.procurement.weighedQuantityQuintals) : null, qualityGrade: context.procurement.qualityGrade, updatedAt: context.procurement.updatedAt } });
  });

  api.put("/procurement/:bookingId/status", requireApiAuth, requireRole("officer"), async (req, res) => {
    const id = idSchema.safeParse(req.params.bookingId); const input = respondValidation(res, statusSchema, req.body); if (!id.success || !input) return;
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const context = await getBookingContext(id.data); if (!context) return res.status(404).json({ error: "BOOKING_NOT_FOUND" });
    await db.update(procurements).set({ status: input.status, weighedQuantityQuintals: input.weighedQuantityQuintals?.toFixed(2), qualityGrade: input.qualityGrade, updatedAt: new Date() }).where(eq(procurements.bookingId, context.booking.id));
    if (input.status === "ARRIVED" && context.queue) {
      await db.update(queueEntries).set({ status: "CALLED", estimatedWaitMinutes: 0, updatedAt: new Date() }).where(eq(queueEntries.bookingId, context.booking.id));
      await db.update(procurementCentres).set({ currentToken: context.booking.tokenNumber }).where(eq(procurementCentres.id, context.centre.id));
    }
    if (input.status === "COMPLETED") {
      await db.update(bookings).set({ status: "COMPLETED" }).where(eq(bookings.id, context.booking.id));
      if (context.queue) await db.update(queueEntries).set({ status: "SERVED", estimatedWaitMinutes: 0, updatedAt: new Date() }).where(eq(queueEntries.bookingId, context.booking.id));
    }
    await db.insert(notifications).values({ farmerId: context.farmer.id, title: "Procurement status updated", message: `Your booking ${context.booking.bookingCode} is now ${input.status.replaceAll("_", " ")}.`, category: "PROCUREMENT" });
    return res.json({ message: "Procurement status updated.", bookingId: context.booking.id, status: input.status });
  });

  api.get("/stats/farmer", requireApiAuth, requireRole("farmer"), async (req: AuthenticatedRequest, res) => {
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const farmerBookings = await db.select().from(bookings).where(eq(bookings.farmerId, req.principal!.id));
    const bookingIds = new Set(farmerBookings.map(booking => booking.id));
    const farmerPayments = (await db.select().from(payments)).filter(payment => bookingIds.has(payment.bookingId));
    const farmerProcurements = (await db.select().from(procurements)).filter(procurement => bookingIds.has(procurement.bookingId));
    const farmerQueues = (await db.select().from(queueEntries)).filter(queueEntry => bookingIds.has(queueEntry.bookingId));
    return res.json({ stats: { totalBookings: farmerBookings.length, completedProcurements: farmerProcurements.filter(item => item.status === "COMPLETED").length, pendingBookings: farmerBookings.filter(item => item.status !== "COMPLETED").length, currentQueuePosition: farmerQueues.find(item => item.status === "WAITING")?.position ?? null, totalQuantityProcured: farmerProcurements.reduce((sum, item) => sum + Number(item.weighedQuantityQuintals ?? 0), 0), totalAmountReceived: farmerPayments.filter(item => item.status === "SUCCESS").reduce((sum, item) => sum + Number(item.amount), 0), successfulPayments: farmerPayments.filter(item => item.status === "SUCCESS").length } });
  });

  api.get("/stats/officer", requireApiAuth, requireRole("officer"), async (_req, res) => {
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const [allFarmers, allRegistrations, allBookings, allQueues, allProcurements, allPayments] = await Promise.all([db.select().from(farmers), db.select().from(registrations), db.select().from(bookings), db.select().from(queueEntries), db.select().from(procurements), db.select().from(payments)]);
    return res.json({ stats: { totalFarmers: allFarmers.length, pendingRegistrations: allRegistrations.filter(item => item.status === "PENDING").length, approvedFarmers: allFarmers.filter(item => item.status === "APPROVED").length, todaysBookings: allBookings.length, activeQueue: allQueues.filter(item => item.status === "WAITING").length, completedProcurements: allProcurements.filter(item => item.status === "COMPLETED").length, pendingPayments: allPayments.filter(item => item.status === "PENDING" || item.status === "PROCESSING").length, completedPayments: allPayments.filter(item => item.status === "SUCCESS").length } });
  });

  api.get("/officers/bookings", requireApiAuth, requireRole("officer"), async (_req, res) => {
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const allBookings = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    const rows = await Promise.all(allBookings.map(async b => publicBooking(await getBookingContext(b.id))));
    return res.json({ bookings: rows.filter(Boolean) });
  });

  api.get("/analytics/officer", requireApiAuth, requireRole("officer"), async (_req, res) => {
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const [allFarmers, allRegistrations, allBookings, allCentres, allQueues, allProcurements, allPayments, allSlots] = await Promise.all([
      db.select().from(farmers),
      db.select().from(registrations),
      db.select().from(bookings),
      db.select().from(procurementCentres),
      db.select().from(queueEntries),
      db.select().from(procurements),
      db.select().from(payments),
      db.select().from(slots),
    ]);

    const centreUtilization = allCentres.map(c => {
      const centreQueues = allQueues.filter(q => q.centreId === c.id && q.status === "WAITING");
      const centreSlots = allSlots.filter(s => s.centreId === c.id && s.isActive === 1);
      const totalSlotsCap = centreSlots.reduce((sum, s) => sum + s.capacity, 0) || 50;
      const bookedSlots = centreSlots.reduce((sum, s) => sum + s.bookedCount, 0);
      const availableSlots = Math.max(0, totalSlotsCap - bookedSlots);
      const utilizationPercent = Math.min(100, Math.round((centreQueues.length / Math.max(1, c.queueCapacity)) * 100));
      return {
        id: c.id,
        name: c.name,
        place: c.place,
        status: c.status,
        currentQueue: centreQueues.length,
        queueCapacity: c.queueCapacity,
        utilizationPercent,
        availableSlots,
        totalSlotsCap,
      };
    });

    const slotBuckets: Record<string, number> = {
      "09:30 – 10:00 AM": 0,
      "10:00 – 10:30 AM": 0,
      "10:30 – 11:00 AM": 0,
      "11:00 – 11:30 AM": 0,
      "11:30 AM – 12:00 PM": 0,
      "12:00 – 12:30 PM": 0,
      "Afternoon": 0,
    };

    for (const b of allBookings) {
      const slot = allSlots.find(s => s.id === b.slotId);
      if (slot) {
        const timeKey = `${slot.startTime} – ${slot.endTime}`;
        const match = Object.keys(slotBuckets).find(k => k.includes(slot.startTime));
        if (match) slotBuckets[match] = (slotBuckets[match] || 0) + 1;
        else slotBuckets["Afternoon"] = (slotBuckets["Afternoon"] || 0) + 1;
      }
    }

    const hourlyArrivals = Object.entries(slotBuckets).map(([time, count]) => ({
      time,
      count,
      percentage: allBookings.length > 0 ? Math.min(100, Math.max(15, Math.round((count / allBookings.length) * 100))) : 20,
    }));

    const varietyMap: Record<string, { count: number; quintals: number }> = {};
    for (const b of allBookings) {
      const key = b.paddyVariety || "Common paddy";
      if (!varietyMap[key]) varietyMap[key] = { count: 0, quintals: 0 };
      varietyMap[key].count += 1;
      varietyMap[key].quintals += Number(b.expectedQuantityQuintals || 0);
    }
    const cropBreakdown = Object.entries(varietyMap).map(([variety, data]) => ({
      variety,
      count: data.count,
      quintals: Number(data.quintals.toFixed(2)),
    }));

    const totalDisbursed = allPayments.filter(p => p.status === "SUCCESS").reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPendingAmount = allPayments.filter(p => p.status === "PENDING" || p.status === "PROCESSING").reduce((sum, p) => sum + Number(p.amount), 0);
    const totalSuccessfulPayments = allPayments.filter(p => p.status === "SUCCESS").length;
    const totalFailedPayments = allPayments.filter(p => p.status === "FAILED").length;
    const successRate = (totalSuccessfulPayments + totalFailedPayments) > 0 ? Math.round((totalSuccessfulPayments / (totalSuccessfulPayments + totalFailedPayments)) * 100) : 100;

    return res.json({
      analytics: {
        totalFarmers: allFarmers.length,
        approvedFarmers: allFarmers.filter(f => f.status === "APPROVED").length,
        pendingRegistrations: allRegistrations.filter(r => r.status === "PENDING").length,
        rejectedRegistrations: allRegistrations.filter(r => r.status === "REJECTED").length,
        totalBookings: allBookings.length,
        activeBookings: allBookings.filter(b => b.status === "ACTIVE").length,
        completedProcurements: allProcurements.filter(p => p.status === "COMPLETED").length,
        activeQueue: allQueues.filter(q => q.status === "WAITING").length,
        financials: {
          totalDisbursed,
          totalPendingAmount,
          completedPaymentsCount: totalSuccessfulPayments,
          pendingPaymentsCount: allPayments.filter(p => p.status === "PENDING" || p.status === "PROCESSING").length,
          successRate,
          averagePayout: totalSuccessfulPayments > 0 ? Math.round(totalDisbursed / totalSuccessfulPayments) : 0,
        },
        centreUtilization,
        hourlyArrivals,
        cropBreakdown,
        funnel: {
          registered: allFarmers.length,
          pending: allRegistrations.filter(r => r.status === "PENDING").length,
          approved: allFarmers.filter(f => f.status === "APPROVED").length,
          booked: allBookings.length,
          completed: allProcurements.filter(p => p.status === "COMPLETED").length,
        }
      }
    });
  });

  api.get("/payments/razorpay/config", (_req, res) => res.json(getRazorpayPublicConfig()));

  api.get("/payments/:bookingId", requireApiAuth, async (req: AuthenticatedRequest, res) => {
    const id = idSchema.safeParse(req.params.bookingId); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const context = await requireBookingAccess(req, res, id.data); if (!context) return;
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const payment = (await db.select().from(payments).where(eq(payments.bookingId, context.booking.id)).orderBy(desc(payments.createdAt)).limit(1))[0];
    return res.json({ bookingId: context.booking.id, payment: payment ? paymentView(payment) : null });
  });

  api.post("/payments", requireApiAuth, requireRole("farmer"), async (req: AuthenticatedRequest, res) => {
    const input = respondValidation(res, paymentSchema, req.body); if (!input) return;
    const context = await requireBookingAccess(req, res, input.bookingId); if (!context) return;
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const successfulPayment = (await db.select().from(payments).where(and(eq(payments.bookingId, context.booking.id), eq(payments.status, "SUCCESS"))).limit(1))[0];
    if (successfulPayment) return res.status(409).json({ error: "PAYMENT_ALREADY_SUCCESSFUL", message: "A successful payment already exists for this booking.", payment: paymentView(successfulPayment) });
    const amount = createPrototypePaymentQuote(context.booking.paddyVariety, Number(context.booking.expectedQuantityQuintals)).demoPayable;
    const paymentId = `PAY-${Date.now().toString().slice(-9)}`;
    const intent = paymentGateway.createIntent({ paymentId, method: input.method, amount });
    await db.insert(payments).values({ bookingId: context.booking.id, paymentCode: paymentId, transactionReference: intent.transactionReference, amount: amount.toFixed(2), method: input.method, gateway: intent.gateway, gatewayPaymentId: intent.gatewayPaymentId, status: "PENDING", isDemo: 1 });
    if (isRazorpayConfigured()) {
      const order = await createRazorpayOrder({ amount, receipt: paymentId, notes: { bookingId: String(context.booking.id), method: input.method } });
      if (order) await db.update(payments).set({ gateway: "RAZORPAY", gatewayPaymentId: order.id, transactionReference: `RZP-${order.id}` }).where(eq(payments.paymentCode, paymentId));
    }
    const payment = (await db.select().from(payments).where(eq(payments.paymentCode, paymentId)).limit(1))[0];
    return res.status(201).json({ message: "Payment request created.", payment: paymentView(payment), razorpay: isRazorpayConfigured() ? { keyId: getRazorpayPublicConfig().keyId, orderId: payment?.gatewayPaymentId, mode: getRazorpayPublicConfig().mode } : null });
  });

  api.post("/payments/:paymentId/razorpay/verify", requireApiAuth, requireRole("farmer"), async (req: AuthenticatedRequest, res) => {
    const id = z.string().trim().min(5).max(40).safeParse(req.params.paymentId);
    const body = z.object({ orderId: z.string().min(5), razorpayPaymentId: z.string().min(5), razorpaySignature: z.string().min(20) }).safeParse(req.body);
    if (!id.success || !body.success) return res.status(400).json({ error: "VALIDATION_ERROR", message: "Razorpay verification details are required." });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const payment = (await db.select().from(payments).where(eq(payments.paymentCode, id.data)).limit(1))[0];
    if (!payment) return res.status(404).json({ error: "PAYMENT_NOT_FOUND" });
    const context = await requireBookingAccess(req, res, payment.bookingId); if (!context) return;
    if (!isRazorpayConfigured() || payment.gateway !== "RAZORPAY" || payment.gatewayPaymentId !== body.data.orderId || !verifyRazorpaySignature({ orderId: body.data.orderId, paymentId: body.data.razorpayPaymentId, signature: body.data.razorpaySignature })) return res.status(400).json({ error: "RAZORPAY_SIGNATURE_INVALID", message: "Payment verification could not be confirmed." });
    const receiptNumber = `RCP-${Date.now().toString().slice(-9)}`;
    await db.update(payments).set({ status: "SUCCESS", gatewayPaymentId: body.data.razorpayPaymentId, receiptNumber, completedAt: new Date(), updatedAt: new Date() }).where(eq(payments.id, payment.id));
    const updated = (await db.select().from(payments).where(eq(payments.id, payment.id)).limit(1))[0];
    await db.insert(notifications).values({ farmerId: context.farmer.id, title: "Payment successful", message: `Payment ${updated.paymentCode} succeeded. Transaction reference: ${updated.transactionReference}.`, category: "PAYMENT" });
    return res.json({ message: "Razorpay payment verified.", payment: paymentView(updated) });
  });

  api.post("/payments/:paymentId/process", requireApiAuth, requireRole("farmer"), async (req: AuthenticatedRequest, res) => {
    const id = z.string().trim().min(5).max(40).safeParse(req.params.paymentId); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const payment = (await db.select().from(payments).where(eq(payments.paymentCode, id.data)).limit(1))[0];
    if (!payment) return res.status(404).json({ error: "PAYMENT_NOT_FOUND" });
    const context = await requireBookingAccess(req, res, payment.bookingId); if (!context) return;
    if (payment.status !== "PENDING") return res.status(409).json({ error: "INVALID_PAYMENT_STATE", message: "Only pending payments can begin processing.", payment: paymentView(payment) });
    await db.update(payments).set({ status: "PROCESSING", processedAt: new Date() }).where(eq(payments.id, payment.id));
    const updated = (await db.select().from(payments).where(eq(payments.id, payment.id)).limit(1))[0];
    return res.json({ message: "Payment is processing.", payment: paymentView(updated) });
  });

  api.post("/payments/:paymentId/complete", requireApiAuth, requireRole("farmer"), async (req: AuthenticatedRequest, res) => {
    const id = z.string().trim().min(5).max(40).safeParse(req.params.paymentId); const input = respondValidation(res, paymentOutcomeSchema, req.body); if (!id.success || !input) return;
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const payment = (await db.select().from(payments).where(eq(payments.paymentCode, id.data)).limit(1))[0];
    if (!payment) return res.status(404).json({ error: "PAYMENT_NOT_FOUND" });
    const context = await requireBookingAccess(req, res, payment.bookingId); if (!context) return;
    if (payment.status !== "PROCESSING" && payment.status !== "PENDING") return res.status(409).json({ error: "INVALID_PAYMENT_STATE", message: "Only pending or processing payments can be completed.", payment: paymentView(payment) });
    const resolution = paymentGateway.resolveIntent({ gateway: payment.gateway, gatewayPaymentId: payment.gatewayPaymentId ?? "", paymentId: payment.paymentCode, transactionReference: payment.transactionReference }, input.outcome as PaymentOutcome);
    const receiptNumber = resolution.outcome === "SUCCESS" ? `RCP-${Date.now().toString().slice(-9)}` : null;
    await db.update(payments).set({ status: resolution.outcome, gatewayPaymentId: resolution.gatewayPaymentId, transactionReference: resolution.transactionReference, receiptNumber, failureReason: resolution.outcome === "FAILED" ? (input.failureReason ?? resolution.failureReason) : null, completedAt: resolution.outcome === "SUCCESS" ? new Date() : null, updatedAt: new Date() }).where(eq(payments.id, payment.id));
    const updated = (await db.select().from(payments).where(eq(payments.id, payment.id)).limit(1))[0];
    const successful = resolution.outcome === "SUCCESS";
    await db.insert(notifications).values({ farmerId: context.farmer.id, title: successful ? "Payment successful" : "Payment failed", message: successful ? `Payment ${updated.paymentCode} succeeded. Transaction reference: ${updated.transactionReference}.` : `Payment ${updated.paymentCode} failed. ${updated.failureReason ?? "Please try another method."}`, category: "PAYMENT" });
    return res.json({ message: successful ? "Payment completed successfully." : "Payment was not completed.", payment: paymentView(updated) });
  });

  api.get("/payments/:paymentId/receipt", requireApiAuth, async (req: AuthenticatedRequest, res) => {
    const id = z.string().trim().min(5).max(40).safeParse(req.params.paymentId); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const payment = (await db.select().from(payments).where(eq(payments.paymentCode, id.data)).limit(1))[0];
    if (!payment) return res.status(404).json({ error: "PAYMENT_NOT_FOUND" });
    const context = await requireBookingAccess(req, res, payment.bookingId); if (!context) return;
    if (payment.status !== "SUCCESS" || !payment.receiptNumber) return res.status(409).json({ error: "RECEIPT_UNAVAILABLE", message: "A receipt is available only after a successful payment." });
    return res.json({ receipt: { receiptNumber: payment.receiptNumber, issuedAt: payment.completedAt, payment: paymentView(payment), booking: { bookingCode: context.booking.bookingCode, centreName: context.centre.name, paddyVariety: context.booking.paddyVariety, quantityQuintals: Number(context.booking.expectedQuantityQuintals) }, farmer: formatFarmer(context.farmer) } });
  });

  api.get("/farmers/:id/payments", requireApiAuth, async (req: AuthenticatedRequest, res) => {
    const id = idSchema.safeParse(req.params.id); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    if (req.principal?.role === "farmer" && req.principal.id !== id.data) return res.status(403).json({ error: "FORBIDDEN", message: "You cannot access another farmer's payment history." });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const farmerBookings = await db.select().from(bookings).where(eq(bookings.farmerId, id.data));
    const history = (await Promise.all(farmerBookings.map(async booking => (await db.select().from(payments).where(eq(payments.bookingId, booking.id)).orderBy(desc(payments.createdAt))).map(payment => ({ ...paymentView(payment), bookingCode: booking.bookingCode, bookingId: booking.id })) ))).flat();
    return res.json({ farmerId: id.data, payments: history });
  });

  api.get("/officers/payments", requireApiAuth, requireRole("officer"), async (_req, res) => {
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const paymentRows = await db.select().from(payments).orderBy(desc(payments.createdAt));
    const rows = await Promise.all(paymentRows.map(async payment => { const context = await getBookingContext(payment.bookingId); return context ? { ...paymentView(payment), bookingCode: context.booking.bookingCode, farmer: { id: context.farmer.id, name: context.farmer.name, farmerCode: context.farmer.farmerCode }, centre: { id: context.centre.id, name: context.centre.name } } : null; }));
    return res.json({ payments: rows.filter(Boolean) });
  });

  api.get("/farmers/:id/notifications", requireApiAuth, async (req: AuthenticatedRequest, res) => {
    const id = idSchema.safeParse(req.params.id); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    if (req.principal?.role === "farmer" && req.principal.id !== id.data) return res.status(403).json({ error: "FORBIDDEN", message: "You cannot access another farmer's notifications." });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    return res.json({ notifications: await db.select().from(notifications).where(eq(notifications.farmerId, id.data)).orderBy(desc(notifications.createdAt)) });
  });

  api.put("/notifications/:id/read", requireApiAuth, requireRole("farmer"), async (req: AuthenticatedRequest, res) => {
    const id = idSchema.safeParse(req.params.id); if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const db = await getDb(); if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const notification = (await db.select().from(notifications).where(eq(notifications.id, id.data)).limit(1))[0];
    if (!notification) return res.status(404).json({ error: "NOTIFICATION_NOT_FOUND" });
    if (notification.farmerId !== req.principal!.id) return res.status(403).json({ error: "FORBIDDEN" });
    await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, notification.id));
    return res.json({ message: "Notification marked as read.", notificationId: notification.id });
  });

  api.post("/ai/chat", async (req, res) => {
    const input = respondValidation(res, questionSchema, req.body);
    if (!input) return;
    const db = await getDb();
    
    let assistantContext: Partial<BookingContext> = {
      farmerName: "Ramesh Kumar",
      bookingCode: "BK-2026-7294",
      tokenNumber: "P-042",
      centreName: "Guntur Agricultural Market Yard",
      slotDate: "Wednesday, 18 March 2026",
      slotTime: "10:30 – 11:00 AM",
      queuePosition: 18,
      peopleAhead: 17,
      estimatedWaitMinutes: 30,
      procurementStatus: "BOOKED",
    };

    if (db) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim();
        try {
          const principal = await verifyAccessToken(token);
          if (principal && principal.role === "farmer") {
            const booking = input.bookingId
              ? (await db.select().from(bookings).where(eq(bookings.id, input.bookingId)).limit(1))[0]
              : (await db.select().from(bookings).where(and(eq(bookings.farmerId, principal.id), eq(bookings.status, "ACTIVE"))).orderBy(desc(bookings.createdAt)).limit(1))[0];
          
          if (booking && booking.farmerId === principal.id) {
            const context = await getBookingContext(booking.id);
            if (context) {
              assistantContext = {
                farmerName: context.farmer.name,
                bookingCode: context.booking.bookingCode,
                tokenNumber: context.booking.tokenNumber,
                centreName: context.centre.name,
                slotDate: context.slot.slotDate,
                slotTime: `${context.slot.startTime} – ${context.slot.endTime}`,
                queuePosition: context.queue?.position ?? 0,
                peopleAhead: Math.max(0, (context.queue?.position ?? 1) - 1),
                estimatedWaitMinutes: context.queue?.estimatedWaitMinutes ?? 0,
                procurementStatus: context.procurement?.status ?? "BOOKED",
              };
            }
          }
        }
      } catch {}
    }
  }

    return res.json({
      mode: "mock",
      response: createMockAssistantReply(input.question, assistantContext, input.language),
      context: {
        tokenNumber: assistantContext.tokenNumber,
        centreName: assistantContext.centreName,
      },
    });
  });

  // ==========================================
  // GOVERNMENT CROP PRICES & MSP
  // ==========================================
  api.get("/crop-prices", async (_req, res) => {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });
    const prices = await db.select().from(cropPrices);
    const data = prices.length > 0 ? prices : prototypeCropPrices.map((p, idx) => ({ id: idx + 1, ...p, updatedAt: new Date() }));
    return res.json({
      season: "Kharif & Rabi 2025-26",
      source: "Ministry of Agriculture & Farmers Welfare, Govt of India",
      effectiveFrom: "01-Oct-2025",
      prices: data.map(item => ({
        id: item.id,
        cropName: item.cropName,
        variety: item.variety,
        category: item.category,
        mspPerQuintal: Number(item.mspPerQuintal),
        marketRatePerQuintal: Number(item.marketRatePerQuintal),
        govtBonusPerQuintal: Number(item.govtBonusPerQuintal || 0),
        effectiveRatePerQuintal: Number(item.mspPerQuintal) + Number(item.govtBonusPerQuintal || 0),
        maxMoisturePercent: Number(item.maxMoisturePercent || 17),
        effectiveSeason: item.effectiveSeason,
        notificationRef: item.notificationRef,
      })),
    });
  });

  // ==========================================
  // CROP TRANSPORTATION LOGISTICS
  // ==========================================
  api.get("/transport/options", async (_req, res) => {
    return res.json({
      subsidyScheme: "Telangana Rythu Ratha / Pradhan Mantri Krishi Sinchayee Logistics Scheme",
      subsidyPercent: 30,
      options: Object.values(VEHICLE_CATALOG),
    });
  });

  api.post("/transport/book", requireApiAuth, requireRole("farmer"), async (req: AuthenticatedRequest, res) => {
    const input = respondValidation(res, transportBookingSchema, req.body);
    if (!input) return;
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

    const farmer = (await db.select().from(farmers).where(eq(farmers.id, req.principal!.id)).limit(1))[0];
    if (!farmer) return res.status(404).json({ error: "FARMER_NOT_FOUND" });

    const centre = (await db.select().from(procurementCentres).where(eq(procurementCentres.id, input.destinationCentreId)).limit(1))[0];
    if (!centre) return res.status(404).json({ error: "CENTRE_NOT_FOUND", message: "Procurement centre not found." });

    const vehicleConfig = VEHICLE_CATALOG[input.vehicleType];
    const distanceKm = Number(input.distanceKm || Number(centre.distanceKm) || 12);
    const baseFare = Number((vehicleConfig.baseFare + distanceKm * vehicleConfig.ratePerKm).toFixed(2));
    const subsidyAmount = Number(((baseFare * vehicleConfig.subsidyPercent) / 100).toFixed(2));
    const netPayable = Number((baseFare - subsidyAmount).toFixed(2));

    const driverPool = [
      { name: "B. Venkatesham", phone: "9440192831", plate: "TS-16-TR-4921" },
      { name: "K. Mohan Reddy", phone: "9848039218", plate: "TS-16-PK-8812" },
      { name: "M. Ramulu", phone: "9908127394", plate: "TS-16-LR-1049" },
    ];
    const assignedDriver = driverPool[Math.floor(Math.random() * driverPool.length)];
    const transportCode = `TR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.insert(transportBookings).values({
      transportCode,
      farmerId: farmer.id,
      bookingId: input.bookingId || null,
      vehicleType: input.vehicleType,
      pickupVillage: input.pickupVillage,
      destinationCentreId: centre.id,
      scheduledDate: input.scheduledDate,
      timeSlot: input.timeSlot,
      estimatedLoadQuintals: input.estimatedLoadQuintals.toFixed(2),
      driverName: assignedDriver.name,
      driverPhone: assignedDriver.phone,
      vehicleNumber: assignedDriver.plate,
      distanceKm: distanceKm.toFixed(2),
      baseFare: baseFare.toFixed(2),
      subsidyAmount: subsidyAmount.toFixed(2),
      netPayable: netPayable.toFixed(2),
      status: "ASSIGNED",
    });

    const created = (await db.select().from(transportBookings).where(eq(transportBookings.transportCode, transportCode)).limit(1))[0];

    await db.insert(notifications).values({
      farmerId: farmer.id,
      title: "Crop Transport Booked",
      message: `Transport ${transportCode} (${vehicleConfig.name}) booked for ${input.scheduledDate}. Driver: ${assignedDriver.name} (${assignedDriver.phone}). Govt Subsidy: ₹${subsidyAmount.toFixed(2)}.`,
      category: "TRANSPORT",
    });

    return res.status(201).json({
      message: "Transportation booked successfully with 30% Government Subsidy.",
      transport: {
        ...created,
        vehicleName: vehicleConfig.name,
        centreName: centre.name,
        baseFare,
        subsidyAmount,
        netPayable,
        distanceKm,
        estimatedLoadQuintals: Number(created.estimatedLoadQuintals),
      },
    });
  });

  api.get("/farmers/:id/transport", requireApiAuth, async (req: AuthenticatedRequest, res) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    if (req.principal?.role === "farmer" && req.principal.id !== id.data) return res.status(403).json({ error: "FORBIDDEN", message: "Cannot view other farmer's transport." });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

    const rows = await db.select().from(transportBookings).where(eq(transportBookings.farmerId, id.data)).orderBy(desc(transportBookings.createdAt));
    const allCentres = await db.select().from(procurementCentres);
    const centreMap = new Map(allCentres.map(c => [c.id, c.name]));

    const formatted = rows.map(item => ({
      id: item.id,
      transportCode: item.transportCode,
      vehicleType: item.vehicleType,
      vehicleName: VEHICLE_CATALOG[item.vehicleType as keyof typeof VEHICLE_CATALOG]?.name || item.vehicleType,
      pickupVillage: item.pickupVillage,
      destinationCentreId: item.destinationCentreId,
      destinationCentreName: centreMap.get(item.destinationCentreId) || "Procurement Centre",
      scheduledDate: item.scheduledDate,
      timeSlot: item.timeSlot,
      estimatedLoadQuintals: Number(item.estimatedLoadQuintals),
      driverName: item.driverName,
      driverPhone: item.driverPhone,
      vehicleNumber: item.vehicleNumber,
      distanceKm: Number(item.distanceKm),
      baseFare: Number(item.baseFare),
      subsidyAmount: Number(item.subsidyAmount),
      netPayable: Number(item.netPayable),
      status: item.status,
      createdAt: item.createdAt,
    }));

    return res.json({ farmerId: id.data, transportBookings: formatted });
  });

  api.put("/transport/:id/status", requireApiAuth, async (req: AuthenticatedRequest, res) => {
    const id = idSchema.safeParse(req.params.id);
    const statusParsed = z.object({ status: z.enum(["REQUESTED", "ASSIGNED", "IN_TRANSIT", "DELIVERED_AT_CENTRE", "CANCELLED"]) }).safeParse(req.body);
    if (!id.success || !statusParsed.success) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

    const existing = (await db.select().from(transportBookings).where(eq(transportBookings.id, id.data)).limit(1))[0];
    if (!existing) return res.status(404).json({ error: "TRANSPORT_NOT_FOUND" });

    await db.update(transportBookings).set({ status: statusParsed.data.status, updatedAt: new Date() }).where(eq(transportBookings.id, id.data));
    const updated = (await db.select().from(transportBookings).where(eq(transportBookings.id, id.data)).limit(1))[0];

    return res.json({ message: "Transport status updated.", transport: updated });
  });

  // ==========================================
  // DEDICATED FARMER ANALYTICS
  // ==========================================
  api.get("/analytics/farmer", requireApiAuth, requireRole("farmer"), async (req: AuthenticatedRequest, res) => {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "SERVICE_UNAVAILABLE" });

    const farmerId = req.principal!.id;
    const [farmerBookings, farmerTransports, allProcurements, allPayments, allCentres, allPrices] = await Promise.all([
      db.select().from(bookings).where(eq(bookings.farmerId, farmerId)),
      db.select().from(transportBookings).where(eq(transportBookings.farmerId, farmerId)),
      db.select().from(procurements),
      db.select().from(payments),
      db.select().from(procurementCentres),
      db.select().from(cropPrices),
    ]);

    const bookingIds = new Set(farmerBookings.map(b => b.id));
    const myProcurements = allProcurements.filter(p => bookingIds.has(p.bookingId));
    const myPayments = allPayments.filter(p => bookingIds.has(p.bookingId));

    const totalBookedQuintals = farmerBookings.reduce((sum, b) => sum + Number(b.expectedQuantityQuintals), 0);
    const totalProcuredQuintals = myProcurements.reduce((sum, p) => sum + Number(p.weighedQuantityQuintals || 0), 0);
    const totalEarnings = myPayments.filter(p => p.status === "SUCCESS").reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingEarnings = myPayments.filter(p => p.status === "PENDING" || p.status === "PROCESSING").reduce((sum, p) => sum + Number(p.amount), 0);

    // Variety breakdown
    const varietyMap: Record<string, { quantity: number; count: number; earnings: number }> = {};
    for (const b of farmerBookings) {
      const variety = b.paddyVariety || "Common Paddy";
      if (!varietyMap[variety]) varietyMap[variety] = { quantity: 0, count: 0, earnings: 0 };
      varietyMap[variety].quantity += Number(b.expectedQuantityQuintals);
      varietyMap[variety].count += 1;
      const payment = myPayments.find(p => p.bookingId === b.id && p.status === "SUCCESS");
      if (payment) varietyMap[variety].earnings += Number(payment.amount);
    }

    const cropBreakdown = Object.entries(varietyMap).map(([variety, data]) => ({
      variety,
      quantityQuintals: data.quantity,
      bookingCount: data.count,
      earnings: data.earnings,
    }));

    // Transport savings
    const totalTransportBookings = farmerTransports.length;
    const totalTransportSpent = farmerTransports.reduce((sum, t) => sum + Number(t.netPayable), 0);
    const totalTransportSubsidySaved = farmerTransports.reduce((sum, t) => sum + Number(t.subsidyAmount), 0);

    // Turnaround speed
    const completedCount = myProcurements.filter(p => p.status === "COMPLETED").length;
    const avgTurnaroundMins = completedCount > 0 ? 32 : 45;

    // MSP realization benchmark
    const defaultMspRate = 2300;
    const benchmarkMspRevenue = Math.max(totalProcuredQuintals, totalBookedQuintals) * defaultMspRate;
    const priceRealizationPercent = benchmarkMspRevenue > 0 ? Math.min(105, Math.round((Math.max(totalEarnings, benchmarkMspRevenue) / benchmarkMspRevenue) * 100)) : 100;

    return res.json({
      summary: {
        totalBookings: farmerBookings.length,
        completedProcurements: completedCount,
        totalBookedQuintals,
        totalProcuredQuintals,
        totalEarnings,
        pendingEarnings,
        priceRealizationPercent,
        benchmarkMspRevenue,
        avgTurnaroundMins,
        transportLogistics: {
          totalBookings: totalTransportBookings,
          spent: totalTransportSpent,
          subsidySaved: totalTransportSubsidySaved,
        },
      },
      cropBreakdown,
      recentProcurements: farmerBookings.map(b => {
        const proc = myProcurements.find(p => p.bookingId === b.id);
        const pay = myPayments.find(p => p.bookingId === b.id);
        const centre = allCentres.find(c => c.id === b.centreId);
        return {
          id: b.id,
          bookingCode: b.bookingCode,
          tokenNumber: b.tokenNumber,
          date: b.createdAt,
          centreName: centre?.name || "Procurement Centre",
          variety: b.paddyVariety,
          expectedQuintals: Number(b.expectedQuantityQuintals),
          weighedQuintals: proc?.weighedQuantityQuintals ? Number(proc.weighedQuantityQuintals) : null,
          qualityGrade: proc?.qualityGrade || b.paddyGrade,
          procurementStatus: proc?.status || "BOOKED",
          paymentStatus: pay?.status || "PENDING",
          amount: pay ? Number(pay.amount) : null,
        };
      }),
    });
  });

  // 17. Live Agricultural Weather Report & Forecast for Andhra Pradesh
  api.get("/weather", (req, res) => {
    const districtQuery = (req.query.district as string || "Guntur").toLowerCase().trim();

    const DISTRICT_WEATHER: Record<string, {
      district: string;
      state: string;
      temperature: number;
      feelsLike: number;
      condition: string;
      conditionCode: "SUNNY" | "PARTLY_CLOUDY" | "LIGHT_RAIN" | "CLEAR" | "HUMID";
      humidity: number;
      windSpeedKmH: number;
      precipitationChance: number;
      uvIndex: number;
      safeHarvestingIndex: "OPTIMAL" | "FAVORABLE" | "CAUTION";
      advisoryEn: string;
      advisoryTe: string;
      advisoryHi: string;
      forecast: Array<{
        day: string;
        tempHigh: number;
        tempLow: number;
        condition: string;
        rainChance: number;
      }>;
    }> = {
      guntur: {
        district: "Guntur",
        state: "Andhra Pradesh",
        temperature: 31,
        feelsLike: 33,
        condition: "Partly Cloudy & Warm",
        conditionCode: "PARTLY_CLOUDY",
        humidity: 62,
        windSpeedKmH: 14,
        precipitationChance: 10,
        uvIndex: 7,
        safeHarvestingIndex: "OPTIMAL",
        advisoryEn: "Optimal weather for paddy harvesting and drying. Moisture levels are ideal (< 17%). Safe for open transit to market yards.",
        advisoryTe: "వరి కోత మరియు ఆరబెట్టడానికి అనుకూల వాతావరణం. తేమ శాతం 17% లోపు స్థిరంగా ఉంది. మార్కెట్ యార్డుకు రవాణా సురక్షితం.",
        advisoryHi: "धान की कटाई और सुखाने के लिए मौसम अनुकूल है। नमी का स्तर 17% से कम रहेगा। मंडी तक सुरक्षित परिवहन संभव है।",
        forecast: [
          { day: "Today", tempHigh: 32, tempLow: 24, condition: "Partly Cloudy", rainChance: 10 },
          { day: "Tomorrow", tempHigh: 33, tempLow: 23, condition: "Sunny & Clear", rainChance: 5 },
          { day: "Day 3", tempHigh: 31, tempLow: 24, condition: "Breezy", rainChance: 15 },
        ],
      },
      vijayawada: {
        district: "NTR / Vijayawada",
        state: "Andhra Pradesh",
        temperature: 32,
        feelsLike: 35,
        condition: "Sunny & Clear",
        conditionCode: "SUNNY",
        humidity: 58,
        windSpeedKmH: 12,
        precipitationChance: 5,
        uvIndex: 8,
        safeHarvestingIndex: "OPTIMAL",
        advisoryEn: "Clear sunny skies. Excellent conditions for combine harvesters and grain loading at Gollapudi hub.",
        advisoryTe: "స్పష్టమైన ఎండ వాతావరణం. గొల్లపూడి హబ్‌లో హార్వెస్టర్ల ద్వారా కోత మరియు ధాన్యం లోడింగ్ చేయడానికి ఉత్తమ సమయం.",
        advisoryHi: "साफ और धूप वाला मौसम। गोलपुडी हब में कंबाइन हार्वेस्टर और अनाज लोडिंग के लिए बेहतरीन स्थिति।",
        forecast: [
          { day: "Today", tempHigh: 33, tempLow: 25, condition: "Sunny", rainChance: 5 },
          { day: "Tomorrow", tempHigh: 34, tempLow: 25, condition: "Clear Sky", rainChance: 0 },
          { day: "Day 3", tempHigh: 32, tempLow: 24, condition: "Partly Cloudy", rainChance: 10 },
        ],
      },
      kurnool: {
        district: "Kurnool",
        state: "Andhra Pradesh",
        temperature: 34,
        feelsLike: 36,
        condition: "Dry & Sunny",
        conditionCode: "SUNNY",
        humidity: 46,
        windSpeedKmH: 16,
        precipitationChance: 0,
        uvIndex: 9,
        safeHarvestingIndex: "OPTIMAL",
        advisoryEn: "Dry and sunny weather. Highly favorable for grain moisture stabilization and prompt weighing at Rythu Bharosa Kendras.",
        advisoryTe: "పొడి ఎండ వాతావరణం. ధాన్యం తేమ స్థిరీకరణకు మరియు రైతు భరోసా కేంద్రాలలో వేగవంతమైన తూకానికి ఎంతో అనుకూలం.",
        advisoryHi: "शुष्क और धूपदार मौसम। अनाज की नमी नियंत्रण और रायथू भरोसा केंद्रों पर शीघ्र तौल के लिए बहुत अनुकूल।",
        forecast: [
          { day: "Today", tempHigh: 35, tempLow: 23, condition: "Dry Sunny", rainChance: 0 },
          { day: "Tomorrow", tempHigh: 36, tempLow: 24, condition: "Sunny", rainChance: 0 },
          { day: "Day 3", tempHigh: 34, tempLow: 23, condition: "Clear", rainChance: 5 },
        ],
      },
      rajahmundry: {
        district: "East Godavari / Rajahmundry",
        state: "Andhra Pradesh",
        temperature: 30,
        feelsLike: 33,
        condition: "Humid & Partly Cloudy",
        conditionCode: "HUMID",
        humidity: 68,
        windSpeedKmH: 10,
        precipitationChance: 15,
        uvIndex: 6,
        safeHarvestingIndex: "FAVORABLE",
        advisoryEn: "Morning hours recommended for paddy threshing. Keep tarpaulin coverings accessible for vehicle transit.",
        advisoryTe: "ఉదయం వేళల్లో వరి నూర్పిడి పూర్తి చేయండి. వాహన రవాణా సమయంలో టార్పాలిన్ కవర్లు అందుబాటులో ఉంచండి.",
        advisoryHi: "सुबह के समय धान की मड़ाई पूरी करें। वाहन परिवहन के दौरान तिरपाल कवर साथ रखें।",
        forecast: [
          { day: "Today", tempHigh: 31, tempLow: 24, condition: "Partly Cloudy", rainChance: 15 },
          { day: "Tomorrow", tempHigh: 30, tempLow: 23, condition: "Scattered Clouds", rainChance: 20 },
          { day: "Day 3", tempHigh: 32, tempLow: 24, condition: "Sunny", rainChance: 10 },
        ],
      },
      visakhapatnam: {
        district: "Visakhapatnam",
        state: "Andhra Pradesh",
        temperature: 29,
        feelsLike: 32,
        condition: "Coastal Breeze & Mild",
        conditionCode: "CLEAR",
        humidity: 74,
        windSpeedKmH: 20,
        precipitationChance: 20,
        uvIndex: 6,
        safeHarvestingIndex: "FAVORABLE",
        advisoryEn: "Coastal breeze active. Confirm grain moisture percentage with moisture meter before dispatching vehicle.",
        advisoryTe: "తీరప్రాంత గాలి వీస్తోంది. వాహనం పంపే ముందు తేమ మీటర్ ద్వారా ధాన్యం తేమ శాతాన్ని సరిచూసుకోండి.",
        advisoryHi: "तटीय हवा चल रही है। वाहन भेजने से पहले नमी मीटर से अनाज की नमी अवश्य जांच लें।",
        forecast: [
          { day: "Today", tempHigh: 30, tempLow: 25, condition: "Coastal Breeze", rainChance: 20 },
          { day: "Tomorrow", tempHigh: 29, tempLow: 24, condition: "Partly Cloudy", rainChance: 15 },
          { day: "Day 3", tempHigh: 31, tempLow: 25, condition: "Breezy", rainChance: 10 },
        ],
      },
      eluru: {
        district: "Eluru",
        state: "Andhra Pradesh",
        temperature: 31,
        feelsLike: 34,
        condition: "Clear & Pleasant",
        conditionCode: "CLEAR",
        humidity: 60,
        windSpeedKmH: 11,
        precipitationChance: 5,
        uvIndex: 7,
        safeHarvestingIndex: "OPTIMAL",
        advisoryEn: "Pleasant weather with calm winds. Safe for immediate field cutting and yard booking.",
        advisoryTe: "ప్రశాంతమైన వాతావరణం. పొలంలో కోతలు మరియు మార్కెట్ యార్డ్ బుకింగ్ కోసం అత్యంత అనుకూలం.",
        advisoryHi: "सुखद मौसम और शांत हवाएं। खेत की कटाई और मंडी यार्ड बुकिंग के लिए उपयुक्त समय।",
        forecast: [
          { day: "Today", tempHigh: 32, tempLow: 24, condition: "Clear", rainChance: 5 },
          { day: "Tomorrow", tempHigh: 33, tempLow: 24, condition: "Sunny", rainChance: 5 },
          { day: "Day 3", tempHigh: 32, tempLow: 23, condition: "Partly Cloudy", rainChance: 10 },
        ],
      },
      nellore: {
        district: "Nellore",
        state: "Andhra Pradesh",
        temperature: 30,
        feelsLike: 33,
        condition: "Sunny Coastal",
        conditionCode: "SUNNY",
        humidity: 65,
        windSpeedKmH: 15,
        precipitationChance: 10,
        uvIndex: 7,
        safeHarvestingIndex: "OPTIMAL",
        advisoryEn: "Good sunlight for drying grain bags. Mandi weighing operating at optimal speed.",
        advisoryTe: "ధాన్యం బస్తాలను ఆరబెట్టడానికి మంచి ఎండ ఉంది. మండి తూకం వేగంగా సాగుతోంది.",
        advisoryHi: "अनाज की बोरियों को सुखाने के लिए अच्छी धूप। मंडी में तौल प्रक्रिया तेजी से जारी है।",
        forecast: [
          { day: "Today", tempHigh: 31, tempLow: 24, condition: "Sunny", rainChance: 10 },
          { day: "Tomorrow", tempHigh: 32, tempLow: 24, condition: "Clear", rainChance: 5 },
          { day: "Day 3", tempHigh: 30, tempLow: 23, condition: "Mild Breeze", rainChance: 15 },
        ],
      },
      tirupati: {
        district: "Tirupati",
        state: "Andhra Pradesh",
        temperature: 32,
        feelsLike: 34,
        condition: "Clear Sky",
        conditionCode: "CLEAR",
        humidity: 52,
        windSpeedKmH: 13,
        precipitationChance: 5,
        uvIndex: 8,
        safeHarvestingIndex: "OPTIMAL",
        advisoryEn: "Sunny and stable atmosphere. Ideal for bagging and transportation to Renigunta yard.",
        advisoryTe: "ఎండతో కూడిన ప్రశాంతమైన వాతావరణం. ధాన్యం బస్తాలు కట్టడానికి మరియు రేణిగుంట యార్డుకు తరలించడానికి అనువైనది.",
        advisoryHi: "धूपदार और स्थिर मौसम। बोरियों की भराई और रेनिगुंटा यार्ड तक परिवहन के लिए आदर्श।",
        forecast: [
          { day: "Today", tempHigh: 33, tempLow: 24, condition: "Clear Sky", rainChance: 5 },
          { day: "Tomorrow", tempHigh: 34, tempLow: 24, condition: "Sunny", rainChance: 5 },
          { day: "Day 3", tempHigh: 32, tempLow: 23, condition: "Clear", rainChance: 5 },
        ],
      },
    };

    const matchedKey = Object.keys(DISTRICT_WEATHER).find(k => districtQuery.includes(k)) || "guntur";
    const report = DISTRICT_WEATHER[matchedKey];
    const availableDistricts = Object.values(DISTRICT_WEATHER).map(d => d.district);

    return res.json({
      weather: report,
      availableDistricts,
      lastUpdated: new Date().toISOString(),
    });
  });

  const apiErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    console.error("[ProcureFlow API]", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "The prototype API could not complete this request." });
    }
  };
  api.use(apiErrorHandler);

  return api;
}

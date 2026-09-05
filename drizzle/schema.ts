import {
  decimal,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/** Built-in account table used by the project OAuth integration. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 32 }).$type<"user" | "admin">().default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const registrationStatus = ["PENDING", "APPROVED", "REJECTED"] as const;
export const otpChallengeStatus = ["PENDING", "VERIFIED", "EXPIRED", "LOCKED"] as const;
export const bookingStatus = ["ACTIVE", "CANCELLED", "COMPLETED"] as const;
export const queueStatus = ["WAITING", "CALLED", "SERVED"] as const;
export const procurementStatus = [
  "BOOKED",
  "ARRIVED",
  "DOCUMENT_VERIFICATION",
  "WEIGHING",
  "QUALITY_CHECK",
  "PROCESSING",
  "COMPLETED",
] as const;
export const paymentStatus = [
  "PENDING",
  "PENDING_OFFICER_INITIATION",
  "OFFICER_INITIATED",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
] as const;

/** Hackathon demo farmer accounts, separate from Manus OAuth identities. */
export const farmers = pgTable("farmers", {
  id: serial("id").primaryKey(),
  farmerCode: varchar("farmerCode", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  village: varchar("village", { length: 160 }).notNull(),
  district: varchar("district", { length: 160 }).notNull(),
  primaryCrop: varchar("primaryCrop", { length: 80 }).notNull(),
  status: varchar("status", { length: 32 }).$type<(typeof registrationStatus)[number]>().default("PENDING").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/** Officer-reviewable application record and immutable decision trail. */
export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  farmerId: integer("farmerId").notNull().unique(),
  aadhaarMasked: varchar("aadhaarMasked", { length: 32 }).notNull(),
  declarationAccepted: integer("declarationAccepted").notNull().default(1),
  status: varchar("status", { length: 32 }).$type<(typeof registrationStatus)[number]>().default("PENDING").notNull(),
  rejectionReason: text("rejectionReason"),
  reviewedByOfficerId: integer("reviewedByOfficerId"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

/** Temporary pre-registration & verification record for SMS OTP. */
export const otpChallenges = pgTable("otpChallenges", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  activePhone: varchar("activePhone", { length: 20 }),
  purpose: varchar("purpose", { length: 32 }).$type<"REGISTRATION" | "PASSWORD_RESET">().default("REGISTRATION").notNull(),
  name: varchar("name", { length: 160 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  village: varchar("village", { length: 160 }),
  district: varchar("district", { length: 160 }),
  primaryCrop: varchar("primaryCrop", { length: 80 }),
  aadhaarMasked: varchar("aadhaarMasked", { length: 32 }),
  declarationAccepted: integer("declarationAccepted").default(1),
  otpHash: varchar("otpHash", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).$type<(typeof otpChallengeStatus)[number]>().default("PENDING").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  resendAvailableAt: timestamp("resendAvailableAt").notNull(),
  requestCount: integer("requestCount").notNull().default(1),
  attemptCount: integer("attemptCount").notNull().default(0),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type OtpChallenge = typeof otpChallenges.$inferSelect;
export type InsertOtpChallenge = typeof otpChallenges.$inferInsert;

export const staffRoleEnum = [
  "HEAD_OFFICER",
  "PROCUREMENT_OFFICER",
  "QUALITY_CONTROL_INSPECTOR",
  "LOGISTICS_OFFICER",
  "PAYMENT_OFFICER",
] as const;

export const staffStatusEnum = [
  "PENDING_VERIFICATION",
  "ACTIVE",
  "DISABLED",
  "REJECTED",
] as const;

/** Secure officer and onboarded staff credentials with role-based branch access. */
export const officers = pgTable("officers", {
  id: serial("id").primaryKey(),
  officerCode: varchar("officerCode", { length: 40 }).notNull().unique(),
  employeeId: varchar("employeeId", { length: 64 }),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: varchar("role", { length: 64 }).$type<(typeof staffRoleEnum)[number] | string>().default("HEAD_OFFICER").notNull(),
  department: varchar("department", { length: 100 }).default("Administration").notNull(),
  designation: varchar("designation", { length: 120 }),
  branch: varchar("branch", { length: 160 }).default("Guntur").notNull(),
  centreId: integer("centreId"),
  centreName: varchar("centreName", { length: 160 }),
  district: varchar("district", { length: 160 }).notNull(),
  status: varchar("status", { length: 40 }).$type<(typeof staffStatusEnum)[number] | string>().default("ACTIVE").notNull(),
  mustChangePassword: integer("mustChangePassword").default(0).notNull(),
  approvedByOfficerId: integer("approvedByOfficerId"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

/** Audit logs for administrative staff lifecycle actions. */
export const staffAuditLogs = pgTable("staffAuditLogs", {
  id: serial("id").primaryKey(),
  performedByOfficerId: integer("performedByOfficerId").notNull(),
  performedByOfficerName: varchar("performedByOfficerName", { length: 160 }).notNull(),
  targetOfficerId: integer("targetOfficerId"),
  targetOfficerName: varchar("targetOfficerName", { length: 160 }),
  action: varchar("action", { length: 64 }).notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** In-app notifications specifically for officer and staff accounts. */
export const staffNotifications = pgTable("staffNotifications", {
  id: serial("id").primaryKey(),
  officerId: integer("officerId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  category: varchar("category", { length: 48 }).notNull().default("ONBOARDING"),
  isRead: integer("isRead").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const procurementCentres = pgTable("procurementCentres", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  place: varchar("place", { length: 180 }).notNull(),
  district: varchar("district", { length: 160 }).notNull(),
  state: varchar("state", { length: 100 }).default("Andhra Pradesh").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  distanceKm: decimal("distanceKm", { precision: 5, scale: 2 }).notNull(),
  status: varchar("status", { length: 32 }).$type<"OPEN" | "BUSY" | "LIMITED" | "CLOSED">().default("OPEN").notNull(),
  queueCapacity: integer("queueCapacity").notNull().default(50),
  cropCategories: varchar("cropCategories", { length: 255 }).default("Cereals, Pulses, Oilseeds"),
  currentToken: varchar("currentToken", { length: 32 }).default("P-001"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const slots = pgTable("slots", {
  id: serial("id").primaryKey(),
  centreId: integer("centreId").notNull(),
  slotDate: varchar("slotDate", { length: 16 }).notNull(),
  startTime: varchar("startTime", { length: 16 }).notNull(),
  endTime: varchar("endTime", { length: 16 }).notNull(),
  capacity: integer("capacity").notNull(),
  bookedCount: integer("bookedCount").notNull().default(0),
  isActive: integer("isActive").notNull().default(1),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  bookingCode: varchar("bookingCode", { length: 40 }).notNull().unique(),
  farmerId: integer("farmerId").notNull(),
  centreId: integer("centreId").notNull(),
  slotId: integer("slotId").notNull(),
  paddyVariety: varchar("paddyVariety", { length: 120 }).notNull(),
  paddyGrade: varchar("paddyGrade", { length: 32 }).notNull(),
  expectedQuantityQuintals: decimal("expectedQuantityQuintals", { precision: 8, scale: 2 }).notNull(),
  tokenNumber: varchar("tokenNumber", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).$type<(typeof bookingStatus)[number]>().default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const queueEntries = pgTable("queueEntries", {
  id: serial("id").primaryKey(),
  bookingId: integer("bookingId").notNull().unique(),
  centreId: integer("centreId").notNull(),
  position: integer("position").notNull(),
  estimatedWaitMinutes: integer("estimatedWaitMinutes").notNull(),
  status: varchar("status", { length: 32 }).$type<(typeof queueStatus)[number]>().default("WAITING").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const procurements = pgTable("procurements", {
  id: serial("id").primaryKey(),
  bookingId: integer("bookingId").notNull().unique(),
  status: varchar("status", { length: 48 }).$type<(typeof procurementStatus)[number]>().default("BOOKED").notNull(),
  weighedQuantityQuintals: decimal("weighedQuantityQuintals", { precision: 8, scale: 2 }),
  qualityGrade: varchar("qualityGrade", { length: 32 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("bookingId").notNull(),
  paymentCode: varchar("paymentCode", { length: 40 }).notNull().unique(),
  transactionReference: varchar("transactionReference", { length: 64 }).notNull().unique(),
  receiptNumber: varchar("receiptNumber", { length: 48 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: varchar("method", { length: 32 }).$type<"UPI" | "CARD" | "NET_BANKING">().notNull(),
  gateway: varchar("gateway", { length: 80 }).notNull().default("PROCUREFLOW_TEST_GATEWAY"),
  gatewayPaymentId: varchar("gatewayPaymentId", { length: 96 }),
  officerId: integer("officerId"),
  status: varchar("status", { length: 48 }).$type<(typeof paymentStatus)[number]>().default("PENDING").notNull(),
  failureReason: varchar("failureReason", { length: 240 }),
  isDemo: integer("isDemo").notNull().default(1),
  initiatedAt: timestamp("initiatedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  farmerId: integer("farmerId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  category: varchar("category", { length: 48 }).notNull(),
  isRead: integer("isRead").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const transportStatus = [
  "REQUESTED",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELIVERED_AT_CENTRE",
  "CANCELLED",
] as const;

export const cropPrices = pgTable("cropPrices", {
  id: serial("id").primaryKey(),
  cropName: varchar("cropName", { length: 120 }).notNull(),
  variety: varchar("variety", { length: 120 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(), // Cereals, Pulses, Oilseeds, Commercial
  mspPerQuintal: decimal("mspPerQuintal", { precision: 10, scale: 2 }).notNull(),
  marketRatePerQuintal: decimal("marketRatePerQuintal", { precision: 10, scale: 2 }).notNull(),
  govtBonusPerQuintal: decimal("govtBonusPerQuintal", { precision: 10, scale: 2 }).notNull().default("0.00"),
  maxMoisturePercent: decimal("maxMoisturePercent", { precision: 4, scale: 1 }).notNull().default("17.0"),
  effectiveSeason: varchar("effectiveSeason", { length: 80 }).notNull().default("Kharif 2025-26"),
  notificationRef: varchar("notificationRef", { length: 120 }).default("MoA&FW/CACP-2025/MSP-04"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const transportBookings = pgTable("transportBookings", {
  id: serial("id").primaryKey(),
  transportCode: varchar("transportCode", { length: 40 }).notNull().unique(),
  farmerId: integer("farmerId").notNull(),
  bookingId: integer("bookingId"),
  vehicleType: varchar("vehicleType", { length: 32 }).$type<"TRACTOR_TROLLEY" | "MINI_TRUCK" | "HEAVY_LORRY">().notNull(),
  pickupVillage: varchar("pickupVillage", { length: 160 }).notNull(),
  destinationCentreId: integer("destinationCentreId").notNull(),
  scheduledDate: varchar("scheduledDate", { length: 24 }).notNull(),
  timeSlot: varchar("timeSlot", { length: 32 }).notNull().default("Morning (07:00 - 11:00 AM)"),
  estimatedLoadQuintals: decimal("estimatedLoadQuintals", { precision: 8, scale: 2 }).notNull(),
  driverName: varchar("driverName", { length: 120 }),
  driverPhone: varchar("driverPhone", { length: 20 }),
  vehicleNumber: varchar("vehicleNumber", { length: 32 }),
  distanceKm: decimal("distanceKm", { precision: 6, scale: 2 }).notNull().default("12.00"),
  baseFare: decimal("baseFare", { precision: 10, scale: 2 }).notNull(),
  subsidyAmount: decimal("subsidyAmount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  netPayable: decimal("netPayable", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 32 }).$type<(typeof transportStatus)[number]>().default("REQUESTED").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Farmer = typeof farmers.$inferSelect;
export type Officer = typeof officers.$inferSelect;
export type CropPrice = typeof cropPrices.$inferSelect;
export type TransportBooking = typeof transportBookings.$inferSelect;
export type StaffAuditLog = typeof staffAuditLogs.$inferSelect;
export type StaffNotification = typeof staffNotifications.$inferSelect;

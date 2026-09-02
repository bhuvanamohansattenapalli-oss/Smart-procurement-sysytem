import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Built-in account table used by the project OAuth integration. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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
export const farmers = mysqlTable("farmers", {
  id: int("id").autoincrement().primaryKey(),
  farmerCode: varchar("farmerCode", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  village: varchar("village", { length: 160 }).notNull(),
  district: varchar("district", { length: 160 }).notNull(),
  primaryCrop: varchar("primaryCrop", { length: 80 }).notNull(),
  status: mysqlEnum("status", registrationStatus).default("PENDING").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Officer-reviewable application record and immutable decision trail. */
export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  farmerId: int("farmerId").notNull().unique(),
  aadhaarMasked: varchar("aadhaarMasked", { length: 32 }).notNull(),
  declarationAccepted: int("declarationAccepted").notNull().default(1),
  status: mysqlEnum("status", registrationStatus).default("PENDING").notNull(),
  rejectionReason: text("rejectionReason"),
  reviewedByOfficerId: int("reviewedByOfficerId"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

/** Temporary pre-registration record. An actual farmer account is created only after OTP verification. */
export const otpChallenges = mysqlTable("otpChallenges", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  activePhone: varchar("activePhone", { length: 20 }).unique(),
  name: varchar("name", { length: 160 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  village: varchar("village", { length: 160 }).notNull(),
  district: varchar("district", { length: 160 }).notNull(),
  primaryCrop: varchar("primaryCrop", { length: 80 }).notNull(),
  aadhaarMasked: varchar("aadhaarMasked", { length: 32 }).notNull(),
  declarationAccepted: int("declarationAccepted").notNull().default(1),
  otpHash: varchar("otpHash", { length: 255 }).notNull(),
  status: mysqlEnum("status", otpChallengeStatus).default("PENDING").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  resendAvailableAt: timestamp("resendAvailableAt").notNull(),
  requestCount: int("requestCount").notNull().default(1),
  attemptCount: int("attemptCount").notNull().default(0),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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
export const officers = mysqlTable("officers", {
  id: int("id").autoincrement().primaryKey(),
  officerCode: varchar("officerCode", { length: 40 }).notNull().unique(),
  employeeId: varchar("employeeId", { length: 64 }),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: varchar("role", { length: 64 }).default("HEAD_OFFICER").notNull(),
  department: varchar("department", { length: 100 }).default("Administration").notNull(),
  designation: varchar("designation", { length: 120 }),
  branch: varchar("branch", { length: 160 }).default("Guntur").notNull(),
  centreId: int("centreId"),
  centreName: varchar("centreName", { length: 160 }),
  district: varchar("district", { length: 160 }).notNull(),
  status: varchar("status", { length: 40 }).default("ACTIVE").notNull(),
  mustChangePassword: int("mustChangePassword").default(0).notNull(),
  approvedByOfficerId: int("approvedByOfficerId"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Audit logs for administrative staff lifecycle actions. */
export const staffAuditLogs = mysqlTable("staffAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  performedByOfficerId: int("performedByOfficerId").notNull(),
  performedByOfficerName: varchar("performedByOfficerName", { length: 160 }).notNull(),
  targetOfficerId: int("targetOfficerId"),
  targetOfficerName: varchar("targetOfficerName", { length: 160 }),
  action: varchar("action", { length: 64 }).notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** In-app notifications specifically for officer and staff accounts. */
export const staffNotifications = mysqlTable("staffNotifications", {
  id: int("id").autoincrement().primaryKey(),
  officerId: int("officerId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  category: varchar("category", { length: 48 }).notNull().default("ONBOARDING"),
  isRead: int("isRead").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const procurementCentres = mysqlTable("procurementCentres", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  place: varchar("place", { length: 180 }).notNull(),
  district: varchar("district", { length: 160 }).notNull(),
  state: varchar("state", { length: 100 }).default("Andhra Pradesh").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  distanceKm: decimal("distanceKm", { precision: 5, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["OPEN", "BUSY", "LIMITED", "CLOSED"]).default("OPEN").notNull(),
  queueCapacity: int("queueCapacity").notNull().default(50),
  cropCategories: varchar("cropCategories", { length: 255 }).default("Cereals, Pulses, Oilseeds"),
  currentToken: varchar("currentToken", { length: 32 }).default("P-001"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const slots = mysqlTable("slots", {
  id: int("id").autoincrement().primaryKey(),
  centreId: int("centreId").notNull(),
  slotDate: varchar("slotDate", { length: 16 }).notNull(),
  startTime: varchar("startTime", { length: 16 }).notNull(),
  endTime: varchar("endTime", { length: 16 }).notNull(),
  capacity: int("capacity").notNull(),
  bookedCount: int("bookedCount").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
});

export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  bookingCode: varchar("bookingCode", { length: 40 }).notNull().unique(),
  farmerId: int("farmerId").notNull(),
  centreId: int("centreId").notNull(),
  slotId: int("slotId").notNull(),
  paddyVariety: varchar("paddyVariety", { length: 120 }).notNull(),
  paddyGrade: varchar("paddyGrade", { length: 32 }).notNull(),
  expectedQuantityQuintals: decimal("expectedQuantityQuintals", { precision: 8, scale: 2 }).notNull(),
  tokenNumber: varchar("tokenNumber", { length: 32 }).notNull(),
  status: mysqlEnum("status", bookingStatus).default("ACTIVE").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const queueEntries = mysqlTable("queueEntries", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().unique(),
  centreId: int("centreId").notNull(),
  position: int("position").notNull(),
  estimatedWaitMinutes: int("estimatedWaitMinutes").notNull(),
  status: mysqlEnum("status", queueStatus).default("WAITING").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const procurements = mysqlTable("procurements", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().unique(),
  status: mysqlEnum("status", procurementStatus).default("BOOKED").notNull(),
  weighedQuantityQuintals: decimal("weighedQuantityQuintals", { precision: 8, scale: 2 }),
  qualityGrade: varchar("qualityGrade", { length: 32 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  paymentCode: varchar("paymentCode", { length: 40 }).notNull().unique(),
  transactionReference: varchar("transactionReference", { length: 64 }).notNull().unique(),
  receiptNumber: varchar("receiptNumber", { length: 48 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: mysqlEnum("method", ["UPI", "CARD", "NET_BANKING"]).notNull(),
  gateway: varchar("gateway", { length: 80 }).notNull().default("PROCUREFLOW_TEST_GATEWAY"),
  gatewayPaymentId: varchar("gatewayPaymentId", { length: 96 }),
  officerId: int("officerId"),
  status: mysqlEnum("status", paymentStatus).default("PENDING").notNull(),
  failureReason: varchar("failureReason", { length: 240 }),
  isDemo: int("isDemo").notNull().default(1),
  initiatedAt: timestamp("initiatedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  farmerId: int("farmerId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  message: text("message").notNull(),
  category: varchar("category", { length: 48 }).notNull(),
  isRead: int("isRead").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const transportStatus = [
  "REQUESTED",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELIVERED_AT_CENTRE",
  "CANCELLED",
] as const;

export const cropPrices = mysqlTable("cropPrices", {
  id: int("id").autoincrement().primaryKey(),
  cropName: varchar("cropName", { length: 120 }).notNull(),
  variety: varchar("variety", { length: 120 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(), // Cereals, Pulses, Oilseeds, Commercial
  mspPerQuintal: decimal("mspPerQuintal", { precision: 10, scale: 2 }).notNull(),
  marketRatePerQuintal: decimal("marketRatePerQuintal", { precision: 10, scale: 2 }).notNull(),
  govtBonusPerQuintal: decimal("govtBonusPerQuintal", { precision: 10, scale: 2 }).notNull().default("0.00"),
  maxMoisturePercent: decimal("maxMoisturePercent", { precision: 4, scale: 1 }).notNull().default("17.0"),
  effectiveSeason: varchar("effectiveSeason", { length: 80 }).notNull().default("Kharif 2025-26"),
  notificationRef: varchar("notificationRef", { length: 120 }).default("MoA&FW/CACP-2025/MSP-04"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const transportBookings = mysqlTable("transportBookings", {
  id: int("id").autoincrement().primaryKey(),
  transportCode: varchar("transportCode", { length: 40 }).notNull().unique(),
  farmerId: int("farmerId").notNull(),
  bookingId: int("bookingId"),
  vehicleType: mysqlEnum("vehicleType", ["TRACTOR_TROLLEY", "MINI_TRUCK", "HEAVY_LORRY"]).notNull(),
  pickupVillage: varchar("pickupVillage", { length: 160 }).notNull(),
  destinationCentreId: int("destinationCentreId").notNull(),
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
  status: mysqlEnum("status", transportStatus).default("REQUESTED").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Farmer = typeof farmers.$inferSelect;
export type Officer = typeof officers.$inferSelect;
export type CropPrice = typeof cropPrices.$inferSelect;
export type TransportBooking = typeof transportBookings.$inferSelect;
export type StaffAuditLog = typeof staffAuditLogs.$inferSelect;
export type StaffNotification = typeof staffNotifications.$inferSelect;

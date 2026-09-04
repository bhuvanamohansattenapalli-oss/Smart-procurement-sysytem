-- Smart Procurement Management System & Farmer Portal
-- PostgreSQL Database Initialization Schema

CREATE TABLE IF NOT EXISTS "users" (
  "id" SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  "name" TEXT,
  "email" VARCHAR(320),
  "loginMethod" VARCHAR(64),
  "role" VARCHAR(32) NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "farmers" (
  "id" SERIAL PRIMARY KEY,
  "farmerCode" VARCHAR(32) NOT NULL UNIQUE,
  "name" VARCHAR(160) NOT NULL,
  "phone" VARCHAR(20) NOT NULL UNIQUE,
  "passwordHash" VARCHAR(255) NOT NULL,
  "village" VARCHAR(160) NOT NULL,
  "district" VARCHAR(160) NOT NULL,
  "primaryCrop" VARCHAR(80) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "registrations" (
  "id" SERIAL PRIMARY KEY,
  "farmerId" INTEGER NOT NULL UNIQUE,
  "aadhaarMasked" VARCHAR(32) NOT NULL,
  "declarationAccepted" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "reviewedByOfficerId" INTEGER,
  "submittedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "reviewedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "otpChallenges" (
  "id" SERIAL PRIMARY KEY,
  "phone" VARCHAR(20) NOT NULL,
  "activePhone" VARCHAR(20) UNIQUE,
  "name" VARCHAR(160) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "village" VARCHAR(160) NOT NULL,
  "district" VARCHAR(160) NOT NULL,
  "primaryCrop" VARCHAR(80) NOT NULL,
  "aadhaarMasked" VARCHAR(32) NOT NULL,
  "declarationAccepted" INTEGER NOT NULL DEFAULT 1,
  "otpHash" VARCHAR(255) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP NOT NULL,
  "resendAvailableAt" TIMESTAMP NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 1,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "verifiedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "officers" (
  "id" SERIAL PRIMARY KEY,
  "officerCode" VARCHAR(40) NOT NULL UNIQUE,
  "employeeId" VARCHAR(64),
  "name" VARCHAR(160) NOT NULL,
  "email" VARCHAR(320),
  "phone" VARCHAR(20),
  "passwordHash" VARCHAR(255) NOT NULL,
  "role" VARCHAR(64) NOT NULL DEFAULT 'HEAD_OFFICER',
  "department" VARCHAR(100) NOT NULL DEFAULT 'Administration',
  "designation" VARCHAR(120),
  "branch" VARCHAR(160) NOT NULL DEFAULT 'Guntur',
  "centreId" INTEGER,
  "centreName" VARCHAR(160),
  "district" VARCHAR(160) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  "mustChangePassword" INTEGER NOT NULL DEFAULT 0,
  "approvedByOfficerId" INTEGER,
  "approvedAt" TIMESTAMP,
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "staffAuditLogs" (
  "id" SERIAL PRIMARY KEY,
  "performedByOfficerId" INTEGER NOT NULL,
  "performedByOfficerName" VARCHAR(160) NOT NULL,
  "targetOfficerId" INTEGER,
  "targetOfficerName" VARCHAR(160),
  "action" VARCHAR(64) NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "staffNotifications" (
  "id" SERIAL PRIMARY KEY,
  "officerId" INTEGER NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "message" TEXT NOT NULL,
  "category" VARCHAR(48) NOT NULL DEFAULT 'ONBOARDING',
  "isRead" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "procurementCentres" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(180) NOT NULL,
  "place" VARCHAR(180) NOT NULL,
  "district" VARCHAR(160) NOT NULL,
  "state" VARCHAR(100) NOT NULL DEFAULT 'Andhra Pradesh',
  "latitude" NUMERIC(10, 7) NOT NULL,
  "longitude" NUMERIC(10, 7) NOT NULL,
  "distanceKm" NUMERIC(5, 2) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  "queueCapacity" INTEGER NOT NULL DEFAULT 50,
  "cropCategories" VARCHAR(255) DEFAULT 'Cereals, Pulses, Oilseeds',
  "currentToken" VARCHAR(32) DEFAULT 'P-001',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "slots" (
  "id" SERIAL PRIMARY KEY,
  "centreId" INTEGER NOT NULL,
  "slotDate" VARCHAR(16) NOT NULL,
  "startTime" VARCHAR(16) NOT NULL,
  "endTime" VARCHAR(16) NOT NULL,
  "capacity" INTEGER NOT NULL,
  "bookedCount" INTEGER NOT NULL DEFAULT 0,
  "isActive" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "bookings" (
  "id" SERIAL PRIMARY KEY,
  "bookingCode" VARCHAR(40) NOT NULL UNIQUE,
  "farmerId" INTEGER NOT NULL,
  "centreId" INTEGER NOT NULL,
  "slotId" INTEGER NOT NULL,
  "paddyVariety" VARCHAR(120) NOT NULL,
  "paddyGrade" VARCHAR(32) NOT NULL,
  "expectedQuantityQuintals" NUMERIC(8, 2) NOT NULL,
  "tokenNumber" VARCHAR(32) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "queueEntries" (
  "id" SERIAL PRIMARY KEY,
  "bookingId" INTEGER NOT NULL UNIQUE,
  "centreId" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "estimatedWaitMinutes" INTEGER NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'WAITING',
  "joinedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "procurements" (
  "id" SERIAL PRIMARY KEY,
  "bookingId" INTEGER NOT NULL UNIQUE,
  "status" VARCHAR(48) NOT NULL DEFAULT 'BOOKED',
  "weighedQuantityQuintals" NUMERIC(8, 2),
  "qualityGrade" VARCHAR(32),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" SERIAL PRIMARY KEY,
  "bookingId" INTEGER NOT NULL,
  "paymentCode" VARCHAR(40) NOT NULL UNIQUE,
  "transactionReference" VARCHAR(64) NOT NULL UNIQUE,
  "receiptNumber" VARCHAR(48),
  "amount" NUMERIC(12, 2) NOT NULL,
  "method" VARCHAR(32) NOT NULL,
  "gateway" VARCHAR(80) NOT NULL DEFAULT 'PROCUREFLOW_TEST_GATEWAY',
  "gatewayPaymentId" VARCHAR(96),
  "officerId" INTEGER,
  "status" VARCHAR(48) NOT NULL DEFAULT 'PENDING',
  "failureReason" VARCHAR(240),
  "isDemo" INTEGER NOT NULL DEFAULT 1,
  "initiatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "processedAt" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" SERIAL PRIMARY KEY,
  "farmerId" INTEGER NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "message" TEXT NOT NULL,
  "category" VARCHAR(48) NOT NULL,
  "isRead" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "cropPrices" (
  "id" SERIAL PRIMARY KEY,
  "cropName" VARCHAR(120) NOT NULL,
  "variety" VARCHAR(120) NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "mspPerQuintal" NUMERIC(10, 2) NOT NULL,
  "marketRatePerQuintal" NUMERIC(10, 2) NOT NULL,
  "govtBonusPerQuintal" NUMERIC(10, 2) NOT NULL DEFAULT '0.00',
  "maxMoisturePercent" NUMERIC(4, 1) NOT NULL DEFAULT '17.0',
  "effectiveSeason" VARCHAR(80) NOT NULL DEFAULT 'Kharif 2025-26',
  "notificationRef" VARCHAR(120) DEFAULT 'MoA&FW/CACP-2025/MSP-04',
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "transportBookings" (
  "id" SERIAL PRIMARY KEY,
  "transportCode" VARCHAR(40) NOT NULL UNIQUE,
  "farmerId" INTEGER NOT NULL,
  "bookingId" INTEGER,
  "vehicleType" VARCHAR(32) NOT NULL,
  "pickupVillage" VARCHAR(160) NOT NULL,
  "destinationCentreId" INTEGER NOT NULL,
  "scheduledDate" VARCHAR(24) NOT NULL,
  "timeSlot" VARCHAR(32) NOT NULL DEFAULT 'Morning (07:00 - 11:00 AM)',
  "estimatedLoadQuintals" NUMERIC(8, 2) NOT NULL,
  "driverName" VARCHAR(120),
  "driverPhone" VARCHAR(20),
  "vehicleNumber" VARCHAR(32),
  "distanceKm" NUMERIC(6, 2) NOT NULL DEFAULT '12.00',
  "baseFare" NUMERIC(10, 2) NOT NULL,
  "subsidyAmount" NUMERIC(10, 2) NOT NULL DEFAULT '0.00',
  "netPayable" NUMERIC(10, 2) NOT NULL,
  "status" VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indices for rapid query lookup
CREATE INDEX IF NOT EXISTS "idx_farmers_phone" ON "farmers" ("phone");
CREATE INDEX IF NOT EXISTS "idx_farmers_code" ON "farmers" ("farmerCode");
CREATE INDEX IF NOT EXISTS "idx_bookings_code" ON "bookings" ("bookingCode");
CREATE INDEX IF NOT EXISTS "idx_bookings_farmer" ON "bookings" ("farmerId");
CREATE INDEX IF NOT EXISTS "idx_bookings_centre" ON "bookings" ("centreId");
CREATE INDEX IF NOT EXISTS "idx_slots_centre" ON "slots" ("centreId", "slotDate");
CREATE INDEX IF NOT EXISTS "idx_queue_centre" ON "queueEntries" ("centreId", "status");
CREATE INDEX IF NOT EXISTS "idx_payments_code" ON "payments" ("paymentCode");
CREATE INDEX IF NOT EXISTS "idx_notifications_farmer" ON "notifications" ("farmerId");

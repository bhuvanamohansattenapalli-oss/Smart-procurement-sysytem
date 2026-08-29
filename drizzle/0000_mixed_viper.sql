CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingCode` varchar(40) NOT NULL,
	`farmerId` int NOT NULL,
	`centreId` int NOT NULL,
	`slotId` int NOT NULL,
	`paddyVariety` varchar(120) NOT NULL,
	`paddyGrade` varchar(32) NOT NULL,
	`expectedQuantityQuintals` decimal(8,2) NOT NULL,
	`tokenNumber` varchar(32) NOT NULL,
	`status` enum('ACTIVE','CANCELLED','COMPLETED') NOT NULL DEFAULT 'ACTIVE',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_bookingCode_unique` UNIQUE(`bookingCode`),
	CONSTRAINT `bookings_tokenNumber_unique` UNIQUE(`tokenNumber`)
);
--> statement-breakpoint
CREATE TABLE `farmers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`farmerCode` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`village` varchar(160) NOT NULL,
	`district` varchar(160) NOT NULL,
	`primaryCrop` varchar(80) NOT NULL,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `farmers_id` PRIMARY KEY(`id`),
	CONSTRAINT `farmers_farmerCode_unique` UNIQUE(`farmerCode`),
	CONSTRAINT `farmers_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`farmerId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` text NOT NULL,
	`category` varchar(48) NOT NULL,
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `officers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`officerCode` varchar(40) NOT NULL,
	`name` varchar(160) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`district` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `officers_id` PRIMARY KEY(`id`),
	CONSTRAINT `officers_officerCode_unique` UNIQUE(`officerCode`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`paymentCode` varchar(40) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`method` enum('UPI','CARD','NET_BANKING') NOT NULL,
	`status` enum('PENDING','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
	`isDemo` int NOT NULL DEFAULT 1,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_bookingId_unique` UNIQUE(`bookingId`),
	CONSTRAINT `payments_paymentCode_unique` UNIQUE(`paymentCode`)
);
--> statement-breakpoint
CREATE TABLE `procurementCentres` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`place` varchar(180) NOT NULL,
	`district` varchar(160) NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`distanceKm` decimal(5,2) NOT NULL,
	`status` enum('OPEN','BUSY','LIMITED','CLOSED') NOT NULL DEFAULT 'OPEN',
	`queueCapacity` int NOT NULL DEFAULT 50,
	`currentToken` varchar(32) DEFAULT 'P-001',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `procurementCentres_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`status` enum('BOOKED','ARRIVED','DOCUMENT_VERIFICATION','WEIGHING','QUALITY_CHECK','PROCESSING','COMPLETED') NOT NULL DEFAULT 'BOOKED',
	`weighedQuantityQuintals` decimal(8,2),
	`qualityGrade` varchar(32),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `procurements_id` PRIMARY KEY(`id`),
	CONSTRAINT `procurements_bookingId_unique` UNIQUE(`bookingId`)
);
--> statement-breakpoint
CREATE TABLE `queueEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`centreId` int NOT NULL,
	`position` int NOT NULL,
	`estimatedWaitMinutes` int NOT NULL,
	`status` enum('WAITING','CALLED','SERVED') NOT NULL DEFAULT 'WAITING',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `queueEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `queueEntries_bookingId_unique` UNIQUE(`bookingId`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`farmerId` int NOT NULL,
	`aadhaarMasked` varchar(32) NOT NULL,
	`declarationAccepted` int NOT NULL DEFAULT 1,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`rejectionReason` text,
	`reviewedByOfficerId` int,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `registrations_farmerId_unique` UNIQUE(`farmerId`)
);
--> statement-breakpoint
CREATE TABLE `slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`centreId` int NOT NULL,
	`slotDate` varchar(16) NOT NULL,
	`startTime` varchar(16) NOT NULL,
	`endTime` varchar(16) NOT NULL,
	`capacity` int NOT NULL,
	`bookedCount` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	CONSTRAINT `slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

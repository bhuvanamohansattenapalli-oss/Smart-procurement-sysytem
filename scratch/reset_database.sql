-- ===============================================================
-- SMART PROCUREMENT SYSTEM: USER LOGIN & REGISTRATION DATA RESET
-- MODE: OPTION B (Preserve Head Officer OFF-NZM-104)
-- ===============================================================

-- Disable foreign key checks for clean bulk deletion
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Child transaction & activity tables
DELETE FROM `payments`;
DELETE FROM `procurements`;
DELETE FROM `queueEntries`;
DELETE FROM `transportBookings`;
DELETE FROM `bookings`;
DELETE FROM `notifications`;

-- 2. Farmer registration & authentication records
DELETE FROM `registrations`;
DELETE FROM `farmers`;

-- 3. Staff activity & non-head officer accounts
DELETE FROM `staffNotifications`;
DELETE FROM `staffAuditLogs`;

-- Clear self-referential approvals
UPDATE `officers` SET `approvedByOfficerId` = NULL;

-- Delete all demo/test officers except the primary Head Officer
DELETE FROM `officers` WHERE `officerCode` <> 'OFF-NZM-104';

-- 4. Temporary OTP verification challenges & OAuth user sessions
DELETE FROM `otpChallenges`;
DELETE FROM `users`;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ===============================================================
-- VERIFICATION QUERIES:
-- ===============================================================
SELECT 'registrations' AS `table_name`, COUNT(*) AS `count` FROM `registrations`
UNION ALL
SELECT 'farmers', COUNT(*) FROM `farmers`
UNION ALL
SELECT 'otpChallenges', COUNT(*) FROM `otpChallenges`
UNION ALL
SELECT 'users', COUNT(*) FROM `users`
UNION ALL
SELECT 'officers (Expected: 1 preserved)', COUNT(*) FROM `officers`
UNION ALL
SELECT 'procurementCentres [MASTER]', COUNT(*) FROM `procurementCentres`
UNION ALL
SELECT 'slots [MASTER]', COUNT(*) FROM `slots`
UNION ALL
SELECT 'cropPrices [MASTER]', COUNT(*) FROM `cropPrices`;

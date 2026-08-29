ALTER TABLE `otpChallenges` ADD `activePhone` varchar(20);--> statement-breakpoint
ALTER TABLE `otpChallenges` ADD CONSTRAINT `otpChallenges_activePhone_unique` UNIQUE(`activePhone`);
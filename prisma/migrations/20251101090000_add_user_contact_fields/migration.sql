-- Add optional contact details for employees synced from external systems
ALTER TABLE `User`
  ADD COLUMN `phone` VARCHAR(191) NULL,
  ADD COLUMN `supervisorEmail` VARCHAR(191) NULL,
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

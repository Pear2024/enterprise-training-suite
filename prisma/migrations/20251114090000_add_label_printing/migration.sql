-- CreateTable: LabelTemplate
CREATE TABLE IF NOT EXISTS `LabelTemplate` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `payload` JSON NOT NULL,
  `qrConfig` JSON NULL,
  `defaultWidthMm` DECIMAL(10, 2) NULL,
  `defaultHeightMm` DECIMAL(10, 2) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `LabelTemplate_name_key` (`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: PrinterProfile
CREATE TABLE IF NOT EXISTS `PrinterProfile` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `driver` VARCHAR(191) NOT NULL,
  `location` VARCHAR(191) NULL,
  `networkAddress` VARCHAR(191) NULL,
  `dpi` INT NULL,
  `widthMm` DECIMAL(10, 2) NULL,
  `heightMm` DECIMAL(10, 2) NULL,
  `marginXmm` DECIMAL(10, 2) NULL,
  `marginYmm` DECIMAL(10, 2) NULL,
  `defaultTemplateId` INT NULL,
  `calibrationPayload` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `PrinterProfile_name_key` (`name`),
  KEY `PrinterProfile_defaultTemplate_idx` (`defaultTemplateId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: LabelSequence
CREATE TABLE IF NOT EXISTS `LabelSequence` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `templateId` INT NULL,
  `prefix` VARCHAR(191) NULL,
  `lastValue` INT NOT NULL DEFAULT 0,
  `step` INT NOT NULL DEFAULT 1,
  `padding` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `LabelSequence_name_key` (`name`),
  KEY `LabelSequence_template_idx` (`templateId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateEnum: LabelJobStatus
SET @previous_labeljobstatus := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'status' AND TABLE_NAME = 'LabelJob');
-- MySQL lacks a direct CREATE TYPE, Prisma emulates via ENUM column creation.

-- CreateTable: LabelJob
CREATE TABLE IF NOT EXISTS `LabelJob` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `templateId` INT NOT NULL,
  `printerId` INT NULL,
  `sequenceId` INT NULL,
  `serialValue` INT NULL,
  `serial` VARCHAR(191) NULL,
  `payload` JSON NOT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'PRINTED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
  `errorMessage` TEXT NULL,
  `renderedAt` DATETIME(3) NULL,
  `printedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `LabelJob_sequenceId_serialValue_key` (`sequenceId`, `serialValue`),
  KEY `LabelJob_template_idx` (`templateId`),
  KEY `LabelJob_printer_idx` (`printerId`),
  KEY `LabelJob_status_idx` (`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: PrinterProfile_defaultTemplateId
ALTER TABLE `PrinterProfile`
  ADD CONSTRAINT `PrinterProfile_defaultTemplateId_fkey`
    FOREIGN KEY (`defaultTemplateId`) REFERENCES `LabelTemplate`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: LabelSequence_templateId
ALTER TABLE `LabelSequence`
  ADD CONSTRAINT `LabelSequence_templateId_fkey`
    FOREIGN KEY (`templateId`) REFERENCES `LabelTemplate`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: LabelJob_templateId
ALTER TABLE `LabelJob`
  ADD CONSTRAINT `LabelJob_templateId_fkey`
    FOREIGN KEY (`templateId`) REFERENCES `LabelTemplate`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: LabelJob_printerId
ALTER TABLE `LabelJob`
  ADD CONSTRAINT `LabelJob_printerId_fkey`
    FOREIGN KEY (`printerId`) REFERENCES `PrinterProfile`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: LabelJob_sequenceId
ALTER TABLE `LabelJob`
  ADD CONSTRAINT `LabelJob_sequenceId_fkey`
    FOREIGN KEY (`sequenceId`) REFERENCES `LabelSequence`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

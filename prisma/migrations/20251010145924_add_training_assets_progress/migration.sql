-- CreateTable: AssetProgress (ต้องมาก่อนการอ้างอิงใด ๆ)
CREATE TABLE IF NOT EXISTS `AssetProgress` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `assignmentId` INT NOT NULL,
  `assetId` INT NOT NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,

  UNIQUE KEY `AssetProgress_assignmentId_assetId_key` (`assignmentId`, `assetId`),
  KEY `AssetProgress_assignmentId_idx` (`assignmentId`),
  KEY `AssetProgress_assetId_idx` (`assetId`),

  CONSTRAINT `AssetProgress_assignmentId_fkey`
    FOREIGN KEY (`assignmentId`) REFERENCES `Assignment`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `AssetProgress_assetId_fkey`
    FOREIGN KEY (`assetId`) REFERENCES `TrainingAsset`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- *** ลบสองบรรทัด ALTER TABLE ด้านล่างนี้ทิ้งไป ***
-- ALTER TABLE `AssetProgress` ADD CONSTRAINT ...
-- ALTER TABLE `AssetProgress` ADD CONSTRAINT ...

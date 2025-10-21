-- Add optional asset link to Attempt without data loss
ALTER TABLE `Attempt`
  ADD COLUMN `assetId` INTEGER NULL;

CREATE INDEX `Attempt_assetId_idx`
  ON `Attempt`(`assetId`);

ALTER TABLE `Attempt`
  ADD CONSTRAINT `Attempt_assetId_fkey`
  FOREIGN KEY (`assetId`) REFERENCES `TrainingAsset`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

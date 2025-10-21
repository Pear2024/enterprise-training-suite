-- Add asset relation to Question (non-destructive)
ALTER TABLE `Question`
  ADD COLUMN `assetId` INTEGER NULL;

CREATE INDEX `Question_assetId_idx`
  ON `Question`(`assetId`);

ALTER TABLE `Question`
  ADD CONSTRAINT `Question_assetId_fkey`
  FOREIGN KEY (`assetId`) REFERENCES `TrainingAsset`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

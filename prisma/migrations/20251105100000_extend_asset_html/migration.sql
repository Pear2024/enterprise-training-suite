-- Alter htmlContent column to handle larger HTML payloads
ALTER TABLE `TrainingAsset`
  MODIFY COLUMN `htmlContent` LONGTEXT NULL;

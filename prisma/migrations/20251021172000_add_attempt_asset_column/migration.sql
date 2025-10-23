-- Add optional asset link to Attempt without data loss
-- Add optional asset link to Attempt without data loss (idempotent guards for prod drift)
SET @attempt_asset_col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE table_schema = DATABASE()
    AND table_name = 'Attempt'
    AND column_name = 'assetId'
);
SET @add_attempt_asset_col_sql := IF(
  @attempt_asset_col_exists = 0,
  'ALTER TABLE `Attempt` ADD COLUMN `assetId` INTEGER NULL',
  'SELECT 1'
);
PREPARE stmt FROM @add_attempt_asset_col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @attempt_asset_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE table_schema = DATABASE()
    AND table_name = 'Attempt'
    AND index_name = 'Attempt_assetId_idx'
);
SET @create_attempt_asset_idx_sql := IF(
  @attempt_asset_idx_exists = 0,
  'CREATE INDEX `Attempt_assetId_idx` ON `Attempt`(`assetId`)',
  'SELECT 1'
);
PREPARE stmt FROM @create_attempt_asset_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @attempt_asset_fk_exists := (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE constraint_schema = DATABASE()
    AND constraint_name = 'Attempt_assetId_fkey'
);
SET @add_attempt_asset_fk_sql := IF(
  @attempt_asset_fk_exists = 0,
  'ALTER TABLE `Attempt` ADD CONSTRAINT `Attempt_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `TrainingAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @add_attempt_asset_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

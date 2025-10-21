-- CreateTable
CREATE TABLE `TrainingAsset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `topicId` INTEGER NOT NULL,
    `type` ENUM('VIDEO', 'IMAGE', 'PDF', 'LINK', 'HTML') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `htmlContent` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 1,
    `isRequired` BOOLEAN NOT NULL DEFAULT true,
    `durationSec` INTEGER NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TrainingAsset_topicId_type_idx`(`topicId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssetProgress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assignmentId` INTEGER NOT NULL,
    `assetId` INTEGER NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `AssetProgress_assignmentId_assetId_idx`(`assignmentId`, `assetId`),
    UNIQUE INDEX `AssetProgress_assignmentId_assetId_key`(`assignmentId`, `assetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TrainingAsset` ADD CONSTRAINT `TrainingAsset_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `TrainingTopic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add asset relation to Question
ALTER TABLE `Question` ADD COLUMN `assetId` INTEGER NULL;
ALTER TABLE `Question` ADD CONSTRAINT `Question_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `TrainingAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX `Question_assetId_idx` ON `Question`(`assetId`);

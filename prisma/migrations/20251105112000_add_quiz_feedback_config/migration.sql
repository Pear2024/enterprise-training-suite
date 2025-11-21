ALTER TABLE `Attempt`
  ADD COLUMN `correctCount` INT NOT NULL DEFAULT 0;

ALTER TABLE `TrainingAsset`
  ADD COLUMN `quizFeedbackJson` LONGTEXT NULL;

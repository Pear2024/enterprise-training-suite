-- Alter AttemptAnswer.textAnswer to allow longer responses
ALTER TABLE `AttemptAnswer`
  MODIFY `textAnswer` TEXT NULL;

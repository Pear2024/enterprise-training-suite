import { prisma } from '@/lib/db';

export type QuestionChoiceStat = {
  choiceId: number | null;
  count: number;
};

export type QuestionAnswerStat = {
  questionId: number;
  totalResponses: number;
  choiceCounts: QuestionChoiceStat[];
  textResponses: number;
};

export async function getAssetQuestionStats(assetId: number): Promise<QuestionAnswerStat[]> {
  const questions = await prisma.question.findMany({
    where: { assetId },
    select: {
      id: true,
      choices: { select: { id: true } },
    },
  });

  const statsMap = new Map<number, QuestionAnswerStat>();

  for (const question of questions) {
    statsMap.set(question.id, {
      questionId: question.id,
      totalResponses: 0,
      textResponses: 0,
      choiceCounts: question.choices.map((choice) => ({
        choiceId: choice.id,
        count: 0,
      })),
    });
  }

  const grouped = await prisma.attemptAnswer.groupBy({
    by: ['questionId', 'choiceId'],
    where: {
      question: { assetId },
    },
    _count: { _all: true },
  });

  for (const row of grouped) {
    const entry = statsMap.get(row.questionId);
    if (!entry) {
      continue;
    }
    const count = row._count._all;
    entry.totalResponses += count;

    if (row.choiceId == null) {
      entry.textResponses += count;
      continue;
    }

    const choiceEntry = entry.choiceCounts.find((c) => c.choiceId === row.choiceId);
    if (choiceEntry) {
      choiceEntry.count += count;
    } else {
      entry.choiceCounts.push({ choiceId: row.choiceId, count });
    }
  }

  // Ensure every question has an entry even if there are no attempt answers yet
  return Array.from(statsMap.values());
}

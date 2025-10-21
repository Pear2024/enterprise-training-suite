// scripts/seed-asset-questions.ts
import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Pick a topic to seed for demo
  const topic = await prisma.trainingTopic.findFirst({ where: { code: 'SAFE-START-101' } });
  if (!topic) throw new Error('Topic SAFE-START-101 not found. Run seed/safe-start first.');

  const assets = await prisma.trainingAsset.findMany({ where: { topicId: topic.id }, orderBy: { order: 'asc' } });
  if (!assets.length) throw new Error('No assets found in topic to attach questions.');

  // Cleanup existing asset-level questions for this topic to avoid duplicates
  const assetIds = assets.map((a) => a.id);
  await prisma.choice.deleteMany({ where: { question: { assetId: { in: assetIds } } } });
  await prisma.question.deleteMany({ where: { assetId: { in: assetIds } } });

  const created: { assetId: number; q: number }[] = [];

  for (const a of assets) {
    // Q1 SINGLE_CHOICE
    const q1 = await prisma.question.create({
      data: {
        topicId: a.topicId,
        assetId: a.id,
        type: QuestionType.SINGLE_CHOICE,
        text: `เกี่ยวกับสื่อ: ${a.title} — เลือกคำตอบที่ถูกต้อง`,
        order: 1,
        points: 5,
      },
    });
    await prisma.choice.createMany({
      data: [
        { questionId: q1.id, text: 'เข้าใจสาระสำคัญของสื่อนี้', isCorrect: true, order: 1 },
        { questionId: q1.id, text: 'ไม่เกี่ยวข้องกับหัวข้อ', isCorrect: false, order: 2 },
      ],
    });

    // Q2 TRUE_FALSE
    const q2 = await prisma.question.create({
      data: {
        topicId: a.topicId,
        assetId: a.id,
        type: QuestionType.TRUE_FALSE,
        text: 'ต้องศึกษาสื่อให้ครบถ้วนก่อนเริ่มทำแบบทดสอบ',
        order: 2,
        points: 5,
      },
    });
    await prisma.choice.createMany({
      data: [
        { questionId: q2.id, text: 'จริง', isCorrect: true, order: 1 },
        { questionId: q2.id, text: 'เท็จ', isCorrect: false, order: 2 },
      ],
    });

    created.push({ assetId: a.id, q: 2 });
  }

  console.table(created.map((x) => ({ assetId: x.assetId, questions: x.q })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


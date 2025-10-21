// scripts/seed-questions.ts
import { PrismaClient, QuestionType } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const topic = await prisma.trainingTopic.findFirst({ where: { code: 'SAFE-START-101' } });
  if (!topic) throw new Error('Topic SAFE-START-101 not found');

  // ลบของเก่าก่อน (ทดสอบซ้ำได้)
  await prisma.choice.deleteMany({ where: { question: { topicId: topic.id } } });
  await prisma.question.deleteMany({ where: { topicId: topic.id } });

  // Q1: SINGLE
  const q1 = await prisma.question.create({
    data: { topicId: topic.id, type: QuestionType.SINGLE_CHOICE, text: 'What is Safe Start?', order: 1, points: 10 },
  });
  await prisma.choice.createMany({
    data: [
      { questionId: q1.id, text: 'Safe Start Procedure', isCorrect: true, order: 1 },
      { questionId: q1.id, text: 'Machine Repair Manual', isCorrect: false, order: 2 },
      { questionId: q1.id, text: 'Leave Application Form', isCorrect: false, order: 3 },
    ],
  });

  // Q2: TRUE_FALSE
  const q2 = await prisma.question.create({
    data: { topicId: topic.id, type: QuestionType.TRUE_FALSE, text: 'PPE must be inspected before starting work every time.', order: 2, points: 10 },
  });
  await prisma.choice.createMany({
    data: [
      { questionId: q2.id, text: 'True', isCorrect: true, order: 1 },
      { questionId: q2.id, text: 'False', isCorrect: false, order: 2 },
    ],
  });

  // Q3: MULTI (ถูก 2 ตัวเลือก)
  const q3 = await prisma.question.create({
    data: { topicId: topic.id, type: QuestionType.MULTI_CHOICE, text: 'ข้อใดคือเช็กลิสต์ก่อนเริ่มงาน (เลือกได้หลายข้อ)', order: 3, points: 10 },
  });
  await prisma.choice.createMany({
    data: [
      { questionId: q3.id, text: 'ตรวจอุปกรณ์', isCorrect: true, order: 1 },
      { questionId: q3.id, text: 'ตรวจฉลาก', isCorrect: true, order: 2 },
      { questionId: q3.id, text: 'ข้ามขั้นตอนเพื่อความเร็ว', isCorrect: false, order: 3 },
    ],
  });

  console.log('✅ Seeded questions for topic', topic.id);
}
main().finally(() => prisma.$disconnect());

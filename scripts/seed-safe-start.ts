// scripts/seed-safe-start.ts
import { PrismaClient, AssetType, TopicStatus, AssignmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1) หาผู้ใช้ที่ต้องการ
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  const emp   = await prisma.user.findUnique({ where: { username: 'emp' } });

  if (!admin) throw new Error('ไม่พบผู้ใช้ admin (username: admin) — กรุณาสร้างผู้ใช้ก่อน');
  if (!emp)   throw new Error('ไม่พบผู้ใช้ emp (username: emp) — กรุณาสร้างผู้ใช้ก่อน');

  // 2) สร้าง/อัปเดตหัวข้อ
  const topic = await prisma.trainingTopic.upsert({
    where: { code: 'SAFE-START-101' },
    update: {
      title: 'Safe Start — Basics',
      status: TopicStatus.ACTIVE,
      createdById: admin.id,
    },
    create: {
      code: 'SAFE-START-101',
      title: 'Safe Start — Basics',
      description: 'เรียนรู้ขั้นตอน Safe Start สำหรับไลน์ผลิต',
      status: TopicStatus.ACTIVE,
      createdById: admin.id,
    },
  });

  // 3) สร้าง/อัปเดตแอสเซ็ตเรียงตาม order
  //    ใช้ unique ชั่วคราวด้วย (topicId, title, order) ถ้า schema ไม่มี unique ให้ค้นหาแล้ว upsert ด้วย id ก็ได้
  //    ที่นี่จะใช้วิธี findFirst แล้วสร้าง/อัปเดตด้วย id เพื่อลดความเสี่ยงเรื่อง unique
  async function upsertAsset(
    where: { title: string; order: number },
    data: {
      type: AssetType; url?: string | null; htmlContent?: string | null;
      isRequired: boolean; order: number;
    }
  ) {
    const existing = await prisma.trainingAsset.findFirst({
      where: { topicId: topic.id, title: where.title, order: where.order },
      select: { id: true },
    });

    if (existing) {
      return prisma.trainingAsset.update({
        where: { id: existing.id },
        data: {
          type: data.type,
          url: data.url ?? null,
          htmlContent: data.htmlContent ?? null,
          isRequired: data.isRequired,
          order: data.order,
        },
      });
    } else {
      return prisma.trainingAsset.create({
        data: {
          topicId: topic.id,
          title: where.title,
          type: data.type,
          url: data.url ?? null,
          htmlContent: data.htmlContent ?? null,
          isRequired: data.isRequired,
          order: data.order,
        },
      });
    }
  }

  const a1 = await upsertAsset(
    { title: 'แนะนำ Safe Start (5 นาที)', order: 1 },
    {
      type: AssetType.VIDEO,
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      isRequired: true,
      order: 1,
    }
  );

  const a2 = await upsertAsset(
    { title: 'คู่มือย่อ (PDF)', order: 2 },
    {
      type: AssetType.PDF,
      url: 'https://example.com/safe-start-manual.pdf',
      isRequired: true,
      order: 2,
    }
  );

  const a3 = await upsertAsset(
    { title: 'เช็กลิสต์ก่อนเริ่มงาน', order: 3 },
    {
      type: AssetType.HTML,
      htmlContent: '<ul><li>ตรวจอุปกรณ์</li><li>ตรวจฉลาก</li></ul>',
      isRequired: false,
      order: 3,
    }
  );

  // 4) มอบหมายหัวข้อนี้ให้ emp
  const assignment = await prisma.assignment.upsert({
    where: { uniq_user_topic_once: { userId: emp.id, topicId: topic.id } },
    update: { status: AssignmentStatus.ASSIGNED },
    create: {
      userId: emp.id,
      topicId: topic.id,
      status: AssignmentStatus.ASSIGNED,
    },
  });

  console.log('✅ DONE');
  console.table([
    { key: 'topic.code', value: topic.code },
    { key: 'topic.id', value: topic.id },
    { key: 'assets', value: [a1.id, a2.id, a3.id].join(', ') },
    { key: 'assignment.id', value: assignment.id },
    { key: 'assigned.to', value: 'emp' },
  ]);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

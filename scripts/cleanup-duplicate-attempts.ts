// scripts/cleanup-duplicate-attempts.ts
import { prisma } from '../lib/db';

async function main() {
  console.log('Scanning attempts...');

  const attempts = await prisma.attempt.findMany({
    select: {
      id: true,
      assignmentId: true,
      assetId: true,
      userId: true,
      startedAt: true,
    },
    orderBy: [
      { assignmentId: 'asc' },
      { assetId: 'asc' },
      { userId: 'asc' },
      { startedAt: 'desc' }, // newest attempt first
    ],
  });

  const keep = new Map<string, number>();
  const toDelete: number[] = [];

  for (const attempt of attempts) {
    const key = `${attempt.assignmentId}:${attempt.assetId ?? 'null'}:${attempt.userId}`;
    if (!keep.has(key)) {
      keep.set(key, attempt.id); // keep the most recent attempt per group
    } else {
      toDelete.push(attempt.id); // mark duplicates for deletion
    }
  }

  console.log(`Total attempts: ${attempts.length}`);
  console.log(`Will remove duplicates: ${toDelete.length}`);

  if (!toDelete.length) {
    console.log('Nothing to clean up.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.attemptAnswer.deleteMany({ where: { attemptId: { in: toDelete } } });
    await tx.attempt.deleteMany({ where: { id: { in: toDelete } } });
  });

  console.log('Cleanup complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

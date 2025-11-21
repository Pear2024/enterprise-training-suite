import { AssignmentStatus } from '@prisma/client';

import { prisma } from './db';

export type AssignmentSummary = {
  total: number;
  overdue: number;
  byStatus: Record<AssignmentStatus, number>;
};

const statusDefaults = Object.values(AssignmentStatus).reduce(
  (acc, status) => {
    acc[status] = 0;
    return acc;
  },
  {} as Record<AssignmentStatus, number>,
);

export async function getAssignmentSummary(): Promise<AssignmentSummary> {
  const [statusGroups, overdue] = await Promise.all([
    prisma.assignment.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.assignment.count({
      where: {
        dueAt: { lt: new Date() },
        status: { not: AssignmentStatus.COMPLETED },
      },
    }),
  ]);

  const byStatus = { ...statusDefaults };
  let total = 0;

  for (const group of statusGroups) {
    const count = group._count._all;
    byStatus[group.status] = count;
    total += count;
  }

  return {
    total,
    overdue,
    byStatus,
  };
}

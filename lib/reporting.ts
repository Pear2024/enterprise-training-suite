import { AssignmentStatus, TopicStatus } from '@prisma/client';
import { prisma } from './db';

export type ReportsOverview = {
  summary: {
    totalAssignments: number;
    byStatus: Record<AssignmentStatus, number>;
    uniqueLearners: number;
    overdueAssignments: number;
    topicsTracked: number;
  };
  topics: TopicSummary[];
  recentCompletions: RecentCompletion[];
};

export type TopicSummary = {
  id: number;
  code: string;
  title: string;
  status: TopicStatus;
  assignments: {
    total: number;
    byStatus: Record<AssignmentStatus, number>;
  };
  completions: number;
  completionRatePct: number;
};

export type RecentCompletion = {
  id: number;
  completedAt: Date;
  topicId: number;
  topicTitle: string;
  userId: number;
  userName: string;
};

const statusKeys: AssignmentStatus[] = [
  AssignmentStatus.ASSIGNED,
  AssignmentStatus.IN_PROGRESS,
  AssignmentStatus.COMPLETED,
  AssignmentStatus.CANCELED,
];

export async function getReportsOverview(): Promise<ReportsOverview> {
  const [topics, assignmentGroups, completionGroups, uniqueLearnerGroups, overdueAssignments, recentCompletions] =
    await Promise.all([
      prisma.trainingTopic.findMany({
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
        },
      }),
      prisma.assignment.groupBy({
        by: ['topicId', 'status'],
        _count: { _all: true },
      }),
      prisma.completion.groupBy({
        by: ['topicId'],
        _count: { _all: true },
      }),
      prisma.assignment.groupBy({
        by: ['userId'],
        _count: { _all: true },
      }),
      prisma.assignment.count({
        where: {
          dueAt: { lt: new Date() },
          status: { not: AssignmentStatus.COMPLETED },
        },
      }),
      prisma.completion.findMany({
        orderBy: { completedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          completedAt: true,
          topic: { select: { id: true, title: true } },
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

  const zeroStatusCounts: Record<AssignmentStatus, number> = statusKeys.reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {} as Record<AssignmentStatus, number>,
  );

  const completionLookup = new Map<number, number>();
  for (const row of completionGroups) {
    completionLookup.set(row.topicId, row._count._all);
  }

  const topicMap = new Map<number, TopicSummary>();
  for (const topic of topics) {
    topicMap.set(topic.id, {
      id: topic.id,
      code: topic.code,
      title: topic.title,
      status: topic.status,
      assignments: {
        total: 0,
        byStatus: { ...zeroStatusCounts },
      },
      completions: completionLookup.get(topic.id) ?? 0,
      completionRatePct: 0,
    });
  }

  let totalAssignments = 0;
  const overallStatusCounts: Record<AssignmentStatus, number> = { ...zeroStatusCounts };

  for (const group of assignmentGroups) {
    const topicRow = topicMap.get(group.topicId);
    if (!topicRow) continue;
    const count = group._count._all;
    topicRow.assignments.total += count;
    topicRow.assignments.byStatus[group.status] += count;
    totalAssignments += count;
    overallStatusCounts[group.status] += count;
  }

  for (const topicRow of topicMap.values()) {
    if (!topicRow.assignments.total) {
      topicRow.completionRatePct = 0;
      continue;
    }
    topicRow.completionRatePct = Math.round(
      (topicRow.completions / topicRow.assignments.total) * 100,
    );
  }

  const topicsWithActivity = Array.from(topicMap.values()).filter(
    (topic) => topic.assignments.total > 0 || topic.completions > 0,
  );
  topicsWithActivity.sort((a, b) => b.assignments.total - a.assignments.total);

  const recent = recentCompletions.map((item) => {
    const displayName = [item.user.firstName, item.user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return {
      id: item.id,
      completedAt: item.completedAt,
      topicId: item.topic.id,
      topicTitle: item.topic.title,
      userId: item.user.id,
      userName: displayName || item.user.username,
    };
  });

  return {
    summary: {
      totalAssignments,
      byStatus: overallStatusCounts,
      uniqueLearners: uniqueLearnerGroups.length,
      overdueAssignments,
      topicsTracked: topicsWithActivity.length,
    },
    topics: topicsWithActivity,
    recentCompletions: recent,
  };
}

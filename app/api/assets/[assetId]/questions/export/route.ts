import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, hasRole } from '@/lib/auth';

export const runtime = 'nodejs';

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (/["\n,]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const session = await getSession();
  if (!session || !hasRole(session, ['ADMIN', 'TRAINER'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { assetId } = await context.params;
  const assetIdNum = Number(assetId);
  if (!Number.isFinite(assetIdNum)) {
    return NextResponse.json({ error: 'Invalid asset id' }, { status: 400 });
  }

  const asset = await prisma.trainingAsset.findUnique({
    where: { id: assetIdNum },
    select: {
      id: true,
      title: true,
      topic: { select: { id: true, title: true } },
      questions: {
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          text: true,
          type: true,
          order: true,
          choices: {
            orderBy: [{ order: 'asc' }, { id: 'asc' }],
            select: { id: true, text: true, order: true },
          },
        },
      },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const questionIds = asset.questions.map((question) => question.id);
  if (questionIds.length === 0) {
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="asset-${asset.id}-responses.csv"`);
    headers.set('Content-Type', 'text/csv; charset=utf-8');
    const headerRow = [
      'Topic Title',
      'Asset Title',
      'Question Order',
      'Question ID',
      'Question Text',
      'Question Type',
      'Choice Order',
      'Choice ID',
      'Choice Text',
      'Answer Count',
      'Text Response',
    ];
    const csv = `${headerRow.join(',')}\n`;
    return new NextResponse(csv, { headers });
  }

  const answers = await prisma.attemptAnswer.findMany({
    where: { questionId: { in: questionIds } },
    select: {
      questionId: true,
      choiceId: true,
      textAnswer: true,
      attempt: {
        select: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const grouped: Record<
    number,
    {
      choiceCounts: Map<number | null, number>;
      textResponses: string[];
      respondentIds: Set<number>;
    }
  > = {};

  for (const questionId of questionIds) {
    grouped[questionId] = {
      choiceCounts: new Map<number | null, number>(),
      textResponses: [],
      respondentIds: new Set<number>(),
    };
  }

  for (const answer of answers) {
    const entry = grouped[answer.questionId];
    if (!entry) continue;

    const userId = answer.attempt.user?.id;
    if (userId != null) {
      entry.respondentIds.add(userId);
    }

    if (answer.choiceId != null) {
      entry.choiceCounts.set(answer.choiceId, (entry.choiceCounts.get(answer.choiceId) ?? 0) + 1);
    } else if (answer.textAnswer) {
      entry.textResponses.push(answer.textAnswer);
    }
  }

  const rows: string[][] = [];

  for (const question of asset.questions) {
    const entry = grouped[question.id];
    const metadataPrefix = [
      asset.topic?.title ?? '',
      asset.title,
      question.order,
      question.id,
      question.text,
      question.type,
      entry.respondentIds.size,
    ];

    if (question.choices.length > 0) {
      for (const choice of question.choices) {
        const count = entry.choiceCounts.get(choice.id) ?? 0;
        rows.push([
          ...metadataPrefix,
          choice.order,
          choice.id,
          choice.text,
          count,
          '',
        ]);
      }
    }

    for (const textValue of entry.textResponses) {
      rows.push([...metadataPrefix, '', '', '', 1, textValue]);
    }

    if (rows.length === 0 && entry.choiceCounts.size === 0 && entry.textResponses.length === 0) {
      rows.push([...metadataPrefix, '', '', '', 0, '']);
    }
  }

  const headerRow = [
    'Topic Title',
    'Asset Title',
    'Question Order',
    'Question ID',
    'Question Text',
    'Question Type',
    'Unique Respondents',
    'Choice Order',
    'Choice ID',
    'Choice Text',
    'Answer Count',
    'Text Response',
  ];

  const csvBody = rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');

  const csv = `${headerRow.join(',')}\n${csvBody}`;

  const headers = new Headers();
  headers.set('Content-Type', 'text/csv; charset=utf-8');
  headers.set(
    'Content-Disposition',
    `attachment; filename="asset-${asset.id}-responses.csv"`,
  );

  return new NextResponse(csv, { headers });
}

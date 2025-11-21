import { prisma } from '@/lib/db';
import { getAssetQuestionStats } from '@/lib/question-stats';
import QuestionsManager from './ui-questions-manager';
import FeedbackSettings from './feedback-settings';

export default async function AssetQuestionsPage({
  params,
}: {
  params: Promise<{ id: string; assetId: string }>;
}) {
  const { id, assetId } = await params;
  const topicId = Number(id);
  const aId = Number(assetId);
  if (!Number.isFinite(topicId) || !Number.isFinite(aId)) {
    return <main className="p-6">Invalid id</main>;
  }

  const asset = await prisma.trainingAsset.findFirst({
    where: { id: aId, topicId },
    select: { id: true, title: true, topicId: true, quizFeedbackJson: true },
  });
  if (!asset) {
    return <main className="p-6">Asset not found</main>;
  }

  const questions = await prisma.question.findMany({
    where: { assetId: asset.id },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      type: true,
      text: true,
      order: true,
      points: true,
      choices: {
        orderBy: { order: 'asc' },
        select: { id: true, text: true, isCorrect: true, order: true },
      },
    },
  });

  const stats = await getAssetQuestionStats(asset.id);
  const feedbackConfig = (() => {
    if (!asset.quizFeedbackJson) return null;
    try {
      const parsed = JSON.parse(asset.quizFeedbackJson) as { ranges?: { minCorrect: number; message: string }[] };
      if (parsed && Array.isArray(parsed.ranges)) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  })();

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Questions - {asset.title}</h1>
      <div>
        <a className="underline" href={`/topics/${topicId}/edit/assets`}>
          ← Back to Assets
        </a>
      </div>
      <div>
        <a
          href={`/api/assets/${asset.id}/questions/export`}
          className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-gray-50"
        >
          Download responses (CSV)
        </a>
      </div>
      <FeedbackSettings assetId={asset.id} initialConfig={feedbackConfig} />
      <QuestionsManager assetId={asset.id} initial={questions} stats={stats} />
    </main>
  );
}

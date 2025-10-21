import { prisma } from '@/lib/db';
import QuestionsManager from './ui-questions-manager';

export default async function AssetQuestionsPage({ params }: { params: Promise<{ id: string; assetId: string }> }) {
  const { id, assetId } = await params;
  const topicId = Number(id);
  const aId = Number(assetId);
  if (!Number.isFinite(topicId) || !Number.isFinite(aId)) return <main className="p-6">Invalid id</main>;

  const asset = await prisma.trainingAsset.findFirst({
    where: { id: aId, topicId },
    select: { id: true, title: true, topicId: true },
  });
  if (!asset) return <main className="p-6">Asset not found</main>;

  const questions = await prisma.question.findMany({
    where: { assetId: asset.id },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      type: true,
      text: true,
      order: true,
      points: true,
      choices: { orderBy: { order: 'asc' }, select: { id: true, text: true, isCorrect: true, order: true } },
    },
  });

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Questions — {asset.title}</h1>
      <div>
        <a className="underline" href={`/topics/${topicId}/edit/assets`}>
          ← Back to Assets
        </a>
      </div>
      <QuestionsManager assetId={asset.id} initial={questions} />
    </main>
  );
}


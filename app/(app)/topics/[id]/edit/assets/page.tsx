import { prisma } from '@/lib/db';
import AssetsManager, { AssetRow, AssetType } from './ui-assets-manager';

type RawAsset = {
  id: number;
  type: AssetType;
  title: string;
  url: string | null;
  htmlContent: string | null;
  order: number;
  isRequired: boolean;
  durationSec: number | null;
  thumbnailUrl: string | null;
};

export default async function EditAssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isFinite(topicId)) {
    return <main className="p-6">Invalid topic id</main>;
  }

  const topic = await prisma.trainingTopic.findUnique({
    where: { id: topicId },
    select: { id: true, code: true, title: true },
  });
  if (!topic) return <main className="p-6">Topic not found</main>;

  const assets: RawAsset[] = await prisma.trainingAsset.findMany({
    where: { topicId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      type: true,
      title: true,
      url: true,
      htmlContent: true,
      order: true,
      isRequired: true,
      durationSec: true,
      thumbnailUrl: true,
    },
  });

  const initial: AssetRow[] = assets.map((asset) => ({
    ...asset,
    type: asset.type as AssetType,
    durationSec: asset.durationSec ?? null,
    thumbnailUrl: asset.thumbnailUrl ?? null,
    url: asset.url ?? null,
    htmlContent: asset.htmlContent ?? null,
  }));

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Edit Assets — {topic.code} — {topic.title}</h1>
      <div>
        <a className="underline text-blue-600" href={`/topics/${topic.id}/edit`}>
          ← Back to Topic Edit
        </a>
      </div>
      <AssetsManager topicId={topic.id} initialAssets={initial} />
      <div className="rounded-xl border p-3 text-sm">
        Tip: To add questions for an asset, open its Questions page: /topics/{topic.id}/edit/assets/[assetId]
      </div>
    </main>
  );
}



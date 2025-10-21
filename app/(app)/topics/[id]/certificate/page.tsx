import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import CertificateCard from "./certificate-card";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topicId = Number(id);
  if (!Number.isFinite(topicId)) redirect('/dashboard');

  const session = await getSession();
  if (!session?.userId) redirect('/login');

  const completion = await prisma.completion.findUnique({
    where: { uniq_completion_per_topic: { userId: session.userId, topicId } },
    select: { completedAt: true, topic: { select: { title: true } } },
  });

  if (!completion) redirect(`/lesson/${topicId}`);

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <CertificateCard
          userName={session.username}
          topicTitle={completion.topic.title}
          completedAt={completion.completedAt.toISOString()}
        />
      </div>
    </main>
  );
}

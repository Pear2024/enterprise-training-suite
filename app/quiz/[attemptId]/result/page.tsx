import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const session = await getSession();
  if (!session?.userId) redirect('/login');
  const id = Number(attemptId);

  const attempt = await prisma.attempt.findFirst({
    where: { id, userId: session.userId },
    select: {
      id: true,
      score: true,
      passed: true,
      submittedAt: true,
      correctCount: true,
      asset: { select: { id: true, quizFeedbackJson: true } },
      assignment: { select: { topicId: true, topic: { select: { title: true, id: true } } } },
    },
  });
  if (!attempt) redirect('/');
  if (!attempt.submittedAt) redirect(`/quiz/${attempt.id}`);

  const questionWhere = attempt.asset?.id
    ? { assetId: attempt.asset.id }
    : { topicId: attempt.assignment.topicId };

  const questions = await prisma.question.findMany({
    where: questionWhere,
    select: { points: true },
  });
  const total = questions.reduce((sum, q) => sum + q.points, 0);
  const scorePct = attempt.score ? Number(attempt.score) : 0;
  const correctCount = attempt.correctCount ?? 0;

  type FeedbackRange = { minCorrect: number; message: string };
  const defaultRanges: FeedbackRange[] = [
    { minCorrect: 5, message: 'Excellent understanding of the Code of Ethics.' },
    { minCorrect: 3, message: 'Good understanding, review areas of improvement.' },
    { minCorrect: 0, message: 'Please review the Code of Ethics and attend additional training.' },
  ];

  const customRanges = (() => {
    const raw = attempt.asset?.quizFeedbackJson;
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { ranges?: FeedbackRange[] };
      if (!parsed || !Array.isArray(parsed.ranges)) return null;
      const sanitized = parsed.ranges
        .filter((entry) => typeof entry.minCorrect === 'number' && typeof entry.message === 'string')
        .map((entry) => ({ minCorrect: Math.max(0, Math.floor(entry.minCorrect)), message: entry.message.trim() }))
        .sort((a, b) => b.minCorrect - a.minCorrect);
      return sanitized.length ? sanitized : null;
    } catch {
      return null;
    }
  })();

  const ranges = customRanges ?? defaultRanges;
  const feedback =
    ranges.find((range) => correctCount >= range.minCorrect)?.message ??
    defaultRanges[defaultRanges.length - 1]!.message;

  return (
    <main className="min-h-screen p-6 space-y-4">
      <h1 className="text-2xl font-bold">Test Results</h1>
      <div className="rounded-2xl border p-4 shadow-sm space-y-2">
        <div>Topic: <b>{attempt.assignment.topic.title}</b></div>
        <div>Attempt: #{attempt.id}</div>
        <div>Total Score: {scorePct}% of {total}</div>
        <div>
          Status: {attempt.passed ? (
            <span className="text-green-600">Passed</span>
          ) : (
            <span className="text-red-600">Not passed</span>
          )}
        </div>
        <div className="text-sm text-gray-700">
          Feedback: {feedback}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href={`/lesson/${attempt.assignment.topic.id}`} className="rounded-lg border px-4 py-2 hover:bg-gray-50">
          Back to Lesson
        </Link>
        {attempt.passed && (
          <Link href="/" className="rounded-lg border px-4 py-2 hover:bg-gray-50">
            Go to Dashboard
          </Link>
        )}
      </div>
    </main>
  );
}

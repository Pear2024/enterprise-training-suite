// app/quiz/[attemptId]/page.tsx

import QuizClient from './quiz-client';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function QuizPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const { attemptId } = await params;
  return <QuizClient attemptId={Number(attemptId)} />;
}


import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { getSession, clearSession } from '@/lib/auth';

export const runtime = 'nodejs';

type ChangePasswordPayload = {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
};

const MIN_LENGTH = Number(process.env.APP_PASSWORD_MIN_LENGTH ?? 8);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: ChangePasswordPayload;
  try {
    body = (await request.json()) as ChangePasswordPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === 'string' ? body.currentPassword.trim() : '';
  const newPassword =
    typeof body.newPassword === 'string' ? body.newPassword.trim() : '';
  const confirmPassword =
    typeof body.confirmPassword === 'string' ? body.confirmPassword.trim() : '';

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: 'Current password and new passwords are required' },
      { status: 400 },
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: 'New password confirmation does not match' },
      { status: 400 },
    );
  }

  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_LENGTH} characters` },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: 'Unable to change password for this account' },
      { status: 400 },
    );
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  const samePassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (samePassword) {
    return NextResponse.json(
      { error: 'New password must be different from the current password' },
      { status: 400 },
    );
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: newHash },
  });

  await clearSession();

  return NextResponse.json({ ok: true });
}

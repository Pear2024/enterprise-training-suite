import { getSession } from '@/lib/auth';
import ChangePasswordForm from './change-password-form';

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) {
    return <div className="max-w-md">Unauthorized</div>;
  }

  const minLength = Number(process.env.APP_PASSWORD_MIN_LENGTH ?? 8);

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Change Password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your current password and choose a new one. You will be asked to sign in again
          after the change is complete.
        </p>
      </div>
      <ChangePasswordForm minLength={Number.isFinite(minLength) ? minLength : 8} />
    </div>
  );
}

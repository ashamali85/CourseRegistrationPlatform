import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  // The only guard call that tolerates a pending password change — otherwise
  // this page would redirect to itself.
  const user = await requireUser({ allowPendingPasswordChange: true });
  const forced = user.mustChangePassword;

  return (
    <div className="page">
      <div className="container-narrow">
        <div className="center mt-6">
          <h1>{forced ? 'Set your password' : 'Change your password'}</h1>
          <p className="muted mt-2">Signed in as {user.email}</p>
        </div>

        {forced && (
          <div className="alert alert-info mt-4">
            You are using a temporary password. Choose a new one to continue.
          </div>
        )}

        <div className="card card-pad-lg mt-4">
          <ChangePasswordForm />
        </div>

        <p className="center small muted mt-4">
          Saving signs you out everywhere else.
          {!forced && (
            <>
              {' '}
              <Link href={user.role === 'ADMIN' ? '/admin' : '/courses'}>Cancel</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

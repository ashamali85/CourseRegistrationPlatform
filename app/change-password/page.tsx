import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import ChangePasswordForm from '@/components/ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  // The only guard call that tolerates a pending password change — otherwise
  // this page would redirect to itself.
  const user = await requireUser({ allowPendingPasswordChange: true });
  const { d } = await getT();
  const forced = user.mustChangePassword;

  return (
    <div className="page">
      <div className="container-narrow">
        <div className="center mt-6">
          <h1>{forced ? d.account.setPassword : d.account.changePassword}</h1>
          <p className="muted mt-2">
            {d.account.signedInAs} <span className="ltr-text">{user.email}</span>
          </p>
        </div>

        {forced && (
          <div className="alert alert-info mt-4">
            {d.account.forcedNotice}
          </div>
        )}

        <div className="card card-pad-lg mt-4">
          <ChangePasswordForm />
        </div>

        <p className="center small muted mt-4">
          {d.account.signsYouOut}
          {!forced && (
            <>
              {' '}
              <Link href={user.role === 'ADMIN' ? '/admin' : '/courses'}>
                {d.common.cancel}
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

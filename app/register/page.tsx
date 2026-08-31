import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { isPublicRegistrationOpen } from '@/lib/registration';
import { turnstileSiteKey } from '@/lib/turnstile';
import Link from 'next/link';
import RegisterForm from '@/components/RegisterForm';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === 'ADMIN' ? '/admin' : '/courses');
  const { d } = await getT();

  // The form is hidden when sign-up is closed; the action refuses regardless,
  // since hiding a form stops nobody who can craft a POST.
  if (!isPublicRegistrationOpen()) {
    return (
      <div className="page">
        <div className="container-narrow">
          <div className="card card-pad-lg center mt-6">
            <h1>{d.auth.registrationClosedTitle}</h1>
            <p className="muted mt-2">{d.auth.registrationClosed}</p>
            <Link href="/login" className="btn btn-primary mt-6">
              {d.auth.signIn}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container-narrow">
        <div className="center mt-6">
          <h1>{d.auth.createAccount}</h1>
          <p className="muted mt-2">{d.auth.createAccountSub}</p>
        </div>
        <div className="card card-pad-lg mt-6">
          <RegisterForm siteKey={turnstileSiteKey()} />
        </div>
      </div>
    </div>
  );
}

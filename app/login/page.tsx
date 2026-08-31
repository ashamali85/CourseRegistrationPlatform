import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { isPublicRegistrationOpen } from '@/lib/registration';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === 'ADMIN' ? '/admin' : '/courses');
  const { d } = await getT();

  return (
    <div className="page">
      <div className="container-narrow">
        <div className="center mt-6">
          <h1>{d.auth.welcomeBack}</h1>
          <p className="muted mt-2">{d.auth.welcomeBackSub}</p>
        </div>
        <div className="card card-pad-lg mt-6">
          <LoginForm canRegister={isPublicRegistrationOpen()} />
        </div>
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import RegisterForm from '@/components/RegisterForm';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === 'ADMIN' ? '/admin' : '/courses');
  const { d } = await getT();

  return (
    <div className="page">
      <div className="container-narrow">
        <div className="center mt-6">
          <h1>{d.auth.createAccount}</h1>
          <p className="muted mt-2">{d.auth.createAccountSub}</p>
        </div>
        <div className="card card-pad-lg mt-6">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}

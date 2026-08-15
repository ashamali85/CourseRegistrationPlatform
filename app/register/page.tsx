import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import RegisterForm from '@/components/RegisterForm';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === 'ADMIN' ? '/admin' : '/courses');

  return (
    <div className="page">
      <div className="container-narrow">
        <div className="center mt-6">
          <h1>Create your account</h1>
          <p className="muted mt-2">Then pick a course and a time that suits you.</p>
        </div>
        <div className="card card-pad-lg mt-6">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.role === 'ADMIN' ? '/admin' : '/courses');

  return (
    <div className="page">
      <div className="container-narrow">
        <div className="center mt-6">
          <h1>Welcome back</h1>
          <p className="muted mt-2">Sign in to book a course session.</p>
        </div>
        <div className="card card-pad-lg mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

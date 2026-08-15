'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction, type ActionState } from '@/lib/actions/auth-actions';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export default function LoginForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="stack">
      {state.error && <FormAlert error={state.error} />}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        {state.fieldErrors?.email && <p className="field-error">{state.fieldErrors.email}</p>}
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {state.fieldErrors?.password && (
          <p className="field-error">{state.fieldErrors.password}</p>
        )}
      </div>

      <SubmitButton className="btn btn-primary btn-block" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>

      <p className="center small muted">
        No account yet? <Link href="/register">Create one</Link>
      </p>
    </form>
  );
}

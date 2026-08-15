'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction, type ActionState } from '@/lib/actions/auth-actions';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export default function RegisterForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(registerAction, {});

  return (
    <form action={formAction} className="stack">
      {state.error && <FormAlert error={state.error} />}

      <div className="field">
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" type="text" autoComplete="name" required />
        {state.fieldErrors?.name && <p className="field-error">{state.fieldErrors.name}</p>}
      </div>

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
          autoComplete="new-password"
          minLength={10}
          required
        />
        <p className="small muted mt-2">At least 10 characters.</p>
        {state.fieldErrors?.password && (
          <p className="field-error">{state.fieldErrors.password}</p>
        )}
      </div>

      <SubmitButton className="btn btn-primary btn-block" pendingLabel="Creating account…">
        Create account
      </SubmitButton>

      <p className="center small muted">
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}

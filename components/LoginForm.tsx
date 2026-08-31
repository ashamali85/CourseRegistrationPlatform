'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction, type ActionState } from '@/lib/actions/auth-actions';
import { useI18n } from '@/components/I18nProvider';
import { useBusyWhile } from '@/components/BusyProvider';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export default function LoginForm({ canRegister = true }: { canRegister?: boolean }) {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    loginAction,
    {}
  );
  useBusyWhile(pending);

  return (
    <form action={formAction} className="stack">
      {state.error && <FormAlert error={state.error} />}

      <div className="field">
        <label htmlFor="email">{d.auth.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        {state.fieldErrors?.email && <p className="field-error">{state.fieldErrors.email}</p>}
      </div>

      <div className="field">
        <label htmlFor="password">{d.auth.password}</label>
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

      <SubmitButton className="btn btn-primary btn-block" pendingLabel={d.auth.signingIn}>
        {d.auth.signIn}
      </SubmitButton>

      {canRegister && (
        <p className="center small muted">
          {d.auth.noAccount} <Link href="/register">{d.auth.createOne}</Link>
        </p>
      )}
    </form>
  );
}

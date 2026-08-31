'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction, type ActionState } from '@/lib/actions/auth-actions';
import { useI18n } from '@/components/I18nProvider';
import { useBusyWhile } from '@/components/BusyProvider';
import { PASSWORD_MIN } from '@/lib/validation';
import { HONEYPOT_FIELD } from '@/lib/registration';
import TurnstileWidget from '@/components/TurnstileWidget';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export default function RegisterForm({ siteKey }: { siteKey: string | null }) {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    registerAction,
    {}
  );
  useBusyWhile(pending);

  return (
    <form action={formAction} className="stack">
      {state.error && <FormAlert error={state.error} />}

      <div className="field">
        <label htmlFor="name">{d.auth.fullName}</label>
        <input id="name" name="name" type="text" autoComplete="name" required />
        {state.fieldErrors?.name && <p className="field-error">{state.fieldErrors.name}</p>}
      </div>

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
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          required
        />
        <p className="small muted mt-2">{d.auth.minChars}</p>
        {state.fieldErrors?.password && (
          <p className="field-error">{state.fieldErrors.password}</p>
        )}
      </div>

      {/* Off-screen rather than display:none — some bots skip hidden inputs. */}
      <div className="visually-hidden" aria-hidden="true">
        <label htmlFor={HONEYPOT_FIELD}>Leave this field empty</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {siteKey && <TurnstileWidget siteKey={siteKey} />}

      <SubmitButton className="btn btn-primary btn-block" pendingLabel={d.auth.creatingAccount}>
        {d.auth.createAccountBtn}
      </SubmitButton>

      <p className="center small muted">
        {d.auth.alreadyRegistered} <Link href="/login">{d.auth.signIn}</Link>
      </p>
    </form>
  );
}

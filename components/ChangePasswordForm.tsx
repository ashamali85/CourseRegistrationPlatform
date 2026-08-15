'use client';

import { useActionState } from 'react';
import { changePasswordAction, type ActionState } from '@/lib/actions/account-actions';
import { useI18n } from '@/components/I18nProvider';
import { PASSWORD_MIN } from '@/lib/validation';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export default function ChangePasswordForm() {
  const { d } = useI18n();
  const [state, formAction] = useActionState<ActionState, FormData>(
    changePasswordAction,
    {}
  );

  return (
    <form action={formAction} className="stack">
      {state.error && <FormAlert error={state.error} />}

      <div className="field">
        <label htmlFor="currentPassword">{d.account.currentPassword}</label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        {state.fieldErrors?.currentPassword && (
          <p className="field-error">{state.fieldErrors.currentPassword}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="newPassword">{d.account.newPassword}</label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          required
        />
        <p className="small muted mt-2">{d.auth.minChars}</p>
        {state.fieldErrors?.newPassword && (
          <p className="field-error">{state.fieldErrors.newPassword}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">{d.account.repeatPassword}</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN}
          required
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="field-error">{state.fieldErrors.confirmPassword}</p>
        )}
      </div>

      <SubmitButton className="btn btn-primary btn-block" pendingLabel={d.common.saving}>
        {d.account.savePassword}
      </SubmitButton>
    </form>
  );
}

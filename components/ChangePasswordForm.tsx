'use client';

import { useActionState } from 'react';
import { changePasswordAction, type ActionState } from '@/lib/actions/account-actions';
import SubmitButton from '@/components/SubmitButton';
import FormAlert from '@/components/FormAlert';

export default function ChangePasswordForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    changePasswordAction,
    {}
  );

  return (
    <form action={formAction} className="stack">
      {state.error && <FormAlert error={state.error} />}

      <div className="field">
        <label htmlFor="currentPassword">Current password</label>
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
        <label htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
        <p className="small muted mt-2">At least 10 characters.</p>
        {state.fieldErrors?.newPassword && (
          <p className="field-error">{state.fieldErrors.newPassword}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">Repeat new password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="field-error">{state.fieldErrors.confirmPassword}</p>
        )}
      </div>

      <SubmitButton className="btn btn-primary btn-block" pendingLabel="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}

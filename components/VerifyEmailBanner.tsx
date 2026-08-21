'use client';

import { useActionState } from 'react';
import {
  resendVerificationAction,
  type ActionState
} from '@/lib/actions/verification-actions';
import { useI18n } from '@/components/I18nProvider';
import { useBusyWhile } from '@/components/BusyProvider';
import SubmitButton from '@/components/SubmitButton';

/**
 * Shown to signed-in students whose address is not confirmed yet. They can
 * still browse; only booking is blocked, so the banner explains why and offers
 * a fresh link rather than locking them out of the site.
 */
export default function VerifyEmailBanner({ email }: { email: string }) {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resendVerificationAction,
    {}
  );
  useBusyWhile(pending);

  return (
    <div className="alert alert-warn mt-4">
      <div className="row-between wrap">
        <div className="grow">
          <strong>{d.verify.bannerTitle}</strong>
          <p className="small mt-2" style={{ fontWeight: 500 }}>
            {d.verify.bannerBody} <span className="ltr-text">{email}</span>
          </p>
          {state.error && <p className="field-error">{state.error}</p>}
          {state.message && (
            <p className="small mt-2" style={{ fontWeight: 700 }}>
              {state.message}
            </p>
          )}
        </div>
        <form action={formAction}>
          <SubmitButton className="btn btn-ghost btn-sm">
            {d.verify.resend}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

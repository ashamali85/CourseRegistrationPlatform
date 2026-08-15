'use client';

import { useActionState } from 'react';
import { cancelBookingAction, type ActionState } from '@/lib/actions/booking-actions';
import { useI18n } from '@/components/I18nProvider';
import SubmitButton from '@/components/SubmitButton';

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const { d } = useI18n();
  const [state, formAction] = useActionState<ActionState, FormData>(cancelBookingAction, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(d.bookings.confirmCancel)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={bookingId} />
      <SubmitButton className="btn btn-danger btn-sm" pendingLabel={d.bookings.cancelling}>
        {d.bookings.cancelBtn}
      </SubmitButton>
      {state.error && <p className="field-error">{state.error}</p>}
    </form>
  );
}

'use client';

import { useActionState } from 'react';
import { cancelBookingAction, type ActionState } from '@/lib/actions/booking-actions';
import SubmitButton from '@/components/SubmitButton';

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(cancelBookingAction, {});

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm('Cancel this booking? The time slot will be released.')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={bookingId} />
      <SubmitButton className="btn btn-danger btn-sm" pendingLabel="Cancelling…">
        Cancel
      </SubmitButton>
      {state.error && <p className="field-error">{state.error}</p>}
    </form>
  );
}

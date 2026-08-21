'use client';

import { useActionState } from 'react';
import { cancelBookingAction, type ActionState } from '@/lib/actions/booking-actions';
import { useI18n } from '@/components/I18nProvider';
import { useConfirmSubmit } from '@/components/ConfirmProvider';
import { useBusyWhile } from '@/components/BusyProvider';
import SubmitButton from '@/components/SubmitButton';

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const { d } = useI18n();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    cancelBookingAction,
    {}
  );
  useBusyWhile(pending);
  const cancelConfirm = useConfirmSubmit({
    message: d.bookings.confirmCancel,
    confirmLabel: d.bookings.cancelBtn,
    tone: 'danger'
  });

  return (
    <form
      ref={cancelConfirm.formRef}
      action={formAction}
      onSubmit={cancelConfirm.onSubmit}
    >
      <input type="hidden" name="id" value={bookingId} />
      <SubmitButton className="btn btn-danger btn-sm" pendingLabel={d.bookings.cancelling}>
        {d.bookings.cancelBtn}
      </SubmitButton>
      {state.error && <p className="field-error">{state.error}</p>}
    </form>
  );
}

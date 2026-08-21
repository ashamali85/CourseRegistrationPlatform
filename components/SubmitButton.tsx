'use client';

import { useFormStatus } from 'react-dom';
import { useI18n } from '@/components/I18nProvider';
import { useBusyWhile } from '@/components/BusyProvider';

export default function SubmitButton({
  children,
  pendingLabel,
  className = 'btn btn-primary',
  ...rest
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  const { d } = useI18n();
  // Covers plain <form action={serverAction}> too, where there is no
  // useActionState pending flag to read.
  useBusyWhile(pending);
  return (
    <button type="submit" className={className} disabled={pending} {...rest}>
      {pending ? (pendingLabel ?? d.common.working) : children}
    </button>
  );
}

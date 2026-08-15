'use client';

import { useFormStatus } from 'react-dom';

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
  return (
    <button type="submit" className={className} disabled={pending} {...rest}>
      {pending ? (pendingLabel ?? 'Working…') : children}
    </button>
  );
}

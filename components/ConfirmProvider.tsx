'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent
} from 'react';
import { useI18n } from '@/components/I18nProvider';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' turns the confirm button red for destructive actions. */
  tone?: 'default' | 'danger';
};

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error('useConfirm must be used inside ConfirmProvider.');
  return fn;
}

/**
 * Confirm-before-submit for a <form> that posts to a server action.
 *
 * The dialog is async but the submit event is not, so the first submit is
 * always cancelled; if the user confirms, the form is re-submitted
 * programmatically and the flag lets that second pass straight through.
 */
export function useConfirmSubmit(options: ConfirmOptions | string) {
  const confirm = useConfirm();
  const formRef = useRef<HTMLFormElement>(null);
  const approved = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (approved.current) {
      approved.current = false;
      return;
    }
    event.preventDefault();
    if (!(await confirm(options))) return;
    approved.current = true;
    formRef.current?.requestSubmit();
  }

  return { formRef, onSubmit };
}

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { d } = useI18n();
  const [pending, setPending] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm: ConfirmFn = (options) =>
    new Promise<boolean>((resolve) => {
      setPending({
        options: typeof options === 'string' ? { message: options } : options,
        resolve
      });
    });

  function settle(value: boolean) {
    pending?.resolve(value);
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    confirmButtonRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        settle(false);
      }
    };
    document.addEventListener('keydown', onKey);
    // Stop the page scrolling behind the dialog.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [pending]);

  const options = pending?.options;
  const danger = options?.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {options && (
        <div
          className="modal-overlay"
          onClick={() => settle(false)}
          role="presentation"
        >
          <div
            className="modal-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            // Clicks inside must not reach the overlay's dismiss handler.
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-title" className="modal-title">
              {options.title ?? d.common.confirmTitle}
            </h2>
            <p id="confirm-message" className="modal-message">
              {options.message}
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => settle(false)}
              >
                {options.cancelLabel ?? d.common.cancel}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className={danger ? 'btn btn-danger-solid' : 'btn btn-primary'}
                onClick={() => settle(true)}
              >
                {options.confirmLabel ?? d.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

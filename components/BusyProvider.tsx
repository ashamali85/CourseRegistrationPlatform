'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { useI18n } from '@/components/I18nProvider';

type BusyControls = { begin: () => void; end: () => void };

const BusyContext = createContext<BusyControls | null>(null);

/**
 * Show the processing overlay for as long as `active` is true.
 *
 * Every form and transition in the app already exposes a pending flag, so
 * feeding it through here means a new button gets the overlay by wiring one
 * line rather than by remembering to start and stop a spinner by hand.
 */
export function useBusyWhile(active: boolean) {
  const controls = useContext(BusyContext);

  useEffect(() => {
    if (!controls || !active) return;
    controls.begin();
    return () => controls.end();
  }, [active, controls]);
}

/** Manual form, for async work that is not driven by a pending flag. */
export function useBusy() {
  const controls = useContext(BusyContext);

  return useCallback(
    async <T,>(work: () => Promise<T>): Promise<T> => {
      controls?.begin();
      try {
        return await work();
      } finally {
        controls?.end();
      }
    },
    [controls]
  );
}

/** Wait this long before showing anything, so quick actions do not flash. */
const SHOW_DELAY_MS = 160;

export default function BusyProvider({ children }: { children: React.ReactNode }) {
  const { d } = useI18n();
  // A counter, not a boolean: two actions can overlap, and the first to finish
  // must not hide the overlay while the second is still running.
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const begin = useCallback(() => setCount((n) => n + 1), []);
  const end = useCallback(() => setCount((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    if (count > 0) {
      timer.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  }, [count]);

  return (
    <BusyContext.Provider value={{ begin, end }}>
      {children}

      {visible && (
        <div className="busy-overlay" role="status" aria-live="polite">
          <div className="busy-card">
            <span className="busy-spinner" aria-hidden="true" />
            <span className="busy-label">{d.common.processing}</span>
          </div>
        </div>
      )}
    </BusyContext.Provider>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastContextValue = {
  showToast: (message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: () => {} };
  return ctx;
}

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, duration = DEFAULT_DURATION) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(msg);
    setVisible(true);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      setMessage(null);
      timeoutRef.current = null;
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && message && (
        <div
          className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-accent-200 bg-accent-50/95 px-4 py-3 text-sm font-medium text-accent-900 shadow-md shadow-accent-500/10 dark:border-accent-800 dark:bg-accent-950/90 dark:text-accent-100"
          role="status"
          aria-live="polite"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-500 text-[10px] font-bold text-white dark:bg-accent-400 dark:text-accent-950" aria-hidden>
            ✓
          </span>
          <span>{message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

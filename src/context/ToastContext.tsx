import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Toast = {
  id: number;
  message: string;
  action?: { label: string; onAction: () => void };
};

type ToastContextValue = {
  showToast: (message: string, action?: Toast["action"]) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback(
    (message: string, action?: Toast["action"]) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message, action });
      timer.current = setTimeout(() => setToast(null), DURATION_MS);
    },
    [],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{ bottom: "calc(6rem + env(safe-area-inset-bottom))" }}
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
        >
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 shadow-lg">
            <span className="flex-1 text-[14px] font-medium text-bg">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.onAction();
                  clear();
                }}
                className="press shrink-0 rounded-full px-3 py-1 text-[14px] font-semibold text-bg underline underline-offset-2"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast musi być użyte wewnątrz ToastProvider");
  return ctx;
}

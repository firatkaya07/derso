"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS: Record<ToastKind, number> = {
  success: 4000,
  info: 5000,
  // Hataların okunması daha uzun sürer ve genelde bir işlem gerektirir.
  error: 9000,
};

const STYLES: Record<ToastKind, { wrapper: string; icon: ReactNode }> = {
  success: {
    wrapper: "bg-white border-green-200 text-gray-800",
    icon: (
      <svg
        className="w-5 h-5 text-green-500 shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  error: {
    wrapper: "bg-white border-red-200 text-gray-800",
    icon: (
      <svg
        className="w-5 h-5 text-red-500 shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  info: {
    wrapper: "bg-white border-blue-200 text-gray-800",
    icon: (
      <svg
        className="w-5 h-5 text-blue-500 shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, kind, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS[kind]);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show("success", message),
      error: (message) => show("error", message),
      info: (message) => show("info", message),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-2.5 rounded-xl border shadow-lg px-4 py-3 text-sm ${STYLES[toast.kind].wrapper}`}
          >
            {STYLES[toast.kind].icon}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-gray-300 hover:text-gray-500 transition-colors shrink-0"
              aria-label="Kapat"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast, ToastProvider içinde kullanılmalıdır.");
  }
  return api;
}

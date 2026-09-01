"use client";

import { useEffect, useId, useRef } from "react";

/** Açık modal sayısını izler. Son modal kapanınca scroll geri açılır. */
let openModalCount = 0;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const isSheet = size !== "sm";

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusables = () =>
      [
        ...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
      ].filter(
        (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
      );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = focusables();
      if (nodes.length === 0) {
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    openModalCount++;
    if (openModalCount === 1) {
      document.body.style.overflow = "hidden";
    }

    const focusTarget = focusables()[0] ?? panelRef.current;
    focusTarget?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      openModalCount--;
      if (openModalCount <= 0) {
        openModalCount = 0;
        document.body.style.overflow = "";
      }
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[70] flex justify-center bg-black/40 modal-overlay-enter ${
        isSheet
          ? "items-end p-0 sm:items-center sm:p-4"
          : "items-center p-4"
      }`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto overscroll-contain outline-none modal-panel-enter bg-[var(--color-card)] pb-[env(safe-area-inset-bottom)] ${
          isSheet
            ? "rounded-t-[14px] sm:rounded-[14px]"
            : "rounded-[14px]"
        }`}
      >
        {isSheet ? (
          <div className="sm:hidden" aria-hidden="true">
            <span className="ios-grabber" />
          </div>
        ) : null}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-2 bg-[var(--color-card)]">
          <h2
            id={titleId}
            className="ios-headline min-w-0 text-pretty"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="ios-btn ios-btn-plain h-11 w-11 shrink-0 p-0 text-[var(--color-text-muted)]"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
        <div className="px-4 pb-5 pt-1">{children}</div>
      </div>
    </div>
  );
}

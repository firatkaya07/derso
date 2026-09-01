"use client";

import { useEffect, useId, useReducer, useRef } from "react";

type Hole = { top: number; left: number; width: number; height: number };

function measure(target: HTMLElement): Hole {
  const rect = target.getBoundingClientRect();
  const pad = 6;
  return {
    top: Math.max(8, rect.top - pad),
    left: Math.max(8, rect.left - pad),
    width: Math.min(window.innerWidth - 16, rect.width + pad * 2),
    height: rect.height + pad * 2,
  };
}

export default function CoachMark({
  open,
  target,
  title,
  body,
  onDismiss,
}: {
  open: boolean;
  target: HTMLElement | null;
  title: string;
  body: string;
  onDismiss: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!open || !target) return;

    const update = () => rerender();
    const observer = new ResizeObserver(update);
    observer.observe(target);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, target]);

  useEffect(() => {
    if (!open || !target) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKey);

    const focusTarget =
      panelRef.current?.querySelector<HTMLElement>("[data-coach-primary]") ??
      panelRef.current;
    focusTarget?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, target, onDismiss]);

  if (!open || !target || typeof window === "undefined") return null;

  const hole = measure(target);
  const tooltipWidth = Math.min(340, window.innerWidth - 24);
  const spaceBelow = window.innerHeight - (hole.top + hole.height);
  const placeBelow = spaceBelow > 180;
  const tooltipTop = placeBelow
    ? hole.top + hole.height + 12
    : Math.max(12, hole.top - 12 - 168);
  const tooltipLeft = Math.min(
    Math.max(12, hole.left),
    window.innerWidth - tooltipWidth - 12
  );

  const dim = "fixed z-[75] bg-black/50";

  return (
    <div className="contents">
      <div
        className={dim}
        style={{ top: 0, left: 0, right: 0, height: hole.top }}
        onClick={onDismiss}
      />
      <div
        className={dim}
        style={{
          top: hole.top,
          left: 0,
          width: hole.left,
          height: hole.height,
        }}
        onClick={onDismiss}
      />
      <div
        className={dim}
        style={{
          top: hole.top,
          left: hole.left + hole.width,
          right: 0,
          height: hole.height,
        }}
        onClick={onDismiss}
      />
      <div
        className={dim}
        style={{
          top: hole.top + hole.height,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        onClick={onDismiss}
      />

      <div
        className="coach-hole pointer-events-none"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
        }}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="coach-tooltip"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipWidth,
        }}
      >
        <p id={titleId} className="ios-headline">
          {title}
        </p>
        <p id={descId} className="ios-subhead mt-1">
          {body}
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="ios-btn ios-btn-plain min-h-11 px-3"
          >
            Atla
          </button>
          <button
            type="button"
            data-coach-primary
            onClick={onDismiss}
            className="ios-btn ios-btn-primary"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}

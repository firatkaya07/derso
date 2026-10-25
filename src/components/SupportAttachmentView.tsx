"use client";

import { useEffect, useState } from "react";
import {
  downloadSupportAttachment,
  formatBytes,
  isImageMime,
} from "@/lib/support-attachments";

type Appearance = "chat-user" | "chat-support" | "admin";

type SupportAttachmentViewProps = {
  conversationId: string;
  path: string;
  name: string | null;
  mime: string | null;
  size: number | null;
  guestToken: string | null;
  appearance: Appearance;
};

export function SupportAttachmentView(props: SupportAttachmentViewProps) {
  return (
    <SupportAttachmentBody
      key={`${props.conversationId}:${props.path}:${props.guestToken ?? ""}`}
      {...props}
    />
  );
}

function SupportAttachmentBody({
  conversationId,
  path,
  name,
  mime,
  size,
  guestToken,
  appearance,
}: SupportAttachmentViewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    downloadSupportAttachment(conversationId, path, guestToken)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setPhase("ready");
      })
      .catch(() => {
        if (!cancelled) setPhase("error");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [conversationId, path, guestToken]);

  if (phase === "loading") {
    return <p className="mt-1.5 text-xs opacity-80">Dosya yükleniyor…</p>;
  }

  if (phase === "error" || !url) {
    return <p className="mt-1.5 text-xs opacity-80">Dosya açılamadı.</p>;
  }

  const label = name ?? "Dosya";

  if (isImageMime(mime)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-1.5 overflow-hidden rounded-lg"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={label}
          className={
            appearance === "admin"
              ? "max-h-40 rounded-lg"
              : "max-h-40 w-full object-cover"
          }
        />
      </a>
    );
  }

  if (appearance === "admin") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-flex text-xs underline"
      >
        {label}
        {size ? ` (${formatBytes(size)})` : ""}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${
        appearance === "chat-user"
          ? "bg-indigo-500/40 text-white hover:bg-indigo-500/55"
          : "bg-white border border-gray-200 text-indigo-700 hover:bg-indigo-50"
      }`}
    >
      <svg
        className="w-4 h-4 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.8}
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
      <span className="truncate flex-1">{label}</span>
      {size ? (
        <span className="opacity-70 shrink-0">{formatBytes(size)}</span>
      ) : null}
    </a>
  );
}

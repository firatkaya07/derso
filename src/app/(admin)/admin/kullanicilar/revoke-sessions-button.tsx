"use client";

import { useState, useTransition } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { revokeUserSessions } from "./actions";

export function RevokeSessionsButton({
  userId,
  email,
  self,
}: {
  userId: string;
  email: string;
  self: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (self) {
    return <span className="text-xs text-slate-400">Bu hesap</span>;
  }

  if (done) {
    return <span className="text-xs font-medium text-slate-500">Kapatıldı</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Oturumları kapat
      </button>
      {error ? (
        <p className="mt-1 max-w-40 text-xs text-red-700">{error}</p>
      ) : null}
      <ConfirmDialog
        isOpen={open}
        title="Oturumları kapat"
        message={`${email} hesabının telefon ve tarayıcı oturumları kapanır. Yeniden giriş yapması gerekir.`}
        confirmLabel="Oturumları kapat"
        loadingLabel="Kapatılıyor…"
        loading={pending}
        onCancel={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={() => {
          startTransition(async () => {
            const result = await revokeUserSessions(userId);
            if (!result.ok) {
              setError(result.message);
              setOpen(false);
              return;
            }
            setOpen(false);
            setDone(true);
          });
        }}
      />
    </>
  );
}

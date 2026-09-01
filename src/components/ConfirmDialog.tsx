"use client";

import Modal from "@/components/Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Silme gibi yıkıcı işlemler için Modal tabanlı onay diyaloğu. */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Sil",
  cancelLabel = "İptal",
  loadingLabel = "Siliniyor…",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-[var(--color-text-secondary)] mb-6 leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 bg-[var(--color-destructive)] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? loadingLabel : confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 bg-gray-100 text-[var(--color-text)] py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}

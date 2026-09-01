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
      <p className="ios-subhead mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="ios-btn ios-btn-secondary flex-1"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="ios-btn ios-btn-destructive flex-1"
        >
          {loading ? loadingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

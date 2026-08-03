"use client";

import Modal from "@/components/Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
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
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-5">{message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Siliniyor..." : confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}

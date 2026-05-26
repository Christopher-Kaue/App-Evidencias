"use client";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message = "Voce realmente deseja excluir?",
  confirmLabel = "Sim, excluir",
  cancelLabel = "Nao",
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="confirm-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="confirm-modal">
        <h3 id="confirm-dialog-title">{title}</h3>
        <p>{message}</p>
        <div className="confirm-modal-actions">
          <button className="btn danger" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button className="btn" type="button" onClick={onCancel} style={{ background: "#8a8a8a" }}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

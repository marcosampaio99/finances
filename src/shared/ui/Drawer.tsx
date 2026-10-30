import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

// Painel lateral (ou folha inferior em mobile) sobre <dialog>: foco preso e Esc vêm do browser.
export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <div className="drawer-head">
            <h2>{title}</h2>
            <button className="icon-btn" aria-label="Fechar" onClick={onClose}>
              <X size={17} />
            </button>
          </div>
          <div className="drawer-body">{children}</div>
          {footer && <div className="drawer-foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

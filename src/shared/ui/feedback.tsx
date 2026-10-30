import { CircleAlert, CircleCheck } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
}

interface Feedback {
  toast: (message: string, tone?: "ok" | "bad") => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<Feedback | null>(null);

export function useFeedback() {
  const feedback = useContext(FeedbackContext);
  if (!feedback) throw new Error("useFeedback requer FeedbackProvider.");
  return feedback;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string; tone: "ok" | "bad" }[]>([]);
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const nextId = useRef(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const toastLayer = useRef<HTMLDivElement>(null);

  const toast = useCallback<Feedback["toast"]>((message, tone = "ok") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3500);
  }, []);

  const confirm = useCallback<Feedback["confirm"]>((options) => {
    setPending(options);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (pending && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [pending]);

  // Um <dialog> modal fica por cima de tudo: os avisos entram na mesma camada, ou ficariam tapados.
  useEffect(() => {
    const layer = toastLayer.current;
    if (!layer?.showPopover) return;
    if (layer.matches(":popover-open")) layer.hidePopover();
    if (toasts.length > 0) layer.showPopover();
  }, [toasts]);

  function settle(value: boolean) {
    dialog.current?.close();
    setPending(null);
    resolver.current?.(value);
    resolver.current = null;
  }

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <dialog
        ref={dialog}
        className="confirm"
        role="alertdialog"
        aria-label={pending?.title}
        onCancel={(e) => {
          e.preventDefault();
          settle(false);
        }}
      >
        {pending && (
          <>
            <h2>{pending.title}</h2>
            <p>{pending.message}</p>
            <div className="confirm-actions">
              <button className="btn" onClick={() => settle(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger-solid" onClick={() => settle(true)}>
                {pending.confirmLabel ?? "Eliminar"}
              </button>
            </div>
          </>
        )}
      </dialog>
      <div ref={toastLayer} popover="manual" className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.tone === "ok" ? (
              <CircleCheck size={16} className="ok" />
            ) : (
              <CircleAlert size={16} className="bad" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

// Executa uma escrita e comunica o resultado; devolve se teve sucesso.
export function useAction() {
  const { toast } = useFeedback();
  return useCallback(
    async (run: () => Promise<unknown>, success: string, failure = "Não foi possível guardar. Tenta novamente.") => {
      try {
        await run();
        toast(success);
        return true;
      } catch (err) {
        console.error(err);
        toast(failure, "bad");
        return false;
      }
    },
    [toast],
  );
}

import { useState, type FormEvent, type ReactNode } from "react";

export const SAVE_ERROR = "Não foi possível guardar. Tenta novamente.";

// Formulário de registo com campos não controlados: lê os valores pelo atributo
// `name`, limpa-se depois de guardar e mostra o erro se a escrita falhar.
export function RecordForm({
  submitLabel,
  onSubmit,
  children,
}: {
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<unknown>;
  children: ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setPending(true);
    setError(false);
    try {
      await onSubmit(values);
      form.reset();
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {children}
      <button type="submit" disabled={pending}>
        {submitLabel}
      </button>
      {error && <div className="msg form-error">{SAVE_ERROR}</div>}
    </form>
  );
}

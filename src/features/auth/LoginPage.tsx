import { Wallet } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { signIn, signUp } from "@/features/auth/authService";
import { Field } from "@/shared/ui/form";

export function LoginPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function authenticate(action: typeof signIn) {
    const form = formRef.current!;
    setMessage("");
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    setPending(true);
    try {
      await action(String(values.get("email")).trim(), String(values.get("password")));
    } catch (err) {
      const { code, message } = err as { code?: string; message?: string };
      setMessage("Não foi possível: " + (code || message));
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    authenticate(signIn);
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-intro">
          <span className="brand-mark">
            <Wallet size={19} />
          </span>
          <h1>Finanças</h1>
          <p className="dim">Entra para veres a tua situação financeira.</p>
        </div>
        {message && (
          <div className="form-error" role="alert">
            {message}
          </div>
        )}
        <form ref={formRef} className="form-stack" onSubmit={handleSubmit}>
          <Field label="Email">
            <input className="input" name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Palavra-passe" hint="Mínimo de 6 caracteres">
            <input className="input" name="password" type="password" required minLength={6} autoComplete="current-password" />
          </Field>
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
              Entrar
            </button>
            <button type="button" className="btn btn-block" disabled={pending} onClick={() => authenticate(signUp)}>
              Criar conta
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

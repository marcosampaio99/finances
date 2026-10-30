import { useRef, useState, type FormEvent } from "react";
import { signIn, signUp } from "@/features/auth/authService";

export function LoginPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");

  async function authenticate(action: typeof signIn) {
    const form = formRef.current!;
    setMessage("");
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    try {
      await action(String(values.get("email")).trim(), String(values.get("password")));
    } catch (err) {
      const { code, message } = err as { code?: string; message?: string };
      setMessage("Não foi possível: " + (code || message));
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    authenticate(signIn);
  }

  return (
    <div className="auth">
      <div className="card">
        <h1>💰 Finanças</h1>
        <div className="msg" role="alert">
          {message}
        </div>
        <form ref={formRef} onSubmit={handleSubmit}>
          <input name="email" type="email" placeholder="Email" required autoComplete="email" />
          <input
            name="password"
            type="password"
            placeholder="Palavra-passe (mín. 6)"
            required
            minLength={6}
            autoComplete="current-password"
          />
          <button type="submit">Entrar</button>
          <button type="button" className="ghost" onClick={() => authenticate(signUp)}>
            Criar conta
          </button>
        </form>
      </div>
    </div>
  );
}

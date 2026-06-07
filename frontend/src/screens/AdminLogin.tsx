import { useState } from "react";
import type { FormEvent } from "react";
import { Lock, Shield } from "lucide-react";

import { AppTopbar } from "../components/ui/AppTopbar";
import { login } from "../services/api";

type AdminLoginProps = {
  onBack: () => void;
  onLoggedIn: (username: string) => void;
};

export function AdminLogin({ onBack, onLoggedIn }: AdminLoginProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");

    if (!username || !password) {
      setError("Informe usuário e senha.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = await login(username, password);
      onLoggedIn(result.username);
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError("Não foi possível entrar.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="pilar-gradient app-screen">
      <AppTopbar
        title="Acesso da Coordenação"
        subtitle="Área administrativa"
        onBack={onBack}
        onProfileClick={onBack}
      />

      <section className="screen-content narrow">
        <section className="panel admin-login">
          <div className="admin-login-head">
            <span className="tile-icon">
              <Shield size={30} />
            </span>
            <div>
              <h2>Entrar</h2>
              <p>Apenas a coordenação tem acesso ao painel.</p>
            </div>
          </div>

          {error && <p className="status error">{error}</p>}

          <form className="family-form" onSubmit={handleSubmit} noValidate>
            <label>
              Usuário
              <input
                name="username"
                autoComplete="username"
                placeholder="Ex: coordenacao"
                required
              />
            </label>

            <label>
              Senha
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                required
              />
            </label>

            <button type="submit" disabled={isSubmitting}>
              <Lock size={18} />
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

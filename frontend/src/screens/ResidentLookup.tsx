import { useState } from "react";
import type { FormEvent } from "react";
import { Search, User } from "lucide-react";

import { AppTopbar } from "../components/ui/AppTopbar";
import { lookupFamily } from "../services/api";
import type { Family } from "../types";

type ResidentLookupProps = {
  onBack: () => void;
  onFound: (family: Family) => void;
};

export function ResidentLookup({ onBack, onFound }: ResidentLookupProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nome = String(formData.get("nome_responsavel") || "").trim();
    const viela = String(formData.get("codigo_viela") || "").trim();

    if (!nome || !viela) {
      setError("Informe o nome e o código da viela.");
      return;
    }

    setError("");
    setIsSearching(true);

    try {
      const family = await lookupFamily(nome, viela);
      onFound(family);
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        setError(caughtError.message);
      } else {
        setError("Não foi possível localizar o cadastro.");
      }
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <main className="pilar-gradient app-screen">
      <AppTopbar
        title="PILAR"
        subtitle="Morador"
        onBack={onBack}
        onProfileClick={onBack}
      />

      <section className="screen-content narrow">
        <section className="panel admin-login">
          <div className="admin-login-head">
            <span className="tile-icon">
              <User size={30} />
            </span>
            <div>
              <h2>Localizar meu cadastro</h2>
              <p>
                Informe seu nome e o código da viela para acessar seu histórico.
              </p>
            </div>
          </div>

          {error && <p className="status error">{error}</p>}

          <form className="family-form" onSubmit={handleSubmit} noValidate>
            <label>
              Nome do responsável
              <input
                name="nome_responsavel"
                autoComplete="name"
                placeholder="Ex.: Maria da Silva"
                required
              />
            </label>

            <label>
              Código da viela
              <input
                name="codigo_viela"
                autoComplete="off"
                placeholder="Ex.: viela azul"
                required
              />
            </label>

            <button type="submit" disabled={isSearching}>
              <Search size={18} />
              {isSearching ? "Buscando..." : "Acessar meu histórico"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

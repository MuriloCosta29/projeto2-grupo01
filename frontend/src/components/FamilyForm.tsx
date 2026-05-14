// Cria formulário para cadastrar famílias.

import { useState } from "react";
import type { FormEvent } from "react";

import { createFamily } from "../services/api";

type FamilyFormProps = {
  onFamilyCreated: () => Promise<void> | void;
};

export function FamilyForm({ onFamilyCreated }: FamilyFormProps) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    setError("");
    setSuccess("");

    const formData = new FormData(event.currentTarget);

    try {
      await createFamily({
        nome_responsavel: String(formData.get("nome_responsavel") || ""),
        quantidade_moradores: Number(formData.get("quantidade_moradores") || 1),
        codigo_viela: String(formData.get("codigo_viela") || ""),
        cep: String(formData.get("cep") || ""),
      });

      form.reset();
      setSuccess("Família mapeada com sucesso.");
      await onFamilyCreated();
    } catch (caughtError) {
      console.error("Erro ao cadastrar família:", caughtError);

      if (caughtError instanceof Error) {
        setError(caughtError.message);
        return;
      }

      setError("Não foi possível cadastrar a família.");
    }
  }

  return (
    <section className="panel">
      <h2>Cadastrar família</h2>

      {success && <p className="status success">{success}</p>}
      {error && <p className="status error">{error}</p>}

      <form className="family-form" onSubmit={handleSubmit}>
        <label>
          Nome do responsável
          <input name="nome_responsavel" required />
        </label>

        <label>
          Número de moradores
          <input name="quantidade_moradores" type="number" min="1" required />
        </label>

        <label>
          Código da Viela / Referência
          <input name="codigo_viela" required />
        </label>

        <label>
          CEP opcional
          <input name="cep" />
        </label>

        <button type="submit">Salvar família</button>
      </form>
    </section>
  );
}


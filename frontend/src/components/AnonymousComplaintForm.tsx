import { useState } from "react";
import type { FormEvent } from "react";

import {
  createAnonymousComplaint,
  type CreateAnonymousComplaintPayload,
} from "../services/api";
import type { Region } from "../types";

type AnonymousComplaintFormProps = {
  regions: Region[];
};

const complaintCategories = [
  {
    value: "irregular_distribution",
    label: "Irregularidade na distribuição",
  },
  {
    value: "conflict",
    label: "Conflito em campo",
  },
  {
    value: "data_issue",
    label: "Dados incorretos",
  },
  {
    value: "other",
    label: "Outro",
  },
];

export function AnonymousComplaintForm({ regions }: AnonymousComplaintFormProps) {
  const [error, setError] = useState("");
  const [protocol, setProtocol] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const regionId = Number(formData.get("region_id"));
    const description = String(formData.get("description") || "").trim();
    const payload: CreateAnonymousComplaintPayload = {
      ...(regionId ? { region_id: regionId } : {}),
      codigo_viela: String(formData.get("codigo_viela") || ""),
      category: String(formData.get("category") || "other"),
      description,
    };

    setError("");
    setProtocol("");

    if (description.length < 10) {
      setError("Descreva a denúncia com pelo menos 10 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createAnonymousComplaint(payload);

      setProtocol(response.protocol);
      form.reset();
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        setError(caughtError.message);
        return;
      }

      setError("Não foi possível registrar a denúncia.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel anonymous-complaint">
      <div className="panel-header">
        <div>
          <p className="eyebrow">US11</p>
          <h2>Ouvidoria Anônima</h2>
          <p className="muted">
            Registre irregularidades sem informar nome, telefone ou família.
          </p>
        </div>
      </div>

      {protocol && (
        <p className="status success">
          Denúncia registrada. Protocolo: <strong>{protocol}</strong>
        </p>
      )}
      {error && <p className="status error">{error}</p>}

      <form className="complaint-form" onSubmit={handleSubmit} noValidate>
        <label>
          Categoria
          <select name="category" required>
            {complaintCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Região
          <select name="region_id">
            <option value="">Não informar</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Código da Viela / Referência
          <input name="codigo_viela" placeholder="Ex: Viela Azul" />
        </label>

        <label className="complaint-description">
          Descrição da denúncia
          <textarea
            name="description"
            minLength={10}
            rows={4}
            placeholder="Descreva o que aconteceu, sem informar sua identidade."
            required
          />
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : "Registrar denúncia"}
        </button>
      </form>
    </section>
  );
}

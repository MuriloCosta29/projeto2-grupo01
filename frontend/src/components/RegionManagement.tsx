import type { FormEvent } from "react";
import { useState } from "react";

import type { CreateRegionPayload } from "../services/api";
import type { Region } from "../types";
import { EmptyState } from "./ui/EmptyState";

type RegionManagementProps = {
  regions: Region[];
  isSaving: boolean;
  error: string;
  success: string;
  onCreateRegion: (payload: CreateRegionPayload) => Promise<void>;
};

export function RegionManagement({
  regions,
  isSaving,
  error,
  success,
  onCreateRegion,
}: RegionManagementProps) {
  const [localError, setLocalError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nome = String(formData.get("nome") || "").trim();

    setLocalError("");

    if (!nome) {
      setLocalError("Informe o nome da região.");
      return;
    }

    await onCreateRegion({
      nome,
    });

    form.reset();
  }

  return (
    <section className="panel region-management" data-testid="region-management">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Cadastro de Regiões</h2>
          <p className="muted">
            Crie regiões para vincular famílias, Presidentes de Rua e avisos.
          </p>
        </div>
        <span>{regions.length} ativas</span>
      </div>

      {success && <p className="status success">{success}</p>}
      {localError && <p className="status error">{localError}</p>}
      {error && <p className="status error">{error}</p>}

      <form className="region-management-form" onSubmit={handleSubmit} noValidate>
        <label>
          Nome da região
          <input
            name="nome"
            placeholder="Ex: Recife"
            required
            disabled={isSaving}
          />
        </label>

        <button type="submit" data-testid="region-submit" disabled={isSaving}>
          {isSaving ? "Cadastrando..." : "Cadastrar Região"}
        </button>
      </form>

      {regions.length === 0 ? (
        <EmptyState
          compact
          title="Nenhuma região cadastrada"
          description="Cadastre a primeira região para liberar filtros, avisos e vínculos operacionais."
        />
      ) : (
        <div className="region-chip-list" aria-label="Regiões cadastradas">
          {regions.map((region) => (
            <span key={region.id}>{region.nome}</span>
          ))}
        </div>
      )}
    </section>
  );
}

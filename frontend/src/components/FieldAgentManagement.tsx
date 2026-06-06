import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import type {
  CreateFieldAgentPayload,
  UpdateFieldAgentPayload,
} from "../services/api";
import type { FieldAgent, Region } from "../types";

type FieldAgentManagementProps = {
  agents: FieldAgent[];
  regions: Region[];
  selectedAgent: FieldAgent | null;
  isSaving: boolean;
  error: string;
  success: string;
  onCreateAgent: (payload: CreateFieldAgentPayload) => Promise<void>;
  onUpdateAgent: (
    agentId: number,
    payload: UpdateFieldAgentPayload,
  ) => Promise<void>;
};

export function FieldAgentManagement({
  agents,
  regions,
  selectedAgent,
  isSaving,
  error,
  success,
  onCreateAgent,
  onUpdateAgent,
}: FieldAgentManagementProps) {
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editCodigoArea, setEditCodigoArea] = useState("");
  const [editRegionId, setEditRegionId] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);

  useEffect(() => {
    setEditNome(selectedAgent?.nome ?? "");
    setEditTelefone(selectedAgent?.telefone ?? "");
    setEditCodigoArea(selectedAgent?.codigo_area ?? "");
    setEditRegionId(selectedAgent?.region?.id ? String(selectedAgent.region.id) : "");
    setEditAtivo(selectedAgent?.ativo ?? true);
  }, [selectedAgent]);

  async function handleCreateAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const regionId = Number(formData.get("region_id"));

    await onCreateAgent({
      ...(regionId ? { region_id: regionId } : {}),
      nome: String(formData.get("nome") || ""),
      telefone: String(formData.get("telefone") || ""),
      codigo_area: String(formData.get("codigo_area") || ""),
      ativo: true,
    });

    form.reset();
  }

  async function handleUpdateAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAgent) {
      return;
    }

    const regionId = Number(editRegionId);

    await onUpdateAgent(selectedAgent.id, {
      region_id: regionId || null,
      nome: editNome,
      telefone: editTelefone,
      codigo_area: editCodigoArea,
      ativo: editAtivo,
    });
  }

  async function handleToggleAgentStatus(agent: FieldAgent) {
    await onUpdateAgent(agent.id, {
      ativo: !agent.ativo,
    });
  }

  return (
    <section className="panel field-agent-management">
      <div className="panel-header">
        <div>
          <p className="eyebrow">US14</p>
          <h2>Gestão de Presidentes de Rua</h2>
          <p className="muted">
            Cadastre, edite e controle agentes que atuam em campo.
          </p>
        </div>
        <span>{agents.length} cadastrados</span>
      </div>

      {success && <p className="status success">{success}</p>}
      {error && <p className="status error">{error}</p>}

      <form className="agent-management-form" onSubmit={handleCreateAgent}>
        <label>
          Nome
          <input name="nome" required />
        </label>

        <label>
          WhatsApp / telefone
          <input name="telefone" type="tel" />
        </label>

        <label>
          Código de área
          <input name="codigo_area" />
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

        <button type="submit" disabled={isSaving}>
          Cadastrar Presidente
        </button>
      </form>

      <div className="agent-management-grid">
        <div className="managed-agent-list">
          {agents.map((agent) => (
            <article key={agent.id} className="managed-agent-card">
              <div>
                <strong>{agent.nome}</strong>
                <span>{agent.region?.nome ?? "Sem região"}</span>
                <small>{agent.ativo ? "Ativo" : "Inativo"}</small>
              </div>

              <button
                type="button"
                onClick={() => handleToggleAgentStatus(agent)}
                disabled={isSaving}
              >
                {agent.ativo ? "Desativar" : "Reativar"}
              </button>
            </article>
          ))}
        </div>

        <form className="agent-edit-form" onSubmit={handleUpdateAgent}>
          <h3>Editar selecionado</h3>

          {!selectedAgent && (
            <p className="muted">
              Selecione um agente no monitoramento para editar seus dados.
            </p>
          )}

          {selectedAgent && (
            <>
              <label>
                Nome
                <input
                  value={editNome}
                  onChange={(event) => setEditNome(event.target.value)}
                  required
                />
              </label>

              <label>
                WhatsApp / telefone
                <input
                  type="tel"
                  value={editTelefone}
                  onChange={(event) => setEditTelefone(event.target.value)}
                />
              </label>

              <label>
                Código de área
                <input
                  value={editCodigoArea}
                  onChange={(event) => setEditCodigoArea(event.target.value)}
                />
              </label>

              <label>
                Região
                <select
                  value={editRegionId}
                  onChange={(event) => setEditRegionId(event.target.value)}
                >
                  <option value="">Não informar</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="agent-status-toggle">
                <input
                  type="checkbox"
                  checked={editAtivo}
                  onChange={(event) => setEditAtivo(event.target.checked)}
                />
                Ativo
              </label>

              <button type="submit" disabled={isSaving}>
                Salvar alterações
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

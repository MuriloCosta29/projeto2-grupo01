import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import type {
  CreateFieldAgentPayload,
  UpdateFieldAgentPayload,
} from "../services/api";
import type { FieldAgent, Region } from "../types";
import { EmptyState } from "./ui/EmptyState";

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
  const [editAreaAtuacao, setEditAreaAtuacao] = useState("");
  const [editRegionId, setEditRegionId] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");

  useEffect(() => {
    setEditNome(selectedAgent?.nome ?? "");
    setEditTelefone(selectedAgent?.telefone ?? "");
    setEditAreaAtuacao(selectedAgent?.area_atuacao ?? "");
    setEditRegionId(selectedAgent?.region?.id ? String(selectedAgent.region.id) : "");
    setEditAtivo(selectedAgent?.ativo ?? true);
    setEditError("");
  }, [selectedAgent]);

  async function handleCreateAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const regionId = Number(formData.get("region_id"));
    const nome = String(formData.get("nome") || "").trim();

    setCreateError("");

    if (!nome) {
      setCreateError("Informe o nome do Presidente de Rua.");
      return;
    }

    await onCreateAgent({
      ...(regionId ? { region_id: regionId } : {}),
      nome,
      telefone: String(formData.get("telefone") || ""),
      area_atuacao: String(formData.get("area_atuacao") || ""),
      ativo: true,
    });

    form.reset();
  }

  async function handleUpdateAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAgent) {
      setEditError("Selecione um Presidente de Rua para editar.");
      return;
    }

    const regionId = Number(editRegionId);
    const nome = editNome.trim();

    setEditError("");

    if (!nome) {
      setEditError("Informe o nome do Presidente de Rua.");
      return;
    }

    await onUpdateAgent(selectedAgent.id, {
      region_id: regionId || null,
      nome,
      telefone: editTelefone,
      area_atuacao: editAreaAtuacao,
      ativo: editAtivo,
    });
  }

  async function handleToggleAgentStatus(agent: FieldAgent) {
    await onUpdateAgent(agent.id, {
      ativo: !agent.ativo,
    });
  }

  return (
    <>
      <section className="panel field-agent-management">
        <div className="panel-header">
          <div>
            <p className="eyebrow">US14</p>
            <h2>Cadastrar Presidente de Rua</h2>
            <p className="muted">
              Registre novos agentes responsáveis pela operação em campo.
            </p>
          </div>
          <span>{agents.length} cadastrados</span>
        </div>

        {success && <p className="status success">{success}</p>}
        {createError && <p className="status error">{createError}</p>}
        {error && <p className="status error">{error}</p>}

        <form
          className="agent-management-form"
          onSubmit={handleCreateAgent}
          noValidate
        >
          <label>
            Nome
            <input name="nome" required />
          </label>

          <label>
            WhatsApp / telefone
            <input name="telefone" type="tel" />
          </label>

          <label>
            Área de atuação
            <input name="area_atuacao" placeholder="Ex: Viela Azul" />
          </label>

          <label className="agent-region-field">
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

          <button
            type="submit"
            className="agent-submit-button"
            disabled={isSaving}
          >
            Cadastrar Presidente
          </button>
        </form>
      </section>

      <section className="panel field-agent-editor">
        <div className="panel-header">
          <div>
            <p className="eyebrow">US14</p>
            <h2>Editar Presidentes cadastrados</h2>
            <p className="muted">
              Selecione um Presidente de Rua para alterar dados ou status.
            </p>
          </div>
        </div>

        <div className="agent-management-grid">
          <div className="managed-agent-list">
            {agents.length === 0 && (
              <EmptyState
                compact
                title="Nenhum Presidente cadastrado"
                description="Use a seção de cadastro para criar o primeiro agente em campo."
              />
            )}

            {agents.map((agent) => (
              <article key={agent.id} className="managed-agent-card">
                <div>
                  <strong>{agent.nome}</strong>
                  <span>
                    {agent.region?.nome ||
                      agent.area_atuacao ||
                      "Área não informada"}
                  </span>
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

          <form
            className="agent-edit-form"
            onSubmit={handleUpdateAgent}
            noValidate
          >
            <h3>Dados do Presidente selecionado</h3>

            {editError && <p className="status error">{editError}</p>}

            {!selectedAgent && (
              <EmptyState
                compact
                className="agent-edit-empty-state"
                title="Nenhum Presidente selecionado"
                description="Selecione um Presidente de Rua na lista para editar seus dados."
              />
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
                  Área de atuação
                  <input
                    value={editAreaAtuacao}
                    placeholder="Ex: Viela Azul"
                    onChange={(event) => setEditAreaAtuacao(event.target.value)}
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
    </>
  );
}

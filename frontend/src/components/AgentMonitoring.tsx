import type { FieldAgent } from "../types";
import { EmptyState } from "./ui/EmptyState";

type AgentMonitoringProps = {
  agents: FieldAgent[];
  selectedAgent: FieldAgent | null;
  onSelectAgent: (agent: FieldAgent) => void;
};

export function AgentMonitoring({
  agents,
  selectedAgent,
  onSelectAgent,
}: AgentMonitoringProps) {
  return (
    <section className="panel agent-monitoring">
      <div className="panel-header">
        <div>
          <p className="eyebrow">US09</p>
          <h2>Agentes em Campo</h2>
          <p className="muted">
            Acompanhe atuação, entregas registradas e famílias atendidas.
          </p>
        </div>
        <span>{agents.length} agentes</span>
      </div>

      {agents.length === 0 && (
        <EmptyState
          compact
          title="Nenhum Presidente de Rua cadastrado"
          description="Cadastre um agente para acompanhar famílias atendidas, frequência e entregas em campo."
        />
      )}

      {agents.length > 0 && (
        <div className="agent-monitoring-grid">
          <div className="agent-list">
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={
                  agent.id === selectedAgent?.id
                    ? "agent-card agent-card-selected"
                    : "agent-card"
                }
                onClick={() => onSelectAgent(agent)}
              >
                <strong>{agent.nome}</strong>
                <span>
                  {agent.region?.nome ?? (agent.codigo_area || "Área não informada")}
                </span>
                {agent.telefone && <small>{agent.telefone}</small>}
                <small
                  className={
                    agent.ativo ? "agent-status-active" : "agent-status-inactive"
                  }
                >
                  {agent.ativo ? "Ativo" : "Inativo"}
                </small>
              </button>
            ))}
          </div>

          <div className="agent-details">
            {!selectedAgent && (
              <EmptyState
                compact
                title="Selecione um Presidente de Rua"
                description="Os indicadores de atendimento aparecerão neste painel."
              />
            )}

            {selectedAgent && (
              <>
                <h3>{selectedAgent.nome}</h3>

                <div className="agent-metrics">
                  <article>
                    <span>Famílias atribuídas</span>
                    <strong>{selectedAgent.assigned_families_count}</strong>
                  </article>
                  <article>
                    <span>Famílias atendidas</span>
                    <strong>{selectedAgent.attended_families_count}</strong>
                  </article>
                  <article>
                    <span>Entregas registradas</span>
                    <strong>{selectedAgent.deliveries_count}</strong>
                  </article>
                </div>

                <h4>Famílias atendidas</h4>

                {selectedAgent.attended_families.length === 0 && (
                  <EmptyState
                    compact
                    title="Nenhuma família atendida"
                    description="Quando este agente registrar entregas, as famílias aparecerão aqui."
                  />
                )}

                {selectedAgent.attended_families.length > 0 && (
                  <ul className="attended-family-list">
                    {selectedAgent.attended_families.map((family) => (
                      <li key={family.id}>{family.nome_responsavel}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

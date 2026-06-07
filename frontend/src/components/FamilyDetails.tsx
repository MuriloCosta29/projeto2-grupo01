import type { Family, FieldAgent } from "../types";
import { EmptyState } from "./ui/EmptyState";

type FamilyDetailsProps = {
  family: Family | null;
  agents: FieldAgent[];
  selectedDeliveryAgentId: number | null;
  isRegisteringDelivery: boolean;
  deliveryError: string;
  deliverySuccess: string;
  onSelectDeliveryAgent: (agentId: number | null) => void;
  onRegisterDelivery: (family: Family, agentId: number | null) => void;
};

export function FamilyDetails({
  family,
  agents,
  selectedDeliveryAgentId,
  isRegisteringDelivery,
  deliveryError,
  deliverySuccess,
  onSelectDeliveryAgent,
  onRegisterDelivery,
}: FamilyDetailsProps) {
  if (!family) {
    return (
      <section className="panel">
        <h2>Histórico de entregas</h2>
        <EmptyState
          compact
          title="Nenhuma família selecionada"
          description="Selecione uma família na fila para consultar ou registrar entregas."
        />
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Histórico de entregas</h2>

      <div className="family-detail-header">
        <strong>{family.nome_responsavel}</strong>
        <span>{family.codigo_viela}</span>
        <small>{family.quantidade_moradores} moradores</small>
      </div>

      <div className="delivery-actions">
        <label>
          Presidente de Rua responsável
          <select
            value={selectedDeliveryAgentId ?? ""}
            onChange={(event) => {
              onSelectDeliveryAgent(
                event.target.value ? Number(event.target.value) : null,
              );
            }}
          >
            <option value="">Sem agente vinculado</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.nome}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onRegisterDelivery(family, selectedDeliveryAgentId)}
          disabled={isRegisteringDelivery}
        >
          {isRegisteringDelivery ? "Registrando..." : "Confirmar Entrega"}
        </button>
      </div>

      {deliveryError && <p className="status error">{deliveryError}</p>}
      {deliverySuccess && <p className="status success">{deliverySuccess}</p>}

      {(!family.deliveries || family.deliveries.length === 0) && (
        <EmptyState
          compact
          title="Nenhuma entrega registrada"
          description="Quando uma cesta for confirmada, o histórico aparecerá aqui."
        />
      )}

      {family.deliveries && family.deliveries.length > 0 && (
        <div className="delivery-list">
          {family.deliveries.map((delivery) => (
            <article key={delivery.id} className="delivery-card">
              <strong>
                {new Date(delivery.delivery_date).toLocaleDateString("pt-BR")}
              </strong>
              {delivery.notes && <p>{delivery.notes}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

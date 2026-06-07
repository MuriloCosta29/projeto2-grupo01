// Cria lista de famílias

import type { Family } from "../types";
import { EmptyState } from "./ui/EmptyState";

type FamilyListProps = {
  families: Family[];
  selectedFamilyId: number | null;
  onSelectFamily: (family: Family) => void;
};

export function FamilyList({
  families,
  selectedFamilyId,
  onSelectFamily,
}: FamilyListProps) {
  function getPriorityStatus(family: Family) {
    const lastDelivery = family.deliveries?.[0];

    if (!lastDelivery) {
      return "Nunca recebeu";
    }

    return `Última entrega em ${new Intl.DateTimeFormat("pt-BR").format(
      new Date(`${lastDelivery.delivery_date}T00:00:00`),
    )}`;
  }

  if (families.length === 0) {
    return (
      <section className="panel">
        <h2>Fila de Prioridade</h2>
        <EmptyState
          compact
          title="Nenhuma família cadastrada"
          description="Cadastre famílias para montar a fila de prioridade por tempo de espera."
        />
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">US04</p>
          <h2>Fila de Prioridade</h2>
        </div>
        <span>{families.length} famílias</span>
      </div>

      <div className="family-list">
        {families.map((family, index) => (
          <button
            key={family.id}
            type="button"
            className={
              family.id === selectedFamilyId
                ? "family-card family-card-selected"
                : "family-card"
            }
            onClick={() => onSelectFamily(family)}
          >
            <span className="priority-position">#{index + 1}</span>
            <strong>{family.nome_responsavel}</strong>
            <span>{family.codigo_viela}</span>
            <small>
              {family.quantidade_moradores} moradores
              {family.bairro ? ` · ${family.bairro}` : ""}
            </small>
            <em>{getPriorityStatus(family)}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

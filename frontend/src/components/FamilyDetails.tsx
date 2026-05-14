import type { Family } from "../types";

type FamilyDetailsProps = {
  family: Family | null;
};

export function FamilyDetails({ family }: FamilyDetailsProps) {
  if (!family) {
    return (
      <section className="panel">
        <h2>Histórico de entregas</h2>
        <p className="muted">Selecione uma família para ver o histórico.</p>
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

      {(!family.deliveries || family.deliveries.length === 0) && (
        <p className="muted">Nenhuma entrega registrada para esta família.</p>
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

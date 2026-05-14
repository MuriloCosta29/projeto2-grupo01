// Cria lista de famílias

import type { Family } from "../types";

type FamilyListProps = {
  families: Family[];
};

export function FamilyList({ families }: FamilyListProps) {
  if (families.length === 0) {
    return (
      <section className="panel">
        <h2>Famílias cadastradas</h2>
        <p className="muted">Nenhuma família cadastrada ainda.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Famílias cadastradas</h2>

      <div className="family-list">
        {families.map((family) => (
          <article key={family.id} className="family-card">
            <strong>{family.nome_responsavel}</strong>
            <span>{family.codigo_viela}</span>
            <small>
              {family.quantidade_moradores} moradores
              {family.bairro ? ` · ${family.bairro}` : ""}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}


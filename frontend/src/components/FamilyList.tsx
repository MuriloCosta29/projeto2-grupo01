// Cria lista de famílias

import type { Family } from "../types";

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
            <strong>{family.nome_responsavel}</strong>
            <span>{family.codigo_viela}</span>
            <small>
              {family.quantidade_moradores} moradores
              {family.bairro ? ` · ${family.bairro}` : ""}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

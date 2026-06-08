import { Calendar, MapPin, Search, Users } from "lucide-react";

import { FamilyDetails } from "../components/FamilyDetails";
import { AppTopbar } from "../components/ui/AppTopbar";
import { EmptyState } from "../components/ui/EmptyState";
import { getWaitingDays, getWaitingLabel } from "../utils/familyPriority";
import type { Family, FieldAgent } from "../types";

export type OperationalStatusFilter = "all" | "pending" | "received";
export type WaitFilter = "all" | "30" | "60" | "90";

type FamilyListScreenProps = {
  families: Family[];
  filteredFamilies: Family[];
  loading: boolean;
  error: string;
  searchTerm: string;
  waitFilter: WaitFilter;
  statusFilter: OperationalStatusFilter;
  selectedFamily: Family | null;
  agents: FieldAgent[];
  selectedDeliveryAgentId: number | null;
  isRegisteringDelivery: boolean;
  deliveryError: string;
  deliverySuccess: string;
  onBack: () => void;
  onCreateFamily: () => void;
  onSearchTermChange: (value: string) => void;
  onWaitFilterChange: (value: WaitFilter) => void;
  onStatusFilterChange: (value: OperationalStatusFilter) => void;
  onSelectFamily: (family: Family) => void;
  onSelectDeliveryAgent: (agentId: number | null) => void;
  onRegisterDelivery: (family: Family, agentId: number | null) => void;
};

export function FamilyListScreen({
  families,
  filteredFamilies,
  loading,
  error,
  searchTerm,
  waitFilter,
  statusFilter,
  selectedFamily,
  agents,
  selectedDeliveryAgentId,
  isRegisteringDelivery,
  deliveryError,
  deliverySuccess,
  onBack,
  onCreateFamily,
  onSearchTermChange,
  onWaitFilterChange,
  onStatusFilterChange,
  onSelectFamily,
  onSelectDeliveryAgent,
  onRegisterDelivery,
}: FamilyListScreenProps) {
  return (
    <main className="pilar-gradient app-screen">
      <AppTopbar
        title="Lista de Famílias"
        subtitle="Ordenadas por tempo de espera"
        onBack={onBack}
        onProfileClick={onBack}
      />

      <section className="screen-content">
        <section className="filter-card">
          <label className="search-field">
            <Search size={22} />
            <input
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="Buscar por nome, bairro, região ou CEP..."
            />
          </label>

          <div className="filter-group">
            <span>Tempo de espera</span>
            <div>
              {(["all", "30", "60", "90"] as WaitFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={waitFilter === filter ? "is-active" : ""}
                  onClick={() => onWaitFilterChange(filter)}
                >
                  {filter === "all" ? "Todas" : `+${filter} dias`}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span>Status de recebimento</span>
            <div>
              <button
                type="button"
                className={statusFilter === "all" ? "is-active cyan" : ""}
                onClick={() => onStatusFilterChange("all")}
              >
                Todas
              </button>
              <button
                type="button"
                className={statusFilter === "received" ? "is-active cyan" : ""}
                onClick={() => onStatusFilterChange("received")}
              >
                Já Receberam
              </button>
              <button
                type="button"
                className={statusFilter === "pending" ? "is-active cyan" : ""}
                onClick={() => onStatusFilterChange("pending")}
              >
                Precisam Receber
              </button>
            </div>
          </div>

          <p>
            <Users size={18} /> {filteredFamilies.length} de {families.length}{" "}
            famílias
          </p>
        </section>

        {loading && <p className="status">Carregando famílias...</p>}
        {error && <p className="status error">{error}</p>}

        <section className="figma-family-list">
          {filteredFamilies.length === 0 && !loading && (
            <EmptyState
              title="Nenhuma família encontrada"
              description="Revise os filtros ou cadastre uma nova família para alimentar a fila."
              action={
                <button
                  type="button"
                  className="secondary-action"
                  onClick={onCreateFamily}
                >
                  Cadastrar Família
                </button>
              }
            />
          )}

          {filteredFamilies.map((family) => (
            <button
              key={family.id}
              type="button"
              className={
                selectedFamily?.id === family.id
                  ? "figma-family-card selected"
                  : "figma-family-card"
              }
              onClick={() => onSelectFamily(family)}
            >
              <span className="family-icon">
                <Users size={30} />
              </span>
              <div>
                <strong>{family.nome_responsavel}</strong>
                <small>
                  <MapPin size={17} />
                  {family.codigo_viela}
                  {family.region?.nome ? ` - ${family.region.nome}` : ""}
                </small>
                <small>
                  <Users size={17} />
                  {family.quantidade_moradores} pessoas
                </small>
                {family.observacoes && <p>{family.observacoes}</p>}
              </div>
              <span
                className={
                  getWaitingDays(family) >= 30
                    ? "days-card priority"
                    : "days-card"
                }
              >
                <Calendar size={22} />
                <strong>{getWaitingLabel(family)}</strong>
                {getWaitingDays(family) >= 30 && <small>Prioritária</small>}
              </span>
            </button>
          ))}
        </section>

        <FamilyDetails
          family={selectedFamily}
          agents={agents}
          selectedDeliveryAgentId={selectedDeliveryAgentId}
          isRegisteringDelivery={isRegisteringDelivery}
          deliveryError={deliveryError}
          deliverySuccess={deliverySuccess}
          onSelectDeliveryAgent={onSelectDeliveryAgent}
          onRegisterDelivery={onRegisterDelivery}
        />
      </section>
    </main>
  );
}

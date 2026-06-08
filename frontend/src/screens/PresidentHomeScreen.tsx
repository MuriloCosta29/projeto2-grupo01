import {
  Box,
  Clock3,
  ListChecks,
  MessageCircle,
  Plus,
  Users,
} from "lucide-react";

import { AppTopbar } from "../components/ui/AppTopbar";
import { EmptyState } from "../components/ui/EmptyState";
import { MetricCard } from "../components/ui/MetricCard";
import { getWaitingDays, getWaitingLabel } from "../utils/familyPriority";
import type { Family } from "../types";

type PresidentHomeScreenProps = {
  families: Family[];
  todaysDeliveriesCount: number;
  familiesWaitingMoreThan30DaysCount: number;
  agentName?: string;
  supportWhatsappUrl: string;
  onBack: () => void;
  onCreateFamily: () => void;
  onViewFamilies: () => void;
  onSelectFamily: (family: Family) => void;
};

export function PresidentHomeScreen({
  families,
  todaysDeliveriesCount,
  familiesWaitingMoreThan30DaysCount,
  agentName,
  supportWhatsappUrl,
  onBack,
  onCreateFamily,
  onViewFamilies,
  onSelectFamily,
}: PresidentHomeScreenProps) {
  const priorityFamilies = families.slice(0, 5);

  return (
    <main className="pilar-gradient app-screen">
      <AppTopbar
        title="PILAR"
        subtitle={agentName ?? "Presidente de Rua"}
        onBack={onBack}
        onProfileClick={onBack}
      />

      <section className="screen-content">
        <div className="metric-grid">
          <MetricCard
            label="Famílias Cadastradas"
            value={families.length}
            icon={<Users size={28} />}
            tone="blue"
          />
          <MetricCard
            label="Entregas Hoje"
            value={todaysDeliveriesCount}
            icon={<Box size={28} />}
            tone="green"
          />
          <MetricCard
            label="Aguardando +30 dias"
            value={familiesWaitingMoreThan30DaysCount}
            icon={<Clock3 size={28} />}
            tone="orange"
          />
        </div>

        <section className="quick-actions">
          <h2>Ações Rápidas</h2>
          <div className="action-grid">
            <button
              type="button"
              className="action-card primary"
              onClick={onCreateFamily}
            >
              <span>
                <Plus size={32} />
              </span>
              <div>
                <strong>Cadastrar Família</strong>
                <small>Adicionar nova família ao sistema</small>
              </div>
            </button>

            <button
              type="button"
              className="action-card"
              onClick={onViewFamilies}
            >
              <span>
                <ListChecks size={32} />
              </span>
              <div>
                <strong>Ver Famílias</strong>
                <small>Lista completa ordenada por espera</small>
              </div>
            </button>
          </div>
        </section>

        <section className="priority-panel">
          <h2>Famílias Prioritárias</h2>
          <div className="priority-list compact">
            {priorityFamilies.length === 0 && (
              <EmptyState
                compact
                title="Nenhuma família prioritária ainda"
                description="Cadastre a primeira família para iniciar a fila de prioridade."
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
            {priorityFamilies.map((family) => (
              <button
                key={family.id}
                type="button"
                className="priority-row"
                onClick={() => onSelectFamily(family)}
              >
                <div>
                  <strong>{family.nome_responsavel}</strong>
                  <small>
                    {family.region?.nome ?? family.codigo_viela} •{" "}
                    {family.quantidade_moradores} pessoas
                  </small>
                </div>
                <span
                  className={
                    getWaitingDays(family) >= 30
                      ? "waiting-badge alert"
                      : "waiting-badge"
                  }
                >
                  {getWaitingLabel(family)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <a
          className="floating-support"
          href={supportWhatsappUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Ajuda via WhatsApp"
        >
          <MessageCircle size={30} />
        </a>
      </section>
    </main>
  );
}

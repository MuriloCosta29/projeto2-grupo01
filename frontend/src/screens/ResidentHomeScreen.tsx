import { Bell, Box, Calendar, FileWarning, PackageCheck } from "lucide-react";

import { AppTopbar } from "../components/ui/AppTopbar";
import { EmptyState } from "../components/ui/EmptyState";
import { MetricCard } from "../components/ui/MetricCard";
import { formatDate, getWaitingLabel } from "../utils/familyPriority";
import type {
  BasketAvailabilityNotification,
  DeliveryLog,
  Family,
} from "../types";

type ResidentHomeScreenProps = {
  residentFamily: Family | null;
  deliveries: DeliveryLog[];
  readyNotifications: BasketAvailabilityNotification[];
  onBack: () => void;
  onOpenComplaint: () => void;
};

export function ResidentHomeScreen({
  residentFamily,
  deliveries,
  readyNotifications,
  onBack,
  onOpenComplaint,
}: ResidentHomeScreenProps) {
  return (
    <main className="pilar-gradient app-screen">
      <AppTopbar
        title="PILAR"
        subtitle={residentFamily?.nome_responsavel ?? "Morador"}
        onBack={onBack}
        onProfileClick={onBack}
      />

      <section className="screen-content">
        <div className="metric-grid">
          <MetricCard
            label="Cestas Recebidas"
            value={deliveries.length}
            icon={<PackageCheck size={28} />}
            tone="blue"
          />
          <MetricCard
            label="Dias desde última cesta"
            value={residentFamily ? getWaitingLabel(residentFamily) : "-"}
            icon={<Calendar size={28} />}
            tone="orange"
          />
          <MetricCard
            label="Notificações Novas"
            value={readyNotifications.length}
            icon={<Bell size={28} />}
            tone="cyan"
          />
        </div>

        <section className="resident-section">
          <div className="section-heading">
            <h2>Notificações</h2>
            <button type="button">Marcar todas como lidas</button>
          </div>

          {readyNotifications.length === 0 && (
            <EmptyState
              title="Nenhuma notificação disponível"
              description="Quando houver cesta liberada para retirada, o aviso aparecerá aqui."
            />
          )}

          {readyNotifications.slice(0, 2).map((notification) => (
            <article key={notification.id} className="wide-card notification">
              <span className="notice-icon">
                <Box size={28} />
              </span>
              <div>
                <strong>Sua cesta básica está disponível para retirada!</strong>
                <small>Data: {formatDate(notification.scheduled_for)}</small>
                <small>Local: {notification.pickup_location}</small>
                {notification.notification_url && (
                  <a
                    href={notification.notification_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir WhatsApp
                  </a>
                )}
              </div>
              <em>Nova</em>
            </article>
          ))}
        </section>

        <section className="resident-section">
          <h2>Histórico de Entregas</h2>
          <div className="delivery-history">
            {deliveries.length === 0 && (
              <EmptyState
                title="Nenhuma entrega registrada"
                description="O histórico aparecerá aqui após a primeira entrega confirmada."
              />
            )}
            {deliveries.map((delivery) => (
              <article key={delivery.id} className="wide-card history-card">
                <span className="notice-icon green">
                  <Box size={28} />
                </span>
                <div>
                  <strong>Cesta Básica Recebida</strong>
                  <small>{delivery.notes || "Entrega registrada."}</small>
                </div>
                <time>{formatDate(delivery.delivery_date)}</time>
              </article>
            ))}
          </div>
        </section>

        <button
          type="button"
          className="complaint-strip"
          onClick={onOpenComplaint}
        >
          <FileWarning size={26} />
          <span>
            <strong>Ouvidoria Anônima</strong>
            <small>Registre denúncias ou sugestões de forma anônima</small>
          </span>
        </button>
      </section>
    </main>
  );
}

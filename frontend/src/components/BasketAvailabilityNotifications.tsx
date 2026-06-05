import { useState } from "react";
import type { FormEvent } from "react";

import type { ProcessBasketAvailabilityPayload } from "../services/api";
import type { BasketAvailabilityNotification, Region } from "../types";

type BasketAvailabilityNotificationsProps = {
  regions: Region[];
  notifications: BasketAvailabilityNotification[];
  isProcessing: boolean;
  error: string;
  success: string;
  onProcess: (payload: ProcessBasketAvailabilityPayload) => Promise<void>;
};

export function BasketAvailabilityNotifications({
  regions,
  notifications,
  isProcessing,
  error,
  success,
  onProcess,
}: BasketAvailabilityNotificationsProps) {
  const [selectedRegionId, setSelectedRegionId] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const regionId = Number(formData.get("region_id"));

    await onProcess({
      region_id: regionId,
      scheduled_for: String(formData.get("scheduled_for") || ""),
      pickup_location: String(formData.get("pickup_location") || ""),
    });
  }

  return (
    <section className="panel basket-notifications">
      <div className="panel-header">
        <div>
          <p className="eyebrow">US10</p>
          <h2>Disponibilidade de Cestas</h2>
          <p className="muted">
            Processe avisos por região com horário e local de retirada.
          </p>
        </div>
      </div>

      {success && <p className="status success">{success}</p>}
      {error && <p className="status error">{error}</p>}

      <form className="notification-form" onSubmit={handleSubmit}>
        <label>
          Região
          <select
            name="region_id"
            required
            value={selectedRegionId}
            onChange={(event) => setSelectedRegionId(event.target.value)}
            disabled={regions.length === 0 || isProcessing}
          >
            <option value="">Selecione uma região</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Data e horário
          <input name="scheduled_for" type="datetime-local" required />
        </label>

        <label>
          Local de retirada
          <input name="pickup_location" required />
        </label>

        <button type="submit" disabled={isProcessing || regions.length === 0}>
          {isProcessing ? "Processando..." : "Processar avisos"}
        </button>
      </form>

      <div className="notification-list">
        {notifications.length === 0 && (
          <p className="muted">Nenhuma notificação processada ainda.</p>
        )}

        {notifications.map((notification) => (
          <article key={notification.id} className="notification-card">
            <div>
              <strong>{notification.family.nome_responsavel}</strong>
              <span>{notification.region?.nome ?? "Sem região"}</span>
            </div>

            <p>{notification.message}</p>

            <footer>
              <span>
                {notification.status === "ready"
                  ? "Pronta para WhatsApp"
                  : "Sem telefone cadastrado"}
              </span>

              {notification.notification_url && (
                <a
                  href={notification.notification_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir WhatsApp
                </a>
              )}
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}

import { useState } from "react";
import type { FormEvent } from "react";

import type { ProcessBasketAvailabilityPayload } from "../services/api";
import type { BasketAvailabilityNotification, Region } from "../types";
import { EmptyState } from "./ui/EmptyState";

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
  const [localError, setLocalError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const regionId = Number(formData.get("region_id"));
    const scheduledDate = String(formData.get("scheduled_date") || "");
    const scheduledTime = String(formData.get("scheduled_time") || "");
    const pickupLocation = String(formData.get("pickup_location") || "").trim();

    setLocalError("");

    if (!regionId) {
      setLocalError("Selecione uma região antes de processar os avisos.");
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      setLocalError("Informe a data e o horário de retirada.");
      return;
    }

    if (!pickupLocation) {
      setLocalError("Informe o local de retirada.");
      return;
    }

    await onProcess({
      region_id: regionId,
      scheduled_for: `${scheduledDate}T${scheduledTime}`,
      pickup_location: pickupLocation,
    });

    form.reset();
    setSelectedRegionId("");
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
      {localError && <p className="status error">{localError}</p>}
      {error && <p className="status error">{error}</p>}
      {regions.length === 0 && (
        <p className="status warning">
          Cadastre uma região antes de processar avisos de cesta.
        </p>
      )}

      <form className="notification-form" onSubmit={handleSubmit} noValidate>
        <label>
          Região
          <select
            name="region_id"
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
          Data da retirada
          <input name="scheduled_date" type="date" disabled={isProcessing} />
        </label>

        <label>
          Horário
          <input name="scheduled_time" type="time" disabled={isProcessing} />
        </label>

        <label>
          Local de retirada
          <input
            name="pickup_location"
            placeholder="Ex: Avenida Norte"
            disabled={isProcessing}
          />
        </label>

        <button type="submit" disabled={isProcessing || regions.length === 0}>
          {isProcessing ? "Processando..." : "Processar avisos"}
        </button>
      </form>

      <div className="notification-list">
        {notifications.length === 0 && (
          <EmptyState
            compact
            title="Nenhuma notificação processada"
            description="Quando um lote for liberado, os avisos por família aparecerão aqui."
          />
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

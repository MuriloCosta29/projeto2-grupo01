import { useEffect, useState } from "react";

import "./App.css";
import { FamilyList } from "./components/FamilyList";
import { FamilyForm } from "./components/FamilyForm.tsx";
import { FamilyDetails } from "./components/FamilyDetails";
import { getDashboardImpact, getFamilies, registerDelivery } from "./services/api";
import {
  getPendingFamiliesCount,
  syncPendingFamilies,
} from "./services/offlineFamilies";
import type { Family } from "./types";
import type { DashboardImpact } from "./types";

type OperationalStatusFilter = "all" | "pending" | "received";

// Número oficial do suporte configurado pela variável VITE_SUPPORT_WHATSAPP_NUMBER.
const supportWhatsappNumber = import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER ?? "";

const supportMessage = encodeURIComponent(
  "Olá, preciso de suporte operacional no Presidente de Rua.",
); // Mensagem automática que aparece no WhatsApp.

const supportWhatsappUrl = supportWhatsappNumber
  ? `https://wa.me/${supportWhatsappNumber}?text=${supportMessage}`
  : `https://wa.me/?text=${supportMessage}`;

function App() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [dashboardImpact, setDashboardImpact] = useState<DashboardImpact | null>(
    null,
  );
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [isRegisteringDelivery, setIsRegisteringDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliverySuccess, setDeliverySuccess] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<OperationalStatusFilter>("all");
  const [pendingOfflineFamiliesCount, setPendingOfflineFamiliesCount] =
    useState(0);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState("");

  const pendingFamilies = families.filter(
    (family) => !family.deliveries || family.deliveries.length === 0,
  );
  const receivedFamilies = families.filter(
    (family) => family.deliveries && family.deliveries.length > 0,
  );
  const filteredFamilies = families.filter((family) => {
    const hasDelivery = family.deliveries && family.deliveries.length > 0;

    if (statusFilter === "pending") {
      return !hasDelivery;
    }

    if (statusFilter === "received") {
      return hasDelivery;
    }

    return true;
  });

  function loadFamilies() {
    setLoading(true);

    return getFamilies()
      .then((data) => {
        setFamilies(data);
        setError("");
        setSelectedFamily((currentFamily) => {
          if (!currentFamily) {
            return data[0] ?? null;
          }

          return data.find((family) => family.id === currentFamily.id) ?? data[0] ?? null;
        });
      })
      .catch(() => {
        setError("Não foi possível carregar as famílias.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function loadDashboardImpact() {
    return getDashboardImpact()
      .then((data) => {
        setDashboardImpact(data);
        setDashboardError("");
      })
      .catch(() => {
        setDashboardError("Não foi possível carregar o dashboard.");
      });
  }

  function refreshPendingOfflineFamiliesCount() {
    setPendingOfflineFamiliesCount(getPendingFamiliesCount());
  }

  async function handleSyncPendingFamilies() {
    if (!navigator.onLine || getPendingFamiliesCount() === 0) {
      refreshPendingOfflineFamiliesCount();
      return;
    }

    setOfflineSyncMessage("Sincronizando cadastros offline...");

    const result = await syncPendingFamilies();

    refreshPendingOfflineFamiliesCount();

    if (result.syncedCount > 0 || result.duplicateCount > 0) {
      const syncedMessage =
        result.syncedCount > 0
          ? `${result.syncedCount} cadastro(s) offline sincronizado(s).`
          : "";
      const duplicateMessage =
        result.duplicateCount > 0
          ? `${result.duplicateCount} cadastro(s) duplicado(s) removido(s) da fila offline.`
          : "";

      setOfflineSyncMessage(
        [syncedMessage, duplicateMessage].filter(Boolean).join(" "),
      );
      await loadFamilies();
      await loadDashboardImpact();
      return;
    }

    if (result.remainingCount > 0) {
      setOfflineSyncMessage(
        "Ainda existem cadastros offline aguardando sincronização.",
      );
      return;
    }

    setOfflineSyncMessage("");
  }

  useEffect(() => {
    refreshPendingOfflineFamiliesCount();
    loadDashboardImpact();

    if (navigator.onLine && getPendingFamiliesCount() > 0) {
      handleSyncPendingFamilies();
      return;
    }

    loadFamilies();
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleSyncPendingFamilies);

    return () => {
      window.removeEventListener("online", handleSyncPendingFamilies);
    };
  }, []);

  async function handleRegisterDelivery(family: Family) {
    setIsRegisteringDelivery(true);
    setDeliveryError("");
    setDeliverySuccess("");

    try {
      await registerDelivery(family.id, {
        notes: "Entrega registrada pelo Presidente de Rua.",
      });
      setDeliverySuccess("Entrega registrada com sucesso.");
      await loadFamilies();
      await loadDashboardImpact();
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        setDeliveryError(caughtError.message);
        return;
      }

      setDeliveryError("Não foi possível registrar a entrega.");
    } finally {
      setIsRegisteringDelivery(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Presidente de Rua</p>
        <h1>Cadastro Familiar</h1>
        <p>
          Sistema de apoio ao Presidente de Rua para mapear famílias sem CEP
          oficial, evitar duplicidade e consultar histórico de entregas.
        </p>
      </section>

      <section className="panel support-panel">
        <div>
          <p className="eyebrow">US07</p>
          <h2>Suporte Operacional</h2>
          <p className="muted">
            Acione a central do G10 Favelas em caso de dificuldade técnica ou
            conflito em campo.
          </p>
        </div>

        <a
          className="support-link"
          href={supportWhatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          Ajuda via WhatsApp
        </a>
      </section>

      <section className="panel impact-dashboard">
        <div>
          <p className="eyebrow">US08</p>
          <h2>Impacto da Distribuição</h2>
          <p className="muted">Total de cestas básicas entregues.</p>
        </div>

        <strong>{dashboardImpact?.total_deliveries ?? 0}</strong>
      </section>

      {loading && <p className="status">Carregando famílias...</p>}
      {error && <p className="status error">{error}</p>}
      {dashboardError && <p className="status error">{dashboardError}</p>}
      {pendingOfflineFamiliesCount > 0 && (
        <p className="status warning">
          {pendingOfflineFamiliesCount} cadastro(s) offline aguardando
          sincronização.
        </p>
      )}
      {offlineSyncMessage && <p className="status success">{offlineSyncMessage}</p>}

      <FamilyForm
        onFamilyCreated={loadFamilies}
        onOfflineFamilySaved={refreshPendingOfflineFamiliesCount}
      />

      {!loading && !error && (
        <>
          <section className="panel operational-filter">
            <div className="panel-header">
              <div>
                <p className="eyebrow">US12</p>
                <h2>Status em Campo</h2>
              </div>
            </div>

            <div className="filter-actions" aria-label="Filtrar status de recebimento">
              <button
                type="button"
                className={statusFilter === "all" ? "filter-active" : ""}
                onClick={() => setStatusFilter("all")}
              >
                Todos <span>{families.length}</span>
              </button>
              <button
                type="button"
                className={statusFilter === "pending" ? "filter-active" : ""}
                onClick={() => setStatusFilter("pending")}
              >
                Pendentes <span>{pendingFamilies.length}</span>
              </button>
              <button
                type="button"
                className={statusFilter === "received" ? "filter-active" : ""}
                onClick={() => setStatusFilter("received")}
              >
                Já receberam <span>{receivedFamilies.length}</span>
              </button>
            </div>
          </section>

          <FamilyList
            families={filteredFamilies}
            selectedFamilyId={selectedFamily?.id ?? null}
            onSelectFamily={setSelectedFamily}
          />
          <FamilyDetails
            family={selectedFamily}
            isRegisteringDelivery={isRegisteringDelivery}
            deliveryError={deliveryError}
            deliverySuccess={deliverySuccess}
            onRegisterDelivery={handleRegisterDelivery}
          />
        </>
      )}
    </main>
  );
}

export default App;

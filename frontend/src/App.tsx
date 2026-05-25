import { useEffect, useState } from "react";

import "./App.css";
import { FamilyList } from "./components/FamilyList";
import { FamilyForm } from "./components/FamilyForm.tsx";
import { FamilyDetails } from "./components/FamilyDetails";
import { getFamilies, registerDelivery } from "./services/api";
import type { Family } from "./types";

type OperationalStatusFilter = "all" | "pending" | "received";

function App() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRegisteringDelivery, setIsRegisteringDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliverySuccess, setDeliverySuccess] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<OperationalStatusFilter>("all");

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

  useEffect(() => {
    loadFamilies();
  }, []);

  async function handleRegisterDelivery(family: Family) {
    setIsRegisteringDelivery(true);
    setDeliveryError("");
    setDeliverySuccess("");

    try {
      await registerDelivery(family.id, {
        notes: "Entrega confirmada em campo.",
      });
      setDeliverySuccess("Entrega registrada com sucesso.");
      await loadFamilies();
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

      {loading && <p className="status">Carregando famílias...</p>}
      {error && <p className="status error">{error}</p>}

      <FamilyForm onFamilyCreated={loadFamilies} />

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

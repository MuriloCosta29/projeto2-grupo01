import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import "./App.css";
import { AdminLogin } from "./screens/AdminLogin";
import { AdminHomeScreen } from "./screens/AdminHomeScreen";
import { ComplaintScreen } from "./screens/ComplaintScreen";
import { EntryScreen } from "./screens/EntryScreen";
import { FamilyCreateScreen } from "./screens/FamilyCreateScreen";
import { FamilyListScreen } from "./screens/FamilyListScreen";
import type {
  OperationalStatusFilter,
  WaitFilter,
} from "./screens/FamilyListScreen";
import { PresidentHomeScreen } from "./screens/PresidentHomeScreen";
import { ResidentHomeScreen } from "./screens/ResidentHomeScreen";
import { ResidentLookup } from "./screens/ResidentLookup";
import { getWaitingDays, isSameDate } from "./utils/familyPriority";
import {
  createFieldAgent,
  createRegion,
  getBasketAvailabilityNotifications,
  getDashboardImpact,
  getFamilies,
  getFieldAgents,
  getRegionDeliveryImpact,
  getRegions,
  getStoredAuthToken,
  logout,
  processBasketAvailabilityNotifications,
  registerDelivery,
  SessionExpiredError,
  updateFieldAgent,
} from "./services/api";
import type {
  CreateFieldAgentPayload,
  CreateRegionPayload,
  ProcessBasketAvailabilityPayload,
  UpdateFieldAgentPayload,
} from "./services/api";
import {
  createPendingFamiliesBackup,
  getPendingFamiliesCount,
  restorePendingFamiliesBackup,
  syncPendingFamilies,
} from "./services/offlineFamilies";
import type {
  BasketAvailabilityNotification,
  DashboardImpact,
  Family,
  FieldAgent,
  Region,
  RegionDeliveryImpact,
} from "./types";

const supportWhatsappNumber = import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER ?? "";

const supportMessage = encodeURIComponent(
  "Ola, preciso de suporte operacional no Presidente de Rua.",
);

const supportWhatsappUrl = supportWhatsappNumber
  ? `https://wa.me/${supportWhatsappNumber}?text=${supportMessage}`
  : `https://wa.me/?text=${supportMessage}`;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    () => getStoredAuthToken() !== null,
  );
  const [families, setFamilies] = useState<Family[]>([]);
  const [fieldAgents, setFieldAgents] = useState<FieldAgent[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [basketAvailabilityNotifications, setBasketAvailabilityNotifications] =
    useState<BasketAvailabilityNotification[]>([]);
  const [regionDeliveryImpact, setRegionDeliveryImpact] = useState<
    RegionDeliveryImpact[]
  >([]);
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState<FieldAgent | null>(null);
  const [selectedDeliveryAgentId, setSelectedDeliveryAgentId] = useState<
    number | null
  >(null);
  const [dashboardImpact, setDashboardImpact] = useState<DashboardImpact | null>(
    null,
  );
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agentsError, setAgentsError] = useState("");
  const [dashboardError, setDashboardError] = useState("");
  const [regionDashboardError, setRegionDashboardError] = useState("");
  const [regionsError, setRegionsError] = useState("");
  const [regionManagementError, setRegionManagementError] = useState("");
  const [regionManagementSuccess, setRegionManagementSuccess] = useState("");
  const [isSavingRegion, setIsSavingRegion] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationsSuccess, setNotificationsSuccess] = useState("");
  const [isProcessingNotifications, setIsProcessingNotifications] =
    useState(false);
  const [agentManagementError, setAgentManagementError] = useState("");
  const [agentManagementSuccess, setAgentManagementSuccess] = useState("");
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [isRegisteringDelivery, setIsRegisteringDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliverySuccess, setDeliverySuccess] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<OperationalStatusFilter>("all");
  const [waitFilter, setWaitFilter] = useState<WaitFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingOfflineFamiliesCount, setPendingOfflineFamiliesCount] =
    useState(0);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState("");

  const todaysDeliveriesCount = families.reduce((total, family) => {
    const deliveriesToday =
      family.deliveries?.filter((delivery) =>
        isSameDate(delivery.delivery_date, new Date()),
      ).length ?? 0;

    return total + deliveriesToday;
  }, 0);

  const familiesWaitingMoreThan30Days = families.filter(
    (family) => getWaitingDays(family) >= 30,
  );

  const filteredFamilies = useMemo(() => {
    return families.filter((family) => {
      const hasDelivery = family.deliveries && family.deliveries.length > 0;
      const waitingDays = getWaitingDays(family);
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const searchableText = [
        family.nome_responsavel,
        family.codigo_viela,
        family.region?.nome,
        family.bairro,
        family.cep,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (statusFilter === "pending" && hasDelivery) {
        return false;
      }

      if (statusFilter === "received" && !hasDelivery) {
        return false;
      }

      if (waitFilter !== "all" && waitingDays < Number(waitFilter)) {
        return false;
      }

      return !normalizedSearch || searchableText.includes(normalizedSearch);
    });
  }, [families, searchTerm, statusFilter, waitFilter]);

  const [residentFamily, setResidentFamily] = useState<Family | null>(null);
  const residentDeliveries = residentFamily?.deliveries ?? [];
  const readyNotifications = basketAvailabilityNotifications.filter(
    (notification) => notification.status === "ready",
  );

  function refreshAll() {
    return Promise.all([
      loadFamilies(),
      loadDashboardImpact(),
      loadFieldAgents(),
      loadRegionDeliveryImpact(),
      loadRegions(),
      loadBasketAvailabilityNotifications(),
    ]);
  }

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

          return (
            data.find((family) => family.id === currentFamily.id) ??
            data[0] ??
            null
          );
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

  function loadFieldAgents() {
    return getFieldAgents()
      .then((data) => {
        setFieldAgents(data);
        setAgentsError("");
        setSelectedAgent((currentAgent) => {
          if (!currentAgent) {
            setSelectedDeliveryAgentId(data[0]?.id ?? null);
            return data[0] ?? null;
          }

          const nextAgent =
            data.find((agent) => agent.id === currentAgent.id) ??
            data[0] ??
            null;

          setSelectedDeliveryAgentId(nextAgent?.id ?? null);

          return nextAgent;
        });
      })
      .catch(() => {
        setAgentsError("Não foi possível carregar os agentes em campo.");
      });
  }

  function loadRegionDeliveryImpact() {
    return getRegionDeliveryImpact()
      .then((data) => {
        setRegionDeliveryImpact(data);
        setRegionDashboardError("");
        setSelectedRegion((currentRegion) => {
          if (
            currentRegion !== "all" &&
            !data.some((region) => region.region === currentRegion)
          ) {
            return "all";
          }

          return currentRegion;
        });
      })
      .catch(() => {
        setRegionDashboardError("Não foi possível carregar entregas por região.");
      });
  }

  function loadRegions() {
    return getRegions()
      .then((data) => {
        setRegions(data);
        setRegionsError("");
      })
      .catch(() => {
        setRegionsError("Não foi possível carregar as regiões.");
      });
  }

  function loadBasketAvailabilityNotifications() {
    return getBasketAvailabilityNotifications()
      .then((data) => {
        setBasketAvailabilityNotifications(data);
        setNotificationsError("");
      })
      .catch(() => {
        setNotificationsError("Não foi possível carregar as notificações.");
      });
  }

  function refreshPendingOfflineFamiliesCount() {
    setPendingOfflineFamiliesCount(getPendingFamiliesCount());
  }

  function handleDownloadOfflineBackup() {
    const backup = createPendingFamiliesBackup();
    const backupFile = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const backupUrl = URL.createObjectURL(backupFile);
    const downloadLink = document.createElement("a");
    const exportedAt = new Date().toISOString().slice(0, 10);

    downloadLink.href = backupUrl;
    downloadLink.download = `presidente-de-rua-cadastros-offline-${exportedAt}.json`;
    downloadLink.click();
    URL.revokeObjectURL(backupUrl);
  }

  async function handleRestoreOfflineBackup(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const backupFile = event.currentTarget.files?.[0];

    if (!backupFile) {
      return;
    }

    try {
      const backupContent = await backupFile.text();
      const result = restorePendingFamiliesBackup(JSON.parse(backupContent));

      refreshPendingOfflineFamiliesCount();
      setOfflineSyncMessage(
        `${result.restoredCount} cadastro(s) offline restaurado(s). ${result.duplicateCount} duplicado(s) ignorado(s).`,
      );
    } catch (caughtError) {
      if (caughtError instanceof Error) {
        setOfflineSyncMessage(caughtError.message);
      } else {
        setOfflineSyncMessage("Não foi possível restaurar o backup offline.");
      }
    } finally {
      event.currentTarget.value = "";
    }
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
      await refreshAll();
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
    loadFieldAgents();
    loadRegionDeliveryImpact();
    loadRegions();
    loadBasketAvailabilityNotifications();

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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);

  function handleSelectAgent(agent: FieldAgent) {
    setSelectedAgent(agent);
    setSelectedDeliveryAgentId(agent.id);
  }

  function handleSelectAdmin() {
    // A guarda da rota /admin redireciona para o login se não autenticado.
    navigate("/admin");
  }

  function handleAdminLoggedIn() {
    setIsAdminAuthenticated(true);
    navigate("/admin");
  }

  async function handleAdminLogout() {
    await logout();
    setIsAdminAuthenticated(false);
    navigate("/");
  }

  // Chamado quando uma ação de admin recebe 401 (token expirado/inválido):
  // volta para o login em vez de deixar o usuário preso num painel sem acesso.
  function handleSessionExpired() {
    setIsAdminAuthenticated(false);
    navigate("/admin/login");
  }

  async function handleRegisterDelivery(family: Family, agentId: number | null) {
    setIsRegisteringDelivery(true);
    setDeliveryError("");
    setDeliverySuccess("");

    try {
      await registerDelivery(family.id, {
        ...(agentId ? { agent_id: agentId } : {}),
        notes: "Entrega registrada pelo Presidente de Rua.",
      });
      setDeliverySuccess("Entrega registrada com sucesso.");
      await refreshAll();
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

  async function handleProcessBasketAvailabilityNotifications(
    payload: ProcessBasketAvailabilityPayload,
  ) {
    setIsProcessingNotifications(true);
    setNotificationsError("");
    setNotificationsSuccess("");

    try {
      const result = await processBasketAvailabilityNotifications(payload);

      setNotificationsSuccess(
        `${result.total_notifications} aviso(s) processado(s), ${result.created_count} novo(s).`,
      );
      await loadBasketAvailabilityNotifications();
    } catch (caughtError) {
      if (caughtError instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }

      if (caughtError instanceof Error) {
        setNotificationsError(caughtError.message);
        return;
      }

      setNotificationsError("Não foi possível processar os avisos.");
    } finally {
      setIsProcessingNotifications(false);
    }
  }

  async function handleCreateFieldAgent(payload: CreateFieldAgentPayload) {
    setIsSavingAgent(true);
    setAgentManagementError("");
    setAgentManagementSuccess("");

    try {
      await createFieldAgent(payload);
      setAgentManagementSuccess("Presidente de Rua cadastrado com sucesso.");
      await loadFieldAgents();
    } catch (caughtError) {
      if (caughtError instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }

      if (caughtError instanceof Error) {
        setAgentManagementError(caughtError.message);
        return;
      }

      setAgentManagementError("Não foi possível cadastrar Presidente de Rua.");
    } finally {
      setIsSavingAgent(false);
    }
  }

  async function handleCreateRegion(payload: CreateRegionPayload) {
    setIsSavingRegion(true);
    setRegionManagementError("");
    setRegionManagementSuccess("");

    try {
      await createRegion(payload);
      setRegionManagementSuccess("Região cadastrada com sucesso.");
      await Promise.all([loadRegions(), loadRegionDeliveryImpact()]);
    } catch (caughtError) {
      if (caughtError instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }

      if (caughtError instanceof Error) {
        setRegionManagementError(caughtError.message);
        return;
      }

      setRegionManagementError("Não foi possível cadastrar região.");
    } finally {
      setIsSavingRegion(false);
    }
  }

  async function handleUpdateFieldAgent(
    agentId: number,
    payload: UpdateFieldAgentPayload,
  ) {
    setIsSavingAgent(true);
    setAgentManagementError("");
    setAgentManagementSuccess("");

    try {
      await updateFieldAgent(agentId, payload);
      setAgentManagementSuccess("Presidente de Rua atualizado com sucesso.");
      await loadFieldAgents();
    } catch (caughtError) {
      if (caughtError instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }

      if (caughtError instanceof Error) {
        setAgentManagementError(caughtError.message);
        return;
      }

      setAgentManagementError("Não foi possível atualizar Presidente de Rua.");
    } finally {
      setIsSavingAgent(false);
    }
  }

  return (
    <>
      {(agentsError ||
        dashboardError ||
        regionDashboardError ||
        regionsError ||
        notificationsError) && (
        <div className="global-errors">
          {[
            agentsError,
            dashboardError,
            regionDashboardError,
            regionsError,
            notificationsError,
          ]
            .filter(Boolean)
            .map((message) => (
              <span key={message}>{message}</span>
            ))}
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={
            <EntryScreen
              onSelectPresident={() => navigate("/presidente")}
              onSelectResident={() => navigate("/morador/identificar")}
              onSelectAdmin={handleSelectAdmin}
              onSelectComplaint={() => navigate("/ouvidoria")}
            />
          }
        />
        <Route
          path="/presidente"
          element={
            <PresidentHomeScreen
              families={families}
              todaysDeliveriesCount={todaysDeliveriesCount}
              familiesWaitingMoreThan30DaysCount={
                familiesWaitingMoreThan30Days.length
              }
              agentName={selectedAgent?.nome}
              supportWhatsappUrl={supportWhatsappUrl}
              onBack={() => navigate("/")}
              onCreateFamily={() => navigate("/presidente/familias/nova")}
              onViewFamilies={() => navigate("/presidente/familias")}
              onSelectFamily={(family) => {
                setSelectedFamily(family);
                navigate("/presidente/familias");
              }}
            />
          }
        />
        <Route
          path="/presidente/familias/nova"
          element={
            <FamilyCreateScreen
              regions={regions}
              pendingOfflineFamiliesCount={pendingOfflineFamiliesCount}
              offlineSyncMessage={offlineSyncMessage}
              onBack={() => navigate("/presidente")}
              onFamilyCreated={async () => {
                await loadFamilies();
                navigate("/presidente/familias");
              }}
              onOfflineFamilySaved={refreshPendingOfflineFamiliesCount}
              onDownloadBackup={handleDownloadOfflineBackup}
              onRestoreBackup={handleRestoreOfflineBackup}
            />
          }
        />
        <Route
          path="/presidente/familias"
          element={
            <FamilyListScreen
              families={families}
              filteredFamilies={filteredFamilies}
              loading={loading}
              error={error}
              searchTerm={searchTerm}
              waitFilter={waitFilter}
              statusFilter={statusFilter}
              selectedFamily={selectedFamily}
              agents={fieldAgents}
              selectedDeliveryAgentId={selectedDeliveryAgentId}
              isRegisteringDelivery={isRegisteringDelivery}
              deliveryError={deliveryError}
              deliverySuccess={deliverySuccess}
              onBack={() => navigate("/presidente")}
              onCreateFamily={() => navigate("/presidente/familias/nova")}
              onSearchTermChange={setSearchTerm}
              onWaitFilterChange={setWaitFilter}
              onStatusFilterChange={setStatusFilter}
              onSelectFamily={setSelectedFamily}
              onSelectDeliveryAgent={setSelectedDeliveryAgentId}
              onRegisterDelivery={handleRegisterDelivery}
            />
          }
        />
        <Route
          path="/morador/identificar"
          element={
            <ResidentLookup
              onBack={() => navigate("/")}
              onFound={(family) => {
                setResidentFamily(family);
                navigate("/morador");
              }}
            />
          }
        />
        <Route
          path="/morador"
          element={
            residentFamily ? (
              <ResidentHomeScreen
                residentFamily={residentFamily}
                deliveries={residentDeliveries}
                readyNotifications={readyNotifications}
                onBack={() => navigate("/")}
                onOpenComplaint={() => navigate("/ouvidoria")}
              />
            ) : (
              // Acesso direto à URL sem ter se identificado: manda pro lookup.
              <Navigate to="/morador/identificar" replace />
            )
          }
        />
        <Route
          path="/admin/login"
          element={
            <AdminLogin
              onBack={() => navigate("/")}
              onLoggedIn={handleAdminLoggedIn}
            />
          }
        />
        <Route
          path="/admin"
          element={
            isAdminAuthenticated ? (
              <AdminHomeScreen
                dashboardImpact={dashboardImpact}
                fieldAgents={fieldAgents}
                regions={regions}
                regionDeliveryImpact={regionDeliveryImpact}
                selectedRegion={selectedRegion}
                selectedAgent={selectedAgent}
                basketAvailabilityNotifications={basketAvailabilityNotifications}
                isSavingRegion={isSavingRegion}
                regionManagementError={regionManagementError}
                regionManagementSuccess={regionManagementSuccess}
                isSavingAgent={isSavingAgent}
                agentManagementError={agentManagementError}
                agentManagementSuccess={agentManagementSuccess}
                isProcessingNotifications={isProcessingNotifications}
                notificationsError={notificationsError}
                notificationsSuccess={notificationsSuccess}
                onBack={() => navigate("/")}
                onLogout={handleAdminLogout}
                onSelectRegion={setSelectedRegion}
                onSelectAgent={handleSelectAgent}
                onCreateRegion={handleCreateRegion}
                onCreateAgent={handleCreateFieldAgent}
                onUpdateAgent={handleUpdateFieldAgent}
                onProcessNotifications={
                  handleProcessBasketAvailabilityNotifications
                }
              />
            ) : (
              // Guarda: sem autenticação, vai pro login.
              <Navigate to="/admin/login" replace />
            )
          }
        />
        <Route
          path="/ouvidoria"
          element={
            <ComplaintScreen regions={regions} onBack={() => navigate("/")} />
          }
        />
        {/* Qualquer rota desconhecida volta para a tela inicial. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;

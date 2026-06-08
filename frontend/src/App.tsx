import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Bell,
  Box,
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  FileWarning,
  ListChecks,
  LogOut,
  MapPin,
  MessageCircle,
  PackageCheck,
  Plus,
  Search,
  Upload,
  UserRoundCog,
  Users,
} from "lucide-react";

import "./App.css";
import { AgentMonitoring } from "./components/AgentMonitoring";
import { AnonymousComplaintForm } from "./components/AnonymousComplaintForm";
import { BasketAvailabilityNotifications } from "./components/BasketAvailabilityNotifications";
import { FamilyDetails } from "./components/FamilyDetails";
import { FamilyForm } from "./components/FamilyForm";
import { FieldAgentManagement } from "./components/FieldAgentManagement";
import { RegionDeliveryDashboard } from "./components/RegionDeliveryDashboard";
import { RegionManagement } from "./components/RegionManagement";
import { AppTopbar } from "./components/ui/AppTopbar";
import { EmptyState } from "./components/ui/EmptyState";
import { MetricCard } from "./components/ui/MetricCard";
import { AdminLogin } from "./screens/AdminLogin";
import { EntryScreen } from "./screens/EntryScreen";
import { ResidentLookup } from "./screens/ResidentLookup";
import {
  formatDate,
  getWaitingDays,
  getWaitingLabel,
  isSameDate,
} from "./utils/familyPriority";
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

type AppView =
  | "entry"
  | "president-home"
  | "family-create"
  | "family-list"
  | "resident-lookup"
  | "resident-home"
  | "admin-login"
  | "admin-home"
  | "complaint";

type OperationalStatusFilter = "all" | "pending" | "received";
type WaitFilter = "all" | "30" | "60" | "90";

const supportWhatsappNumber = import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER ?? "";

const supportMessage = encodeURIComponent(
  "Ola, preciso de suporte operacional no Presidente de Rua.",
);

const supportWhatsappUrl = supportWhatsappNumber
  ? `https://wa.me/${supportWhatsappNumber}?text=${supportMessage}`
  : `https://wa.me/?text=${supportMessage}`;

function App() {
  const [view, setView] = useState<AppView>("entry");
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
  }, [view]);

  function handleSelectAgent(agent: FieldAgent) {
    setSelectedAgent(agent);
    setSelectedDeliveryAgentId(agent.id);
  }

  function handleSelectAdmin() {
    if (getStoredAuthToken()) {
      setIsAdminAuthenticated(true);
      setView("admin-home");
      return;
    }

    setIsAdminAuthenticated(false);
    setView("admin-login");
  }

  function handleAdminLoggedIn() {
    setIsAdminAuthenticated(true);
    setView("admin-home");
  }

  async function handleAdminLogout() {
    await logout();
    setIsAdminAuthenticated(false);
    setView("entry");
  }

  // Chamado quando uma ação de admin recebe 401 (token expirado/inválido):
  // volta para o login em vez de deixar o usuário preso num painel sem acesso.
  function handleSessionExpired() {
    setIsAdminAuthenticated(false);
    setView("admin-login");
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

  function renderPresidentHome() {
    const priorityFamilies = families.slice(0, 5);

    return (
      <main className="pilar-gradient app-screen">
        <AppTopbar
          title="PILAR"
          subtitle={selectedAgent?.nome ?? "Presidente de Rua"}
          onBack={() => setView("entry")}
          onProfileClick={() => setView("entry")}
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
              value={familiesWaitingMoreThan30Days.length}
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
                onClick={() => setView("family-create")}
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
                onClick={() => setView("family-list")}
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
                      onClick={() => setView("family-create")}
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
                  onClick={() => {
                    setSelectedFamily(family);
                    setView("family-list");
                  }}
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

  function renderFamilyCreate() {
    return (
      <main className="pilar-gradient app-screen">
        <AppTopbar
          title="Cadastrar Nova Família"
          subtitle="Preencha os dados abaixo"
          onBack={() => setView("entry")}
          onProfileClick={() => setView("entry")}
        />

        <section className="screen-content narrow">
          <FamilyForm
            regions={regions}
            onFamilyCreated={async () => {
              await loadFamilies();
              setView("family-list");
            }}
            onOfflineFamilySaved={refreshPendingOfflineFamiliesCount}
          />

          <section className="offline-card">
            <div>
              <CheckCircle2 size={18} />
              <span>
                {pendingOfflineFamiliesCount > 0
                  ? `${pendingOfflineFamiliesCount} cadastro(s) offline aguardando sincronização.`
                  : "Dados salvos automaticamente no dispositivo em modo offline."}
              </span>
            </div>
            <div className="backup-actions">
              <button
                type="button"
                onClick={handleDownloadOfflineBackup}
                disabled={pendingOfflineFamiliesCount === 0}
              >
                <Download size={18} />
                Backup
              </button>
              <label>
                <Upload size={18} />
                Restaurar
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleRestoreOfflineBackup}
                />
              </label>
            </div>
            {offlineSyncMessage && <p>{offlineSyncMessage}</p>}
          </section>
        </section>
      </main>
    );
  }

  function renderFamilyList() {
    return (
      <main className="pilar-gradient app-screen">
        <AppTopbar
          title="Lista de Famílias"
          subtitle="Ordenadas por tempo de espera"
          onBack={() => setView("entry")}
          onProfileClick={() => setView("entry")}
        />

        <section className="screen-content">
          <section className="filter-card">
            <label className="search-field">
              <Search size={22} />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
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
                    onClick={() => setWaitFilter(filter)}
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
                  onClick={() => setStatusFilter("all")}
                >
                  Todas
                </button>
                <button
                  type="button"
                  className={statusFilter === "received" ? "is-active cyan" : ""}
                  onClick={() => setStatusFilter("received")}
                >
                  Já Receberam
                </button>
                <button
                  type="button"
                  className={statusFilter === "pending" ? "is-active cyan" : ""}
                  onClick={() => setStatusFilter("pending")}
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
                    onClick={() => setView("family-create")}
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
                onClick={() => setSelectedFamily(family)}
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
            agents={fieldAgents}
            selectedDeliveryAgentId={selectedDeliveryAgentId}
            isRegisteringDelivery={isRegisteringDelivery}
            deliveryError={deliveryError}
            deliverySuccess={deliverySuccess}
            onSelectDeliveryAgent={setSelectedDeliveryAgentId}
            onRegisterDelivery={handleRegisterDelivery}
          />
        </section>
      </main>
    );
  }

  function renderResidentHome() {
    return (
      <main className="pilar-gradient app-screen">
        <AppTopbar
          title="PILAR"
          subtitle={residentFamily?.nome_responsavel ?? "Morador"}
          onBack={() => setView("entry")}
          onProfileClick={() => setView("entry")}
        />

        <section className="screen-content">
          <div className="metric-grid">
            <MetricCard
              label="Cestas Recebidas"
              value={residentDeliveries.length}
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
              {residentDeliveries.length === 0 && (
                <EmptyState
                  title="Nenhuma entrega registrada"
                  description="O histórico aparecerá aqui após a primeira entrega confirmada."
                />
              )}
              {residentDeliveries.map((delivery) => (
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
            onClick={() => setView("complaint")}
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

  function renderAdminHome() {
    return (
      <main className="pilar-gradient app-screen">
        <AppTopbar
          title="Administrador"
          subtitle="Gestão e governança"
          onBack={() => setView("entry")}
          onProfileClick={handleAdminLogout}
        />

        <section className="screen-content admin-grid">
          <div className="admin-logout-row">
            <button
              type="button"
              className="secondary-action"
              onClick={handleAdminLogout}
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>

          <section className="admin-summary">
            <MetricCard
              label="Cestas Entregues"
              value={dashboardImpact?.total_deliveries ?? 0}
              icon={<PackageCheck size={28} />}
              tone="green"
            />
            <MetricCard
              label="Presidentes Ativos"
              value={fieldAgents.filter((agent) => agent.ativo).length}
              icon={<UserRoundCog size={28} />}
              tone="blue"
            />
            <MetricCard
              label="Regiões Ativas"
              value={regions.filter((region) => region.ativo).length}
              icon={<MapPin size={28} />}
              tone="cyan"
            />
          </section>

          <RegionDeliveryDashboard
            regions={regionDeliveryImpact}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
          />

          <RegionManagement
            regions={regions}
            isSaving={isSavingRegion}
            error={regionManagementError}
            success={regionManagementSuccess}
            onCreateRegion={handleCreateRegion}
          />

          <AgentMonitoring
            agents={fieldAgents}
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectAgent}
          />

          <FieldAgentManagement
            agents={fieldAgents}
            regions={regions}
            selectedAgent={selectedAgent}
            isSaving={isSavingAgent}
            error={agentManagementError}
            success={agentManagementSuccess}
            onCreateAgent={handleCreateFieldAgent}
            onUpdateAgent={handleUpdateFieldAgent}
          />

          <BasketAvailabilityNotifications
            regions={regions}
            notifications={basketAvailabilityNotifications}
            isProcessing={isProcessingNotifications}
            error={notificationsError}
            success={notificationsSuccess}
            onProcess={handleProcessBasketAvailabilityNotifications}
          />
        </section>
      </main>
    );
  }

  function renderComplaint() {
    return (
      <main className="pilar-gradient app-screen">
        <AppTopbar
          title="Ouvidoria Anônima"
          subtitle="Registro protegido"
          onBack={() => setView("entry")}
          onProfileClick={() => setView("entry")}
        />

        <section className="screen-content narrow">
          <AnonymousComplaintForm regions={regions} />
        </section>
      </main>
    );
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

      {view === "entry" && (
        <EntryScreen
          onSelectPresident={() => setView("president-home")}
          onSelectResident={() => setView("resident-lookup")}
          onSelectAdmin={handleSelectAdmin}
          onSelectComplaint={() => setView("complaint")}
        />
      )}
      {view === "resident-lookup" && (
        <ResidentLookup
          onBack={() => setView("entry")}
          onFound={(family) => {
            setResidentFamily(family);
            setView("resident-home");
          }}
        />
      )}
      {view === "president-home" && renderPresidentHome()}
      {view === "family-create" && renderFamilyCreate()}
      {view === "family-list" && renderFamilyList()}
      {view === "resident-home" && renderResidentHome()}
      {view === "admin-login" && (
        <AdminLogin
          onBack={() => setView("entry")}
          onLoggedIn={handleAdminLoggedIn}
        />
      )}
      {view === "admin-home" &&
        (isAdminAuthenticated ? (
          renderAdminHome()
        ) : (
          <AdminLogin
            onBack={() => setView("entry")}
            onLoggedIn={handleAdminLoggedIn}
          />
        ))}
      {view === "complaint" && renderComplaint()}
    </>
  );
}

export default App;

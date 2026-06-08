import { LogOut, MapPin, PackageCheck, UserRoundCog } from "lucide-react";

import { AgentMonitoring } from "../components/AgentMonitoring";
import { BasketAvailabilityNotifications } from "../components/BasketAvailabilityNotifications";
import { FieldAgentManagement } from "../components/FieldAgentManagement";
import { RegionDeliveryDashboard } from "../components/RegionDeliveryDashboard";
import { RegionManagement } from "../components/RegionManagement";
import { AppTopbar } from "../components/ui/AppTopbar";
import { MetricCard } from "../components/ui/MetricCard";
import type {
  CreateFieldAgentPayload,
  CreateRegionPayload,
  ProcessBasketAvailabilityPayload,
  UpdateFieldAgentPayload,
} from "../services/api";
import type {
  BasketAvailabilityNotification,
  DashboardImpact,
  FieldAgent,
  Region,
  RegionDeliveryImpact,
} from "../types";

type AdminHomeScreenProps = {
  dashboardImpact: DashboardImpact | null;
  fieldAgents: FieldAgent[];
  regions: Region[];
  regionDeliveryImpact: RegionDeliveryImpact[];
  selectedRegion: string;
  selectedAgent: FieldAgent | null;
  basketAvailabilityNotifications: BasketAvailabilityNotification[];
  isSavingRegion: boolean;
  regionManagementError: string;
  regionManagementSuccess: string;
  isSavingAgent: boolean;
  agentManagementError: string;
  agentManagementSuccess: string;
  isProcessingNotifications: boolean;
  notificationsError: string;
  notificationsSuccess: string;
  onBack: () => void;
  onLogout: () => void;
  onSelectRegion: (region: string) => void;
  onSelectAgent: (agent: FieldAgent) => void;
  onCreateRegion: (payload: CreateRegionPayload) => Promise<void>;
  onCreateAgent: (payload: CreateFieldAgentPayload) => Promise<void>;
  onUpdateAgent: (
    agentId: number,
    payload: UpdateFieldAgentPayload,
  ) => Promise<void>;
  onProcessNotifications: (
    payload: ProcessBasketAvailabilityPayload,
  ) => Promise<void>;
};

export function AdminHomeScreen({
  dashboardImpact,
  fieldAgents,
  regions,
  regionDeliveryImpact,
  selectedRegion,
  selectedAgent,
  basketAvailabilityNotifications,
  isSavingRegion,
  regionManagementError,
  regionManagementSuccess,
  isSavingAgent,
  agentManagementError,
  agentManagementSuccess,
  isProcessingNotifications,
  notificationsError,
  notificationsSuccess,
  onBack,
  onLogout,
  onSelectRegion,
  onSelectAgent,
  onCreateRegion,
  onCreateAgent,
  onUpdateAgent,
  onProcessNotifications,
}: AdminHomeScreenProps) {
  return (
    <main className="pilar-gradient app-screen">
      <AppTopbar
        title="Administrador"
        subtitle="Gestão e governança"
        onBack={onBack}
        onProfileClick={onLogout}
      />

      <section className="screen-content admin-grid">
        <div className="admin-logout-row">
          <button type="button" className="secondary-action" onClick={onLogout}>
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
          onSelectRegion={onSelectRegion}
        />

        <RegionManagement
          regions={regions}
          isSaving={isSavingRegion}
          error={regionManagementError}
          success={regionManagementSuccess}
          onCreateRegion={onCreateRegion}
        />

        <AgentMonitoring
          agents={fieldAgents}
          selectedAgent={selectedAgent}
          onSelectAgent={onSelectAgent}
        />

        <FieldAgentManagement
          agents={fieldAgents}
          regions={regions}
          selectedAgent={selectedAgent}
          isSaving={isSavingAgent}
          error={agentManagementError}
          success={agentManagementSuccess}
          onCreateAgent={onCreateAgent}
          onUpdateAgent={onUpdateAgent}
        />

        <BasketAvailabilityNotifications
          regions={regions}
          notifications={basketAvailabilityNotifications}
          isProcessing={isProcessingNotifications}
          error={notificationsError}
          success={notificationsSuccess}
          onProcess={onProcessNotifications}
        />
      </section>
    </main>
  );
}

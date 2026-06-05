// Assume endpoint: `GET /api/families`

import type {
  AnonymousComplaintResponse,
  BasketAvailabilityNotification,
  DashboardImpact,
  Family,
  FieldAgent,
  Region,
  RegionDeliveryImpact,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function getFamilies(): Promise<Family[]> {
  const response = await fetch(`${API_BASE_URL}/api/families/`);

  if (!response.ok) {
    throw new Error("Erro ao buscar famílias.");
  }

  return response.json();
}

export async function getDashboardImpact(): Promise<DashboardImpact> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/impact/`);

  if (!response.ok) {
    throw new Error("Erro ao buscar impacto de distribuição.");
  }

  return response.json();
}

export async function getRegionDeliveryImpact(): Promise<RegionDeliveryImpact[]> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/regions/`);

  if (!response.ok) {
    throw new Error("Erro ao buscar entregas por região.");
  }

  return response.json();
}

export async function getRegions(): Promise<Region[]> {
  const response = await fetch(`${API_BASE_URL}/api/regions/`);

  if (!response.ok) {
    throw new Error("Erro ao buscar regiões.");
  }

  return response.json();
}

export async function getFieldAgents(): Promise<FieldAgent[]> {
  const response = await fetch(`${API_BASE_URL}/api/field-agents/`);

  if (!response.ok) {
    throw new Error("Erro ao buscar agentes em campo.");
  }

  return response.json();
}

export async function getBasketAvailabilityNotifications(): Promise<
  BasketAvailabilityNotification[]
> {
  const response = await fetch(
    `${API_BASE_URL}/api/basket-availability-notifications/`,
  );

  if (!response.ok) {
    throw new Error("Erro ao buscar notificações de disponibilidade.");
  }

  return response.json();
}

export type CreateFamilyPayload = {
  region_id?: number;
  nome_responsavel: string;
  telefone?: string;
  quantidade_moradores: number;
  codigo_viela: string;
  cep: string;
};

export async function createFamily(
  payload: CreateFamilyPayload,
): Promise<Family> {
  const response = await fetch(`${API_BASE_URL}/api/families/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });


  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error ?? "Erro ao cadastrar família.");
  }

  return response.json();
}

export type ProcessBasketAvailabilityPayload = {
  region_id: number;
  scheduled_for: string;
  pickup_location: string;
};

export type ProcessBasketAvailabilityResponse = {
  created_count: number;
  total_notifications: number;
  notifications: BasketAvailabilityNotification[];
};

export async function processBasketAvailabilityNotifications(
  payload: ProcessBasketAvailabilityPayload,
): Promise<ProcessBasketAvailabilityResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/basket-availability-notifications/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error ?? "Erro ao processar notificações.");
  }

  return response.json();
}

export type CreateAnonymousComplaintPayload = {
  region_id?: number;
  codigo_viela?: string;
  category: string;
  description: string;
};

export async function createAnonymousComplaint(
  payload: CreateAnonymousComplaintPayload,
): Promise<AnonymousComplaintResponse> {
  const response = await fetch(`${API_BASE_URL}/api/anonymous-complaints/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error ?? "Erro ao registrar denúncia.");
  }

  return response.json();
}

export type RegisterDeliveryPayload = {
  agent_id?: number;
  notes?: string;
};

export async function registerDelivery(
  familyId: number,
  payload: RegisterDeliveryPayload = {},
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/families/${familyId}/deliveries/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error ?? "Erro ao registrar entrega.");
  }
}

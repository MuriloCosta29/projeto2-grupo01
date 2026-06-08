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

const AUTH_TOKEN_STORAGE_KEY = "presidente_de_rua_auth_token";

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function setStoredAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

// Monta o header de autenticação a partir do token guardado no navegador.
function authHeaders(): Record<string, string> {
  const token = getStoredAuthToken();
  return token ? { Authorization: `Token ${token}` } : {};
}

// Erro lançado quando o token é inválido/expirado (HTTP 401).
// O App usa isso para mandar o usuário de volta para a tela de login.
export class SessionExpiredError extends Error {
  constructor() {
    super("Sessão expirada. Faça login novamente.");
    this.name = "SessionExpiredError";
  }
}

// Trata respostas de rotas protegidas: 401 limpa o token e sinaliza expiração.
async function parseAdminResponse<T>(
  response: Response,
  fallbackError: string,
): Promise<T> {
  if (response.status === 401) {
    clearStoredAuthToken();
    throw new SessionExpiredError();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error ?? fallbackError);
  }

  return response.json();
}

export type LoginResponse = {
  token: string;
  username: string;
};

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error ?? "Não foi possível entrar.");
  }

  const data: LoginResponse = await response.json();
  setStoredAuthToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout/`, {
    method: "POST",
    headers: { ...authHeaders() },
  }).catch(() => {
    // Mesmo se a chamada falhar, limpamos o token localmente.
  });

  clearStoredAuthToken();
}

export async function getFamilies(): Promise<Family[]> {
  const response = await fetch(`${API_BASE_URL}/api/families/`);

  if (!response.ok) {
    throw new Error("Erro ao buscar famílias.");
  }

  return response.json();
}

export async function lookupFamily(
  nome_responsavel: string,
  codigo_viela: string,
): Promise<Family> {
  const params = new URLSearchParams({ nome_responsavel, codigo_viela });
  const response = await fetch(`${API_BASE_URL}/api/families/lookup/?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error ?? "Cadastro não encontrado.");
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

export type CreateRegionPayload = {
  nome: string;
};

export async function createRegion(
  payload: CreateRegionPayload,
): Promise<Region> {
  const response = await fetch(`${API_BASE_URL}/api/regions/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseAdminResponse(response, "Erro ao cadastrar região.");
}

export async function getFieldAgents(): Promise<FieldAgent[]> {
  const response = await fetch(`${API_BASE_URL}/api/field-agents/`);

  if (!response.ok) {
    throw new Error("Erro ao buscar agentes em campo.");
  }

  return response.json();
}

export type CreateFieldAgentPayload = {
  region_id?: number;
  nome: string;
  telefone: string;
  area_atuacao: string;
  ativo?: boolean;
};

export type UpdateFieldAgentPayload = Partial<
  Omit<CreateFieldAgentPayload, "region_id">
> & {
  region_id?: number | null;
};

export async function createFieldAgent(
  payload: CreateFieldAgentPayload,
): Promise<FieldAgent> {
  const response = await fetch(`${API_BASE_URL}/api/field-agents/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseAdminResponse(response, "Erro ao cadastrar Presidente de Rua.");
}

export async function updateFieldAgent(
  agentId: number,
  payload: UpdateFieldAgentPayload,
): Promise<FieldAgent> {
  const response = await fetch(`${API_BASE_URL}/api/field-agents/${agentId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  return parseAdminResponse(response, "Erro ao atualizar Presidente de Rua.");
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
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    },
  );

  return parseAdminResponse(response, "Erro ao processar notificações.");
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

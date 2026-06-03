export type DeliveryLog = {
  id: number;
  delivery_date: string;
  notes: string;
  created_at: string;
};

export type Family = {
  id: number;
  nome_responsavel: string;
  telefone: string;
  codigo_viela: string;
  complemento: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  quantidade_moradores: number;
  observacoes: string;
  deliveries?: DeliveryLog[];
};

export type DashboardImpact = {
  total_deliveries: number;
};

export type RegionDeliveryImpact = {
  region: string;
  families_count: number;
  total_deliveries: number;
};

export type FieldAgentAttendedFamily = {
  id: number;
  nome_responsavel: string;
};

export type FieldAgent = {
  id: number;
  nome: string;
  codigo_area: string;
  ativo: boolean;
  assigned_families_count: number;
  attended_families_count: number;
  deliveries_count: number;
  attended_families: FieldAgentAttendedFamily[];
};

// Esses tipos representam as famílias vindo do Backend Django.

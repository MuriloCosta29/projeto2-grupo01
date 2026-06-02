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

// Esses tipos representam as famílias vindo do Backend Django.

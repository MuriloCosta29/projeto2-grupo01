// Assume endpoint: `GET /api/families`

import type { Family } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function getFamilies(): Promise<Family[]> {
  const response = await fetch(`${API_BASE_URL}/api/families/`);

  if (!response.ok) {
    throw new Error("Erro ao buscar famílias.");
  }

  return response.json();
}

export type CreateFamilyPayload = {
  nome_responsavel: string;
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




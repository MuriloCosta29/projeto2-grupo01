import { createFamily } from "./api";
import type { CreateFamilyPayload } from "./api";

const PENDING_FAMILIES_STORAGE_KEY = "presidente_de_rua_pending_families";

export type PendingFamily = CreateFamilyPayload & {
  offlineId: string;
  createdAt: string;
};

export type SyncPendingFamiliesResult = {
  syncedCount: number;
  duplicateCount: number;
  remainingCount: number;
};

export type SavePendingFamilyResult = {
  saved: boolean;
  reason?: "duplicate";
};

function createOfflineId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function writePendingFamilies(pendingFamilies: PendingFamily[]) {
  localStorage.setItem(
    PENDING_FAMILIES_STORAGE_KEY,
    JSON.stringify(pendingFamilies),
  );
}

function normalizeText(value: string) {
  return value.trim().split(/\s+/).join(" ").toLowerCase();
}

function isSameFamily(firstFamily: CreateFamilyPayload, secondFamily: CreateFamilyPayload) {
  return (
    normalizeText(firstFamily.nome_responsavel) ===
      normalizeText(secondFamily.nome_responsavel) &&
    normalizeText(firstFamily.codigo_viela) ===
      normalizeText(secondFamily.codigo_viela)
  );
}

function isDuplicateError(error: unknown) {
  return (
    error instanceof Error &&
    normalizeText(error.message).includes("duplicidade")
  );
}

export function getPendingFamilies(): PendingFamily[] {
  const storedPendingFamilies = localStorage.getItem(PENDING_FAMILIES_STORAGE_KEY);

  if (!storedPendingFamilies) {
    return [];
  }

  try {
    const parsedPendingFamilies = JSON.parse(storedPendingFamilies);

    if (!Array.isArray(parsedPendingFamilies)) {
      return [];
    }

    return parsedPendingFamilies;
  } catch {
    return [];
  }
}

export function getPendingFamiliesCount() {
  return getPendingFamilies().length;
}

export function savePendingFamily(
  payload: CreateFamilyPayload,
): SavePendingFamilyResult {
  const pendingFamilies = getPendingFamilies();

  if (pendingFamilies.some((family) => isSameFamily(family, payload))) {
    return {
      saved: false,
      reason: "duplicate",
    };
  }

  writePendingFamilies([
    ...pendingFamilies,
    {
      ...payload,
      offlineId: createOfflineId(),
      createdAt: new Date().toISOString(),
    },
  ]);

  return {
    saved: true,
  };
}

export async function syncPendingFamilies(): Promise<SyncPendingFamiliesResult> {
  const pendingFamilies = getPendingFamilies();
  const failedFamilies: PendingFamily[] = [];
  let syncedCount = 0;
  let duplicateCount = 0;

  for (const family of pendingFamilies) {
    try {
      await createFamily({
        ...(family.region_id ? { region_id: family.region_id } : {}),
        nome_responsavel: family.nome_responsavel,
        quantidade_moradores: family.quantidade_moradores,
        codigo_viela: family.codigo_viela,
        cep: family.cep,
      });

      syncedCount += 1;
    } catch (error) {
      if (isDuplicateError(error)) {
        duplicateCount += 1;
      } else {
        failedFamilies.push(family);
      }
    }
  }

  writePendingFamilies(failedFamilies);

  return {
    syncedCount,
    duplicateCount,
    remainingCount: failedFamilies.length,
  };
}

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFamily } from "./api";
import type { CreateFamilyPayload } from "./api";
import {
  createPendingFamiliesBackup,
  getPendingFamilies,
  getPendingFamiliesCount,
  restorePendingFamiliesBackup,
  savePendingFamily,
  syncPendingFamilies,
} from "./offlineFamilies";

// O sync chama a API real; isolamos com um mock para controlar sucesso/erro.
vi.mock("./api", () => ({
  createFamily: vi.fn(),
}));

const mockedCreateFamily = vi.mocked(createFamily);
const STORAGE_KEY = "presidente_de_rua_pending_families";

function payload(
  overrides: Partial<CreateFamilyPayload> = {},
): CreateFamilyPayload {
  return {
    nome_responsavel: "Maria Silva",
    telefone: "",
    quantidade_moradores: 3,
    codigo_viela: "viela azul",
    cep: "",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("getPendingFamilies", () => {
  it("devolve lista vazia quando não há nada salvo", () => {
    expect(getPendingFamilies()).toEqual([]);
  });

  it("devolve a lista salva", () => {
    savePendingFamily(payload());
    expect(getPendingFamilies()).toHaveLength(1);
    expect(getPendingFamilies()[0].nome_responsavel).toBe("Maria Silva");
  });

  it("devolve lista vazia quando o JSON está corrompido", () => {
    localStorage.setItem(STORAGE_KEY, "{ isso não é json válido");
    expect(getPendingFamilies()).toEqual([]);
  });

  it("devolve lista vazia quando o conteúdo não é um array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(getPendingFamilies()).toEqual([]);
  });
});

describe("savePendingFamily", () => {
  it("salva uma nova família", () => {
    const result = savePendingFamily(payload());

    expect(result).toEqual({ saved: true });
    expect(getPendingFamiliesCount()).toBe(1);
  });

  it("gera offlineId e createdAt ao salvar", () => {
    savePendingFamily(payload());
    const saved = getPendingFamilies()[0];

    expect(saved.offlineId).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
  });

  it("rejeita duplicata por nome + viela (ignorando caixa e espaços)", () => {
    savePendingFamily(payload({ nome_responsavel: "Maria Silva", codigo_viela: "viela azul" }));

    const result = savePendingFamily(
      payload({ nome_responsavel: "  MARIA   SILVA ", codigo_viela: "VIELA AZUL" }),
    );

    expect(result).toEqual({ saved: false, reason: "duplicate" });
    expect(getPendingFamiliesCount()).toBe(1);
  });

  it("permite famílias diferentes na mesma viela", () => {
    savePendingFamily(payload({ nome_responsavel: "Maria Silva" }));
    savePendingFamily(payload({ nome_responsavel: "João Souza" }));

    expect(getPendingFamiliesCount()).toBe(2);
  });
});

describe("createPendingFamiliesBackup", () => {
  it("empacota as famílias pendentes com versão 1", () => {
    savePendingFamily(payload());
    const backup = createPendingFamiliesBackup();

    expect(backup.version).toBe(1);
    expect(backup.exportedAt).toBeTruthy();
    expect(backup.pendingFamilies).toHaveLength(1);
  });
});

describe("restorePendingFamiliesBackup", () => {
  it("lança erro quando o backup não é um objeto", () => {
    expect(() => restorePendingFamiliesBackup(null)).toThrow("inválido");
    expect(() => restorePendingFamiliesBackup("texto")).toThrow("inválido");
  });

  it("lança erro quando a versão é incompatível", () => {
    expect(() =>
      restorePendingFamiliesBackup({ version: 2, pendingFamilies: [] }),
    ).toThrow("incompatível");
  });

  it("lança erro quando pendingFamilies não é um array", () => {
    expect(() =>
      restorePendingFamiliesBackup({ version: 1, pendingFamilies: "nope" }),
    ).toThrow("incompatível");
  });

  it("restaura famílias válidas e conta o total", () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      pendingFamilies: [
        {
          ...payload({ nome_responsavel: "Ana" }),
          offlineId: "a-1",
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const result = restorePendingFamiliesBackup(backup);

    expect(result.restoredCount).toBe(1);
    expect(result.duplicateCount).toBe(0);
    expect(result.totalCount).toBe(1);
  });

  it("ignora duplicatas contra o que já existe", () => {
    savePendingFamily(payload({ nome_responsavel: "Ana", codigo_viela: "viela azul" }));

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      pendingFamilies: [
        {
          ...payload({ nome_responsavel: "ana", codigo_viela: "VIELA AZUL" }),
          offlineId: "a-1",
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const result = restorePendingFamiliesBackup(backup);

    expect(result.restoredCount).toBe(0);
    expect(result.duplicateCount).toBe(1);
    expect(result.totalCount).toBe(1);
  });

  it("ignora duplicatas dentro do próprio backup", () => {
    const duplicated = {
      ...payload({ nome_responsavel: "Ana" }),
      createdAt: new Date().toISOString(),
    };

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      pendingFamilies: [
        { ...duplicated, offlineId: "a-1" },
        { ...duplicated, offlineId: "a-2" },
      ],
    };

    const result = restorePendingFamiliesBackup(backup);

    expect(result.restoredCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
  });

  it("descarta entradas com formato inválido no backup", () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      pendingFamilies: [
        { offlineId: "x", createdAt: "agora" }, // faltam campos obrigatórios
      ],
    };

    const result = restorePendingFamiliesBackup(backup);

    expect(result.restoredCount).toBe(0);
  });
});

describe("syncPendingFamilies", () => {
  it("sincroniza todas as famílias quando a API responde ok", async () => {
    savePendingFamily(payload({ nome_responsavel: "Ana" }));
    savePendingFamily(payload({ nome_responsavel: "Bruno" }));
    mockedCreateFamily.mockResolvedValue({} as Awaited<
      ReturnType<typeof createFamily>
    >);

    const result = await syncPendingFamilies();

    expect(result.syncedCount).toBe(2);
    expect(result.remainingCount).toBe(0);
    expect(getPendingFamiliesCount()).toBe(0);
  });

  it("conta como duplicata e remove da fila quando a API acusa duplicidade", async () => {
    savePendingFamily(payload({ nome_responsavel: "Ana" }));
    mockedCreateFamily.mockRejectedValue(
      new Error("Atenção: Possível duplicidade de morador encontrada."),
    );

    const result = await syncPendingFamilies();

    expect(result.syncedCount).toBe(0);
    expect(result.duplicateCount).toBe(1);
    expect(result.remainingCount).toBe(0);
    expect(getPendingFamiliesCount()).toBe(0);
  });

  it("mantém na fila quando o erro é de rede/servidor", async () => {
    savePendingFamily(payload({ nome_responsavel: "Ana" }));
    mockedCreateFamily.mockRejectedValue(new Error("Failed to fetch"));

    const result = await syncPendingFamilies();

    expect(result.syncedCount).toBe(0);
    expect(result.duplicateCount).toBe(0);
    expect(result.remainingCount).toBe(1);
    expect(getPendingFamiliesCount()).toBe(1);
  });
});

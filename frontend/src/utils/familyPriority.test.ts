import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DeliveryLog, Family } from "../types";
import {
  formatDate,
  getLatestDelivery,
  getWaitingDays,
  getWaitingLabel,
  isSameDate,
} from "./familyPriority";

// Constrói uma Family mínima; só os campos relevantes para os testes importam.
function makeFamily(deliveries?: DeliveryLog[]): Family {
  return {
    id: 1,
    region: null,
    nome_responsavel: "Maria",
    telefone: "",
    codigo_viela: "viela azul",
    complemento: "",
    bairro: "",
    cep: "",
    cidade: "São Paulo",
    estado: "SP",
    quantidade_moradores: 3,
    observacoes: "",
    ...(deliveries ? { deliveries } : {}),
  };
}

function makeDelivery(delivery_date: string, id = 1): DeliveryLog {
  return {
    id,
    delivery_date,
    notes: "",
    created_at: `${delivery_date}T00:00:00`,
  };
}

describe("formatDate", () => {
  it("formata data ISO com horário para pt-BR", () => {
    expect(formatDate("2026-03-15T13:45:00")).toBe("15/03/2026");
  });

  it("formata data sem horário (date-only) para pt-BR", () => {
    expect(formatDate("2026-03-15")).toBe("15/03/2026");
  });

  it("devolve o valor original quando a data é inválida", () => {
    expect(formatDate("não é uma data")).toBe("não é uma data");
  });
});

describe("getLatestDelivery", () => {
  it("devolve a primeira entrega da lista", () => {
    const recent = makeDelivery("2026-03-10", 2);
    const old = makeDelivery("2026-01-01", 1);
    const family = makeFamily([recent, old]);

    expect(getLatestDelivery(family)).toBe(recent);
  });

  it("devolve null quando não há entregas", () => {
    expect(getLatestDelivery(makeFamily())).toBeNull();
    expect(getLatestDelivery(makeFamily([]))).toBeNull();
  });
});

describe("getWaitingDays", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T10:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("devolve 999 quando a família nunca recebeu cesta", () => {
    expect(getWaitingDays(makeFamily())).toBe(999);
  });

  it("conta os dias inteiros desde a última entrega", () => {
    const family = makeFamily([makeDelivery("2026-03-10")]);
    expect(getWaitingDays(family)).toBe(10);
  });

  it("devolve 0 no dia da própria entrega", () => {
    const family = makeFamily([makeDelivery("2026-03-20")]);
    expect(getWaitingDays(family)).toBe(0);
  });

  it("nunca devolve número negativo para entrega no futuro", () => {
    const family = makeFamily([makeDelivery("2026-03-25")]);
    expect(getWaitingDays(family)).toBe(0);
  });
});

describe("getWaitingLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T10:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra 'Sem entrega' quando nunca recebeu", () => {
    expect(getWaitingLabel(makeFamily())).toBe("Sem entrega");
  });

  it("mostra a quantidade de dias com sufixo 'd'", () => {
    const family = makeFamily([makeDelivery("2026-03-13")]);
    expect(getWaitingLabel(family)).toBe("7d");
  });
});

describe("isSameDate", () => {
  it("é verdadeiro quando a string casa com a data (UTC)", () => {
    const date = new Date("2026-03-20T00:00:00Z");
    expect(isSameDate("2026-03-20", date)).toBe(true);
  });

  it("é falso quando os dias diferem", () => {
    const date = new Date("2026-03-20T00:00:00Z");
    expect(isSameDate("2026-03-19", date)).toBe(false);
  });
});

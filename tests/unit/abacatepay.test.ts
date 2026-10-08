import { toCents, toReais, toInternalStatus } from "@/lib/abacatepay";

describe("toInternalStatus", () => {
  it("reconhece os status de pagamento confirmado", () => {
    expect(toInternalStatus("PAID")).toBe("paid");
    expect(toInternalStatus("COMPLETED")).toBe("paid");
    expect(toInternalStatus("paid")).toBe("paid"); // insensível a maiúsculas
  });

  it("reconhece pendente, cancelado e estornado", () => {
    expect(toInternalStatus("PENDING")).toBe("pending");
    expect(toInternalStatus("EXPIRED")).toBe("canceled");
    expect(toInternalStatus("CANCELED")).toBe("canceled");
    expect(toInternalStatus("REFUNDED")).toBe("refunded");
  });

  it("cai em 'failed' para status desconhecido, nulo ou vazio", () => {
    expect(toInternalStatus("QUALQUER_COISA")).toBe("failed");
    expect(toInternalStatus(null)).toBe("failed");
    expect(toInternalStatus("")).toBe("failed");
  });
});

describe("conversão de moeda", () => {
  it("converte reais para centavos sem o erro de ponto flutuante", () => {
    expect(toCents(10)).toBe(1000);
    expect(toCents(10.55)).toBe(1055);
  });

  it("ida e volta preserva o valor original", () => {
    for (const value of [0.01, 1, 12.34, 99.99, 1234.56]) {
      expect(toReais(toCents(value))).toBeCloseTo(value, 2);
    }
  });
});

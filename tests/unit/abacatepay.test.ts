import { paraCentavos, paraReais, statusInterno } from "@/lib/abacatepay";

describe("statusInterno", () => {
  it("reconhece os status de pagamento confirmado", () => {
    expect(statusInterno("PAID")).toBe("paid");
    expect(statusInterno("COMPLETED")).toBe("paid");
    expect(statusInterno("paid")).toBe("paid"); // insensível a maiúsculas
  });

  it("reconhece pendente, cancelado e estornado", () => {
    expect(statusInterno("PENDING")).toBe("pending");
    expect(statusInterno("EXPIRED")).toBe("canceled");
    expect(statusInterno("CANCELED")).toBe("canceled");
    expect(statusInterno("REFUNDED")).toBe("refunded");
  });

  it("cai em 'failed' para status desconhecido, nulo ou vazio", () => {
    expect(statusInterno("QUALQUER_COISA")).toBe("failed");
    expect(statusInterno(null)).toBe("failed");
    expect(statusInterno("")).toBe("failed");
  });
});

describe("conversão de moeda", () => {
  it("converte reais para centavos sem o erro de ponto flutuante", () => {
    expect(paraCentavos(10)).toBe(1000);
    expect(paraCentavos(10.55)).toBe(1055);
  });

  it("ida e volta preserva o valor original", () => {
    for (const valor of [0.01, 1, 12.34, 99.99, 1234.56]) {
      expect(paraReais(paraCentavos(valor))).toBeCloseTo(valor, 2);
    }
  });
});

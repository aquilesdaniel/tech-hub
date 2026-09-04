import {
  EXPIRACAO_PIX_SEGUNDOS,
  TAXA_GATEWAY,
  totalComTaxaGateway,
} from "@/lib/salgados";

describe("totalComTaxaGateway", () => {
  it("soma a taxa fixa do gateway ao valor da dívida", () => {
    expect(totalComTaxaGateway(10)).toBeCloseTo(10 + TAXA_GATEWAY, 2);
    expect(totalComTaxaGateway(12.34)).toBeCloseTo(13.14, 2);
  });

  it("aceita valor em string, como vem do formulário", () => {
    expect(totalComTaxaGateway("25.50" as unknown as number)).toBeCloseTo(
      26.3,
      2,
    );
  });
});

it("o QR Code PIX expira em 1 hora", () => {
  expect(EXPIRACAO_PIX_SEGUNDOS).toBe(3600);
});

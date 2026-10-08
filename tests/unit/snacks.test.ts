import {
  PIX_EXPIRATION_SECONDS,
  GATEWAY_FEE,
  totalWithGatewayFee,
} from "@/lib/snacks";

describe("totalWithGatewayFee", () => {
  it("soma a taxa fixa do gateway ao valor da dívida", () => {
    expect(totalWithGatewayFee(10)).toBeCloseTo(10 + GATEWAY_FEE, 2);
    expect(totalWithGatewayFee(12.34)).toBeCloseTo(13.14, 2);
  });

  it("aceita valor em string, como vem do formulário", () => {
    expect(totalWithGatewayFee("25.50" as unknown as number)).toBeCloseTo(
      26.3,
      2,
    );
  });
});

it("o QR Code PIX expira em 1 hora", () => {
  expect(PIX_EXPIRATION_SECONDS).toBe(3600);
});

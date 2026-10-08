export const GATEWAY_FEE = 0.8;

/** Validade do QR Code PIX gerado para uma dívida, em segundos. */
export const PIX_EXPIRATION_SECONDS = 3600;

/** Intervalo em que a tela de pagamento consulta o banco, em milissegundos. */
export const POLLING_INTERVAL_MS = 5000;

export function totalWithGatewayFee(amount: number) {
  return Number(amount) + GATEWAY_FEE;
}

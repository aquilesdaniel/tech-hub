export const TAXA_GATEWAY = 0.8;

/** Validade do QR Code PIX gerado para uma dívida, em segundos. */
export const EXPIRACAO_PIX_SEGUNDOS = 3600;

/** Intervalo em que a tela de pagamento consulta o banco, em milissegundos. */
export const INTERVALO_POLLING_MS = 5000;

export function totalComTaxaGateway(valor: number) {
  return Number(valor) + TAXA_GATEWAY;
}

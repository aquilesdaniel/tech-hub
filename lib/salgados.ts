export const TAXA_GATEWAY = 0.8;

export function totalComTaxaGateway(valor: number) {
  return Number(valor) + TAXA_GATEWAY;
}

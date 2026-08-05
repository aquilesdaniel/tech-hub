import type { Prisma } from "@/generated/prisma/client";

type PrismaTx = Prisma.TransactionClient;

// Marca um pagamento como pago e propaga o status para a dívida vinculada.
// Usado tanto pelo webhook real da Pagar.me quanto pela simulação local de pagamento.
export async function marcarPagamentoComoPago(
  tx: PrismaTx,
  pagamentoId: number,
  dividaId: number | null,
) {
  await tx.pagamentos.update({
    where: { id: pagamentoId },
    data: { status: "paid", updated_at: new Date() },
  });

  if (dividaId) {
    await tx.dividas.update({
      where: { id: dividaId },
      data: { pago: true, updated_at: new Date() },
    });
  }
}

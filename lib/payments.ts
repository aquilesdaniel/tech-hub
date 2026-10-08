import { getPixCharge, toInternalStatus } from "@/lib/abacatepay";
import { prisma } from "@/lib/prisma";

export interface SettlementResult {
  found: boolean;
  updated: boolean;
  divida_id: number | null;
  status: string;
}

/**
 * Localiza o pagamento a partir do identificador da cobrança na AbacatePay
 * (`pix_char_...`) ou do `externalId` que enviamos na criação, no formato
 * `divida-<id>-pagamento-<id>`.
 */
export async function findPayment(
  pixId?: string | null,
  externalId?: string | null,
) {
  if (pixId?.trim()) {
    const byPixId = await prisma.pagamentos.findFirst({
      where: { pix_id: pixId.trim() },
      orderBy: { created_at: "desc" },
    });
    if (byPixId) return byPixId;
  }

  const paymentId = Number(
    /^divida-\d+-pagamento-(\d+)$/.exec(externalId?.trim() ?? "")?.[1],
  );

  if (Number.isFinite(paymentId)) {
    return prisma.pagamentos.findUnique({ where: { id: paymentId } });
  }

  return null;
}

/**
 * Aplica a baixa de uma cobrança PIX: marca o pagamento como pago, quita a
 * dívida e acumula o valor no total gasto do devedor. É idempotente — chamadas
 * repetidas (webhook + polling) não somam o valor duas vezes.
 */
export async function applyConfirmedPayment(
  paymentId: number,
): Promise<SettlementResult> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.pagamentos.findUnique({
      where: { id: paymentId },
      select: { id: true, divida_id: true, status: true },
    });

    if (!payment) {
      return {
        found: false,
        updated: false,
        divida_id: null,
        status: "failed",
      };
    }

    if (payment.status === "paid") {
      return {
        found: true,
        updated: false,
        divida_id: payment.divida_id,
        status: "paid",
      };
    }

    await tx.pagamentos.update({
      where: { id: payment.id },
      data: { status: "paid", updated_at: new Date() },
    });

    if (!payment.divida_id) {
      return {
        found: true,
        updated: true,
        divida_id: null,
        status: "paid",
      };
    }

    const debt = await tx.dividas.findUnique({
      where: { id: payment.divida_id },
      select: { id: true, pago: true, valor: true, colaborador_id: true },
    });

    if (debt && !debt.pago) {
      await tx.dividas.update({
        where: { id: debt.id },
        data: { pago: true, updated_at: new Date() },
      });

      await tx.colaboradores.update({
        where: { id: debt.colaborador_id },
        data: {
          total_gasto_salgados: { increment: debt.valor },
          updated_at: new Date(),
        },
      });
    }

    return {
      found: true,
      updated: true,
      divida_id: payment.divida_id,
      status: "paid",
    };
  });
}

/**
 * Consulta a cobrança direto na AbacatePay e sincroniza o banco. Serve de rede
 * de segurança para quando o webhook não chega — em desenvolvimento, por
 * exemplo, a AbacatePay não alcança o localhost.
 */
export async function reconcilePayment(payment: {
  id: number;
  pix_id: string | null;
  status: string | null;
}) {
  if (!payment.pix_id) return null;

  try {
    const charge = await getPixCharge(payment.pix_id);
    const status = toInternalStatus(charge.status);

    if (status === "paid") {
      return applyConfirmedPayment(payment.id);
    }

    if (status !== payment.status) {
      await prisma.pagamentos.update({
        where: { id: payment.id },
        data: { status, updated_at: new Date() },
      });
    }

    return null;
  } catch (error) {
    console.error("Não foi possível reconciliar o pagamento na AbacatePay:", error);
    return null;
  }
}

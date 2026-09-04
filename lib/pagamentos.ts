import { consultarCobrancaPix, statusInterno } from "@/lib/abacatepay";
import { prisma } from "@/lib/prisma";

export interface ResultadoBaixa {
  encontrado: boolean;
  atualizado: boolean;
  divida_id: number | null;
  status: string;
}

/**
 * Localiza o pagamento a partir do identificador da cobrança na AbacatePay
 * (`pix_char_...`) ou do `externalId` que enviamos na criação, no formato
 * `divida-<id>-pagamento-<id>`.
 */
export async function localizarPagamento(
  pixId?: string | null,
  externalId?: string | null,
) {
  if (pixId?.trim()) {
    const porPixId = await prisma.pagamentos.findFirst({
      where: { pix_id: pixId.trim() },
      orderBy: { created_at: "desc" },
    });
    if (porPixId) return porPixId;
  }

  const pagamentoId = Number(
    /^divida-\d+-pagamento-(\d+)$/.exec(externalId?.trim() ?? "")?.[1],
  );

  if (Number.isFinite(pagamentoId)) {
    return prisma.pagamentos.findUnique({ where: { id: pagamentoId } });
  }

  return null;
}

/**
 * Aplica a baixa de uma cobrança PIX: marca o pagamento como pago, quita a
 * dívida e acumula o valor no total gasto do devedor. É idempotente — chamadas
 * repetidas (webhook + polling) não somam o valor duas vezes.
 */
export async function aplicarPagamentoConfirmado(
  pagamentoId: number,
): Promise<ResultadoBaixa> {
  return prisma.$transaction(async (tx) => {
    const pagamento = await tx.pagamentos.findUnique({
      where: { id: pagamentoId },
      select: { id: true, divida_id: true, status: true },
    });

    if (!pagamento) {
      return {
        encontrado: false,
        atualizado: false,
        divida_id: null,
        status: "failed",
      };
    }

    if (pagamento.status === "paid") {
      return {
        encontrado: true,
        atualizado: false,
        divida_id: pagamento.divida_id,
        status: "paid",
      };
    }

    await tx.pagamentos.update({
      where: { id: pagamento.id },
      data: { status: "paid", updated_at: new Date() },
    });

    if (!pagamento.divida_id) {
      return {
        encontrado: true,
        atualizado: true,
        divida_id: null,
        status: "paid",
      };
    }

    const divida = await tx.dividas.findUnique({
      where: { id: pagamento.divida_id },
      select: { id: true, pago: true, valor: true, colaborador_id: true },
    });

    if (divida && !divida.pago) {
      await tx.dividas.update({
        where: { id: divida.id },
        data: { pago: true, updated_at: new Date() },
      });

      await tx.colaboradores.update({
        where: { id: divida.colaborador_id },
        data: {
          total_gasto_salgados: { increment: divida.valor },
          updated_at: new Date(),
        },
      });
    }

    return {
      encontrado: true,
      atualizado: true,
      divida_id: pagamento.divida_id,
      status: "paid",
    };
  });
}

/**
 * Consulta a cobrança direto na AbacatePay e sincroniza o banco. Serve de rede
 * de segurança para quando o webhook não chega — em desenvolvimento, por
 * exemplo, a AbacatePay não alcança o localhost.
 */
export async function reconciliarPagamento(pagamento: {
  id: number;
  pix_id: string | null;
  status: string | null;
}) {
  if (!pagamento.pix_id) return null;

  try {
    const cobranca = await consultarCobrancaPix(pagamento.pix_id);
    const status = statusInterno(cobranca.status);

    if (status === "paid") {
      return aplicarPagamentoConfirmado(pagamento.id);
    }

    if (status !== pagamento.status) {
      await prisma.pagamentos.update({
        where: { id: pagamento.id },
        data: { status, updated_at: new Date() },
      });
    }

    return null;
  } catch (erro) {
    console.error("Não foi possível reconciliar o pagamento na AbacatePay:", erro);
    return null;
  }
}

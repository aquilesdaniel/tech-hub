import { AbacatePayError, simulatePixPayment } from "@/lib/abacatepay";
import { applyConfirmedPayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_SIMULAR_PAGAMENTO !== "true"
  ) {
    return NextResponse.json(
      {
        error:
          "A simulação de pagamento está disponível apenas em desenvolvimento",
      },
      { status: 403 },
    );
  }

  try {
    const { divida_id: rawDebtId } = await req.json();
    const debtId = Number(rawDebtId);

    if (!Number.isFinite(debtId)) {
      return NextResponse.json(
        { error: "O ID da dívida é obrigatório" },
        { status: 400 },
      );
    }

    const payment = await prisma.pagamentos.findFirst({
      where: { divida_id: debtId, pix_id: { not: null } },
      orderBy: { created_at: "desc" },
      select: { id: true, pix_id: true, status: true },
    });

    if (!payment?.pix_id) {
      return NextResponse.json(
        { error: "Nenhuma cobrança PIX foi gerada para esta dívida" },
        { status: 404 },
      );
    }

    await simulatePixPayment(payment.pix_id);
    const result = await applyConfirmedPayment(payment.id);

    revalidatePath("/salgados");
    return NextResponse.json({
      pago: result.status === "paid",
      ...result,
    });
  } catch (error) {
    if (error instanceof AbacatePayError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Erro ao simular o pagamento PIX:", error);
    return NextResponse.json(
      { error: "Erro interno ao simular o pagamento" },
      { status: 500 },
    );
  }
}

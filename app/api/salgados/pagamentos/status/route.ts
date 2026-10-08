import { reconcilePayment } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const debtId = Number(req.nextUrl.searchParams.get("divida_id"));

    if (!Number.isFinite(debtId)) {
      return NextResponse.json(
        { error: "O ID da dívida é obrigatório" },
        { status: 400 },
      );
    }

    const debt = await prisma.dividas.findUnique({
      where: { id: debtId },
      select: { id: true, pago: true },
    });

    if (!debt) {
      return NextResponse.json(
        { error: "Dívida não encontrada" },
        { status: 404 },
      );
    }

    const payment = await prisma.pagamentos.findFirst({
      where: { divida_id: debtId },
      orderBy: { created_at: "desc" },
      select: { id: true, pix_id: true, status: true, expires_at: true },
    });

    if (debt.pago) {
      return NextResponse.json({
        pago: true,
        status: payment?.status ?? "paid",
        pix_id: payment?.pix_id ?? null,
      });
    }

    if (payment?.pix_id && payment.status === "pending") {
      const result = await reconcilePayment(payment);
      if (result?.status === "paid") {
        return NextResponse.json({
          pago: true,
          status: "paid",
          pix_id: payment.pix_id,
        });
      }
    }

    const current = payment
      ? await prisma.pagamentos.findUnique({
          where: { id: payment.id },
          select: { status: true },
        })
      : null;

    return NextResponse.json({
      pago: false,
      status: current?.status ?? null,
      pix_id: payment?.pix_id ?? null,
    });
  } catch (error) {
    console.error("Erro ao consultar o status do pagamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao consultar o status do pagamento" },
      { status: 500 },
    );
  }
}

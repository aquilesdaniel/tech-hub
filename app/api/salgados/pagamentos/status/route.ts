import { reconciliarPagamento } from "@/lib/pagamentos";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const dividaId = Number(req.nextUrl.searchParams.get("divida_id"));

    if (!Number.isFinite(dividaId)) {
      return NextResponse.json(
        { error: "O ID da dívida é obrigatório" },
        { status: 400 },
      );
    }

    const divida = await prisma.dividas.findUnique({
      where: { id: dividaId },
      select: { id: true, pago: true },
    });

    if (!divida) {
      return NextResponse.json(
        { error: "Dívida não encontrada" },
        { status: 404 },
      );
    }

    const pagamento = await prisma.pagamentos.findFirst({
      where: { divida_id: dividaId },
      orderBy: { created_at: "desc" },
      select: { id: true, pix_id: true, status: true, expires_at: true },
    });

    if (divida.pago) {
      return NextResponse.json({
        pago: true,
        status: pagamento?.status ?? "paid",
        pix_id: pagamento?.pix_id ?? null,
      });
    }

    if (pagamento?.pix_id && pagamento.status === "pending") {
      const resultado = await reconciliarPagamento(pagamento);
      if (resultado?.status === "paid") {
        return NextResponse.json({
          pago: true,
          status: "paid",
          pix_id: pagamento.pix_id,
        });
      }
    }

    const atual = pagamento
      ? await prisma.pagamentos.findUnique({
          where: { id: pagamento.id },
          select: { status: true },
        })
      : null;

    return NextResponse.json({
      pago: false,
      status: atual?.status ?? null,
      pix_id: pagamento?.pix_id ?? null,
    });
  } catch (error) {
    console.error("Erro ao consultar o status do pagamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao consultar o status do pagamento" },
      { status: 500 },
    );
  }
}

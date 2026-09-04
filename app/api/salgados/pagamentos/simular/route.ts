import { ErroAbacatePay, simularPagamentoPix } from "@/lib/abacatepay";
import { aplicarPagamentoConfirmado } from "@/lib/pagamentos";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "A simulação de pagamento está disponível apenas em desenvolvimento",
      },
      { status: 403 },
    );
  }

  try {
    const { divida_id } = await req.json();
    const dividaId = Number(divida_id);

    if (!Number.isFinite(dividaId)) {
      return NextResponse.json(
        { error: "O ID da dívida é obrigatório" },
        { status: 400 },
      );
    }

    const pagamento = await prisma.pagamentos.findFirst({
      where: { divida_id: dividaId, pix_id: { not: null } },
      orderBy: { created_at: "desc" },
      select: { id: true, pix_id: true, status: true },
    });

    if (!pagamento?.pix_id) {
      return NextResponse.json(
        { error: "Nenhuma cobrança PIX foi gerada para esta dívida" },
        { status: 404 },
      );
    }

    await simularPagamentoPix(pagamento.pix_id);
    const resultado = await aplicarPagamentoConfirmado(pagamento.id);

    revalidatePath("/salgados");
    return NextResponse.json({
      pago: resultado.status === "paid",
      ...resultado,
    });
  } catch (error) {
    if (error instanceof ErroAbacatePay) {
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

import { consultarSaldoRecebedor, PagarmeApiError } from "@/lib/pagarme";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

// GET - Retorna o saldo disponível para saque do recebedor do colaborador
export async function GET(req: NextRequest) {
  try {
    const colaborador_id = req.nextUrl.searchParams.get("colaborador_id");

    if (!colaborador_id) {
      return NextResponse.json(
        { error: "O colaborador é obrigatório" },
        { status: 400 },
      );
    }

    const colaborador = await prisma.colaboradores.findUnique({
      where: { id: Number(colaborador_id) },
      select: { recipient_id: true },
    });

    if (!colaborador?.recipient_id) {
      return NextResponse.json({
        recipient_id: null,
        available_amount: 0,
        waiting_funds_amount: 0,
        transferred_amount: 0,
      });
    }

    const saldo = await consultarSaldoRecebedor(colaborador.recipient_id);

    return NextResponse.json({
      recipient_id: colaborador.recipient_id,
      available_amount: (saldo.available_amount ?? 0) / 100,
      waiting_funds_amount: (saldo.waiting_funds_amount ?? 0) / 100,
      transferred_amount: (saldo.transferred_amount ?? 0) / 100,
      currency: saldo.currency,
    });
  } catch (error) {
    if (error instanceof PagarmeApiError) {
      console.error("Erro retornado pela Pagar.me:", error.details);
      return NextResponse.json(
        { error: "Erro ao consultar saldo", detalhes: error.details },
        { status: 502 },
      );
    }
    console.error("Erro ao consultar saldo:", error);
    return NextResponse.json(
      { error: "Erro interno ao consultar saldo" },
      { status: 500 },
    );
  }
}

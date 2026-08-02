import { criarTransferencia, PagarmeApiError } from "@/lib/pagarme";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

// POST - Solicita o saque do saldo disponível do colaborador para a conta bancária cadastrada
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { colaborador_id, amount, description } = body;

    const valorEmReais = parseFloat(amount);

    if (
      !colaborador_id ||
      !amount ||
      isNaN(valorEmReais) ||
      valorEmReais <= 0
    ) {
      return NextResponse.json(
        { error: "Informe um valor de saque válido" },
        { status: 400 },
      );
    }

    const colaborador = await prisma.colaboradores.findUnique({
      where: { id: Number(colaborador_id) },
      select: { recipient_id: true },
    });

    if (!colaborador?.recipient_id) {
      return NextResponse.json(
        {
          error: "Cadastre uma conta bancária antes de solicitar um saque",
        },
        { status: 400 },
      );
    }

    const valorEmCentavos = Math.round(valorEmReais * 100);

    const transferencia = await criarTransferencia({
      recipientId: colaborador.recipient_id,
      valorEmCentavos,
      observacao: description,
    });

    return NextResponse.json(transferencia, { status: 201 });
  } catch (error) {
    if (error instanceof PagarmeApiError) {
      console.error("Erro retornado pela Pagar.me:", error.details);
      return NextResponse.json(
        {
          error: "Erro ao solicitar transferência no gateway de pagamento",
          detalhes: error.details,
        },
        { status: 502 },
      );
    }
    console.error("Erro ao solicitar transferência:", error);
    return NextResponse.json(
      { error: "Erro interno ao solicitar transferência" },
      { status: 500 },
    );
  }
}

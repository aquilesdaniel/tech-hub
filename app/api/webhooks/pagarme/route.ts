import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extrai o objeto 'data' conforme a estrutura enviada pelo Pagar.me
    const data = body?.data;

    // Proteção se não vier formato esperado
    if (!data || !data.id || !data.status) {
      return NextResponse.json(
        {
          error:
            "Payload inválido. Atributos 'data.id' ou 'data.status' ausentes.",
        },
        { status: 400 },
      );
    }

    const chargeId = data.id; // Ex: ch_kmXROnwfqfM8vn9Q
    const novoStatus = data.status; // Ex: paid

    // Busca o pagamento correspondente pelo charge_id
    const pagamento = await prisma.pagamentos.findFirst({
      where: { charge_id: chargeId },
      select: { id: true, divida_id: true },
    });

    // Caso não exista a cobrança mapeada no nosso banco
    if (!pagamento) {
      return NextResponse.json(
        { error: "Pagamento referente a este charge_id não encontrado." },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      // Atualiza o status e data de alteração na tabela de pagamentos
      await tx.pagamentos.update({
        where: { id: pagamento.id },
        data: { status: novoStatus, updated_at: new Date() },
      });

      // Se o webhook informou que foi pago, reflete na tabela de dividas também
      if (novoStatus === "paid" && pagamento.divida_id) {
        await tx.dividas.update({
          where: { id: pagamento.divida_id },
          data: { pago: true, updated_at: new Date() },
        });
      }
    });

    return NextResponse.json(
      { message: "Webhook processado com sucesso e status atualizado." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao processar webhook do Pagar.me:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao processar o webhook" },
      { status: 500 },
    );
  }
}

export function GET() {
  return NextResponse.json({
    message: "Webhook Pagar.me operando corretamente.",
  });
}

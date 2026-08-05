import { fecharPedido, PagarmeApiError } from "@/lib/pagarme";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/serialize";
import { type NextRequest, NextResponse } from "next/server";

// PATCH - Cancela um pagamento Pix ainda pendente, liberando a dívida para que
// qualquer colaborador possa gerar um novo pedido em seguida.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json();

    if (body?.status !== "canceled") {
      return NextResponse.json(
        { error: "Esta rota só suporta o cancelamento do pagamento" },
        { status: 400 },
      );
    }

    const pagamento = await prisma.pagamentos.findUnique({
      where: { id },
      select: { id: true, status: true, order_id: true },
    });

    if (!pagamento) {
      return NextResponse.json(
        { error: "Pagamento não encontrado" },
        { status: 404 },
      );
    }

    if (pagamento.status !== "pending") {
      return NextResponse.json(
        { error: "Este pagamento não está mais pendente e não pode ser cancelado" },
        { status: 409 },
      );
    }

    // Fecha o pedido na Pagar.me para que o Pix deixe de ser pagável. Melhor esforço:
    // se já estiver expirado/fechado do lado deles, seguimos com o cancelamento local.
    if (pagamento.order_id) {
      try {
        await fecharPedido(pagamento.order_id, "canceled");
      } catch (error) {
        console.error(
          "Não foi possível fechar o pedido na Pagar.me ao cancelar:",
          error instanceof PagarmeApiError ? error.details : error,
        );
      }
    }

    const atualizado = await prisma.pagamentos.update({
      where: { id },
      data: { status: "canceled", updated_at: new Date() },
    });

    return NextResponse.json(serializeDecimals(atualizado));
  } catch (error) {
    console.error("Erro ao cancelar pagamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao cancelar pagamento" },
      { status: 500 },
    );
  }
}

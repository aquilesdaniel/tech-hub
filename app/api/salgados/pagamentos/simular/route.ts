import { marcarPagamentoComoPago } from "@/lib/pagamentos";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

// POST - Simula localmente a confirmação de pagamento que normalmente chegaria pelo
// webhook da Pagar.me. Existe porque o simulador de Pix do sandbox chama o webhook
// real, que não alcança um servidor rodando em localhost sem um túnel público.
// Disponível apenas fora de produção.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Endpoint disponível apenas em ambiente de desenvolvimento" },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const { divida_id } = body;

    if (!divida_id) {
      return NextResponse.json(
        { error: "A dívida é obrigatória" },
        { status: 400 },
      );
    }

    const pagamento = await prisma.pagamentos.findFirst({
      where: { divida_id: Number(divida_id) },
      orderBy: { created_at: "desc" },
      select: { id: true, divida_id: true, status: true },
    });

    if (!pagamento) {
      return NextResponse.json(
        { error: "Nenhum pagamento Pix foi gerado para esta dívida" },
        { status: 404 },
      );
    }

    if (pagamento.status !== "pending") {
      return NextResponse.json(
        { error: "Este pagamento não está mais pendente" },
        { status: 409 },
      );
    }

    await prisma.$transaction((tx) =>
      marcarPagamentoComoPago(tx, pagamento.id, pagamento.divida_id),
    );

    return NextResponse.json({ message: "Pagamento simulado com sucesso." });
  } catch (error) {
    console.error("Erro ao simular pagamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao simular pagamento" },
      { status: 500 },
    );
  }
}

import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/serialize";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const divida_id = searchParams.get("divida_id");

    if (!divida_id) {
      return NextResponse.json(
        { error: "O ID da dívida é obrigatório" },
        { status: 400 },
      );
    }

    const pagamento = await prisma.pagamentos.findFirst({
      where: { divida_id: Number(divida_id) },
      orderBy: { created_at: "desc" },
    });

    if (!pagamento) {
      return NextResponse.json(null);
    }

    return NextResponse.json(serializeDecimals(pagamento));
  } catch (error) {
    console.error("Erro ao buscar pagamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar pagamento" },
      { status: 500 },
    );
  }
}

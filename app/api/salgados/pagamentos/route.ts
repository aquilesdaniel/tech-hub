import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/serialize";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { divida_id, colaborador_id } = body;

    if (!divida_id || !colaborador_id) {
      return NextResponse.json(
        { error: "Dívida e colaborador são obrigatórios" },
        { status: 400 },
      );
    }

    // Busca os dados do Pagar.me (usando o mock por enquanto)
    const pagarMeResponse = await fetch(
      "https://mocki.io/v1/829833c1-1d2b-49c2-bcc3-70e22bee4d56",
    );
    if (!pagarMeResponse.ok) {
      throw new Error("Erro ao gerar pedido no gateway de pagamento");
    }
    const pagarMeData = await pagarMeResponse.json();

    const status = pagarMeData.status;
    const charge = pagarMeData.charges?.[0];
    const lastTransaction = charge?.last_transaction;
    const qr_code = lastTransaction?.qr_code;

    // Como o mock retorna uma data de 2027, geramos a expiração de 24 horas a partir de agora:
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const charge_id = charge?.id;
    const gateway_id = lastTransaction?.gateway_id;

    // Verifica se já existe um pagamento para esta dívida
    const pagamentoExistente = await prisma.pagamentos.findFirst({
      where: { divida_id: Number(divida_id) },
      select: { id: true },
    });

    let pagamento;

    if (pagamentoExistente) {
      // Se já existe, atualiza a linha (Renova as 24 horas e troca o usuário que gerou)
      pagamento = await prisma.pagamentos.update({
        where: { id: pagamentoExistente.id },
        data: {
          colaborador_id: Number(colaborador_id),
          status,
          qr_code,
          expires_at,
          charge_id,
          gateway_id,
          updated_at: new Date(),
        },
      });
    } else {
      // Se não existe, cria a linha pela primeira vez
      pagamento = await prisma.pagamentos.create({
        data: {
          divida_id: Number(divida_id),
          colaborador_id: Number(colaborador_id),
          status,
          qr_code,
          expires_at,
          charge_id,
          gateway_id,
        },
      });
    }

    return NextResponse.json(serializeDecimals(pagamento), { status: 201 });
  } catch (error) {
    console.error("Erro ao gerar / atualizar pagamento: ", error);
    return NextResponse.json(
      { error: "Erro interno ao gerar pagamento" },
      { status: 500 },
    );
  }
}

// GET - Buscar pagamento por divida_id
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

    // Busca o último pagamento gerado para essa dívida
    const pagamento = await prisma.pagamentos.findFirst({
      where: { divida_id: Number(divida_id) },
      orderBy: { created_at: "desc" },
    });

    // Se não existir, retornamos nulo com sucesso (200)
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

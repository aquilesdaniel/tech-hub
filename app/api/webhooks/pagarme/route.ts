import { query } from "@/lib/db";
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
    const pagamentos = await query(
      `SELECT id, divida_id FROM pagamentos WHERE charge_id = $1`,
      [chargeId],
    );

    // Caso não exista a cobrança mapeada no nosso banco
    if (pagamentos.length === 0) {
      return NextResponse.json(
        { error: "Pagamento referente a este charge_id não encontrado." },
        { status: 404 },
      );
    }

    const dividaId = pagamentos[0].divida_id;

    // Atualiza o status e data de alteração na tabela de pagamentos
    await query(
      `UPDATE pagamentos 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE charge_id = $2`,
      [novoStatus, chargeId],
    );

    // Se o webhook informou que foi pago, reflete na tabela de dividas também
    if (novoStatus === "paid") {
      await query(
        `UPDATE dividas 
         SET pago = true, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [dividaId],
      );
    }

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

import { timingSafeEqual } from "crypto";
import { marcarPagamentoComoPago } from "@/lib/pagamentos";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

// Valida o Basic Auth configurado no cadastro do webhook no painel da Pagar.me.
// Sem PAGARME_WEBHOOK_USER/PAGARME_WEBHOOK_PASSWORD definidos, não há o que validar
// (ex: testes locais via cURL), então a checagem é ignorada.
function autenticacaoValida(req: NextRequest): boolean {
  const usuarioEsperado = process.env.PAGARME_WEBHOOK_USER;
  const senhaEsperada = process.env.PAGARME_WEBHOOK_PASSWORD;

  if (!usuarioEsperado || !senhaEsperada) return true;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) return false;

  const recebido = Buffer.from(authHeader.slice(6), "base64").toString(
    "utf-8",
  );
  const esperado = `${usuarioEsperado}:${senhaEsperada}`;

  const bufRecebido = Buffer.from(recebido);
  const bufEsperado = Buffer.from(esperado);
  if (bufRecebido.length !== bufEsperado.length) return false;

  return timingSafeEqual(bufRecebido, bufEsperado);
}

export async function POST(req: NextRequest) {
  if (!autenticacaoValida(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

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
      if (novoStatus === "paid") {
        await marcarPagamentoComoPago(tx, pagamento.id, pagamento.divida_id);
      } else {
        await tx.pagamentos.update({
          where: { id: pagamento.id },
          data: { status: novoStatus, updated_at: new Date() },
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

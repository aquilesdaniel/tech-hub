import {
  createPixCharge,
  AbacatePayError,
  toCents,
} from "@/lib/abacatepay";
import { prisma } from "@/lib/prisma";
import { PIX_EXPIRATION_SECONDS, totalWithGatewayFee } from "@/lib/snacks";
import { serializeDecimals } from "@/lib/serialize";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const rawDebtId = searchParams.get("divida_id");

    if (!rawDebtId) {
      return NextResponse.json(
        { error: "O ID da dívida é obrigatório" },
        { status: 400 },
      );
    }

    const payment = await prisma.pagamentos.findFirst({
      where: { divida_id: Number(rawDebtId) },
      orderBy: { created_at: "desc" },
    });

    if (!payment) {
      return NextResponse.json(null);
    }

    return NextResponse.json(serializeDecimals(payment));
  } catch (error) {
    console.error("Erro ao buscar pagamento:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar pagamento" },
      { status: 500 },
    );
  }
}

function truncateText(text: string, limit = 140) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit - 1)}…` : clean;
}

function isChargeStillValid(payment: {
  status: string | null;
  pix_id: string | null;
  br_code: string | null;
  expires_at: Date | null;
}) {
  return Boolean(
    payment.status === "pending" &&
    payment.pix_id &&
    payment.br_code &&
    payment.expires_at &&
    new Date(payment.expires_at) > new Date(),
  );
}

export async function POST(req: NextRequest) {
  try {
    const { divida_id: rawDebtId, colaborador_id: rawPayerId } = await req.json();

    if (!rawDebtId || !rawPayerId) {
      return NextResponse.json(
        { error: "A dívida e o colaborador pagador são obrigatórios" },
        { status: 400 },
      );
    }

    const debtId = Number(rawDebtId);
    const payerId = Number(rawPayerId);

    const debt = await prisma.dividas.findUnique({
      where: { id: debtId },
      include: { colaboradores: { select: { nome: true } } },
    });

    if (!debt) {
      return NextResponse.json(
        { error: "Dívida não encontrada" },
        { status: 404 },
      );
    }

    if (debt.pago) {
      return NextResponse.json(
        { error: "Esta dívida já está quitada" },
        { status: 409 },
      );
    }

    const payer = await prisma.colaboradores.findUnique({
      where: { id: payerId },
      select: {
        id: true,
        nome: true,
        email: true,
        document: true,
        country_code: true,
        area_code: true,
        number: true,
      },
    });

    if (!payer) {
      return NextResponse.json(
        { error: "Colaborador pagador não encontrado" },
        { status: 404 },
      );
    }

    const documentDigits = payer.document?.replace(/\D/g, "") ?? "";
    const phoneDigits = `${payer.area_code ?? ""}${payer.number ?? ""}`.replace(
      /\D/g,
      "",
    );

    if (!documentDigits || !payer.email || !phoneDigits) {
      return NextResponse.json(
        {
          error:
            "Complete seu CPF, e-mail e telefone antes de gerar o pagamento PIX.",
        },
        { status: 422 },
      );
    }

    const existing = await prisma.pagamentos.findFirst({
      where: { divida_id: debtId },
      orderBy: { created_at: "desc" },
    });

    if (existing && isChargeStillValid(existing)) {
      return NextResponse.json(serializeDecimals(existing));
    }

    const payment = await prisma.pagamentos.create({
      data: {
        divida_id: debtId,
        colaborador_id: payer.id,
        status: "pending",
      },
    });

    let charge: Awaited<ReturnType<typeof createPixCharge>>;
    try {
      charge = await createPixCharge({
        amount: toCents(totalWithGatewayFee(Number(debt.valor))),
        expiresIn: PIX_EXPIRATION_SECONDS,
        description: truncateText(
          `Salgados - ${debt.item}${debt.motivo ? ` (${debt.motivo})` : ""} - ${debt.colaboradores.nome}`,
        ),
        externalId: `divida-${debtId}-pagamento-${payment.id}`,
        customer: {
          name: payer.nome,
          taxId: documentDigits,
          email: payer.email,
          cellphone: phoneDigits,
        },
      });
    } catch (err) {
      await prisma.pagamentos.delete({ where: { id: payment.id } });
      throw err;
    }

    const updated = await prisma.pagamentos.update({
      where: { id: payment.id },
      data: {
        pix_id: charge.id,
        br_code: charge.brCode,
        br_code_base64: charge.brCodeBase64,
        expires_at: charge.expiresAt ? new Date(charge.expiresAt) : null,
        updated_at: new Date(),
      },
    });

    revalidatePath(`/salgados/pagar/${debtId}`);
    return NextResponse.json(serializeDecimals(updated), { status: 201 });
  } catch (error) {
    if (error instanceof AbacatePayError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Erro ao gerar cobrança PIX:", error);
    return NextResponse.json(
      { error: "Erro interno ao gerar a cobrança PIX" },
      { status: 500 },
    );
  }
}

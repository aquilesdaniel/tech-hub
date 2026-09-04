import {
  criarCobrancaPix,
  ErroAbacatePay,
  paraCentavos,
} from "@/lib/abacatepay";
import { prisma } from "@/lib/prisma";
import { EXPIRACAO_PIX_SEGUNDOS, totalComTaxaGateway } from "@/lib/salgados";
import { serializeDecimals } from "@/lib/serialize";
import { revalidatePath } from "next/cache";
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

function textoLimitado(texto: string, limite = 140) {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length > limite ? `${limpo.slice(0, limite - 1)}…` : limpo;
}

function cobrancaAindaValida(pagamento: {
  status: string | null;
  pix_id: string | null;
  br_code: string | null;
  expires_at: Date | null;
}) {
  return Boolean(
    pagamento.status === "pending" &&
    pagamento.pix_id &&
    pagamento.br_code &&
    pagamento.expires_at &&
    new Date(pagamento.expires_at) > new Date(),
  );
}

export async function POST(req: NextRequest) {
  try {
    const { divida_id, colaborador_id } = await req.json();

    if (!divida_id || !colaborador_id) {
      return NextResponse.json(
        { error: "A dívida e o colaborador pagador são obrigatórios" },
        { status: 400 },
      );
    }

    const dividaId = Number(divida_id);
    const pagadorId = Number(colaborador_id);

    const divida = await prisma.dividas.findUnique({
      where: { id: dividaId },
      include: { colaboradores: { select: { nome: true } } },
    });

    if (!divida) {
      return NextResponse.json(
        { error: "Dívida não encontrada" },
        { status: 404 },
      );
    }

    if (divida.pago) {
      return NextResponse.json(
        { error: "Esta dívida já está quitada" },
        { status: 409 },
      );
    }

    const pagador = await prisma.colaboradores.findUnique({
      where: { id: pagadorId },
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

    if (!pagador) {
      return NextResponse.json(
        { error: "Colaborador pagador não encontrado" },
        { status: 404 },
      );
    }

    const documento = pagador.document?.replace(/\D/g, "") ?? "";
    const celular = `${pagador.area_code ?? ""}${pagador.number ?? ""}`.replace(
      /\D/g,
      "",
    );

    if (!documento || !pagador.email || !celular) {
      return NextResponse.json(
        {
          error:
            "Complete seu CPF, e-mail e telefone antes de gerar o pagamento PIX.",
        },
        { status: 422 },
      );
    }

    const existente = await prisma.pagamentos.findFirst({
      where: { divida_id: dividaId },
      orderBy: { created_at: "desc" },
    });

    if (existente && cobrancaAindaValida(existente)) {
      return NextResponse.json(serializeDecimals(existente));
    }

    const pagamento = await prisma.pagamentos.create({
      data: {
        divida_id: dividaId,
        colaborador_id: pagador.id,
        status: "pending",
      },
    });

    let cobranca: Awaited<ReturnType<typeof criarCobrancaPix>>;
    try {
      cobranca = await criarCobrancaPix({
        amount: paraCentavos(totalComTaxaGateway(Number(divida.valor))),
        expiresIn: EXPIRACAO_PIX_SEGUNDOS,
        description: textoLimitado(
          `Salgados - ${divida.item}${divida.motivo ? ` (${divida.motivo})` : ""} - ${divida.colaboradores.nome}`,
        ),
        externalId: `divida-${dividaId}-pagamento-${pagamento.id}`,
        customer: {
          name: pagador.nome,
          taxId: documento,
          email: pagador.email,
          cellphone: celular,
        },
      });
    } catch (erro) {
      await prisma.pagamentos.delete({ where: { id: pagamento.id } });
      throw erro;
    }

    const atualizado = await prisma.pagamentos.update({
      where: { id: pagamento.id },
      data: {
        pix_id: cobranca.id,
        br_code: cobranca.brCode,
        br_code_base64: cobranca.brCodeBase64,
        expires_at: cobranca.expiresAt ? new Date(cobranca.expiresAt) : null,
        updated_at: new Date(),
      },
    });

    revalidatePath(`/salgados/pagar/${dividaId}`);
    return NextResponse.json(serializeDecimals(atualizado), { status: 201 });
  } catch (error) {
    if (error instanceof ErroAbacatePay) {
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

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/serialize";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Buscar dívida por ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    const divida = await prisma.dividas.findUnique({
      where: { id },
      include: { colaboradores: { select: { nome: true } } },
    });

    if (!divida) {
      return NextResponse.json(
        { error: "Dívida não encontrada" },
        { status: 404 },
      );
    }

    const { colaboradores, ...rest } = divida;
    return NextResponse.json(
      serializeDecimals({ ...rest, colaborador_nome: colaboradores.nome }),
    );
  } catch (error) {
    console.error("Erro ao buscar dívida:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dívida" },
      { status: 500 },
    );
  }
}

const CAMPOS_ATUALIZAVEIS = ["item", "motivo", "data_inicio", "valor", "pago"] as const;

// PATCH - Atualizar dívida (marcar como paga)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    const body = await req.json();

    const data: Prisma.dividasUpdateInput = {};
    for (const campo of CAMPOS_ATUALIZAVEIS) {
      if (body[campo] === undefined) continue;
      if (campo === "data_inicio") {
        data.data_inicio = new Date(body.data_inicio);
      } else {
        (data as Record<string, unknown>)[campo] = body[campo];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 },
      );
    }

    const divida = await prisma.$transaction(async (tx) => {
      const existente = await tx.dividas.findUnique({
        where: { id },
        select: { colaborador_id: true, valor: true, pago: true },
      });

      if (!existente) {
        throw new Error("DIVIDA_NAO_ENCONTRADA");
      }

      const atualizada = await tx.dividas.update({
        where: { id },
        data: { ...data, updated_at: new Date() },
      });

      // Se a dívida foi marcada como paga e não estava paga antes, atualizar totalizador
      if (body.pago === true && !existente.pago) {
        await tx.colaboradores.update({
          where: { id: existente.colaborador_id },
          data: {
            total_gasto_salgados: { increment: existente.valor },
            updated_at: new Date(),
          },
        });
      }

      // Se a dívida foi desmarcada como paga, subtrair do totalizador
      if (body.pago === false && existente.pago) {
        await tx.colaboradores.update({
          where: { id: existente.colaborador_id },
          data: {
            total_gasto_salgados: { decrement: existente.valor },
            updated_at: new Date(),
          },
        });
      }

      return atualizada;
    });

    revalidatePath("/salgados");
    return NextResponse.json(serializeDecimals(divida));
  } catch (error) {
    if (error instanceof Error && error.message === "DIVIDA_NAO_ENCONTRADA") {
      return NextResponse.json(
        { error: "Dívida não encontrada" },
        { status: 404 },
      );
    }
    console.error("Erro ao atualizar dívida:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar dívida" },
      { status: 500 },
    );
  }
}

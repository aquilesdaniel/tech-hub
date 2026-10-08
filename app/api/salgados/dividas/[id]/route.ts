import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/serialize";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const debt = await prisma.dividas.findUnique({
      where: { id },
      include: { colaboradores: { select: { nome: true } } },
    });

    if (!debt) {
      return NextResponse.json(
        { error: "Dívida não encontrada" },
        { status: 404 },
      );
    }

    const { colaboradores, ...rest } = debt;
    return NextResponse.json(
      serializeDecimals({ ...rest, employee_name: colaboradores.nome }),
    );
  } catch (error) {
    console.error("Erro ao buscar dívida:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dívida" },
      { status: 500 },
    );
  }
}

const UPDATABLE_FIELDS = ["item", "motivo", "data_inicio", "valor", "pago"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json();

    const data: Prisma.dividasUpdateInput = {};
    for (const field of UPDATABLE_FIELDS) {
      if (body[field] === undefined) continue;
      if (field === "data_inicio") {
        data.data_inicio = new Date(body.data_inicio);
      } else {
        (data as Record<string, unknown>)[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 },
      );
    }

    const debt = await prisma.$transaction(async (tx) => {
      const existing = await tx.dividas.findUnique({
        where: { id },
        select: { colaborador_id: true, valor: true, pago: true },
      });

      if (!existing) {
        throw new Error("DEBT_NOT_FOUND");
      }

      const updated = await tx.dividas.update({
        where: { id },
        data: { ...data, updated_at: new Date() },
      });

      if (body.pago === true && !existing.pago) {
        await tx.colaboradores.update({
          where: { id: existing.colaborador_id },
          data: {
            total_gasto_salgados: { increment: existing.valor },
            updated_at: new Date(),
          },
        });
      }

      if (body.pago === false && existing.pago) {
        await tx.colaboradores.update({
          where: { id: existing.colaborador_id },
          data: {
            total_gasto_salgados: { decrement: existing.valor },
            updated_at: new Date(),
          },
        });
      }

      return updated;
    });

    revalidatePath("/salgados");
    return NextResponse.json(serializeDecimals(debt));
  } catch (error) {
    if (error instanceof Error && error.message === "DEBT_NOT_FOUND") {
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

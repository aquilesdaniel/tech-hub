import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prisma-errors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const certificacao = await prisma.certificacoes.findUnique({
      where: { id },
      include: { colaboradores: { select: { nome: true } } },
    });

    if (!certificacao) {
      return NextResponse.json(
        { error: "Certificação não encontrada" },
        { status: 404 },
      );
    }

    const { colaboradores, ...rest } = certificacao;
    return NextResponse.json({
      ...rest,
      colaborador_nome: colaboradores.nome,
    });
  } catch (error) {
    console.error("Erro ao buscar certificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

const CAMPOS_ATUALIZAVEIS = [
  "nome",
  "tipo",
  "instituicao",
  "data_obtencao",
  "data_vencimento",
  "url_credencial",
  "observacoes",
] as const;

const CAMPOS_DATA = new Set(["data_obtencao", "data_vencimento"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await request.json();

    const data: Prisma.certificacoesUpdateInput = {};
    for (const campo of CAMPOS_ATUALIZAVEIS) {
      if (body[campo] === undefined) continue;
      (data as Record<string, unknown>)[campo] = CAMPOS_DATA.has(campo)
        ? new Date(body[campo])
        : body[campo];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo válido para atualizar" },
        { status: 400 },
      );
    }

    await prisma.certificacoes.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });

    return NextResponse.json({
      message: "Certificação atualizada com sucesso",
    });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json(
        { error: "Certificação não encontrada" },
        { status: 404 },
      );
    }
    console.error("Erro ao atualizar certificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    await prisma.certificacoes.delete({ where: { id } });

    return NextResponse.json({ message: "Certificação removida com sucesso" });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json(
        { error: "Certificação não encontrada" },
        { status: 404 },
      );
    }
    console.error("Erro ao remover certificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

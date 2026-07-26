import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const colaborador_id = searchParams.get("colaborador_id");
    const tipo = searchParams.get("tipo");

    const where: Prisma.certificacoesWhereInput = {};

    if (colaborador_id) where.colaborador_id = Number(colaborador_id);
    if (tipo) where.tipo = tipo;

    const certificacoes = await prisma.certificacoes.findMany({
      where,
      include: { colaboradores: { select: { nome: true } } },
      orderBy: { data_obtencao: "desc" },
    });

    const data = certificacoes.map(({ colaboradores, ...cert }) => ({
      ...cert,
      colaborador_nome: colaboradores.nome,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar certificações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      colaborador_id,
      nome,
      tipo,
      instituicao,
      data_obtencao,
      data_vencimento,
      url_credencial,
      observacoes,
    } = body;

    if (!colaborador_id || !nome || !tipo || !instituicao || !data_obtencao) {
      return NextResponse.json(
        {
          error:
            "Campos obrigatórios: colaborador_id, nome, tipo, instituicao, data_obtencao",
        },
        { status: 400 },
      );
    }

    const certificacao = await prisma.certificacoes.create({
      data: {
        colaborador_id: Number(colaborador_id),
        nome,
        tipo,
        instituicao,
        data_obtencao: new Date(data_obtencao),
        data_vencimento: data_vencimento ? new Date(data_vencimento) : null,
        url_credencial: url_credencial || null,
        observacoes: observacoes || null,
      },
      select: { id: true },
    });

    return NextResponse.json(
      { message: "Certificação criada com sucesso", id: certificacao.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar certificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

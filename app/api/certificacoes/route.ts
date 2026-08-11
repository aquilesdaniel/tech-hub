import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const colaborador_id = searchParams.get("colaborador_id");
    const tipo = searchParams.get("tipo");
    const search = searchParams.get("search");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    const where: Prisma.certificacoesWhereInput = {};

    if (colaborador_id) where.colaborador_id = Number(colaborador_id);
    if (tipo && tipo !== "todos") where.tipo = tipo;

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { instituicao: { contains: search, mode: "insensitive" } },
        { colaboradores: { nome: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const escopo: Prisma.certificacoesWhereInput = colaborador_id
        ? { colaborador_id: Number(colaborador_id) }
        : {};

      const hoje = new Date();
      const em90Dias = new Date(hoje);
      em90Dias.setDate(em90Dias.getDate() + 90);

      const [
        certificacoes,
        total,
        totalEscopo,
        senior,
        vencendo90,
        vencidas,
        porColaborador,
        instituicoes,
        tipos,
      ] = await prisma.$transaction([
        prisma.certificacoes.findMany({
          where,
          include: { colaboradores: { select: { nome: true } } },
          orderBy: { data_obtencao: "desc" },
          skip,
          take: limitNum,
        }),
        prisma.certificacoes.count({ where }),
        prisma.certificacoes.count({ where: escopo }),
        prisma.certificacoes.count({
          where: { ...escopo, tipo: "Certificação Senior" },
        }),
        prisma.certificacoes.count({
          where: { ...escopo, data_vencimento: { gte: hoje, lte: em90Dias } },
        }),
        prisma.certificacoes.count({
          where: { ...escopo, data_vencimento: { lt: hoje } },
        }),
        prisma.certificacoes.groupBy({
          by: ["colaborador_id"],
          where: escopo,
          orderBy: { colaborador_id: "asc" },
        }),
        prisma.certificacoes.findMany({
          where: escopo,
          distinct: ["instituicao"],
          select: { instituicao: true },
        }),
        prisma.certificacoes.findMany({
          where: escopo,
          distinct: ["tipo"],
          select: { tipo: true },
          orderBy: { tipo: "asc" },
        }),
      ]);

      const data = certificacoes.map(({ colaboradores, ...cert }) => ({
        ...cert,
        colaborador_nome: colaboradores.nome,
      }));

      return NextResponse.json({
        data,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        resumo: {
          total: totalEscopo,
          senior,
          vencendo90,
          vencidas,
          colaboradoresCertificados: porColaborador.length,
          instituicoes: instituicoes.filter((i) => i.instituicao).length,
        },
        tipos: tipos.map((t) => t.tipo),
      });
    }

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

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("colaborador_id");
    const type = searchParams.get("tipo");
    const search = searchParams.get("search");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    const where: Prisma.certificacoesWhereInput = {};

    if (employeeId) where.colaborador_id = Number(employeeId);
    if (type && type !== "all") where.tipo = type;

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

      const scope: Prisma.certificacoesWhereInput = employeeId
        ? { colaborador_id: Number(employeeId) }
        : {};

      const today = new Date();
      const in90Days = new Date(today);
      in90Days.setDate(in90Days.getDate() + 90);

      const [
        pageRows,
        total,
        scopeTotal,
        senior,
        expiringIn90,
        expired,
        byEmployee,
        institutions,
        types,
      ] = await prisma.$transaction([
        prisma.certificacoes.findMany({
          where,
          include: { colaboradores: { select: { nome: true } } },
          orderBy: { data_obtencao: "desc" },
          skip,
          take: limitNum,
        }),
        prisma.certificacoes.count({ where }),
        prisma.certificacoes.count({ where: scope }),
        prisma.certificacoes.count({
          where: { ...scope, tipo: "Certificação Senior" },
        }),
        prisma.certificacoes.count({
          where: { ...scope, data_vencimento: { gte: today, lte: in90Days } },
        }),
        prisma.certificacoes.count({
          where: { ...scope, data_vencimento: { lt: today } },
        }),
        prisma.certificacoes.groupBy({
          by: ["colaborador_id"],
          where: scope,
          orderBy: { colaborador_id: "asc" },
        }),
        prisma.certificacoes.findMany({
          where: scope,
          distinct: ["instituicao"],
          select: { instituicao: true },
        }),
        prisma.certificacoes.findMany({
          where: scope,
          distinct: ["tipo"],
          select: { tipo: true },
          orderBy: { tipo: "asc" },
        }),
      ]);

      const data = pageRows.map(({ colaboradores, ...cert }) => ({
        ...cert,
        employee_name: colaboradores.nome,
      }));

      return NextResponse.json({
        data,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        summary: {
          total: scopeTotal,
          senior,
          expiringIn90,
          expired,
          certifiedEmployees: byEmployee.length,
          institutions: institutions.filter((i) => i.instituicao).length,
        },
        types: types.map((t) => t.tipo),
      });
    }

    const certifications = await prisma.certificacoes.findMany({
      where,
      include: { colaboradores: { select: { nome: true } } },
      orderBy: { data_obtencao: "desc" },
    });

    const data = certifications.map(({ colaboradores, ...cert }) => ({
      ...cert,
      employee_name: colaboradores.nome,
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
      colaborador_id: employeeId,
      nome: name,
      tipo: type,
      instituicao: institution,
      data_obtencao: obtainedDate,
      data_vencimento: expirationDate,
      url_credencial: credentialUrl,
      observacoes: notes,
    } = body;

    if (!employeeId || !name || !type || !institution || !obtainedDate) {
      return NextResponse.json(
        {
          error:
            "Campos obrigatórios: colaborador_id, nome, tipo, instituicao, data_obtencao",
        },
        { status: 400 },
      );
    }

    const certification = await prisma.certificacoes.create({
      data: {
        colaborador_id: Number(employeeId),
        nome: name,
        tipo: type,
        instituicao: institution,
        data_obtencao: new Date(obtainedDate),
        data_vencimento: expirationDate ? new Date(expirationDate) : null,
        url_credencial: credentialUrl || null,
        observacoes: notes || null,
      },
      select: { id: true },
    });

    return NextResponse.json(
      { message: "Certificação criada com sucesso", id: certification.id },
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

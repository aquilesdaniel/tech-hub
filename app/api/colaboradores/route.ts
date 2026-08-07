import type { Prisma } from "@/generated/prisma/client";
import {
  COLABORADOR_SELECT_SEGURO,
  sanitizarColaborador,
} from "@/lib/colaboradores";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/serialize";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Listar todos os colaboradores
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const departamento = searchParams.get("departamento");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    const where: Prisma.colaboradoresWhereInput = {};

    if (departamento && departamento !== "todos") {
      where.departamento = departamento;
    }

    if (status && status !== "todos") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const selecao = {
      ...COLABORADOR_SELECT_SEGURO,
      setores: { select: { nome: true } },
    };

    type LinhaColaborador = { setores: { nome: string } | null } & Record<
      string,
      unknown
    >;

    const formatar = (linhas: LinhaColaborador[]) =>
      linhas.map(({ setores, ...colaborador }) => ({
        ...sanitizarColaborador(colaborador as never),
        setor_nome: setores?.nome ?? null,
      }));

    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;

      const [colaboradores, total, ativos, departamentos] =
        await prisma.$transaction([
          prisma.colaboradores.findMany({
            where,
            select: selecao,
            orderBy: { nome: "asc" },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
          }),
          prisma.colaboradores.count({ where }),
          prisma.colaboradores.count({ where: { status: "ativo" } }),
          prisma.colaboradores.findMany({
            distinct: ["departamento"],
            select: { departamento: true },
            orderBy: { departamento: "asc" },
          }),
        ]);

      const totalGeral = await prisma.colaboradores.count();

      return NextResponse.json({
        data: serializeDecimals(formatar(colaboradores as LinhaColaborador[])),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        resumo: {
          total: totalGeral,
          ativos,
          inativos: totalGeral - ativos,
          departamentos: departamentos
            .map((d) => d.departamento)
            .filter((d): d is string => Boolean(d)),
        },
      });
    }

    const colaboradores = await prisma.colaboradores.findMany({
      where,
      select: selecao,
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(
      serializeDecimals(formatar(colaboradores as LinhaColaborador[])),
    );
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    return NextResponse.json(
      { error: "Erro ao buscar colaboradores" },
      { status: 500 },
    );
  }
}

// POST - Criar novo colaborador
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, email, departamento, cargo, setor_id } = body;

    // Validação básica
    if (!nome || !email || !departamento) {
      return NextResponse.json(
        { error: "Nome, email e departamento são obrigatórios" },
        { status: 400 },
      );
    }

    // Verificar se o email já existe
    const existingUser = await prisma.colaboradores.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Este email já está em uso" },
        { status: 409 },
      );
    }

    // Inserir novo colaborador
    const colaborador = await prisma.colaboradores.create({
      data: {
        nome,
        email,
        departamento,
        cargo: cargo || "Colaborador",
        data_admissao: new Date(),
        status: "ativo",
        setor_id: setor_id ? Number(setor_id) : null,
      },
      select: COLABORADOR_SELECT_SEGURO,
    });

    revalidatePath("/admin");
    return NextResponse.json(
      serializeDecimals(sanitizarColaborador(colaborador)),
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar colaborador:", error);
    return NextResponse.json(
      { error: "Erro ao criar colaborador" },
      { status: 500 },
    );
  }
}

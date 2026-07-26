import type { Prisma } from "@/generated/prisma/client";
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

    const colaboradores = await prisma.colaboradores.findMany({
      where,
      include: { setores: { select: { nome: true } } },
      orderBy: { nome: "asc" },
    });

    const result = colaboradores.map(({ setores, ...colaborador }) => ({
      ...colaborador,
      setor_nome: setores?.nome ?? null,
    }));

    return NextResponse.json(serializeDecimals(result));
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
    });

    revalidatePath("/admin");
    return NextResponse.json(serializeDecimals(colaborador), { status: 201 });
  } catch (error) {
    console.error("Erro ao criar colaborador:", error);
    return NextResponse.json(
      { error: "Erro ao criar colaborador" },
      { status: 500 },
    );
  }
}

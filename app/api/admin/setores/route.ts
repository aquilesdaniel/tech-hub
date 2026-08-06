import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

const selecaoSetor = {
  id: true,
  nome: true,
  descricao: true,
  created_at: true,
  updated_at: true,
  colaboradores: {
    orderBy: { cargo: "desc" as const },
    take: 1,
    select: { nome: true },
  },
};

type SetorSelecionado = {
  id: number;
  nome: string;
  descricao: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  colaboradores: { nome: string }[];
};

function comContagem(
  setores: SetorSelecionado[],

  contagens: { setor_id: number | null; _count: unknown }[],
) {
  const contagemPorSetor = new Map<number | null, number>(
    contagens.map((c) => [
      c.setor_id,
      typeof c._count === "number" ? c._count : 0,
    ]),
  );

  return setores.map((setor) => ({
    id: setor.id,
    nome: setor.nome,
    descricao: setor.descricao,
    created_at: setor.created_at,
    updated_at: setor.updated_at,
    total_colaboradores: contagemPorSetor.get(setor.id) ?? 0,
    responsavel: setor.colaboradores[0]?.nome ?? null,
  }));
}

// GET - Listar setores com contagem de colaboradores
export async function GET(req: NextRequest) {
  try {
    const page = req.nextUrl.searchParams.get("page");
    const limit = req.nextUrl.searchParams.get("limit");

    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const [setores, total, contagens] = await prisma.$transaction([
        prisma.setores.findMany({
          select: selecaoSetor,
          orderBy: { nome: "asc" },
          skip,
          take: limitNum,
        }),
        prisma.setores.count(),
        prisma.colaboradores.groupBy({
          by: ["setor_id"],
          where: { status: "ativo" },
          orderBy: { setor_id: "asc" },
          _count: true,
        }),
      ]);

      return NextResponse.json({
        data: comContagem(setores, contagens),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    const [setores, contagens] = await prisma.$transaction([
      prisma.setores.findMany({
        select: selecaoSetor,
        orderBy: { nome: "asc" },
      }),
      prisma.colaboradores.groupBy({
        by: ["setor_id"],
        where: { status: "ativo" },
        orderBy: { setor_id: "asc" },
        _count: true,
      }),
    ]);

    return NextResponse.json(comContagem(setores, contagens));
  } catch (error) {
    console.error("Erro ao buscar setores:", error);
    return NextResponse.json(
      { error: "Erro ao buscar setores" },
      { status: 500 },
    );
  }
}

// POST - Criar novo setor
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, descricao } = body;

    if (!nome) {
      return NextResponse.json(
        { error: "Nome do setor é obrigatório" },
        { status: 400 },
      );
    }

    const existingSetor = await prisma.setores.findFirst({
      where: { nome },
      select: { id: true },
    });
    if (existingSetor) {
      return NextResponse.json(
        { error: "Este setor já existe" },
        { status: 409 },
      );
    }

    const setor = await prisma.setores.create({
      data: { nome, descricao: descricao || "" },
    });

    revalidatePath("/admin");
    return NextResponse.json(setor, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar setor:", error);
    return NextResponse.json({ error: "Erro ao criar setor" }, { status: 500 });
  }
}

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

const sectorSelect = {
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

type SelectedSector = {
  id: number;
  nome: string;
  descricao: string | null;
  created_at: Date | null;
  updated_at: Date | null;
  colaboradores: { nome: string }[];
};

function withCount(
  sectors: SelectedSector[],

  counts: { setor_id: number | null; _count: unknown }[],
) {
  const countBySector = new Map<number | null, number>(
    counts.map((c) => [
      c.setor_id,
      typeof c._count === "number" ? c._count : 0,
    ]),
  );

  return sectors.map((sector) => ({
    id: sector.id,
    nome: sector.nome,
    descricao: sector.descricao,
    created_at: sector.created_at,
    updated_at: sector.updated_at,
    total_employees: countBySector.get(sector.id) ?? 0,
    manager: sector.colaboradores[0]?.nome ?? null,
  }));
}

export async function GET(req: NextRequest) {
  try {
    const page = req.nextUrl.searchParams.get("page");
    const limit = req.nextUrl.searchParams.get("limit");
    const search = req.nextUrl.searchParams.get("search");

    const where: Prisma.setoresWhereInput = search
      ? {
          OR: [
            { nome: { contains: search, mode: "insensitive" } },
            { descricao: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const [sectors, total, counts] = await prisma.$transaction([
        prisma.setores.findMany({
          where,
          select: sectorSelect,
          orderBy: { nome: "asc" },
          skip,
          take: limitNum,
        }),
        prisma.setores.count({ where }),
        prisma.colaboradores.groupBy({
          by: ["setor_id"],
          where: { status: "ativo" },
          orderBy: { setor_id: "asc" },
          _count: true,
        }),
      ]);

      return NextResponse.json({
        data: withCount(sectors, counts),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    const [sectors, counts] = await prisma.$transaction([
      prisma.setores.findMany({
        select: sectorSelect,
        orderBy: { nome: "asc" },
      }),
      prisma.colaboradores.groupBy({
        by: ["setor_id"],
        where: { status: "ativo" },
        orderBy: { setor_id: "asc" },
        _count: true,
      }),
    ]);

    return NextResponse.json(withCount(sectors, counts));
  } catch (error) {
    console.error("Erro ao buscar setores:", error);
    return NextResponse.json(
      { error: "Erro ao buscar setores" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome: name, descricao: description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nome do setor é obrigatório" },
        { status: 400 },
      );
    }

    const existingSector = await prisma.setores.findFirst({
      where: { nome: name },
      select: { id: true },
    });
    if (existingSector) {
      return NextResponse.json(
        { error: "Este setor já existe" },
        { status: 409 },
      );
    }

    const sector = await prisma.setores.create({
      data: { nome: name, descricao: description || "" },
    });

    revalidatePath("/admin");
    return NextResponse.json(sector, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar setor:", error);
    return NextResponse.json({ error: "Erro ao criar setor" }, { status: 500 });
  }
}

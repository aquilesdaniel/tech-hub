import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Listar todos os setores com contagem de colaboradores
export async function GET() {
  try {
    const [setores, contagens] = await prisma.$transaction([
      prisma.setores.findMany({
        select: {
          id: true,
          nome: true,
          descricao: true,
          created_at: true,
          updated_at: true,
          colaboradores: {
            orderBy: { cargo: "desc" },
            take: 1,
            select: { nome: true },
          },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.colaboradores.groupBy({
        by: ["setor_id"],
        where: { status: "ativo" },
        orderBy: { setor_id: "asc" },
        _count: true,
      }),
    ]);

    const contagemPorSetor = new Map(
      contagens.map((c) => [c.setor_id, c._count]),
    );

    const result = setores.map((setor) => ({
      id: setor.id,
      nome: setor.nome,
      descricao: setor.descricao,
      created_at: setor.created_at,
      updated_at: setor.updated_at,
      total_colaboradores: contagemPorSetor.get(setor.id) ?? 0,
      responsavel: setor.colaboradores[0]?.nome ?? null,
    }));

    return NextResponse.json(result);
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

    // Validação básica
    if (!nome) {
      return NextResponse.json(
        { error: "Nome do setor é obrigatório" },
        { status: 400 },
      );
    }

    // Verificar se o setor já existe
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

    // Inserir novo setor
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

import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prisma-errors";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Buscar setor por ID com colaboradores
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);

    const setor = await prisma.setores.findUnique({
      where: { id },
      include: {
        colaboradores: {
          select: { id: true, nome: true, email: true, cargo: true, status: true },
          orderBy: { nome: "asc" },
        },
      },
    });

    if (!setor) {
      return NextResponse.json(
        { error: "Setor não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(setor);
  } catch (error) {
    console.error("Erro ao buscar setor:", error);
    return NextResponse.json(
      { error: "Erro ao buscar setor" },
      { status: 500 },
    );
  }
}

// PUT - Atualizar setor
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json();
    const { nome, descricao } = body;

    // Validação básica
    if (!nome) {
      return NextResponse.json(
        { error: "Nome do setor é obrigatório" },
        { status: 400 },
      );
    }

    // Verificar se o setor existe
    const existingSetor = await prisma.setores.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existingSetor) {
      return NextResponse.json(
        { error: "Setor não encontrado" },
        { status: 404 },
      );
    }

    // Atualizar setor
    const setor = await prisma.setores.update({
      where: { id },
      data: { nome, descricao: descricao || "", updated_at: new Date() },
    });

    revalidatePath("/admin");
    return NextResponse.json(setor);
  } catch (error) {
    console.error("Erro ao atualizar setor:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar setor" },
      { status: 500 },
    );
  }
}

// DELETE - Remover setor (apenas se não tiver colaboradores)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);

    // Verificar se há colaboradores no setor
    const totalColaboradores = await prisma.colaboradores.count({
      where: { setor_id: id },
    });

    if (totalColaboradores > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir um setor que possui colaboradores" },
        { status: 400 },
      );
    }

    // Excluir setor
    await prisma.setores.delete({ where: { id } });

    revalidatePath("/admin");
    return NextResponse.json({ message: "Setor excluído com sucesso" });
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json(
        { error: "Setor não encontrado" },
        { status: 404 },
      );
    }
    console.error("Erro ao excluir setor:", error);
    return NextResponse.json(
      { error: "Erro ao excluir setor" },
      { status: 500 },
    );
  }
}

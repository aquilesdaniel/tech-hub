import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prisma-errors";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    const livro = await prisma.livros.findUnique({ where: { id } });

    if (!livro) {
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(livro);
  } catch (error) {
    console.error("Erro ao buscar livro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar livro" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    const body = await req.json();
    const { titulo, autor, genero, isbn, capa } = body;

    // Validação básica
    if (!titulo || !autor) {
      return NextResponse.json(
        { error: "Título e autor são obrigatórios" },
        { status: 400 },
      );
    }

    // Atualizar livro
    const livro = await prisma.livros.update({
      where: { id },
      data: {
        titulo,
        autor,
        genero: genero || "",
        isbn: isbn || "",
        capa,
        updated_at: new Date(),
      },
    });

    revalidatePath("/biblioteca");
    return NextResponse.json(livro);
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 },
      );
    }
    console.error("Erro ao atualizar livro:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar livro" },
      { status: 500 },
    );
  }
}

const CAMPOS_ATUALIZAVEIS = [
  "titulo",
  "autor",
  "genero",
  "isbn",
  "disponivel",
  "capa",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    const body = await req.json();

    const data: Prisma.livrosUpdateInput = {};
    for (const campo of CAMPOS_ATUALIZAVEIS) {
      if (body[campo] !== undefined) {
        (data as Record<string, unknown>)[campo] = body[campo];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 },
      );
    }

    const livro = await prisma.livros.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });

    revalidatePath("/biblioteca");
    return NextResponse.json(livro);
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 },
      );
    }
    console.error("Erro ao atualizar disponibilidade do livro:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar disponibilidade do livro" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);

    // Verificar se o livro está emprestado
    const totalEmprestado = await prisma.emprestimos.count({
      where: { livro_id: id, status: "emprestado" },
    });

    if (totalEmprestado > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir um livro que está emprestado" },
        { status: 400 },
      );
    }

    // Excluir livro
    await prisma.livros.delete({ where: { id } });

    revalidatePath("/biblioteca");
    return NextResponse.json({ message: "Livro excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir livro:", error);
    return NextResponse.json(
      { error: "Erro ao excluir livro" },
      { status: 500 },
    );
  }
}

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prisma-errors";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const book = await prisma.livros.findUnique({ where: { id } });

    if (!book) {
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(book);
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json();
    const {
      titulo: title,
      autor: author,
      genero: genre,
      isbn,
      capa: cover,
    } = body;

    if (!title || !author) {
      return NextResponse.json(
        { error: "Título e autor são obrigatórios" },
        { status: 400 },
      );
    }

    const book = await prisma.livros.update({
      where: { id },
      data: {
        titulo: title,
        autor: author,
        genero: genre || "",
        isbn: isbn || "",
        capa: cover,
        updated_at: new Date(),
      },
    });

    revalidatePath("/biblioteca");
    return NextResponse.json(book);
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

const UPDATABLE_FIELDS = [
  "titulo",
  "autor",
  "genero",
  "isbn",
  "disponivel",
  "capa",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json();

    const data: Prisma.livrosUpdateInput = {};
    for (const field of UPDATABLE_FIELDS) {
      if (body[field] !== undefined) {
        (data as Record<string, unknown>)[field] = body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 },
      );
    }

    const book = await prisma.livros.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });

    revalidatePath("/biblioteca");
    return NextResponse.json(book);
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);

    const loanedCount = await prisma.emprestimos.count({
      where: { livro_id: id, status: "emprestado" },
    });

    if (loanedCount > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir um livro que está emprestado" },
        { status: 400 },
      );
    }

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

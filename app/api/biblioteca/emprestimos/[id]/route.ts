import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const loan = await prisma.emprestimos.findUnique({
      where: { id },
      include: {
        livros: { select: { titulo: true, autor: true } },
        colaboradores: { select: { nome: true } },
      },
    });

    if (!loan) {
      return NextResponse.json(
        { error: "Empréstimo não encontrado" },
        { status: 404 },
      );
    }

    const { livros, colaboradores, ...rest } = loan;
    return NextResponse.json({
      ...rest,
      book_title: livros.titulo,
      book_author: livros.autor,
      employee_name: colaboradores.nome,
    });
  } catch (error) {
    console.error("Erro ao buscar empréstimo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar empréstimo" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json();
    const { data_real_devolucao: returnDate, status } = body;

    const loan = await prisma.$transaction(async (tx) => {
      const existing = await tx.emprestimos.findUnique({
        where: { id },
        select: { livro_id: true },
      });

      if (!existing) {
        throw new Error("LOAN_NOT_FOUND");
      }

      const updated = await tx.emprestimos.update({
        where: { id },
        data: {
          data_real_devolucao: returnDate ? new Date(returnDate) : null,
          status: status || "devolvido",
          updated_at: new Date(),
        },
      });

      if (status === "devolvido" || !status) {
        await tx.livros.update({
          where: { id: existing.livro_id },
          data: { disponivel: true, updated_at: new Date() },
        });
      }

      return updated;
    });

    revalidatePath("/biblioteca");
    return NextResponse.json(loan);
  } catch (error) {
    if (error instanceof Error && error.message === "LOAN_NOT_FOUND") {
      return NextResponse.json(
        { error: "Empréstimo não encontrado" },
        { status: 404 },
      );
    }
    console.error("Erro ao atualizar empréstimo:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar empréstimo" },
      { status: 500 },
    );
  }
}

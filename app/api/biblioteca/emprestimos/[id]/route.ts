import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Buscar empréstimo por ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const emprestimo = await prisma.emprestimos.findUnique({
      where: { id },
      include: {
        livros: { select: { titulo: true, autor: true } },
        colaboradores: { select: { nome: true } },
      },
    });

    if (!emprestimo) {
      return NextResponse.json(
        { error: "Empréstimo não encontrado" },
        { status: 404 },
      );
    }

    const { livros, colaboradores, ...rest } = emprestimo;
    return NextResponse.json({
      ...rest,
      livro_titulo: livros.titulo,
      livro_autor: livros.autor,
      colaborador_nome: colaboradores.nome,
    });
  } catch (error) {
    console.error("Erro ao buscar empréstimo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar empréstimo" },
      { status: 500 },
    );
  }
}

// PATCH - Atualizar empréstimo (devolver livro)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json();
    const { data_real_devolucao, status } = body;

    const emprestimo = await prisma.$transaction(async (tx) => {
      // Buscar empréstimo para obter o livro_id
      const existente = await tx.emprestimos.findUnique({
        where: { id },
        select: { livro_id: true },
      });

      if (!existente) {
        throw new Error("EMPRESTIMO_NAO_ENCONTRADO");
      }

      // Atualizar empréstimo
      const atualizado = await tx.emprestimos.update({
        where: { id },
        data: {
          data_real_devolucao: data_real_devolucao
            ? new Date(data_real_devolucao)
            : null,
          status: status || "devolvido",
          updated_at: new Date(),
        },
      });

      // Se o status for 'devolvido', atualizar disponibilidade do livro
      if (status === "devolvido" || !status) {
        await tx.livros.update({
          where: { id: existente.livro_id },
          data: { disponivel: true, updated_at: new Date() },
        });
      }

      return atualizado;
    });

    revalidatePath("/biblioteca");
    return NextResponse.json(emprestimo);
  } catch (error) {
    if (error instanceof Error && error.message === "EMPRESTIMO_NAO_ENCONTRADO") {
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

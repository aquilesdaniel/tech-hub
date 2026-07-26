import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Listar todos os empréstimos
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const colaboradorId = searchParams.get("colaborador_id");

    const where: Prisma.emprestimosWhereInput = {};

    if (status && status !== "todos") where.status = status;
    if (colaboradorId) where.colaborador_id = Number(colaboradorId);

    const emprestimos = await prisma.emprestimos.findMany({
      where,
      include: {
        livros: { select: { titulo: true, autor: true } },
        colaboradores: { select: { nome: true } },
      },
      orderBy: { data_emprestimo: "desc" },
    });

    const data = emprestimos.map(({ livros, colaboradores, ...emprestimo }) => ({
      ...emprestimo,
      livro_titulo: livros.titulo,
      livro_autor: livros.autor,
      colaborador_nome: colaboradores.nome,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar empréstimos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar empréstimos" },
      { status: 500 },
    );
  }
}

// POST - Criar novo empréstimo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { livro_id, colaborador_id, data_emprestimo, data_prevista_devolucao } =
      body;

    // Validação básica
    if (
      !livro_id ||
      !colaborador_id ||
      !data_emprestimo ||
      !data_prevista_devolucao
    ) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 },
      );
    }

    const emprestimo = await prisma.$transaction(async (tx) => {
      // Verificar se o livro está disponível
      const livro = await tx.livros.findUnique({
        where: { id: Number(livro_id) },
        select: { disponivel: true },
      });

      if (!livro) {
        throw new Error("LIVRO_NAO_ENCONTRADO");
      }

      if (!livro.disponivel) {
        throw new Error("LIVRO_INDISPONIVEL");
      }

      // Criar empréstimo
      const novoEmprestimo = await tx.emprestimos.create({
        data: {
          livro_id: Number(livro_id),
          colaborador_id: Number(colaborador_id),
          data_emprestimo: new Date(data_emprestimo),
          data_prevista_devolucao: new Date(data_prevista_devolucao),
          status: "emprestado",
        },
      });

      // Atualizar disponibilidade do livro
      await tx.livros.update({
        where: { id: Number(livro_id) },
        data: { disponivel: false, updated_at: new Date() },
      });

      return novoEmprestimo;
    });

    revalidatePath("/biblioteca");
    return NextResponse.json(emprestimo, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "LIVRO_NAO_ENCONTRADO") {
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 },
      );
    }
    if (error instanceof Error && error.message === "LIVRO_INDISPONIVEL") {
      return NextResponse.json(
        { error: "Este livro não está disponível para empréstimo" },
        { status: 400 },
      );
    }
    console.error("Erro ao criar empréstimo:", error);
    return NextResponse.json(
      { error: "Erro ao criar empréstimo" },
      { status: 500 },
    );
  }
}

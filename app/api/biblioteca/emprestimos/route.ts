import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const employeeId = searchParams.get("colaborador_id");

    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search");

    const where: Prisma.emprestimosWhereInput = {};

    if (status && status !== "all") where.status = status;
    if (employeeId) where.colaborador_id = Number(employeeId);

    if (search) {
      where.OR = [
        { livros: { titulo: { contains: search, mode: "insensitive" } } },
        { livros: { autor: { contains: search, mode: "insensitive" } } },
        { colaboradores: { nome: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const scope: Prisma.emprestimosWhereInput = employeeId
        ? { colaborador_id: Number(employeeId) }
        : {};

      const [pageRows, total, scopeTotal, active, overdue, returned] =
        await prisma.$transaction([
          prisma.emprestimos.findMany({
            where,
            include: {
              livros: { select: { titulo: true, autor: true } },
              colaboradores: { select: { nome: true } },
            },
            orderBy: { data_emprestimo: "desc" },
            skip,
            take: limitNum,
          }),
          prisma.emprestimos.count({ where }),
          prisma.emprestimos.count({ where: scope }),
          prisma.emprestimos.count({
            where: { ...scope, status: "emprestado" },
          }),
          prisma.emprestimos.count({
            where: {
              ...scope,
              status: "emprestado",
              data_prevista_devolucao: { lt: new Date() },
            },
          }),
          prisma.emprestimos.count({
            where: { ...scope, data_real_devolucao: { not: null } },
          }),
        ]);

      const data = pageRows.map(({ livros, colaboradores, ...loan }) => ({
        ...loan,
        book_title: livros.titulo,
        book_author: livros.autor,
        employee_name: colaboradores.nome,
      }));

      return NextResponse.json({
        data,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        summary: {
          total: scopeTotal,
          active,
          overdue,
          returned,
        },
      });
    }

    const loans = await prisma.emprestimos.findMany({
      where,
      include: {
        livros: { select: { titulo: true, autor: true } },
        colaboradores: { select: { nome: true } },
      },
      orderBy: { data_emprestimo: "desc" },
    });

    const data = loans.map(({ livros, colaboradores, ...loan }) => ({
      ...loan,
      book_title: livros.titulo,
      book_author: livros.autor,
      employee_name: colaboradores.nome,
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      livro_id: bookId,
      colaborador_id: employeeId,
      data_emprestimo: loanDate,
      data_prevista_devolucao: dueDate,
    } = body;

    if (!bookId || !employeeId || !loanDate || !dueDate) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 },
      );
    }

    const loan = await prisma.$transaction(async (tx) => {
      const book = await tx.livros.findUnique({
        where: { id: Number(bookId) },
        select: { disponivel: true },
      });

      if (!book) {
        throw new Error("BOOK_NOT_FOUND");
      }

      if (!book.disponivel) {
        throw new Error("BOOK_UNAVAILABLE");
      }

      const newLoan = await tx.emprestimos.create({
        data: {
          livro_id: Number(bookId),
          colaborador_id: Number(employeeId),
          data_emprestimo: new Date(loanDate),
          data_prevista_devolucao: new Date(dueDate),
          status: "emprestado",
        },
      });

      await tx.livros.update({
        where: { id: Number(bookId) },
        data: { disponivel: false, updated_at: new Date() },
      });

      return newLoan;
    });

    revalidatePath("/biblioteca");
    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "BOOK_NOT_FOUND") {
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 },
      );
    }
    if (error instanceof Error && error.message === "BOOK_UNAVAILABLE") {
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

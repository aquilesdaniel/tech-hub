import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const genre = searchParams.get("genero");
    const available = searchParams.get("disponivel");
    const search = searchParams.get("search");

    const where: Prisma.livrosWhereInput = {};

    if (genre && genre !== "all") where.genero = genre;

    if (available === "true") where.disponivel = true;
    else if (available === "false") where.disponivel = false;

    if (search) {
      where.OR = [
        { titulo: { contains: search, mode: "insensitive" } },
        { autor: { contains: search, mode: "insensitive" } },
      ];
    }

    const books = await prisma.livros.findMany({
      where,
      orderBy: { titulo: "asc" },
    });

    return NextResponse.json(books);
  } catch (error) {
    console.error("Erro ao buscar livros:", error);
    return NextResponse.json(
      { error: "Erro ao buscar livros" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const coverUrl =
      cover ||
      `/placeholder.svg?height=200&width=150&query=${encodeURIComponent(
        title + " book",
      )}`;

    const book = await prisma.livros.create({
      data: {
        titulo: title,
        autor: author,
        genero: genre || "",
        isbn: isbn || "",
        disponivel: true,
        capa: coverUrl,
      },
    });

    revalidatePath("/biblioteca");
    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error("Erro ao adicionar livro:", error);
    return NextResponse.json(
      { error: "Erro ao adicionar livro" },
      { status: 500 },
    );
  }
}

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const genero = searchParams.get("genero");
    const disponivel = searchParams.get("disponivel");
    const search = searchParams.get("search");

    const where: Prisma.livrosWhereInput = {};

    if (genero && genero !== "todos") where.genero = genero;

    if (disponivel === "true") where.disponivel = true;
    else if (disponivel === "false") where.disponivel = false;

    if (search) {
      where.OR = [
        { titulo: { contains: search, mode: "insensitive" } },
        { autor: { contains: search, mode: "insensitive" } },
      ];
    }

    const livros = await prisma.livros.findMany({
      where,
      orderBy: { titulo: "asc" },
    });

    return NextResponse.json(livros);
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
    const { titulo, autor, genero, isbn, capa } = body;

    if (!titulo || !autor) {
      return NextResponse.json(
        { error: "Título e autor são obrigatórios" },
        { status: 400 },
      );
    }

    const capaUrl =
      capa ||
      `/placeholder.svg?height=200&width=150&query=${encodeURIComponent(
        titulo + " book",
      )}`;

    const livro = await prisma.livros.create({
      data: {
        titulo,
        autor,
        genero: genero || "",
        isbn: isbn || "",
        disponivel: true,
        capa: capaUrl,
      },
    });

    revalidatePath("/biblioteca");
    return NextResponse.json(livro, { status: 201 });
  } catch (error) {
    console.error("Erro ao adicionar livro:", error);
    return NextResponse.json(
      { error: "Erro ao adicionar livro" },
      { status: 500 },
    );
  }
}

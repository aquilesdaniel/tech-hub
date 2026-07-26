import { query, serializeForJSON } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Listar todos os livros
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const genero = searchParams.get("genero");
    const disponivel = searchParams.get("disponivel");
    const search = searchParams.get("search");

    let sqlQuery = "SELECT * FROM livros WHERE 1=1";
    const params: any[] = [];

    if (genero && genero !== "todos") {
      sqlQuery += ` AND genero = $${params.length + 1}`;
      params.push(genero);
    }

    if (disponivel === "true") {
      sqlQuery += ` AND disponivel = true`;
    } else if (disponivel === "false") {
      sqlQuery += ` AND disponivel = false`;
    }

    if (search) {
      sqlQuery += ` AND (titulo ILIKE $${params.length + 1} OR autor ILIKE $${
        params.length + 1
      })`;
      params.push(`%${search}%`);
    }

    sqlQuery += " ORDER BY titulo ASC";

    const livros = await query(sqlQuery, params);

    return NextResponse.json(serializeForJSON(livros));
  } catch (error) {
    console.error("Erro ao buscar livros:", error);
    return NextResponse.json(
      { error: "Erro ao buscar livros" },
      { status: 500 },
    );
  }
}

// POST - Adicionar novo livro
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { titulo, autor, genero, isbn, capa } = body;

    // Validação básica
    if (!titulo || !autor) {
      return NextResponse.json(
        { error: "Título e autor são obrigatórios" },
        { status: 400 },
      );
    }

    // Gerar URL da capa se não fornecida
    const capaUrl =
      capa ||
      `/placeholder.svg?height=200&width=150&query=${encodeURIComponent(
        titulo + " book",
      )}`;

    // Inserir novo livro
    const result = await query(
      `INSERT INTO livros (titulo, autor, genero, isbn, disponivel, capa) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [titulo, autor, genero || "", isbn || "", true, capaUrl],
    );

    revalidatePath("/biblioteca");
    return NextResponse.json(serializeForJSON(result[0]), { status: 201 });
  } catch (error) {
    console.error("Erro ao adicionar livro:", error);
    return NextResponse.json(
      { error: "Erro ao adicionar livro" },
      { status: 500 },
    );
  }
}

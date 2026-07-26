import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const result = await query("SELECT * FROM livros WHERE id = $1", [id]);

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(result[0]);
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
    const id = params.id;
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
    const result = await query(
      `UPDATE livros 
       SET titulo = $1, autor = $2, genero = $3, isbn = $4, capa = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [titulo, autor, genero || "", isbn || "", capa, id],
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 },
      );
    }

    revalidatePath("/biblioteca");
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Erro ao atualizar livro:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar livro" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const body = await req.json();

    // Construir query dinâmica com base nos campos fornecidos
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(body).forEach(([key, value]) => {
      if (key !== "id") {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo para atualizar" },
        { status: 400 },
      );
    }

    values.push(id);

    const result = await query(
      `UPDATE livros 
       SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values,
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 },
      );
    }

    revalidatePath("/biblioteca");
    return NextResponse.json(result[0]);
  } catch (error) {
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
    const id = params.id;

    // Verificar se o livro está emprestado
    const emprestimos = await query(
      "SELECT COUNT(*) as total FROM emprestimos WHERE livro_id = $1 AND status = $2",
      [id, "emprestado"],
    );

    if (Number.parseInt(emprestimos[0].total) > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir um livro que está emprestado" },
        { status: 400 },
      );
    }

    // Excluir livro
    await query("DELETE FROM livros WHERE id = $1", [id]);

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

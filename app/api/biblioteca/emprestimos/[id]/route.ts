import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Buscar empréstimo por ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const result = await query(
      `SELECT 
        e.*,
        l.titulo as livro_titulo,
        l.autor as livro_autor,
        c.nome as colaborador_nome
      FROM 
        emprestimos e
      JOIN 
        livros l ON e.livro_id = l.id
      JOIN 
        colaboradores c ON e.colaborador_id = c.id
      WHERE 
        e.id = $1`,
      [id],
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Empréstimo não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(result[0]);
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
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const body = await req.json();
    const { data_real_devolucao, status } = body;

    // Buscar empréstimo para obter o livro_id
    const emprestimoResult = await query(
      "SELECT livro_id FROM emprestimos WHERE id = $1",
      [id],
    );

    if (emprestimoResult.length === 0) {
      return NextResponse.json(
        { error: "Empréstimo não encontrado" },
        { status: 404 },
      );
    }

    const livroId = emprestimoResult[0].livro_id;

    // Iniciar transação
    await query("BEGIN");

    try {
      // Atualizar empréstimo
      const result = await query(
        `UPDATE emprestimos 
         SET data_real_devolucao = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [data_real_devolucao, status || "devolvido", id],
      );

      // Se o status for 'devolvido', atualizar disponibilidade do livro
      if (status === "devolvido" || !status) {
        await query(
          "UPDATE livros SET disponivel = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [livroId],
        );
      }

      // Confirmar transação
      await query("COMMIT");

      revalidatePath("/biblioteca");
      return NextResponse.json(result[0]);
    } catch (error) {
      // Reverter transação em caso de erro
      await query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Erro ao atualizar empréstimo:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar empréstimo" },
      { status: 500 },
    );
  }
}

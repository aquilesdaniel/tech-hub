import { query, serializeForJSON } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Listar todos os empréstimos
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const colaboradorId = searchParams.get("colaborador_id");

    let sqlQuery = `
      SELECT 
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
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status && status !== "todos") {
      sqlQuery += ` AND e.status = $${params.length + 1}`;
      params.push(status);
    }

    if (colaboradorId) {
      sqlQuery += ` AND e.colaborador_id = $${params.length + 1}`;
      params.push(colaboradorId);
    }

    sqlQuery += " ORDER BY e.data_emprestimo DESC";

    const emprestimos = await query(sqlQuery, params);

    return NextResponse.json(serializeForJSON(emprestimos));
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
    const {
      livro_id,
      colaborador_id,
      data_emprestimo,
      data_prevista_devolucao,
    } = body;

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

    // Verificar se o livro está disponível
    const livroResult = await query(
      "SELECT disponivel FROM livros WHERE id = $1",
      [livro_id],
    );

    if (livroResult.length === 0) {
      return NextResponse.json(
        { error: "Livro não encontrado" },
        { status: 404 },
      );
    }

    if (!livroResult[0].disponivel) {
      return NextResponse.json(
        { error: "Este livro não está disponível para empréstimo" },
        { status: 400 },
      );
    }

    // Iniciar transação
    await query("BEGIN");

    try {
      // Criar empréstimo
      const emprestimoResult = await query(
        `INSERT INTO emprestimos 
         (livro_id, colaborador_id, data_emprestimo, data_prevista_devolucao, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [
          livro_id,
          colaborador_id,
          data_emprestimo,
          data_prevista_devolucao,
          "emprestado",
        ],
      );

      // Atualizar disponibilidade do livro
      await query(
        "UPDATE livros SET disponivel = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [livro_id],
      );

      // Confirmar transação
      await query("COMMIT");

      revalidatePath("/biblioteca");
      return NextResponse.json(serializeForJSON(emprestimoResult[0]), {
        status: 201,
      });
    } catch (error) {
      // Reverter transação em caso de erro
      await query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Erro ao criar empréstimo:", error);
    return NextResponse.json(
      { error: "Erro ao criar empréstimo" },
      { status: 500 },
    );
  }
}

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Buscar setor por ID com colaboradores
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;

    // Buscar setor
    const setorResult = await query("SELECT * FROM setores WHERE id = $1", [
      id,
    ]);

    if (setorResult.length === 0) {
      return NextResponse.json(
        { error: "Setor não encontrado" },
        { status: 404 },
      );
    }

    // Buscar colaboradores do setor
    const colaboradoresResult = await query(
      "SELECT id, nome, email, cargo, status FROM colaboradores WHERE setor_id = $1 ORDER BY nome ASC",
      [id],
    );

    // Combinar resultados
    const result = {
      ...setorResult[0],
      colaboradores: colaboradoresResult,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar setor:", error);
    return NextResponse.json(
      { error: "Erro ao buscar setor" },
      { status: 500 },
    );
  }
}

// PUT - Atualizar setor
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const body = await req.json();
    const { nome, descricao } = body;

    // Validação básica
    if (!nome) {
      return NextResponse.json(
        { error: "Nome do setor é obrigatório" },
        { status: 400 },
      );
    }

    // Verificar se o setor existe
    const existingSetor = await query("SELECT id FROM setores WHERE id = $1", [
      id,
    ]);
    if (existingSetor.length === 0) {
      return NextResponse.json(
        { error: "Setor não encontrado" },
        { status: 404 },
      );
    }

    // Atualizar setor
    const result = await query(
      `UPDATE setores 
       SET nome = $1, descricao = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [nome, descricao || "", id],
    );

    revalidatePath("/admin");
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Erro ao atualizar setor:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar setor" },
      { status: 500 },
    );
  }
}

// DELETE - Remover setor (apenas se não tiver colaboradores)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;

    // Verificar se há colaboradores no setor
    const colaboradores = await query(
      "SELECT COUNT(*) as total FROM colaboradores WHERE setor_id = $1",
      [id],
    );

    if (Number.parseInt(colaboradores[0].total) > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir um setor que possui colaboradores" },
        { status: 400 },
      );
    }

    // Excluir setor
    await query("DELETE FROM setores WHERE id = $1", [id]);

    revalidatePath("/admin");
    return NextResponse.json({ message: "Setor excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir setor:", error);
    return NextResponse.json(
      { error: "Erro ao excluir setor" },
      { status: 500 },
    );
  }
}

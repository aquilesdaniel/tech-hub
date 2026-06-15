import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const result = await query(
      `SELECT c.*, s.nome as setor_nome
       FROM colaboradores c
       LEFT JOIN setores s ON c.setor_id = s.id
       WHERE c.id = $1`,
      [id],
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Erro ao buscar colaborador:", error);
    return NextResponse.json(
      { error: "Erro ao buscar colaborador" },
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
    const { nome, email, departamento, cargo, status, setor_id } = body;

    // Validação básica
    if (!nome || !email || !departamento) {
      return NextResponse.json(
        { error: "Nome, email e departamento são obrigatórios" },
        { status: 400 },
      );
    }

    // Verificar se o colaborador existe
    const existingUser = await query(
      "SELECT id FROM colaboradores WHERE id = $1",
      [id],
    );
    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    // Atualizar colaborador
    const result = await query(
      `UPDATE colaboradores 
       SET nome = $1, email = $2, departamento = $3, cargo = $4, status = $5, setor_id = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [nome, email, departamento, cargo, status, setor_id, id],
    );

    revalidatePath("/admin");
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Erro ao atualizar colaborador:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar colaborador" },
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
      `UPDATE colaboradores 
       SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING *`,
      values,
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    revalidatePath("/admin");
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Erro ao atualizar status do colaborador:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar status do colaborador" },
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

    // Soft delete - apenas marca como inativo
    const result = await query(
      `UPDATE colaboradores 
       SET status = 'inativo', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    revalidatePath("/admin");
    return NextResponse.json({ message: "Colaborador inativado com sucesso" });
  } catch (error) {
    console.error("Erro ao remover colaborador:", error);
    return NextResponse.json(
      { error: "Erro ao remover colaborador" },
      { status: 500 },
    );
  }
}

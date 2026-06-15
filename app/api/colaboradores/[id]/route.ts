import { query, serializeForJSON } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

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

    return NextResponse.json(serializeForJSON(result[0]));
  } catch (error) {
    console.error("Erro ao buscar colaborador:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar colaborador" },
      { status: 500 },
    );
  }
}

// PATCH - Atualizar um colaborador existente
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await req.json();

    // Campos que permitimos que sejam atualizados diretamente por esta rota
    const { document, country_code, area_code, number } = body;

    // Verificar se o colaborador existe
    const existing = await query("SELECT id FROM colaboradores WHERE id = $1", [
      id,
    ]);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    // Criar a query de atualização dinamicamente baseada nos dados enviados
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (document !== undefined) {
      updates.push(`document = $${paramIndex}`);
      values.push(document);
      paramIndex++;
    }

    if (country_code !== undefined) {
      updates.push(`country_code = $${paramIndex}`);
      values.push(country_code);
      paramIndex++;
    }

    if (area_code !== undefined) {
      updates.push(`area_code = $${paramIndex}`);
      values.push(area_code);
      paramIndex++;
    }

    if (number !== undefined) {
      updates.push(`number = $${paramIndex}`);
      values.push(number);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Nenhum dado válido fornecido para atualização" },
        { status: 400 },
      );
    }

    // Adiciona o ID como o último parâmetro para a cláusula WHERE
    values.push(id);

    const sqlQuery = `
      UPDATE colaboradores 
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sqlQuery, values);

    return NextResponse.json(serializeForJSON(result[0]), { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar colaborador:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar colaborador" },
      { status: 500 },
    );
  }
}

import { query, serializeForJSON } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

// GET - Listar todos os day-offs
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const usado = searchParams.get("usado");
    const colaboradorId = searchParams.get("colaborador_id");

    let sqlQuery = `
      SELECT 
        d.*,
        c.nome as colaborador_nome
      FROM 
        day_offs d
      JOIN 
        colaboradores c ON d.colaborador_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (usado === "true") {
      sqlQuery += ` AND d.usado = true`;
    } else if (usado === "false") {
      sqlQuery += ` AND d.usado = false`;
    }

    if (colaboradorId) {
      sqlQuery += ` AND d.colaborador_id = $${params.length + 1}`;
      params.push(colaboradorId);
    }

    sqlQuery += " ORDER BY d.data_liberacao DESC";

    const dayOffs = await query(sqlQuery, params);

    return NextResponse.json(serializeForJSON(dayOffs));
  } catch (error) {
    console.error("Erro ao buscar day-offs:", error);
    return NextResponse.json(
      { error: "Erro ao buscar day-offs" },
      { status: 500 },
    );
  }
}

// POST - Criar novo day-off
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { colaborador_id, motivo, data_liberacao } = body;

    // Validação básica
    if (!colaborador_id || !motivo) {
      return NextResponse.json(
        { error: "Colaborador e motivo são obrigatórios" },
        { status: 400 },
      );
    }

    // Inserir novo day-off
    const result = await query(
      `INSERT INTO day_offs 
       (colaborador_id, motivo, data_liberacao, usado) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [
        colaborador_id,
        motivo,
        data_liberacao || new Date().toISOString().split("T")[0],
        false,
      ],
    );

    return NextResponse.json(serializeForJSON(result[0]), { status: 201 });
  } catch (error) {
    console.error("Erro ao criar day-off:", error);
    return NextResponse.json(
      { error: "Erro ao criar day-off" },
      { status: 500 },
    );
  }
}

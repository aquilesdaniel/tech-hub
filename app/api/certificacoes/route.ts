import { query, serializeForJSON } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const colaborador_id = searchParams.get("colaborador_id");
    const tipo = searchParams.get("tipo");

    let sqlQuery =
      "SELECT c.*, col.nome as colaborador_nome FROM certificacoes c JOIN colaboradores col ON c.colaborador_id = col.id";
    const params: any[] = [];

    const conditions = [];
    if (colaborador_id) {
      conditions.push("c.colaborador_id = $" + (params.length + 1));
      params.push(colaborador_id);
    }
    if (tipo) {
      conditions.push("c.tipo = $" + (params.length + 1));
      params.push(tipo);
    }

    if (conditions.length > 0) {
      sqlQuery += " WHERE " + conditions.join(" AND ");
    }

    sqlQuery += " ORDER BY c.data_obtencao DESC";

    const certificacoes = await query(sqlQuery, params);
    return NextResponse.json(serializeForJSON(certificacoes));
  } catch (error) {
    console.error("Erro ao buscar certificações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      colaborador_id,
      nome,
      tipo,
      instituicao,
      data_obtencao,
      data_vencimento,
      url_credencial,
      observacoes,
    } = body;

    if (!colaborador_id || !nome || !tipo || !instituicao || !data_obtencao) {
      return NextResponse.json(
        {
          error:
            "Campos obrigatórios: colaborador_id, nome, tipo, instituicao, data_obtencao",
        },
        { status: 400 },
      );
    }

    const sqlQuery = `
      INSERT INTO certificacoes (colaborador_id, nome, tipo, instituicao, data_obtencao, data_vencimento, url_credencial, observacoes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id
    `;

    const result = await query(sqlQuery, [
      colaborador_id,
      nome,
      tipo,
      instituicao,
      data_obtencao,
      data_vencimento || null,
      url_credencial || null,
      observacoes || null,
    ]);

    return NextResponse.json(
      { message: "Certificação criada com sucesso", id: result[0]?.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar certificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

import { query, serializeForJSON } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const certificacoes = await query(
      "SELECT c.*, col.nome as colaborador_nome FROM certificacoes c JOIN colaboradores col ON c.colaborador_id = col.id WHERE c.id = $1",
      [id],
    );

    if (certificacoes.length === 0) {
      return NextResponse.json(
        { error: "Certificação não encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(serializeForJSON(certificacoes[0]));
  } catch (error) {
    console.error("Erro ao buscar certificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    console.log("PATCH request recebido para certificação ID:", params.id);
    const id = params.id;
    const body = await request.json();
    console.log("Body recebido:", body);

    const allowedFields = [
      "nome",
      "tipo",
      "instituicao",
      "data_obtencao",
      "data_vencimento",
      "url_credencial",
      "observacoes",
    ];

    const updates = Object.keys(body).filter((key) =>
      allowedFields.includes(key),
    );

    console.log("Campos para atualizar:", updates);

    if (updates.length === 0) {
      console.log("Nenhum campo válido encontrado");
      return NextResponse.json(
        { error: "Nenhum campo válido para atualizar" },
        { status: 400 },
      );
    }

    const setClause = updates
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");
    const values = updates.map((field) => body[field]);
    values.push(id);

    console.log(
      "SQL query:",
      `UPDATE certificacoes SET ${setClause}, updated_at = NOW() WHERE id = $${values.length}`,
    );
    console.log("Values:", values);

    const sqlQuery = `UPDATE certificacoes SET ${setClause}, updated_at = NOW() WHERE id = $${values.length}`;
    const result = await query(sqlQuery, values);

    console.log("Update realizado com sucesso");
    return NextResponse.json({
      message: "Certificação atualizada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao atualizar certificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const result = await query("DELETE FROM certificacoes WHERE id = $1", [id]);

    return NextResponse.json({ message: "Certificação removida com sucesso" });
  } catch (error) {
    console.error("Erro ao remover certificação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {}

// GET - Buscar dívida por ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const result = await query(
      `SELECT 
        d.*,
        c.nome as colaborador_nome
      FROM 
        dividas d
      JOIN 
        colaboradores c ON d.colaborador_id = c.id
      WHERE 
        d.id = $1`,
      [id],
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Dívida não encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Erro ao buscar dívida:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dívida" },
      { status: 500 },
    );
  }
}

// PATCH - Atualizar dívida (marcar como paga)
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

    // Buscar dívida para obter o colaborador_id e valor
    const dividaResult = await query(
      "SELECT colaborador_id, valor, pago FROM dividas WHERE id = $1",
      [id],
    );

    if (dividaResult.length === 0) {
      return NextResponse.json(
        { error: "Dívida não encontrada" },
        { status: 404 },
      );
    }

    const {
      colaborador_id: colaboradorId,
      valor,
      pago: jaEstaPago,
    } = dividaResult[0];

    // Iniciar transação
    await query("BEGIN");

    try {
      // Atualizar dívida
      const result = await query(
        `UPDATE dividas 
         SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${paramCount}
         RETURNING *`,
        values,
      );

      // Se a dívida foi marcada como paga e não estava paga antes, atualizar totalizador
      if (body.pago === true && !jaEstaPago) {
        await query(
          `UPDATE colaboradores 
           SET total_gasto_salgados = COALESCE(total_gasto_salgados, 0) + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [valor, colaboradorId],
        );
      }

      // Se a dívida foi desmarcada como paga (de pago para não pago), subtrair do totalizador
      if (body.pago === false && jaEstaPago) {
        await query(
          `UPDATE colaboradores 
           SET total_gasto_salgados = COALESCE(total_gasto_salgados, 0) - $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [valor, colaboradorId],
        );
      }

      // Confirmar transação
      await query("COMMIT");

      revalidatePath("/salgados");
      return NextResponse.json(result[0]);
    } catch (error) {
      // Reverter transação em caso de erro
      await query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Erro ao atualizar dívida:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar dívida" },
      { status: 500 },
    );
  }
}

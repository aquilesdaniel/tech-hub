import { query } from "@/lib/db";
import { type NextRequest, NextResponse } from "next/server";

// PATCH - Atualizar day-off (marcar como usado)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const body = await req.json();
    const { usado } = body;

    // Atualizar day-off
    const result = await query(
      `UPDATE day_offs 
       SET usado = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [usado, id],
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Day-off não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Erro ao atualizar day-off:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar day-off" },
      { status: 500 },
    );
  }
}

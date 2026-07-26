import { query, serializeForJSON } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Listar todas as dívidas
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const pago = searchParams.get("pago");
    const colaboradorId = searchParams.get("colaborador_id");
    const motivo = searchParams.get("motivo");
    const search = searchParams.get("search");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const motivosOnly = searchParams.get("motivos_only");

    if (motivosOnly === "true") {
      const result = await query(
        "SELECT DISTINCT motivo FROM dividas WHERE motivo IS NOT NULL AND motivo != ''",
      );
      const motivos = result.map((r: any) => r.motivo);
      return NextResponse.json(serializeForJSON(motivos));
    }

    let sqlQuery = `
      SELECT 
        d.*,
        c.nome as colaborador_nome
      FROM 
        dividas d
      JOIN 
        colaboradores c ON d.colaborador_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (pago === "true") {
      sqlQuery += ` AND d.pago = true`;
    } else if (pago === "false") {
      sqlQuery += ` AND d.pago = false`;
    }

    if (colaboradorId) {
      sqlQuery += ` AND d.colaborador_id = $${params.length + 1}`;
      params.push(colaboradorId);
    }

    if (motivo && motivo !== "todos") {
      sqlQuery += ` AND d.motivo = $${params.length + 1}`;
      params.push(motivo);
    }

    if (search) {
      sqlQuery += ` AND (c.nome ILIKE $${params.length + 1} OR d.item ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    // Se estiver usando paginação
    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      // Primeiro, conta o total
      const countQuery = `SELECT COUNT(*) FROM (${sqlQuery}) AS count_query`;
      const countResult = await query(countQuery, params);
      const total = parseInt(countResult[0].count);

      // Adiciona ordenação e limite
      sqlQuery += " ORDER BY d.data_inicio DESC";
      sqlQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limitNum, offset);

      const dividas = await query(sqlQuery, params);

      return NextResponse.json({
        data: serializeForJSON(dividas),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    sqlQuery += " ORDER BY d.data_inicio DESC";

    const dividas = await query(sqlQuery, params);

    return NextResponse.json(serializeForJSON(dividas));
  } catch (error) {
    console.error("Erro ao buscar dívidas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar dívidas" },
      { status: 500 },
    );
  }
}

// POST - Criar nova dívida
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { colaborador_id, item, motivo, data_inicio, valor } = body;

    // Validação básica
    if (!colaborador_id || !item || !valor) {
      return NextResponse.json(
        { error: "Colaborador, item e valor são obrigatórios" },
        { status: 400 },
      );
    }

    // Inserir nova dívida
    const result = await query(
      `INSERT INTO dividas 
       (colaborador_id, item, motivo, data_inicio, valor, pago) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        colaborador_id,
        item,
        motivo || "",
        data_inicio || new Date().toISOString().split("T")[0],
        valor,
        false,
      ],
    );

    revalidatePath("/salgados");
    return NextResponse.json(serializeForJSON(result[0]), { status: 201 });
  } catch (error) {
    console.error("Erro ao criar dívida:", error);
    return NextResponse.json(
      { error: "Erro ao criar dívida" },
      { status: 500 },
    );
  }
}

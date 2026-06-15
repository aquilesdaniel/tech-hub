import { query, serializeForJSON } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Listar todos os colaboradores
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const departamento = searchParams.get("departamento");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let sqlQuery = `
      SELECT c.*, s.nome as setor_nome
      FROM colaboradores c
      LEFT JOIN setores s ON c.setor_id = s.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (departamento && departamento !== "todos") {
      sqlQuery += ` AND c.departamento = $${params.length + 1}`;
      params.push(departamento);
    }

    if (status && status !== "todos") {
      sqlQuery += ` AND c.status = $${params.length + 1}`;
      params.push(status);
    }

    if (search) {
      sqlQuery += ` AND (c.nome ILIKE $${params.length + 1} OR c.email ILIKE $${
        params.length + 1
      })`;
      params.push(`%${search}%`);
    }

    sqlQuery += " ORDER BY c.nome ASC";

    const colaboradores = await query(sqlQuery, params);

    return NextResponse.json(serializeForJSON(colaboradores));
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    return NextResponse.json(
      { error: "Erro ao buscar colaboradores" },
      { status: 500 },
    );
  }
}

// POST - Criar novo colaborador
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, email, departamento, cargo, setor_id } = body;

    // Validação básica
    if (!nome || !email || !departamento) {
      return NextResponse.json(
        { error: "Nome, email e departamento são obrigatórios" },
        { status: 400 },
      );
    }

    // Verificar se o email já existe
    const existingUser = await query(
      "SELECT id FROM colaboradores WHERE email = $1",
      [email],
    );
    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Este email já está em uso" },
        { status: 409 },
      );
    }

    // Inserir novo colaborador
    const result = await query(
      `INSERT INTO colaboradores 
       (nome, email, departamento, cargo, data_admissao, status, setor_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        nome,
        email,
        departamento,
        cargo || "Colaborador",
        new Date().toISOString().split("T")[0],
        "ativo",
        setor_id || null,
      ],
    );

    revalidatePath("/admin");
    return NextResponse.json(serializeForJSON(result[0]), { status: 201 });
  } catch (error) {
    console.error("Erro ao criar colaborador:", error);
    return NextResponse.json(
      { error: "Erro ao criar colaborador" },
      { status: 500 },
    );
  }
}

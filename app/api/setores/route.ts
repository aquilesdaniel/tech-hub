import { query, serializeForJSON } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

// GET - Listar todos os setores com contagem de colaboradores
export async function GET() {
  try {
    const result = await query(`
      SELECT 
        s.id, 
        s.nome, 
        s.descricao, 
        s.created_at,
        s.updated_at,
        COUNT(c.id) AS total_colaboradores,
        (
          SELECT c2.nome 
          FROM colaboradores c2 
          WHERE c2.setor_id = s.id 
          ORDER BY c2.cargo DESC 
          LIMIT 1
        ) AS responsavel
      FROM 
        setores s
      LEFT JOIN 
        colaboradores c ON s.id = c.setor_id AND c.status = 'ativo'
      GROUP BY 
        s.id
      ORDER BY 
        s.nome ASC
    `);

    return NextResponse.json(serializeForJSON(result));
  } catch (error) {
    console.error("Erro ao buscar setores:", error);
    return NextResponse.json(
      { error: "Erro ao buscar setores" },
      { status: 500 },
    );
  }
}

// POST - Criar novo setor
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, descricao } = body;

    // Validação básica
    if (!nome) {
      return NextResponse.json(
        { error: "Nome do setor é obrigatório" },
        { status: 400 },
      );
    }

    // Verificar se o setor já existe
    const existingSetor = await query(
      "SELECT id FROM setores WHERE nome = $1",
      [nome],
    );
    if (existingSetor.length > 0) {
      return NextResponse.json(
        { error: "Este setor já existe" },
        { status: 409 },
      );
    }

    // Inserir novo setor
    const result = await query(
      `INSERT INTO setores (nome, descricao) VALUES ($1, $2) RETURNING *`,
      [nome, descricao || ""],
    );

    revalidatePath("/admin");
    return NextResponse.json(serializeForJSON(result[0]), { status: 201 });
  } catch (error) {
    console.error("Erro ao criar setor:", error);
    return NextResponse.json({ error: "Erro ao criar setor" }, { status: 500 });
  }
}

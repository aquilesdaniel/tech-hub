import { query, serializeForJSON } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Lista de emails de admins permanentes
const ADMINS_PERMANENTES = [
  "weliton.ribeiro@prismainformatica.com.br",
  "edson@prismainformatica.com.br",
  "ivan@prismainformatica.com.br",
  "jose.xavier@prismainformatica.com.br",
  "everson.freire@prismainformatica.com.br",
];

// GET - Listar colaboradores e status de admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get("user_email");

    // Verificar se o usuário logado é admin permanente
    if (!userEmail || !ADMINS_PERMANENTES.includes(userEmail.toLowerCase())) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas admins permanentes podem acessar esta funcionalidade.",
        },
        { status: 403 },
      );
    }

    const colaboradores = await query(`
      SELECT 
        id, 
        nome, 
        email, 
        tipo, 
        departamento, 
        cargo,
        admin_permanente,
        admin_temporario_ate,
        status,
        created_at
      FROM colaboradores 
      ORDER BY nome ASC
    `);

    return NextResponse.json(serializeForJSON(colaboradores));
  } catch (error) {
    console.error("Erro ao listar colaboradores:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// POST - Definir admin temporário
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { colaborador_id, admin_ate, user_email } = body;

    // Verificar se o usuário logado é admin permanente
    if (!user_email || !ADMINS_PERMANENTES.includes(user_email.toLowerCase())) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas admins permanentes podem definir admins temporários.",
        },
        { status: 403 },
      );
    }

    if (!colaborador_id || !admin_ate) {
      return NextResponse.json(
        { error: "Campos obrigatórios: colaborador_id, admin_ate" },
        { status: 400 },
      );
    }

    // Verificar se a data é futura
    const dataAdmin = new Date(admin_ate);
    const hoje = new Date();
    if (dataAdmin <= hoje) {
      return NextResponse.json(
        { error: "A data de expiração deve ser futura" },
        { status: 400 },
      );
    }

    // Verificar se o colaborador existe
    const colaboradorResult = await query(
      "SELECT id, nome, email, admin_permanente FROM colaboradores WHERE id = $1",
      [colaborador_id],
    );

    if (colaboradorResult.length === 0) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    const colaborador = colaboradorResult[0];

    // Não permitir definir admin temporário para admin permanente
    if (
      colaborador.admin_permanente ||
      ADMINS_PERMANENTES.includes(colaborador.email.toLowerCase())
    ) {
      return NextResponse.json(
        {
          error:
            "Não é possível definir admin temporário para um admin permanente",
        },
        { status: 400 },
      );
    }

    // Atualizar colaborador
    await query(
      `UPDATE colaboradores 
       SET admin_temporario_ate = $1, tipo = 'admin', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [admin_ate, colaborador_id],
    );

    return NextResponse.json({
      message: `Admin temporário definido para ${
        colaborador.nome
      } até ${new Date(admin_ate).toLocaleDateString("pt-BR")}`,
    });
  } catch (error) {
    console.error("Erro ao definir admin temporário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// DELETE - Remover admin temporário
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const colaborador_id = searchParams.get("colaborador_id");
    const user_email = searchParams.get("user_email");

    // Verificar se o usuário logado é admin permanente
    if (!user_email || !ADMINS_PERMANENTES.includes(user_email.toLowerCase())) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas admins permanentes podem remover admins temporários.",
        },
        { status: 403 },
      );
    }

    if (!colaborador_id) {
      return NextResponse.json(
        { error: "Campo obrigatório: colaborador_id" },
        { status: 400 },
      );
    }

    // Verificar se o colaborador existe e não é admin permanente
    const colaboradorResult = await query(
      "SELECT id, nome, email, admin_permanente FROM colaboradores WHERE id = $1",
      [colaborador_id],
    );

    if (colaboradorResult.length === 0) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    const colaborador = colaboradorResult[0];

    // Não permitir remover admin permanente
    if (
      colaborador.admin_permanente ||
      ADMINS_PERMANENTES.includes(colaborador.email.toLowerCase())
    ) {
      return NextResponse.json(
        { error: "Não é possível remover privilégios de admin permanente" },
        { status: 400 },
      );
    }

    // Remover privilégios de admin temporário
    await query(
      `UPDATE colaboradores 
       SET admin_temporario_ate = NULL, tipo = 'user', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [colaborador_id],
    );

    return NextResponse.json({
      message: `Privilégios de admin removidos para ${colaborador.nome}`,
    });
  } catch (error) {
    console.error("Erro ao remover admin temporário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

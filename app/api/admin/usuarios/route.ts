import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
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

    const search = searchParams.get("search");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    const where: Prisma.colaboradoresWhereInput = search
      ? {
          OR: [
            { nome: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const selecao = {
      id: true,
      nome: true,
      email: true,
      tipo: true,
      departamento: true,
      cargo: true,
      admin_permanente: true,
      admin_temporario_ate: true,
      status: true,
      created_at: true,
    };

    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;

      const [colaboradores, total, admins] = await prisma.$transaction([
        prisma.colaboradores.findMany({
          where,
          select: selecao,
          orderBy: { nome: "asc" },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.colaboradores.count({ where }),
        prisma.colaboradores.count({ where: { tipo: "admin" } }),
      ]);

      return NextResponse.json({
        data: colaboradores,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        resumo: { admins },
      });
    }

    const colaboradores = await prisma.colaboradores.findMany({
      where,
      select: selecao,
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(colaboradores);
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
    const colaborador = await prisma.colaboradores.findUnique({
      where: { id: Number(colaborador_id) },
      select: { id: true, nome: true, email: true, admin_permanente: true },
    });

    if (!colaborador) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    // Não permitir definir admin temporário para admin permanente
    if (
      colaborador.admin_permanente ||
      (colaborador.email &&
        ADMINS_PERMANENTES.includes(colaborador.email.toLowerCase()))
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
    await prisma.colaboradores.update({
      where: { id: colaborador.id },
      data: {
        admin_temporario_ate: dataAdmin,
        tipo: "admin",
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      message: `Admin temporário definido para ${
        colaborador.nome
      } até ${dataAdmin.toLocaleDateString("pt-BR")}`,
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
    const colaborador = await prisma.colaboradores.findUnique({
      where: { id: Number(colaborador_id) },
      select: { id: true, nome: true, email: true, admin_permanente: true },
    });

    if (!colaborador) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    // Não permitir remover admin permanente
    if (
      colaborador.admin_permanente ||
      (colaborador.email &&
        ADMINS_PERMANENTES.includes(colaborador.email.toLowerCase()))
    ) {
      return NextResponse.json(
        { error: "Não é possível remover privilégios de admin permanente" },
        { status: 400 },
      );
    }

    // Remover privilégios de admin temporário
    await prisma.colaboradores.update({
      where: { id: colaborador.id },
      data: {
        admin_temporario_ate: null,
        tipo: "user",
        updated_at: new Date(),
      },
    });

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

import type { Prisma } from "@/generated/prisma/client";
import { ehAdminPermanente } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const FILTRO_ADMINS: Prisma.colaboradoresWhereInput = {
  OR: [
    { admin_permanente: true },
    { tipo: "admin" },
    { admin_temporario_ate: { not: null } },
  ],
};

const FILTRO_CANDIDATOS: Prisma.colaboradoresWhereInput = {
  admin_permanente: { not: true },
  tipo: { not: "admin" },
};

function ehOProprioUsuario(
  emailAlvo?: string | null,
  emailSolicitante?: string | null,
) {
  return Boolean(
    emailAlvo &&
    emailSolicitante &&
    emailAlvo.toLowerCase() === emailSolicitante.trim().toLowerCase(),
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get("user_email");

    if (!(await ehAdminPermanente(userEmail))) {
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
    const escopo = searchParams.get("escopo");

    const filtroEscopo =
      escopo === "candidatos"
        ? FILTRO_CANDIDATOS
        : escopo === "todos"
          ? {}
          : FILTRO_ADMINS;

    const where: Prisma.colaboradoresWhereInput = search
      ? {
          AND: [
            filtroEscopo,
            {
              OR: [
                { nome: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            },
          ],
        }
      : filtroEscopo;

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
        prisma.colaboradores.count({ where: FILTRO_ADMINS }),
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { colaborador_id, admin_ate, user_email, admin_permanente } = body;

    if (!(await ehAdminPermanente(user_email))) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas admins permanentes podem gerenciar privilégios de admin.",
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

    const permanente = admin_permanente === true;

    if (!permanente && !admin_ate) {
      return NextResponse.json(
        { error: "Informe a data de expiração do admin temporário" },
        { status: 400 },
      );
    }

    let dataAdmin: Date | null = null;

    if (!permanente) {
      dataAdmin = new Date(`${String(admin_ate).slice(0, 10)}T23:59:59`);
      if (Number.isNaN(dataAdmin.getTime())) {
        return NextResponse.json(
          { error: "Data de expiração inválida" },
          { status: 400 },
        );
      }

      if (dataAdmin <= new Date()) {
        return NextResponse.json(
          { error: "A data de expiração deve ser futura" },
          { status: 400 },
        );
      }
    }

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

    if (ehOProprioUsuario(colaborador.email, user_email)) {
      return NextResponse.json(
        { error: "Você não pode alterar seus próprios privilégios de admin" },
        { status: 400 },
      );
    }

    if (colaborador.admin_permanente === true && !permanente) {
      const totalPermanentes = await prisma.colaboradores.count({
        where: { admin_permanente: true },
      });

      if (totalPermanentes <= 1) {
        return NextResponse.json(
          { error: "É necessário manter ao menos um admin permanente" },
          { status: 400 },
        );
      }
    }

    await prisma.colaboradores.update({
      where: { id: colaborador.id },
      data: {
        admin_permanente: permanente,
        admin_temporario_ate: dataAdmin,
        tipo: "admin",
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      message: permanente
        ? `${colaborador.nome} agora é admin permanente`
        : `Admin temporário definido para ${
            colaborador.nome
          } até ${dataAdmin!.toLocaleDateString("pt-BR")}`,
    });
  } catch (error) {
    console.error("Erro ao definir privilégios de admin:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const colaborador_id = searchParams.get("colaborador_id");
    const user_email = searchParams.get("user_email");

    if (!(await ehAdminPermanente(user_email))) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas admins permanentes podem remover privilégios de admin.",
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

    if (ehOProprioUsuario(colaborador.email, user_email)) {
      return NextResponse.json(
        { error: "Você não pode remover seus próprios privilégios de admin" },
        { status: 400 },
      );
    }

    if (colaborador.admin_permanente === true) {
      const totalPermanentes = await prisma.colaboradores.count({
        where: { admin_permanente: true },
      });

      if (totalPermanentes <= 1) {
        return NextResponse.json(
          { error: "É necessário manter ao menos um admin permanente" },
          { status: 400 },
        );
      }
    }

    await prisma.colaboradores.update({
      where: { id: colaborador.id },
      data: {
        admin_permanente: false,
        admin_temporario_ate: null,
        tipo: "user",
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      message: `Privilégios de admin removidos para ${colaborador.nome}`,
    });
  } catch (error) {
    console.error("Erro ao remover privilégios de admin:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/serialize";
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
      const result = await prisma.dividas.findMany({
        where: { AND: [{ motivo: { not: null } }, { motivo: { not: "" } }] },
        distinct: ["motivo"],
        select: { motivo: true },
      });
      return NextResponse.json(result.map((r) => r.motivo));
    }

    const where: Prisma.dividasWhereInput = {};

    if (pago === "true") where.pago = true;
    else if (pago === "false") where.pago = false;

    if (colaboradorId) where.colaborador_id = Number(colaboradorId);

    if (motivo && motivo !== "todos") where.motivo = motivo;

    if (search) {
      where.OR = [
        { colaboradores: { nome: { contains: search, mode: "insensitive" } } },
        { item: { contains: search, mode: "insensitive" } },
      ];
    }

    // Se estiver usando paginação
    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const [dividas, total] = await prisma.$transaction([
        prisma.dividas.findMany({
          where,
          include: { colaboradores: { select: { nome: true } } },
          orderBy: { data_inicio: "desc" },
          skip,
          take: limitNum,
        }),
        prisma.dividas.count({ where }),
      ]);

      const data = dividas.map(({ colaboradores, ...divida }) => ({
        ...divida,
        colaborador_nome: colaboradores.nome,
      }));

      return NextResponse.json({
        data: serializeDecimals(data),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    const dividas = await prisma.dividas.findMany({
      where,
      include: { colaboradores: { select: { nome: true } } },
      orderBy: { data_inicio: "desc" },
    });

    const data = dividas.map(({ colaboradores, ...divida }) => ({
      ...divida,
      colaborador_nome: colaboradores.nome,
    }));

    return NextResponse.json(serializeDecimals(data));
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

    const divida = await prisma.dividas.create({
      data: {
        colaborador_id: Number(colaborador_id),
        item,
        motivo: motivo || "",
        data_inicio: data_inicio ? new Date(data_inicio) : new Date(),
        valor,
        pago: false,
      },
    });

    revalidatePath("/salgados");
    return NextResponse.json(serializeDecimals(divida), { status: 201 });
  } catch (error) {
    console.error("Erro ao criar dívida:", error);
    return NextResponse.json(
      { error: "Erro ao criar dívida" },
      { status: 500 },
    );
  }
}

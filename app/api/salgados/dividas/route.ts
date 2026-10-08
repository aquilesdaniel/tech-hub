import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/serialize";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const paid = searchParams.get("pago");
    const employeeId = searchParams.get("colaborador_id");
    const reason = searchParams.get("motivo");
    const search = searchParams.get("search");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const reasonsOnly = searchParams.get("reasons_only");

    if (reasonsOnly === "true") {
      const result = await prisma.dividas.findMany({
        where: { AND: [{ motivo: { not: null } }, { motivo: { not: "" } }] },
        distinct: ["motivo"],
        select: { motivo: true },
      });
      return NextResponse.json(result.map((r) => r.motivo));
    }

    const where: Prisma.dividasWhereInput = {};

    if (paid === "true") where.pago = true;
    else if (paid === "false") where.pago = false;

    if (employeeId) where.colaborador_id = Number(employeeId);

    if (reason && reason !== "all") where.motivo = reason;

    if (search) {
      where.OR = [
        { colaboradores: { nome: { contains: search, mode: "insensitive" } } },
        { item: { contains: search, mode: "insensitive" } },
      ];
    }

    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      const [debts, total] = await prisma.$transaction([
        prisma.dividas.findMany({
          where,
          include: { colaboradores: { select: { nome: true } } },
          orderBy: { data_inicio: "desc" },
          skip,
          take: limitNum,
        }),
        prisma.dividas.count({ where }),
      ]);

      const data = debts.map(({ colaboradores, ...debt }) => ({
        ...debt,
        employee_name: colaboradores.nome,
      }));

      return NextResponse.json({
        data: serializeDecimals(data),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      });
    }

    const debts = await prisma.dividas.findMany({
      where,
      include: { colaboradores: { select: { nome: true } } },
      orderBy: { data_inicio: "desc" },
    });

    const data = debts.map(({ colaboradores, ...debt }) => ({
      ...debt,
      employee_name: colaboradores.nome,
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      colaborador_id: employeeId,
      item,
      motivo: reason,
      data_inicio: startDate,
      valor: amount,
    } = body;

    if (!employeeId || !item || !amount) {
      return NextResponse.json(
        { error: "Colaborador, item e valor são obrigatórios" },
        { status: 400 },
      );
    }

    const debt = await prisma.dividas.create({
      data: {
        colaborador_id: Number(employeeId),
        item,
        motivo: reason || "",
        data_inicio: startDate ? new Date(startDate) : new Date(),
        valor: amount,
        pago: false,
      },
    });

    revalidatePath("/salgados");
    return NextResponse.json(serializeDecimals(debt), { status: 201 });
  } catch (error) {
    console.error("Erro ao criar dívida:", error);
    return NextResponse.json(
      { error: "Erro ao criar dívida" },
      { status: 500 },
    );
  }
}

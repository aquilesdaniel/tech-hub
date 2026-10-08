import type { Prisma } from "@/generated/prisma/client";
import {
  SAFE_EMPLOYEE_SELECT,
  sanitizeEmployee,
} from "@/lib/employees";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/serialize";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const department = searchParams.get("departamento");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    const where: Prisma.colaboradoresWhereInput = {};

    if (department && department !== "all") {
      where.departamento = department;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const employeeSelect = {
      ...SAFE_EMPLOYEE_SELECT,
      setores: { select: { nome: true } },
    };

    type EmployeeRow = { setores: { nome: string } | null } & Record<
      string,
      unknown
    >;

    const formatRows = (rows: EmployeeRow[]) =>
      rows.map(({ setores: sector, ...employee }) => ({
        ...sanitizeEmployee(employee as never),
        sector_name: sector?.nome ?? null,
      }));

    if (page && limit) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;

      const [employees, total, activeCount, departments] =
        await prisma.$transaction([
          prisma.colaboradores.findMany({
            where,
            select: employeeSelect,
            orderBy: { nome: "asc" },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
          }),
          prisma.colaboradores.count({ where }),
          prisma.colaboradores.count({ where: { status: "ativo" } }),
          prisma.colaboradores.findMany({
            distinct: ["departamento"],
            select: { departamento: true },
            orderBy: { departamento: "asc" },
          }),
        ]);

      const overallTotal = await prisma.colaboradores.count();

      return NextResponse.json({
        data: serializeDecimals(formatRows(employees as EmployeeRow[])),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        summary: {
          total: overallTotal,
          active: activeCount,
          inactive: overallTotal - activeCount,
          departments: departments
            .map((d) => d.departamento)
            .filter((d): d is string => Boolean(d)),
        },
      });
    }

    const employees = await prisma.colaboradores.findMany({
      where,
      select: employeeSelect,
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(
      serializeDecimals(formatRows(employees as EmployeeRow[])),
    );
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    return NextResponse.json(
      { error: "Erro ao buscar colaboradores" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nome: name,
      email,
      departamento: department,
      cargo: jobTitle,
      setor_id: sectorId,
    } = body;

    if (!name || !email || !department) {
      return NextResponse.json(
        { error: "Nome, email e departamento são obrigatórios" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.colaboradores.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Este email já está em uso" },
        { status: 409 },
      );
    }

    const employee = await prisma.colaboradores.create({
      data: {
        nome: name,
        email,
        departamento: department,
        cargo: jobTitle || "Colaborador",
        data_admissao: new Date(),
        status: "ativo",
        setor_id: sectorId ? Number(sectorId) : null,
      },
      select: SAFE_EMPLOYEE_SELECT,
    });

    revalidatePath("/admin");
    return NextResponse.json(
      serializeDecimals(sanitizeEmployee(employee)),
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar colaborador:", error);
    return NextResponse.json(
      { error: "Erro ao criar colaborador" },
      { status: 500 },
    );
  }
}

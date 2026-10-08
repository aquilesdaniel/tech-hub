import type { Prisma } from "@/generated/prisma/client";
import {
  SAFE_EMPLOYEE_SELECT,
  sanitizeEmployee,
} from "@/lib/employees";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/serialize";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);

    const employee = await prisma.colaboradores.findUnique({
      where: { id },
      select: {
        ...SAFE_EMPLOYEE_SELECT,
        setores: { select: { nome: true } },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    const { setores: sector, ...rest } = employee;
    const result = { ...sanitizeEmployee(rest), sector_name: sector?.nome ?? null };

    return NextResponse.json(serializeDecimals(result));
  } catch (error) {
    console.error("Erro ao buscar colaborador:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar colaborador" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json();

    const {
      document,
      country_code: countryCode,
      area_code: areaCode,
      number,
      nome: name,
      email,
      departamento: department,
      cargo: jobTitle,
      setor_id: rawSectorId,
      status,
      data_admissao: rawHireDate,
    } = body;

    const existing = await prisma.colaboradores.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    const data: Prisma.colaboradoresUpdateInput = { updated_at: new Date() };

    if (document !== undefined) data.document = document;
    if (countryCode !== undefined) data.country_code = countryCode;
    if (areaCode !== undefined) data.area_code = areaCode;
    if (number !== undefined) data.number = number;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return NextResponse.json(
          { error: "Nome não pode ficar vazio" },
          { status: 400 },
        );
      }
      data.nome = String(name).trim();
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail) {
        return NextResponse.json(
          { error: "Email não pode ficar vazio" },
          { status: 400 },
        );
      }

      if (normalizedEmail !== existing.email?.toLowerCase()) {
        const emailInUse = await prisma.colaboradores.findFirst({
          where: { email: normalizedEmail, id: { not: id } },
          select: { id: true },
        });
        if (emailInUse) {
          return NextResponse.json(
            { error: "Este email já está em uso" },
            { status: 409 },
          );
        }
      }

      data.email = normalizedEmail;
    }

    if (department !== undefined) {
      if (!String(department).trim()) {
        return NextResponse.json(
          { error: "Departamento não pode ficar vazio" },
          { status: 400 },
        );
      }
      data.departamento = String(department).trim();
    }

    if (jobTitle !== undefined) data.cargo = jobTitle || null;

    if (rawSectorId !== undefined) {
      const sectorId =
        rawSectorId === null || rawSectorId === "" ? null : Number(rawSectorId);

      if (sectorId !== null && !Number.isFinite(sectorId)) {
        return NextResponse.json({ error: "Setor inválido" }, { status: 400 });
      }

      if (sectorId !== null) {
        const sector = await prisma.setores.findUnique({
          where: { id: sectorId },
          select: { id: true },
        });
        if (!sector) {
          return NextResponse.json(
            { error: "Setor não encontrado" },
            { status: 400 },
          );
        }
      }

      data.setores = sectorId
        ? { connect: { id: sectorId } }
        : { disconnect: true };
    }

    if (status !== undefined) {
      if (status !== "ativo" && status !== "inativo") {
        return NextResponse.json(
          { error: "Status deve ser 'ativo' ou 'inativo'" },
          { status: 400 },
        );
      }
      data.status = status;
    }

    if (rawHireDate !== undefined) {
      if (rawHireDate === null || rawHireDate === "") {
        data.data_admissao = null;
      } else {
        const hireDate = new Date(rawHireDate);
        if (Number.isNaN(hireDate.getTime())) {
          return NextResponse.json(
            { error: "Data de admissão inválida" },
            { status: 400 },
          );
        }
        data.data_admissao = hireDate;
      }
    }

    if (Object.keys(data).length === 1) {
      return NextResponse.json(
        { error: "Nenhum dado válido fornecido para atualização" },
        { status: 400 },
      );
    }

    const employee = await prisma.colaboradores.update({
      where: { id },
      data,
      select: { ...SAFE_EMPLOYEE_SELECT, setores: { select: { nome: true } } },
    });

    revalidatePath("/admin");

    const { setores: sector, ...rest } = employee;

    return NextResponse.json(
      serializeDecimals({
        ...sanitizeEmployee(rest),
        sector_name: sector?.nome ?? null,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao atualizar colaborador:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar colaborador" },
      { status: 500 },
    );
  }
}

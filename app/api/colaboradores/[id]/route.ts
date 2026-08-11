import type { Prisma } from "@/generated/prisma/client";
import {
  COLABORADOR_SELECT_SEGURO,
  sanitizarColaborador,
} from "@/lib/colaboradores";
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

    const colaborador = await prisma.colaboradores.findUnique({
      where: { id },
      select: {
        ...COLABORADOR_SELECT_SEGURO,
        setores: { select: { nome: true } },
      },
    });

    if (!colaborador) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    const { setores, ...rest } = colaborador;
    const result = { ...sanitizarColaborador(rest), setor_nome: setores?.nome ?? null };

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
      country_code,
      area_code,
      number,
      nome,
      email,
      departamento,
      cargo,
      setor_id,
      status,
      data_admissao,
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
    if (country_code !== undefined) data.country_code = country_code;
    if (area_code !== undefined) data.area_code = area_code;
    if (number !== undefined) data.number = number;

    if (nome !== undefined) {
      if (!String(nome).trim()) {
        return NextResponse.json(
          { error: "Nome não pode ficar vazio" },
          { status: 400 },
        );
      }
      data.nome = String(nome).trim();
    }

    if (email !== undefined) {
      const emailNormalizado = String(email).trim().toLowerCase();
      if (!emailNormalizado) {
        return NextResponse.json(
          { error: "Email não pode ficar vazio" },
          { status: 400 },
        );
      }

      if (emailNormalizado !== existing.email?.toLowerCase()) {
        const emailEmUso = await prisma.colaboradores.findFirst({
          where: { email: emailNormalizado, id: { not: id } },
          select: { id: true },
        });
        if (emailEmUso) {
          return NextResponse.json(
            { error: "Este email já está em uso" },
            { status: 409 },
          );
        }
      }

      data.email = emailNormalizado;
    }

    if (departamento !== undefined) {
      if (!String(departamento).trim()) {
        return NextResponse.json(
          { error: "Departamento não pode ficar vazio" },
          { status: 400 },
        );
      }
      data.departamento = String(departamento).trim();
    }

    if (cargo !== undefined) data.cargo = cargo || null;

    if (setor_id !== undefined) {
      const setorId =
        setor_id === null || setor_id === "" ? null : Number(setor_id);

      if (setorId !== null && !Number.isFinite(setorId)) {
        return NextResponse.json({ error: "Setor inválido" }, { status: 400 });
      }

      if (setorId !== null) {
        const setor = await prisma.setores.findUnique({
          where: { id: setorId },
          select: { id: true },
        });
        if (!setor) {
          return NextResponse.json(
            { error: "Setor não encontrado" },
            { status: 400 },
          );
        }
      }

      data.setores = setorId
        ? { connect: { id: setorId } }
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

    if (data_admissao !== undefined) {
      if (data_admissao === null || data_admissao === "") {
        data.data_admissao = null;
      } else {
        const dataConvertida = new Date(data_admissao);
        if (Number.isNaN(dataConvertida.getTime())) {
          return NextResponse.json(
            { error: "Data de admissão inválida" },
            { status: 400 },
          );
        }
        data.data_admissao = dataConvertida;
      }
    }

    if (Object.keys(data).length === 1) {
      return NextResponse.json(
        { error: "Nenhum dado válido fornecido para atualização" },
        { status: 400 },
      );
    }

    const colaborador = await prisma.colaboradores.update({
      where: { id },
      data,
      select: { ...COLABORADOR_SELECT_SEGURO, setores: { select: { nome: true } } },
    });

    revalidatePath("/admin");

    const { setores, ...rest } = colaborador;

    return NextResponse.json(
      serializeDecimals({
        ...sanitizarColaborador(rest),
        setor_nome: setores?.nome ?? null,
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

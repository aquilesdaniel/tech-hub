import {
  COLABORADOR_SELECT_SEGURO,
  sanitizarColaborador,
} from "@/lib/colaboradores";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/serialize";
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

// PATCH - Atualizar um colaborador existente
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json();

    // Campos que permitimos que sejam atualizados diretamente por esta rota
    const { document, country_code, area_code, number } = body;

    // Verificar se o colaborador existe
    const existing = await prisma.colaboradores.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    // Construir dinamicamente apenas com os campos enviados
    const data: {
      document?: string;
      country_code?: string;
      area_code?: string;
      number?: string;
      updated_at: Date;
    } = { updated_at: new Date() };

    if (document !== undefined) data.document = document;
    if (country_code !== undefined) data.country_code = country_code;
    if (area_code !== undefined) data.area_code = area_code;
    if (number !== undefined) data.number = number;

    if (Object.keys(data).length === 1) {
      return NextResponse.json(
        { error: "Nenhum dado válido fornecido para atualização" },
        { status: 400 },
      );
    }

    const colaborador = await prisma.colaboradores.update({
      where: { id },
      data,
      select: COLABORADOR_SELECT_SEGURO,
    });

    return NextResponse.json(
      serializeDecimals(sanitizarColaborador(colaborador)),
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

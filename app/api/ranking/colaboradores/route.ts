import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const colaboradores = await prisma.colaboradores.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        departamento: true,
        certificacoes: { select: { tipo: true, data_obtencao: true } },
      },
      orderBy: { certificacoes: { _count: "desc" } },
    });

    const resultado = colaboradores.map(({ certificacoes, ...colaborador }) => {
      const total_certificacoes = certificacoes.length;
      const certificacoes_senior = certificacoes.filter(
        (c) => c.tipo === "Certificação Senior",
      ).length;
      const outras_certificacoes = total_certificacoes - certificacoes_senior;

      const ultima_certificacao = certificacoes.reduce<Date | null>(
        (max, c) => (!max || c.data_obtencao > max ? c.data_obtencao : max),
        null,
      );

      const tipos_certificacao = certificacoes.reduce<Record<string, number>>(
        (acc, c) => {
          acc[c.tipo] = (acc[c.tipo] ?? 0) + 1;
          return acc;
        },
        {},
      );

      return {
        ...colaborador,
        total_certificacoes,
        certificacoes_senior,
        outras_certificacoes,
        ultima_certificacao,
        tipos_certificacao,
      };
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao buscar estatísticas dos colaboradores:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

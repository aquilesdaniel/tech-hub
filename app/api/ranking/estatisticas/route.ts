import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    const [
      totalColaboradores,
      totalCertificacoes,
      certificacoesPorColaborador,
      colaboradorMaisCertificacoes,
      tipoMaisPopular,
      certificacoesRecentes,
    ] = await prisma.$transaction([
      prisma.colaboradores.count(),
      prisma.certificacoes.count(),
      prisma.certificacoes.groupBy({
        by: ["colaborador_id"],
        orderBy: { colaborador_id: "asc" },
      }),
      prisma.colaboradores.findFirst({
        orderBy: { certificacoes: { _count: "desc" } },
        select: { nome: true },
      }),
      prisma.certificacoes.groupBy({
        by: ["tipo"],
        _count: { _all: true },
        orderBy: { _count: { tipo: "desc" } },
        take: 1,
      }),
      prisma.certificacoes.findMany({
        where: { data_obtencao: { gte: seisMesesAtras } },
        select: { data_obtencao: true },
      }),
    ]);

    const mediaCertificacoesPorColaborador =
      certificacoesPorColaborador.length > 0
        ? totalCertificacoes / certificacoesPorColaborador.length
        : 0;

    const crescimentoPorMes = new Map<string, number>();
    for (const cert of certificacoesRecentes) {
      const mes = cert.data_obtencao.toISOString().slice(0, 7);
      crescimentoPorMes.set(mes, (crescimentoPorMes.get(mes) ?? 0) + 1);
    }

    const crescimento_mensal = Array.from(crescimentoPorMes.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, certificacoes]) => ({ mes, certificacoes }));

    return NextResponse.json({
      total_colaboradores: totalColaboradores,
      total_certificacoes: totalCertificacoes,
      media_certificacoes_por_colaborador: mediaCertificacoesPorColaborador,
      colaborador_mais_certificacoes: colaboradorMaisCertificacoes?.nome ?? "N/A",
      tipo_certificacao_mais_popular: tipoMaisPopular[0]?.tipo ?? "N/A",
      crescimento_mensal,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas gerais:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

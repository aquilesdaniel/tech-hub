import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      totalEmployees,
      totalCertifications,
      certificationsByEmployee,
      topCertifiedEmployee,
      mostPopularType,
      recentCertifications,
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
        where: { data_obtencao: { gte: sixMonthsAgo } },
        select: { data_obtencao: true },
      }),
    ]);

    const averageCertificationsPerEmployee =
      certificationsByEmployee.length > 0
        ? totalCertifications / certificationsByEmployee.length
        : 0;

    const growthByMonth = new Map<string, number>();
    for (const cert of recentCertifications) {
      const month = cert.data_obtencao.toISOString().slice(0, 7);
      growthByMonth.set(month, (growthByMonth.get(month) ?? 0) + 1);
    }

    const monthly_growth = Array.from(growthByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, certifications]) => ({ month, certifications }));

    return NextResponse.json({
      total_employees: totalEmployees,
      total_certifications: totalCertifications,
      average_certifications_per_employee: averageCertificationsPerEmployee,
      top_certified_employee: topCertifiedEmployee?.nome ?? "N/A",
      most_popular_certification_type: mostPopularType[0]?.tipo ?? "N/A",
      monthly_growth,
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas gerais:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

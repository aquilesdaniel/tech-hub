import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const employees = await prisma.colaboradores.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        departamento: true,
        certificacoes: { select: { tipo: true, data_obtencao: true } },
      },
      orderBy: { certificacoes: { _count: "desc" } },
    });

    const result = employees.map(
      ({ certificacoes: certifications, ...employee }) => {
        const total_certifications = certifications.length;
        const senior_certifications = certifications.filter(
          (c) => c.tipo === "Certificação Senior",
        ).length;
        const other_certifications =
          total_certifications - senior_certifications;

        const last_certification = certifications.reduce<Date | null>(
          (max, c) => (!max || c.data_obtencao > max ? c.data_obtencao : max),
          null,
        );

        const certification_types = certifications.reduce<
          Record<string, number>
        >((acc, c) => {
          acc[c.tipo] = (acc[c.tipo] ?? 0) + 1;
          return acc;
        }, {});

        return {
          ...employee,
          total_certifications,
          senior_certifications,
          other_certifications,
          last_certification,
          certification_types,
        };
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar estatísticas dos colaboradores:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

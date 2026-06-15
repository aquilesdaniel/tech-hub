import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Query para buscar estatísticas de certificações por colaborador
    const colaboradoresStats = await query(`
      SELECT 
        c.id,
        c.nome,
        c.email,
        c.departamento,
        COUNT(cert.id) as total_certificacoes,
        COUNT(CASE WHEN cert.tipo = 'Certificação Senior' THEN 1 END) as certificacoes_senior,
        COUNT(CASE WHEN cert.tipo != 'Certificação Senior' THEN 1 END) as outras_certificacoes,
        MAX(cert.data_obtencao) as ultima_certificacao
      FROM colaboradores c
      LEFT JOIN certificacoes cert ON c.id = cert.colaborador_id
      GROUP BY c.id, c.nome, c.email, c.departamento
      ORDER BY total_certificacoes DESC
    `);

    // Para cada colaborador, buscar a distribuição de tipos de certificação
    const colaboradoresComTipos = await Promise.all(
      colaboradoresStats.map(async (colaborador: any) => {
        const tiposCert = await query(
          `
          SELECT tipo, COUNT(*) as quantidade
          FROM certificacoes
          WHERE colaborador_id = $1
          GROUP BY tipo
        `,
          [colaborador.id],
        );

        const tipos_certificacao = tiposCert.reduce((acc: any, tipo: any) => {
          acc[tipo.tipo] = parseInt(tipo.quantidade);
          return acc;
        }, {});

        return {
          ...colaborador,
          total_certificacoes: parseInt(colaborador.total_certificacoes),
          certificacoes_senior: parseInt(colaborador.certificacoes_senior),
          outras_certificacoes: parseInt(colaborador.outras_certificacoes),
          tipos_certificacao,
        };
      }),
    );

    return NextResponse.json(colaboradoresComTipos);
  } catch (error) {
    console.error("Erro ao buscar estatísticas dos colaboradores:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

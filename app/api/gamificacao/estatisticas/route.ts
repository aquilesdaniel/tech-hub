import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Total de colaboradores
    const totalColaboradores = await query(`
      SELECT COUNT(*) as total FROM colaboradores
    `);

    // Total de certificações
    const totalCertificacoes = await query(`
      SELECT COUNT(*) as total FROM certificacoes
    `);

    // Média de certificações por colaborador
    const mediaCertificacoes = await query(`
      SELECT AVG(cert_count) as media
      FROM (
        SELECT COUNT(*) as cert_count
        FROM certificacoes
        GROUP BY colaborador_id
      ) as subquery
    `);

    // Colaborador com mais certificações
    const colaboradorMaisCert = await query(`
      SELECT c.nome, COUNT(cert.id) as total
      FROM colaboradores c
      LEFT JOIN certificacoes cert ON c.id = cert.colaborador_id
      GROUP BY c.id, c.nome
      ORDER BY total DESC
      LIMIT 1
    `);

    // Tipo de certificação mais popular
    const tipoMaisPopular = await query(`
      SELECT tipo, COUNT(*) as total
      FROM certificacoes
      GROUP BY tipo
      ORDER BY total DESC
      LIMIT 1
    `);

    // Crescimento mensal (últimos 6 meses)
    const crescimentoMensal = await query(`
      SELECT 
        TO_CHAR(data_obtencao, 'YYYY-MM') as mes,
        COUNT(*) as certificacoes
      FROM certificacoes
      WHERE data_obtencao >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(data_obtencao, 'YYYY-MM')
      ORDER BY mes
    `);

    const estatisticasGerais = {
      total_colaboradores: parseInt(totalColaboradores[0]?.total || 0),
      total_certificacoes: parseInt(totalCertificacoes[0]?.total || 0),
      media_certificacoes_por_colaborador: parseFloat(
        mediaCertificacoes[0]?.media || 0,
      ),
      colaborador_mais_certificacoes: colaboradorMaisCert[0]?.nome || "N/A",
      tipo_certificacao_mais_popular: tipoMaisPopular[0]?.tipo || "N/A",
      crescimento_mensal: crescimentoMensal.map((item: any) => ({
        mes: item.mes,
        certificacoes: parseInt(item.certificacoes),
      })),
    };

    return NextResponse.json(estatisticasGerais);
  } catch (error) {
    console.error("Erro ao buscar estatísticas gerais:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

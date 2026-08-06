import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ABREV_MES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const DIAS_ALERTA_VENCIMENTO = 90;
const MS_POR_DIA = 86_400_000;

function chaveMes(data: Date) {
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

function rotuloMes(chave: string) {
  const [ano, mes] = chave.split("-");
  return `${ABREV_MES[Number(mes) - 1]}/${ano.slice(2)}`;
}

function inicioMesUTC(referencia: Date, deslocamentoMeses: number) {
  return new Date(
    Date.UTC(
      referencia.getUTCFullYear(),
      referencia.getUTCMonth() + deslocamentoMeses,
      1,
    ),
  );
}

function paraNumero(valor: unknown) {
  return Number(valor ?? 0) || 0;
}

function variacao(atual: number, anterior: number) {
  if (anterior === 0) return atual === 0 ? 0 : null;
  return ((atual - anterior) / anterior) * 100;
}

function acumular<T>(
  linhas: T[],
  chave: (linha: T) => string | null,
  valor: (linha: T) => number,
) {
  const mapa = new Map<string, number>();
  for (const linha of linhas) {
    const k = chave(linha);
    if (k === null) continue;
    mapa.set(k, (mapa.get(k) ?? 0) + valor(linha));
  }
  return mapa;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const mesesBrutos = Number(params.get("meses") ?? 6);
    const meses = [0, 3, 6, 12, 24].includes(mesesBrutos) ? mesesBrutos : 6;

    const setorParam = params.get("setorId");
    const setorId =
      setorParam && setorParam !== "todos" ? Number(setorParam) : null;

    const colaboradorParam = params.get("colaboradorId");
    const colaboradorId = colaboradorParam ? Number(colaboradorParam) : null;

    const agora = new Date();
    const hojeUTC = new Date(
      Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
    );

    const inicio = meses > 0 ? inicioMesUTC(hojeUTC, -(meses - 1)) : null;
    const inicioAnterior =
      meses > 0 ? inicioMesUTC(hojeUTC, -(meses * 2 - 1)) : null;

    const filtroColaborador: { setor_id?: number; id?: number } = {};
    if (setorId !== null) filtroColaborador.setor_id = setorId;
    if (colaboradorId !== null) filtroColaborador.id = colaboradorId;
    const escopo =
      Object.keys(filtroColaborador).length > 0
        ? { colaboradores: filtroColaborador }
        : {};

    const desdeAnterior = inicioAnterior ? { gte: inicioAnterior } : undefined;

    const limiteVencimento = new Date(
      hojeUTC.getTime() + DIAS_ALERTA_VENCIMENTO * MS_POR_DIA,
    );

    const [
      dividasJanela,
      dividasAbertas,
      certificacoesJanela,
      certificacoesVencendo,
      emprestimosJanela,
      emprestimosAbertos,
      livros,
      colaboradores,
      setores,
    ] = await Promise.all([
      prisma.dividas.findMany({
        where: {
          ...escopo,
          ...(desdeAnterior && { data_inicio: desdeAnterior }),
        },
        select: {
          id: true,
          item: true,
          valor: true,
          pago: true,
          data_inicio: true,
          colaborador_id: true,
          colaboradores: { select: { nome: true, departamento: true } },
        },
      }),

      prisma.dividas.findMany({
        where: { ...escopo, pago: { not: true } },
        select: {
          id: true,
          item: true,
          valor: true,
          data_inicio: true,
          colaborador_id: true,
          colaboradores: { select: { nome: true, departamento: true } },
        },
      }),
      prisma.certificacoes.findMany({
        where: {
          ...escopo,
          ...(desdeAnterior && { data_obtencao: desdeAnterior }),
        },
        select: {
          id: true,
          nome: true,
          tipo: true,
          instituicao: true,
          data_obtencao: true,
          colaborador_id: true,
          colaboradores: {
            select: { nome: true, departamento: true, setor_id: true },
          },
        },
      }),
      prisma.certificacoes.findMany({
        where: {
          ...escopo,
          data_vencimento: { gte: hojeUTC, lte: limiteVencimento },
        },
        orderBy: { data_vencimento: "asc" },
        select: {
          id: true,
          nome: true,
          tipo: true,
          data_vencimento: true,
          colaboradores: { select: { nome: true } },
        },
      }),
      prisma.emprestimos.findMany({
        where: {
          ...escopo,
          ...(desdeAnterior && { data_emprestimo: desdeAnterior }),
        },
        select: {
          id: true,
          data_emprestimo: true,
          data_real_devolucao: true,
          livros: { select: { titulo: true, genero: true } },
        },
      }),

      prisma.emprestimos.findMany({
        where: { ...escopo, status: "emprestado" },
        orderBy: { data_prevista_devolucao: "asc" },
        select: {
          id: true,
          data_emprestimo: true,
          data_prevista_devolucao: true,
          livros: { select: { titulo: true } },
          colaboradores: { select: { nome: true } },
        },
      }),
      prisma.livros.findMany({
        select: { id: true, genero: true, disponivel: true },
      }),
      prisma.colaboradores.findMany({
        where: filtroColaborador,
        select: {
          id: true,
          nome: true,
          departamento: true,
          status: true,
          total_gasto_salgados: true,
          setores: { select: { id: true, nome: true } },
        },
      }),
      prisma.setores.findMany({
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      }),
    ]);

    const mesesJanela = meses > 0 ? meses : null;
    const chavesJanela: string[] = [];
    if (mesesJanela) {
      for (let i = mesesJanela - 1; i >= 0; i--) {
        chavesJanela.push(chaveMes(inicioMesUTC(hojeUTC, -i)));
      }
    } else {
      const presentes = new Set<string>();
      for (const d of dividasJanela) presentes.add(chaveMes(d.data_inicio));
      for (const c of certificacoesJanela)
        presentes.add(chaveMes(c.data_obtencao));
      for (const e of emprestimosJanela)
        presentes.add(chaveMes(e.data_emprestimo));
      chavesJanela.push(...Array.from(presentes).sort());
    }

    const naJanela = (chave: string) => !inicio || chave >= chaveMes(inicio);

    const lancadoPorMes = acumular(
      dividasJanela,
      (d) => chaveMes(d.data_inicio),
      (d) => paraNumero(d.valor),
    );
    const quitadoPorMes = acumular(
      dividasJanela.filter((d) => d.pago === true),
      (d) => chaveMes(d.data_inicio),
      (d) => paraNumero(d.valor),
    );
    const certificacoesPorMes = acumular(
      certificacoesJanela,
      (c) => chaveMes(c.data_obtencao),
      () => 1,
    );
    const emprestimosPorMes = acumular(
      emprestimosJanela,
      (e) => chaveMes(e.data_emprestimo),
      () => 1,
    );
    const devolucoesPorMes = acumular(
      emprestimosJanela,
      (e) => (e.data_real_devolucao ? chaveMes(e.data_real_devolucao) : null),
      () => 1,
    );

    const serieMensal = chavesJanela.map((chave) => ({
      mes: chave,
      label: rotuloMes(chave),
      lancado: Math.round((lancadoPorMes.get(chave) ?? 0) * 100) / 100,
      quitado: Math.round((quitadoPorMes.get(chave) ?? 0) * 100) / 100,
      certificacoes: certificacoesPorMes.get(chave) ?? 0,
      emprestimos: emprestimosPorMes.get(chave) ?? 0,
      devolucoes: devolucoesPorMes.get(chave) ?? 0,
    }));

    const dividasAtuais = dividasJanela.filter((d) =>
      naJanela(chaveMes(d.data_inicio)),
    );
    const dividasPrevias = dividasJanela.filter(
      (d) => !naJanela(chaveMes(d.data_inicio)),
    );
    const certificacoesAtuais = certificacoesJanela.filter((c) =>
      naJanela(chaveMes(c.data_obtencao)),
    );
    const certificacoesPrevias = certificacoesJanela.filter(
      (c) => !naJanela(chaveMes(c.data_obtencao)),
    );
    const emprestimosAtuais = emprestimosJanela.filter((e) =>
      naJanela(chaveMes(e.data_emprestimo)),
    );
    const emprestimosPrevios = emprestimosJanela.filter(
      (e) => !naJanela(chaveMes(e.data_emprestimo)),
    );

    const somaValor = (linhas: { valor: unknown }[]) =>
      linhas.reduce((total, l) => total + paraNumero(l.valor), 0);

    const valorQuitado = somaValor(
      dividasAtuais.filter((d) => d.pago === true),
    );
    const valorQuitadoAnterior = somaValor(
      dividasPrevias.filter((d) => d.pago === true),
    );
    const valorLancado = somaValor(dividasAtuais);
    const valorEmAberto = somaValor(dividasAbertas);

    const atrasados = emprestimosAbertos.filter(
      (e) => e.data_prevista_devolucao.getTime() < hojeUTC.getTime(),
    );

    const devolvidosNaJanela = emprestimosJanela.filter(
      (e) =>
        e.data_real_devolucao !== null &&
        naJanela(chaveMes(e.data_real_devolucao)),
    );

    const livrosDisponiveis = livros.filter(
      (l) => l.disponivel === true,
    ).length;

    const gastoTotalSalgados = colaboradores.reduce(
      (total, c) => total + paraNumero(c.total_gasto_salgados),
      0,
    );

    const kpis = {
      valorEmAberto,
      valorQuitado,
      valorLancado,
      gastoTotalSalgados,
      dividasEmAberto: dividasAbertas.length,
      dividasQuitadas: dividasAtuais.filter((d) => d.pago === true).length,
      taxaQuitacao: valorLancado > 0 ? (valorQuitado / valorLancado) * 100 : 0,
      ticketMedio:
        dividasAtuais.length > 0 ? valorLancado / dividasAtuais.length : 0,
      emprestimosAtivos: emprestimosAbertos.length,
      emprestimosAtrasados: atrasados.length,
      emprestimosNoPeriodo: emprestimosAtuais.length,
      devolucoesNoPeriodo: devolvidosNaJanela.length,
      livrosTotal: livros.length,
      livrosDisponiveis,
      taxaDisponibilidade:
        livros.length > 0 ? (livrosDisponiveis / livros.length) * 100 : 0,
      certificacoesNoPeriodo: certificacoesAtuais.length,
      certificacoesSenior: certificacoesAtuais.filter(
        (c) => c.tipo === "Certificação Senior",
      ).length,
      certificacoesVencendo: certificacoesVencendo.length,
      colaboradores: colaboradores.length,
      colaboradoresAtivos: colaboradores.filter((c) => c.status === "ativo")
        .length,
      setores: setores.length,
    };

    const deltas = {
      valorQuitado: variacao(valorQuitado, valorQuitadoAnterior),
      certificacoes: variacao(
        certificacoesAtuais.length,
        certificacoesPrevias.length,
      ),
      emprestimos: variacao(
        emprestimosAtuais.length,
        emprestimosPrevios.length,
      ),
      dividasLancadas: variacao(dividasAtuais.length, dividasPrevias.length),
    };

    const porColaborador = new Map<
      number,
      {
        id: number;
        nome: string;
        departamento: string;
        senior: number;
        outras: number;
      }
    >();
    for (const cert of certificacoesAtuais) {
      const atual = porColaborador.get(cert.colaborador_id) ?? {
        id: cert.colaborador_id,
        nome: cert.colaboradores.nome,
        departamento: cert.colaboradores.departamento,
        senior: 0,
        outras: 0,
      };
      if (cert.tipo === "Certificação Senior") atual.senior += 1;
      else atual.outras += 1;
      porColaborador.set(cert.colaborador_id, atual);
    }
    const rankingCertificacoes = Array.from(porColaborador.values())
      .map((c) => ({ ...c, total: c.senior + c.outras }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome))
      .slice(0, 8);

    const devedores = new Map<
      number,
      {
        id: number;
        nome: string;
        departamento: string;
        valor: number;
        itens: number;
      }
    >();
    for (const divida of dividasAbertas) {
      const atual = devedores.get(divida.colaborador_id) ?? {
        id: divida.colaborador_id,
        nome: divida.colaboradores.nome,
        departamento: divida.colaboradores.departamento,
        valor: 0,
        itens: 0,
      };
      atual.valor += paraNumero(divida.valor);
      atual.itens += 1;
      devedores.set(divida.colaborador_id, atual);
    }
    const rankingDevedores = Array.from(devedores.values())
      .map((d) => ({ ...d, valor: Math.round(d.valor * 100) / 100 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

    const certPorSetor = new Map<
      number | null,
      { senior: number; outras: number }
    >();
    for (const cert of certificacoesAtuais) {
      const chave = cert.colaboradores.setor_id ?? null;
      const atual = certPorSetor.get(chave) ?? { senior: 0, outras: 0 };
      if (cert.tipo === "Certificação Senior") atual.senior += 1;
      else atual.outras += 1;
      certPorSetor.set(chave, atual);
    }
    const porSetor = setores
      .map((setor) => {
        const cert = certPorSetor.get(setor.id) ?? { senior: 0, outras: 0 };
        const doSetor = colaboradores.filter((c) => c.setores?.id === setor.id);
        return {
          setorId: setor.id,
          setor: setor.nome,
          colaboradores: doSetor.length,
          senior: cert.senior,
          outras: cert.outras,
          total: cert.senior + cert.outras,
          gasto:
            Math.round(
              doSetor.reduce(
                (t, c) => t + paraNumero(c.total_gasto_salgados),
                0,
              ) * 100,
            ) / 100,
        };
      })
      .filter((s) => s.colaboradores > 0 || s.total > 0)
      .sort((a, b) => b.total - a.total || b.colaboradores - a.colaboradores);

    const generosMapa = new Map<
      string,
      { total: number; emprestados: number }
    >();
    for (const livro of livros) {
      const genero = livro.genero?.trim() || "Sem gênero";
      const atual = generosMapa.get(genero) ?? { total: 0, emprestados: 0 };
      atual.total += 1;
      if (livro.disponivel !== true) atual.emprestados += 1;
      generosMapa.set(genero, atual);
    }
    const generos = Array.from(generosMapa.entries())
      .map(([genero, v]) => ({ genero, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const itensMapa = new Map<string, { quantidade: number; valor: number }>();
    for (const divida of dividasAtuais) {
      const atual = itensMapa.get(divida.item) ?? { quantidade: 0, valor: 0 };
      atual.quantidade += 1;
      atual.valor += paraNumero(divida.valor);
      itensMapa.set(divida.item, atual);
    }
    const itensPopulares = Array.from(itensMapa.entries())
      .map(([item, v]) => ({
        item,
        quantidade: v.quantidade,
        valor: Math.round(v.valor * 100) / 100,
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 8);

    const diasDe = (data: Date) =>
      Math.round((hojeUTC.getTime() - data.getTime()) / MS_POR_DIA);

    return NextResponse.json({
      periodo: {
        meses,
        inicio: inicio?.toISOString() ?? null,
        fim: hojeUTC.toISOString(),
      },
      filtros: { setorId, colaboradorId },
      setores,
      kpis,
      deltas,
      serieMensal,
      rankingCertificacoes,
      rankingDevedores,
      porSetor,
      generos,
      itensPopulares,
      alertas: {
        emprestimosAtrasados: atrasados.slice(0, 8).map((e) => ({
          id: e.id,
          livro: e.livros.titulo,
          colaborador: e.colaboradores.nome,
          diasAtraso: diasDe(e.data_prevista_devolucao),
          previsto: e.data_prevista_devolucao.toISOString(),
        })),
        certificacoesVencendo: certificacoesVencendo.slice(0, 8).map((c) => ({
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
          colaborador: c.colaboradores.nome,
          diasRestantes: c.data_vencimento ? -diasDe(c.data_vencimento) : null,
          vencimento: c.data_vencimento?.toISOString() ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("Erro ao montar o dashboard:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

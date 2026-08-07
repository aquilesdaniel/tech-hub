"use client";

import { FiltroDashboard } from "@/components/dashboard/filters";
import {
  PainelAlertas,
  PainelIndicadores,
} from "@/components/dashboard/indicators";
import {
  PainelCertificacoes,
  PainelDevedores,
  PainelFinanceiro,
  PainelGeneros,
  PainelGiroBiblioteca,
  PainelItens,
  PainelSetores,
} from "@/components/dashboard/panels";
import {
  PainelRanking,
  PainelTiposCertificacao,
  PainelTopCertificadores,
  agruparPorTipo,
  recortarColaboradores,
  type ColaboradorStats,
  type EstatisticasGerais,
  type FiltroTipo,
  type Ordenacao,
} from "@/components/dashboard/ranking";
import { StatTile } from "@/components/dashboard/stat-tile";
import type { DashboardData } from "@/components/dashboard/types";
import {
  inteiro,
  moeda,
  moedaCompacta,
  nomeCurto,
} from "@/components/dashboard/viz";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { Button, Card, Separator, Spinner } from "@heroui/react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Target,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const LEGENDA_PERIODO: Record<number, string> = {
  3: "vs. 3 meses anteriores",
  6: "vs. 6 meses anteriores",
  12: "vs. 12 meses anteriores",
  0: "sem base de comparação",
};

export default function RankingPage() {
  const { user } = useAuth();
  const ehAdmin = user?.tipo === "admin";

  const [dados, setDados] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [revalidando, setRevalidando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [meses, setMeses] = useState(6);
  const [setorId, setSetorId] = useState("todos");

  const [colaboradores, setColaboradores] = useState<ColaboradorStats[]>([]);
  const [gerais, setGerais] = useState<EstatisticasGerais | null>(null);
  const [carregandoRanking, setCarregandoRanking] = useState(true);
  const [erroRanking, setErroRanking] = useState<string | null>(null);

  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("total_desc");

  const meuId = useMemo(() => {
    if (user?.id == null) return null;
    const numero = Number(user.id);
    return Number.isFinite(numero) ? numero : null;
  }, [user?.id]);

  const colaboradorId = ehAdmin ? null : meuId;

  const buscar = useCallback(
    async (silencioso: boolean) => {
      if (silencioso) setRevalidando(true);
      else setCarregando(true);
      setErro(null);

      try {
        const params = new URLSearchParams({ meses: String(meses) });
        if (ehAdmin && setorId !== "todos") params.set("setorId", setorId);
        if (colaboradorId !== null)
          params.set("colaboradorId", String(colaboradorId));

        const resposta = await fetch(`/api/dashboard?${params}`);
        if (!resposta.ok) throw new Error("Falha ao carregar o dashboard");
        setDados((await resposta.json()) as DashboardData);
      } catch (causa) {
        console.error("Erro ao carregar o dashboard:", causa);
        setErro("Não foi possível carregar os indicadores.");
      } finally {
        setCarregando(false);
        setRevalidando(false);
      }
    },
    [meses, setorId, ehAdmin, colaboradorId],
  );

  const buscarRanking = useCallback(async () => {
    setErroRanking(null);
    try {
      const [respostaColaboradores, respostaGerais] = await Promise.all([
        fetch("/api/ranking/colaboradores"),
        fetch("/api/ranking/estatisticas"),
      ]);
      if (!respostaColaboradores.ok || !respostaGerais.ok)
        throw new Error("Falha ao carregar o ranking");

      setColaboradores(
        (await respostaColaboradores.json()) as ColaboradorStats[],
      );
      setGerais((await respostaGerais.json()) as EstatisticasGerais);
    } catch (causa) {
      console.error("Erro ao carregar o ranking:", causa);
      setErroRanking("Não foi possível carregar o ranking de certificações.");
    } finally {
      setCarregandoRanking(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !ehAdmin) {
      return;
    }

    void buscar(dados !== null);
  }, [user, ehAdmin, buscar]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void buscarRanking();
  }, [user, buscarRanking]);

  const serie = dados?.serieMensal ?? [];
  const kpis = dados?.kpis;
  const legendaPeriodo = LEGENDA_PERIODO[meses] ?? "";

  const ranking = useMemo(
    () => recortarColaboradores(colaboradores, filtroTipo, ordenacao),
    [colaboradores, filtroTipo, ordenacao],
  );
  const tipos = useMemo(() => agruparPorTipo(colaboradores), [colaboradores]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container mx-auto flex flex-col gap-6 px-4 py-6 sm:py-8">
          <header className="flex flex-col gap-4">
            <Link href="/" className="w-fit">
              <Button size="sm" variant="outline">
                <ArrowLeft aria-hidden className="size-4" />
                Menu
              </Button>
            </Link>

            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Ranking
              </h1>
              <p className="mt-1 text-sm text-muted">
                {ehAdmin
                  ? "Panorama da empresa e a classificação de certificações dos colaboradores."
                  : "A classificação de certificações da empresa e a sua posição nela."}
              </p>
            </div>
          </header>

          {ehAdmin && (
            <>
              <FiltroDashboard
                meses={meses}
                onMesesChange={setMeses}
                setorId={setorId}
                onSetorChange={setSetorId}
                setores={dados?.setores ?? []}
                mostrarSetor
                revalidando={revalidando}
                onAtualizar={() => {
                  void buscar(true);
                  void buscarRanking();
                }}
              />

              {erro && (
                <Card className="border-l-2 border-l-danger">
                  <Card.Content className="flex flex-wrap items-center gap-3 p-4">
                    <p className="text-sm text-foreground">{erro}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => void buscar(false)}
                    >
                      Tentar novamente
                    </Button>
                  </Card.Content>
                </Card>
              )}
            </>
          )}

          {!ehAdmin ? null : carregando || !dados || !kpis ? (
            <CarregandoBloco />
          ) : (
            <>
              <section
                aria-label="Indicadores principais"
                className="grid grid-cols-1 gap-4 lg:grid-cols-4"
              >
                <Card className="lg:col-span-1">
                  <Card.Content className="flex h-full flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-muted">
                        Dívidas em aberto na empresa
                      </p>
                      <Wallet
                        aria-hidden
                        className="size-4 shrink-0 text-muted"
                      />
                    </div>
                    <div>
                      <p className="text-[2.75rem] font-semibold leading-none text-foreground">
                        {moedaCompacta(kpis.valorEmAberto)}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        {moeda(kpis.valorEmAberto)} em{" "}
                        {inteiro(kpis.dividasEmAberto)} lançamento(s) - saldo
                        total, independente do período.
                      </p>
                    </div>
                    <Link href="/salgados" className="w-fit">
                      <Button size="sm" variant="secondary">
                        Ver salgados
                      </Button>
                    </Link>
                  </Card.Content>
                </Card>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3 xl:grid-cols-4">
                  <StatTile
                    rotulo="Quitado no período"
                    valor={moedaCompacta(kpis.valorQuitado)}
                    icone={Wallet}
                    delta={dados.deltas.valorQuitado}
                    deltaLegenda={legendaPeriodo}
                    serie={serie.map((p) => p.quitado)}
                  />
                  <StatTile
                    rotulo="Certificações no período"
                    valor={inteiro(kpis.certificacoesNoPeriodo)}
                    icone={Award}
                    delta={dados.deltas.certificacoes}
                    deltaLegenda={legendaPeriodo}
                    serie={serie.map((p) => p.certificacoes)}
                  />
                  <StatTile
                    rotulo="Empréstimos ativos"
                    valor={inteiro(kpis.emprestimosAtivos)}
                    icone={BookOpen}
                    deltaLegenda={
                      kpis.emprestimosAtrasados > 0
                        ? `${inteiro(kpis.emprestimosAtrasados)} em atraso`
                        : "nenhum em atraso"
                    }
                    serie={serie.map((p) => p.emprestimos)}
                  />
                  <StatTile
                    rotulo="Colaboradores"
                    valor={inteiro(kpis.colaboradores)}
                    icone={Users}
                    deltaLegenda={`${inteiro(kpis.colaboradoresAtivos)} ativos em ${inteiro(kpis.setores)} setores`}
                  />
                </div>
              </section>

              <section
                aria-label="Saúde e alertas"
                className="grid grid-cols-1 gap-4 lg:grid-cols-2"
              >
                <PainelIndicadores dados={dados} />
                <PainelAlertas dados={dados} />
              </section>

              <section
                aria-label="Gráficos do período"
                className="grid grid-cols-1 gap-4 xl:grid-cols-2"
              >
                <PainelFinanceiro serie={serie} revalidando={revalidando} />
                <PainelCertificacoes serie={serie} revalidando={revalidando} />
                <PainelGiroBiblioteca serie={serie} revalidando={revalidando} />
                <PainelGeneros
                  linhas={dados.generos}
                  revalidando={revalidando}
                />
                <PainelItens
                  linhas={dados.itensPopulares}
                  revalidando={revalidando}
                />

                <PainelDevedores
                  linhas={dados.rankingDevedores}
                  revalidando={revalidando}
                />
                <PainelSetores
                  linhas={dados.porSetor}
                  revalidando={revalidando}
                />
              </section>
            </>
          )}

          <>
            {ehAdmin && (
              <>
                <Separator className="mt-2" />

                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                      <Trophy aria-hidden className="size-4 text-muted" />
                      Certificações
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Acumulado histórico de toda a empresa
                    </p>
                  </div>
                </div>
              </>
            )}

            <section
              aria-label="Ranking de certificações"
              className="flex flex-col gap-4"
            >
              {erroRanking && (
                <Card className="border-l-2 border-l-danger">
                  <Card.Content className="flex flex-wrap items-center gap-3 p-4">
                    <p className="text-sm text-foreground">{erroRanking}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => void buscarRanking()}
                    >
                      Tentar novamente
                    </Button>
                  </Card.Content>
                </Card>
              )}

              {carregandoRanking ? (
                <CarregandoBloco />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile
                      rotulo="Colaboradores"
                      valor={inteiro(gerais?.total_colaboradores ?? 0)}
                      icone={Users}
                      deltaLegenda="cadastrados no TechHub"
                    />
                    <StatTile
                      rotulo="Certificações"
                      valor={inteiro(gerais?.total_certificacoes ?? 0)}
                      icone={Award}
                      deltaLegenda={
                        gerais?.tipo_certificacao_mais_popular
                          ? `tipo mais comum: ${gerais.tipo_certificacao_mais_popular}`
                          : "nenhuma registrada"
                      }
                    />
                    <StatTile
                      rotulo="Média por colaborador"
                      valor={(
                        gerais?.media_certificacoes_por_colaborador ?? 0
                      ).toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                      icone={Target}
                      deltaLegenda="entre quem tem ao menos uma"
                    />
                    <StatTile
                      rotulo="Líder atual"
                      valor={
                        gerais?.colaborador_mais_certificacoes &&
                        gerais.colaborador_mais_certificacoes !== "N/A"
                          ? nomeCurto(gerais.colaborador_mais_certificacoes)
                          : "-"
                      }
                      icone={Trophy}
                      deltaLegenda="quem mais certificou até hoje"
                    />
                  </div>

                  {ehAdmin && (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <PainelTopCertificadores linhas={ranking} />
                      <PainelTiposCertificacao linhas={tipos} />
                    </div>
                  )}

                  <PainelRanking
                    linhas={ranking}
                    filtroTipo={filtroTipo}
                    onFiltroTipoChange={setFiltroTipo}
                    ordenacao={ordenacao}
                    onOrdenacaoChange={setOrdenacao}
                    mostrarFiltros={ehAdmin}
                    destaqueId={meuId}
                  />
                </>
              )}
            </section>
          </>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function CarregandoBloco() {
  return (
    <div
      className="flex min-h-64 items-center justify-center"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Carregando…</span>
      <Spinner />
    </div>
  );
}

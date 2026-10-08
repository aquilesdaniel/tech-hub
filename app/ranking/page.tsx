"use client";

import { DashboardFilters } from "@/components/dashboard/filters";
import {
  AlertsPanel,
  IndicatorsPanel,
} from "@/components/dashboard/indicators";
import {
  CertificationsPanel,
  DebtorsPanel,
  FinancePanel,
  GenresPanel,
  ItemsPanel,
  LibraryTurnoverPanel,
  SectorsPanel,
} from "@/components/dashboard/panels";
import {
  CertificationTypesPanel,
  RankingPanel,
  TopCertifiersPanel,
  filterAndSortEmployees,
  groupByType,
  type CertificationFilter,
  type EmployeeStats,
  type GeneralStats,
  type SortOrder,
} from "@/components/dashboard/ranking";
import { StatTile } from "@/components/dashboard/stat-tile";
import type { DashboardData } from "@/components/dashboard/types";
import {
  formatInteger,
  formatCurrency,
  formatCompactCurrency,
  shortName,
} from "@/components/dashboard/viz";
import { PageHeader, PageLayout } from "@/components/page-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { ScreenSpinner } from "@/components/screen-spinner";
import { useAuth } from "@/contexts/auth-context";
import { Button, Card, Separator } from "@heroui/react";
import { Award, BookOpen, Target, Trophy, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const PERIOD_LEGEND: Record<number, string> = {
  3: "vs. 3 meses anteriores",
  6: "vs. 6 meses anteriores",
  12: "vs. 12 meses anteriores",
  0: "sem base de comparação",
};

export default function RankingPage() {
  const { user } = useAuth();
  const isAdmin = user?.tipo === "admin";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revalidating, setRevalidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [months, setMonths] = useState(6);
  const [sectorId, setSectorId] = useState("all");

  const [employees, setEmployees] = useState<EmployeeStats[]>([]);
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [rankingError, setRankingError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<CertificationFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("total_desc");

  const myId = useMemo(() => {
    if (user?.id == null) return null;
    const num = Number(user.id);
    return Number.isFinite(num) ? num : null;
  }, [user?.id]);

  const employeeId = isAdmin ? null : myId;

  const fetchDashboard = useCallback(
    async (silent: boolean) => {
      if (silent) setRevalidating(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ months: String(months) });
        if (isAdmin && sectorId !== "all") params.set("sectorId", sectorId);
        if (employeeId !== null)
          params.set("employeeId", String(employeeId));

        const response = await fetch(`/api/dashboard?${params}`);
        if (!response.ok) throw new Error("Falha ao carregar o dashboard");
        setData((await response.json()) as DashboardData);
      } catch (cause) {
        console.error("Erro ao carregar o dashboard:", cause);
        setError("Não foi possível carregar os indicadores.");
      } finally {
        setLoading(false);
        setRevalidating(false);
      }
    },
    [months, sectorId, isAdmin, employeeId],
  );

  const fetchRanking = useCallback(async () => {
    setRankingError(null);
    try {
      const [employeesResponse, statsResponse] = await Promise.all([
        fetch("/api/ranking/colaboradores"),
        fetch("/api/ranking/estatisticas"),
      ]);
      if (!employeesResponse.ok || !statsResponse.ok)
        throw new Error("Falha ao carregar o ranking");

      setEmployees((await employeesResponse.json()) as EmployeeStats[]);
      setGeneralStats((await statsResponse.json()) as GeneralStats);
    } catch (cause) {
      console.error("Erro ao carregar o ranking:", cause);
      setRankingError("Não foi possível carregar o ranking de certificações.");
    } finally {
      setRankingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) {
      return;
    }

    void fetchDashboard(data !== null);
  }, [user, isAdmin, fetchDashboard]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void fetchRanking();
  }, [user, fetchRanking]);

  const series = data?.monthlySeries ?? [];
  const kpis = data?.kpis;
  const periodLegend = PERIOD_LEGEND[months] ?? "";

  const ranking = useMemo(
    () => filterAndSortEmployees(employees, typeFilter, sortOrder),
    [employees, typeFilter, sortOrder],
  );
  const types = useMemo(() => groupByType(employees), [employees]);

  if ((isAdmin && loading) || rankingLoading) {
    return (
      <ProtectedRoute>
        <ScreenSpinner />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageLayout>
        <PageHeader
          title="Ranking"
          description={
            isAdmin
              ? "Panorama da empresa e a classificação de certificações dos colaboradores."
              : "A classificação de certificações da empresa e a sua posição nela."
          }
          backHref="/"
        />

        {isAdmin && (
          <>
            <DashboardFilters
              months={months}
              onMonthsChange={setMonths}
              sectorId={sectorId}
              onSectorChange={setSectorId}
              sectors={data?.sectors ?? []}
              showSector
              revalidating={revalidating}
              onRefresh={() => {
                void fetchDashboard(true);
                void fetchRanking();
              }}
            />

            {error && (
              <Card className="border-l-2 border-l-danger">
                <Card.Content className="flex flex-wrap items-center gap-3 p-4">
                  <p className="text-sm text-foreground">{error}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => void fetchDashboard(false)}
                  >
                    Tentar novamente
                  </Button>
                </Card.Content>
              </Card>
            )}
          </>
        )}

        {isAdmin && data && kpis && (
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
                      {formatCompactCurrency(kpis.openAmount)}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      {formatCurrency(kpis.openAmount)} em{" "}
                      {formatInteger(kpis.openDebts)} lançamento(s) - saldo
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
                  label="Quitado no período"
                  value={formatCompactCurrency(kpis.settledAmount)}
                  icon={Wallet}
                  delta={data.deltas.settledAmount}
                  deltaLabel={periodLegend}
                  series={series.map((p) => p.settled)}
                />
                <StatTile
                  label="Certificações no período"
                  value={formatInteger(kpis.certificationsInPeriod)}
                  icon={Award}
                  delta={data.deltas.certifications}
                  deltaLabel={periodLegend}
                  series={series.map((p) => p.certifications)}
                />
                <StatTile
                  label="Empréstimos ativos"
                  value={formatInteger(kpis.activeLoans)}
                  icon={BookOpen}
                  deltaLabel={
                    kpis.overdueLoans > 0
                      ? `${formatInteger(kpis.overdueLoans)} em atraso`
                      : "nenhum em atraso"
                  }
                  series={series.map((p) => p.loans)}
                />
                <StatTile
                  label="Colaboradores"
                  value={formatInteger(kpis.employees)}
                  icon={Users}
                  deltaLabel={`${formatInteger(kpis.activeEmployees)} ativos em ${formatInteger(kpis.sectors)} setores`}
                />
              </div>
            </section>

            <section
              aria-label="Saúde e alertas"
              className="grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              <IndicatorsPanel data={data} />
              <AlertsPanel data={data} />
            </section>

            <section
              aria-label="Gráficos do período"
              className="grid grid-cols-1 gap-4 xl:grid-cols-2"
            >
              <FinancePanel series={series} revalidating={revalidating} />
              <CertificationsPanel series={series} revalidating={revalidating} />
              <LibraryTurnoverPanel series={series} revalidating={revalidating} />
              <GenresPanel rows={data.genres} revalidating={revalidating} />
              <ItemsPanel rows={data.popularItems} revalidating={revalidating} />
              <DebtorsPanel
                rows={data.debtorRanking}
                revalidating={revalidating}
              />
              <SectorsPanel rows={data.bySector} revalidating={revalidating} />
            </section>
          </>
        )}

        {isAdmin && (
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
          {rankingError && (
            <Card className="border-l-2 border-l-danger">
              <Card.Content className="flex flex-wrap items-center gap-3 p-4">
                <p className="text-sm text-foreground">{rankingError}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => void fetchRanking()}
                >
                  Tentar novamente
                </Button>
              </Card.Content>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Colaboradores"
              value={formatInteger(generalStats?.total_employees ?? 0)}
              icon={Users}
              deltaLabel="cadastrados no TechHub"
            />
            <StatTile
              label="Certificações"
              value={formatInteger(generalStats?.total_certifications ?? 0)}
              icon={Award}
              deltaLabel={
                generalStats?.most_popular_certification_type
                  ? `tipo mais comum: ${generalStats.most_popular_certification_type}`
                  : "nenhuma registrada"
              }
            />
            <StatTile
              label="Média por colaborador"
              value={(
                generalStats?.average_certifications_per_employee ?? 0
              ).toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              icon={Target}
              deltaLabel="entre quem tem ao menos uma"
            />
            <StatTile
              label="Líder atual"
              value={
                generalStats?.top_certified_employee &&
                generalStats.top_certified_employee !== "N/A"
                  ? shortName(generalStats.top_certified_employee)
                  : "-"
              }
              icon={Trophy}
              deltaLabel="quem mais certificou até hoje"
            />
          </div>

          {isAdmin && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <TopCertifiersPanel rows={ranking} />
              <CertificationTypesPanel rows={types} />
            </div>
          )}

          <RankingPanel
            rows={ranking}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            showFilters={isAdmin}
            highlightId={myId}
          />
        </section>
      </PageLayout>
    </ProtectedRoute>
  );
}

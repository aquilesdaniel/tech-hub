"use client";

import { Card, Chip, ListBox, Select } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { Award, Crown, Medal } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./chart-card";
import {
  CHROME,
  Legend,
  SERIES,
  VizTable,
  VizEmpty,
  tooltipContent,
  barCursor,
  formatShortDate,
  baseAxis,
  baseGrid,
  formatInteger,
  horizontalMargin,
  shortName,
  formatPercent,
  directLabel,
} from "./viz";

export type EmployeeStats = {
  id: number;
  nome: string;
  email: string;
  departamento: string;
  total_certifications: number;
  senior_certifications: number;
  other_certifications: number;
  last_certification: string | null;
  certification_types: Record<string, number>;
};

export type GeneralStats = {
  total_employees: number;
  total_certifications: number;
  average_certifications_per_employee: number;
  top_certified_employee: string;
  most_popular_certification_type: string;
  monthly_growth: { month: string; certifications: number }[];
};

export type CertificationFilter = "all" | "senior" | "others";
export type SortOrder = "total_desc" | "senior_desc" | "others_desc" | "name";

export const CERTIFICATION_LEGEND = [
  { name: "Sênior", color: SERIES.s1 },
  { name: "Outras", color: SERIES.s2 },
];

export function filterAndSortEmployees(
  rows: EmployeeStats[],
  filter: CertificationFilter,
  sortOrder: SortOrder,
) {
  return rows
    .filter((e) => {
      if (filter === "senior") return e.senior_certifications > 0;
      if (filter === "others") return e.other_certifications > 0;
      return true;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "senior_desc":
          return b.senior_certifications - a.senior_certifications;
        case "others_desc":
          return b.other_certifications - a.other_certifications;
        case "name":
          return a.nome.localeCompare(b.nome, "pt-BR");
        default:
          return b.total_certifications - a.total_certifications;
      }
    });
}

export function groupByType(rows: EmployeeStats[]) {
  const sum = new Map<string, number>();
  for (const employee of rows) {
    for (const [type, count] of Object.entries(
      employee.certification_types ?? {},
    )) {
      sum.set(type, (sum.get(type) ?? 0) + count);
    }
  }
  return Array.from(sum.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export function TopCertifiersPanel({
  rows,
  revalidating,
}: {
  rows: EmployeeStats[];
  revalidating?: boolean;
}) {
  const top = rows.slice(0, 10);
  const chartData = top.map((e) => ({
    label: shortName(e.nome),
    senior: e.senior_certifications,
    others: e.other_certifications,
    total: e.total_certifications,
  }));

  return (
    <ChartCard
      title="Top 10 do ranking"
      description="Certificações acumuladas por colaborador, do início ao hoje"
      legend={CERTIFICATION_LEGEND}
      height={Math.max(220, chartData.length * 34 + 40)}
      revalidating={revalidating}
      chart={
        chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={horizontalMargin}>
              <CartesianGrid {...baseGrid} vertical horizontal={false} />
              <XAxis type="number" {...baseAxis} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                {...baseAxis}
                width={92}
                interval={0}
              />

              <Tooltip
                cursor={barCursor}
                content={tooltipContent((value) => formatInteger(value))}
              />

              <Bar
                dataKey="senior"
                name="Sênior"
                stackId="cert"
                fill={SERIES.s1}
                maxBarSize={24}
                stroke={CHROME.surface}
                strokeWidth={2}
                animationDuration={400}
              />

              <Bar
                dataKey="others"
                name="Outras"
                stackId="cert"
                fill={SERIES.s2}
                maxBarSize={24}
                radius={[0, 4, 4, 0]}
                stroke={CHROME.surface}
                strokeWidth={2}
                animationDuration={400}
              >
                <LabelList
                  dataKey="total"
                  position="right"
                  offset={8}
                  {...directLabel}
                  formatter={(value: number) => formatInteger(value)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <VizEmpty message="Nenhum colaborador no recorte selecionado." />
        )
      }
      table={
        <VizTable
          caption="Certificações acumuladas por colaborador"
          rows={top}
          rowKey={(r) => String(r.id)}
          columns={[
            { key: "name", title: "Colaborador", render: (r) => r.nome },
            {
              key: "department",
              title: "Departamento",
              render: (r) => r.departamento,
            },
            {
              key: "senior",
              title: "Sênior",
              align: "right",
              render: (r) => formatInteger(r.senior_certifications),
            },
            {
              key: "others",
              title: "Outras",
              align: "right",
              render: (r) => formatInteger(r.other_certifications),
            },
            {
              key: "total",
              title: "Total",
              align: "right",
              render: (r) => formatInteger(r.total_certifications),
            },
          ]}
        />
      }
    />
  );
}

export function CertificationTypesPanel({
  rows,
  revalidating,
}: {
  rows: { type: string; count: number }[];
  revalidating?: boolean;
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const chartData = rows.slice(0, 8);

  return (
    <ChartCard
      title="Distribuição por tipo"
      description={
        rows.length > 8
          ? `8 tipos mais frequentes de ${formatInteger(rows.length)}`
          : "Quantas certificações de cada tipo a empresa acumula"
      }
      height={Math.max(220, chartData.length * 34 + 40)}
      revalidating={revalidating}
      chart={
        chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={horizontalMargin}>
              <CartesianGrid {...baseGrid} vertical horizontal={false} />
              <XAxis type="number" {...baseAxis} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="type"
                {...baseAxis}
                width={140}
                interval={0}
              />

              <Tooltip
                cursor={barCursor}
                content={tooltipContent((value) => formatInteger(value))}
              />

              <Bar
                dataKey="count"
                name="Certificações"
                fill={SERIES.s1}
                maxBarSize={24}
                radius={[0, 4, 4, 0]}
                animationDuration={400}
              >
                <LabelList
                  dataKey="count"
                  position="right"
                  offset={8}
                  {...directLabel}
                  formatter={(value: number) => formatInteger(value)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <VizEmpty message="Nenhuma certificação registrada." />
        )
      }
      table={
        <VizTable
          caption="Certificações por tipo"
          rows={rows}
          rowKey={(r) => r.type}
          columns={[
            { key: "type", title: "Tipo", render: (r) => r.type },
            {
              key: "count",
              title: "Certificações",
              align: "right",
              render: (r) => formatInteger(r.count),
            },
            {
              key: "share",
              title: "Participação",
              align: "right",
              render: (r) =>
                total > 0 ? formatPercent((r.count / total) * 100, 1) : "-",
            },
          ]}
        />
      }
    />
  );
}

const TIERS: {
  upTo: number;
  label: string;
  icon: LucideIcon;
  color: string;
}[] = [
  { upTo: 1, label: "Campeão", icon: Crown, color: SERIES.s4 },
  { upTo: 3, label: "Pódio", icon: Medal, color: SERIES.s2 },
  { upTo: 5, label: "Top 5", icon: Award, color: CHROME.deEmphasis },
];

function tierForPosition(position: number) {
  return TIERS.find((tier) => position <= tier.upTo) ?? null;
}

function StatNumber({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="w-14 text-right">
      <p
        className={`tabular-nums leading-none ${
          highlight
            ? "text-lg font-semibold text-foreground"
            : "text-sm text-foreground"
        }`}
      >
        {formatInteger(value)}
      </p>
      <p className="mt-1 text-[0.6875rem] text-muted">{label}</p>
    </div>
  );
}

function RankingRow({
  employee,
  position,
  max,
  isYou,
}: {
  employee: EmployeeStats;
  position: number;
  max: number;
  isYou?: boolean;
}) {
  const tier = tierForPosition(position);
  const Icon = tier?.icon;

  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-3 py-3`}>
      <span className="flex w-12 shrink-0 items-center gap-1.5">
        {Icon ? (
          <Icon
            aria-hidden
            className="size-4 shrink-0"
            style={{ color: tier?.color }}
          />
        ) : (
          <span aria-hidden className="size-4 shrink-0" />
        )}
        <span className="text-sm font-semibold tabular-nums text-muted">
          {position}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium text-foreground">
            {employee.nome}
          </p>
          {isYou && (
            <Chip size="sm" color="accent" variant="soft">
              <Chip.Label>Você</Chip.Label>
            </Chip>
          )}
          {tier && (
            <Chip size="sm" variant="soft">
              <Chip.Label>{tier.label}</Chip.Label>
            </Chip>
          )}
        </div>

        <p className="truncate text-xs text-muted">
          {employee.departamento || "Sem departamento"}
          {employee.last_certification
            ? ` · última em ${formatShortDate(employee.last_certification)}`
            : ""}
        </p>

        <div
          aria-hidden
          className="mt-2 flex h-1 w-full max-w-64 overflow-hidden rounded-full bg-surface-tertiary"
        >
          <span
            className="block h-full"
            style={{
              width: `${(employee.senior_certifications / max) * 100}%`,
              backgroundColor: SERIES.s1,
            }}
          />
          <span
            className="block h-full"
            style={{
              width: `${(employee.other_certifications / max) * 100}%`,
              backgroundColor: SERIES.s2,
            }}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-3">
        <StatNumber label="Sênior" value={employee.senior_certifications} />
        <StatNumber label="Outras" value={employee.other_certifications} />
        <StatNumber
          label="Total"
          value={employee.total_certifications}
          highlight
        />
      </div>
    </li>
  );
}

export function RankingPanel({
  rows,
  typeFilter,
  onTypeFilterChange,
  sortOrder,
  onSortOrderChange,
  showFilters = false,
  highlightId = null,
  limit = 10,
  revalidating,
}: {
  rows: EmployeeStats[];
  typeFilter: CertificationFilter;
  onTypeFilterChange: (filter: CertificationFilter) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (sortOrder: SortOrder) => void;
  showFilters?: boolean;
  highlightId?: number | null;
  limit?: number;
  revalidating?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.total_certifications));
  const top = rows.slice(0, limit);

  const ownIndex =
    highlightId != null ? rows.findIndex((r) => r.id === highlightId) : -1;
  const outsideTop = ownIndex >= limit;
  const own = outsideTop ? rows[ownIndex] : null;

  return (
    <Card>
      <Card.Header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Card.Title className="text-base">
            Ranking de certificações
          </Card.Title>
          <Card.Description className="text-xs">
            Top {formatInteger(Math.min(limit, rows.length))} de{" "}
            {formatInteger(rows.length)} colaborador(es)
            {ownIndex >= 0 ? ` · você está em ${ownIndex + 1}º` : ""}
          </Card.Description>
        </div>

        {showFilters && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="flex min-w-44 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted" id="type-filter-label">
                Certificações
              </span>
              <Select
                selectedKey={typeFilter}
                onSelectionChange={(key) =>
                  onTypeFilterChange(String(key) as CertificationFilter)
                }
                aria-labelledby="type-filter-label"
                variant="secondary"
              >
                <Select.Trigger className="w-full">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="all" textValue="Todas">
                      Todas
                    </ListBox.Item>
                    <ListBox.Item id="senior" textValue="Com Sênior">
                      Com Sênior
                    </ListBox.Item>
                    <ListBox.Item id="others" textValue="Com Outras">
                      Com Outras
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <div className="flex min-w-44 flex-col gap-1.5">
              <span
                className="text-xs font-medium text-muted"
                id="sort-order-label"
              >
                Classificar por
              </span>
              <Select
                selectedKey={sortOrder}
                onSelectionChange={(key) =>
                  onSortOrderChange(String(key) as SortOrder)
                }
                aria-labelledby="sort-order-label"
                variant="secondary"
              >
                <Select.Trigger className="w-full">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="total_desc" textValue="Total">
                      Total
                    </ListBox.Item>
                    <ListBox.Item id="senior_desc" textValue="Sênior">
                      Sênior
                    </ListBox.Item>
                    <ListBox.Item id="others_desc" textValue="Outras">
                      Outras
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>
        )}
      </Card.Header>

      <Card.Content className="flex flex-col gap-3">
        <Legend items={CERTIFICATION_LEGEND} />

        <div
          className={`transition-opacity duration-200 ${
            revalidating ? "opacity-50" : "opacity-100"
          }`}
        >
          {rows.length === 0 ? (
            <VizEmpty message="Nenhum colaborador com certificações registradas." />
          ) : (
            <>
              <ol className="flex flex-col divide-y divide-separator">
                {top.map((employee, index) => (
                  <RankingRow
                    key={employee.id}
                    employee={employee}
                    position={index + 1}
                    max={max}
                    isYou={employee.id === highlightId}
                  />
                ))}
              </ol>

              {own && (
                <div className="border-t border-dashed border-border pt-3">
                  <p className="text-xs font-medium text-muted">Sua posição</p>
                  <ol className="flex flex-col">
                    <RankingRow
                      employee={own}
                      position={ownIndex + 1}
                      max={max}
                      isYou
                    />
                  </ol>
                </div>
              )}

              {highlightId != null && ownIndex < 0 && (
                <p className="mt-3 border-t border-dashed border-border pt-3 text-xs text-muted">
                  Não encontramos o seu cadastro nesta classificação.
                </p>
              )}
            </>
          )}
        </div>
      </Card.Content>
    </Card>
  );
}

"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./chart-card";
import type {
  GenreRow,
  ItemRow,
  CertificationRankingRow,
  DebtorRankingRow,
  SectorRow,
  MonthlyPoint,
} from "./types";
import {
  CHROME,
  SERIES,
  VizTable,
  VizEmpty,
  tooltipContent,
  barCursor,
  crosshairCursor,
  baseAxis,
  baseGrid,
  formatInteger,
  horizontalMargin,
  verticalMargin,
  formatCurrency,
  formatCompactCurrency,
  shortName,
  directLabel,
} from "./viz";

export function FinancePanel({
  series,
  revalidating,
}: {
  series: MonthlyPoint[];
  revalidating?: boolean;
}) {
  const hasData = series.some((p) => p.issued > 0 || p.settled > 0);

  return (
    <ChartCard
      title="Fluxo de salgados"
      description="Valor lançado e valor quitado por mês, na mesma escala"
      legend={[
        { name: "Lançado", color: SERIES.s1, shape: "line" },
        { name: "Quitado", color: SERIES.s2, shape: "line" },
      ]}
      height={280}
      revalidating={revalidating}
      chart={
        hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={verticalMargin}>
              <CartesianGrid {...baseGrid} />
              <XAxis dataKey="label" {...baseAxis} />
              <YAxis
                {...baseAxis}
                width={64}
                tickFormatter={(v: number) => formatCompactCurrency(v)}
              />
              <Tooltip
                cursor={crosshairCursor}
                content={tooltipContent((value) => formatCurrency(value))}
              />
              <Area
                type="monotone"
                dataKey="issued"
                name="Lançado"
                stroke={SERIES.s1}
                strokeWidth={2}
                fill={SERIES.s1}
                fillOpacity={0.1}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: SERIES.s1,
                  stroke: CHROME.surface,
                  strokeWidth: 2,
                }}
                animationDuration={400}
              />
              <Area
                type="monotone"
                dataKey="settled"
                name="Quitado"
                stroke={SERIES.s2}
                strokeWidth={2}
                fill={SERIES.s2}
                fillOpacity={0.1}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: SERIES.s2,
                  stroke: CHROME.surface,
                  strokeWidth: 2,
                }}
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <VizEmpty />
        )
      }
      table={
        <VizTable
          caption="Valor lançado e quitado de salgados por mês"
          rows={series}
          rowKey={(r) => r.month}
          columns={[
            { key: "month", title: "Mês", render: (r) => r.label },
            {
              key: "issued",
              title: "Lançado",
              align: "right",
              render: (r) => formatCurrency(r.issued),
            },
            {
              key: "settled",
              title: "Quitado",
              align: "right",
              render: (r) => formatCurrency(r.settled),
            },
            {
              key: "outstanding",
              title: "Diferença",
              align: "right",
              render: (r) => formatCurrency(r.issued - r.settled),
            },
          ]}
        />
      }
    />
  );
}

export function CertificationsPanel({
  series,
  revalidating,
}: {
  series: MonthlyPoint[];
  revalidating?: boolean;
}) {
  const hasData = series.some((p) => p.certifications > 0);
  const last = series.at(-1);

  return (
    <ChartCard
      title="Certificações conquistadas"
      description="Certificações obtidas por mês"
      height={280}
      revalidating={revalidating}
      chart={
        hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={verticalMargin}>
              <CartesianGrid {...baseGrid} />
              <XAxis dataKey="label" {...baseAxis} />
              <YAxis {...baseAxis} width={36} allowDecimals={false} />
              <Tooltip
                cursor={crosshairCursor}
                content={tooltipContent((value) => formatInteger(value))}
              />
              <Line
                type="monotone"
                dataKey="certifications"
                name="Certificações"
                stroke={SERIES.s1}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: SERIES.s1,
                  stroke: CHROME.surface,
                  strokeWidth: 2,
                }}
                animationDuration={400}
              >
                <LabelList
                  dataKey="certifications"
                  position="top"
                  offset={10}
                  {...directLabel}
                  formatter={(
                    value: number,
                    _entry: unknown,
                    index: number,
                  ) =>
                    index === series.length - 1 && last ? formatInteger(value) : ""
                  }
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <VizEmpty />
        )
      }
      table={
        <VizTable
          caption="Certificações obtidas por mês"
          rows={series}
          rowKey={(r) => r.month}
          columns={[
            { key: "month", title: "Mês", render: (r) => r.label },
            {
              key: "certifications",
              title: "Certificações",
              align: "right",
              render: (r) => formatInteger(r.certifications),
            },
          ]}
        />
      }
    />
  );
}

export function LibraryTurnoverPanel({
  series,
  revalidating,
}: {
  series: MonthlyPoint[];
  revalidating?: boolean;
}) {
  const hasData = series.some((p) => p.loans > 0 || p.returns > 0);

  return (
    <ChartCard
      title="Giro da biblioteca"
      description="Empréstimos e devoluções por mês"
      legend={[
        { name: "Empréstimos", color: SERIES.s1 },
        { name: "Devoluções", color: SERIES.s2 },
      ]}
      height={280}
      revalidating={revalidating}
      chart={
        hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={verticalMargin} barGap={2}>
              <CartesianGrid {...baseGrid} />
              <XAxis dataKey="label" {...baseAxis} />
              <YAxis {...baseAxis} width={36} allowDecimals={false} />
              <Tooltip
                cursor={barCursor}
                content={tooltipContent((value) => formatInteger(value))}
              />
              <Bar
                dataKey="loans"
                name="Empréstimos"
                fill={SERIES.s1}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                animationDuration={400}
              />
              <Bar
                dataKey="returns"
                name="Devoluções"
                fill={SERIES.s2}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                animationDuration={400}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <VizEmpty />
        )
      }
      table={
        <VizTable
          caption="Empréstimos e devoluções por mês"
          rows={series}
          rowKey={(r) => r.month}
          columns={[
            { key: "month", title: "Mês", render: (r) => r.label },
            {
              key: "loans",
              title: "Empréstimos",
              align: "right",
              render: (r) => formatInteger(r.loans),
            },
            {
              key: "returns",
              title: "Devoluções",
              align: "right",
              render: (r) => formatInteger(r.returns),
            },
          ]}
        />
      }
    />
  );
}

export function CertificationRankingPanel({
  rows,
  revalidating,
}: {
  rows: CertificationRankingRow[];
  revalidating?: boolean;
}) {
  const chartData = rows.map((r) => ({ ...r, label: shortName(r.name) }));

  return (
    <ChartCard
      title="Quem mais certificou"
      description="Top 8 colaboradores no período"
      legend={[
        { name: "Sênior", color: SERIES.s1 },
        { name: "Outras", color: SERIES.s2 },
      ]}
      height={Math.max(200, chartData.length * 34 + 40)}
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
          <VizEmpty />
        )
      }
      table={
        <VizTable
          caption="Ranking de certificações por colaborador"
          rows={rows}
          rowKey={(r) => String(r.id)}
          columns={[
            { key: "name", title: "Colaborador", render: (r) => r.name },
            {
              key: "department",
              title: "Departamento",
              render: (r) => r.department,
            },
            {
              key: "senior",
              title: "Sênior",
              align: "right",
              render: (r) => formatInteger(r.senior),
            },
            {
              key: "others",
              title: "Outras",
              align: "right",
              render: (r) => formatInteger(r.others),
            },
            {
              key: "total",
              title: "Total",
              align: "right",
              render: (r) => formatInteger(r.total),
            },
          ]}
        />
      }
    />
  );
}

export function DebtorsPanel({
  rows,
  revalidating,
}: {
  rows: DebtorRankingRow[];
  revalidating?: boolean;
}) {
  const chartData = rows.map((r) => ({ ...r, label: shortName(r.name) }));

  return (
    <ChartCard
      title="Maiores saldos em aberto"
      description="Valor de salgados ainda não quitado, por colaborador"
      height={Math.max(200, chartData.length * 34 + 40)}
      revalidating={revalidating}
      chart={
        chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={horizontalMargin}>
              <CartesianGrid {...baseGrid} vertical horizontal={false} />
              <XAxis
                type="number"
                {...baseAxis}
                tickFormatter={(v: number) => formatCompactCurrency(v)}
              />
              <YAxis
                type="category"
                dataKey="label"
                {...baseAxis}
                width={92}
                interval={0}
              />
              <Tooltip
                cursor={barCursor}
                content={tooltipContent((value) => formatCurrency(value))}
              />
              <Bar
                dataKey="amount"
                name="Em aberto"
                fill={SERIES.s1}
                maxBarSize={24}
                radius={[0, 4, 4, 0]}
                animationDuration={400}
              >
                <LabelList
                  dataKey="amount"
                  position="right"
                  offset={8}
                  {...directLabel}
                  formatter={(value: number) => formatCompactCurrency(value)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <VizEmpty message="Nenhum saldo em aberto." />
        )
      }
      table={
        <VizTable
          caption="Saldos de salgados em aberto por colaborador"
          rows={rows}
          rowKey={(r) => String(r.id)}
          columns={[
            { key: "name", title: "Colaborador", render: (r) => r.name },
            {
              key: "department",
              title: "Departamento",
              render: (r) => r.department,
            },
            {
              key: "items",
              title: "Itens",
              align: "right",
              render: (r) => formatInteger(r.items),
            },
            {
              key: "amount",
              title: "Em aberto",
              align: "right",
              render: (r) => formatCurrency(r.amount),
            },
          ]}
        />
      }
    />
  );
}

export function SectorsPanel({
  rows,
  revalidating,
}: {
  rows: SectorRow[];
  revalidating?: boolean;
}) {
  const chartData = rows.slice(0, 8);

  return (
    <ChartCard
      title="Certificações por setor"
      description="Total conquistado no período em cada setor"
      height={Math.max(200, chartData.length * 34 + 40)}
      revalidating={revalidating}
      chart={
        chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={horizontalMargin}>
              <CartesianGrid {...baseGrid} vertical horizontal={false} />
              <XAxis type="number" {...baseAxis} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="sector"
                {...baseAxis}
                width={110}
                interval={0}
              />
              <Tooltip
                cursor={barCursor}
                content={tooltipContent((value) => formatInteger(value))}
              />
              <Bar
                dataKey="total"
                name="Certificações"
                fill={SERIES.s1}
                maxBarSize={24}
                radius={[0, 4, 4, 0]}
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
          <VizEmpty />
        )
      }
      table={
        <VizTable
          caption="Certificações e colaboradores por setor"
          rows={rows}
          rowKey={(r) => String(r.sectorId)}
          columns={[
            { key: "sector", title: "Setor", render: (r) => r.sector },
            {
              key: "employees",
              title: "Pessoas",
              align: "right",
              render: (r) => formatInteger(r.employees),
            },
            {
              key: "senior",
              title: "Sênior",
              align: "right",
              render: (r) => formatInteger(r.senior),
            },
            {
              key: "total",
              title: "Certificações",
              align: "right",
              render: (r) => formatInteger(r.total),
            },
            {
              key: "spent",
              title: "Gasto salgados",
              align: "right",
              render: (r) => formatCurrency(r.spent),
            },
          ]}
        />
      }
    />
  );
}

export function GenresPanel({
  rows,
  revalidating,
}: {
  rows: GenreRow[];
  revalidating?: boolean;
}) {
  const chartData = rows.map((r) => ({
    ...r,
    available: Math.max(0, r.total - r.loaned),
  }));

  return (
    <ChartCard
      title="Acervo por gênero"
      description="Quanto de cada gênero está na estante e quanto está emprestado"
      legend={[
        { name: "Disponíveis", color: SERIES.s1 },
        { name: "Emprestados", color: SERIES.s2 },
      ]}
      height={Math.max(200, chartData.length * 34 + 40)}
      revalidating={revalidating}
      chart={
        chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={horizontalMargin}>
              <CartesianGrid {...baseGrid} vertical horizontal={false} />
              <XAxis type="number" {...baseAxis} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="genre"
                {...baseAxis}
                width={110}
                interval={0}
              />
              <Tooltip
                cursor={barCursor}
                content={tooltipContent((value) => formatInteger(value))}
              />
              <Bar
                dataKey="available"
                name="Disponíveis"
                stackId="collection"
                fill={SERIES.s1}
                maxBarSize={24}
                stroke={CHROME.surface}
                strokeWidth={2}
                animationDuration={400}
              />
              <Bar
                dataKey="loaned"
                name="Emprestados"
                stackId="collection"
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
          <VizEmpty message="Nenhum livro cadastrado no acervo." />
        )
      }
      table={
        <VizTable
          caption="Livros disponíveis e emprestados por gênero"
          rows={chartData}
          rowKey={(r) => r.genre}
          columns={[
            { key: "genre", title: "Gênero", render: (r) => r.genre },
            {
              key: "available",
              title: "Disponíveis",
              align: "right",
              render: (r) => formatInteger(r.available),
            },
            {
              key: "loaned",
              title: "Emprestados",
              align: "right",
              render: (r) => formatInteger(r.loaned),
            },
            {
              key: "total",
              title: "Total",
              align: "right",
              render: (r) => formatInteger(r.total),
            },
          ]}
        />
      }
    />
  );
}

export function ItemsPanel({
  rows,
  revalidating,
}: {
  rows: ItemRow[];
  revalidating?: boolean;
}) {
  return (
    <ChartCard
      title="Itens mais lançados"
      description="Salgados por número de lançamentos no período"
      height={Math.max(200, rows.length * 34 + 40)}
      revalidating={revalidating}
      chart={
        rows.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={horizontalMargin}>
              <CartesianGrid {...baseGrid} vertical horizontal={false} />
              <XAxis type="number" {...baseAxis} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="item"
                {...baseAxis}
                width={110}
                interval={0}
              />
              <Tooltip
                cursor={barCursor}
                content={tooltipContent((value) => formatInteger(value))}
              />
              <Bar
                dataKey="count"
                name="Lançamentos"
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
          <VizEmpty />
        )
      }
      table={
        <VizTable
          caption="Itens de salgados mais lançados no período"
          rows={rows}
          rowKey={(r) => r.item}
          columns={[
            { key: "item", title: "Item", render: (r) => r.item },
            {
              key: "count",
              title: "Lançamentos",
              align: "right",
              render: (r) => formatInteger(r.count),
            },
            {
              key: "amount",
              title: "Valor total",
              align: "right",
              render: (r) => formatCurrency(r.amount),
            },
          ]}
        />
      }
    />
  );
}

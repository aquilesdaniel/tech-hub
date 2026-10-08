"use client";

import { Button } from "@heroui/react";
import type { ReactNode } from "react";

export const SERIES = {
  s1: "var(--viz-1)",
  s2: "var(--viz-2)",
  s3: "var(--viz-3)",
  s4: "var(--viz-4)",
  s5: "var(--viz-5)",
  s6: "var(--viz-6)",
  s7: "var(--viz-7)",
  s8: "var(--viz-8)",
} as const;

export const CHROME = {
  grid: "var(--viz-grid)",
  axis: "var(--viz-axis)",
  text: "var(--muted)",
  surface: "var(--surface)",
  deEmphasis: "var(--viz-de-emphasis)",
} as const;

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

export function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000)
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(value) >= 1_000)
    return `R$ ${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return formatCurrency(value);
}

export function formatInteger(value: number) {
  return value.toLocaleString("pt-BR");
}

export function formatPercent(value: number, decimals = 1) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
}

export function formatShortDate(iso: string | null) {
  if (!iso) {
    return "-";
  }
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export const baseAxis = {
  stroke: CHROME.axis,
  strokeWidth: 1,
  tickLine: false,
  tick: {
    fill: CHROME.text,
    fontSize: 11,
    fontVariantNumeric: "tabular-nums" as const,
  },
} as const;

export const baseGrid = {
  stroke: CHROME.grid,
  strokeWidth: 1,
  strokeDasharray: undefined,
  vertical: false,
} as const;

export const directLabel = {
  fill: CHROME.text,
  fontSize: 11,
  fontVariantNumeric: "tabular-nums" as const,
};

export const crosshairCursor = { stroke: CHROME.axis, strokeWidth: 1 };

export const horizontalMargin = { top: 4, right: 56, bottom: 4, left: 0 };
export const verticalMargin = { top: 8, right: 12, bottom: 0, left: 0 };

export function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / 86_400_000);
}

export function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

type TooltipRow = {
  name: string;
  value: string;
  color: string;
};

export function VizTooltip({
  title,
  rows,
}: {
  title: string;
  rows: TooltipRow[];
}) {
  return (
    <div className="pointer-events-none min-w-40 rounded-lg border border-border bg-overlay px-3 py-2 shadow-overlay">
      <p className="mb-1.5 text-xs text-muted">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="text-sm font-semibold tabular-nums text-overlay-foreground">
              {row.value}
            </span>
            <span className="ml-auto text-xs text-muted">{row.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function tooltipContent(
  format: (value: number, key: string) => string,
) {
  return function Content({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
      <VizTooltip
        title={String(label ?? "")}
        rows={payload.map(
          (item: any): TooltipRow => ({
            name: String(item.name ?? item.dataKey),
            value: format(Number(item.value ?? 0), String(item.dataKey)),
            color: item.color ?? item.fill ?? CHROME.deEmphasis,
          }),
        )}
      />
    );
  };
}

export const barCursor = {
  fill: "var(--surface-secondary)",
  radius: 6,
};

export type LegendItem = {
  name: string;
  color: string;
  shape?: "line" | "area";
};

export function Legend({ items }: { items: LegendItem[] }) {
  if (items.length < 2) return null;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-2">
          <span
            aria-hidden
            className={
              item.shape === "line"
                ? "h-0.5 w-3.5 shrink-0 rounded-full"
                : "h-2.5 w-2.5 shrink-0 rounded-md"
            }
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-muted">{item.name}</span>
        </li>
      ))}
    </ul>
  );
}

export type TableColumn<T> = {
  key: string;
  title: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

export function VizTable<T>({
  columns,
  rows,
  rowKey,
  caption,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  caption: string;
}) {
  if (rows.length === 0) return <VizEmpty />;
  return (
    <div className="max-h-75 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`whitespace-nowrap px-2 py-2 text-xs font-medium text-muted ${
                  column.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              className="border-b border-separator last:border-0"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-2 py-2 ${
                    column.align === "right"
                      ? "text-right tabular-nums"
                      : "text-left"
                  }`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VizEmpty({
  message = "Sem dados no período selecionado",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-55 flex-col items-center justify-center gap-1 text-center">
      <p className="text-sm text-muted">{message}</p>
      <p className="text-xs text-muted/70">
        Tente ampliar o período ou limpar o filtro de setor.
      </p>
    </div>
  );
}

export type View = "chart" | "table";

export function ViewToggle({
  view,
  onChange,
  label,
}: {
  view: View;
  onChange: (view: View) => void;
  label: string;
}) {
  const next: View = view === "chart" ? "table" : "chart";
  return (
    <Button
      size="sm"
      variant="ghost"
      onPress={() => onChange(next)}
      aria-label={
        next === "table"
          ? `Ver ${label} como tabela`
          : `Ver ${label} como gráfico`
      }
      className="text-xs text-muted"
    >
      {next === "table" ? "Ver tabela" : "Ver gráfico"}
    </Button>
  );
}

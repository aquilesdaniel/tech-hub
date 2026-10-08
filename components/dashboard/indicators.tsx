"use client";

import { Card, Chip, Meter } from "@heroui/react";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import type { DashboardData } from "./types";
import { formatShortDate, formatInteger, formatCurrency, formatPercent } from "./viz";

type MeterColor = "accent" | "success" | "warning" | "danger";

function Indicator({
  label,
  value,
  color,
  detail,
}: {
  label: string;
  value: number;
  color: MeterColor;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Meter
        value={value}
        minValue={0}
        maxValue={100}
        color={color}
        size="md"
        aria-label={label}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-foreground">{label}</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatPercent(value, 0)}
          </span>
        </div>
        <Meter.Track className="mt-1.5">
          <Meter.Fill />
        </Meter.Track>
      </Meter>
      <p className="text-xs text-muted">{detail}</p>
    </div>
  );
}

function colorBand(
  value: number,
  goodAbove: number,
  warningAbove: number,
): MeterColor {
  if (value >= goodAbove) return "success";
  if (value >= warningAbove) return "warning";
  return "danger";
}

export function IndicatorsPanel({ data }: { data: DashboardData }) {
  const { kpis } = data;

  const onTimeRate =
    kpis.activeLoans > 0
      ? ((kpis.activeLoans - kpis.overdueLoans) /
          kpis.activeLoans) *
        100
      : 100;

  const hasIssued = kpis.issuedAmount > 0;
  const hasBooks = kpis.totalBooks > 0;

  return (
    <Card className="h-full">
      <Card.Header className="pb-2">
        <Card.Title className="text-base">Indicadores de saúde</Card.Title>
        <Card.Description className="text-xs">
          Cada razão contra a sua própria meta
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-5">
        <Indicator
          label="Quitação de salgados"
          value={kpis.settlementRate}
          color={hasIssued ? colorBand(kpis.settlementRate, 80, 50) : "accent"}
          detail={
            hasIssued
              ? `${formatCurrency(kpis.settledAmount)} de ${formatCurrency(kpis.issuedAmount)} lançados no período`
              : "Nenhum lançamento no período"
          }
        />
        <Indicator
          label="Acervo disponível"
          value={kpis.availabilityRate}
          color={hasBooks ? colorBand(kpis.availabilityRate, 60, 30) : "accent"}
          detail={
            hasBooks
              ? `${formatInteger(kpis.availableBooks)} de ${formatInteger(kpis.totalBooks)} livros na estante`
              : "Nenhum livro cadastrado"
          }
        />
        <Indicator
          label="Empréstimos em dia"
          value={onTimeRate}
          color={colorBand(onTimeRate, 90, 70)}
          detail={
            kpis.overdueLoans > 0
              ? `${formatInteger(kpis.overdueLoans)} empréstimo(s) em atraso`
              : "Nenhum empréstimo em atraso"
          }
        />
      </Card.Content>
    </Card>
  );
}

export function AlertsPanel({ data }: { data: DashboardData }) {
  const { overdueLoans, expiringCertifications } = data.alerts;
  const noAlerts =
    overdueLoans.length === 0 && expiringCertifications.length === 0;

  return (
    <Card className="h-full">
      <Card.Header className="pb-2">
        <Card.Title className="text-base">Precisa de atenção</Card.Title>
        <Card.Description className="text-xs">
          Atrasos na biblioteca e certificações a vencer em até 90 dias
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {noAlerts ? (
          <div className="flex items-center gap-2 py-2">
            <CheckCircle2
              aria-hidden
              className="size-4 shrink-0 text-success"
            />
            <p className="text-sm text-muted">
              Nada pendente - tudo em dia por aqui.
            </p>
          </div>
        ) : (
          <ul className="flex max-h-80 flex-col divide-y divide-separator overflow-auto">
            {overdueLoans.map((item) => (
              <li
                key={`overdue-${item.id}`}
                className="flex items-start gap-2.5 py-2.5"
              >
                <AlertTriangle
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-danger"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {item.book}
                  </p>
                  <p className="text-xs text-muted">
                    {item.employee} · previsto {formatShortDate(item.dueDate)}
                  </p>
                </div>
                <Chip size="sm" color="danger" variant="soft">
                  <Chip.Label>
                    {formatInteger(item.daysOverdue)} d de atraso
                  </Chip.Label>
                </Chip>
              </li>
            ))}
            {expiringCertifications.map((item) => (
              <li
                key={`expiring-${item.id}`}
                className="flex items-start gap-2.5 py-2.5"
              >
                <CalendarClock
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-warning"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {item.name}
                  </p>
                  <p className="text-xs text-muted">
                    {item.employee} · vence {formatShortDate(item.expiresAt)}
                  </p>
                </div>
                <Chip size="sm" color="warning" variant="soft">
                  <Chip.Label>
                    vence em {formatInteger(item.daysRemaining ?? 0)} d
                  </Chip.Label>
                </Chip>
              </li>
            ))}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
}

"use client";

import { Card } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { formatPercent } from "./viz";

const Sparkline = dynamic(
  () => import("./sparkline").then((m) => m.Sparkline),
  { ssr: false },
);

type Props = {
  label: string;
  value: string;
  icon?: LucideIcon;
  delta?: number | null;
  deltaLabel?: string;
  higherIsBetter?: boolean;
  series?: number[];
  footer?: ReactNode;
};

export function StatTile({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  higherIsBetter = true,
  series,
  footer,
}: Props) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const wentUp = hasDelta && delta > 0;
  const wentDown = hasDelta && delta < 0;
  const isGood = wentUp ? higherIsBetter : wentDown ? !higherIsBetter : null;

  const deltaColor =
    isGood === null ? "text-muted" : isGood ? "text-success" : "text-danger";
  const DeltaIcon = wentUp ? ArrowUpRight : wentDown ? ArrowDownRight : Minus;

  const hasSparkline = (series?.length ?? 0) >= 3;

  return (
    <Card className="h-full">
      <Card.Content className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted">{label}</p>
          {Icon && (
            <Icon aria-hidden className="size-4 shrink-0 text-muted" />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold leading-none text-foreground">
            {value}
          </p>
          {hasDelta && (
            <p className={`flex items-center gap-1 text-xs ${deltaColor}`}>
              <DeltaIcon aria-hidden className="size-3.5 shrink-0" />
              <span className="font-medium">
                {wentUp ? "+" : ""}
                {formatPercent(delta, 1)}
              </span>
              {deltaLabel && (
                <span className="text-muted">{deltaLabel}</span>
              )}
            </p>
          )}
          {!hasDelta && deltaLabel && (
            <p className="text-xs text-muted">{deltaLabel}</p>
          )}
        </div>

        {hasSparkline && series && (
          <div className="mt-auto h-8" aria-hidden>
            <Sparkline values={series} />
          </div>
        )}

        {footer && <div className="mt-auto">{footer}</div>}
      </Card.Content>
    </Card>
  );
}

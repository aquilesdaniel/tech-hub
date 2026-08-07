"use client";

import { Card } from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { percentual } from "./viz";

// Recharts entra só quando existe série para desenhar: as telas de lista usam
// este mesmo tile sem gráfico nenhum e não devem pagar pelo pacote.
const Sparkline = dynamic(
  () => import("./sparkline").then((m) => m.Sparkline),
  { ssr: false },
);

type Props = {
  rotulo: string;
  valor: string;
  icone?: LucideIcon;
  delta?: number | null;
  deltaLegenda?: string;
  subirEhBom?: boolean;
  serie?: number[];
  rodape?: ReactNode;
};

export function StatTile({
  rotulo,
  valor,
  icone: Icone,
  delta,
  deltaLegenda,
  subirEhBom = true,
  serie,
  rodape,
}: Props) {
  const temDelta = typeof delta === "number" && Number.isFinite(delta);
  const subiu = temDelta && delta > 0;
  const desceu = temDelta && delta < 0;
  const bom = subiu ? subirEhBom : desceu ? !subirEhBom : null;

  const corDelta =
    bom === null ? "text-muted" : bom ? "text-success" : "text-danger";
  const IconeDelta = subiu ? ArrowUpRight : desceu ? ArrowDownRight : Minus;

  const temSparkline = (serie?.length ?? 0) >= 3;

  return (
    <Card className="h-full">
      <Card.Content className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted">{rotulo}</p>
          {Icone && (
            <Icone aria-hidden className="size-4 shrink-0 text-muted" />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-2xl font-semibold leading-none text-foreground">
            {valor}
          </p>
          {temDelta && (
            <p className={`flex items-center gap-1 text-xs ${corDelta}`}>
              <IconeDelta aria-hidden className="size-3.5 shrink-0" />
              <span className="font-medium">
                {subiu ? "+" : ""}
                {percentual(delta, 1)}
              </span>
              {deltaLegenda && (
                <span className="text-muted">{deltaLegenda}</span>
              )}
            </p>
          )}
          {!temDelta && deltaLegenda && (
            <p className="text-xs text-muted">{deltaLegenda}</p>
          )}
        </div>

        {temSparkline && serie && (
          <div className="mt-auto h-8" aria-hidden>
            <Sparkline valores={serie} />
          </div>
        )}

        {rodape && <div className="mt-auto">{rodape}</div>}
      </Card.Content>
    </Card>
  );
}

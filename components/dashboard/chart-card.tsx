"use client";

import { Card } from "@heroui/react";
import { useState, type ReactNode } from "react";
import { Legend, ViewToggle, type LegendItem, type View } from "./viz";

type Props = {
  title: string;
  description?: string;
  legend?: LegendItem[];
  height?: number;
  chart: ReactNode;
  table: ReactNode;
  revalidating?: boolean;
  className?: string;
};

export function ChartCard({
  title,
  description,
  legend,
  height = 260,
  chart,
  table,
  revalidating = false,
  className,
}: Props) {
  const [view, setView] = useState<View>("chart");

  return (
    <Card className={className}>
      <Card.Header className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="min-w-0">
          <Card.Title className="text-base">{title}</Card.Title>
          {description && (
            <Card.Description className="text-xs">{description}</Card.Description>
          )}
        </div>
        <ViewToggle view={view} onChange={setView} label={title} />
      </Card.Header>

      <Card.Content className="flex flex-col gap-3">
        {legend && view === "chart" && <Legend items={legend} />}

        <div
          className={`transition-opacity duration-200 ${
            revalidating ? "opacity-50" : "opacity-100"
          }`}
          style={view === "chart" ? { height } : undefined}
        >
          {view === "chart" ? chart : table}
        </div>
      </Card.Content>
    </Card>
  );
}

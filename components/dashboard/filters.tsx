"use client";

import {
  Button,
  Card,
  ListBox,
  Select,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { RotateCw } from "lucide-react";
import type { Sector } from "./types";

export const PERIODS = [
  { id: "3", label: "3 meses" },
  { id: "6", label: "6 meses" },
  { id: "12", label: "12 meses" },
  { id: "0", label: "Tudo" },
] as const;

type Props = {
  months: number;
  onMonthsChange: (months: number) => void;
  sectorId: string;
  onSectorChange: (sectorId: string) => void;
  sectors: Sector[];
  showSector: boolean;
  revalidating: boolean;
  onRefresh: () => void;
};

export function DashboardFilters({
  months,
  onMonthsChange,
  sectorId,
  onSectorChange,
  sectors,
  showSector,
  revalidating,
  onRefresh,
}: Props) {
  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <ToggleButtonGroup
        size="sm"
        className="max-sm:w-full max-sm:*:flex-1"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[String(months)]}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0];
          if (selected != null) {
            onMonthsChange(Number(selected));
          }
        }}
        aria-labelledby="period-label"
      >
        {PERIODS.map((period) => (
          <ToggleButton key={period.id} id={period.id}>
            {period.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {showSector && (
        <div className="w-full sm:w-52">
          <Select
            selectedKey={sectorId}
            onSelectionChange={(key) => onSectorChange(String(key))}
            aria-labelledby="sector-label"
            variant="secondary"
          >
            <Select.Trigger className="w-full">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="all" textValue="Todos os setores">
                  Todos os setores
                </ListBox.Item>
                {sectors.map((sector) => (
                  <ListBox.Item
                    key={sector.id}
                    id={String(sector.id)}
                    textValue={sector.nome}
                  >
                    {sector.nome}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        onPress={onRefresh}
        isPending={revalidating}
        className="max-sm:w-full sm:ml-auto"
      >
        <RotateCw
          aria-hidden
          className={`size-4 ${revalidating ? "animate-spin" : ""}`}
        />
        Atualizar
      </Button>
    </Card>
  );
}

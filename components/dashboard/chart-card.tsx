"use client";

import { Card } from "@heroui/react";
import { useState, type ReactNode } from "react";
import { AlternadorVisao, Legenda, type ItemLegenda, type Visao } from "./viz";

type Props = {
  titulo: string;
  descricao?: string;
  legenda?: ItemLegenda[];
  altura?: number;
  grafico: ReactNode;
  tabela: ReactNode;
  revalidando?: boolean;
  className?: string;
};

export function ChartCard({
  titulo,
  descricao,
  legenda,
  altura = 260,
  grafico,
  tabela,
  revalidando = false,
  className,
}: Props) {
  const [visao, setVisao] = useState<Visao>("grafico");

  return (
    <Card className={className}>
      <Card.Header className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="min-w-0">
          <Card.Title className="text-base">{titulo}</Card.Title>
          {descricao && (
            <Card.Description className="text-xs">{descricao}</Card.Description>
          )}
        </div>
        <AlternadorVisao visao={visao} onChange={setVisao} rotulo={titulo} />
      </Card.Header>

      <Card.Content className="flex flex-col gap-3">
        {legenda && visao === "grafico" && <Legenda itens={legenda} />}

        <div
          className={`transition-opacity duration-200 ${
            revalidando ? "opacity-50" : "opacity-100"
          }`}
          style={visao === "grafico" ? { height: altura } : undefined}
        >
          {visao === "grafico" ? grafico : tabela}
        </div>
      </Card.Content>
    </Card>
  );
}

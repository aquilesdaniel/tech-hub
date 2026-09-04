"use client";

import { Button } from "@heroui/react";
import type { ReactNode } from "react";

export const SERIE = {
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
  grade: "var(--viz-grid)",
  eixo: "var(--viz-axis)",
  texto: "var(--muted)",
  superficie: "var(--surface)",
  atenuado: "var(--viz-de-emphasis)",
} as const;

export function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}

export function moedaCompacta(valor: number) {
  if (Math.abs(valor) >= 1_000_000)
    return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(valor) >= 1_000)
    return `R$ ${(valor / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return moeda(valor);
}

export function inteiro(valor: number) {
  return valor.toLocaleString("pt-BR");
}

export function percentual(valor: number, casas = 1) {
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

export function dataCurta(iso: string | null) {
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

export const eixoBase = {
  stroke: CHROME.eixo,
  strokeWidth: 1,
  tickLine: false,
  tick: {
    fill: CHROME.texto,
    fontSize: 11,
    fontVariantNumeric: "tabular-nums" as const,
  },
} as const;

export const gradeBase = {
  stroke: CHROME.grade,
  strokeWidth: 1,
  strokeDasharray: undefined,
  vertical: false,
} as const;

export const rotuloDireto = {
  fill: CHROME.texto,
  fontSize: 11,
  fontVariantNumeric: "tabular-nums" as const,
};

export const cursorCruz = { stroke: CHROME.eixo, strokeWidth: 1 };

export const margemHorizontal = { top: 4, right: 56, bottom: 4, left: 0 };
export const margemVertical = { top: 8, right: 12, bottom: 0, left: 0 };

export function diasAte(iso: string | null | undefined) {
  if (!iso) return null;
  const alvo = new Date(iso).getTime();
  if (Number.isNaN(alvo)) return null;
  return Math.ceil((alvo - Date.now()) / 86_400_000);
}

export function nomeCurto(nome: string) {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1][0]}.`;
}

type LinhaTooltip = {
  nome: string;
  valor: string;
  cor: string;
};

export function TooltipViz({
  titulo,
  linhas,
}: {
  titulo: string;
  linhas: LinhaTooltip[];
}) {
  return (
    <div className="pointer-events-none min-w-40 rounded-lg border border-border bg-overlay px-3 py-2 shadow-overlay">
      <p className="mb-1.5 text-xs text-muted">{titulo}</p>
      <ul className="flex flex-col gap-1">
        {linhas.map((linha) => (
          <li key={linha.nome} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: linha.cor }}
            />
            <span className="text-sm font-semibold tabular-nums text-overlay-foreground">
              {linha.valor}
            </span>
            <span className="ml-auto text-xs text-muted">{linha.nome}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function conteudoTooltip(
  formato: (valor: number, chave: string) => string,
) {
  return function Conteudo({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
      <TooltipViz
        titulo={String(label ?? "")}
        linhas={payload.map((item: any) => ({
          nome: String(item.name ?? item.dataKey),
          valor: formato(Number(item.value ?? 0), String(item.dataKey)),
          cor: item.color ?? item.fill ?? CHROME.atenuado,
        }))}
      />
    );
  };
}

export const cursorBarra = {
  fill: "var(--surface-secondary)",
  radius: 6,
};

export type ItemLegenda = {
  nome: string;
  cor: string;
  forma?: "linha" | "area";
};

export function Legenda({ itens }: { itens: ItemLegenda[] }) {
  if (itens.length < 2) return null;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {itens.map((item) => (
        <li key={item.nome} className="flex items-center gap-2">
          <span
            aria-hidden
            className={
              item.forma === "linha"
                ? "h-0.5 w-3.5 shrink-0 rounded-full"
                : "h-2.5 w-2.5 shrink-0 rounded-md"
            }
            style={{ backgroundColor: item.cor }}
          />
          <span className="text-xs text-muted">{item.nome}</span>
        </li>
      ))}
    </ul>
  );
}

export type ColunaTabela<T> = {
  chave: string;
  titulo: string;
  alinhar?: "esquerda" | "direita";
  render: (linha: T) => ReactNode;
};

export function TabelaViz<T>({
  colunas,
  linhas,
  chaveLinha,
  legenda,
}: {
  colunas: ColunaTabela<T>[];
  linhas: T[];
  chaveLinha: (linha: T, indice: number) => string;
  legenda: string;
}) {
  if (linhas.length === 0) return <VazioViz />;
  return (
    <div className="max-h-75 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{legenda}</caption>
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-border">
            {colunas.map((coluna) => (
              <th
                key={coluna.chave}
                scope="col"
                className={`whitespace-nowrap px-2 py-2 text-xs font-medium text-muted ${
                  coluna.alinhar === "direita" ? "text-right" : "text-left"
                }`}
              >
                {coluna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, indice) => (
            <tr
              key={chaveLinha(linha, indice)}
              className="border-b border-separator last:border-0"
            >
              {colunas.map((coluna) => (
                <td
                  key={coluna.chave}
                  className={`px-2 py-2 ${
                    coluna.alinhar === "direita"
                      ? "text-right tabular-nums"
                      : "text-left"
                  }`}
                >
                  {coluna.render(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VazioViz({
  mensagem = "Sem dados no período selecionado",
}: {
  mensagem?: string;
}) {
  return (
    <div className="flex h-55 flex-col items-center justify-center gap-1 text-center">
      <p className="text-sm text-muted">{mensagem}</p>
      <p className="text-xs text-muted/70">
        Tente ampliar o período ou limpar o filtro de setor.
      </p>
    </div>
  );
}

export type Visao = "grafico" | "tabela";

export function AlternadorVisao({
  visao,
  onChange,
  rotulo,
}: {
  visao: Visao;
  onChange: (visao: Visao) => void;
  rotulo: string;
}) {
  const proxima: Visao = visao === "grafico" ? "tabela" : "grafico";
  return (
    <Button
      size="sm"
      variant="ghost"
      onPress={() => onChange(proxima)}
      aria-label={
        proxima === "tabela"
          ? `Ver ${rotulo} como tabela`
          : `Ver ${rotulo} como gráfico`
      }
      className="text-xs text-muted"
    >
      {proxima === "tabela" ? "Ver tabela" : "Ver gráfico"}
    </Button>
  );
}

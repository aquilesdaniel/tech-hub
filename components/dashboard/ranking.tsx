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
  Legenda,
  SERIE,
  TabelaViz,
  VazioViz,
  conteudoTooltip,
  cursorBarra,
  dataCurta,
  eixoBase,
  gradeBase,
  inteiro,
  margemHorizontal,
  nomeCurto,
  percentual,
  rotuloDireto,
} from "./viz";

export type ColaboradorStats = {
  id: number;
  nome: string;
  email: string;
  departamento: string;
  total_certificacoes: number;
  certificacoes_senior: number;
  outras_certificacoes: number;
  ultima_certificacao: string | null;
  tipos_certificacao: Record<string, number>;
};

export type EstatisticasGerais = {
  total_colaboradores: number;
  total_certificacoes: number;
  media_certificacoes_por_colaborador: number;
  colaborador_mais_certificacoes: string;
  tipo_certificacao_mais_popular: string;
  crescimento_mensal: { mes: string; certificacoes: number }[];
};

export type FiltroTipo = "todos" | "senior" | "outras";
export type Ordenacao = "total_desc" | "senior_desc" | "outras_desc" | "nome";

export const LEGENDA_CERTIFICACAO = [
  { nome: "Sênior", cor: SERIE.s1 },
  { nome: "Outras", cor: SERIE.s2 },
];

export function recortarColaboradores(
  linhas: ColaboradorStats[],
  filtro: FiltroTipo,
  ordenacao: Ordenacao,
) {
  return linhas
    .filter((c) => {
      if (filtro === "senior") return c.certificacoes_senior > 0;
      if (filtro === "outras") return c.outras_certificacoes > 0;
      return true;
    })
    .sort((a, b) => {
      switch (ordenacao) {
        case "senior_desc":
          return b.certificacoes_senior - a.certificacoes_senior;
        case "outras_desc":
          return b.outras_certificacoes - a.outras_certificacoes;
        case "nome":
          return a.nome.localeCompare(b.nome, "pt-BR");
        default:
          return b.total_certificacoes - a.total_certificacoes;
      }
    });
}

export function agruparPorTipo(linhas: ColaboradorStats[]) {
  const soma = new Map<string, number>();
  for (const colaborador of linhas) {
    for (const [tipo, quantidade] of Object.entries(
      colaborador.tipos_certificacao ?? {},
    )) {
      soma.set(tipo, (soma.get(tipo) ?? 0) + quantidade);
    }
  }
  return Array.from(soma.entries())
    .map(([tipo, quantidade]) => ({ tipo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

export function PainelTopCertificadores({
  linhas,
  revalidando,
}: {
  linhas: ColaboradorStats[];
  revalidando?: boolean;
}) {
  const top = linhas.slice(0, 10);
  const dados = top.map((c) => ({
    rotulo: nomeCurto(c.nome),
    senior: c.certificacoes_senior,
    outras: c.outras_certificacoes,
    total: c.total_certificacoes,
  }));

  return (
    <ChartCard
      titulo="Top 10 do ranking"
      descricao="Certificações acumuladas por colaborador, do início ao hoje"
      legenda={LEGENDA_CERTIFICACAO}
      altura={Math.max(220, dados.length * 34 + 40)}
      revalidando={revalidando}
      grafico={
        dados.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} layout="vertical" margin={margemHorizontal}>
              <CartesianGrid {...gradeBase} vertical horizontal={false} />
              <XAxis type="number" {...eixoBase} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="rotulo"
                {...eixoBase}
                width={92}
                interval={0}
              />

              <Tooltip
                cursor={cursorBarra}
                content={conteudoTooltip((valor) => inteiro(valor))}
              />

              <Bar
                dataKey="senior"
                name="Sênior"
                stackId="cert"
                fill={SERIE.s1}
                maxBarSize={24}
                stroke={CHROME.superficie}
                strokeWidth={2}
                animationDuration={400}
              />

              <Bar
                dataKey="outras"
                name="Outras"
                stackId="cert"
                fill={SERIE.s2}
                maxBarSize={24}
                radius={[0, 4, 4, 0]}
                stroke={CHROME.superficie}
                strokeWidth={2}
                animationDuration={400}
              >
                <LabelList
                  dataKey="total"
                  position="right"
                  offset={8}
                  {...rotuloDireto}
                  formatter={(valor: number) => inteiro(valor)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <VazioViz mensagem="Nenhum colaborador no recorte selecionado." />
        )
      }
      tabela={
        <TabelaViz
          legenda="Certificações acumuladas por colaborador"
          linhas={top}
          chaveLinha={(l) => String(l.id)}
          colunas={[
            { chave: "nome", titulo: "Colaborador", render: (l) => l.nome },
            {
              chave: "departamento",
              titulo: "Departamento",
              render: (l) => l.departamento,
            },
            {
              chave: "senior",
              titulo: "Sênior",
              alinhar: "direita",
              render: (l) => inteiro(l.certificacoes_senior),
            },
            {
              chave: "outras",
              titulo: "Outras",
              alinhar: "direita",
              render: (l) => inteiro(l.outras_certificacoes),
            },
            {
              chave: "total",
              titulo: "Total",
              alinhar: "direita",
              render: (l) => inteiro(l.total_certificacoes),
            },
          ]}
        />
      }
    />
  );
}

export function PainelTiposCertificacao({
  linhas,
  revalidando,
}: {
  linhas: { tipo: string; quantidade: number }[];
  revalidando?: boolean;
}) {
  const total = linhas.reduce((soma, l) => soma + l.quantidade, 0);
  const dados = linhas.slice(0, 8);

  return (
    <ChartCard
      titulo="Distribuição por tipo"
      descricao={
        linhas.length > 8
          ? `8 tipos mais frequentes de ${inteiro(linhas.length)}`
          : "Quantas certificações de cada tipo a empresa acumula"
      }
      altura={Math.max(220, dados.length * 34 + 40)}
      revalidando={revalidando}
      grafico={
        dados.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} layout="vertical" margin={margemHorizontal}>
              <CartesianGrid {...gradeBase} vertical horizontal={false} />
              <XAxis type="number" {...eixoBase} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="tipo"
                {...eixoBase}
                width={140}
                interval={0}
              />

              <Tooltip
                cursor={cursorBarra}
                content={conteudoTooltip((valor) => inteiro(valor))}
              />

              <Bar
                dataKey="quantidade"
                name="Certificações"
                fill={SERIE.s1}
                maxBarSize={24}
                radius={[0, 4, 4, 0]}
                animationDuration={400}
              >
                <LabelList
                  dataKey="quantidade"
                  position="right"
                  offset={8}
                  {...rotuloDireto}
                  formatter={(valor: number) => inteiro(valor)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <VazioViz mensagem="Nenhuma certificação registrada." />
        )
      }
      tabela={
        <TabelaViz
          legenda="Certificações por tipo"
          linhas={linhas}
          chaveLinha={(l) => l.tipo}
          colunas={[
            { chave: "tipo", titulo: "Tipo", render: (l) => l.tipo },
            {
              chave: "quantidade",
              titulo: "Certificações",
              alinhar: "direita",
              render: (l) => inteiro(l.quantidade),
            },
            {
              chave: "share",
              titulo: "Participação",
              alinhar: "direita",
              render: (l) =>
                total > 0 ? percentual((l.quantidade / total) * 100, 1) : "-",
            },
          ]}
        />
      }
    />
  );
}

const FAIXAS: {
  ate: number;
  rotulo: string;
  icone: LucideIcon;
  cor: string;
}[] = [
  { ate: 1, rotulo: "Campeão", icone: Crown, cor: SERIE.s4 },
  { ate: 3, rotulo: "Pódio", icone: Medal, cor: SERIE.s2 },
  { ate: 5, rotulo: "Top 5", icone: Award, cor: CHROME.atenuado },
];

function faixaDaPosicao(posicao: number) {
  return FAIXAS.find((faixa) => posicao <= faixa.ate) ?? null;
}

function Numero({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className="w-14 text-right">
      <p
        className={`tabular-nums leading-none ${
          destaque
            ? "text-lg font-semibold text-foreground"
            : "text-sm text-foreground"
        }`}
      >
        {inteiro(valor)}
      </p>
      <p className="mt-1 text-[0.6875rem] text-muted">{rotulo}</p>
    </div>
  );
}

/** Uma linha do ranking. `ehVoce` destaca a linha de quem está olhando. */
function LinhaRanking({
  colaborador,
  posicao,
  maximo,
  ehVoce,
}: {
  colaborador: ColaboradorStats;
  posicao: number;
  maximo: number;
  ehVoce?: boolean;
}) {
  const faixa = faixaDaPosicao(posicao);
  const Icone = faixa?.icone;

  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-3 py-3`}>
      <span className="flex w-12 shrink-0 items-center gap-1.5">
        {Icone ? (
          <Icone
            aria-hidden
            className="size-4 shrink-0"
            style={{ color: faixa?.cor }}
          />
        ) : (
          <span aria-hidden className="size-4 shrink-0" />
        )}
        <span className="text-sm font-semibold tabular-nums text-muted">
          {posicao}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-sm font-medium text-foreground">
            {colaborador.nome}
          </p>
          {ehVoce && (
            <Chip size="sm" color="accent" variant="soft">
              <Chip.Label>Você</Chip.Label>
            </Chip>
          )}
          {faixa && (
            <Chip size="sm" variant="soft">
              <Chip.Label>{faixa.rotulo}</Chip.Label>
            </Chip>
          )}
        </div>

        <p className="truncate text-xs text-muted">
          {colaborador.departamento || "Sem departamento"}
          {colaborador.ultima_certificacao
            ? ` · última em ${dataCurta(colaborador.ultima_certificacao)}`
            : ""}
        </p>

        {/* Total relativo ao líder, repartido por tipo. */}
        <div
          aria-hidden
          className="mt-2 flex h-1 w-full max-w-64 overflow-hidden rounded-full bg-surface-tertiary"
        >
          <span
            className="block h-full"
            style={{
              width: `${(colaborador.certificacoes_senior / maximo) * 100}%`,
              backgroundColor: SERIE.s1,
            }}
          />
          <span
            className="block h-full"
            style={{
              width: `${(colaborador.outras_certificacoes / maximo) * 100}%`,
              backgroundColor: SERIE.s2,
            }}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-3">
        <Numero rotulo="Sênior" valor={colaborador.certificacoes_senior} />
        <Numero rotulo="Outras" valor={colaborador.outras_certificacoes} />
        <Numero
          rotulo="Total"
          valor={colaborador.total_certificacoes}
          destaque
        />
      </div>
    </li>
  );
}

/**
 * O ranking. Mostra o top `limite` inteiro na tela — sem rolagem interna — e,
 * quando quem olha está fora dele, repete a própria linha embaixo com a posição
 * real. A posição é um número escrito, não uma cor.
 */
export function PainelRanking({
  linhas,
  filtroTipo,
  onFiltroTipoChange,
  ordenacao,
  onOrdenacaoChange,
  mostrarFiltros = false,
  destaqueId = null,
  limite = 10,
  revalidando,
}: {
  linhas: ColaboradorStats[];
  filtroTipo: FiltroTipo;
  onFiltroTipoChange: (filtro: FiltroTipo) => void;
  ordenacao: Ordenacao;
  onOrdenacaoChange: (ordenacao: Ordenacao) => void;
  /** Os recortes só fazem sentido para quem administra a lista inteira. */
  mostrarFiltros?: boolean;
  /** Colaborador de quem está olhando — ganha destaque e linha própria. */
  destaqueId?: number | null;
  limite?: number;
  revalidando?: boolean;
}) {
  const maximo = Math.max(1, ...linhas.map((l) => l.total_certificacoes));
  const top = linhas.slice(0, limite);

  const indiceProprio =
    destaqueId != null ? linhas.findIndex((l) => l.id === destaqueId) : -1;
  const foraDoTop = indiceProprio >= limite;
  const proprio = foraDoTop ? linhas[indiceProprio] : null;

  return (
    <Card>
      <Card.Header className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Card.Title className="text-base">
            Ranking de certificações
          </Card.Title>
          <Card.Description className="text-xs">
            Top {inteiro(Math.min(limite, linhas.length))} de{" "}
            {inteiro(linhas.length)} colaborador(es)
            {indiceProprio >= 0 ? ` · você está em ${indiceProprio + 1}º` : ""}
          </Card.Description>
        </div>

        {mostrarFiltros && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="flex min-w-44 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted" id="rotulo-tipo">
                Certificações
              </span>
              <Select
                selectedKey={filtroTipo}
                onSelectionChange={(chave) =>
                  onFiltroTipoChange(String(chave) as FiltroTipo)
                }
                aria-labelledby="rotulo-tipo"
              >
                <Select.Trigger className="w-full">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="todos" textValue="Todas">
                      Todas
                    </ListBox.Item>
                    <ListBox.Item id="senior" textValue="Com Sênior">
                      Com Sênior
                    </ListBox.Item>
                    <ListBox.Item id="outras" textValue="Com outras">
                      Com outras
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <div className="flex min-w-44 flex-col gap-1.5">
              <span
                className="text-xs font-medium text-muted"
                id="rotulo-ordem"
              >
                Classificar por
              </span>
              <Select
                selectedKey={ordenacao}
                onSelectionChange={(chave) =>
                  onOrdenacaoChange(String(chave) as Ordenacao)
                }
                aria-labelledby="rotulo-ordem"
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
                    <ListBox.Item id="outras_desc" textValue="Outras">
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
        <Legenda itens={LEGENDA_CERTIFICACAO} />

        <div
          className={`transition-opacity duration-200 ${
            revalidando ? "opacity-50" : "opacity-100"
          }`}
        >
          {linhas.length === 0 ? (
            <VazioViz mensagem="Nenhum colaborador com certificações registradas." />
          ) : (
            <>
              <ol className="flex flex-col divide-y divide-separator">
                {top.map((colaborador, indice) => (
                  <LinhaRanking
                    key={colaborador.id}
                    colaborador={colaborador}
                    posicao={indice + 1}
                    maximo={maximo}
                    ehVoce={colaborador.id === destaqueId}
                  />
                ))}
              </ol>

              {proprio && (
                <div className="border-t border-dashed border-border pt-3">
                  <p className="text-xs font-medium text-muted">Sua posição</p>
                  <ol className="flex flex-col">
                    <LinhaRanking
                      colaborador={proprio}
                      posicao={indiceProprio + 1}
                      maximo={maximo}
                      ehVoce
                    />
                  </ol>
                </div>
              )}

              {destaqueId != null && indiceProprio < 0 && (
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

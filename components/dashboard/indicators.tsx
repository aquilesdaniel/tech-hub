"use client";

import { Card, Chip, Meter } from "@heroui/react";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import type { DashboardData } from "./types";
import { dataCurta, inteiro, moeda, percentual } from "./viz";

type CorMeter = "accent" | "success" | "warning" | "danger";

function Indicador({
  rotulo,
  valor,
  cor,
  detalhe,
}: {
  rotulo: string;
  valor: number;
  cor: CorMeter;
  detalhe: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Meter
        value={valor}
        minValue={0}
        maxValue={100}
        color={cor}
        size="md"
        aria-label={rotulo}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-foreground">{rotulo}</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {percentual(valor, 0)}
          </span>
        </div>
        <Meter.Track className="mt-1.5">
          <Meter.Fill />
        </Meter.Track>
      </Meter>
      <p className="text-xs text-muted">{detalhe}</p>
    </div>
  );
}

function faixa(
  valor: number,
  bomAcima: number,
  atencaoAcima: number,
): CorMeter {
  if (valor >= bomAcima) return "success";
  if (valor >= atencaoAcima) return "warning";
  return "danger";
}

export function PainelIndicadores({ dados }: { dados: DashboardData }) {
  const { kpis } = dados;

  const taxaDevolucao =
    kpis.emprestimosAtivos > 0
      ? ((kpis.emprestimosAtivos - kpis.emprestimosAtrasados) /
          kpis.emprestimosAtivos) *
        100
      : 100;

  const houveLancamento = kpis.valorLancado > 0;
  const houveAcervo = kpis.livrosTotal > 0;

  return (
    <Card className="h-full">
      <Card.Header className="pb-2">
        <Card.Title className="text-base">Indicadores de saúde</Card.Title>
        <Card.Description className="text-xs">
          Cada razão contra a sua própria meta
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-5">
        <Indicador
          rotulo="Quitação de salgados"
          valor={kpis.taxaQuitacao}
          cor={houveLancamento ? faixa(kpis.taxaQuitacao, 80, 50) : "accent"}
          detalhe={
            houveLancamento
              ? `${moeda(kpis.valorQuitado)} de ${moeda(kpis.valorLancado)} lançados no período`
              : "Nenhum lançamento no período"
          }
        />
        <Indicador
          rotulo="Acervo disponível"
          valor={kpis.taxaDisponibilidade}
          cor={houveAcervo ? faixa(kpis.taxaDisponibilidade, 60, 30) : "accent"}
          detalhe={
            houveAcervo
              ? `${inteiro(kpis.livrosDisponiveis)} de ${inteiro(kpis.livrosTotal)} livros na estante`
              : "Nenhum livro cadastrado"
          }
        />
        <Indicador
          rotulo="Empréstimos em dia"
          valor={taxaDevolucao}
          cor={faixa(taxaDevolucao, 90, 70)}
          detalhe={
            kpis.emprestimosAtrasados > 0
              ? `${inteiro(kpis.emprestimosAtrasados)} empréstimo(s) em atraso`
              : "Nenhum empréstimo em atraso"
          }
        />
      </Card.Content>
    </Card>
  );
}

export function PainelAlertas({ dados }: { dados: DashboardData }) {
  const { emprestimosAtrasados, certificacoesVencendo } = dados.alertas;
  const semAlertas =
    emprestimosAtrasados.length === 0 && certificacoesVencendo.length === 0;

  return (
    <Card className="h-full">
      <Card.Header className="pb-2">
        <Card.Title className="text-base">Precisa de atenção</Card.Title>
        <Card.Description className="text-xs">
          Atrasos na biblioteca e certificações a vencer em até 90 dias
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {semAlertas ? (
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
            {emprestimosAtrasados.map((item) => (
              <li
                key={`atraso-${item.id}`}
                className="flex items-start gap-2.5 py-2.5"
              >
                <AlertTriangle
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-danger"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {item.livro}
                  </p>
                  <p className="text-xs text-muted">
                    {item.colaborador} · previsto {dataCurta(item.previsto)}
                  </p>
                </div>
                <Chip size="sm" color="danger" variant="soft">
                  <Chip.Label>
                    {inteiro(item.diasAtraso)} d de atraso
                  </Chip.Label>
                </Chip>
              </li>
            ))}
            {certificacoesVencendo.map((item) => (
              <li
                key={`vence-${item.id}`}
                className="flex items-start gap-2.5 py-2.5"
              >
                <CalendarClock
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-warning"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {item.nome}
                  </p>
                  <p className="text-xs text-muted">
                    {item.colaborador} · vence {dataCurta(item.vencimento)}
                  </p>
                </div>
                <Chip size="sm" color="warning" variant="soft">
                  <Chip.Label>
                    vence em {inteiro(item.diasRestantes ?? 0)} d
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

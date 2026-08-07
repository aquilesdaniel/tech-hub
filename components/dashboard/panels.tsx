"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "./chart-card";
import type {
  LinhaGenero,
  LinhaItem,
  LinhaRankingCertificacao,
  LinhaRankingDevedor,
  LinhaSetor,
  PontoMensal,
} from "./types";
import {
  CHROME,
  SERIE,
  TabelaViz,
  VazioViz,
  conteudoTooltip,
  cursorBarra,
  cursorCruz,
  eixoBase,
  gradeBase,
  inteiro,
  margemHorizontal,
  margemVertical,
  moeda,
  moedaCompacta,
  nomeCurto,
  rotuloDireto,
} from "./viz";

export function PainelFinanceiro({
  serie,
  revalidando,
}: {
  serie: PontoMensal[];
  revalidando?: boolean;
}) {
  const temDados = serie.some((p) => p.lancado > 0 || p.quitado > 0);

  return (
    <ChartCard
      titulo="Fluxo de salgados"
      descricao="Valor lançado e valor quitado por mês, na mesma escala"
      legenda={[
        { nome: "Lançado", cor: SERIE.s1, forma: "linha" },
        { nome: "Quitado", cor: SERIE.s2, forma: "linha" },
      ]}
      altura={280}
      revalidando={revalidando}
      grafico={
        temDados ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={margemVertical}>
              <CartesianGrid {...gradeBase} />
              <XAxis dataKey="label" {...eixoBase} />
              <YAxis
                {...eixoBase}
                width={64}
                tickFormatter={(v: number) => moedaCompacta(v)}
              />
              <Tooltip
                cursor={cursorCruz}
                content={conteudoTooltip((valor) => moeda(valor))}
              />
              <Area
                type="monotone"
                dataKey="lancado"
                name="Lançado"
                stroke={SERIE.s1}
                strokeWidth={2}
                fill={SERIE.s1}
                fillOpacity={0.1}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: SERIE.s1,
                  stroke: CHROME.superficie,
                  strokeWidth: 2,
                }}
                animationDuration={400}
              />
              <Area
                type="monotone"
                dataKey="quitado"
                name="Quitado"
                stroke={SERIE.s2}
                strokeWidth={2}
                fill={SERIE.s2}
                fillOpacity={0.1}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: SERIE.s2,
                  stroke: CHROME.superficie,
                  strokeWidth: 2,
                }}
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <VazioViz />
        )
      }
      tabela={
        <TabelaViz
          legenda="Valor lançado e quitado de salgados por mês"
          linhas={serie}
          chaveLinha={(l) => l.mes}
          colunas={[
            { chave: "mes", titulo: "Mês", render: (l) => l.label },
            {
              chave: "lancado",
              titulo: "Lançado",
              alinhar: "direita",
              render: (l) => moeda(l.lancado),
            },
            {
              chave: "quitado",
              titulo: "Quitado",
              alinhar: "direita",
              render: (l) => moeda(l.quitado),
            },
            {
              chave: "aberto",
              titulo: "Diferença",
              alinhar: "direita",
              render: (l) => moeda(l.lancado - l.quitado),
            },
          ]}
        />
      }
    />
  );
}

export function PainelCertificacoes({
  serie,
  revalidando,
}: {
  serie: PontoMensal[];
  revalidando?: boolean;
}) {
  const temDados = serie.some((p) => p.certificacoes > 0);
  const ultimo = serie.at(-1);

  return (
    <ChartCard
      titulo="Certificações conquistadas"
      descricao="Certificações obtidas por mês"
      altura={280}
      revalidando={revalidando}
      grafico={
        temDados ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={margemVertical}>
              <CartesianGrid {...gradeBase} />
              <XAxis dataKey="label" {...eixoBase} />
              <YAxis {...eixoBase} width={36} allowDecimals={false} />
              <Tooltip
                cursor={cursorCruz}
                content={conteudoTooltip((valor) => inteiro(valor))}
              />
              <Line
                type="monotone"
                dataKey="certificacoes"
                name="Certificações"
                stroke={SERIE.s1}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: SERIE.s1,
                  stroke: CHROME.superficie,
                  strokeWidth: 2,
                }}
                animationDuration={400}
              >
                <LabelList
                  dataKey="certificacoes"
                  position="top"
                  offset={10}
                  {...rotuloDireto}
                  formatter={(
                    valor: number,
                    _entrada: unknown,
                    indice: number,
                  ) =>
                    indice === serie.length - 1 && ultimo ? inteiro(valor) : ""
                  }
                />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <VazioViz />
        )
      }
      tabela={
        <TabelaViz
          legenda="Certificações obtidas por mês"
          linhas={serie}
          chaveLinha={(l) => l.mes}
          colunas={[
            { chave: "mes", titulo: "Mês", render: (l) => l.label },
            {
              chave: "certificacoes",
              titulo: "Certificações",
              alinhar: "direita",
              render: (l) => inteiro(l.certificacoes),
            },
          ]}
        />
      }
    />
  );
}

export function PainelGiroBiblioteca({
  serie,
  revalidando,
}: {
  serie: PontoMensal[];
  revalidando?: boolean;
}) {
  const temDados = serie.some((p) => p.emprestimos > 0 || p.devolucoes > 0);

  return (
    <ChartCard
      titulo="Giro da biblioteca"
      descricao="Empréstimos e devoluções por mês"
      legenda={[
        { nome: "Empréstimos", cor: SERIE.s1 },
        { nome: "Devoluções", cor: SERIE.s2 },
      ]}
      altura={280}
      revalidando={revalidando}
      grafico={
        temDados ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={margemVertical} barGap={2}>
              <CartesianGrid {...gradeBase} />
              <XAxis dataKey="label" {...eixoBase} />
              <YAxis {...eixoBase} width={36} allowDecimals={false} />
              <Tooltip
                cursor={cursorBarra}
                content={conteudoTooltip((valor) => inteiro(valor))}
              />
              <Bar
                dataKey="emprestimos"
                name="Empréstimos"
                fill={SERIE.s1}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                animationDuration={400}
              />
              <Bar
                dataKey="devolucoes"
                name="Devoluções"
                fill={SERIE.s2}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                animationDuration={400}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <VazioViz />
        )
      }
      tabela={
        <TabelaViz
          legenda="Empréstimos e devoluções por mês"
          linhas={serie}
          chaveLinha={(l) => l.mes}
          colunas={[
            { chave: "mes", titulo: "Mês", render: (l) => l.label },
            {
              chave: "emprestimos",
              titulo: "Empréstimos",
              alinhar: "direita",
              render: (l) => inteiro(l.emprestimos),
            },
            {
              chave: "devolucoes",
              titulo: "Devoluções",
              alinhar: "direita",
              render: (l) => inteiro(l.devolucoes),
            },
          ]}
        />
      }
    />
  );
}

export function PainelRankingCertificacoes({
  linhas,
  revalidando,
}: {
  linhas: LinhaRankingCertificacao[];
  revalidando?: boolean;
}) {
  const dados = linhas.map((l) => ({ ...l, rotulo: nomeCurto(l.nome) }));

  return (
    <ChartCard
      titulo="Quem mais certificou"
      descricao="Top 8 colaboradores no período"
      legenda={[
        { nome: "Sênior", cor: SERIE.s1 },
        { nome: "Outras", cor: SERIE.s2 },
      ]}
      altura={Math.max(200, dados.length * 34 + 40)}
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
          <VazioViz />
        )
      }
      tabela={
        <TabelaViz
          legenda="Ranking de certificações por colaborador"
          linhas={linhas}
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
              render: (l) => inteiro(l.senior),
            },
            {
              chave: "outras",
              titulo: "Outras",
              alinhar: "direita",
              render: (l) => inteiro(l.outras),
            },
            {
              chave: "total",
              titulo: "Total",
              alinhar: "direita",
              render: (l) => inteiro(l.total),
            },
          ]}
        />
      }
    />
  );
}

export function PainelDevedores({
  linhas,
  revalidando,
}: {
  linhas: LinhaRankingDevedor[];
  revalidando?: boolean;
}) {
  const dados = linhas.map((l) => ({ ...l, rotulo: nomeCurto(l.nome) }));

  return (
    <ChartCard
      titulo="Maiores saldos em aberto"
      descricao="Valor de salgados ainda não quitado, por colaborador"
      altura={Math.max(200, dados.length * 34 + 40)}
      revalidando={revalidando}
      grafico={
        dados.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} layout="vertical" margin={margemHorizontal}>
              <CartesianGrid {...gradeBase} vertical horizontal={false} />
              <XAxis
                type="number"
                {...eixoBase}
                tickFormatter={(v: number) => moedaCompacta(v)}
              />
              <YAxis
                type="category"
                dataKey="rotulo"
                {...eixoBase}
                width={92}
                interval={0}
              />
              <Tooltip
                cursor={cursorBarra}
                content={conteudoTooltip((valor) => moeda(valor))}
              />
              <Bar
                dataKey="valor"
                name="Em aberto"
                fill={SERIE.s1}
                maxBarSize={24}
                radius={[0, 4, 4, 0]}
                animationDuration={400}
              >
                <LabelList
                  dataKey="valor"
                  position="right"
                  offset={8}
                  {...rotuloDireto}
                  formatter={(valor: number) => moedaCompacta(valor)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <VazioViz mensagem="Nenhum saldo em aberto." />
        )
      }
      tabela={
        <TabelaViz
          legenda="Saldos de salgados em aberto por colaborador"
          linhas={linhas}
          chaveLinha={(l) => String(l.id)}
          colunas={[
            { chave: "nome", titulo: "Colaborador", render: (l) => l.nome },
            {
              chave: "departamento",
              titulo: "Departamento",
              render: (l) => l.departamento,
            },
            {
              chave: "itens",
              titulo: "Itens",
              alinhar: "direita",
              render: (l) => inteiro(l.itens),
            },
            {
              chave: "valor",
              titulo: "Em aberto",
              alinhar: "direita",
              render: (l) => moeda(l.valor),
            },
          ]}
        />
      }
    />
  );
}

export function PainelSetores({
  linhas,
  revalidando,
}: {
  linhas: LinhaSetor[];
  revalidando?: boolean;
}) {
  const dados = linhas.slice(0, 8);

  return (
    <ChartCard
      titulo="Certificações por setor"
      descricao="Total conquistado no período em cada setor"
      altura={Math.max(200, dados.length * 34 + 40)}
      revalidando={revalidando}
      grafico={
        dados.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} layout="vertical" margin={margemHorizontal}>
              <CartesianGrid {...gradeBase} vertical horizontal={false} />
              <XAxis type="number" {...eixoBase} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="setor"
                {...eixoBase}
                width={110}
                interval={0}
              />
              <Tooltip
                cursor={cursorBarra}
                content={conteudoTooltip((valor) => inteiro(valor))}
              />
              <Bar
                dataKey="total"
                name="Certificações"
                fill={SERIE.s1}
                maxBarSize={24}
                radius={[0, 4, 4, 0]}
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
          <VazioViz />
        )
      }
      tabela={
        <TabelaViz
          legenda="Certificações e colaboradores por setor"
          linhas={linhas}
          chaveLinha={(l) => String(l.setorId)}
          colunas={[
            { chave: "setor", titulo: "Setor", render: (l) => l.setor },
            {
              chave: "colaboradores",
              titulo: "Pessoas",
              alinhar: "direita",
              render: (l) => inteiro(l.colaboradores),
            },
            {
              chave: "senior",
              titulo: "Sênior",
              alinhar: "direita",
              render: (l) => inteiro(l.senior),
            },
            {
              chave: "total",
              titulo: "Certificações",
              alinhar: "direita",
              render: (l) => inteiro(l.total),
            },
            {
              chave: "gasto",
              titulo: "Gasto salgados",
              alinhar: "direita",
              render: (l) => moeda(l.gasto),
            },
          ]}
        />
      }
    />
  );
}

export function PainelGeneros({
  linhas,
  revalidando,
}: {
  linhas: LinhaGenero[];
  revalidando?: boolean;
}) {
  const dados = linhas.map((l) => ({
    ...l,
    disponiveis: Math.max(0, l.total - l.emprestados),
  }));

  return (
    <ChartCard
      titulo="Acervo por gênero"
      descricao="Quanto de cada gênero está na estante e quanto está emprestado"
      legenda={[
        { nome: "Disponíveis", cor: SERIE.s1 },
        { nome: "Emprestados", cor: SERIE.s2 },
      ]}
      altura={Math.max(200, dados.length * 34 + 40)}
      revalidando={revalidando}
      grafico={
        dados.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} layout="vertical" margin={margemHorizontal}>
              <CartesianGrid {...gradeBase} vertical horizontal={false} />
              <XAxis type="number" {...eixoBase} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="genero"
                {...eixoBase}
                width={110}
                interval={0}
              />
              <Tooltip
                cursor={cursorBarra}
                content={conteudoTooltip((valor) => inteiro(valor))}
              />
              <Bar
                dataKey="disponiveis"
                name="Disponíveis"
                stackId="acervo"
                fill={SERIE.s1}
                maxBarSize={24}
                stroke={CHROME.superficie}
                strokeWidth={2}
                animationDuration={400}
              />
              <Bar
                dataKey="emprestados"
                name="Emprestados"
                stackId="acervo"
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
          <VazioViz mensagem="Nenhum livro cadastrado no acervo." />
        )
      }
      tabela={
        <TabelaViz
          legenda="Livros disponíveis e emprestados por gênero"
          linhas={dados}
          chaveLinha={(l) => l.genero}
          colunas={[
            { chave: "genero", titulo: "Gênero", render: (l) => l.genero },
            {
              chave: "disponiveis",
              titulo: "Disponíveis",
              alinhar: "direita",
              render: (l) => inteiro(l.disponiveis),
            },
            {
              chave: "emprestados",
              titulo: "Emprestados",
              alinhar: "direita",
              render: (l) => inteiro(l.emprestados),
            },
            {
              chave: "total",
              titulo: "Total",
              alinhar: "direita",
              render: (l) => inteiro(l.total),
            },
          ]}
        />
      }
    />
  );
}

export function PainelItens({
  linhas,
  revalidando,
}: {
  linhas: LinhaItem[];
  revalidando?: boolean;
}) {
  return (
    <ChartCard
      titulo="Itens mais lançados"
      descricao="Salgados por número de lançamentos no período"
      altura={Math.max(200, linhas.length * 34 + 40)}
      revalidando={revalidando}
      grafico={
        linhas.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={linhas} layout="vertical" margin={margemHorizontal}>
              <CartesianGrid {...gradeBase} vertical horizontal={false} />
              <XAxis type="number" {...eixoBase} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="item"
                {...eixoBase}
                width={110}
                interval={0}
              />
              <Tooltip
                cursor={cursorBarra}
                content={conteudoTooltip((valor) => inteiro(valor))}
              />
              <Bar
                dataKey="quantidade"
                name="Lançamentos"
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
          <VazioViz />
        )
      }
      tabela={
        <TabelaViz
          legenda="Itens de salgados mais lançados no período"
          linhas={linhas}
          chaveLinha={(l) => l.item}
          colunas={[
            { chave: "item", titulo: "Item", render: (l) => l.item },
            {
              chave: "quantidade",
              titulo: "Lançamentos",
              alinhar: "direita",
              render: (l) => inteiro(l.quantidade),
            },
            {
              chave: "valor",
              titulo: "Valor total",
              alinhar: "direita",
              render: (l) => moeda(l.valor),
            },
          ]}
        />
      }
    />
  );
}

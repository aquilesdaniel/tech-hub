"use client";

import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { Badge, Button, Card, ListBox, Select, toast } from "@heroui/react";
import {
  ArrowLeft,
  Award,
  Crown,
  Medal,
  Star,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ColaboradorStats {
  id: number;
  nome: string;
  email: string;
  departamento: string;
  total_certificacoes: number;
  certificacoes_senior: number;
  outras_certificacoes: number;
  ultima_certificacao: string;
  tipos_certificacao: { [key: string]: number };
}

interface StatisticasGerais {
  total_colaboradores: number;
  total_certificacoes: number;
  media_certificacoes_por_colaborador: number;
  colaborador_mais_certificacoes: string;
  tipo_certificacao_mais_popular: string;
  crescimento_mensal: { mes: string; certificacoes: number }[];
}

export default function GamificacaoPage() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [colaboradoresStats, setColaboradoresStats] = useState<
    ColaboradorStats[]
  >([]);
  const [estatisticasGerais, setEstatisticasGerais] =
    useState<StatisticasGerais | null>(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("total_desc");

  useEffect(() => {
    if (user?.tipo === "admin") {
      fetchDados();
    }
  }, [user]);

  const fetchDados = async () => {
    try {
      const [statsRes, geraisRes] = await Promise.all([
        fetch("/api/gamificacao/colaboradores"),
        fetch("/api/gamificacao/estatisticas"),
      ]);

      if (statsRes.ok && geraisRes.ok) {
        const statsData = await statsRes.json();
        const geraisData = await geraisRes.json();

        setColaboradoresStats(statsData);
        setEstatisticasGerais(geraisData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.danger("Erro", {
        description: "Não foi possível carregar os dados de gamificação.",
      });
    } finally {
      setLoading(false);
    }
  };

  const colaboradoresFiltrados = colaboradoresStats
    .filter((colaborador) => {
      if (filtroTipo === "senior") return colaborador.certificacoes_senior > 0;
      if (filtroTipo === "outras") return colaborador.outras_certificacoes > 0;
      return true;
    })
    .sort((a, b) => {
      switch (ordenacao) {
        case "total_desc":
          return b.total_certificacoes - a.total_certificacoes;
        case "senior_desc":
          return b.certificacoes_senior - a.certificacoes_senior;
        case "outras_desc":
          return b.outras_certificacoes - a.outras_certificacoes;
        case "nome":
          return a.nome.localeCompare(b.nome);
        default:
          return 0;
      }
    });

  const dadosGraficoBarras = colaboradoresFiltrados
    .slice(0, 10)
    .map((colaborador) => ({
      nome: colaborador.nome.split(" ")[0],
      senior: colaborador.certificacoes_senior,
      outras: colaborador.outras_certificacoes,
      total: colaborador.total_certificacoes,
    }));

  const tiposCertificacao = colaboradoresStats.reduce(
    (acc, colaborador) => {
      Object.entries(colaborador.tipos_certificacao).forEach(
        ([tipo, quantidade]) => {
          acc[tipo] = (acc[tipo] || 0) + quantidade;
        },
      );
      return acc;
    },
    {} as { [key: string]: number },
  );

  const dadosGraficoPizza = Object.entries(tiposCertificacao).map(
    ([tipo, quantidade]) => ({
      name: tipo,
      value: quantidade,
    }),
  );

  const cores = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#0088fe",
    "#00c49f",
    "#ffbb28",
    "#ff8042",
    "#8dd1e1",
    "#d084d0",
  ];

  const getRankIcon = (posicao: number) => {
    switch (posicao) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <Star className="w-6 h-6 text-blue-500" />;
    }
  };

  const getRankBadge = (posicao: number) => {
    if (posicao === 1) return "Campeão";
    if (posicao <= 3) return "Pódio";
    if (posicao <= 5) return "Top 5";
    if (posicao <= 10) return "Top 10";
    return "Participante";
  };

  const getRankColor = (posicao: number) => {
    if (posicao === 1) return "bg-yellow-100 text-yellow-800";
    if (posicao <= 3) return "bg-gray-100 text-gray-800";
    if (posicao <= 5) return "bg-blue-100 text-blue-800";
    if (posicao <= 10) return "bg-green-100 text-green-800";
    return "bg-slate-100 text-slate-800";
  };

  if (user?.tipo !== "admin") {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <Card.Content className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
              <p className="text-gray-600 mb-4">
                Este módulo está disponível apenas para administradores.
              </p>
              <Link href="/">
                <Button>Voltar ao Dashboard</Button>
              </Link>
            </Card.Content>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 mb-8">
            <Link href="/" className="w-fit">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gamificação - Certificações
              </h1>
              <p className="text-gray-600">
                Ranking e estatísticas de certificações dos colaboradores
              </p>
            </div>
          </div>

          {/* Estatísticas Gerais */}
          {estatisticasGerais && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <Card.Content className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Colaboradores
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {estatisticasGerais.total_colaboradores}
                      </p>
                    </div>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Content className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Award className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Total Certificações
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {estatisticasGerais.total_certificacoes}
                      </p>
                    </div>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Content className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Target className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Média por Colaborador
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        {estatisticasGerais.media_certificacoes_por_colaborador.toFixed(
                          1,
                        )}
                      </p>
                    </div>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Content className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Trophy className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Líder Atual
                      </p>
                      <p className="text-lg font-bold text-yellow-600">
                        {estatisticasGerais.colaborador_mais_certificacoes}
                      </p>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </div>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <Card.Header>
                <Card.Title>Top 10 - Certificações por Colaborador</Card.Title>
                <Card.Description>
                  Ranking dos colaboradores com mais certificações
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosGraficoBarras}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="senior" fill="#8884d8" name="Senior" />
                    <Bar dataKey="outras" fill="#82ca9d" name="Outras" />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <Card.Title>Distribuição por Tipo</Card.Title>
                <Card.Description>
                  Proporção de cada tipo de certificação
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dadosGraficoPizza}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dadosGraficoPizza.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={cores[index % cores.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Content>
            </Card>
          </div>

          {/* Filtros e Ranking */}
          <Card>
            <Card.Header>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <Card.Title>Ranking de Certificações</Card.Title>
                  <Card.Description>
                    Classificação completa dos colaboradores
                  </Card.Description>
                </div>
                <div className="flex sm:flex-row flex-col sm:w-fit w-full gap-2">
                  <Select
                    value={filtroTipo}
                    onChange={(value) => setFiltroTipo(value as string)}
                  >
                    <Select.Trigger className="sm:w-48 w-full">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="todos" textValue="Todas">
                          Todas
                        </ListBox.Item>
                        <ListBox.Item id="senior" textValue="Senior">
                          Senior
                        </ListBox.Item>
                        <ListBox.Item id="outras" textValue="Outras">
                          Outras
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <Select
                    value={ordenacao}
                    onChange={(value) => setOrdenacao(value as string)}
                  >
                    <Select.Trigger className="sm:w-48 w-full">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="total_desc" textValue="Total (Maior)">
                          Total (Maior)
                        </ListBox.Item>
                        <ListBox.Item
                          id="senior_desc"
                          textValue="Senior (Maior)"
                        >
                          Senior (Maior)
                        </ListBox.Item>
                        <ListBox.Item
                          id="outras_desc"
                          textValue="Outras (Maior)"
                        >
                          Outras (Maior)
                        </ListBox.Item>
                        <ListBox.Item id="nome" textValue="Nome (A-Z)">
                          Nome (A-Z)
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                {colaboradoresFiltrados.map((colaborador, index) => (
                  <Card
                    key={colaborador.id}
                    className="border-l-4 border-l-blue-500"
                  >
                    <Card.Content className="p-4">
                      <div className="flex sm:flex-row flex-col items-center sm:items-start justify-between gap-2">
                        <div className="flex sm:flex-row flex-col items-center gap-4">
                          <div className="flex items-center gap-2">
                            {getRankIcon(index + 1)}
                            <span className="text-2xl font-bold text-gray-400">
                              #{index + 1}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold">
                                {colaborador.nome}
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600">
                              {colaborador.departamento}
                            </p>
                          </div>
                          <Badge className={getRankColor(index + 1)}>
                            {getRankBadge(index + 1)}
                          </Badge>
                        </div>

                        <div className="flex flex-col text-center sm:text-right items-center sm:items-end">
                          <div className="flex gap-4 mb-2">
                            <div className="text-center">
                              <p className="text-xl font-bold text-blue-600">
                                {colaborador.total_certificacoes}
                              </p>
                              <p className="text-xs text-gray-500">Total</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-purple-600">
                                {colaborador.certificacoes_senior}
                              </p>
                              <p className="text-xs text-gray-500">Senior</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xl font-bold text-green-600">
                                {colaborador.outras_certificacoes}
                              </p>
                              <p className="text-xs text-gray-500">Outras</p>
                            </div>
                          </div>
                          {colaborador.ultima_certificacao && (
                            <p className="text-xs text-gray-500">
                              Última:{" "}
                              {new Date(
                                colaborador.ultima_certificacao,
                              ).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card.Content>
                  </Card>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

"use client";

import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { Button, Card, Spinner } from "@heroui/react";
import {
  AlertCircle,
  Award,
  BookOpen,
  Cookie,
  DollarSign,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDividas: 0,
    dividasUsuario: 0,
    salgadosPagos: 0,
    salgadosPagosUsuario: 0,
    totalGastoSalgados: 0,
    totalGeralGastoSalgados: 0,
    totalLivros: 0,
    livrosDisponiveis: 0,
    emprestimosAtivos: 0,
    emprestimosUsuario: 0,
    totalCertificacoes: 0,
    certificacoesUsuario: 0,
    certificacoesSenior: 0,
    totalColaboradores: 0,
    totalSetores: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const [
        dividasRes,
        livrosRes,
        emprestimosRes,
        certificacoesRes,
        colaboradoresRes,
        setoresRes,
      ] = await Promise.all([
        fetch("/api/salgados/dividas"),
        fetch("/api/biblioteca/livros"),
        fetch("/api/biblioteca/emprestimos"),
        fetch("/api/certificacoes"),
        fetch("/api/colaboradores"),
        fetch("/api/admin/setores"),
      ]);

      const dividasData = await dividasRes.json();
      const livrosData = await livrosRes.json();
      const emprestimosData = await emprestimosRes.json();
      const certificacoesData = await certificacoesRes.json();
      const colaboradoresData = await colaboradoresRes.json();
      const setoresData = setoresRes.ok ? await setoresRes.json() : [];

      const totalDividas = dividasData.filter((d: any) => !d.pago).length;
      const salgadosPagos = dividasData.filter((d: any) => d.pago).length;

      // Agora todos os usuários vêm do Senior, então sempre filtramos normalmente
      const dividasUsuario = dividasData.filter(
        (d: any) => !d.pago && d.colaborador_id === user?.id,
      ).length;

      const salgadosPagosUsuario = dividasData.filter(
        (d: any) => d.pago && d.colaborador_id === user?.id,
      ).length;

      // Total gasto do usuário atual
      const usuarioAtual = colaboradoresData.find(
        (c: any) => c.id === user?.id,
      );
      const totalGastoSalgados =
        Number(usuarioAtual?.total_gasto_salgados) || 0;

      // Total geral gasto por todos os usuários
      const totalGeralGastoSalgados = colaboradoresData.reduce(
        (total: number, colaborador: any) => {
          return total + (Number(colaborador.total_gasto_salgados) || 0);
        },
        0,
      );

      const emprestimosAtivos = emprestimosData.filter(
        (e: any) => e.status === "emprestado",
      ).length;

      // Filtrar empréstimos do usuário normalmente
      const emprestimosUsuario = emprestimosData.filter(
        (e: any) => e.status === "emprestado" && e.colaborador_id === user?.id,
      ).length;

      // Estatísticas de certificações
      const certificacoesUsuario = certificacoesData.filter(
        (c: any) => c.colaborador_id === user?.id,
      ).length;

      const certificacoesSenior = certificacoesData.filter(
        (c: any) => c.tipo === "Certificação Senior",
      ).length;

      setStats({
        totalDividas,
        dividasUsuario,
        salgadosPagos,
        salgadosPagosUsuario,
        totalGastoSalgados,
        totalGeralGastoSalgados,
        totalLivros: livrosData.length,
        livrosDisponiveis: livrosData.filter((l: any) => l.disponivel).length,
        emprestimosAtivos,
        emprestimosUsuario,
        totalCertificacoes: certificacoesData.length,
        certificacoesUsuario,
        certificacoesSenior,
        totalColaboradores: colaboradoresData.length,
        totalSetores: setoresData.length,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <Spinner />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Navbar />

        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4">
              Bem-vindo, {user?.nome}!
            </h1>
            <p className="text-base sm:text-xl max-w-2xl mx-auto px-4">
              {user?.tipo === "admin"
                ? "Gerencie todo o sistema de salgados e biblioteca"
                : "Acesse seus empréstimos e gerencie suas dívidas de salgados"}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
            <Card>
              <Card.Header className="flex flex-col gap-2 text-center pb-4">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Cookie className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                </div>
                <Card.Title className="text-xl sm:text-2xl">
                  Controle de Salgados
                </Card.Title>
                <Card.Description className="text-sm sm:text-base">
                  {user?.tipo === "admin"
                    ? "Gerencie todas as dívidas de salgados e marque como pagos"
                    : "Visualize e quite suas dívidas de salgados"}
                </Card.Description>
              </Card.Header>
              <Card.Content className="text-center">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="bg-danger/75 p-3 rounded-lg">
                      <div className="font-semibold text-white">
                        {user?.tipo === "admin"
                          ? "Total Pendente"
                          : user?.seniorUsername
                            ? "Total Pendente"
                            : "Suas Dívidas"}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-white">
                        {user?.tipo === "admin" || user?.seniorUsername
                          ? stats.totalDividas
                          : stats.dividasUsuario}
                      </div>
                    </div>
                    <div className="bg-success/75 p-3 rounded-lg">
                      <div className="font-semibold text-white">
                        {user?.tipo === "admin" ? "Total Pagos" : "Seus Pagos"}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-white">
                        {user?.tipo === "admin"
                          ? stats.salgadosPagos
                          : stats.salgadosPagosUsuario}
                      </div>
                    </div>
                    {user?.tipo !== "admin" && (
                      <div className="bg-accent/75 p-3 rounded-lg col-span-2">
                        <div className="font-semibold text-white">
                          Total Gasto em Salgados
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white">
                          {(
                            Number(stats.totalGastoSalgados) || 0
                          ).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </div>
                      </div>
                    )}
                    {user?.tipo === "admin" && (
                      <div className="bg-accent/75 p-3 rounded-lg col-span-2">
                        <div className="font-semibold text-white">
                          Total Geral Gasto por Todos
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white">
                          {(
                            Number(stats.totalGeralGastoSalgados) || 0
                          ).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <Link href="/salgados">
                    <div className="mt-4">
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        size="lg"
                      >
                        Acessar Salgados
                      </Button>
                    </div>
                  </Link>
                </div>
              </Card.Content>
            </Card>

            <Card className="flex flex-col h-full">
              <Card.Header className="flex flex-col gap-2 text-center pb-4">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <Card.Title className="text-xl sm:text-2xl">
                  Biblioteca
                </Card.Title>
                <Card.Description className="text-sm sm:text-base">
                  {user?.tipo === "admin"
                    ? "Controle completo de empréstimos e catálogo de livros"
                    : "Empreste livros e acompanhe seus empréstimos"}
                </Card.Description>
              </Card.Header>
              <Card.Content className="text-center">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="bg-accent/75 p-3 rounded-lg">
                      <div className="font-semibold text-white">
                        {user?.tipo === "admin"
                          ? "Total Livros"
                          : "Disponíveis"}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-white">
                        {user?.tipo === "admin"
                          ? stats.totalLivros
                          : stats.livrosDisponiveis}
                      </div>
                    </div>
                    <div className="bg-warning/75 p-3 rounded-lg">
                      <div className="font-semibold text-white">
                        {user?.tipo === "admin"
                          ? "Emprestados"
                          : "Seus Empréstimos"}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-white">
                        {user?.tipo === "admin"
                          ? stats.emprestimosAtivos
                          : stats.emprestimosUsuario}
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Content>

              <Link href="/biblioteca">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  Acessar Biblioteca
                </Button>
              </Link>
            </Card>

            <Card className="flex flex-col h-full">
              <Card.Header className="flex flex-col gap-2 text-center pb-4">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
                <Card.Title className="text-xl sm:text-2xl">
                  Certificações
                </Card.Title>
                <Card.Description className="text-sm sm:text-base">
                  {user?.tipo === "admin"
                    ? "Gerencie certificações de todos os colaboradores"
                    : "Adicione e visualize suas certificações profissionais"}
                </Card.Description>
              </Card.Header>
              <Card.Content className="text-center">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="bg-success/75 p-3 rounded-xl">
                      <div className="font-semibold text-white">
                        {user?.tipo === "admin"
                          ? "Total Certificações"
                          : "Suas Certificações"}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-white">
                        {user?.tipo === "admin"
                          ? stats.totalCertificacoes
                          : stats.certificacoesUsuario}
                      </div>
                    </div>
                    <div className="bg-warning/75 p-3 rounded-lg">
                      <div className="font-semibold text-white">
                        Certificações Sênior
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-white">
                        {stats.certificacoesSenior}
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Content>

              <Link href="/certificacoes">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  Acessar Certificações
                </Button>
              </Link>
            </Card>

            {user?.tipo === "admin" && (
              <Card className="lg:col-span-2 xl:col-span-1">
                <Card.Header className="flex flex-col gap-2 text-center pb-4">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
                  </div>
                  <Card.Title className="text-xl sm:text-2xl">
                    Gamificação
                  </Card.Title>
                  <Card.Description className="text-sm sm:text-base">
                    Rankings e estatísticas de certificações
                  </Card.Description>
                </Card.Header>
                <Card.Content className="text-center">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div className="bg-warning/75 p-3 rounded-lg">
                        <div className="font-semibold text-white">
                          Total Certificados
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white">
                          {stats.totalCertificacoes}
                        </div>
                      </div>
                      <div className="bg-accent/75 p-3 rounded-lg">
                        <div className="font-semibold text-white">Senior</div>
                        <div className="text-xl sm:text-2xl font-bold text-white">
                          {stats.certificacoesSenior}
                        </div>
                      </div>
                    </div>
                    <Link href="/gamificacao">
                      <div className="mt-4">
                        <Button
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                          size="lg"
                        >
                          Ver Rankings
                        </Button>
                      </div>
                    </Link>
                  </div>
                </Card.Content>
              </Card>
            )}

            {user?.tipo === "admin" && (
              <Card className="lg:col-span-2 xl:col-span-1">
                <Card.Header className="flex flex-col gap-2 text-center pb-4">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                  </div>
                  <Card.Title className="text-xl sm:text-2xl">
                    Painel Administrativo
                  </Card.Title>
                  <Card.Description className="text-sm sm:text-base">
                    Gerencie colaboradores e setores da empresa
                  </Card.Description>
                </Card.Header>
                <Card.Content className="text-center">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div className="bg-accent/75 p-3 rounded-lg">
                        <div className="font-semibold text-white">
                          Colaboradores
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white">
                          {stats.totalColaboradores}
                        </div>
                      </div>
                      <div className="bg-accent/75 p-3 rounded-lg">
                        <div className="font-semibold text-white">Setores</div>
                        <div className="text-xl sm:text-2xl font-bold text-white">
                          {stats.totalSetores}
                        </div>
                      </div>
                    </div>
                    <Link href="/admin">
                      <div className="mt-4">
                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                          size="lg"
                        >
                          Acessar Painel
                        </Button>
                      </div>
                    </Link>
                  </div>
                </Card.Content>
              </Card>
            )}
          </div>

          {user?.tipo !== "admin" && (
            <div className="mt-8 sm:mt-12 max-w-4xl mx-auto">
              <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
                <Card.Content className="p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">
                        Informações Importantes
                      </h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>
                          • Você pode emprestar livros disponíveis na biblioteca
                        </li>
                        <li>
                          • Marque suas dívidas de salgados como pagas quando
                          necessário
                        </li>
                        <li>• Acompanhe seus empréstimos ativos e histórico</li>
                      </ul>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </div>
          )}

          <div className="mt-8 sm:mt-12 text-center">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
              <div className="flex flex-col items-center p-4">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 mb-2" />
                <h3 className="font-semibold text-sm sm:text-base">
                  Colaboradores
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 text-center">
                  {user?.tipo === "admin"
                    ? "Gerencie dados dos funcionários"
                    : "Seus dados pessoais"}
                </p>
              </div>
              <div className="flex flex-col items-center p-4">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 mb-2" />
                <h3 className="font-semibold text-sm sm:text-base">
                  Salgados Pagos
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 text-center">
                  Controle de salgados quitados
                </p>
              </div>
              <div className="flex flex-col items-center p-4">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 mb-2" />
                <h3 className="font-semibold text-sm sm:text-base">
                  Relatórios
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 text-center">
                  {user?.tipo === "admin"
                    ? "Acompanhe todas as métricas"
                    : "Seu histórico pessoal"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

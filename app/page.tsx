"use client";

import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
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
      ] = await Promise.all([
        fetch("/api/salgados/dividas"),
        fetch("/api/biblioteca/livros"),
        fetch("/api/biblioteca/emprestimos"),
        fetch("/api/certificacoes"),
        fetch("/api/colaboradores"),
      ]);

      const dividasData = await dividasRes.json();
      const livrosData = await livrosRes.json();
      const emprestimosData = await emprestimosRes.json();
      const certificacoesData = await certificacoesRes.json();
      const colaboradoresData = await colaboradoresRes.json();

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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
              Bem-vindo, {user?.nome}!
            </h1>
            <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              {user?.tipo === "admin"
                ? "Gerencie todo o sistema de salgados e biblioteca"
                : "Acesse seus empréstimos e gerencie suas dívidas de salgados"}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
            <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Cookie className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
                </div>
                <CardTitle className="text-xl sm:text-2xl">
                  Controle de Salgados
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {user?.tipo === "admin"
                    ? "Gerencie todas as dívidas de salgados e marque como pagos"
                    : "Visualize e quite suas dívidas de salgados"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="font-semibold text-red-700">
                        {user?.tipo === "admin"
                          ? "Total Pendente"
                          : user?.seniorUsername
                            ? "Total Pendente"
                            : "Suas Dívidas"}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-red-600">
                        {user?.tipo === "admin" || user?.seniorUsername
                          ? stats.totalDividas
                          : stats.dividasUsuario}
                      </div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="font-semibold text-green-700">
                        {user?.tipo === "admin" ? "Total Pagos" : "Seus Pagos"}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {user?.tipo === "admin"
                          ? stats.salgadosPagos
                          : stats.salgadosPagosUsuario}
                      </div>
                    </div>
                    {user?.tipo !== "admin" && (
                      <div className="bg-blue-50 p-3 rounded-lg col-span-2">
                        <div className="font-semibold text-blue-700">
                          Total Gasto em Salgados
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-blue-600">
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
                      <div className="bg-purple-50 p-3 rounded-lg col-span-2">
                        <div className="font-semibold text-purple-700">
                          Total Geral Gasto por Todos
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-purple-600">
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
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        size="lg"
                      >
                        Acessar Salgados
                      </Button>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md flex flex-col h-full">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl sm:text-2xl">
                  Biblioteca
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {user?.tipo === "admin"
                    ? "Controle completo de empréstimos e catálogo de livros"
                    : "Empreste livros e acompanhe seus empréstimos"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="font-semibold text-blue-700">
                        {user?.tipo === "admin"
                          ? "Total Livros"
                          : "Disponíveis"}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-blue-600">
                        {user?.tipo === "admin"
                          ? stats.totalLivros
                          : stats.livrosDisponiveis}
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="font-semibold text-yellow-700">
                        {user?.tipo === "admin"
                          ? "Emprestados"
                          : "Seus Empréstimos"}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                        {user?.tipo === "admin"
                          ? stats.emprestimosAtivos
                          : stats.emprestimosUsuario}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <div className="mt-auto px-6 pb-6">
                <Link href="/biblioteca">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    Acessar Biblioteca
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md flex flex-col h-full">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Award className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                </div>
                <CardTitle className="text-xl sm:text-2xl">
                  Certificações
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {user?.tipo === "admin"
                    ? "Gerencie certificações de todos os colaboradores"
                    : "Adicione e visualize suas certificações profissionais"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="font-semibold text-green-700">
                        {user?.tipo === "admin"
                          ? "Total Certificações"
                          : "Suas Certificações"}
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-green-600">
                        {user?.tipo === "admin"
                          ? stats.totalCertificacoes
                          : stats.certificacoesUsuario}
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="font-semibold text-yellow-700">
                        Certificações Sênior
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                        {stats.certificacoesSenior}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>

              <div className="mt-auto px-6 pb-6">
                <Link href="/certificacoes">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    Acessar Certificações
                  </Button>
                </Link>
              </div>
            </Card>

            {user?.tipo === "admin" && (
              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md lg:col-span-2 xl:col-span-1">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl">
                    Gamificação
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Rankings e estatísticas de certificações
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <div className="font-semibold text-yellow-700">
                          Total Certificados
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                          {stats.totalCertificacoes}
                        </div>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="font-semibold text-orange-700">
                          Senior
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-orange-600">
                          {stats.certificacoesSenior}
                        </div>
                      </div>
                    </div>
                    <Link href="/gamificacao">
                      <div className="mt-4">
                        <Button
                          className="w-full bg-yellow-600 hover:bg-yellow-700"
                          size="lg"
                        >
                          Ver Rankings
                        </Button>
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {user?.tipo === "admin" && (
              <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md lg:col-span-2 xl:col-span-1">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl">
                    Painel Admin
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Gerencie colaboradores e setores da empresa
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="font-semibold text-purple-700">
                          Colaboradores
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-purple-600">
                          3
                        </div>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <div className="font-semibold text-indigo-700">
                          Setores
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-indigo-600">
                          3
                        </div>
                      </div>
                    </div>
                    <Link href="/admin">
                      <div className="mt-4">
                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          size="lg"
                        >
                          Acessar Painel
                        </Button>
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {user?.tipo !== "admin" && (
            <div className="mt-8 sm:mt-12 max-w-4xl mx-auto">
              <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
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
                </CardContent>
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

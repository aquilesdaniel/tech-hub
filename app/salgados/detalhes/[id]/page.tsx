"use client";

import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Divida {
  id: number;
  colaborador_id: number;
  colaborador_nome: string;
  item: string;
  motivo: string;
  data_inicio: string;
  valor: number;
  pago: boolean;
  created_at: string;
  updated_at: string;
}

interface Pagamento {
  id: number;
  divida_id: number;
  colaborador_id: number;
  status: string;
  qr_code: string;
  expires_at: string;
  charge_id: string;
  gateway_id: string;
  created_at: string;
  updated_at: string;
}

interface Colaborador {
  id: number;
  nome: string;
  email: string;
  departamento: string;
  cargo: string;
  document: string;
}

export default function DetalhesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();

  const [divida, setDivida] = useState<Divida | null>(null);
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [colaboradorPagador, setColaboradorPagador] =
    useState<Colaborador | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // 1. Busca a dívida
        const responseDivida = await fetch(`/api/salgados/dividas/${params.id}`);
        if (!responseDivida.ok) {
          throw new Error("Dívida não encontrada");
        }
        const dividaData = await responseDivida.json();
        setDivida(dividaData);

        // 2. Busca pagamento existente
        const responsePagamento = await fetch(
          `/api/salgados/pagamentos?divida_id=${params.id}`,
        );
        if (responsePagamento.ok) {
          const pagData = await responsePagamento.json();
          setPagamento(pagData);

          // 3. Busca quem pagou, se houver um pagamento com colaborador_id atrelado
          if (pagData && pagData.colaborador_id) {
            const responseColab = await fetch(
              `/api/colaboradores/${pagData.colaborador_id}`,
            );
            if (responseColab.ok) {
              const colabData = await responseColab.json();
              setColaboradorPagador(colabData);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os detalhes desta cobrança.",
          variant: "destructive",
        });
        router.push("/salgados");
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [params.id, router, toast]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!divida) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 mb-8">
            <Link href="/salgados" className="w-fit">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Detalhes da Dívida
              </h1>
              <p className="text-gray-600">
                Visualize todas as informações desta pendência e pagamento.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <CardTitle>Devedor</CardTitle>
                  </div>
                  {divida.pago ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      Pago
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Pendente</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-col flex-grow">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nome</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {divida.colaborador_nome}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Item</p>
                    <p className="text-gray-900">{divida.item}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Motivo</p>
                    <p className="text-gray-900">{divida.motivo}</p>
                  </div>
                </div>

                <div className="mt-auto pt-6 flex justify-between items-end">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Data de Registro
                    </p>
                    <p className="text-gray-900 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-gray-400" />
                      {new Date(divida.data_inicio).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500">Valor</p>
                    <p className="text-xl font-bold text-gray-900">
                      {Number(divida.valor).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <CardTitle>Emissor do Pagamento</CardTitle>
                </div>
                <CardDescription>
                  Quem gerou e pagou esta cobrança
                </CardDescription>
              </CardHeader>
              <CardContent>
                {colaboradorPagador ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {colaboradorPagador.nome}
                      </p>
                      <p className="text-sm text-gray-500">
                        {colaboradorPagador.cargo} •{" "}
                        {colaboradorPagador.departamento}
                      </p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Email
                        </p>
                        <p className="text-sm text-gray-900 break-all">
                          {colaboradorPagador.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Documento Principal
                        </p>
                        <p className="text-sm text-gray-900">
                          {colaboradorPagador.document.replace(
                            /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
                            "***.$2.$3-**",
                          )}
                        </p>
                      </div>
                    </div>

                    {pagamento && (
                      <>
                        <Separator />
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Detalhes Transacionais
                          </p>
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-500">
                              Status Gateway:
                            </span>
                            <span
                              className={`font-semibold flex items-center gap-1 ${
                                pagamento.status === "paid"
                                  ? "text-green-600"
                                  : pagamento.status === "pending"
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {pagamento.status === "paid" && (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Pago
                                </>
                              )}
                              {pagamento.status === "pending" && "Pendente"}
                              {pagamento.status === "canceled" && "Cancelado"}
                              {pagamento.status === "failed" && "Falhou"}
                              {![
                                "paid",
                                "pending",
                                "canceled",
                                "failed",
                              ].includes(pagamento.status) && pagamento.status}
                            </span>
                          </div>
                          {pagamento.charge_id && (
                            <div className="flex justify-between text-sm items-center">
                              <span className="text-gray-500">Charge ID:</span>
                              <span className="text-gray-900 font-mono text-xs">
                                {pagamento.charge_id}
                              </span>
                            </div>
                          )}
                          {pagamento.gateway_id && (
                            <div className="flex justify-between text-sm items-center mt-2">
                              <span className="text-gray-500">Gateway ID:</span>
                              <span className="text-gray-900 font-mono text-xs">
                                {pagamento.gateway_id}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm mt-2">
                            <span className="text-gray-500">Gerado em:</span>
                            <span className="text-gray-900">
                              {new Date(pagamento.created_at).toLocaleString(
                                "pt-BR",
                              )}
                            </span>
                          </div>
                          {pagamento.expires_at &&
                            pagamento.status === "pending" && (
                              <div className="flex justify-between text-sm mt-2">
                                <span className="text-gray-500">
                                  Expira em:
                                </span>
                                <span className="text-gray-900">
                                  {new Date(
                                    pagamento.expires_at,
                                  ).toLocaleString("pt-BR")}
                                </span>
                              </div>
                            )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-2">
                      Pagamento não registrado ou colaborador não encontrado no
                      sistema
                    </p>
                    {divida.pago ? (
                      <p className="text-sm text-gray-400">
                        Esta dívida foi baixa manualmente pelo sistema (sem
                        Pagar.me)
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">
                        Aguardando geração do pagamento.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

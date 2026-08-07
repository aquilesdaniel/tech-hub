"use client";

import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { SpinnerTela } from "@/components/spinner-tela";
import { Button, Card, Chip, Separator, toast } from "@heroui/react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

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
  document_mascarado: string | null;
}

export default function DetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [divida, setDivida] = useState<Divida | null>(null);
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [colaboradorPagador, setColaboradorPagador] =
    useState<Colaborador | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // 1. Busca a dívida
        const responseDivida = await fetch(`/api/salgados/dividas/${id}`);
        if (!responseDivida.ok) {
          throw new Error("Dívida não encontrada");
        }
        const dividaData = await responseDivida.json();
        setDivida(dividaData);

        // 2. Busca pagamento existente
        const responsePagamento = await fetch(
          `/api/salgados/pagamentos?divida_id=${id}`,
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
        toast.danger("Erro", {
          description: "Não foi possível carregar os detalhes desta cobrança.",
        });
        router.push("/salgados");
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [id, router]);

  if (loading) {
    return (
      <ProtectedRoute>
        <SpinnerTela />
      </ProtectedRoute>
    );
  }

  if (!divida) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
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
              <h1 className="text-3xl font-bold">Detalhes da Dívida</h1>
              <p>Visualize todas as informações desta dívida</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="flex flex-col h-full">
              <Card.Header>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <Card.Title>Devedor</Card.Title>
                  </div>
                  {divida.pago ? (
                    <Chip color="success">Pago</Chip>
                  ) : (
                    <Chip color="danger">Pendente</Chip>
                  )}
                </div>
              </Card.Header>

              <Card.Content className="flex flex-col grow">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Nome</p>
                    <p className="text-lg font-semibold">
                      {divida.colaborador_nome}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Item</p>
                    <p>{divida.item}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Motivo</p>
                    <p>{divida.motivo}</p>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="mt-auto flex justify-between items-end">
                  <div>
                    <p className="text-sm font-medium">Data de Registro</p>
                    <p className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      {new Date(divida.data_inicio).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium">Valor</p>
                    <p className="text-xl font-bold">
                      {Number(divida.valor).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                  </div>
                  <Card.Title>Emissor do Pagamento</Card.Title>
                </div>
              </Card.Header>
              <Card.Content>
                {colaboradorPagador ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-lg font-semibold">
                        {colaboradorPagador.nome}
                      </p>
                      <p className="text-sm">
                        {colaboradorPagador.cargo} •{" "}
                        {colaboradorPagador.departamento}
                      </p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm break-all">
                          {colaboradorPagador.email}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Documento Principal
                        </p>
                        <p className="text-sm">
                          {colaboradorPagador.document_mascarado ||
                            "Não informado"}
                        </p>
                      </div>
                    </div>

                    {pagamento && (
                      <>
                        <Separator />
                        <div className="p-4 rounded-lg space-y-2">
                          <p className="text-sm font-medium mb-2">
                            Detalhes Transacionais
                          </p>
                          <div className="flex justify-between text-sm items-center">
                            <span>Status Gateway:</span>
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
                              <span>Charge ID:</span>
                              <span className="font-mono text-xs">
                                {pagamento.charge_id}
                              </span>
                            </div>
                          )}
                          {pagamento.gateway_id && (
                            <div className="flex justify-between text-sm items-center mt-2">
                              <span>Gateway ID:</span>
                              <span className="font-mono text-xs">
                                {pagamento.gateway_id}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm mt-2">
                            <span>Gerado em:</span>
                            <span>
                              {new Date(pagamento.created_at).toLocaleString(
                                "pt-BR",
                              )}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col h-full gap-1 items-center justify-center text-center">
                    <p className="font-bold">Pagamento não registrado!</p>

                    <p className="text-sm">
                      Esta dívida foi baixa manualmente pelo sistema
                    </p>
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

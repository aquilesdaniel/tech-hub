"use client";

import { SERIES } from "@/components/dashboard/viz";
import { HighlightIcon } from "@/components/highlight-icon";
import { PageHeader, PageLayout } from "@/components/page-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { ScreenSpinner } from "@/components/screen-spinner";
import { Card, Chip, Separator, toast } from "@heroui/react";
import { CalendarDays, CheckCircle2, CreditCard, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

interface Debt {
  id: number;
  colaborador_id: number;
  employee_name: string;
  item: string;
  motivo: string;
  data_inicio: string;
  valor: number;
  pago: boolean;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: number;
  divida_id: number;
  colaborador_id: number;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: number;
  nome: string;
  email: string;
  departamento: string;
  cargo: string;
  masked_document: string | null;
}

export default function DebtDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [debt, setDebt] = useState<Debt | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [payer, setPayer] =
    useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const debtResponse = await fetch(`/api/salgados/dividas/${id}`);
        if (!debtResponse.ok) {
          throw new Error("Dívida não encontrada");
        }
        const debtData = await debtResponse.json();
        setDebt(debtData);

        const paymentResponse = await fetch(
          `/api/salgados/pagamentos?divida_id=${id}`,
        );
        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          setPayment(paymentData);

          if (paymentData && paymentData.colaborador_id) {
            const employeeResponse = await fetch(
              `/api/colaboradores/${paymentData.colaborador_id}`,
            );
            if (employeeResponse.ok) {
              const employeeData = await employeeResponse.json();
              setPayer(employeeData);
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

    loadData();
  }, [id, router]);

  if (loading) {
    return (
      <ProtectedRoute>
        <ScreenSpinner />
      </ProtectedRoute>
    );
  }

  if (!debt) {
    return null;
  }

  return (
    <ProtectedRoute>
      <PageLayout>
        <PageHeader
          title="Detalhes da Dívida"
          description="Visualize todas as informações desta dívida"
          backHref="/salgados"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="flex flex-col h-full">
            <Card.Header>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <HighlightIcon icon={User} color={SERIES.s1} />
                  <Card.Title>Devedor</Card.Title>
                </div>
                {debt.pago ? (
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
                    {debt.employee_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Item</p>
                  <p>{debt.item}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Motivo</p>
                  <p>{debt.motivo}</p>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="mt-auto flex justify-between items-end">
                <div>
                  <p className="text-sm font-medium">Data de Registro</p>
                  <p className="flex items-center gap-2">
                    <CalendarDays aria-hidden className="size-4 text-muted" />
                    {new Date(debt.data_inicio).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium">Valor</p>
                  <p className="text-xl font-bold">
                    {Number(debt.valor).toLocaleString("pt-BR", {
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
                <HighlightIcon icon={CreditCard} color={SERIES.s7} />
                <Card.Title>Emissor do Pagamento</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              {payer ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold">
                      {payer.nome}
                    </p>
                    <p className="text-sm">
                      {payer.cargo} •{" "}
                      {payer.departamento}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm break-all">
                        {payer.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Documento Principal</p>
                      <p className="text-sm">
                        {payer.masked_document ||
                          "Não informado"}
                      </p>
                    </div>
                  </div>

                  {payment && (
                    <>
                      <Separator />
                      <div className="p-4 rounded-lg space-y-2 bg-surface-secondary">
                        <p className="text-sm font-medium mb-2">
                          Detalhes Transacionais
                        </p>
                        <div className="flex justify-between text-sm items-center">
                          <span>Status Gateway:</span>
                          <span
                            className={`font-semibold flex items-center gap-1 ${
                              payment.status === "paid"
                                ? "text-success"
                                : payment.status === "pending"
                                  ? "text-warning"
                                  : "text-danger"
                            }`}
                          >
                            {payment.status === "paid" && (
                              <>
                                <CheckCircle2
                                  aria-hidden
                                  className="size-4 shrink-0"
                                />
                                Pago
                              </>
                            )}
                            {payment.status === "pending" && "Pendente"}
                            {payment.status === "canceled" && "Cancelado"}
                            {payment.status === "failed" && "Falhou"}
                            {![
                              "paid",
                              "pending",
                              "canceled",
                              "failed",
                            ].includes(payment.status) && payment.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                          <span>Gerado em:</span>
                          <span>
                            {new Date(payment.created_at).toLocaleString(
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
      </PageLayout>
    </ProtectedRoute>
  );
}

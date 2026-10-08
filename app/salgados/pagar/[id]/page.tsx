"use client";

import { formatCurrency, SERIES } from "@/components/dashboard/viz";
import { HighlightIcon } from "@/components/highlight-icon";
import { PageHeader, PageLayout } from "@/components/page-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { ScreenSpinner } from "@/components/screen-spinner";
import { useAuth } from "@/contexts/auth-context";
import {
  POLLING_INTERVAL_MS,
  GATEWAY_FEE,
  totalWithGatewayFee,
} from "@/lib/snacks";
import { Button, Card, Chip, Input, Separator, toast } from "@heroui/react";
import confetti from "canvas-confetti";
import {
  Check,
  Clock,
  Copy,
  QrCode,
  Receipt,
  RefreshCw,
  TimerOff,
  TriangleAlert,
  UserRound,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";

interface Debt {
  id: number;
  colaborador_id: number;
  employee_name: string;
  item: string;
  motivo: string;
  data_inicio: string;
  valor: number;
  pago: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Employee {
  id: number;
  setor_id: number;
  nome: string;
  email: string;
  tipo: "admin" | "user";
  departamento: string;
  cargo: string;
  data_admissao: Date;
  status: "ativo" | "inativo";
  admin_permanente: boolean;
  admin_temporario_ate: Date;
  total_gasto_salgados: number;
  country_code: string;
  area_code: string;
  number: string;
  has_document: boolean;
  masked_document: string | null;
  created_at: Date;
  updated_at: Date;
}

interface Payment {
  id: number;
  divida_id: number;
  colaborador_id: number;
  status: string | null;
  pix_id: string | null;
  br_code: string | null;
  br_code_base64: string | null;
  expires_at: string | null;
}

const IS_DEVELOPMENT =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_SIMULAR_PAGAMENTO === "true";

function secondsUntil(date: string | null | undefined) {
  if (!date) return null;
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 1000));
}

function useSecondsRemaining(expiresAt: string | null | undefined) {
  const [remaining, setRemaining] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    setRemaining(secondsUntil(expiresAt));
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const seconds = secondsUntil(expiresAt);
      setRemaining(seconds);
      if (seconds === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

function fireConfetti() {
  const fire = (particleRatio: number, options: confetti.Options) => {
    confetti({
      origin: { y: 0.7 },
      spread: 70,
      startVelocity: 45,
      particleCount: Math.floor(200 * particleRatio),
      ...options,
    });
  };

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.35, { spread: 60 });
  fire(0.2, { spread: 120, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
}

export default function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [debt, setDebt] = useState<Debt | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [generatingPix, setGeneratingPix] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const confettiFired = useRef(false);
  const secondsRemaining = useSecondsRemaining(payment?.expires_at);
  const chargeExpired =
    payment?.status === "canceled" || secondsRemaining === 0;

  const [currentEmployee, setCurrentEmployee] =
    useState<Employee | null>(null);

  const hasCompleteData =
    currentEmployee?.has_document &&
    currentEmployee?.country_code &&
    currentEmployee?.area_code &&
    currentEmployee?.number;

  const [documentInput, setDocumentInput] = useState("");
  const [countryInput, setCountryInput] = useState("55");
  const [areaInput, setAreaInput] = useState("");
  const [numberInput, setNumberInput] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const debtResponse = await fetch(`/api/salgados/dividas/${id}`);
        if (!debtResponse.ok) {
          throw new Error("Dívida não encontrada");
        }
        const debtData = await debtResponse.json();
        setDebt(debtData);
        confettiFired.current = Boolean(debtData.pago);

        const paymentResponse = await fetch(
          `/api/salgados/pagamentos?divida_id=${id}`,
        );
        if (paymentResponse.ok) {
          setPayment(await paymentResponse.json());
        }

        let userIdLocal = user?.id;
        if (!userIdLocal) {
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            userIdLocal = parsedUser.id;
          }
        }

        if (userIdLocal) {
          const employeeResponse = await fetch(
            `/api/colaboradores/${userIdLocal}`,
          );
          if (employeeResponse.ok) {
            const employeeData = await employeeResponse.json();
            setCurrentEmployee(employeeData);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.danger("Erro", {
          description: "Não foi possível carregar os dados desta cobrança.",
        });
        router.push("/salgados");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, router, user?.id]);

  const confirmPayment = useCallback(() => {
    setDebt((current) => (current ? { ...current, pago: true } : current));
    setPayment((current) => (current ? { ...current, status: "paid" } : current));

    if (confettiFired.current) return;
    confettiFired.current = true;

    fireConfetti();
    toast("Pagamento confirmado!", {
      description: "O PIX foi compensado e a dívida está quitada.",
    });
  }, []);

  useEffect(() => {
    if (!debt || debt.pago || !payment?.pix_id || chargeExpired) {
      return;
    }

    let active = true;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/salgados/pagamentos/status?divida_id=${id}`,
        );
        if (!response.ok) return;

        const status = await response.json();
        if (!active) return;
        if (status.pago) {
          confirmPayment();
        } else if (status.status === "canceled") {
          setPayment((current) =>
            current ? { ...current, status: "canceled" } : current,
          );
        }
      } catch (error) {
        console.error("Erro ao verificar o status do pagamento:", error);
      }
    };

    const interval = setInterval(checkStatus, POLLING_INTERVAL_MS);
    void checkStatus();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, debt, payment?.pix_id, chargeExpired, confirmPayment]);

  const handleGeneratePix = async () => {
    if (!user) return;

    setGeneratingPix(true);
    try {
      const response = await fetch("/api/salgados/pagamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          divida_id: Number(id),
          colaborador_id: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.danger("Erro", {
          description: data.error || "Não foi possível gerar a cobrança PIX.",
        });
        return;
      }

      setPayment(data);
      toast("PIX gerado!", {
        description: "Escaneie o QR Code ou copie o código para pagar.",
      });
    } catch (error) {
      console.error("Erro ao gerar a cobrança PIX:", error);
      toast.danger("Erro", {
        description: "Não foi possível gerar a cobrança PIX.",
      });
    } finally {
      setGeneratingPix(false);
    }
  };

  const handleCopyCode = async () => {
    if (!payment?.br_code) return;

    try {
      await navigator.clipboard.writeText(payment.br_code);
      toast("Código copiado!", {
        description: "Cole no aplicativo do seu banco para pagar.",
      });
    } catch {
      toast.danger("Erro", {
        description: "Não foi possível copiar o código.",
      });
    }
  };

  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      const response = await fetch("/api/salgados/pagamentos/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ divida_id: Number(id) }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.danger("Erro", {
          description: data.error || "Não foi possível simular o pagamento.",
        });
        return;
      }

      if (data.pago) confirmPayment();
    } catch (error) {
      console.error("Erro ao simular o pagamento:", error);
      toast.danger("Erro", {
        description: "Não foi possível simular o pagamento.",
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveData = async () => {
    const digitsOnly = (str: string) => str.replace(/\D/g, "");

    const cleanCpf = digitsOnly(documentInput);
    const cleanCountryCode = digitsOnly(countryInput);
    const cleanAreaCode = digitsOnly(areaInput);
    const cleanNumber = digitsOnly(numberInput);

    if (!cleanCpf || !cleanCountryCode || !cleanAreaCode || !cleanNumber) {
      toast.danger("Atenção", {
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    if (cleanCpf.length !== 11) {
      toast.danger("CPF Inválido", {
        description: "O CPF deve conter exatamente 11 dígitos.",
      });
      return;
    }

    if (cleanCountryCode.length < 1 || cleanCountryCode.length > 3) {
      toast.danger("DDI Inválido", {
        description: "Verifique o código do país (ex: 55).",
      });
      return;
    }

    if (cleanAreaCode.length !== 2) {
      toast.danger("DDD Inválido", {
        description: "O DDD deve conter exatamente 2 dígitos (ex: 11).",
      });
      return;
    }

    if (cleanNumber.length < 8 || cleanNumber.length > 9) {
      toast.danger("Número Inválido", {
        description: "O número deve conter de 8 a 9 dígitos.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/colaboradores/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: cleanCpf,
          country_code: cleanCountryCode,
          area_code: cleanAreaCode,
          number: cleanNumber,
        }),
      });

      if (response.ok) {
        const updatedEmployee = await response.json();
        setCurrentEmployee(updatedEmployee);
        toast("Parabéns!", {
          description: "Seus dados foram validados e salvos com sucesso.",
        });
      } else {
        throw new Error("Erro na atualização");
      }
    } catch (error) {
      toast.danger("Erro", {
        description: "Não foi possível salvar os dados. Tente novamente.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

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

  const hasCharge = Boolean(payment?.br_code_base64) && !debt.pago;
  const chargeActive = hasCharge && !chargeExpired;
  const showSidePanel = debt.pago || hasCharge;
  const expiresAtLabel = payment?.expires_at
    ? new Date(payment.expires_at).toLocaleString("pt-BR")
    : null;

  return (
    <ProtectedRoute>
      <PageLayout>
        <PageHeader
          title="Confirmar Pagamento"
          description="Verifique os detalhes da dívida antes de prosseguir"
          backHref="/salgados"
        />

        <div className="flex flex-col lg:flex-row gap-4">
          <div
            className={`flex flex-col gap-4 transition-all duration-300 w-full ${showSidePanel ? "lg:w-2/3" : ""}`}
          >
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <HighlightIcon icon={Receipt} color={SERIES.s2} />
                    <Card.Title>Detalhes da Dívida</Card.Title>
                  </div>

                  {debt.pago ? (
                    <Chip variant="primary" color="success">
                      Pago
                    </Chip>
                  ) : (
                    <Chip variant="primary" color="warning">
                      Pendente
                    </Chip>
                  )}
                </div>
              </Card.Header>

              <Card.Content>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted">Devedor</p>
                    <p className="text-lg font-semibold">
                      {debt.employee_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">Motivo</p>
                    <p className="font-medium">{debt.motivo}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">Item</p>
                    <p className="font-medium">{debt.item}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">
                      Data de Entrada
                    </p>
                    <p className="font-medium">
                      {new Date(debt.data_inicio).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <Separator className="my-3" />

                {debt.pago ? (
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Valor Total:</span>
                    <span className="text-lg font-bold tabular-nums">
                      {formatCurrency(Number(debt.valor))}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted">Valor da dívida</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(Number(debt.valor))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted">Taxa do gateway</span>
                      <span className="font-medium tabular-nums">
                        + {formatCurrency(GATEWAY_FEE)}
                      </span>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">
                        Total a pagar:
                      </span>
                      <span className="text-lg font-bold tabular-nums">
                        {formatCurrency(totalWithGatewayFee(debt.valor))}
                      </span>
                    </div>
                  </div>
                )}
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <div className="flex items-center gap-4">
                  <HighlightIcon icon={UserRound} color={SERIES.s1} />
                  <Card.Title>Responsável pela Baixa</Card.Title>
                </div>
              </Card.Header>

              <Card.Content>
                {user ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted">Nome</p>
                      <p className="font-medium wrap-break-word">{user.nome}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted">
                        Departamento
                      </p>
                      <p className="font-medium wrap-break-word">
                        {user.departamento || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted">Cargo</p>
                      <p className="font-medium wrap-break-word">
                        {user.cargo || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted">Email</p>
                      <p className="font-medium wrap-break-word">
                        {user.email}
                      </p>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      {hasCompleteData ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted pb-1">
                              CPF
                            </p>
                            <p className="font-medium">
                              {currentEmployee?.masked_document}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted pb-1">
                              Número de Contato
                            </p>
                            <p className="font-medium">
                              +{currentEmployee?.country_code} (
                              {currentEmployee?.area_code}){" "}
                              {currentEmployee?.number}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center w-full gap-2 text-sm px-3 py-2 rounded-md border border-warning/30 bg-warning/10 font-semibold">
                              <TriangleAlert
                                aria-hidden
                                className="size-4 shrink-0 text-warning"
                              />
                              <span>
                                Complete seus dados pessoais para prosseguir com
                                o pagamento
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted pb-1">
                              CPF (Apenas Números)
                            </p>
                            <Input
                              placeholder="00011122233"
                              value={documentInput}
                              onChange={(e) =>
                                setDocumentInput(e.target.value)
                              }
                              maxLength={11}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted pb-1">
                              Telefone Completo
                            </p>

                            <div className="flex gap-2">
                              <Input
                                placeholder="DDI"
                                className="w-14 px-2"
                                value={countryInput}
                                onChange={(e) =>
                                  setCountryInput(e.target.value)
                                }
                                maxLength={3}
                              />
                              <Input
                                placeholder="DDD"
                                className="w-14 px-2"
                                value={areaInput}
                                onChange={(e) => setAreaInput(e.target.value)}
                                maxLength={2}
                              />
                              <Input
                                placeholder="999990000"
                                className="flex-1"
                                value={numberInput}
                                onChange={(e) => setNumberInput(e.target.value)}
                                maxLength={9}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    Carregando informações do usuário logado...
                  </p>
                )}
              </Card.Content>

              {!debt.pago && currentEmployee !== null && (
                <Card.Footer className="flex flex-col-reverse sm:flex-row w-full gap-4 justify-end">
                  <div className="flex flex-col sm:flex-row w-full sm:w-fit gap-4">
                    {hasCompleteData ? (
                      <Button
                        onPress={handleGeneratePix}
                        isDisabled={generatingPix || chargeActive}
                      >
                        <QrCode />
                        {generatingPix
                          ? "Gerando..."
                          : chargeActive
                            ? "PIX gerado"
                            : hasCharge
                              ? "Gerar novo pagamento"
                              : "Gerar pagamento PIX"}
                      </Button>
                    ) : (
                      <Button
                        onPress={handleSaveData}
                        isDisabled={isProcessing}
                      >
                        Atualizar Dados
                      </Button>
                    )}
                  </div>
                </Card.Footer>
              )}
            </Card>
          </div>

          {hasCharge && payment && chargeExpired && (
            <Card className="w-full lg:w-1/3 border-danger/40">
              <Card.Header>
                <div className="flex items-center gap-4">
                  <HighlightIcon icon={QrCode} color={SERIES.s3} />
                  <div>
                    <Card.Title>Pague com PIX</Card.Title>
                    <Card.Description>Cobrança expirada</Card.Description>
                  </div>
                </div>
              </Card.Header>

              <Card.Content className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-danger/10 text-danger">
                  <TimerOff aria-hidden className="size-8" />
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-lg font-semibold">QR Code expirado</p>
                  <p className="text-sm text-muted">
                    Este PIX não pode mais ser pago. Gere um novo pagamento para
                    continuar.
                  </p>
                </div>

                <Button
                  fullWidth
                  onPress={handleGeneratePix}
                  isDisabled={generatingPix}
                >
                  <RefreshCw />
                  {generatingPix ? "Gerando..." : "Gerar novo pagamento"}
                </Button>
              </Card.Content>
            </Card>
          )}

          {chargeActive && payment && (
            <Card className="w-full lg:w-1/3 border-primary/40">
              <Card.Header>
                <div className="flex items-center gap-4">
                  <HighlightIcon icon={QrCode} color={SERIES.s3} />
                  <div>
                    <Card.Title>Pague com PIX</Card.Title>
                    <Card.Description>
                      Aguardando a confirmação do pagamento
                    </Card.Description>
                  </div>
                </div>
              </Card.Header>

              <Card.Content className="flex flex-col items-center gap-4">
                {secondsRemaining !== null && (
                  <div
                    role="timer"
                    aria-live="off"
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${
                      secondsRemaining <= 60
                        ? "border-danger/40 bg-danger/10 text-danger"
                        : "border-border bg-default"
                    }`}
                  >
                    <Clock aria-hidden className="size-4" />
                    <span>
                      Expira em{" "}
                      <span className="font-mono tabular-nums">
                        {formatTime(secondsRemaining)}
                      </span>
                    </span>
                  </div>
                )}

                {payment.br_code_base64 && (
                  <img
                    src={payment.br_code_base64}
                    alt="QR Code do PIX para pagamento da dívida"
                    className="size-56 rounded-lg bg-white p-2"
                  />
                )}

                <p className="text-center text-sm text-muted">
                  Escaneie o QR Code no aplicativo do seu banco ou use o código
                  copia e cola abaixo.
                </p>

                <p className="w-full break-all rounded-md border border-border bg-default p-2 text-center font-mono text-xs">
                  {payment.br_code}
                </p>

                <div className="flex w-full flex-col gap-2">
                  <Button
                    fullWidth
                    variant="secondary"
                    onPress={handleCopyCode}
                  >
                    <Copy />
                    Copiar código PIX
                  </Button>

                  {IS_DEVELOPMENT && (
                    <Button
                      fullWidth
                      variant="outline"
                      onPress={handleSimulatePayment}
                      isDisabled={simulating}
                    >
                      <Zap />
                      {simulating ? "Simulando..." : "Simular pagamento (dev)"}
                    </Button>
                  )}
                </div>

                {expiresAtLabel && (
                  <p className="text-center text-xs text-muted">
                    Válido até {expiresAtLabel}
                  </p>
                )}
              </Card.Content>
            </Card>
          )}

          {debt.pago && (
            <Card className="w-full min-h-full flex flex-col justify-center items-center lg:w-1/3 border-success/40">
              <Card.Header className="flex flex-col items-center justify-center space-y-4 p-6">
                <div className="flex items-center justify-center size-16 rounded-full bg-success text-success-foreground">
                  <Check aria-hidden className="size-8" />
                </div>

                <Card.Title className="text-2xl text-center">
                  Pago com Sucesso!
                </Card.Title>

                <p className="text-center">
                  Seu pagamento foi confirmado pelo sistema.
                </p>
              </Card.Header>
            </Card>
          )}
        </div>
      </PageLayout>
    </ProtectedRoute>
  );
}

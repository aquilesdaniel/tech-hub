"use client";

import { moeda, SERIE } from "@/components/dashboard/viz";
import { IconeDestaque } from "@/components/icone-destaque";
import { CabecalhoPagina, LayoutPagina } from "@/components/pagina";
import { ProtectedRoute } from "@/components/protected-route";
import { SpinnerTela } from "@/components/spinner-tela";
import { useAuth } from "@/contexts/auth-context";
import { TAXA_GATEWAY, totalComTaxaGateway } from "@/lib/salgados";
import { Button, Card, Chip, Input, Separator, toast } from "@heroui/react";
import { Check, Receipt, TriangleAlert, UserRound } from "lucide-react";
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
  created_at: Date;
  updated_at: Date;
}

interface Colaborador {
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
  possui_documento: boolean;
  document_mascarado: string | null;
  created_at: Date;
  updated_at: Date;
}

export default function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [divida, setDivida] = useState<Divida | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [colaboradorCompleto, setColaboradorCompleto] =
    useState<Colaborador | null>(null);

  const possuiDadosCompletos =
    colaboradorCompleto?.possui_documento &&
    colaboradorCompleto?.country_code &&
    colaboradorCompleto?.area_code &&
    colaboradorCompleto?.number;

  const [documentoInput, setDocumentoInput] = useState("");
  const [countryInput, setCountryInput] = useState("55");
  const [areaInput, setAreaInput] = useState("");
  const [numeroInput, setNumeroInput] = useState("");

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const responseDivida = await fetch(`/api/salgados/dividas/${id}`);
        if (!responseDivida.ok) {
          throw new Error("Dívida não encontrada");
        }
        const dividaData = await responseDivida.json();
        setDivida(dividaData);

        let userIdLocal = user?.id;
        if (!userIdLocal) {
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            userIdLocal = parsedUser.id;
          }
        }

        if (userIdLocal) {
          const responseColab = await fetch(
            `/api/colaboradores/${userIdLocal}`,
          );
          if (responseColab.ok) {
            const colabData = await responseColab.json();
            setColaboradorCompleto(colabData);
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

    carregarDados();
  }, [id, router, user?.id]);

  const handleSalvarDados = async () => {
    const soDigitos = (str: string) => str.replace(/\D/g, "");

    const cpfLimpo = soDigitos(documentoInput);
    const ddiLimpo = soDigitos(countryInput);
    const dddLimpo = soDigitos(areaInput);
    const numeroLimpo = soDigitos(numeroInput);

    if (!cpfLimpo || !ddiLimpo || !dddLimpo || !numeroLimpo) {
      toast.danger("Atenção", {
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    if (cpfLimpo.length !== 11) {
      toast.danger("CPF Inválido", {
        description: "O CPF deve conter exatamente 11 dígitos.",
      });
      return;
    }

    if (ddiLimpo.length < 1 || ddiLimpo.length > 3) {
      toast.danger("DDI Inválido", {
        description: "Verifique o código do país (ex: 55).",
      });
      return;
    }

    if (dddLimpo.length !== 2) {
      toast.danger("DDD Inválido", {
        description: "O DDD deve conter exatamente 2 dígitos (ex: 11).",
      });
      return;
    }

    if (numeroLimpo.length < 8 || numeroLimpo.length > 9) {
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
          document: cpfLimpo,
          country_code: ddiLimpo,
          area_code: dddLimpo,
          number: numeroLimpo,
        }),
      });

      if (response.ok) {
        const colaboradorAtualizado = await response.json();
        setColaboradorCompleto(colaboradorAtualizado);
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
        <SpinnerTela />
      </ProtectedRoute>
    );
  }

  if (!divida) {
    return null;
  }

  return (
    <ProtectedRoute>
      <LayoutPagina>
        <CabecalhoPagina
          titulo="Confirmar Pagamento"
          descricao="Verifique os detalhes da dívida antes de prosseguir"
          voltarHref="/salgados"
        />

        <div className="flex flex-col lg:flex-row gap-4">
          <div
            className={`flex flex-col gap-4 transition-all duration-300 w-full ${divida.pago ? "lg:w-2/3" : ""}`}
          >
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <IconeDestaque icone={Receipt} cor={SERIE.s2} />
                    <Card.Title>Detalhes da Dívida</Card.Title>
                  </div>

                  {divida.pago ? (
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
                      {divida.colaborador_nome}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">Motivo</p>
                    <p className="font-medium">{divida.motivo}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">Item</p>
                    <p className="font-medium">{divida.item}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">
                      Data de Entrada
                    </p>
                    <p className="font-medium">
                      {new Date(divida.data_inicio).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <Separator className="my-3" />

                {divida.pago ? (
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Valor Total:</span>
                    <span className="text-lg font-bold tabular-nums">
                      {moeda(Number(divida.valor))}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted">Valor da dívida</span>
                      <span className="font-medium tabular-nums">
                        {moeda(Number(divida.valor))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted">Taxa do gateway</span>
                      <span className="font-medium tabular-nums">
                        + {moeda(TAXA_GATEWAY)}
                      </span>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">
                        Total a pagar:
                      </span>
                      <span className="text-lg font-bold tabular-nums">
                        {moeda(totalComTaxaGateway(divida.valor))}
                      </span>
                    </div>
                  </div>
                )}
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <div className="flex items-center gap-4">
                  <IconeDestaque icone={UserRound} cor={SERIE.s1} />
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
                      {possuiDadosCompletos ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted pb-1">
                              CPF
                            </p>
                            <p className="font-medium">
                              {colaboradorCompleto?.document_mascarado}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted pb-1">
                              Número de Contato
                            </p>
                            <p className="font-medium">
                              +{colaboradorCompleto?.country_code} (
                              {colaboradorCompleto?.area_code}){" "}
                              {colaboradorCompleto?.number}
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
                              value={documentoInput}
                              onChange={(e) =>
                                setDocumentoInput(e.target.value)
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
                                value={numeroInput}
                                onChange={(e) => setNumeroInput(e.target.value)}
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

              {!divida.pago &&
                colaboradorCompleto !== null &&
                !possuiDadosCompletos && (
                  <Card.Footer className="flex flex-col-reverse sm:flex-row w-full gap-4 justify-end">
                    <div className="flex flex-col sm:flex-row w-full sm:w-fit gap-4">
                      <Button
                        onPress={handleSalvarDados}
                        isDisabled={isProcessing}
                      >
                        Atualizar Dados
                      </Button>
                    </div>
                  </Card.Footer>
                )}
            </Card>
          </div>

          {divida.pago && (
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
      </LayoutPagina>
    </ProtectedRoute>
  );
}

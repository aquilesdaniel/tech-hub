"use client";

import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { Badge, Button, Card, Input, Separator, toast } from "@heroui/react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Check,
  Copy,
  QrCode,
  Receipt,
  TriangleAlert,
  UserRound,
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
  created_at: Date;
  updated_at: Date;
}

interface Colaborador {
  id: number;
  setor_id: number;
  nome: string;
  email: string;
  senha: string;
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
  document: string;
  created_at: Date;
  updated_at: Date;
  recipient_id: string;
}

interface Pagamento {
  id: number;
  divida_id: number;
  colaborador_id: number;
  status: string;
  qr_code: string;
  expires_at: Date;
  charge_id: string;
  gateway_id: string;
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

  const [pagamentoGerado, setPagamentoGerado] = useState<Pagamento | null>(
    null,
  );
  const [tempoRestante, setTempoRestante] = useState<string>("");

  const [colaboradorCompleto, setColaboradorCompleto] =
    useState<Colaborador | null>(null);

  const [colaboradorGerador, setColaboradorGerador] =
    useState<Colaborador | null>(null);

  const possuiDadosCompletos =
    colaboradorCompleto?.document &&
    colaboradorCompleto?.country_code &&
    colaboradorCompleto?.area_code &&
    colaboradorCompleto?.number;

  const [documentoInput, setDocumentoInput] = useState("");
  const [countryInput, setCountryInput] = useState("55");
  const [areaInput, setAreaInput] = useState("");
  const [numeroInput, setNumeroInput] = useState("");

  // Polling para checar status do pagamento a cada 10 segundos
  useEffect(() => {
    // Se não há pagamento gerado, ou se ele já não for "pending" (já pago/cancelado), ou a dívida já estiver paga no BD, não prossegue
    if (
      !pagamentoGerado ||
      pagamentoGerado.status !== "pending" ||
      divida?.pago
    )
      return;

    const checarStatus = async () => {
      try {
        const res = await fetch(`/api/salgados/pagamentos?divida_id=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status) {
            if (data.status !== pagamentoGerado.status) {
              setPagamentoGerado(data);
              // Se o status mudou pra não ser "pending", ele sumirá. Se foi pago, lança os confetes.
              if (data.status === "paid") {
                toast("Atualização de Pagamento!", {
                  description: "O pagamento foi efetuado com sucesso!",
                });
                confetti({
                  particleCount: 200,
                  spread: 120,
                  origin: { y: 0.6, x: 0.2 },
                });
                confetti({
                  particleCount: 200,
                  spread: 120,
                  origin: { y: 0.6, x: 0.8 },
                });

                // Força a atualização do estado da divida
                setDivida((prev) => (prev ? { ...prev, pago: true } : prev));
                router.refresh();
              } else if (data.status === "canceled") {
                router.refresh();
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro no polling de pagamento:", err);
      }
    };

    const interval = setInterval(checarStatus, 10000); // 10s
    return () => clearInterval(interval);
  }, [pagamentoGerado, id, router, divida?.pago]);

  useEffect(() => {
    if (!pagamentoGerado) return;

    // Busca a referência de data: preferencialmente expires_at ou a data de última atualização (que renova o timer)
    // somando as 24h caso não encontre o próprio expira.
    let expiraEm = 0;
    if (pagamentoGerado.expires_at) {
      expiraEm = new Date(pagamentoGerado.expires_at).getTime();
    } else {
      const dataRef = pagamentoGerado.updated_at || pagamentoGerado.created_at;
      if (!dataRef) return;
      expiraEm = new Date(dataRef).getTime() + 24 * 60 * 60 * 1000;
    }

    const atualizarTemporizador = () => {
      const agora = new Date().getTime();
      const diferenca = expiraEm - agora;

      if (diferenca <= 0) {
        setTempoRestante("Expirado");
        return;
      }

      // Calcula as horas considerando tudo que resta, sem pegar o módulo de um dia.
      // Isso conserta bugs de relógio que só olham até 24h e se quebram por fuso de servidor.
      const horas = Math.floor(diferenca / (1000 * 60 * 60));
      const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

      setTempoRestante(
        `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`,
      );
    };

    atualizarTemporizador(); // Chamada inicial
    const intervalo = setInterval(atualizarTemporizador, 1000);

    return () => clearInterval(intervalo);
  }, [pagamentoGerado]);

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

        // 2. Busca pagamento existente (se houver)
        const responsePagamento = await fetch(
          `/api/salgados/pagamentos?divida_id=${id}`,
        );
        if (responsePagamento.ok) {
          const pagExistente = await responsePagamento.json();
          setPagamentoGerado(pagExistente); // null se não tem, objeto se tem

          if (pagExistente && pagExistente.colaborador_id) {
            const responseGerador = await fetch(
              `/api/colaboradores/${pagExistente.colaborador_id}`,
            );
            if (responseGerador.ok) {
              const geradorData = await responseGerador.json();
              setColaboradorGerador(geradorData);
            }
          }
        }

        // 3. Tenta buscar o ID do usuário direto do LocalStorage (garante o funcionamento no F5)
        let userIdLocal = user?.id; // Tenta o contexto primeiro
        if (!userIdLocal) {
          // Se o contexto ainda não tiver carregado (caso comum no F5), puxa do storage
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            userIdLocal = parsedUser.id;
          }
        }

        // 4. Se encontrou um ID de usuário, busca os dados completos no banco (Tabela Colaboradores)
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

  // const handleConfirmarPagamento = async () => {
  //   if (!divida) return;
  //   setIsProcessing(true);

  //   try {
  //     const response = await fetch(`/api/salgados/dividas/${divida.id}`, {
  //       method: "PATCH",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ pago: true }),
  //     });

  //     if (response.ok) {
  //       toast({
  //         title: "Pagamento confirmado!",
  //         description: "O salgado foi marcado como pago com sucesso.",
  //       });
  //       router.push("/salgados");
  //     } else {
  //       throw new Error("Falha na atualização");
  //     }
  //   } catch (error) {
  //     console.error("Erro ao marcar como pago:", error);
  //     toast({
  //       title: "Erro",
  //       description: "Não foi possível confirmar o pagamento.",
  //       variant: "destructive",
  //     });
  //     setIsProcessing(false);
  //   }
  // };

  const handleGerarPagamento = async () => {
    if (!divida || !user) return;
    setIsProcessing(true);

    // =======================================================================
    // PASSO A: SE OS DADOS NÃO ESTIVEREM COMPLETOS, FAZ O PATCH PRIMEIRO!
    // =======================================================================
    if (colaboradorCompleto && !possuiDadosCompletos) {
      const soDigitos = (str: string) => str.replace(/\D/g, "");

      const cpfLimpo = soDigitos(documentoInput);
      const ddiLimpo = soDigitos(countryInput);
      const dddLimpo = soDigitos(areaInput);
      const numeroLimpo = soDigitos(numeroInput);

      if (!cpfLimpo || !ddiLimpo || !dddLimpo || !numeroLimpo) {
        toast.danger("Atenção", {
          description: "Preencha os campos obrigatórios primeiro!",
        });
        setIsProcessing(false);
        return;
      }
      if (cpfLimpo.length !== 11) {
        toast.danger("CPF Inválido", {
          description: "O CPF deve conter 11 dígitos.",
        });
        setIsProcessing(false);
        return;
      }
      if (ddiLimpo.length < 1 || ddiLimpo.length > 3) {
        toast.danger("DDI Inválido", {
          description: "Verifique o código do país.",
        });
        setIsProcessing(false);
        return;
      }
      if (dddLimpo.length !== 2) {
        toast.danger("DDD Inválido", {
          description: "DDD deve conter 2 dígitos.",
        });
        setIsProcessing(false);
        return;
      }
      if (numeroLimpo.length < 8 || numeroLimpo.length > 9) {
        toast.danger("Número Inválido", {
          description: "Deve ter entre 8 a 9 dígitos.",
        });
        setIsProcessing(false);
        return;
      }

      // Validação passou, manda pro Frontend!
      try {
        const responsePatch = await fetch(`/api/colaboradores/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document: cpfLimpo,
            country_code: ddiLimpo,
            area_code: dddLimpo,
            number: numeroLimpo,
          }),
        });

        if (!responsePatch.ok) throw new Error("Erro no Update de Colaborador");

        const colaboradorAtualizado = await responsePatch.json();
        setColaboradorCompleto(colaboradorAtualizado); // Atualiza os dados locais

        // Note: NÃO damos toast de sucesso aqui pra não entupir a tela de alertas chatos pro usuário,
        // ele vai direto gerar a linha de baixo com sucesso sem nem perceber que fez duas ações.
      } catch (error) {
        toast.danger("Erro de Cadastro", {
          description:
            "Não conseguimos salvar seus dados complementares. Tente novamente.",
        });
        setIsProcessing(false);
        return; // Aborta geração do QR Code se salvamento parou na API!
      }
    }

    // =======================================================================
    // PASSO B: CRIA A REQUISIÇÃO DO QR CODE
    // =======================================================================
    try {
      const response = await fetch(`/api/salgados/pagamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          divida_id: divida.id,
          colaborador_id: user.id, // Utilizando o contexto de usuário logado
        }),
      });

      if (response.ok) {
        const novoPagamento = await response.json();
        setPagamentoGerado(novoPagamento);
        setColaboradorGerador(colaboradorCompleto);
      } else {
        throw new Error("Falha na geração");
      }
    } catch (error) {
      console.error("Erro ao gerar pagamento:", error);
      toast.danger("Erro", {
        description: "Não foi possível gerar a chave de pagamento no momento.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopiarCopiar = () => {
    if (pagamentoGerado) {
      navigator.clipboard.writeText(pagamentoGerado.qr_code);
      toast("Copiado!", {
        description: "Chave pix foi copiada para a área de transferência.",
      });
    }
  };

  const handleSalvarDados = async () => {
    // Remove qualquer caractere que não seja número
    const soDigitos = (str: string) => str.replace(/\D/g, "");

    const cpfLimpo = soDigitos(documentoInput);
    const ddiLimpo = soDigitos(countryInput);
    const dddLimpo = soDigitos(areaInput);
    const numeroLimpo = soDigitos(numeroInput);

    // 1. Validação de preenchimento
    if (!cpfLimpo || !ddiLimpo || !dddLimpo || !numeroLimpo) {
      toast.danger("Atenção", {
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    // 2. Validação Especifica de CPF
    if (cpfLimpo.length !== 11) {
      toast.danger("CPF Inválido", {
        description: "O CPF deve conter exatamente 11 dígitos.",
      });
      return;
    }

    // 3. Validação de DDI, DDD e Telefone
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

  const handleCancelarPagamento = async () => {
    // TODO: Implementar lógica de cancelamento do pagamento
    console.log("Cancelar pagamento de id: ", pagamentoGerado?.id);
    toast("Info", {
      description: "Lógica de cancelamento pendente de implementação.",
    });
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
              <h1 className="text-3xl font-bold text-gray-900">
                Confirmar Pagamento
              </h1>
              <p className="text-gray-600">
                Verifique os detalhes da dívida antes de prosseguir
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div
              className={`flex flex-col gap-4 transition-all duration-300 w-full ${pagamentoGerado ? "lg:w-2/3" : ""}`}
            >
              <Card>
                <Card.Header>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full">
                        <Receipt className="w-5 h-5 text-orange-600" />
                      </div>
                      <Card.Title>Detalhes da Dívida</Card.Title>
                    </div>

                    {divida.pago ||
                    (pagamentoGerado &&
                      pagamentoGerado.status !== "pending") ? (
                      <Badge
                        variant="primary"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Pago
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </div>
                </Card.Header>

                <Card.Content>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Devedor (Colaborador)
                      </p>
                      <p className="text-lg font-semibold">
                        {divida.colaborador_nome}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Motivo
                      </p>
                      <p className="font-medium">{divida.motivo}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Item</p>
                      <p className="font-medium">{divida.item}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Data de Entrada
                      </p>
                      <p className="font-medium">
                        {new Date(divida.data_inicio).toLocaleDateString(
                          "pt-BR",
                        )}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-6" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">
                      Valor Total:
                    </span>
                    <span className="text-lg font-bold">
                      R$ {Number(divida.valor).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </Card.Content>
              </Card>

              <Card>
                <Card.Header>
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full ${pagamentoGerado ? "bg-purple-100" : "bg-blue-100"}`}
                    >
                      <UserRound
                        className={`w-5 h-5 ${pagamentoGerado ? "text-purple-600" : "text-blue-600"}`}
                      />
                    </div>
                    <Card.Title>
                      {pagamentoGerado
                        ? "Emissor do Pagamento"
                        : "Responsável pela Baixa"}
                    </Card.Title>
                  </div>
                  <Card.Description>
                    {pagamentoGerado
                      ? "Este foi o usuário que gerou a cobrança PIX atual"
                      : "A operação será registrada no sistema sob o usuário abaixo"}
                  </Card.Description>
                </Card.Header>

                <Card.Content>
                  {pagamentoGerado && colaboradorGerador ? (
                    // MOSTRAMOS O GERADOR DO PAGAMENTO AQUI
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Nome
                        </p>
                        <p className="font-medium wrap-break-word">
                          {colaboradorGerador.nome}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Departamento
                        </p>
                        <p className="font-medium wrap-break-word">
                          {colaboradorGerador.departamento || "Não informado"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Cargo
                        </p>
                        <p className="font-medium wrap-break-word">
                          {colaboradorGerador.cargo || "Não informado"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Email
                        </p>
                        <p className="font-medium wrap-break-word">
                          {colaboradorGerador.email}
                        </p>
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500 pb-1">
                              CPF
                            </p>
                            <p className="font-medium">
                              {colaboradorGerador.document?.replace(
                                /(\d{3})(\d{3})(\d{3})(\d{2})/,
                                "$1.$2.$3-$4",
                              ) || "Não informado"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500 pb-1">
                              Número de Contato
                            </p>
                            <p className="font-medium">
                              {colaboradorGerador.country_code
                                ? `+${colaboradorGerador.country_code} (${colaboradorGerador.area_code}) ${colaboradorGerador.number}`
                                : "Não informado"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : user ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Nome
                        </p>
                        <p className="font-medium wrap-break-word">
                          {user.nome}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Departamento
                        </p>
                        <p className="font-medium wrap-break-word">
                          {user.departamento || "Não informado"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Cargo
                        </p>
                        <p className="font-medium wrap-break-word">
                          {user.cargo || "Não informado"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Email
                        </p>
                        <p className="font-medium wrap-break-word">
                          {user.email}
                        </p>
                      </div>

                      {/* --- Divisor para os dados extras --- */}
                      <div className="col-span-1 md:col-span-2">
                        {possuiDadosCompletos ? (
                          //  Dados estao OK! Mostra Apenas View!
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500 pb-1">
                                CPF
                              </p>
                              <p className="font-medium">
                                {colaboradorCompleto?.document.replace(
                                  /(\d{3})(\d{3})(\d{3})(\d{2})/,
                                  "$1.$2.$3-$4",
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500 pb-1">
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
                          // Faltam preenchimentos! Oculta a View e puxa os Inputs!
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2">
                              <div className="flex items-center w-full gap-1 text-sm px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md font-semibold ">
                                <TriangleAlert className="w-4 h-4" />
                                <span>
                                  Complete seus dados pessoais para gerar o qr
                                  code de pagamento
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500 pb-1">
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
                              <p className="text-sm font-medium text-gray-500 pb-1">
                                Telefone Completo
                              </p>
                              {/* Separa os 3 blocos como solictado */}
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
                                  onChange={(e) =>
                                    setNumeroInput(e.target.value)
                                  }
                                  maxLength={9}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Carregando informações do usuário logado...
                    </p>
                  )}
                </Card.Content>

                {!(
                  divida.pago ||
                  (pagamentoGerado && pagamentoGerado.status !== "pending")
                ) &&
                  ((colaboradorCompleto !== null && !possuiDadosCompletos) ||
                    (possuiDadosCompletos &&
                      (!pagamentoGerado || tempoRestante === "Expirado"))) && (
                    <Card.Footer className="flex flex-col-reverse sm:flex-row w-full gap-4 justify-end">
                      <div className="flex flex-col sm:flex-row w-full sm:w-fit gap-4">
                        {colaboradorCompleto !== null &&
                          !possuiDadosCompletos && (
                            <Button
                              onPress={handleSalvarDados}
                              isDisabled={isProcessing}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Atualizar Dados
                            </Button>
                          )}

                        {possuiDadosCompletos &&
                          (!pagamentoGerado ||
                            tempoRestante === "Expirado") && (
                            <Button
                              onPress={handleGerarPagamento}
                              isDisabled={isProcessing}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              {isProcessing
                                ? "Gerando..."
                                : "Gerar Pagamento PIX"}
                            </Button>
                          )}
                      </div>
                    </Card.Footer>
                  )}
              </Card>
            </div>

            {/* Card de Sucesso */}
            {(divida.pago ||
              (pagamentoGerado && pagamentoGerado.status !== "pending")) && (
              <Card className="w-full min-h-full flex flex-col justify-center items-center lg:w-1/3 bg-green-50 border-green-200">
                <Card.Header className="flex flex-col items-center justify-center space-y-4 p-6">
                  <div className="flex items-center justify-center w-16 h-16 bg-green-500 rounded-full">
                    <Check className="w-8 h-8 text-white" />
                  </div>

                  <Card.Title className="text-black text-2xl text-center">
                    Pago com Sucesso!
                  </Card.Title>

                  <p className="text-gray-600 text-center font-medium">
                    Seu pagamento foi confirmado pelo sistema.
                  </p>
                </Card.Header>
              </Card>
            )}

            {/* Card de pagamento */}
            {pagamentoGerado &&
              pagamentoGerado.status === "pending" &&
              !divida.pago && (
                <Card className="w-full lg:w-1/3 flex flex-col">
                  <Card.Header>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                        <QrCode className="w-5 h-5 text-green-600" />
                      </div>
                      <Card.Title className="text-black break-all">
                        Pague via PIX
                      </Card.Title>
                    </div>
                  </Card.Header>

                  <Card.Content className="flex flex-col flex-1">
                    {/* Logica de expiração */}
                    {tempoRestante === "Expirado" ? (
                      <div className="flex flex-col items-center justify-center space-y-4 flex-1">
                        <p className="text-center text-sm text-gray-600 font-medium">
                          O tempo limite para pagamento deste código se esgotou.
                        </p>

                        <Button
                          onPress={handleGerarPagamento}
                          isDisabled={
                            isProcessing ||
                            (colaboradorCompleto !== null &&
                              !possuiDadosCompletos)
                          }
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-auto"
                        >
                          {isProcessing ? "Gerando..." : "Gerar Novo QR Code"}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col items-center justify-center flex-1">
                          {/* Valor da dívida */}
                          <div className="flex items-center justify-center gap-1 pb-4">
                            <span className="text-sm text-gray-500">
                              Valor:
                            </span>
                            <span className="font-bold">
                              R${" "}
                              {Number(divida.valor)
                                .toFixed(2)
                                .replace(".", ",")}
                            </span>
                          </div>

                          {/* QR Code Imagem */}
                          <div className="flex justify-center items-center">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pagamentoGerado.qr_code)}`}
                              alt="QR Code Pix"
                              className="w-56 h-56 object-contain"
                            />
                          </div>

                          {/* Timer pequeno */}
                          <span className="text-sm text-gray-500 font-medium my-4">
                            Expira em{" "}
                            <span className="text-black font-bold tracking-wider">
                              {tempoRestante}
                            </span>
                          </span>
                        </div>

                        {/* Copia e Cola */}
                        <div className="flex flex-col w-full mt-auto pt-4">
                          <p className="text-sm text-gray-600 font-medium mb-2">
                            Copia e Cola
                          </p>

                          <div className="flex gap-4 items-center">
                            <p className="font-mono text-sm text-gray-700 truncate select-all">
                              {pagamentoGerado.qr_code}
                            </p>
                            <Button
                              className="bg-slate-800 hover:bg-slate-700 text-white"
                              size={"sm"}
                              onPress={handleCopiarCopiar}
                            >
                              <Copy className="w-4 h-4" />
                              Copiar
                            </Button>
                          </div>

                          <Button
                            className="mt-6 font-semibold"
                            size={"lg"}
                            variant={"danger"}
                            onPress={handleCancelarPagamento}
                          >
                            Cancelar pagamento
                          </Button>
                        </div>
                      </>
                    )}
                  </Card.Content>
                </Card>
              )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

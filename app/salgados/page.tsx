"use client";

import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import {
  Button,
  Card,
  Chip,
  Input,
  InputGroup,
  Label,
  ListBox,
  Modal,
  Pagination,
  Select,
  Spinner,
  Tabs,
  TextArea,
  TextField,
  toast,
} from "@heroui/react";
import {
  ArrowLeft,
  Calendar,
  Check,
  DollarSign,
  HandCoins,
  IdCardIcon,
  LucideSearch,
  Plus,
  Search,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// interface Colaborador {
//   id: number;
//   nome: string;
//   email: string;
//   departamento: string;
// }

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

interface Divida {
  id: number;
  colaborador_id: number;
  colaborador_nome: string;
  item: string;
  motivo: string;
  data_inicio: string;
  valor: number;
  pago: boolean;
}

export default function SalgadosPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dividas, setDividas] = useState<Divida[]>([]);
  const [salgadosPagos, setSalgadosPagos] = useState<Divida[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [totalGeralGasto, setTotalGeralGasto] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMotivo, setFilterMotivo] = useState("todos");
  const [currentPagePendentes, setCurrentPagePendentes] = useState(1);
  const [currentPagePagas, setCurrentPagePagas] = useState(1);
  const [totalPagesPendentes, setTotalPagesPendentes] = useState(1);
  const [totalPagesPagas, setTotalPagesPagas] = useState(1);
  const [motivosUnicos, setMotivosUnicos] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCadastrarContaOpen, setIsCadastrarContaOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = useState(false);
  const [dividaParaPagar, setDividaParaPagar] = useState<Divida | null>(null);
  const [isSubmittingConta, setIsSubmittingConta] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [jaTemContaCadastrada, setJaTemContaCadastrada] = useState(false);
  const [saldoInfo, setSaldoInfo] = useState({
    available_amount: 0,
    waiting_funds_amount: 0,
    transferred_amount: 0,
  });
  const [contaBancariaData, setContaBancariaData] = useState({
    nomeColaborador: "",
    emailColaborador: "",
    documentoColaborador: "",
    aniversario: "",
    rendaMensal: "",
    ocupacao: "",
    nomeTitular: "",
    documentoTitular: "",
    banco: "",
    agencia: "",
    agenciaDv: "",
    conta: "",
    contaDv: "",
    tipoConta: "checking",
    observacao: "",
  });
  const [transferData, setTransferData] = useState({
    amount: "",
    description: "",
  });
  const [newDivida, setNewDivida] = useState({
    colaborador_id: "",
    item: "",
    quantidadeCentos: "1",
    valorPorCento: "",
    motivo: "",
    valor: "",
  });
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [
    user,
    currentPagePendentes,
    currentPagePagas,
    itemsPerPage,
    searchTerm,
    filterMotivo,
  ]);

  const fetchData = async () => {
    try {
      // Ajusta parâmetros da URL com base nos estados atuais
      const searchParams = new URLSearchParams();
      if (searchTerm) searchParams.append("search", searchTerm);
      if (filterMotivo && filterMotivo !== "todos")
        searchParams.append("motivo", filterMotivo);
      searchParams.append("limit", itemsPerPage.toString());

      const paramsPendentes = new URLSearchParams(searchParams);
      paramsPendentes.append("pago", "false");
      paramsPendentes.append("page", currentPagePendentes.toString());

      const paramsPagas = new URLSearchParams(searchParams);
      paramsPagas.append("pago", "true");
      paramsPagas.append("page", currentPagePagas.toString());

      const [dividasRes, salgadosPagosRes, colaboradoresRes, motivosRes] =
        await Promise.all([
          fetch(`/api/salgados/dividas?${paramsPendentes.toString()}`),
          fetch(`/api/salgados/dividas?${paramsPagas.toString()}`),
          fetch("/api/colaboradores"),
          fetch("/api/salgados/dividas?motivos_only=true"),
        ]);

      if (dividasRes.ok && salgadosPagosRes.ok && colaboradoresRes.ok) {
        const dividasData = await dividasRes.json();
        const salgadosPagosData = await salgadosPagosRes.json();
        const colaboradoresData = await colaboradoresRes.json();

        if (motivosRes.ok) {
          const motivos = await motivosRes.json();
          setMotivosUnicos(motivos.sort());
        }

        // Dividas - Resposta com paginação { data, totalPages, page, total }
        setDividas(dividasData.data || []);
        setTotalPagesPendentes(dividasData.totalPages || 1);

        // Pagas - Resposta com paginação { data, totalPages, page, total }
        setSalgadosPagos(salgadosPagosData.data || []);
        setTotalPagesPagas(salgadosPagosData.totalPages || 1);

        setColaboradores(colaboradoresData);

        // Calcular total geral gasto por todos os usuários
        const totalGeral = colaboradoresData.reduce(
          (total: number, colaborador: any) => {
            return total + (Number(colaborador.total_gasto_salgados) || 0);
          },
          0,
        );
        setTotalGeralGasto(totalGeral);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.danger("Erro", {
        description: "Não foi possível carregar os dados.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSaldo();
      fetchRecebedor();
    }
  }, [user]);

  const fetchSaldo = async () => {
    if (!user) return;
    try {
      const response = await fetch(
        `/api/salgados/saldo?colaborador_id=${user.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSaldoInfo({
          available_amount: Number(data.available_amount) || 0,
          waiting_funds_amount: Number(data.waiting_funds_amount) || 0,
          transferred_amount: Number(data.transferred_amount) || 0,
        });
      }
    } catch (error) {
      console.error("Erro ao consultar saldo:", error);
    }
  };

  const fetchRecebedor = async () => {
    if (!user) return;
    try {
      const response = await fetch(
        `/api/salgados/recebedores?colaborador_id=${user.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.recipient) {
          setJaTemContaCadastrada(true);
          const info = data.recipient.register_information || {};
          const conta = data.recipient.default_bank_account || {};
          setContaBancariaData({
            nomeColaborador: info.name || "",
            emailColaborador: info.email || "",
            documentoColaborador: info.document || "",
            aniversario: info.birthdate ? info.birthdate.slice(0, 10) : "",
            rendaMensal: info.monthly_income
              ? String(info.monthly_income)
              : "",
            ocupacao: info.professional_occupation || "",
            nomeTitular: conta.holder_name || "",
            documentoTitular: conta.holder_document || "",
            banco: conta.bank || "",
            agencia: conta.branch_number || "",
            agenciaDv: conta.branch_check_digit || "",
            conta: conta.account_number || "",
            contaDv: conta.account_check_digit || "",
            tipoConta: conta.type || "checking",
            observacao: "",
          });
        } else {
          setJaTemContaCadastrada(false);
        }
      }
    } catch (error) {
      console.error("Erro ao consultar recebedor:", error);
    }
  };

  const paginatedDividas = dividas;
  const paginatedSalgadosPagos = salgadosPagos;

  const abrirConfirmacaoPagamento = (divida: Divida) => {
    router.push(`/salgados/pagar/${divida.id}`);
  };

  const marcarComoPago = async (dividaId: number) => {
    try {
      const response = await fetch(`/api/salgados/dividas/${dividaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pago: true }),
      });

      if (response.ok) {
        setIsConfirmPaymentOpen(false);
        setDividaParaPagar(null);
        toast("Pagamento confirmado!", {
          description: "Salgado marcado como pago automaticamente.",
        });
        fetchData(); // Atualizar dados para recalcular totalizador
      }
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
      toast.danger("Erro", {
        description: "Não foi possível marcar como pago.",
      });
    }
  };

  // Função para normalizar texto (remover acentos, converter para minúsculas, remover espaços extras)
  const normalizarTexto = (texto: string): string => {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9]/g, "") // Remove caracteres especiais e espaços
      .trim();
  };

  // Função para calcular o valor total baseado na quantidade de centos
  const calcularValorTotal = (): number => {
    const quantidade = parseInt(newDivida.quantidadeCentos) || 1;
    // Substitui vírgula por ponto para o JavaScript conseguir calcular
    const valorPorCento =
      parseFloat(String(newDivida.valorPorCento).replace(",", ".")) || 0;
    return quantidade * valorPorCento;
  };

  // Atualizar o valor total quando quantidade ou valor por cento mudar
  useEffect(() => {
    if (newDivida.item === "1 cento" || newDivida.item === "2 centos") {
      const valorTotal = calcularValorTotal();
      setNewDivida((prev) => ({
        ...prev,
        valor: valorTotal.toFixed(2),
      }));
    }
  }, [newDivida.quantidadeCentos, newDivida.valorPorCento, newDivida.item]);

  const adicionarDivida = async () => {
    // Vamos guardar o valor numérico que será enviado ao banco
    let valorFinalDoBanco = 0;

    // Validação para centos
    if (newDivida.item === "1 cento" || newDivida.item === "2 centos") {
      const valorPorCentoFloat = parseFloat(
        String(newDivida.valorPorCento).replace(",", "."),
      );
      if (
        !newDivida.colaborador_id ||
        !newDivida.item ||
        !newDivida.motivo ||
        !newDivida.valorPorCento ||
        isNaN(valorPorCentoFloat) ||
        valorPorCentoFloat <= 0
      ) {
        toast.danger("Erro", {
          description: "Preencha todos os campos obrigatórios.",
        });
        return;
      }
      valorFinalDoBanco = parseFloat(String(newDivida.valor).replace(",", "."));
    } else {
      // Validação para salgado avulso
      valorFinalDoBanco = parseFloat(String(newDivida.valor).replace(",", "."));
      if (
        !newDivida.colaborador_id ||
        !newDivida.item ||
        !newDivida.motivo ||
        !newDivida.valor ||
        isNaN(valorFinalDoBanco) ||
        valorFinalDoBanco <= 0
      ) {
        toast.danger("Erro", {
          description: "Preencha todos os campos obrigatórios.",
        });
        return;
      }
    }

    try {
      const response = await fetch("/api/salgados/dividas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaborador_id: parseInt(newDivida.colaborador_id),
          item: newDivida.item,
          motivo: newDivida.motivo,
          valor: valorFinalDoBanco,
        }),
      });

      if (response.ok) {
        fetchData();
        setIsAddDialogOpen(false);
        setNewDivida({
          colaborador_id: "",
          item: "",
          quantidadeCentos: "1",
          valorPorCento: "",
          motivo: "",
          valor: "",
        });

        toast("Dívida adicionada!", {
          description: "Nova dívida de salgado foi registrada.",
        });
      }
    } catch (error) {
      console.error("Erro ao adicionar dívida:", error);
      toast.danger("Erro", {
        description: "Não foi possível adicionar a dívida.",
      });
    }
  };

  // const adicionarDivida = async () => {
  //   // Validação para centos
  //   if (newDivida.item === "1 cento" || newDivida.item === "2 centos") {
  //     if (
  //       !newDivida.colaborador_id ||
  //       !newDivida.item ||
  //       !newDivida.motivo ||
  //       !newDivida.valorPorCento ||
  //       parseFloat(newDivida.valorPorCento) <= 0
  //     ) {
  //       toast({
  //         title: "Erro",
  //         description: "Preencha todos os campos obrigatórios.",
  //         variant: "destructive",
  //       });
  //       return;
  //     }
  //   } else {
  //     // Validação para salgado avulso
  //     if (
  //       !newDivida.colaborador_id ||
  //       !newDivida.item ||
  //       !newDivida.motivo ||
  //       !newDivida.valor ||
  //       parseFloat(newDivida.valor) <= 0
  //     ) {
  //       toast({
  //         title: "Erro",
  //         description: "Preencha todos os campos obrigatórios.",
  //         variant: "destructive",
  //       });
  //       return;
  //     }
  //   }

  //   try {
  //     const response = await fetch("/api/salgados/dividas", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         colaborador_id: parseInt(newDivida.colaborador_id),
  //         item: newDivida.item,
  //         motivo: newDivida.motivo,
  //         valor: parseFloat(newDivida.valor),
  //       }),
  //     });

  //     if (response.ok) {
  //       fetchData();
  //       setIsAddDialogOpen(false);
  //       setNewDivida({
  //         colaborador_id: "",
  //         item: "",
  //         quantidadeCentos: "1",
  //         valorPorCento: "",
  //         motivo: "",
  //         valor: "",
  //       });

  //       toast({
  //         title: "Dívida adicionada!",
  //         description: "Nova dívida de salgado foi registrada.",
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Erro ao adicionar dívida:", error);
  //     toast({
  //       title: "Erro",
  //       description: "Não foi possível adicionar a dívida.",
  //       variant: "destructive",
  //     });
  //   }
  // };

  const handleCadastrarConta = async () => {
    if (!user) return;

    if (
      !contaBancariaData.nomeColaborador ||
      !contaBancariaData.emailColaborador ||
      !contaBancariaData.documentoColaborador ||
      !contaBancariaData.aniversario ||
      !contaBancariaData.ocupacao ||
      !contaBancariaData.nomeTitular ||
      !contaBancariaData.documentoTitular ||
      !contaBancariaData.banco ||
      !contaBancariaData.agencia ||
      !contaBancariaData.conta ||
      !contaBancariaData.contaDv
    ) {
      toast.danger("Erro", {
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    setIsSubmittingConta(true);
    try {
      const response = await fetch("/api/salgados/recebedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaborador_id: user.id,
          ...contaBancariaData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.danger("Erro", {
          description:
            data.error || "Não foi possível cadastrar a conta bancária.",
        });
        return;
      }

      toast("Sucesso", {
        description: jaTemContaCadastrada
          ? "Conta bancária atualizada com sucesso."
          : "Conta bancária cadastrada com sucesso.",
      });
      setIsCadastrarContaOpen(false);
      fetchRecebedor();
      fetchSaldo();
    } catch (error) {
      console.error("Erro ao solicitar cadastro de conta:", error);
      toast.danger("Erro", {
        description: "Não foi possível cadastrar a conta bancária.",
      });
    } finally {
      setIsSubmittingConta(false);
    }
  };

  const handleTransferirDinheiro = async () => {
    if (!user) return;

    const valor = parseFloat(String(transferData.amount).replace(",", "."));

    if (!transferData.amount || isNaN(valor) || valor <= 0) {
      toast.danger("Erro", { description: "Informe um valor de saque válido." });
      return;
    }

    if (valor > saldoInfo.available_amount) {
      toast.danger("Erro", {
        description: "O valor solicitado excede o saldo disponível para saque.",
      });
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const response = await fetch("/api/salgados/transferencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaborador_id: user.id,
          amount: valor,
          description: transferData.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.danger("Erro", {
          description: data.error || "Não foi possível realizar a transferência.",
        });
        return;
      }

      toast("Sucesso", {
        description: "A transferência foi solicitada com sucesso.",
      });
      setIsTransferOpen(false);
      setTransferData({
        amount: "",
        description: "",
      });
      fetchSaldo();
    } catch (error) {
      console.error("Erro ao solicitar transferência:", error);
      toast.danger("Erro", {
        description: "Não foi possível realizar a transferência.",
      });
    } finally {
      setIsSubmittingTransfer(false);
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
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 mb-8">
            <Link href="/" className="w-fit">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Controle de Salgados</h1>
              <p>Gerencie dívidas de salgados dos colaboradores</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Dívidas Pendentes
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {dividas.length}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Salgados Pagos
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {salgadosPagos.length}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Geral Gasto
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {totalGeralGasto.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Wallet className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Valor Total Saque
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {saldoInfo.available_amount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          <Tabs defaultSelectedKey="pendentes">
            <Tabs.ListContainer>
              <Tabs.List className="grid w-full grid-cols-2">
                <Tabs.Tab id="pendentes">
                  Pendentes
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="pagas">
                  Pagas
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

            <Tabs.Panel id="pendentes">
              <Card>
                <Card.Header>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <Card.Title>Dívidas Pendentes</Card.Title>
                      <Card.Description>
                        Colaboradores com dívidas pendentes de salgados
                      </Card.Description>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      {user?.tipo === "admin" && (
                        <Modal
                          isOpen={isCadastrarContaOpen}
                          onOpenChange={setIsCadastrarContaOpen}
                        >
                          <Button variant="secondary">
                            <IdCardIcon className="w-4 h-4" />
                            {jaTemContaCadastrada
                              ? "Editar conta bancária"
                              : "Cadastrar conta bancária"}
                          </Button>
                          <Modal.Backdrop>
                            <Modal.Container>
                              <Modal.Dialog className="max-w-[50vw] max-h-[75vh] overflow-y-auto">
                                <Modal.CloseTrigger />
                                <Modal.Header>
                                  <Modal.Heading>
                                    {jaTemContaCadastrada
                                      ? "Editar conta bancária"
                                      : "Cadastrar conta bancária"}
                                  </Modal.Heading>
                                </Modal.Header>
                                <Modal.Body>
                                  <p className="text-sm text-muted-foreground">
                                    Preencha os dados abaixo para{" "}
                                    {jaTemContaCadastrada
                                      ? "editar sua"
                                      : "cadastrar sua"}{" "}
                                    conta bancária.
                                  </p>
                                  <div className="grid grid-cols-2 gap-4 py-4">
                                    <div className="col-span-2 text-sm font-semibold border-b pb-2">
                                      Dados Pessoais
                                    </div>

                                    <div className="grid gap-2">
                                      <Label htmlFor="colab_nome">
                                        Nome Completo
                                      </Label>
                                      <Input
                                        id="colab_nome"
                                        placeholder="Nome do Colaborador"
                                        value={
                                          contaBancariaData.nomeColaborador
                                        }
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            nomeColaborador: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="colab_email">
                                        E-mail
                                      </Label>
                                      <Input
                                        id="colab_email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={
                                          contaBancariaData.emailColaborador
                                        }
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            emailColaborador: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="colab_doc">
                                        Documento (CPF)
                                      </Label>
                                      <Input
                                        id="colab_doc"
                                        placeholder="Apenas números"
                                        value={
                                          contaBancariaData.documentoColaborador
                                        }
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            documentoColaborador:
                                              e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="colab_nasc">
                                        Data de Nascimento
                                      </Label>
                                      <Input
                                        id="colab_nasc"
                                        type="date"
                                        value={contaBancariaData.aniversario}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            aniversario: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="colab_renda">
                                        Renda Mensal (R$ INT)
                                      </Label>
                                      <Input
                                        id="colab_renda"
                                        placeholder="000"
                                        value={contaBancariaData.rendaMensal}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            rendaMensal: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="colab_ocup">
                                        Ocupação
                                      </Label>
                                      <Input
                                        id="colab_ocup"
                                        placeholder="Programador, Designer..."
                                        value={contaBancariaData.ocupacao}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            ocupacao: e.target.value,
                                          })
                                        }
                                      />
                                    </div>

                                    <div className="col-span-2 mt-4 text-sm font-semibold border-b pb-2">
                                      Dados Bancários
                                    </div>

                                    <div className="grid gap-2">
                                      <Label htmlFor="titular_nome">
                                        Nome do Titular
                                      </Label>
                                      <Input
                                        id="titular_nome"
                                        placeholder="Nome igual colab/outro"
                                        value={contaBancariaData.nomeTitular}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            nomeTitular: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="titular_doc">
                                        Doc do Titular
                                      </Label>
                                      <Input
                                        id="titular_doc"
                                        placeholder="Apenas números"
                                        value={
                                          contaBancariaData.documentoTitular
                                        }
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            documentoTitular: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="sacar_banco">
                                        Banco (Código)
                                      </Label>
                                      <Input
                                        id="sacar_banco"
                                        placeholder="Ex: 341 para Itaú..."
                                        value={contaBancariaData.banco}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            banco: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="sacar_agencia">
                                        Agência
                                      </Label>
                                      <Input
                                        id="sacar_agencia"
                                        placeholder="0001"
                                        value={contaBancariaData.agencia}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            agencia: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="sacar_agencia_dv">
                                        DV Agência
                                      </Label>
                                      <Input
                                        id="sacar_agencia_dv"
                                        placeholder="X"
                                        value={contaBancariaData.agenciaDv}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            agenciaDv: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="sacar_conta">Conta</Label>
                                      <Input
                                        id="sacar_conta"
                                        placeholder="12345"
                                        value={contaBancariaData.conta}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            conta: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="sacar_conta_dv">
                                        DV Conta
                                      </Label>
                                      <Input
                                        id="sacar_conta_dv"
                                        placeholder="6"
                                        value={contaBancariaData.contaDv}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            contaDv: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label htmlFor="sacar_tipo_conta">
                                        Tipo da Conta
                                      </Label>
                                      <select
                                        id="sacar_tipo_conta"
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={contaBancariaData.tipoConta}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            tipoConta: e.target.value,
                                          })
                                        }
                                      >
                                        <option value="checking">
                                          Corrente
                                        </option>
                                        <option value="savings">
                                          Poupança
                                        </option>
                                      </select>
                                    </div>
                                    <div className="grid gap-2 col-span-2">
                                      <Label htmlFor="sacar_obs">
                                        Observações
                                      </Label>
                                      <TextArea
                                        id="sacar_obs"
                                        placeholder="Detalhes adicionais do saque..."
                                        value={contaBancariaData.observacao}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            observacao: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                </Modal.Body>
                                <Modal.Footer>
                                  <Button
                                    onPress={handleCadastrarConta}
                                    isDisabled={isSubmittingConta}
                                  >
                                    {isSubmittingConta
                                      ? "Enviando..."
                                      : jaTemContaCadastrada
                                        ? "Salvar Alterações"
                                        : "Cadastrar Conta"}
                                  </Button>
                                </Modal.Footer>
                              </Modal.Dialog>
                            </Modal.Container>
                          </Modal.Backdrop>
                        </Modal>
                      )}

                      <Modal
                        isOpen={isTransferOpen}
                        onOpenChange={setIsTransferOpen}
                      >
                        <Button variant="secondary">
                          <HandCoins className="w-4 h-4" />
                          Sacar dinheiro
                        </Button>
                        <Modal.Backdrop>
                          <Modal.Container>
                            <Modal.Dialog className="sm:max-w-md">
                              <Modal.CloseTrigger />
                              <Modal.Header>
                                <Modal.Heading>Sacar Dinheiro</Modal.Heading>
                              </Modal.Header>
                              <Modal.Body>
                                <p className="text-sm text-muted-foreground">
                                  Solicite uma transferência de valores via
                                  Pagar.me.
                                </p>
                                <p className="text-sm">
                                  Saldo disponível para saque:{" "}
                                  <strong>
                                    {saldoInfo.available_amount.toLocaleString(
                                      "pt-BR",
                                      { style: "currency", currency: "BRL" },
                                    )}
                                  </strong>
                                </p>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="transfer_amount">
                                      Valor a sacar (R$)
                                    </Label>
                                    <Input
                                      id="transfer_amount"
                                      type="number"
                                      max={saldoInfo.available_amount}
                                      placeholder="Ex: 80.50 para R$ 80,50"
                                      value={transferData.amount}
                                      onChange={(e) =>
                                        setTransferData({
                                          ...transferData,
                                          amount: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="transfer_desc">
                                      Observação
                                    </Label>
                                    <TextArea
                                      id="transfer_desc"
                                      placeholder="Ex: Salgado de novembro"
                                      value={transferData.description}
                                      onChange={(e) =>
                                        setTransferData({
                                          ...transferData,
                                          description: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                              </Modal.Body>
                              <Modal.Footer>
                                <Button
                                  onPress={handleTransferirDinheiro}
                                  isDisabled={
                                    isSubmittingTransfer ||
                                    saldoInfo.available_amount <= 0
                                  }
                                >
                                  {isSubmittingTransfer
                                    ? "Enviando..."
                                    : "Confirmar Transferência"}
                                </Button>
                              </Modal.Footer>
                            </Modal.Dialog>
                          </Modal.Container>
                        </Modal.Backdrop>
                      </Modal>

                      <Modal
                        isOpen={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                      >
                        <Button>
                          <Plus className="w-4 h-4" />
                          Adicionar Dívida
                        </Button>
                        <Modal.Backdrop>
                          <Modal.Container>
                            <Modal.Dialog className="sm:max-w-md">
                              <Modal.CloseTrigger />
                              <Modal.Header>
                                <Modal.Heading>
                                  Nova Dívida de Salgado
                                </Modal.Heading>
                              </Modal.Header>
                              <Modal.Body>
                                <p className="text-sm text-muted-foreground">
                                  Adicione uma nova dívida de salgado para um
                                  colaborador.
                                </p>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="colaborador">
                                      Colaborador
                                    </Label>
                                    <Select
                                      value={newDivida.colaborador_id}
                                      onChange={(value) =>
                                        setNewDivida({
                                          ...newDivida,
                                          colaborador_id: value as string,
                                        })
                                      }
                                      placeholder="Selecione um colaborador"
                                    >
                                      <Select.Trigger>
                                        <Select.Value />
                                        <Select.Indicator />
                                      </Select.Trigger>
                                      <Select.Popover>
                                        <ListBox>
                                          {colaboradores.map((colaborador) => (
                                            <ListBox.Item
                                              key={colaborador.id}
                                              id={colaborador.id.toString()}
                                              textValue={colaborador.nome}
                                            >
                                              {colaborador.nome}
                                            </ListBox.Item>
                                          ))}
                                        </ListBox>
                                      </Select.Popover>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="item">
                                      Tipo de Salgado
                                    </Label>
                                    <Select
                                      value={newDivida.item}
                                      onChange={(value) =>
                                        setNewDivida({
                                          ...newDivida,
                                          item: value as string,
                                          valor: "",
                                        })
                                      }
                                      placeholder="Selecione o tipo"
                                    >
                                      <Select.Trigger>
                                        <Select.Value />
                                        <Select.Indicator />
                                      </Select.Trigger>
                                      <Select.Popover>
                                        <ListBox>
                                          <ListBox.Item
                                            id="salgado"
                                            textValue="Salgado Avulso"
                                          >
                                            Salgado Avulso
                                          </ListBox.Item>
                                          <ListBox.Item
                                            id="1 cento"
                                            textValue="1 Cento de Salgados"
                                          >
                                            1 Cento de Salgados
                                          </ListBox.Item>
                                          <ListBox.Item
                                            id="2 centos"
                                            textValue="2 Centos de Salgados"
                                          >
                                            2 Centos de Salgados
                                          </ListBox.Item>
                                        </ListBox>
                                      </Select.Popover>
                                    </Select>
                                  </div>
                                  {(newDivida.item === "1 cento" ||
                                    newDivida.item === "2 centos") && (
                                    <>
                                      <div className="grid gap-2">
                                        <Label htmlFor="valorPorCento">
                                          Valor por Cento (R$)
                                        </Label>
                                        <Input
                                          id="valorPorCento"
                                          type="text"
                                          inputMode="decimal"
                                          value={newDivida.valorPorCento}
                                          onChange={(e) => {
                                            // Mascara para aceitar apenas números e vírgula
                                            const valorAjustado =
                                              e.target.value.replace(
                                                /[^0-9,]/g,
                                                "",
                                              );
                                            setNewDivida({
                                              ...newDivida,
                                              valorPorCento: valorAjustado,
                                            });
                                          }}
                                          placeholder="0,00"
                                        />
                                      </div>
                                      <div className="grid gap-2">
                                        <Label htmlFor="quantidadeCentos">
                                          Quantidade de Centos
                                        </Label>
                                        <Select
                                          value={newDivida.quantidadeCentos}
                                          onChange={(value) =>
                                            setNewDivida({
                                              ...newDivida,
                                              quantidadeCentos: value as string,
                                            })
                                          }
                                        >
                                          <Select.Trigger>
                                            <Select.Value />
                                            <Select.Indicator />
                                          </Select.Trigger>
                                          <Select.Popover>
                                            <ListBox>
                                              <ListBox.Item
                                                id="1"
                                                textValue="1 Cento"
                                              >
                                                1 Cento
                                              </ListBox.Item>
                                              <ListBox.Item
                                                id="2"
                                                textValue="2 Centos"
                                              >
                                                2 Centos
                                              </ListBox.Item>
                                            </ListBox>
                                          </Select.Popover>
                                        </Select>
                                      </div>
                                      <div className="grid gap-2">
                                        <Label>Valor Total</Label>
                                        <div className="p-2 bg-gray-100 rounded border text-lg font-semibold">
                                          {newDivida.valor
                                            ? Number(
                                                newDivida.valor,
                                              ).toLocaleString("pt-BR", {
                                                style: "currency",
                                                currency: "BRL",
                                              })
                                            : "R$ 0,00"}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  {newDivida.item === "salgado" && (
                                    <div className="grid gap-2">
                                      <Label htmlFor="valor">Valor (R$)</Label>
                                      <Input
                                        id="valor"
                                        type="text"
                                        inputMode="decimal"
                                        value={newDivida.valor}
                                        onChange={(e) => {
                                          // Mascara para aceitar apenas números e vírgula
                                          const valorAjustado =
                                            e.target.value.replace(
                                              /[^0-9,]/g,
                                              "",
                                            );
                                          setNewDivida({
                                            ...newDivida,
                                            valor: valorAjustado,
                                          });
                                        }}
                                        placeholder="0,00"
                                      />
                                    </div>
                                  )}
                                  <div className="grid gap-2">
                                    <Label htmlFor="motivo">
                                      Motivo da Dívida
                                    </Label>
                                    <TextArea
                                      id="motivo"
                                      value={newDivida.motivo}
                                      onChange={(e) =>
                                        setNewDivida({
                                          ...newDivida,
                                          motivo: e.target.value,
                                        })
                                      }
                                      placeholder="Ex: Esqueceu de pagar, Pagamento atrasado..."
                                    />
                                  </div>
                                </div>
                              </Modal.Body>
                              <Modal.Footer>
                                <Button onPress={adicionarDivida}>
                                  Adicionar Dívida
                                </Button>
                              </Modal.Footer>
                            </Modal.Dialog>
                          </Modal.Container>
                        </Modal.Backdrop>
                      </Modal>
                    </div>
                  </div>
                </Card.Header>
                <Card.Content>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <TextField className="w-full max-w-full" name="email">
                      <InputGroup>
                        <InputGroup.Prefix>
                          <LucideSearch className="size-4 text-muted" />
                        </InputGroup.Prefix>
                        <InputGroup.Input
                          className="w-full max-w-full"
                          placeholder="Pesquisar por nome ou item..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </InputGroup>
                    </TextField>
                    {/* <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Pesquisar por nome ou item..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div> */}
                    <Select
                      value={filterMotivo}
                      onChange={(value) => setFilterMotivo(value as string)}
                      placeholder="Filtrar por motivo"
                      className="w-full sm:w-48"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="todos" textValue="Todos os motivos">
                            Todos os motivos
                          </ListBox.Item>
                          {motivosUnicos.map((motivo) => (
                            <ListBox.Item
                              key={motivo}
                              id={motivo}
                              textValue={motivo}
                            >
                              {motivo}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <Select
                      value={itemsPerPage.toString()}
                      onChange={(val) => setItemsPerPage(Number(val))}
                      placeholder="Itens por pág"
                      className="w-full sm:w-32"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="5" textValue="5 itens">
                            5 itens
                          </ListBox.Item>
                          <ListBox.Item id="10" textValue="10 itens">
                            10 itens
                          </ListBox.Item>
                          <ListBox.Item id="20" textValue="20 itens">
                            20 itens
                          </ListBox.Item>
                          <ListBox.Item id="50" textValue="50 itens">
                            50 itens
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    {paginatedDividas.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          Nenhuma dívida encontrada
                        </p>
                      </div>
                    ) : (
                      <>
                        {paginatedDividas.map((divida) => (
                          <Card
                            key={divida.id}
                            className="border-l-4 border-l-red-500"
                          >
                            <Card.Content className="p-4">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-semibold">
                                      {divida.colaborador_nome}
                                    </h3>
                                    <Chip>{divida.item}</Chip>
                                  </div>
                                  <p className="text-gray-600 mb-2">
                                    {divida.motivo}
                                  </p>
                                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                    <span>
                                      Data:{" "}
                                      {new Date(
                                        divida.data_inicio,
                                      ).toLocaleDateString("pt-BR")}
                                    </span>
                                    <span className="font-semibold text-red-600">
                                      Valor:{" "}
                                      {Number(divida.valor).toLocaleString(
                                        "pt-BR",
                                        {
                                          style: "currency",
                                          currency: "BRL",
                                        },
                                      )}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  onPress={() =>
                                    abrirConfirmacaoPagamento(divida)
                                  }
                                  className="bg-green-600 hover:bg-green-700 w-full sm:w-fit"
                                >
                                  <Check className="w-4 h-4" />
                                  Pagar dívida
                                </Button>
                              </div>
                            </Card.Content>
                          </Card>
                        ))}
                        {totalPagesPendentes > 1 && (
                          <Pagination className="mt-4">
                            <Pagination.Content>
                              <Pagination.Item>
                                <Pagination.Previous
                                  isDisabled={currentPagePendentes === 1}
                                  onPress={() =>
                                    setCurrentPagePendentes((p) =>
                                      Math.max(1, p - 1),
                                    )
                                  }
                                >
                                  <Pagination.PreviousIcon />
                                  <span>Anterior</span>
                                </Pagination.Previous>
                              </Pagination.Item>
                              <Pagination.Item>
                                <span className="flex items-center justify-center px-4 text-sm font-medium">
                                  Página {currentPagePendentes} de{" "}
                                  {totalPagesPendentes}
                                </span>
                              </Pagination.Item>
                              <Pagination.Item>
                                <Pagination.Next
                                  isDisabled={
                                    currentPagePendentes === totalPagesPendentes
                                  }
                                  onPress={() =>
                                    setCurrentPagePendentes((p) =>
                                      Math.min(totalPagesPendentes, p + 1),
                                    )
                                  }
                                >
                                  <span>Próximo</span>
                                  <Pagination.NextIcon />
                                </Pagination.Next>
                              </Pagination.Item>
                            </Pagination.Content>
                          </Pagination>
                        )}
                      </>
                    )}
                  </div>
                </Card.Content>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel id="pagas">
              <Card>
                <Card.Header>
                  <Card.Title>Dívidas Pagas</Card.Title>
                  <Card.Description>
                    Histórico de salgados que já foram pagos
                  </Card.Description>
                </Card.Header>
                <Card.Content>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Pesquisar por nome ou item..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={filterMotivo}
                      onChange={(value) => setFilterMotivo(value as string)}
                      placeholder="Filtrar por motivo"
                      className="w-full sm:w-48"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="todos" textValue="Todos os motivos">
                            Todos os motivos
                          </ListBox.Item>
                          {motivosUnicos.map((motivo) => (
                            <ListBox.Item
                              key={motivo}
                              id={motivo}
                              textValue={motivo}
                            >
                              {motivo}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <Select
                      value={itemsPerPage.toString()}
                      onChange={(val) => setItemsPerPage(Number(val))}
                      placeholder="Itens por página"
                      className="w-full sm:w-32"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="5" textValue="5 itens">
                            5 itens
                          </ListBox.Item>
                          <ListBox.Item id="10" textValue="10 itens">
                            10 itens
                          </ListBox.Item>
                          <ListBox.Item id="20" textValue="20 itens">
                            20 itens
                          </ListBox.Item>
                          <ListBox.Item id="50" textValue="50 itens">
                            50 itens
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    {paginatedSalgadosPagos.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          Nenhum histórico encontrado
                        </p>
                      </div>
                    ) : (
                      <>
                        {paginatedSalgadosPagos.map((divida) => (
                          <Card
                            key={divida.id}
                            className="border-l-4 border-l-green-500 opacity-80"
                          >
                            <Card.Content className="p-4">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-semibold">
                                      {divida.colaborador_nome}
                                    </h3>
                                    <Chip>{divida.item}</Chip>
                                  </div>
                                  <p className="text-gray-600 mb-2">
                                    {divida.motivo}
                                  </p>
                                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                    <span>
                                      Data:{" "}
                                      {new Date(
                                        divida.data_inicio,
                                      ).toLocaleDateString("pt-BR")}
                                    </span>
                                    <span className="font-semibold text-green-600">
                                      Valor:{" "}
                                      {Number(divida.valor).toLocaleString(
                                        "pt-BR",
                                        {
                                          style: "currency",
                                          currency: "BRL",
                                        },
                                      )}
                                    </span>
                                  </div>
                                </div>
                                <Link href={`/salgados/detalhes/${divida.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-fit"
                                  >
                                    Detalhes
                                  </Button>
                                </Link>
                              </div>
                            </Card.Content>
                          </Card>
                        ))}
                        {totalPagesPagas > 1 && (
                          <Pagination className="mt-4">
                            <Pagination.Content>
                              <Pagination.Item>
                                <Pagination.Previous
                                  isDisabled={currentPagePagas === 1}
                                  onPress={() =>
                                    setCurrentPagePagas((p) =>
                                      Math.max(1, p - 1),
                                    )
                                  }
                                >
                                  <Pagination.PreviousIcon />
                                  <span>Anterior</span>
                                </Pagination.Previous>
                              </Pagination.Item>
                              <Pagination.Item>
                                <span className="flex items-center justify-center px-4 text-sm font-medium">
                                  Página {currentPagePagas} de {totalPagesPagas}
                                </span>
                              </Pagination.Item>
                              <Pagination.Item>
                                <Pagination.Next
                                  isDisabled={
                                    currentPagePagas === totalPagesPagas
                                  }
                                  onPress={() =>
                                    setCurrentPagePagas((p) =>
                                      Math.min(totalPagesPagas, p + 1),
                                    )
                                  }
                                >
                                  <span>Próximo</span>
                                  <Pagination.NextIcon />
                                </Pagination.Next>
                              </Pagination.Item>
                            </Pagination.Content>
                          </Pagination>
                        )}
                      </>
                    )}
                  </div>
                </Card.Content>
              </Card>
            </Tabs.Panel>
          </Tabs>
        </div>
      </div>

      {/* Modal de Confirmação de Pagamento */}
      <Modal
        isOpen={isConfirmPaymentOpen}
        onOpenChange={setIsConfirmPaymentOpen}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Confirmar Pagamento</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted-foreground">
                  Tem certeza que deseja marcar este salgado como pago?
                </p>
                {dividaParaPagar && (
                  <div className="py-4">
                    <div className="p-4 rounded-lg">
                      <h4 className="font-semibold text-lg mb-2">
                        {dividaParaPagar.colaborador_nome}
                      </h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <strong>Item:</strong> {dividaParaPagar.item}
                        </p>
                        <p>
                          <strong>Motivo:</strong> {dividaParaPagar.motivo}
                        </p>
                        <p>
                          <strong>Valor:</strong>{" "}
                          {Number(dividaParaPagar.valor).toLocaleString(
                            "pt-BR",
                            {
                              style: "currency",
                              currency: "BRL",
                            },
                          )}
                        </p>
                        <p>
                          <strong>Data:</strong>{" "}
                          {new Date(
                            dividaParaPagar.data_inicio,
                          ).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer className="flex gap-2">
                <Button
                  variant="outline"
                  onPress={() => {
                    setIsConfirmPaymentOpen(false);
                    setDividaParaPagar(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onPress={() =>
                    dividaParaPagar && marcarComoPago(dividaParaPagar.id)
                  }
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4" />
                  Confirmar Pagamento
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </ProtectedRoute>
  );
}

"use client";

import { StatTile } from "@/components/dashboard/stat-tile";
import type { DashboardData } from "@/components/dashboard/types";
import { inteiro, moeda, moedaCompacta } from "@/components/dashboard/viz";
import { DataTable } from "@/components/data-table";
import { CabecalhoPagina, LayoutPagina } from "@/components/pagina";
import { ProtectedRoute } from "@/components/protected-route";
import { SpinnerTela } from "@/components/spinner-tela";
import { useAuth } from "@/contexts/auth-context";
import { extrairErrosPagarme } from "@/lib/pagarme-errors";
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Tabs,
  TextArea,
  toast,
} from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Calendar,
  Check,
  DollarSign,
  HandCoins,
  IdCardIcon,
  Plus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMotivo, setFilterMotivo] = useState("todos");
  const [currentPagePendentes, setCurrentPagePendentes] = useState(1);
  const [currentPagePagas, setCurrentPagePagas] = useState(1);
  const [totalPagesPendentes, setTotalPagesPendentes] = useState(1);
  const [totalPagesPagas, setTotalPagesPagas] = useState(1);
  const [totalPendentes, setTotalPendentes] = useState(0);
  const [totalPagas, setTotalPagas] = useState(0);
  const [motivosUnicos, setMotivosUnicos] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCadastrarContaOpen, setIsCadastrarContaOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isSubmittingConta, setIsSubmittingConta] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [isBuscandoCep, setIsBuscandoCep] = useState(false);
  const [jaTemContaCadastrada, setJaTemContaCadastrada] = useState(false);
  const [saldoInfo, setSaldoInfo] = useState({
    available_amount: 0,
    waiting_funds_amount: 0,
    transferred_amount: 0,
  });

  const [resumo, setResumo] = useState<DashboardData | null>(null);
  const [carregandoResumo, setCarregandoResumo] = useState(true);
  const [contaBancariaData, setContaBancariaData] = useState({
    nomeColaborador: "",
    emailColaborador: "",
    documentoColaborador: "",
    aniversario: "",
    rendaMensal: "",
    ocupacao: "",
    telefoneDdd: "",
    telefoneNumero: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    pontoReferencia: "",
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

        setDividas(dividasData.data || []);
        setTotalPagesPendentes(dividasData.totalPages || 1);
        setTotalPendentes(dividasData.total || 0);

        setSalgadosPagos(salgadosPagosData.data || []);
        setTotalPagesPagas(salgadosPagosData.totalPages || 1);
        setTotalPagas(salgadosPagosData.total || 0);

        setColaboradores(colaboradoresData);
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
      fetchResumo();
    }
  }, [user]);

  const fetchResumo = async () => {
    try {
      const response = await fetch("/api/dashboard?meses=0");
      if (response.ok) setResumo((await response.json()) as DashboardData);
    } catch (error) {
      console.error("Erro ao carregar o resumo de salgados:", error);
    } finally {
      setCarregandoResumo(false);
    }
  };

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
          const telefone = info.phone_numbers?.[0] || {};
          const endereco = info.address || {};
          setContaBancariaData({
            nomeColaborador: info.name || "",
            emailColaborador: info.email || "",
            documentoColaborador: info.document || "",
            aniversario: info.birthdate ? info.birthdate.slice(0, 10) : "",
            rendaMensal: info.monthly_income ? String(info.monthly_income) : "",
            ocupacao: info.professional_occupation || "",
            telefoneDdd: telefone.ddd || "",
            telefoneNumero: telefone.number || "",
            cep: endereco.zip_code || "",
            rua: endereco.street || "",
            numero: endereco.street_number || "",
            complemento: endereco.complementary || "",
            bairro: endereco.neighborhood || "",
            cidade: endereco.city || "",
            estado: endereco.state || "",
            pontoReferencia: endereco.reference_point || "",
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

  const buscarEnderecoPorCep = async (cepDigitado: string) => {
    const cepLimpo = cepDigitado.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    setIsBuscandoCep(true);
    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`,
      );
      const data = await response.json();

      if (data.erro) {
        toast.danger("CEP não encontrado", {
          description:
            "Verifique o CEP informado e preencha o endereço manualmente.",
        });
        return;
      }

      setContaBancariaData((prev) => ({
        ...prev,
        rua: data.logradouro || prev.rua,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
      }));
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsBuscandoCep(false);
    }
  };

  const abrirConfirmacaoPagamento = (divida: Divida) => {
    router.push(`/salgados/pagar/${divida.id}`);
  };

  const reiniciarPaginas = () => {
    setCurrentPagePendentes(1);
    setCurrentPagePagas(1);
  };

  const colunasBase: ColumnDef<Divida, any>[] = [
    {
      accessorKey: "colaborador_nome",
      header: "Colaborador",
      cell: (info) => (
        <span className="font-medium">{String(info.getValue() ?? "")}</span>
      ),
    },
    {
      accessorKey: "item",
      header: "Item",
      cell: (info) => <Chip>{String(info.getValue() ?? "")}</Chip>,
    },
    {
      accessorKey: "motivo",
      header: "Motivo",
      cell: (info) => String(info.getValue() || "-"),
      meta: { classe: "hidden md:table-cell text-muted" },
    },
    {
      accessorKey: "data_inicio",
      header: "Data",
      cell: (info) =>
        new Date(String(info.getValue())).toLocaleDateString("pt-BR"),
      meta: { classe: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "valor",
      header: "Valor",
      cell: (info) => moeda(Number(info.getValue())),
      meta: { alinhar: "direita", classe: "font-semibold tabular-nums" },
    },
  ];

  const colunasPendentes: ColumnDef<Divida, any>[] = [
    ...colunasBase,
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <Button
          size="sm"
          onPress={() => abrirConfirmacaoPagamento(row.original)}
        >
          <Check className="w-4 h-4" />
          Pagar
        </Button>
      ),
      meta: { alinhar: "direita" },
    },
  ];

  const colunasPagas: ColumnDef<Divida, any>[] = [
    ...colunasBase,
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <Link href={`/salgados/detalhes/${row.original.id}`}>
          <Button variant="outline" size="sm">
            Detalhes
          </Button>
        </Link>
      ),
      meta: { alinhar: "direita" },
    },
  ];

  const filtroMotivo = (
    <Select
      selectedKey={filterMotivo}
      onSelectionChange={(chave) => {
        setFilterMotivo(String(chave));
        reiniciarPaginas();
      }}
      variant="secondary"
      aria-label="Filtrar por motivo"
    >
      <Select.Trigger className="w-full sm:w-48">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="todos" textValue="Todos os motivos">
            Todos os motivos
          </ListBox.Item>
          {motivosUnicos.map((motivo) => (
            <ListBox.Item key={motivo} id={motivo} textValue={motivo}>
              {motivo}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );

  const calcularValorTotal = (): number => {
    const quantidade = parseInt(newDivida.quantidadeCentos) || 1;
    const valorPorCento =
      parseFloat(String(newDivida.valorPorCento).replace(",", ".")) || 0;
    return quantidade * valorPorCento;
  };

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
    let valorFinalDoBanco = 0;

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

  const mostrarErrosResposta = (data: {
    error?: string;
    detalhes?: unknown;
  }) => {
    const mensagens = extrairErrosPagarme(data.detalhes);
    if (mensagens.length > 0) {
      mensagens.forEach((msg) => toast.danger("Erro", { description: msg }));
    } else {
      toast.danger("Erro", {
        description: data.error || "Ocorreu um erro inesperado.",
      });
    }
  };

  const handleCadastrarConta = async () => {
    if (!user) {
      return;
    }

    if (
      !contaBancariaData.nomeColaborador ||
      !contaBancariaData.emailColaborador ||
      !contaBancariaData.documentoColaborador ||
      !contaBancariaData.aniversario ||
      !contaBancariaData.ocupacao ||
      !contaBancariaData.telefoneDdd ||
      !contaBancariaData.telefoneNumero ||
      !contaBancariaData.cep ||
      !contaBancariaData.rua ||
      !contaBancariaData.numero ||
      !contaBancariaData.bairro ||
      !contaBancariaData.cidade ||
      !contaBancariaData.estado ||
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
        mostrarErrosResposta(data);
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
    if (!user) {
      return;
    }

    const valor = parseFloat(String(transferData.amount).replace(",", "."));

    if (!transferData.amount || isNaN(valor) || valor <= 0) {
      toast.danger("Erro", {
        description: "Informe um valor de saque válido.",
      });
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
        mostrarErrosResposta(data);
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

  if (loading || carregandoResumo) {
    return (
      <ProtectedRoute>
        <SpinnerTela />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <LayoutPagina>
        <CabecalhoPagina
          titulo="Controle de Salgados"
          descricao="Gerencie dívidas de salgados dos colaboradores"
          voltarHref="/"
        />

        <section
          aria-label="Indicadores de salgados"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatTile
            rotulo="Em aberto"
            valor={moedaCompacta(resumo?.kpis.valorEmAberto ?? 0)}
            icone={Calendar}
            deltaLegenda={`${inteiro(resumo?.kpis.dividasEmAberto ?? 0)} lançamento(s) aguardando pagamento`}
          />
          <StatTile
            rotulo="Total quitado"
            valor={moedaCompacta(resumo?.kpis.valorQuitado ?? 0)}
            icone={Check}
            deltaLegenda={`${inteiro(resumo?.kpis.dividasQuitadas ?? 0)} lançamento(s) já pagos`}
          />
          <StatTile
            rotulo="Ticket médio"
            valor={moeda(resumo?.kpis.ticketMedio ?? 0)}
            icone={DollarSign}
            deltaLegenda="valor médio por lançamento"
          />

          <StatTile
            rotulo="Disponível para saque"
            valor={moeda(saldoInfo.available_amount)}
            icone={Wallet}
            deltaLegenda={
              saldoInfo.waiting_funds_amount > 0
                ? `${moeda(saldoInfo.waiting_funds_amount)} ainda a liberar`
                : "nada pendente de liberação"
            }
          />
        </section>

        <Tabs defaultSelectedKey="pendentes" className="gap-4">
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

          <Tabs.Panel className="p-0" id="pendentes">
            <Card>
              <Card.Header>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <Card.Title>Dívidas Pendentes</Card.Title>
                    <Card.Description>
                      Colaboradores com dívidas pendentes de salgados
                    </Card.Description>
                  </div>
                  <div className="flex gap-4 items-center flex-wrap">
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
                                      value={contaBancariaData.nomeColaborador}
                                      onChange={(e) =>
                                        setContaBancariaData({
                                          ...contaBancariaData,
                                          nomeColaborador: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="colab_email">E-mail</Label>
                                    <Input
                                      id="colab_email"
                                      type="email"
                                      placeholder="seu@email.com"
                                      value={contaBancariaData.emailColaborador}
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
                                          documentoColaborador: e.target.value,
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
                                    <Label htmlFor="colab_ocup">Ocupação</Label>
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
                                  <div className="grid gap-2">
                                    <Label htmlFor="colab_telefone">
                                      Telefone
                                    </Label>
                                    <div className="flex gap-2">
                                      <Input
                                        id="colab_telefone_ddd"
                                        placeholder="DDD"
                                        className="w-16"
                                        maxLength={2}
                                        value={contaBancariaData.telefoneDdd}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            telefoneDdd: e.target.value,
                                          })
                                        }
                                      />
                                      <Input
                                        id="colab_telefone_numero"
                                        placeholder="999990000"
                                        className="flex-1"
                                        maxLength={9}
                                        value={contaBancariaData.telefoneNumero}
                                        onChange={(e) =>
                                          setContaBancariaData({
                                            ...contaBancariaData,
                                            telefoneNumero: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div className="col-span-2 mt-4 text-sm font-semibold border-b pb-2">
                                    Endereço
                                  </div>

                                  <div className="grid gap-2">
                                    <Label htmlFor="endereco_cep">
                                      CEP {isBuscandoCep && "(buscando...)"}
                                    </Label>
                                    <Input
                                      id="endereco_cep"
                                      placeholder="00000000"
                                      maxLength={9}
                                      value={contaBancariaData.cep}
                                      onChange={(e) => {
                                        const valor = e.target.value;
                                        setContaBancariaData({
                                          ...contaBancariaData,
                                          cep: valor,
                                        });
                                        if (
                                          valor.replace(/\D/g, "").length === 8
                                        ) {
                                          buscarEnderecoPorCep(valor);
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="endereco_rua">Rua</Label>
                                    <Input
                                      id="endereco_rua"
                                      placeholder="Av. General Justo"
                                      value={contaBancariaData.rua}
                                      onChange={(e) =>
                                        setContaBancariaData({
                                          ...contaBancariaData,
                                          rua: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="endereco_numero">
                                      Número
                                    </Label>
                                    <Input
                                      id="endereco_numero"
                                      placeholder="375"
                                      value={contaBancariaData.numero}
                                      onChange={(e) =>
                                        setContaBancariaData({
                                          ...contaBancariaData,
                                          numero: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="endereco_complemento">
                                      Complemento
                                    </Label>
                                    <Input
                                      id="endereco_complemento"
                                      placeholder="Bloco A (opcional)"
                                      value={contaBancariaData.complemento}
                                      onChange={(e) =>
                                        setContaBancariaData({
                                          ...contaBancariaData,
                                          complemento: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="endereco_bairro">
                                      Bairro
                                    </Label>
                                    <Input
                                      id="endereco_bairro"
                                      placeholder="Centro"
                                      value={contaBancariaData.bairro}
                                      onChange={(e) =>
                                        setContaBancariaData({
                                          ...contaBancariaData,
                                          bairro: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="endereco_cidade">
                                      Cidade
                                    </Label>
                                    <Input
                                      id="endereco_cidade"
                                      placeholder="Rio de Janeiro"
                                      value={contaBancariaData.cidade}
                                      onChange={(e) =>
                                        setContaBancariaData({
                                          ...contaBancariaData,
                                          cidade: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="endereco_estado">
                                      Estado (UF)
                                    </Label>
                                    <Input
                                      id="endereco_estado"
                                      placeholder="RJ"
                                      maxLength={2}
                                      value={contaBancariaData.estado}
                                      onChange={(e) =>
                                        setContaBancariaData({
                                          ...contaBancariaData,
                                          estado: e.target.value.toUpperCase(),
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="endereco_referencia">
                                      Ponto de Referência
                                    </Label>
                                    <Input
                                      id="endereco_referencia"
                                      placeholder="Ao lado da banca de jornal (opcional)"
                                      value={contaBancariaData.pontoReferencia}
                                      onChange={(e) =>
                                        setContaBancariaData({
                                          ...contaBancariaData,
                                          pontoReferencia: e.target.value,
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
                                      value={contaBancariaData.documentoTitular}
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
                                      className="flex h-10 w-full items-center justify-between rounded-md border border-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                      value={contaBancariaData.tipoConta}
                                      onChange={(e) =>
                                        setContaBancariaData({
                                          ...contaBancariaData,
                                          tipoConta: e.target.value,
                                        })
                                      }
                                    >
                                      <option value="checking">Corrente</option>
                                      <option value="savings">Poupança</option>
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
                                  <Label htmlFor="item">Tipo de Salgado</Label>
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
                <DataTable
                  colunas={colunasPendentes}
                  dados={dividas}
                  rotulo="Dívidas pendentes"
                  vazio="Nenhuma dívida encontrada"
                  total={totalPendentes}
                  pagina={currentPagePendentes}
                  totalPaginas={totalPagesPendentes}
                  onMudarPagina={setCurrentPagePendentes}
                  itensPorPagina={itemsPerPage}
                  onMudarItensPorPagina={(itens) => {
                    setItemsPerPage(itens);
                    reiniciarPaginas();
                  }}
                  busca={searchTerm}
                  onMudarBusca={(valor) => {
                    setSearchTerm(valor);
                    reiniciarPaginas();
                  }}
                  placeholderBusca="Pesquisar por colaborador ou item..."
                  filtros={filtroMotivo}
                />
              </Card.Content>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel className="p-0" id="pagas">
            <Card>
              <Card.Header>
                <Card.Title>Dívidas Pagas</Card.Title>
                <Card.Description>
                  Histórico de salgados que já foram pagos
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <DataTable
                  colunas={colunasPagas}
                  dados={salgadosPagos}
                  rotulo="Dívidas pagas"
                  vazio="Nenhum histórico encontrado"
                  total={totalPagas}
                  pagina={currentPagePagas}
                  totalPaginas={totalPagesPagas}
                  onMudarPagina={setCurrentPagePagas}
                  itensPorPagina={itemsPerPage}
                  onMudarItensPorPagina={(itens) => {
                    setItemsPerPage(itens);
                    reiniciarPaginas();
                  }}
                  busca={searchTerm}
                  onMudarBusca={(valor) => {
                    setSearchTerm(valor);
                    reiniciarPaginas();
                  }}
                  placeholderBusca="Pesquisar por colaborador ou item..."
                  filtros={filtroMotivo}
                />
              </Card.Content>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </LayoutPagina>
    </ProtectedRoute>
  );
}

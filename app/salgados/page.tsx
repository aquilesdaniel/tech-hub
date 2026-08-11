"use client";

import { StatTile } from "@/components/dashboard/stat-tile";
import type { DashboardData } from "@/components/dashboard/types";
import { inteiro, moeda, moedaCompacta } from "@/components/dashboard/viz";
import { DataTable } from "@/components/data-table";
import { CampoModal, LinhaCampos, ModalForm } from "@/components/modal-form";
import { CabecalhoPagina, LayoutPagina } from "@/components/pagina";
import { ProtectedRoute } from "@/components/protected-route";
import { SpinnerTela } from "@/components/spinner-tela";
import { useAuth } from "@/contexts/auth-context";
import {
  Button,
  Card,
  Chip,
  Input,
  ListBox,
  Select,
  Tabs,
  TextArea,
  toast,
} from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Banknote,
  Calendar,
  Check,
  DollarSign,
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
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [saldoInfo, setSaldoInfo] = useState({
    available_amount: 0,
    waiting_funds_amount: 0,
    transferred_amount: 0,
  });

  const [resumo, setResumo] = useState<DashboardData | null>(null);
  const [carregandoResumo, setCarregandoResumo] = useState(true);
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
    if (!user) {
      return;
    }

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
          <Check />
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
        toast.danger("Erro", {
          description: data.error || "Ocorreu um erro inesperado.",
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
            <Tabs.List className="grid w-full grid-cols-1 sm:grid-cols-2">
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
                    <ModalForm
                      isOpen={isTransferOpen}
                      onOpenChange={setIsTransferOpen}
                      titulo="Sacar Dinheiro"
                      descricao="Solicite uma transferência dos valores disponíveis."
                      gatilho={
                        <Button variant="secondary">
                          <Banknote />
                          Sacar dinheiro
                        </Button>
                      }
                      rotuloConfirmar="Confirmar Transferência"
                      rotuloEnviando="Enviando..."
                      onConfirmar={handleTransferirDinheiro}
                      isEnviando={isSubmittingTransfer}
                      isConfirmarDesabilitado={saldoInfo.available_amount <= 0}
                    >
                      <p className="text-sm">
                        Saldo disponível para saque:{" "}
                        <strong>
                          {saldoInfo.available_amount.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </strong>
                      </p>

                      <CampoModal
                        rotulo="Valor a sacar (R$)"
                        htmlFor="transfer_amount"
                      >
                        <Input
                          id="transfer_amount"
                          type="number"
                          max={saldoInfo.available_amount}
                          value={transferData.amount}
                          onChange={(e) =>
                            setTransferData({
                              ...transferData,
                              amount: e.target.value,
                            })
                          }
                          variant="secondary"
                          placeholder="Ex: 80.50 para R$ 80,50"
                        />
                      </CampoModal>

                      <CampoModal rotulo="Observação" htmlFor="transfer_desc">
                        <TextArea
                          id="transfer_desc"
                          value={transferData.description}
                          onChange={(e) =>
                            setTransferData({
                              ...transferData,
                              description: e.target.value,
                            })
                          }
                          variant="secondary"
                          placeholder="Ex: Salgado de novembro"
                        />
                      </CampoModal>
                    </ModalForm>

                    <ModalForm
                      isOpen={isAddDialogOpen}
                      onOpenChange={setIsAddDialogOpen}
                      titulo="Nova Dívida de Salgado"
                      descricao="Adicione uma nova dívida de salgado para um colaborador."
                      gatilho={
                        <Button>
                          <Plus />
                          Adicionar Dívida
                        </Button>
                      }
                      rotuloConfirmar="Adicionar Dívida"
                      onConfirmar={adicionarDivida}
                    >
                      <CampoModal rotulo="Colaborador" htmlFor="colaborador">
                        <Select
                          value={newDivida.colaborador_id}
                          onChange={(value) =>
                            setNewDivida({
                              ...newDivida,
                              colaborador_id: value as string,
                            })
                          }
                          variant="secondary"
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
                      </CampoModal>

                      <CampoModal rotulo="Tipo de Salgado" htmlFor="item">
                        <Select
                          value={newDivida.item}
                          onChange={(value) =>
                            setNewDivida({
                              ...newDivida,
                              item: value as string,
                              valor: "",
                            })
                          }
                          variant="secondary"
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
                      </CampoModal>

                      {(newDivida.item === "1 cento" ||
                        newDivida.item === "2 centos") && (
                        <>
                          <LinhaCampos>
                            <CampoModal
                              rotulo="Valor por Cento (R$)"
                              htmlFor="valorPorCento"
                            >
                              <Input
                                id="valorPorCento"
                                type="text"
                                inputMode="decimal"
                                value={newDivida.valorPorCento}
                                onChange={(e) => {
                                  const valorAjustado = e.target.value.replace(
                                    /[^0-9,]/g,
                                    "",
                                  );
                                  setNewDivida({
                                    ...newDivida,
                                    valorPorCento: valorAjustado,
                                  });
                                }}
                                variant="secondary"
                                placeholder="0,00"
                              />
                            </CampoModal>

                            <CampoModal
                              rotulo="Quantidade de Centos"
                              htmlFor="quantidadeCentos"
                            >
                              <Select
                                value={newDivida.quantidadeCentos}
                                onChange={(value) =>
                                  setNewDivida({
                                    ...newDivida,
                                    quantidadeCentos: value as string,
                                  })
                                }
                                variant="secondary"
                              >
                                <Select.Trigger>
                                  <Select.Value />
                                  <Select.Indicator />
                                </Select.Trigger>
                                <Select.Popover>
                                  <ListBox>
                                    <ListBox.Item id="1" textValue="1 Cento">
                                      1 Cento
                                    </ListBox.Item>
                                    <ListBox.Item id="2" textValue="2 Centos">
                                      2 Centos
                                    </ListBox.Item>
                                  </ListBox>
                                </Select.Popover>
                              </Select>
                            </CampoModal>
                          </LinhaCampos>

                          <CampoModal rotulo="Valor Total">
                            <div className="rounded border border-border bg-default p-2 text-lg font-semibold text-foreground">
                              {newDivida.valor
                                ? Number(newDivida.valor).toLocaleString(
                                    "pt-BR",
                                    {
                                      style: "currency",
                                      currency: "BRL",
                                    },
                                  )
                                : "R$ 0,00"}
                            </div>
                          </CampoModal>
                        </>
                      )}

                      {newDivida.item === "salgado" && (
                        <CampoModal rotulo="Valor (R$)" htmlFor="valor">
                          <Input
                            id="valor"
                            type="text"
                            inputMode="decimal"
                            value={newDivida.valor}
                            onChange={(e) => {
                              const valorAjustado = e.target.value.replace(
                                /[^0-9,]/g,
                                "",
                              );
                              setNewDivida({
                                ...newDivida,
                                valor: valorAjustado,
                              });
                            }}
                            variant="secondary"
                            placeholder="0,00"
                          />
                        </CampoModal>
                      )}

                      <CampoModal rotulo="Motivo da Dívida" htmlFor="motivo">
                        <TextArea
                          id="motivo"
                          value={newDivida.motivo}
                          onChange={(e) =>
                            setNewDivida({
                              ...newDivida,
                              motivo: e.target.value,
                            })
                          }
                          variant="secondary"
                          placeholder="Ex: Esqueceu de pagar, Pagamento atrasado..."
                        />
                      </CampoModal>
                    </ModalForm>
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

"use client";

import { StatTile } from "@/components/dashboard/stat-tile";
import type { DashboardData } from "@/components/dashboard/types";
import { formatInteger, formatCurrency, formatCompactCurrency } from "@/components/dashboard/viz";
import { DataTable } from "@/components/data-table";
import { ModalField, FieldRow, ModalForm } from "@/components/modal-form";
import { PageHeader, PageLayout } from "@/components/page-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { ScreenSpinner } from "@/components/screen-spinner";
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

interface Debt {
  id: number;
  colaborador_id: number;
  employee_name: string;
  item: string;
  motivo: string;
  data_inicio: string;
  valor: number;
  pago: boolean;
}

const PIX_KEY_TYPE_OPTIONS = [
  { id: "CPF", label: "CPF" },
  { id: "CNPJ", label: "CNPJ" },
  { id: "EMAIL", label: "E-mail" },
  { id: "PHONE", label: "Telefone" },
  { id: "RANDOM", label: "Chave aleatória" },
] as const;

const PIX_KEY_PLACEHOLDERS: Record<string, string> = {
  CPF: "00011122233",
  CNPJ: "00000000000100",
  EMAIL: "financeiro@empresa.com.br",
  PHONE: "5545999990000",
  RANDOM: "chave aleatória (EVP)",
};

export default function SnacksPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [paidDebts, setPaidDebts] = useState<Debt[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterReason, setFilterReason] = useState("all");
  const [currentPagePending, setCurrentPagePending] = useState(1);
  const [currentPagePaid, setCurrentPagePaid] = useState(1);
  const [totalPagesPending, setTotalPagesPending] = useState(1);
  const [totalPagesPaid, setTotalPagesPaid] = useState(1);
  const [totalPending, setTotalPending] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [uniqueReasons, setUniqueReasons] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState({
    available: 0,
    pending: 0,
    blocked: 0,
  });

  const [summary, setSummary] = useState<DashboardData | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [transferData, setTransferData] = useState({
    amount: "",
    description: "",
    pix_key: "",
    pix_key_type: "CPF",
  });
  const [newDebt, setNewDebt] = useState({
    colaborador_id: "",
    item: "",
    hundredCount: "1",
    pricePerHundred: "",
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
    currentPagePending,
    currentPagePaid,
    itemsPerPage,
    searchTerm,
    filterReason,
  ]);

  const fetchData = async () => {
    try {
      const searchParams = new URLSearchParams();
      if (searchTerm) searchParams.append("search", searchTerm);
      if (filterReason && filterReason !== "all")
        searchParams.append("motivo", filterReason);
      searchParams.append("limit", itemsPerPage.toString());

      const pendingParams = new URLSearchParams(searchParams);
      pendingParams.append("pago", "false");
      pendingParams.append("page", currentPagePending.toString());

      const paidParams = new URLSearchParams(searchParams);
      paidParams.append("pago", "true");
      paidParams.append("page", currentPagePaid.toString());

      const [debtsRes, paidDebtsRes, employeesRes, reasonsRes] =
        await Promise.all([
          fetch(`/api/salgados/dividas?${pendingParams.toString()}`),
          fetch(`/api/salgados/dividas?${paidParams.toString()}`),
          fetch("/api/colaboradores"),
          fetch("/api/salgados/dividas?reasons_only=true"),
        ]);

      if (debtsRes.ok && paidDebtsRes.ok && employeesRes.ok) {
        const debtsData = await debtsRes.json();
        const paidDebtsData = await paidDebtsRes.json();
        const employeesData = await employeesRes.json();

        if (reasonsRes.ok) {
          const reasons = await reasonsRes.json();
          setUniqueReasons(reasons.sort());
        }

        setDebts(debtsData.data || []);
        setTotalPagesPending(debtsData.totalPages || 1);
        setTotalPending(debtsData.total || 0);

        setPaidDebts(paidDebtsData.data || []);
        setTotalPagesPaid(paidDebtsData.totalPages || 1);
        setTotalPaid(paidDebtsData.total || 0);

        setEmployees(employeesData);
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

  const isAdmin = user?.tipo === "admin";

  useEffect(() => {
    if (!user) return;

    fetchSummary();
    fetchBalance();
  }, [user]);

  const fetchSummary = async () => {
    try {
      const response = await fetch("/api/dashboard?months=0");
      if (response.ok) setSummary((await response.json()) as DashboardData);
    } catch (error) {
      console.error("Erro ao carregar o resumo de salgados:", error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch("/api/salgados/saldo");
      if (response.ok) {
        const data = await response.json();
        setBalanceInfo({
          available: Number(data.available) || 0,
          pending: Number(data.pending) || 0,
          blocked: Number(data.blocked) || 0,
        });
      }
    } catch (error) {
      console.error("Erro ao consultar saldo:", error);
    }
  };

  const openPaymentConfirmation = (debt: Debt) => {
    router.push(`/salgados/pagar/${debt.id}`);
  };

  const resetPages = () => {
    setCurrentPagePending(1);
    setCurrentPagePaid(1);
  };

  const baseColumns: ColumnDef<Debt, any>[] = [
    {
      accessorKey: "employee_name",
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
      meta: { className: "hidden md:table-cell text-muted" },
    },
    {
      accessorKey: "data_inicio",
      header: "Data",
      cell: (info) =>
        new Date(String(info.getValue())).toLocaleDateString("pt-BR"),
      meta: { className: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "valor",
      header: "Valor",
      cell: (info) => formatCurrency(Number(info.getValue())),
      meta: { align: "right", className: "font-semibold tabular-nums" },
    },
  ];

  const pendingColumns: ColumnDef<Debt, any>[] = [
    ...baseColumns,
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <Button
          size="sm"
          onPress={() => openPaymentConfirmation(row.original)}
        >
          <Check />
          Pagar
        </Button>
      ),
      meta: { align: "right" },
    },
  ];

  const paidColumns: ColumnDef<Debt, any>[] = [
    ...baseColumns,
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <Link href={`/salgados/detalhes/${row.original.id}`}>
          <Button variant="outline" size="sm">
            Detalhes
          </Button>
        </Link>
      ),
      meta: { align: "right" },
    },
  ];

  const reasonFilter = (
    <Select
      selectedKey={filterReason}
      onSelectionChange={(key) => {
        setFilterReason(String(key));
        resetPages();
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
          <ListBox.Item id="all" textValue="Todos os motivos">
            Todos os motivos
          </ListBox.Item>
          {uniqueReasons.map((reason) => (
            <ListBox.Item key={reason} id={reason} textValue={reason}>
              {reason}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );

  const calculateTotalAmount = (): number => {
    const count = parseInt(newDebt.hundredCount) || 1;
    const pricePerHundred =
      parseFloat(String(newDebt.pricePerHundred).replace(",", ".")) || 0;
    return count * pricePerHundred;
  };

  useEffect(() => {
    if (newDebt.item === "1 cento" || newDebt.item === "2 centos") {
      const totalAmount = calculateTotalAmount();
      setNewDebt((prev) => ({
        ...prev,
        valor: totalAmount.toFixed(2),
      }));
    }
  }, [newDebt.hundredCount, newDebt.pricePerHundred, newDebt.item]);

  const addDebt = async () => {
    let finalAmount = 0;

    if (newDebt.item === "1 cento" || newDebt.item === "2 centos") {
      const pricePerHundredFloat = parseFloat(
        String(newDebt.pricePerHundred).replace(",", "."),
      );
      if (
        !newDebt.colaborador_id ||
        !newDebt.item ||
        !newDebt.motivo ||
        !newDebt.pricePerHundred ||
        isNaN(pricePerHundredFloat) ||
        pricePerHundredFloat <= 0
      ) {
        toast.danger("Erro", {
          description: "Preencha todos os campos obrigatórios.",
        });
        return;
      }
      finalAmount = parseFloat(String(newDebt.valor).replace(",", "."));
    } else {
      finalAmount = parseFloat(String(newDebt.valor).replace(",", "."));
      if (
        !newDebt.colaborador_id ||
        !newDebt.item ||
        !newDebt.motivo ||
        !newDebt.valor ||
        isNaN(finalAmount) ||
        finalAmount <= 0
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
          colaborador_id: parseInt(newDebt.colaborador_id),
          item: newDebt.item,
          motivo: newDebt.motivo,
          valor: finalAmount,
        }),
      });

      if (response.ok) {
        fetchData();
        setIsAddDialogOpen(false);
        setNewDebt({
          colaborador_id: "",
          item: "",
          hundredCount: "1",
          pricePerHundred: "",
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

  const handleTransferMoney = async () => {
    if (!user) {
      return;
    }

    const withdrawalAmount = parseFloat(
      String(transferData.amount).replace(",", "."),
    );

    if (
      !transferData.amount ||
      isNaN(withdrawalAmount) ||
      withdrawalAmount <= 0
    ) {
      toast.danger("Erro", {
        description: "Informe um valor de saque válido.",
      });
      return;
    }

    if (withdrawalAmount > balanceInfo.available) {
      toast.danger("Erro", {
        description: "O valor solicitado excede o saldo disponível para saque.",
      });
      return;
    }

    if (!transferData.pix_key.trim()) {
      toast.danger("Erro", {
        description: "Informe a chave PIX que receberá o valor.",
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
          amount: withdrawalAmount,
          description: transferData.description,
          pix_key: transferData.pix_key,
          pix_key_type: transferData.pix_key_type,
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
        pix_key: "",
        pix_key_type: "CPF",
      });
      fetchBalance();
    } catch (error) {
      console.error("Erro ao solicitar transferência:", error);
      toast.danger("Erro", {
        description: "Não foi possível realizar a transferência.",
      });
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  if (loading || loadingSummary) {
    return (
      <ProtectedRoute>
        <ScreenSpinner />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageLayout>
        <PageHeader
          title="Controle de Salgados"
          description="Gerencie dívidas de salgados dos colaboradores"
          backHref="/"
        />

        <section
          aria-label="Indicadores de salgados"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatTile
            label="Em aberto"
            value={formatCompactCurrency(summary?.kpis.openAmount ?? 0)}
            icon={Calendar}
            deltaLabel={`${formatInteger(summary?.kpis.openDebts ?? 0)} lançamento(s) aguardando pagamento`}
          />
          <StatTile
            label="Total quitado"
            value={formatCompactCurrency(summary?.kpis.settledAmount ?? 0)}
            icon={Check}
            deltaLabel={`${formatInteger(summary?.kpis.settledDebts ?? 0)} lançamento(s) já pagos`}
          />
          <StatTile
            label="Ticket médio"
            value={formatCurrency(summary?.kpis.averageTicket ?? 0)}
            icon={DollarSign}
            deltaLabel="valor médio por lançamento"
          />

          <StatTile
            label="Disponível para saque"
            value={formatCurrency(balanceInfo.available)}
            icon={Wallet}
            deltaLabel={
              balanceInfo.pending > 0
                ? `${formatCurrency(balanceInfo.pending)} ainda a liberar`
                : "nada pendente de liberação"
            }
          />
        </section>

        <Tabs defaultSelectedKey="pending" className="gap-4">
          <Tabs.ListContainer>
            <Tabs.List className="grid w-full grid-cols-1 sm:grid-cols-2">
              <Tabs.Tab id="pending">
                Pendentes
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="paid">
                Pagas
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel className="p-0" id="pending">
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
                    {isAdmin && (
                      <ModalForm
                        isOpen={isTransferOpen}
                        onOpenChange={setIsTransferOpen}
                        title="Sacar Dinheiro"
                        description="Solicite uma transferência PIX dos valores disponíveis."
                        trigger={
                          <Button variant="secondary">
                            <Banknote />
                            Sacar dinheiro
                          </Button>
                        }
                        confirmLabel="Confirmar Transferência"
                        submittingLabel="Enviando..."
                        onConfirm={handleTransferMoney}
                        isSubmitting={isSubmittingTransfer}
                        isConfirmDisabled={balanceInfo.available <= 0}
                      >
                        <p className="text-sm">
                          Saldo disponível para saque:{" "}
                          <strong>{formatCurrency(balanceInfo.available)}</strong>
                        </p>

                        <ModalField
                          label="Valor a sacar (R$)"
                          htmlFor="transfer_amount"
                        >
                          <Input
                            id="transfer_amount"
                            type="number"
                            max={balanceInfo.available}
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
                        </ModalField>

                        <FieldRow>
                          <ModalField
                            label="Tipo da chave PIX"
                            htmlFor="pix_key_type"
                          >
                            <Select
                              selectedKey={transferData.pix_key_type}
                              onSelectionChange={(key) =>
                                setTransferData({
                                  ...transferData,
                                  pix_key_type: String(key),
                                  pix_key: "",
                                })
                              }
                              variant="secondary"
                              aria-label="Tipo da chave PIX"
                            >
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox>
                                  {PIX_KEY_TYPE_OPTIONS.map((keyType) => (
                                    <ListBox.Item
                                      key={keyType.id}
                                      id={keyType.id}
                                      textValue={keyType.label}
                                    >
                                      {keyType.label}
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Select.Popover>
                            </Select>
                          </ModalField>

                          <ModalField label="Chave PIX" htmlFor="pix_key">
                            <Input
                              id="pix_key"
                              value={transferData.pix_key}
                              onChange={(e) =>
                                setTransferData({
                                  ...transferData,
                                  pix_key: e.target.value,
                                })
                              }
                              variant="secondary"
                              placeholder={
                                PIX_KEY_PLACEHOLDERS[transferData.pix_key_type]
                              }
                            />
                          </ModalField>
                        </FieldRow>

                        <ModalField label="Observação" htmlFor="transfer_desc">
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
                        </ModalField>
                      </ModalForm>
                    )}

                    <ModalForm
                      isOpen={isAddDialogOpen}
                      onOpenChange={setIsAddDialogOpen}
                      title="Nova Dívida de Salgado"
                      description="Adicione uma nova dívida de salgado para um colaborador."
                      trigger={
                        <Button>
                          <Plus />
                          Adicionar Dívida
                        </Button>
                      }
                      confirmLabel="Adicionar Dívida"
                      onConfirm={addDebt}
                    >
                      <ModalField label="Colaborador" htmlFor="employee">
                        <Select
                          value={newDebt.colaborador_id}
                          onChange={(value) =>
                            setNewDebt({
                              ...newDebt,
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
                              {employees.map((employee) => (
                                <ListBox.Item
                                  key={employee.id}
                                  id={employee.id.toString()}
                                  textValue={employee.nome}
                                >
                                  {employee.nome}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </ModalField>

                      <ModalField label="Tipo de Salgado" htmlFor="item">
                        <Select
                          value={newDebt.item}
                          onChange={(value) =>
                            setNewDebt({
                              ...newDebt,
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
                      </ModalField>

                      {(newDebt.item === "1 cento" ||
                        newDebt.item === "2 centos") && (
                        <>
                          <FieldRow>
                            <ModalField
                              label="Valor por Cento (R$)"
                              htmlFor="pricePerHundred"
                            >
                              <Input
                                id="pricePerHundred"
                                type="text"
                                inputMode="decimal"
                                value={newDebt.pricePerHundred}
                                onChange={(e) => {
                                  const sanitizedValue = e.target.value.replace(
                                    /[^0-9,]/g,
                                    "",
                                  );
                                  setNewDebt({
                                    ...newDebt,
                                    pricePerHundred: sanitizedValue,
                                  });
                                }}
                                variant="secondary"
                                placeholder="0,00"
                              />
                            </ModalField>

                            <ModalField
                              label="Quantidade de Centos"
                              htmlFor="hundredCount"
                            >
                              <Select
                                value={newDebt.hundredCount}
                                onChange={(value) =>
                                  setNewDebt({
                                    ...newDebt,
                                    hundredCount: value as string,
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
                            </ModalField>
                          </FieldRow>

                          <ModalField label="Valor Total">
                            <div className="rounded border border-border bg-default p-2 text-lg font-semibold text-foreground">
                              {newDebt.valor
                                ? Number(newDebt.valor).toLocaleString(
                                    "pt-BR",
                                    {
                                      style: "currency",
                                      currency: "BRL",
                                    },
                                  )
                                : "R$ 0,00"}
                            </div>
                          </ModalField>
                        </>
                      )}

                      {newDebt.item === "salgado" && (
                        <ModalField label="Valor (R$)" htmlFor="amount">
                          <Input
                            id="amount"
                            type="text"
                            inputMode="decimal"
                            value={newDebt.valor}
                            onChange={(e) => {
                              const sanitizedValue = e.target.value.replace(
                                /[^0-9,]/g,
                                "",
                              );
                              setNewDebt({
                                ...newDebt,
                                valor: sanitizedValue,
                              });
                            }}
                            variant="secondary"
                            placeholder="0,00"
                          />
                        </ModalField>
                      )}

                      <ModalField label="Motivo da Dívida" htmlFor="reason">
                        <TextArea
                          id="reason"
                          value={newDebt.motivo}
                          onChange={(e) =>
                            setNewDebt({
                              ...newDebt,
                              motivo: e.target.value,
                            })
                          }
                          variant="secondary"
                          placeholder="Ex: Esqueceu de pagar, Pagamento atrasado..."
                        />
                      </ModalField>
                    </ModalForm>
                  </div>
                </div>
              </Card.Header>
              <Card.Content>
                <DataTable
                  columns={pendingColumns}
                  data={debts}
                  label="Dívidas pendentes"
                  emptyMessage="Nenhuma dívida encontrada"
                  total={totalPending}
                  page={currentPagePending}
                  totalPages={totalPagesPending}
                  onPageChange={setCurrentPagePending}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(count) => {
                    setItemsPerPage(count);
                    resetPages();
                  }}
                  search={searchTerm}
                  onSearchChange={(value) => {
                    setSearchTerm(value);
                    resetPages();
                  }}
                  searchPlaceholder="Pesquisar por colaborador ou item..."
                  filters={reasonFilter}
                />
              </Card.Content>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel className="p-0" id="paid">
            <Card>
              <Card.Header>
                <Card.Title>Dívidas Pagas</Card.Title>
                <Card.Description>
                  Histórico de salgados que já foram pagos
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <DataTable
                  columns={paidColumns}
                  data={paidDebts}
                  label="Dívidas pagas"
                  emptyMessage="Nenhum histórico encontrado"
                  total={totalPaid}
                  page={currentPagePaid}
                  totalPages={totalPagesPaid}
                  onPageChange={setCurrentPagePaid}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(count) => {
                    setItemsPerPage(count);
                    resetPages();
                  }}
                  search={searchTerm}
                  onSearchChange={(value) => {
                    setSearchTerm(value);
                    resetPages();
                  }}
                  searchPlaceholder="Pesquisar por colaborador ou item..."
                  filters={reasonFilter}
                />
              </Card.Content>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </PageLayout>
    </ProtectedRoute>
  );
}

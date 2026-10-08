"use client";

import { useConfirmation } from "@/components/confirmation";
import { StatTile } from "@/components/dashboard/stat-tile";
import { daysUntil, formatInteger, formatPercent } from "@/components/dashboard/viz";
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
  TextArea,
  toast,
} from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Award,
  BadgeCheck,
  Calendar,
  CalendarClock,
  Edit,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Employee {
  id: number;
  nome: string;
  email: string;
  departamento: string;
}

interface Certification {
  id: number;
  colaborador_id: number;
  employee_name: string;
  nome: string;
  tipo: string;
  instituicao: string;
  data_obtencao: string;
  data_vencimento?: string | null;
  url_credencial?: string | null;
  observacoes?: string | null;
}

const EMPTY_CERTIFICATION = {
  colaborador_id: "",
  nome: "",
  tipo: "",
  instituicao: "",
  data_obtencao: "",
  data_vencimento: "",
  url_credencial: "",
  observacoes: "",
};

const toDateInputValue = (value?: string | null) =>
  value ? String(value).slice(0, 10) : "";

export default function CertificationsPage() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const confirm = useConfirmation();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    senior: 0,
    expiringIn90: 0,
    expired: 0,
    certifiedEmployees: 0,
    institutions: 0,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCertification, setSelectedCertification] =
    useState<Certification | null>(null);
  const [newCertification, setNewCertification] =
    useState(EMPTY_CERTIFICATION);
  const [editingCertification, setEditingCertification] =
    useState(EMPTY_CERTIFICATION);

  const certificationTypes = [
    "Certificação Senior",
    "AWS",
    "Azure",
    "Google Cloud",
    "Kubernetes",
    "Docker",
    "Java",
    "Python",
    "React",
    "Angular",
    "Node.js",
    "DevOps",
    "Scrum",
    "Agile",
    "Outros",
  ];

  useEffect(() => {
    if (!user) {
      return;
    }

    fetchData();
  }, [user, page, itemsPerPage, appliedSearch, filterType]);

  useEffect(() => {
    if (user?.tipo !== "admin" && user?.id) {
      setNewCertification((prev) => ({
        ...prev,
        colaborador_id: user.id.toString(),
      }));
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(itemsPerPage),
      });

      const myId = Number(user?.id);
      if (user?.tipo !== "admin" && Number.isFinite(myId))
        params.set("colaborador_id", String(myId));
      if (appliedSearch) params.set("search", appliedSearch);
      if (filterType !== "all") params.set("tipo", filterType);

      const [certificationsRes, employeesRes] = await Promise.all([
        fetch(`/api/certificacoes?${params}`),
        fetch("/api/colaboradores"),
      ]);

      if (certificationsRes.ok && employeesRes.ok) {
        const certificationsData = await certificationsRes.json();
        const employeesData = await employeesRes.json();

        setCertifications(certificationsData.data ?? []);
        setTotalPages(certificationsData.totalPages ?? 1);
        setFilteredTotal(certificationsData.total ?? 0);
        if (certificationsData.summary) setSummary(certificationsData.summary);
        if (certificationsData.types)
          setAvailableTypes(certificationsData.types);

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

  const addCertification = async () => {
    if (
      !newCertification.colaborador_id ||
      !newCertification.nome ||
      !newCertification.tipo ||
      !newCertification.instituicao ||
      !newCertification.data_obtencao
    ) {
      toast.danger("Erro", {
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    try {
      const response = await fetch("/api/certificacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaborador_id: parseInt(newCertification.colaborador_id),
          nome: newCertification.nome,
          tipo: newCertification.tipo,
          instituicao: newCertification.instituicao,
          data_obtencao: newCertification.data_obtencao,
          data_vencimento: newCertification.data_vencimento || null,
          url_credencial: newCertification.url_credencial || null,
          observacoes: newCertification.observacoes || null,
        }),
      });

      if (response.ok) {
        toast("Certificação adicionada!", {
          description: "Nova certificação foi registrada com sucesso.",
        });

        setIsAddDialogOpen(false);
        resetNewCertificationForm();

        window.location.reload();
      }
    } catch (error) {
      console.error("Erro ao adicionar certificação:", error);
      toast.danger("Erro", {
        description: "Não foi possível adicionar a certificação.",
      });
    }
  };

  const editCertification = async () => {
    if (!selectedCertification) return;

    if (
      !editingCertification.nome ||
      !editingCertification.tipo ||
      !editingCertification.instituicao ||
      !editingCertification.data_obtencao
    ) {
      toast.danger("Erro", {
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/certificacoes/${selectedCertification.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: editingCertification.nome,
            tipo: editingCertification.tipo,
            instituicao: editingCertification.instituicao,
            data_obtencao: editingCertification.data_obtencao,
            data_vencimento: editingCertification.data_vencimento || null,
            url_credencial: editingCertification.url_credencial || null,
            observacoes: editingCertification.observacoes || null,
          }),
        },
      );

      if (response.ok) {
        fetchData();
        closeEditDialog();

        toast("Certificação atualizada!", {
          description: "As informações da certificação foram atualizadas.",
        });
      } else {
        const errorData = await response.json().catch(() => null);
        toast.danger("Erro", {
          description:
            errorData?.error || "Não foi possível atualizar a certificação.",
        });
      }
    } catch (error) {
      console.error("Erro ao editar certificação:", error);
      toast.danger("Erro", {
        description: "Não foi possível atualizar a certificação.",
      });
    }
  };

  const removeCertification = async (id: number) => {
    const confirmed = await confirm({
      title: "Remover certificação",
      description:
        "Tem certeza que deseja remover esta certificação? Essa ação não pode ser desfeita.",
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/certificacoes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
        toast("Certificação removida!", {
          description: "A certificação foi removida com sucesso.",
        });
      }
    } catch (error) {
      console.error("Erro ao remover certificação:", error);
      toast.danger("Erro", {
        description: "Não foi possível remover a certificação.",
      });
    }
  };

  const openEditDialog = (certification: Certification) => {
    setSelectedCertification(certification);
    setEditingCertification({
      colaborador_id: certification.colaborador_id.toString(),
      nome: certification.nome,
      tipo: certification.tipo,
      instituicao: certification.instituicao,
      data_obtencao: toDateInputValue(certification.data_obtencao),
      data_vencimento: toDateInputValue(certification.data_vencimento),
      url_credencial: certification.url_credencial || "",
      observacoes: certification.observacoes || "",
    });
    setIsEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedCertification(null);
    setEditingCertification(EMPTY_CERTIFICATION);
  };

  const resetNewCertificationForm = () => {
    setNewCertification({
      ...EMPTY_CERTIFICATION,
      colaborador_id:
        user?.tipo !== "admin" && user?.id ? user.id.toString() : "",
    });
  };

  const canEditCertification = (certification: Certification) => {
    return user?.tipo === "admin" || certification.colaborador_id === user?.id;
  };

  const isAdmin = user?.tipo === "admin";
  const seniorShare =
    summary.total > 0 ? (summary.senior / summary.total) * 100 : 0;

  const certificationColumns: ColumnDef<Certification, any>[] = [
    {
      accessorKey: "nome",
      header: "Certificação",
      cell: (info) => (
        <span className="font-medium">{String(info.getValue() ?? "")}</span>
      ),
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: (info) => (
        <Chip className="whitespace-nowrap">
          {String(info.getValue() ?? "")}
        </Chip>
      ),
    },
    {
      accessorKey: "employee_name",
      header: "Colaborador",
      meta: { className: "hidden lg:table-cell text-muted" },
    },
    {
      accessorKey: "instituicao",
      header: "Instituição",
      meta: { className: "hidden md:table-cell text-muted" },
    },
    {
      accessorKey: "data_obtencao",
      header: "Obtida em",
      cell: (info) =>
        new Date(String(info.getValue())).toLocaleDateString("pt-BR"),
      meta: { className: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "data_vencimento",
      header: "Vencimento",
      cell: ({ row, getValue }) => {
        if (!getValue())
          return <span className="text-muted">Sem validade</span>;
        const days = daysUntil(row.original.data_vencimento);
        return (
          <div className="flex items-center gap-2">
            <span>
              {new Date(String(getValue())).toLocaleDateString("pt-BR")}
            </span>
            {days !== null && days < 0 && (
              <Chip size="sm" color="danger">
                Vencida
              </Chip>
            )}
            {days !== null && days >= 0 && days <= 90 && (
              <Chip size="sm" color="warning">
                {formatInteger(days)} d
              </Chip>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => {
        const certification = row.original;
        return (
          <div className="flex justify-end gap-2">
            {certification.url_credencial && (
              <Button
                isIconOnly
                variant="outline"
                aria-label="Ver credencial"
                onPress={() =>
                  window.open(certification.url_credencial!, "_blank")
                }
              >
                <ExternalLink />
              </Button>
            )}
            {canEditCertification(certification) && (
              <>
                <Button
                  isIconOnly
                  variant="outline"
                  aria-label="Editar certificação"
                  onPress={() => openEditDialog(certification)}
                >
                  <Edit />
                </Button>
                <Button
                  isIconOnly
                  variant="danger"
                  aria-label="Remover certificação"
                  onPress={() => removeCertification(certification.id)}
                >
                  <Trash2 />
                </Button>
              </>
            )}
          </div>
        );
      },
      meta: { align: "right" },
    },
  ];

  const certificationTypeFilter = (
    <Select
      selectedKey={filterType}
      onSelectionChange={(key) => {
        setFilterType(String(key));
        setPage(1);
      }}
      variant="secondary"
      aria-label="Filtrar por tipo"
    >
      <Select.Trigger className="w-full sm:w-48">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="all" textValue="Todos os tipos">
            Todos os tipos
          </ListBox.Item>
          {availableTypes.map((type) => (
            <ListBox.Item key={type} id={type} textValue={type}>
              {type}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );

  if (loading) {
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
          title="Controle de Certificações"
          description="Gerencie certificações dos colaboradores"
          backHref="/"
        />

        <section
          aria-label="Indicadores de certificações"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatTile
            label={isAdmin ? "Certificações" : "Suas certificações"}
            value={formatInteger(summary.total)}
            icon={Award}
            deltaLabel={
              availableTypes.length > 0
                ? `${formatInteger(availableTypes.length)} tipo(s) diferentes`
                : "nenhuma registrada ainda"
            }
          />
          <StatTile
            label="Certificações Sênior"
            value={formatInteger(summary.senior)}
            icon={BadgeCheck}
            deltaLabel={
              summary.total > 0
                ? `${formatPercent(seniorShare, 0)} do total`
                : "-"
            }
          />
          <StatTile
            label={isAdmin ? "Colaboradores certificados" : "Instituições"}
            value={formatInteger(
              isAdmin ? summary.certifiedEmployees : summary.institutions,
            )}
            icon={Calendar}
            deltaLabel={
              isAdmin
                ? `de ${formatInteger(employees.length)} cadastrados`
                : "emissoras das suas credenciais"
            }
          />
          <StatTile
            label="Vencendo em 90 dias"
            value={formatInteger(summary.expiringIn90)}
            icon={CalendarClock}
            deltaLabel={
              summary.expired > 0
                ? `${formatInteger(summary.expired)} já vencida(s)`
                : "nenhuma vencida"
            }
          />
        </section>

        <Card>
          <Card.Header>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <Card.Title>Lista de Certificações</Card.Title>
                <Card.Description>
                  {user?.tipo === "admin"
                    ? "Todas as certificações dos colaboradores"
                    : "Suas certificações"}
                </Card.Description>
              </div>
              <ModalForm
                isOpen={isAddDialogOpen}
                onOpenChange={(isOpen) => {
                  setIsAddDialogOpen(isOpen);
                  if (!isOpen) resetNewCertificationForm();
                }}
                title="Adicionar Nova Certificação"
                description="Registre uma nova certificação"
                trigger={
                  <Button>
                    <Plus />
                    Nova Certificação
                  </Button>
                }
                confirmLabel="Adicionar Certificação"
                onConfirm={addCertification}
              >
                {user?.tipo === "admin" && (
                  <ModalField label="Colaborador" htmlFor="employee">
                    <Select
                      aria-label="Colaborador"
                      value={newCertification.colaborador_id || null}
                      onChange={(key) =>
                        setNewCertification({
                          ...newCertification,
                          colaborador_id: key ? String(key) : "",
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
                )}

                <FieldRow>
                  <ModalField label="Nome da Certificação" htmlFor="name">
                    <Input
                      id="name"
                      value={newCertification.nome}
                      onChange={(e) =>
                        setNewCertification({
                          ...newCertification,
                          nome: e.target.value,
                        })
                      }
                      variant="secondary"
                      placeholder="Ex: AWS Solutions Architect"
                    />
                  </ModalField>

                  <ModalField label="Tipo" htmlFor="type">
                    <Select
                      aria-label="Tipo"
                      value={newCertification.tipo || null}
                      onChange={(key) =>
                        setNewCertification({
                          ...newCertification,
                          tipo: key ? String(key) : "",
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
                          {certificationTypes.map((type) => (
                            <ListBox.Item key={type} id={type} textValue={type}>
                              {type}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </ModalField>
                </FieldRow>

                <ModalField label="Instituição" htmlFor="institution">
                  <Input
                    id="institution"
                    value={newCertification.instituicao}
                    onChange={(e) =>
                      setNewCertification({
                        ...newCertification,
                        instituicao: e.target.value,
                      })
                    }
                    variant="secondary"
                    placeholder="Ex: Amazon Web Services"
                  />
                </ModalField>

                <FieldRow>
                  <ModalField label="Data de Obtenção" htmlFor="obtained_date">
                    <Input
                      id="obtained_date"
                      type="date"
                      value={newCertification.data_obtencao}
                      onChange={(e) =>
                        setNewCertification({
                          ...newCertification,
                          data_obtencao: e.target.value,
                        })
                      }
                      variant="secondary"
                    />
                  </ModalField>

                  <ModalField
                    label="Data de Vencimento (Opcional)"
                    htmlFor="expiration_date"
                  >
                    <Input
                      id="expiration_date"
                      type="date"
                      value={newCertification.data_vencimento}
                      onChange={(e) =>
                        setNewCertification({
                          ...newCertification,
                          data_vencimento: e.target.value,
                        })
                      }
                      variant="secondary"
                    />
                  </ModalField>
                </FieldRow>

                <ModalField
                  label="URL da Credencial (Opcional)"
                  htmlFor="credential_url"
                >
                  <Input
                    id="credential_url"
                    type="url"
                    value={newCertification.url_credencial}
                    onChange={(e) =>
                      setNewCertification({
                        ...newCertification,
                        url_credencial: e.target.value,
                      })
                    }
                    variant="secondary"
                    placeholder="https://..."
                  />
                </ModalField>

                <ModalField
                  label="Observações (Opcional)"
                  htmlFor="notes"
                >
                  <TextArea
                    id="notes"
                    value={newCertification.observacoes}
                    onChange={(e) =>
                      setNewCertification({
                        ...newCertification,
                        observacoes: e.target.value,
                      })
                    }
                    variant="secondary"
                    placeholder="Informações adicionais..."
                  />
                </ModalField>
              </ModalForm>
            </div>
          </Card.Header>
          <Card.Content>
            <DataTable
              columns={certificationColumns}
              data={certifications}
              label="Certificações"
              emptyMessage="Nenhuma certificação encontrada"
              total={filteredTotal}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(count) => {
                setItemsPerPage(count);
                setPage(1);
              }}
              search={appliedSearch}
              onSearchChange={(value) => {
                setAppliedSearch(value);
                setPage(1);
              }}
              searchPlaceholder="Pesquisar por certificação, colaborador ou instituição..."
              filters={certificationTypeFilter}
            />
          </Card.Content>
        </Card>

        <ModalForm
          isOpen={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            if (isOpen) setIsEditDialogOpen(true);
            else closeEditDialog();
          }}
          title="Editar Certificação"
          description="Atualize as informações da certificação"
          confirmLabel="Atualizar Certificação"
          onConfirm={editCertification}
        >
          <FieldRow>
            <ModalField label="Nome da Certificação" htmlFor="edit_name">
              <Input
                id="edit_name"
                value={editingCertification.nome}
                onChange={(e) =>
                  setEditingCertification({
                    ...editingCertification,
                    nome: e.target.value,
                  })
                }
                variant="secondary"
                placeholder="Ex: AWS Solutions Architect"
              />
            </ModalField>

            <ModalField label="Tipo" htmlFor="edit_type">
              <Select
                aria-label="Tipo"
                value={editingCertification.tipo || null}
                onChange={(key) =>
                  setEditingCertification({
                    ...editingCertification,
                    tipo: key ? String(key) : "",
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
                    {certificationTypes.map((type) => (
                      <ListBox.Item key={type} id={type} textValue={type}>
                        {type}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </ModalField>
          </FieldRow>

          <ModalField label="Instituição" htmlFor="edit_institution">
            <Input
              id="edit_institution"
              value={editingCertification.instituicao}
              onChange={(e) =>
                setEditingCertification({
                  ...editingCertification,
                  instituicao: e.target.value,
                })
              }
              variant="secondary"
              placeholder="Ex: Amazon Web Services"
            />
          </ModalField>

          <FieldRow>
            <ModalField label="Data de Obtenção" htmlFor="edit_obtained_date">
              <Input
                id="edit_obtained_date"
                type="date"
                value={editingCertification.data_obtencao}
                onChange={(e) =>
                  setEditingCertification({
                    ...editingCertification,
                    data_obtencao: e.target.value,
                  })
                }
                variant="secondary"
              />
            </ModalField>

            <ModalField
              label="Data de Vencimento (Opcional)"
              htmlFor="edit_expiration_date"
            >
              <Input
                id="edit_expiration_date"
                type="date"
                value={editingCertification.data_vencimento}
                onChange={(e) =>
                  setEditingCertification({
                    ...editingCertification,
                    data_vencimento: e.target.value,
                  })
                }
                variant="secondary"
              />
            </ModalField>
          </FieldRow>

          <ModalField
            label="URL da Credencial (Opcional)"
            htmlFor="edit_credential_url"
          >
            <Input
              id="edit_credential_url"
              type="url"
              value={editingCertification.url_credencial}
              onChange={(e) =>
                setEditingCertification({
                  ...editingCertification,
                  url_credencial: e.target.value,
                })
              }
              variant="secondary"
              placeholder="https://..."
            />
          </ModalField>

          <ModalField
            label="Observações (Opcional)"
            htmlFor="edit_notes"
          >
            <TextArea
              id="edit_notes"
              value={editingCertification.observacoes}
              onChange={(e) =>
                setEditingCertification({
                  ...editingCertification,
                  observacoes: e.target.value,
                })
              }
              variant="secondary"
              placeholder="Informações adicionais..."
            />
          </ModalField>
        </ModalForm>
      </PageLayout>
    </ProtectedRoute>
  );
}

"use client";

import { StatTile } from "@/components/dashboard/stat-tile";
import { daysUntil, formatInteger, formatPercent } from "@/components/dashboard/viz";
import { useConfirmation } from "@/components/confirmation";
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
  toast,
} from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  BarChart3,
  Building,
  Edit,
  Plus,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Employee {
  id: number;
  nome: string;
  email: string;
  departamento: string;
  cargo?: string;
  data_admissao?: string;
  status: "ativo" | "inativo";
  setor_id?: number;
  sector_name?: string;
}

interface Sector {
  id: number;
  nome: string;
  descricao?: string;
  total_employees?: number;
  manager?: string;
}

interface AdminEmployee {
  id: number;
  nome: string;
  email: string;
  tipo: "admin" | "user";
  departamento: string;
  cargo?: string;
  admin_permanente: boolean;
  admin_temporario_ate?: string | null;
  status: "ativo" | "inativo";
  created_at: string;
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const confirm = useConfirmation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);

  const [pagedSectors, setPagedSectors] = useState<Sector[]>([]);
  const [sectorsPage, setSectorsPage] = useState(1);
  const [sectorsTotalPages, setSectorsTotalPages] = useState(1);
  const [totalSectors, setTotalSectors] = useState(0);
  const [sectorsSearch, setSectorsSearch] = useState("");

  const [employeesPage, setEmployeesPage] = useState(1);
  const [employeesTotalPages, setEmployeesTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [adminUsersPage, setAdminUsersPage] = useState(1);
  const [adminUsersTotalPages, setAdminUsersTotalPages] = useState(1);
  const [totalAdminUsers, setTotalAdminUsers] = useState(0);
  const [adminUsersSearch, setAdminUsersSearch] = useState("");
  const [employeesSummary, setEmployeesSummary] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    departments: [] as string[],
  });
  const [adminsSummary, setAdminsSummary] = useState({ admins: 0 });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isAddSectorOpen, setIsAddSectorOpen] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    nome: "",
    email: "",
    departamento: "",
    cargo: "",
    setor_id: "",
  });
  const [newSector, setNewSector] = useState({
    nome: "",
    descricao: "",
  });

  const [adminEmployees, setAdminEmployees] = useState<AdminEmployee[]>([]);
  const [adminCandidates, setAdminCandidates] = useState<AdminEmployee[]>(
    [],
  );
  const [canManageAdmins, setCanManageAdmins] = useState(false);
  const [isAddAdminTempOpen, setIsAddAdminTempOpen] = useState(false);

  const [adminTempData, setAdminTempData] = useState({
    employeeId: "",
    adminUntil: "",
    accessType: "temporary" as "temporary" | "permanent",
  });

  const [isEditAdminOpen, setIsEditAdminOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminEmployee | null>(
    null,
  );
  const [editAdminData, setEditAdminData] = useState({
    adminUntil: "",
    accessType: "temporary" as "temporary" | "permanent",
  });

  const [isEditSectorOpen, setIsEditSectorOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [editSector, setEditSector] = useState({ name: "", description: "" });

  useEffect(() => {
    if (!user?.email) {
      return;
    }

    fetchData();
  }, [
    user?.email,
    employeesPage,
    sectorsPage,
    adminUsersPage,
    itemsPerPage,
    searchTerm,
    filterDepartment,
    sectorsSearch,
    adminUsersSearch,
  ]);

  const fetchData = async () => {
    try {
      const employeeParams = new URLSearchParams({
        page: String(employeesPage),
        limit: String(itemsPerPage),
      });
      if (searchTerm) employeeParams.set("search", searchTerm);
      if (filterDepartment !== "all")
        employeeParams.set("departamento", filterDepartment);

      const sectorParams = new URLSearchParams({
        page: String(sectorsPage),
        limit: String(itemsPerPage),
      });
      if (sectorsSearch) sectorParams.set("search", sectorsSearch);

      const userEmail = user?.email;

      const adminUserParams = new URLSearchParams({
        user_email: userEmail ?? "",
        page: String(adminUsersPage),
        limit: String(itemsPerPage),
      });
      if (adminUsersSearch) adminUserParams.set("search", adminUsersSearch);

      const [
        employeesRes,
        sectorsRes,
        pagedSectorsRes,
        adminUsersRes,
        adminCandidatesRes,
      ] = await Promise.all([
        fetch(`/api/colaboradores?${employeeParams}`),
        fetch("/api/admin/setores"),
        fetch(`/api/admin/setores?${sectorParams}`),
        userEmail
          ? fetch(`/api/admin/usuarios?${adminUserParams}`)
          : Promise.resolve(null),
        userEmail
          ? fetch(
              `/api/admin/usuarios?scope=candidates&user_email=${encodeURIComponent(userEmail)}`,
            )
          : Promise.resolve(null),
      ]);

      if (employeesRes.ok && sectorsRes.ok) {
        const employeesData = await employeesRes.json();
        const sectorsData = await sectorsRes.json();

        setEmployees(employeesData.data ?? []);
        setEmployeesTotalPages(employeesData.totalPages ?? 1);
        setTotalEmployees(employeesData.total ?? 0);
        if (employeesData.summary)
          setEmployeesSummary(employeesData.summary);

        setSectors(sectorsData);

        if (pagedSectorsRes.ok) {
          const pageData = await pagedSectorsRes.json();
          setPagedSectors(pageData.data ?? []);
          setSectorsTotalPages(pageData.totalPages ?? 1);
          setTotalSectors(pageData.total ?? 0);
        }

        if (adminUsersRes) {
          setCanManageAdmins(adminUsersRes.status !== 403);
        }

        if (adminUsersRes?.ok) {
          const adminUsersData = await adminUsersRes.json();
          setAdminEmployees(adminUsersData.data ?? []);
          setAdminUsersTotalPages(adminUsersData.totalPages ?? 1);
          setTotalAdminUsers(adminUsersData.total ?? 0);
          if (adminUsersData.summary)
            setAdminsSummary(adminUsersData.summary);
        }

        if (adminCandidatesRes?.ok) {
          const candidates = await adminCandidatesRes.json();
          setAdminCandidates(Array.isArray(candidates) ? candidates : []);
        }
      } else {
        toast.danger("Erro", {
          description: "Não foi possível carregar os dados",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.danger("Erro", {
        description: "Erro ao conectar com o servidor",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPages = () => {
    setEmployeesPage(1);
    setSectorsPage(1);
    setAdminUsersPage(1);
  };

  const employeeColumns: ColumnDef<Employee, any>[] = [
    {
      accessorKey: "nome",
      header: "Nome",
      cell: (info) => (
        <span className="font-medium">{String(info.getValue() ?? "")}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      meta: { className: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "departamento",
      header: "Departamento",
      cell: (info) => <Chip>{String(info.getValue() ?? "")}</Chip>,
    },
    {
      accessorKey: "sector_name",
      header: "Setor",
      cell: (info) => String(info.getValue() || "Não definido"),
      meta: { className: "hidden md:table-cell text-muted" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (info) => (
        <Chip>{info.getValue() === "ativo" ? "Ativo" : "Inativo"}</Chip>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            isIconOnly
            variant="outline"
            aria-label="Editar colaborador"
            onPress={() => {
              setSelectedEmployee(row.original);
              setIsEditEmployeeOpen(true);
            }}
          >
            <Edit />
          </Button>
          <Button
            isIconOnly
            variant={row.original.status === "ativo" ? "danger" : undefined}
            aria-label={
              row.original.status === "ativo"
                ? "Inativar colaborador"
                : "Reativar colaborador"
            }
            onPress={() => toggleEmployeeStatus(row.original.id)}
          >
            {row.original.status === "ativo" ? <Trash2 /> : <Users />}
          </Button>
        </div>
      ),
      meta: { align: "right" },
    },
  ];

  const sectorColumns: ColumnDef<Sector, any>[] = [
    {
      accessorKey: "nome",
      header: "Setor",
      cell: (info) => (
        <span className="font-medium">{String(info.getValue() ?? "")}</span>
      ),
    },
    {
      accessorKey: "descricao",
      header: "Descrição",
      cell: (info) => String(info.getValue() || "-"),
      meta: { className: "hidden md:table-cell text-muted" },
    },
    {
      accessorKey: "manager",
      header: "Responsável",
      cell: (info) => (
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {String(info.getValue() || "Não definido")}
        </span>
      ),
      meta: { className: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "total_employees",
      header: "Colaboradores",
      cell: (info) => <Chip>{Number(info.getValue() ?? 0)} pessoa(s)</Chip>,
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            isIconOnly
            variant="outline"
            aria-label="Editar setor"
            onPress={() => openSectorEdit(row.original)}
          >
            <Edit />
          </Button>
          <Button
            isIconOnly
            variant="danger"
            aria-label="Excluir setor"
            onPress={() => deleteSector(row.original)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
      meta: { align: "right" },
    },
  ];

  const adminUserColumns: ColumnDef<AdminEmployee, any>[] = [
    {
      accessorKey: "nome",
      header: "Nome",
      cell: (info) => (
        <span className="font-medium">{String(info.getValue() ?? "")}</span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      meta: { className: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "departamento",
      header: "Departamento",
      meta: { className: "hidden md:table-cell text-muted" },
    },
    {
      id: "admin_status",
      header: "Status Admin",
      cell: ({ row }) => {
        if (row.original.admin_permanente)
          return <Chip color="accent">Admin Permanente</Chip>;

        const days = daysUntil(row.original.admin_temporario_ate);
        if (days !== null && days < 0)
          return <Chip color="danger">Admin Expirado</Chip>;

        return <Chip color="warning">Admin Temporário</Chip>;
      },
    },
    {
      accessorKey: "admin_temporario_ate",
      header: "Admin até",
      cell: (info) =>
        info.getValue() ? (
          new Date(String(info.getValue())).toLocaleDateString("pt-BR")
        ) : (
          <span className="text-muted">-</span>
        ),
      meta: { className: "text-muted" },
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            isIconOnly
            variant="outline"
            aria-label="Editar privilégios de admin"
            onPress={() => openAdminEdit(row.original)}
          >
            <Edit />
          </Button>
          <Button
            isIconOnly
            variant="danger"
            aria-label="Remover privilégios de admin"
            onPress={() => removeAdmin(row.original)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
      meta: { align: "right" },
    },
  ];

  const departmentFilterSelect = (
    <Select
      selectedKey={filterDepartment}
      onSelectionChange={(key) => {
        setFilterDepartment(String(key));
        setEmployeesPage(1);
      }}
      variant="secondary"
      aria-label="Filtrar por departamento"
    >
      <Select.Trigger className="w-full sm:w-52">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="all" textValue="Todos os departamentos">
            Todos os departamentos
          </ListBox.Item>
          {employeesSummary.departments.map((dept) => (
            <ListBox.Item key={dept} id={dept} textValue={dept}>
              {dept}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );

  const addEmployee = async () => {
    if (
      !newEmployee.nome ||
      !newEmployee.email ||
      !newEmployee.departamento
    ) {
      toast.danger("Erro", {
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    try {
      const response = await fetch("/api/colaboradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newEmployee,
          setor_id: newEmployee.setor_id
            ? Number.parseInt(newEmployee.setor_id)
            : null,
        }),
      });

      if (response.ok) {
        fetchData();
        setIsAddEmployeeOpen(false);
        setNewEmployee({
          nome: "",
          email: "",
          departamento: "",
          cargo: "",
          setor_id: "",
        });

        toast("Colaborador adicionado!", {
          description: "Novo colaborador foi cadastrado com sucesso.",
        });
      } else {
        const error = await response.json();
        toast.danger("Erro", {
          description:
            error.error || "Não foi possível adicionar o colaborador.",
        });
      }
    } catch (error) {
      console.error("Erro ao adicionar colaborador:", error);
      toast.danger("Erro", {
        description: "Não foi possível adicionar o colaborador.",
      });
    }
  };

  const updateEmployee = async () => {
    if (!selectedEmployee) return;

    if (
      !selectedEmployee.nome.trim() ||
      !selectedEmployee.email.trim() ||
      !selectedEmployee.departamento
    ) {
      toast.danger("Erro", {
        description: "Nome, email e departamento são obrigatórios.",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/colaboradores/${selectedEmployee.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: selectedEmployee.nome,
            email: selectedEmployee.email,
            departamento: selectedEmployee.departamento,
            cargo: selectedEmployee.cargo ?? null,
            setor_id: selectedEmployee.setor_id ?? null,
          }),
        },
      );

      if (response.ok) {
        fetchData();
        setIsEditEmployeeOpen(false);
        setSelectedEmployee(null);

        toast("Colaborador atualizado!", {
          description: "Dados do colaborador foram atualizados com sucesso.",
        });
      } else {
        const error = await response.json();
        toast.danger("Erro", {
          description:
            error.error || "Não foi possível atualizar o colaborador.",
        });
      }
    } catch (error) {
      console.error("Erro ao editar colaborador:", error);
      toast.danger("Erro", {
        description: "Não foi possível atualizar o colaborador.",
      });
    }
  };

  const toggleEmployeeStatus = async (id: number) => {
    try {
      const employee = employees.find((c) => c.id === id);
      if (!employee) return;

      const response = await fetch(`/api/colaboradores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: employee.status === "ativo" ? "inativo" : "ativo",
        }),
      });

      if (response.ok) {
        fetchData();
        toast("Status atualizado!", {
          description: `Colaborador ${
            employee.status === "ativo" ? "inativado" : "ativado"
          } com sucesso.`,
        });
      } else {
        const error = await response.json();
        toast.danger("Erro", {
          description:
            error.error || "Não foi possível alterar o status do colaborador.",
        });
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.danger("Erro", {
        description: "Não foi possível alterar o status do colaborador.",
      });
    }
  };

  const addSector = async () => {
    if (!newSector.nome) {
      toast.danger("Erro", {
        description: "Nome do setor é obrigatório.",
      });
      return;
    }

    try {
      const response = await fetch("/api/admin/setores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSector),
      });

      if (response.ok) {
        fetchData();
        setIsAddSectorOpen(false);
        setNewSector({ nome: "", descricao: "" });

        toast("Setor adicionado!", {
          description: "Novo setor foi cadastrado com sucesso.",
        });
      } else {
        const error = await response.json();
        toast.danger("Erro", {
          description: error.error || "Não foi possível adicionar o setor.",
        });
      }
    } catch (error) {
      console.error("Erro ao adicionar setor:", error);
      toast.danger("Erro", {
        description: "Não foi possível adicionar o setor.",
      });
    }
  };

  const openSectorEdit = (sector: Sector) => {
    setEditingSector(sector);
    setEditSector({ name: sector.nome, description: sector.descricao ?? "" });
    setIsEditSectorOpen(true);
  };

  const updateSector = async () => {
    if (!editingSector) return;

    if (!editSector.name.trim()) {
      toast.danger("Erro", {
        description: "Nome do setor é obrigatório.",
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/setores/${editingSector.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editSector.name.trim(),
          descricao: editSector.description.trim(),
        }),
      });

      if (response.ok) {
        fetchData();
        setIsEditSectorOpen(false);
        setEditingSector(null);

        toast("Setor atualizado!", {
          description: "Os dados do setor foram atualizados com sucesso.",
        });
      } else {
        const error = await response.json();
        toast.danger("Erro", {
          description: error.error || "Não foi possível atualizar o setor.",
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar setor:", error);
      toast.danger("Erro", {
        description: "Não foi possível atualizar o setor.",
      });
    }
  };

  const deleteSector = async (sector: Sector) => {
    const confirmed = await confirm({
      title: "Excluir setor",
      description: `Tem certeza que deseja excluir o setor "${sector.nome}"? Essa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/setores/${sector.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
        toast("Setor excluído!", {
          description: `O setor "${sector.nome}" foi removido com sucesso.`,
        });
      } else {
        const error = await response.json();
        toast.danger("Erro", {
          description: error.error || "Não foi possível excluir o setor.",
        });
      }
    } catch (error) {
      console.error("Erro ao excluir setor:", error);
      toast.danger("Erro", {
        description: "Não foi possível excluir o setor.",
      });
    }
  };

  const saveAdminPrivileges = async (
    employeeId: number,
    values: { accessType: "temporary" | "permanent"; adminUntil: string },
    onDone: () => void,
  ) => {
    const isPermanent = values.accessType === "permanent";

    if (!isPermanent && !values.adminUntil) {
      toast.danger("Erro", {
        description: "Informe até quando o acesso de admin é válido.",
      });
      return;
    }

    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaborador_id: employeeId,
          admin_permanente: isPermanent,
          admin_until: isPermanent ? null : values.adminUntil,
          user_email: user?.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchData();
        onDone();

        toast("Privilégios atualizados!", {
          description: data.message,
        });
      } else {
        toast.danger("Erro", {
          description:
            data.error || "Não foi possível salvar os privilégios de admin.",
        });
      }
    } catch (error) {
      console.error("Erro ao salvar privilégios de admin:", error);
      toast.danger("Erro", {
        description: "Não foi possível salvar os privilégios de admin.",
      });
    }
  };

  const assignAdmin = async () => {
    if (!adminTempData.employeeId) {
      toast.danger("Erro", {
        description: "Selecione um colaborador.",
      });
      return;
    }

    await saveAdminPrivileges(
      Number(adminTempData.employeeId),
      adminTempData,
      () => {
        setIsAddAdminTempOpen(false);
        setAdminTempData({
          employeeId: "",
          adminUntil: "",
          accessType: "temporary",
        });
      },
    );
  };

  const openAdminEdit = (employee: AdminEmployee) => {
    setEditingAdmin(employee);
    setEditAdminData({
      accessType: employee.admin_permanente ? "permanent" : "temporary",
      adminUntil: employee.admin_temporario_ate
        ? String(employee.admin_temporario_ate).slice(0, 10)
        : "",
    });
    setIsEditAdminOpen(true);
  };

  const closeAdminEdit = () => {
    setIsEditAdminOpen(false);
    setEditingAdmin(null);
    setEditAdminData({ adminUntil: "", accessType: "temporary" });
  };

  const updateAdmin = async () => {
    if (!editingAdmin) return;

    await saveAdminPrivileges(
      editingAdmin.id,
      editAdminData,
      closeAdminEdit,
    );
  };

  const removeAdmin = async (employee: AdminEmployee) => {
    const confirmed = await confirm({
      title: "Remover acesso de admin",
      description: `Tem certeza que deseja remover os privilégios de admin de ${employee.nome}?`,
      confirmLabel: "Remover acesso",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/admin/usuarios?colaborador_id=${employee.id}&user_email=${encodeURIComponent(user?.email ?? "")}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (response.ok) {
        fetchData();
        toast("Privilégios removidos!", {
          description: data.message,
        });
      } else {
        toast.danger("Erro", {
          description: data.error || "Não foi possível remover privilégios.",
        });
      }
    } catch (error) {
      console.error("Erro ao remover privilégios de admin:", error);
      toast.danger("Erro", {
        description: "Não foi possível remover privilégios.",
      });
    }
  };

  const uniqueDepartments = employeesSummary.departments;
  const activeEmployees = employeesSummary.active;

  const activityRate =
    employees.length > 0
      ? (activeEmployees / employeesSummary.total) * 100
      : 0;
  const totalAdmins = adminsSummary.admins;

  const availableAdminCandidates = adminCandidates;

  const visibleTemporaryAdmins = adminEmployees.filter((c) => {
    const days = daysUntil(c.admin_temporario_ate);
    return !c.admin_permanente && days !== null && days >= 0;
  }).length;

  const isPermanentAdmin = canManageAdmins;

  if (loading) {
    return (
      <ProtectedRoute>
        <ScreenSpinner />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <PageLayout>
        <PageHeader
          title="Painel Administrativo"
          description="Gerencie colaboradores e setores da empresa"
          backHref="/"
        />

        <section
          aria-label="Indicadores do quadro"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatTile
            label="Colaboradores"
            value={formatInteger(employeesSummary.total)}
            icon={Users}
            deltaLabel={`${formatInteger(employeesSummary.inactive)} inativo(s) no cadastro`}
          />
          <StatTile
            label="Quadro ativo"
            value={formatPercent(activityRate, 0)}
            icon={TrendingUp}
            deltaLabel={`${formatInteger(activeEmployees)} de ${formatInteger(employeesSummary.total)} colaboradores`}
          />
          <StatTile
            label="Setores"
            value={formatInteger(totalSectors)}
            icon={Building}
            deltaLabel={`${formatInteger(uniqueDepartments.length)} departamento(s) distintos`}
          />
          <StatTile
            label="Administradores"
            value={formatInteger(totalAdmins)}
            icon={BarChart3}
            deltaLabel={
              visibleTemporaryAdmins > 0
                ? `${formatInteger(visibleTemporaryAdmins)} temporário(s) nesta página`
                : "nenhum temporário nesta página"
            }
          />
        </section>

        <Tabs defaultSelectedKey="employees" className="gap-4">
          <Tabs.ListContainer>
            <Tabs.List className="grid w-full grid-cols-1 sm:grid-cols-3">
              <Tabs.Tab id="employees">
                Colaboradores
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="sectors">
                Setores
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="admin-users">
                Usuários Admin
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel className="p-0" id="employees">
            <Card>
              <Card.Header>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <Card.Title>Gerenciar Colaboradores</Card.Title>
                    <Card.Description>
                      Cadastre e gerencie todos os colaboradores da empresa
                    </Card.Description>
                  </div>
                  <ModalForm
                    isOpen={isAddEmployeeOpen}
                    onOpenChange={(open) => {
                      setIsAddEmployeeOpen(open);
                      if (!open)
                        setNewEmployee({
                          nome: "",
                          email: "",
                          departamento: "",
                          cargo: "",
                          setor_id: "",
                        });
                    }}
                    title="Adicionar Novo Colaborador"
                    description="Cadastre um novo colaborador na empresa"
                    trigger={
                      <Button>
                        <UserPlus />
                        Novo Colaborador
                      </Button>
                    }
                    confirmLabel="Cadastrar Colaborador"
                    onConfirm={addEmployee}
                  >
                    <FieldRow>
                      <ModalField label="Nome Completo" htmlFor="name">
                        <Input
                          id="name"
                          value={newEmployee.nome}
                          onChange={(e) =>
                            setNewEmployee({
                              ...newEmployee,
                              nome: e.target.value,
                            })
                          }
                          variant="secondary"
                          placeholder="Nome do colaborador"
                        />
                      </ModalField>

                      <ModalField label="Email" htmlFor="email">
                        <Input
                          id="email"
                          type="email"
                          value={newEmployee.email}
                          onChange={(e) =>
                            setNewEmployee({
                              ...newEmployee,
                              email: e.target.value,
                            })
                          }
                          variant="secondary"
                          placeholder="email@empresa.com"
                        />
                      </ModalField>
                    </FieldRow>

                    <FieldRow>
                      <ModalField
                        label="Departamento"
                        htmlFor="department"
                      >
                        <Select
                          aria-label="Departamento"
                          value={newEmployee.departamento || null}
                          onChange={(key) =>
                            setNewEmployee({
                              ...newEmployee,
                              departamento: key ? String(key) : "",
                            })
                          }
                          variant="secondary"
                          placeholder="Selecione o departamento"
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item id="TI" textValue="TI">
                                TI
                              </ListBox.Item>
                              <ListBox.Item id="RH" textValue="RH">
                                RH
                              </ListBox.Item>
                              <ListBox.Item id="Vendas" textValue="Vendas">
                                Vendas
                              </ListBox.Item>
                              <ListBox.Item
                                id="Marketing"
                                textValue="Marketing"
                              >
                                Marketing
                              </ListBox.Item>
                              <ListBox.Item
                                id="Financeiro"
                                textValue="Financeiro"
                              >
                                Financeiro
                              </ListBox.Item>
                              <ListBox.Item
                                id="Operações"
                                textValue="Operações"
                              >
                                Operações
                              </ListBox.Item>
                              <ListBox.Item
                                id="Jurídico"
                                textValue="Jurídico"
                              >
                                Jurídico
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </ModalField>

                      <ModalField label="Cargo" htmlFor="job-title">
                        <Input
                          id="job-title"
                          value={newEmployee.cargo}
                          onChange={(e) =>
                            setNewEmployee({
                              ...newEmployee,
                              cargo: e.target.value,
                            })
                          }
                          variant="secondary"
                          placeholder="Ex: Analista, Gerente, Coordenador..."
                        />
                      </ModalField>
                    </FieldRow>

                    <ModalField label="Setor" htmlFor="sector">
                      <Select
                        aria-label="Setor"
                        value={newEmployee.setor_id || null}
                        onChange={(key) =>
                          setNewEmployee({
                            ...newEmployee,
                            setor_id: key ? String(key) : "",
                          })
                        }
                        variant="secondary"
                        placeholder="Selecione o setor"
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {sectors.map((sector) => (
                              <ListBox.Item
                                key={sector.id}
                                id={sector.id.toString()}
                                textValue={sector.nome}
                              >
                                {sector.nome}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </ModalField>
                  </ModalForm>
                </div>
              </Card.Header>
              <Card.Content>
                <DataTable
                  columns={employeeColumns}
                  data={employees}
                  label="Colaboradores"
                  emptyMessage="Nenhum colaborador encontrado"
                  total={totalEmployees}
                  page={employeesPage}
                  totalPages={employeesTotalPages}
                  onPageChange={setEmployeesPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    resetPages();
                  }}
                  search={searchTerm}
                  onSearchChange={(value) => {
                    setSearchTerm(value);
                    setEmployeesPage(1);
                  }}
                  searchPlaceholder="Pesquisar por nome ou email..."
                  filters={departmentFilterSelect}
                />
              </Card.Content>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel className="p-0" id="sectors">
            <Card>
              <Card.Header>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <Card.Title>Gerenciar Setores</Card.Title>
                    <Card.Description>
                      Visualize e organize os setores da empresa
                    </Card.Description>
                  </div>
                  <ModalForm
                    isOpen={isAddSectorOpen}
                    onOpenChange={(open) => {
                      setIsAddSectorOpen(open);
                      if (!open) setNewSector({ nome: "", descricao: "" });
                    }}
                    title="Adicionar Novo Setor"
                    description="Crie um novo setor para organizar os colaboradores"
                    trigger={
                      <Button>
                        <Plus />
                        Novo Setor
                      </Button>
                    }
                    confirmLabel="Criar Setor"
                    onConfirm={addSector}
                  >
                    <ModalField label="Nome do Setor" htmlFor="sector-name">
                      <Input
                        id="sector-name"
                        value={newSector.nome}
                        onChange={(e) =>
                          setNewSector({
                            ...newSector,
                            nome: e.target.value,
                          })
                        }
                        variant="secondary"
                        placeholder="Ex: Desenvolvimento, Suporte..."
                      />
                    </ModalField>

                    <ModalField label="Descrição" htmlFor="sector-description">
                      <Input
                        id="sector-description"
                        value={newSector.descricao}
                        onChange={(e) =>
                          setNewSector({
                            ...newSector,
                            descricao: e.target.value,
                          })
                        }
                        variant="secondary"
                        placeholder="Breve descrição do setor"
                      />
                    </ModalField>
                  </ModalForm>
                </div>
              </Card.Header>

              <Card.Content>
                <DataTable
                  columns={sectorColumns}
                  data={pagedSectors}
                  label="Setores"
                  emptyMessage="Nenhum setor cadastrado"
                  total={totalSectors}
                  page={sectorsPage}
                  totalPages={sectorsTotalPages}
                  onPageChange={setSectorsPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(items) => {
                    setItemsPerPage(items);
                    resetPages();
                  }}
                  search={sectorsSearch}
                  onSearchChange={(value) => {
                    setSectorsSearch(value);
                    setSectorsPage(1);
                  }}
                  searchPlaceholder="Pesquisar por setor ou descrição..."
                />
              </Card.Content>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel className="p-0" id="admin-users">
            {isPermanentAdmin ? (
              <Card>
                <Card.Header>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <Card.Title>Gerenciar Usuários Admin</Card.Title>
                      <Card.Description>
                        Administradores permanentes e temporários do sistema
                      </Card.Description>
                    </div>
                    <ModalForm
                      isOpen={isAddAdminTempOpen}
                      onOpenChange={(open) => {
                        setIsAddAdminTempOpen(open);
                        if (!open)
                          setAdminTempData({
                            employeeId: "",
                            adminUntil: "",
                            accessType: "temporary",
                          });
                      }}
                      title="Definir Admin"
                      description="Conceda privilégios administrativos a um colaborador, com ou sem prazo"
                      trigger={
                        <Button>
                          <UserPlus />
                          Definir Admin
                        </Button>
                      }
                      confirmLabel="Definir Admin"
                      onConfirm={assignAdmin}
                    >
                      <ModalField
                        label="Colaborador"
                        htmlFor="admin-employee"
                      >
                        <Select
                          aria-label="Colaborador"
                          value={adminTempData.employeeId || null}
                          onChange={(key) =>
                            setAdminTempData({
                              ...adminTempData,
                              employeeId: key ? String(key) : "",
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
                              {availableAdminCandidates.map((employee) => (
                                <ListBox.Item
                                  key={employee.id}
                                  id={employee.id.toString()}
                                  textValue={`${employee.nome} (${employee.email})`}
                                >
                                  {employee.nome} ({employee.email})
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>

                        {availableAdminCandidates.length === 0 && (
                          <p className="text-sm text-muted">
                            Nenhum colaborador disponível para receber acesso de
                            admin.
                          </p>
                        )}
                      </ModalField>

                      <ModalField
                        label="Tipo de acesso"
                        htmlFor="admin-access-type"
                      >
                        <Select
                          aria-label="Tipo de acesso"
                          value={adminTempData.accessType}
                          onChange={(key) =>
                            setAdminTempData({
                              ...adminTempData,
                              accessType:
                                key === "permanent"
                                  ? "permanent"
                                  : "temporary",
                              adminUntil:
                                key === "permanent"
                                  ? ""
                                  : adminTempData.adminUntil,
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
                              <ListBox.Item
                                id="temporary"
                                textValue="Temporário (com prazo)"
                              >
                                Temporário (com prazo)
                              </ListBox.Item>
                              <ListBox.Item
                                id="permanent"
                                textValue="Permanente (sem prazo)"
                              >
                                Permanente (sem prazo)
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </ModalField>

                      {adminTempData.accessType === "temporary" ? (
                        <ModalField label="Admin até" htmlFor="admin-until">
                          <Input
                            id="admin-until"
                            type="date"
                            value={adminTempData.adminUntil}
                            onChange={(e) =>
                              setAdminTempData({
                                ...adminTempData,
                                adminUntil: e.target.value,
                              })
                            }
                            min={new Date().toISOString().split("T")[0]}
                            variant="secondary"
                          />
                        </ModalField>
                      ) : (
                        <p className="text-sm text-muted">
                          Admin permanente não expira e só pode ser revogado
                          manualmente nesta tela.
                        </p>
                      )}
                    </ModalForm>
                  </div>
                </Card.Header>
                <Card.Content>
                  <DataTable
                    columns={adminUserColumns}
                    data={adminEmployees}
                    label="Usuários admin"
                    emptyMessage="Nenhum administrador encontrado"
                    total={totalAdminUsers}
                    page={adminUsersPage}
                    totalPages={adminUsersTotalPages}
                    onPageChange={setAdminUsersPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(items) => {
                      setItemsPerPage(items);
                      resetPages();
                    }}
                    search={adminUsersSearch}
                    onSearchChange={(value) => {
                      setAdminUsersSearch(value);
                      setAdminUsersPage(1);
                    }}
                    searchPlaceholder="Pesquisar por nome ou email..."
                  />
                </Card.Content>
              </Card>
            ) : (
              <Card>
                <Card.Content className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Acesso Restrito
                  </h3>
                  <p className="text-center">
                    Apenas administradores permanentes podem gerenciar usuários
                    admin.
                  </p>
                </Card.Content>
              </Card>
            )}
          </Tabs.Panel>
        </Tabs>

        <ModalForm
          isOpen={isEditAdminOpen}
          onOpenChange={(open) => {
            if (open) setIsEditAdminOpen(true);
            else closeAdminEdit();
          }}
          title="Editar Acesso de Admin"
          description={
            editingAdmin
              ? `Ajuste o acesso de ${editingAdmin.nome}`
              : "Ajuste o acesso do administrador"
          }
          confirmLabel="Salvar Alterações"
          onConfirm={updateAdmin}
        >
          <ModalField
            label="Tipo de acesso"
            htmlFor="edit-admin-access-type"
          >
            <Select
              aria-label="Tipo de acesso"
              value={editAdminData.accessType}
              onChange={(key) =>
                setEditAdminData({
                  ...editAdminData,
                  accessType:
                    key === "permanent" ? "permanent" : "temporary",
                  adminUntil:
                    key === "permanent" ? "" : editAdminData.adminUntil,
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
                  <ListBox.Item
                    id="temporary"
                    textValue="Temporário (com prazo)"
                  >
                    Temporário (com prazo)
                  </ListBox.Item>
                  <ListBox.Item
                    id="permanent"
                    textValue="Permanente (sem prazo)"
                  >
                    Permanente (sem prazo)
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </ModalField>

          {editAdminData.accessType === "temporary" ? (
            <ModalField label="Admin até" htmlFor="edit-admin-until">
              <Input
                id="edit-admin-until"
                type="date"
                value={editAdminData.adminUntil}
                onChange={(e) =>
                  setEditAdminData({
                    ...editAdminData,
                    adminUntil: e.target.value,
                  })
                }
                min={new Date().toISOString().split("T")[0]}
                variant="secondary"
              />
            </ModalField>
          ) : (
            <p className="text-sm text-muted">
              Admin permanente não expira e só pode ser revogado manualmente
              nesta tela.
            </p>
          )}
        </ModalForm>

        <ModalForm
          isOpen={isEditSectorOpen}
          onOpenChange={(open) => {
            setIsEditSectorOpen(open);
            if (!open) {
              setEditingSector(null);
              setEditSector({ name: "", description: "" });
            }
          }}
          title="Editar Setor"
          description="Atualize o nome e a descrição do setor"
          confirmLabel="Salvar Alterações"
          onConfirm={updateSector}
        >
          <ModalField label="Nome do Setor" htmlFor="edit-sector-name">
            <Input
              id="edit-sector-name"
              value={editSector.name}
              onChange={(e) =>
                setEditSector({ ...editSector, name: e.target.value })
              }
              variant="secondary"
              placeholder="Ex: Desenvolvimento, Suporte..."
            />
          </ModalField>

          <ModalField label="Descrição" htmlFor="edit-sector-description">
            <Input
              id="edit-sector-description"
              value={editSector.description}
              onChange={(e) =>
                setEditSector({
                  ...editSector,
                  description: e.target.value,
                })
              }
              variant="secondary"
              placeholder="Breve descrição do setor"
            />
          </ModalField>
        </ModalForm>

        <ModalForm
          isOpen={isEditEmployeeOpen}
          onOpenChange={(open) => {
            setIsEditEmployeeOpen(open);
            if (!open) setSelectedEmployee(null);
          }}
          title="Editar Colaborador"
          description="Atualize os dados do colaborador"
          confirmLabel="Salvar Alterações"
          onConfirm={updateEmployee}
        >
          {selectedEmployee && (
            <>
              <FieldRow>
                <ModalField label="Nome Completo" htmlFor="edit-name">
                  <Input
                    id="edit-name"
                    value={selectedEmployee.nome}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        nome: e.target.value,
                      })
                    }
                    variant="secondary"
                  />
                </ModalField>

                <ModalField label="Email" htmlFor="edit-email">
                  <Input
                    id="edit-email"
                    type="email"
                    value={selectedEmployee.email}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        email: e.target.value,
                      })
                    }
                    variant="secondary"
                  />
                </ModalField>
              </FieldRow>

              <FieldRow>
                <ModalField
                  label="Departamento"
                  htmlFor="edit-department"
                >
                  <Select
                    aria-label="Departamento"
                    value={selectedEmployee.departamento || null}
                    onChange={(key) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        departamento: key ? String(key) : "",
                      })
                    }
                    variant="secondary"
                    placeholder="Selecione o departamento"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="TI" textValue="TI">
                          TI
                        </ListBox.Item>
                        <ListBox.Item id="RH" textValue="RH">
                          RH
                        </ListBox.Item>
                        <ListBox.Item id="Vendas" textValue="Vendas">
                          Vendas
                        </ListBox.Item>
                        <ListBox.Item id="Marketing" textValue="Marketing">
                          Marketing
                        </ListBox.Item>
                        <ListBox.Item id="Financeiro" textValue="Financeiro">
                          Financeiro
                        </ListBox.Item>
                        <ListBox.Item id="Operações" textValue="Operações">
                          Operações
                        </ListBox.Item>
                        <ListBox.Item id="Jurídico" textValue="Jurídico">
                          Jurídico
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </ModalField>

                <ModalField label="Cargo" htmlFor="edit-job-title">
                  <Input
                    id="edit-job-title"
                    value={selectedEmployee.cargo || ""}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        cargo: e.target.value,
                      })
                    }
                    variant="secondary"
                  />
                </ModalField>
              </FieldRow>

              <ModalField label="Setor" htmlFor="edit-sector">
                <Select
                  value={selectedEmployee.setor_id?.toString() || "0"}
                  onChange={(value) =>
                    setSelectedEmployee({
                      ...selectedEmployee,
                      setor_id:
                        value && value !== "0"
                          ? Number.parseInt(value as string)
                          : undefined,
                    })
                  }
                  variant="secondary"
                  placeholder="Selecione o setor"
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="0" textValue="Nenhum">
                        Nenhum
                      </ListBox.Item>
                      {sectors.map((sector) => (
                        <ListBox.Item
                          key={sector.id}
                          id={sector.id.toString()}
                          textValue={sector.nome}
                        >
                          {sector.nome}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </ModalField>
            </>
          )}
        </ModalForm>
      </PageLayout>
    </ProtectedRoute>
  );
}

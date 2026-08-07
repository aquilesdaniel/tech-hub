"use client";

import { StatTile } from "@/components/dashboard/stat-tile";
import { diasAte, inteiro, percentual } from "@/components/dashboard/viz";
import { DataTable } from "@/components/data-table";
import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { SpinnerTela } from "@/components/spinner-tela";
import { useAuth } from "@/contexts/auth-context";
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
  toast
} from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Building,
  Edit,
  Plus,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Colaborador {
  id: number;
  nome: string;
  email: string;
  departamento: string;
  cargo?: string;
  data_admissao?: string;
  status: "ativo" | "inativo";
  setor_id?: number;
  setor_nome?: string;
}

interface Setor {
  id: number;
  nome: string;
  descricao?: string;
  total_colaboradores?: number;
  responsavel?: string;
}

interface ColaboradorAdmin {
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
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);

  const [setoresPagina, setSetoresPagina] = useState<Setor[]>([]);
  const [paginaSetores, setPaginaSetores] = useState(1);
  const [totalPaginasSetores, setTotalPaginasSetores] = useState(1);
  const [totalSetores, setTotalSetores] = useState(0);
  const [buscaSetores, setBuscaSetores] = useState("");

  const [paginaColaboradores, setPaginaColaboradores] = useState(1);
  const [totalPaginasColaboradores, setTotalPaginasColaboradores] = useState(1);
  const [totalColaboradores, setTotalColaboradores] = useState(0);
  const [paginaUsuariosAdmin, setPaginaUsuariosAdmin] = useState(1);
  const [totalPaginasUsuariosAdmin, setTotalPaginasUsuariosAdmin] = useState(1);
  const [totalUsuariosAdmin, setTotalUsuariosAdmin] = useState(0);
  const [buscaUsuariosAdmin, setBuscaUsuariosAdmin] = useState("");
  const [resumoColaboradores, setResumoColaboradores] = useState({
    total: 0,
    ativos: 0,
    inativos: 0,
    departamentos: [] as string[],
  });
  const [resumoAdmins, setResumoAdmins] = useState({ admins: 0 });
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartamento, setFilterDepartamento] = useState("todos");
  const [isAddColaboradorOpen, setIsAddColaboradorOpen] = useState(false);
  const [isAddSetorOpen, setIsAddSetorOpen] = useState(false);
  const [isEditColaboradorOpen, setIsEditColaboradorOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] =
    useState<Colaborador | null>(null);
  const [newColaborador, setNewColaborador] = useState({
    nome: "",
    email: "",
    departamento: "",
    cargo: "",
    setor_id: "",
  });
  const [newSetor, setNewSetor] = useState({
    nome: "",
    descricao: "",
  });

  const [colaboradoresAdmin, setColaboradoresAdmin] = useState<
    ColaboradorAdmin[]
  >([]);
  const [isAddAdminTempOpen, setIsAddAdminTempOpen] = useState(false);

  const [adminTempData, setAdminTempData] = useState({
    colaborador_id: "",
    admin_ate: "",
  });

  useEffect(() => {
    fetchData();
  }, [
    paginaColaboradores,
    paginaSetores,
    paginaUsuariosAdmin,
    itensPorPagina,
    searchTerm,
    filterDepartamento,
    buscaSetores,
    buscaUsuariosAdmin,
  ]);

  const fetchData = async () => {
    try {
      const paramsColaboradores = new URLSearchParams({
        page: String(paginaColaboradores),
        limit: String(itensPorPagina),
      });
      if (searchTerm) paramsColaboradores.set("search", searchTerm);
      if (filterDepartamento !== "todos")
        paramsColaboradores.set("departamento", filterDepartamento);

      const paramsSetores = new URLSearchParams({
        page: String(paginaSetores),
        limit: String(itensPorPagina),
      });
      if (buscaSetores) paramsSetores.set("search", buscaSetores);

      const paramsUsuarios = new URLSearchParams({
        user_email: user?.email ?? "",
        page: String(paginaUsuariosAdmin),
        limit: String(itensPorPagina),
      });
      if (buscaUsuariosAdmin) paramsUsuarios.set("search", buscaUsuariosAdmin);

      const [colaboradoresRes, setoresRes, setoresPaginaRes, usuariosAdminRes] =
        await Promise.all([
          fetch(`/api/colaboradores?${paramsColaboradores}`),
          fetch("/api/admin/setores"),
          fetch(`/api/admin/setores?${paramsSetores}`),
          fetch(`/api/admin/usuarios?${paramsUsuarios}`),
        ]);

      if (colaboradoresRes.ok && setoresRes.ok) {
        const colaboradoresData = await colaboradoresRes.json();
        const setoresData = await setoresRes.json();

        setColaboradores(colaboradoresData.data ?? []);
        setTotalPaginasColaboradores(colaboradoresData.totalPages ?? 1);
        setTotalColaboradores(colaboradoresData.total ?? 0);
        if (colaboradoresData.resumo)
          setResumoColaboradores(colaboradoresData.resumo);

        setSetores(setoresData);

        if (setoresPaginaRes.ok) {
          const pagina = await setoresPaginaRes.json();
          setSetoresPagina(pagina.data ?? []);
          setTotalPaginasSetores(pagina.totalPages ?? 1);
          setTotalSetores(pagina.total ?? 0);
        }

        if (usuariosAdminRes.ok) {
          const usuariosAdminData = await usuariosAdminRes.json();
          setColaboradoresAdmin(usuariosAdminData.data ?? []);
          setTotalPaginasUsuariosAdmin(usuariosAdminData.totalPages ?? 1);
          setTotalUsuariosAdmin(usuariosAdminData.total ?? 0);
          if (usuariosAdminData.resumo)
            setResumoAdmins(usuariosAdminData.resumo);
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

  const reiniciarPaginas = () => {
    setPaginaColaboradores(1);
    setPaginaSetores(1);
    setPaginaUsuariosAdmin(1);
  };

  const colunasColaboradores: ColumnDef<Colaborador, any>[] = [
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
      meta: { classe: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "departamento",
      header: "Departamento",
      cell: (info) => <Chip>{String(info.getValue() ?? "")}</Chip>,
    },
    {
      accessorKey: "setor_nome",
      header: "Setor",
      cell: (info) => String(info.getValue() || "Não definido"),
      meta: { classe: "hidden md:table-cell text-muted" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (info) => (
        <Chip>{info.getValue() === "ativo" ? "Ativo" : "Inativo"}</Chip>
      ),
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            aria-label="Editar colaborador"
            onPress={() => {
              setSelectedColaborador(row.original);
              setIsEditColaboradorOpen(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant={row.original.status === "ativo" ? "danger" : undefined}
            size="sm"
            aria-label={
              row.original.status === "ativo"
                ? "Inativar colaborador"
                : "Reativar colaborador"
            }
            onPress={() => inativarColaborador(row.original.id)}
          >
            {row.original.status === "ativo" ? (
              <Trash2 className="w-4 h-4" />
            ) : (
              <Users className="w-4 h-4" />
            )}
          </Button>
        </div>
      ),
      meta: { alinhar: "direita" },
    },
  ];

  const colunasSetores: ColumnDef<Setor, any>[] = [
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
      meta: { classe: "hidden md:table-cell text-muted" },
    },
    {
      accessorKey: "responsavel",
      header: "Responsável",
      cell: (info) => (
        <span className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          {String(info.getValue() || "Não definido")}
        </span>
      ),
      meta: { classe: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "total_colaboradores",
      header: "Colaboradores",
      cell: (info) => <Chip>{Number(info.getValue() ?? 0)} pessoa(s)</Chip>,
      meta: { alinhar: "direita" },
    },
  ];

  const colunasUsuariosAdmin: ColumnDef<ColaboradorAdmin, any>[] = [
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
      meta: { classe: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "departamento",
      header: "Departamento",
      meta: { classe: "hidden md:table-cell text-muted" },
    },
    {
      id: "status_admin",
      header: "Status Admin",
      cell: ({ row }) =>
        row.original.admin_permanente ? (
          <Chip color="accent">Admin Permanente</Chip>
        ) : row.original.tipo === "admin" ? (
          <Chip color="warning">Admin Temporário</Chip>
        ) : (
          <Chip>Usuário</Chip>
        ),
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
      meta: { classe: "text-muted" },
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) =>
        !row.original.admin_permanente && row.original.tipo === "admin" ? (
          <Button
            variant="danger"
            size="sm"
            onPress={() => removerAdminTemporario(row.original.id)}
          >
            <Trash2 className="w-4 h-4" />
            Remover admin
          </Button>
        ) : null,
      meta: { alinhar: "direita" },
    },
  ];

  const filtroDepartamentoSelect = (
    <Select
      selectedKey={filterDepartamento}
      onSelectionChange={(chave) => {
        setFilterDepartamento(String(chave));
        setPaginaColaboradores(1);
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
          <ListBox.Item id="todos" textValue="Todos os departamentos">
            Todos os departamentos
          </ListBox.Item>
          {resumoColaboradores.departamentos.map((dept) => (
            <ListBox.Item key={dept} id={dept} textValue={dept}>
              {dept}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );

  const adicionarColaborador = async () => {
    if (
      !newColaborador.nome ||
      !newColaborador.email ||
      !newColaborador.departamento
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
          ...newColaborador,
          setor_id: newColaborador.setor_id
            ? Number.parseInt(newColaborador.setor_id)
            : null,
        }),
      });

      if (response.ok) {
        fetchData();
        setIsAddColaboradorOpen(false);
        setNewColaborador({
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

  const editarColaborador = async () => {
    if (!selectedColaborador) return;

    try {
      const response = await fetch(
        `/api/colaboradores/${selectedColaborador.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...selectedColaborador,
            setor_id: selectedColaborador.setor_id || null,
          }),
        },
      );

      if (response.ok) {
        fetchData();
        setIsEditColaboradorOpen(false);
        setSelectedColaborador(null);

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

  const inativarColaborador = async (id: number) => {
    try {
      const colaborador = colaboradores.find((c) => c.id === id);
      if (!colaborador) return;

      const response = await fetch(`/api/colaboradores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: colaborador.status === "ativo" ? "inativo" : "ativo",
        }),
      });

      if (response.ok) {
        fetchData();
        toast("Status atualizado!", {
          description: `Colaborador ${
            colaborador.status === "ativo" ? "inativado" : "ativado"
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

  const adicionarSetor = async () => {
    if (!newSetor.nome) {
      toast.danger("Erro", {
        description: "Nome do setor é obrigatório.",
      });
      return;
    }

    try {
      const response = await fetch("/api/admin/setores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSetor),
      });

      if (response.ok) {
        fetchData();
        setIsAddSetorOpen(false);
        setNewSetor({ nome: "", descricao: "" });

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

  const definirAdminTemporario = async () => {
    if (!adminTempData.colaborador_id || !adminTempData.admin_ate) {
      toast.danger("Erro", {
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    try {
      const response = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...adminTempData,
          user_email: user?.email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        fetchData();
        setIsAddAdminTempOpen(false);
        setAdminTempData({ colaborador_id: "", admin_ate: "" });

        toast("Admin temporário definido!", {
          description: data.message,
        });
      } else {
        const error = await response.json();
        toast.danger("Erro", {
          description:
            error.error || "Não foi possível definir admin temporário.",
        });
      }
    } catch (error) {
      console.error("Erro ao definir admin temporário:", error);
      toast.danger("Erro", {
        description: "Não foi possível definir admin temporário.",
      });
    }
  };

  const removerAdminTemporario = async (colaboradorId: number) => {
    if (
      !confirm(
        "Tem certeza que deseja remover os privilégios de admin deste colaborador?",
      )
    )
      return;

    try {
      const response = await fetch(
        `/api/admin/usuarios?colaborador_id=${colaboradorId}&user_email=${user?.email}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        const data = await response.json();
        fetchData();
        toast("Privilégios removidos!", {
          description: data.message,
        });
      } else {
        const error = await response.json();
        toast.danger("Erro", {
          description: error.error || "Não foi possível remover privilégios.",
        });
      }
    } catch (error) {
      console.error("Erro ao remover admin temporário:", error);
      toast.danger("Erro", {
        description: "Não foi possível remover privilégios.",
      });
    }
  };

  const departamentosUnicos = resumoColaboradores.departamentos;
  const colaboradoresAtivos = resumoColaboradores.ativos;

  const taxaAtividade =
    colaboradores.length > 0
      ? (colaboradoresAtivos / resumoColaboradores.total) * 100
      : 0;
  const totalAdmins = resumoAdmins.admins;

  const adminsTemporariosVisiveis = colaboradoresAdmin.filter((c) => {
    const dias = diasAte(c.admin_temporario_ate);
    return !c.admin_permanente && dias !== null && dias >= 0;
  }).length;

  const isAdminPermanente =
    user?.admin_permanente ||
    [
      "weliton.ribeiro@prismainformatica.com.br",
      "edson@prismainformatica.com.br",
      "ivan@prismainformatica.com.br",
      "jose.xavier@prismainformatica.com.br",
      "everson.freire@prismainformatica.com.br",
    ].includes(user?.email?.toLowerCase() || "");

  if (loading) {
    return (
      <ProtectedRoute>
       <SpinnerTela />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-background">
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
              <h1 className="text-3xl font-bold">Painel Administrativo</h1>
              <p>Gerencie colaboradores e setores da empresa</p>
            </div>
          </div>

          <section
            aria-label="Indicadores do quadro"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8"
          >
            <StatTile
              rotulo="Colaboradores"
              valor={inteiro(resumoColaboradores.total)}
              icone={Users}
              deltaLegenda={`${inteiro(resumoColaboradores.inativos)} inativo(s) no cadastro`}
            />
            <StatTile
              rotulo="Quadro ativo"
              valor={percentual(taxaAtividade, 0)}
              icone={TrendingUp}
              deltaLegenda={`${inteiro(colaboradoresAtivos)} de ${inteiro(resumoColaboradores.total)} colaboradores`}
            />
            <StatTile
              rotulo="Setores"
              valor={inteiro(totalSetores)}
              icone={Building}
              deltaLegenda={`${inteiro(departamentosUnicos.length)} departamento(s) distintos`}
            />
            <StatTile
              rotulo="Administradores"
              valor={inteiro(totalAdmins)}
              icone={BarChart3}
              deltaLegenda={
                adminsTemporariosVisiveis > 0
                  ? `${inteiro(adminsTemporariosVisiveis)} temporário(s) nesta página`
                  : "nenhum temporário nesta página"
              }
            />
          </section>

          <Tabs defaultSelectedKey="colaboradores" className="gap-4">
            <Tabs.ListContainer>
              <Tabs.List className="grid w-full grid-cols-3">
                <Tabs.Tab id="colaboradores">
                  Colaboradores
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="setores">
                  Setores
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="usuarios-admin">
                  Usuários Admin
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

            <Tabs.Panel id="colaboradores" className="p-0">
              <Card>
                <Card.Header>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <Card.Title>Gerenciar Colaboradores</Card.Title>
                      <Card.Description>
                        Cadastre e gerencie todos os colaboradores da empresa
                      </Card.Description>
                    </div>
                    <Modal
                      isOpen={isAddColaboradorOpen}
                      onOpenChange={setIsAddColaboradorOpen}
                    >
                      <Button>
                        <UserPlus className="w-4 h-4" />
                        Novo Colaborador
                      </Button>
                      <Modal.Backdrop>
                        <Modal.Container>
                          <Modal.Dialog className="max-w-md">
                            <Modal.CloseTrigger />
                            <Modal.Header>
                              <Modal.Heading>
                                Adicionar Novo Colaborador
                              </Modal.Heading>
                            </Modal.Header>
                            <Modal.Body>
                              <p className="text-sm text-muted mb-4">
                                Cadastre um novo colaborador na empresa
                              </p>
                              <div className="grid gap-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="nome">Nome Completo</Label>
                                  <Input
                                    id="nome"
                                    value={newColaborador.nome}
                                    onChange={(e) =>
                                      setNewColaborador({
                                        ...newColaborador,
                                        nome: e.target.value,
                                      })
                                    }
                                    placeholder="Nome do colaborador"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="email">Email</Label>
                                  <Input
                                    id="email"
                                    type="email"
                                    value={newColaborador.email}
                                    onChange={(e) =>
                                      setNewColaborador({
                                        ...newColaborador,
                                        email: e.target.value,
                                      })
                                    }
                                    placeholder="email@empresa.com"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="departamento">
                                    Departamento
                                  </Label>
                                  <Select
                                    value={newColaborador.departamento}
                                    onChange={(value) =>
                                      setNewColaborador({
                                        ...newColaborador,
                                        departamento: value as string,
                                      })
                                    }
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
                                        <ListBox.Item
                                          id="Vendas"
                                          textValue="Vendas"
                                        >
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
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="cargo">Cargo</Label>
                                  <Input
                                    id="cargo"
                                    value={newColaborador.cargo}
                                    onChange={(e) =>
                                      setNewColaborador({
                                        ...newColaborador,
                                        cargo: e.target.value,
                                      })
                                    }
                                    placeholder="Ex: Analista, Gerente, Coordenador..."
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="setor">Setor</Label>
                                  <Select
                                    value={newColaborador.setor_id}
                                    onChange={(value) =>
                                      setNewColaborador({
                                        ...newColaborador,
                                        setor_id: value as string,
                                      })
                                    }
                                    placeholder="Selecione o setor"
                                  >
                                    <Select.Trigger>
                                      <Select.Value />
                                      <Select.Indicator />
                                    </Select.Trigger>
                                    <Select.Popover>
                                      <ListBox>
                                        {setores.map((setor) => (
                                          <ListBox.Item
                                            key={setor.id}
                                            id={setor.id.toString()}
                                            textValue={setor.nome}
                                          >
                                            {setor.nome}
                                          </ListBox.Item>
                                        ))}
                                      </ListBox>
                                    </Select.Popover>
                                  </Select>
                                </div>
                              </div>
                            </Modal.Body>
                            <Modal.Footer>
                              <Button onPress={adicionarColaborador}>
                                Cadastrar Colaborador
                              </Button>
                            </Modal.Footer>
                          </Modal.Dialog>
                        </Modal.Container>
                      </Modal.Backdrop>
                    </Modal>
                  </div>
                </Card.Header>
                <Card.Content>
                  <DataTable
                    colunas={colunasColaboradores}
                    dados={colaboradores}
                    rotulo="Colaboradores"
                    vazio="Nenhum colaborador encontrado"
                    total={totalColaboradores}
                    pagina={paginaColaboradores}
                    totalPaginas={totalPaginasColaboradores}
                    onMudarPagina={setPaginaColaboradores}
                    itensPorPagina={itensPorPagina}
                    onMudarItensPorPagina={(itens) => {
                      setItensPorPagina(itens);
                      reiniciarPaginas();
                    }}
                    busca={searchTerm}
                    onMudarBusca={(valor) => {
                      setSearchTerm(valor);
                      setPaginaColaboradores(1);
                    }}
                    placeholderBusca="Pesquisar por nome ou email..."
                    filtros={filtroDepartamentoSelect}
                  />
                </Card.Content>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel id="setores" className="p-0">
              <Card>
                <Card.Header>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <Card.Title>Gerenciar Setores</Card.Title>
                      <Card.Description>
                        Visualize e organize os setores da empresa
                      </Card.Description>
                    </div>
                    <Modal
                      isOpen={isAddSetorOpen}
                      onOpenChange={setIsAddSetorOpen}
                    >
                      <Button>
                        <Plus className="w-4 h-4" />
                        Novo Setor
                      </Button>
                      <Modal.Backdrop>
                        <Modal.Container>
                          <Modal.Dialog>
                            <Modal.CloseTrigger />
                            <Modal.Header>
                              <Modal.Heading>
                                Adicionar Novo Setor
                              </Modal.Heading>
                            </Modal.Header>
                            <Modal.Body>
                              <p className="text-sm text-muted mb-4">
                                Crie um novo setor para organizar os
                                colaboradores
                              </p>
                              <div className="grid gap-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="nome-setor">
                                    Nome do Setor
                                  </Label>
                                  <Input
                                    id="nome-setor"
                                    value={newSetor.nome}
                                    onChange={(e) =>
                                      setNewSetor({
                                        ...newSetor,
                                        nome: e.target.value,
                                      })
                                    }
                                    placeholder="Ex: Desenvolvimento, Suporte..."
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="descricao-setor">
                                    Descrição
                                  </Label>
                                  <Input
                                    id="descricao-setor"
                                    value={newSetor.descricao}
                                    onChange={(e) =>
                                      setNewSetor({
                                        ...newSetor,
                                        descricao: e.target.value,
                                      })
                                    }
                                    placeholder="Breve descrição do setor"
                                  />
                                </div>
                              </div>
                            </Modal.Body>
                            <Modal.Footer>
                              <Button onPress={adicionarSetor}>
                                Criar Setor
                              </Button>
                            </Modal.Footer>
                          </Modal.Dialog>
                        </Modal.Container>
                      </Modal.Backdrop>
                    </Modal>
                  </div>
                </Card.Header>

                <Card.Content>
                  <DataTable
                    colunas={colunasSetores}
                    dados={setoresPagina}
                    rotulo="Setores"
                    vazio="Nenhum setor cadastrado"
                    total={totalSetores}
                    pagina={paginaSetores}
                    totalPaginas={totalPaginasSetores}
                    onMudarPagina={setPaginaSetores}
                    itensPorPagina={itensPorPagina}
                    onMudarItensPorPagina={(itens) => {
                      setItensPorPagina(itens);
                      reiniciarPaginas();
                    }}
                    busca={buscaSetores}
                    onMudarBusca={(valor) => {
                      setBuscaSetores(valor);
                      setPaginaSetores(1);
                    }}
                    placeholderBusca="Pesquisar por setor ou descrição..."
                  />
                </Card.Content>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel id="usuarios-admin" className="p-0">
              {isAdminPermanente ? (
                <Card>
                  <Card.Header>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <Card.Title>Gerenciar Usuários Admin</Card.Title>
                        <Card.Description>
                          Defina admins temporários para outros colaboradores
                        </Card.Description>
                      </div>
                      <Modal
                        isOpen={isAddAdminTempOpen}
                        onOpenChange={setIsAddAdminTempOpen}
                      >
                        <Button>
                          <UserPlus className="w-4 h-4" />
                          Definir Admin Temporário
                        </Button>
                        <Modal.Backdrop>
                          <Modal.Container>
                            <Modal.Dialog>
                              <Modal.CloseTrigger />
                              <Modal.Header>
                                <Modal.Heading>
                                  Definir Admin Temporário
                                </Modal.Heading>
                              </Modal.Header>
                              <Modal.Body>
                                <p className="text-sm text-muted mb-4">
                                  Conceda privilégios administrativos
                                  temporários a um colaborador
                                </p>
                                <div className="grid gap-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="colaborador-admin">
                                      Colaborador
                                    </Label>
                                    <Select
                                      value={adminTempData.colaborador_id}
                                      onChange={(value) =>
                                        setAdminTempData({
                                          ...adminTempData,
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
                                          {colaboradoresAdmin
                                            .filter(
                                              (col) =>
                                                !col.admin_permanente &&
                                                col.tipo !== "admin",
                                            )
                                            .map((colaborador) => (
                                              <ListBox.Item
                                                key={colaborador.id}
                                                id={colaborador.id.toString()}
                                                textValue={`${colaborador.nome} (${colaborador.email})`}
                                              >
                                                {colaborador.nome} (
                                                {colaborador.email})
                                              </ListBox.Item>
                                            ))}
                                        </ListBox>
                                      </Select.Popover>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="admin-ate">Admin até</Label>
                                    <Input
                                      id="admin-ate"
                                      type="date"
                                      value={adminTempData.admin_ate}
                                      onChange={(e) =>
                                        setAdminTempData({
                                          ...adminTempData,
                                          admin_ate: e.target.value,
                                        })
                                      }
                                      min={
                                        new Date().toISOString().split("T")[0]
                                      }
                                    />
                                  </div>
                                </div>
                              </Modal.Body>
                              <Modal.Footer>
                                <Button onPress={definirAdminTemporario}>
                                  Definir Admin
                                </Button>
                              </Modal.Footer>
                            </Modal.Dialog>
                          </Modal.Container>
                        </Modal.Backdrop>
                      </Modal>
                    </div>
                  </Card.Header>
                  <Card.Content>
                    <DataTable
                      colunas={colunasUsuariosAdmin}
                      dados={colaboradoresAdmin}
                      rotulo="Usuários admin"
                      vazio="Nenhum colaborador encontrado"
                      total={totalUsuariosAdmin}
                      pagina={paginaUsuariosAdmin}
                      totalPaginas={totalPaginasUsuariosAdmin}
                      onMudarPagina={setPaginaUsuariosAdmin}
                      itensPorPagina={itensPorPagina}
                      onMudarItensPorPagina={(itens) => {
                        setItensPorPagina(itens);
                        reiniciarPaginas();
                      }}
                      busca={buscaUsuariosAdmin}
                      onMudarBusca={(valor) => {
                        setBuscaUsuariosAdmin(valor);
                        setPaginaUsuariosAdmin(1);
                      }}
                      placeholderBusca="Pesquisar por nome ou email..."
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
                      Apenas administradores permanentes podem gerenciar
                      usuários admin.
                    </p>
                  </Card.Content>
                </Card>
              )}
            </Tabs.Panel>
          </Tabs>

          <Modal
            isOpen={isEditColaboradorOpen}
            onOpenChange={setIsEditColaboradorOpen}
          >
            <Modal.Backdrop>
              <Modal.Container>
                <Modal.Dialog className="max-w-md">
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>Editar Colaborador</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <p className="text-sm text-muted mb-4">
                      Atualize os dados do colaborador
                    </p>
                    {selectedColaborador && (
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-nome">Nome Completo</Label>
                          <Input
                            id="edit-nome"
                            value={selectedColaborador.nome}
                            onChange={(e) =>
                              setSelectedColaborador({
                                ...selectedColaborador,
                                nome: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-email">Email</Label>
                          <Input
                            id="edit-email"
                            type="email"
                            value={selectedColaborador.email}
                            onChange={(e) =>
                              setSelectedColaborador({
                                ...selectedColaborador,
                                email: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-departamento">
                            Departamento
                          </Label>
                          <Select
                            value={selectedColaborador.departamento}
                            onChange={(value) =>
                              setSelectedColaborador({
                                ...selectedColaborador,
                                departamento: value as string,
                              })
                            }
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
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-cargo">Cargo</Label>
                          <Input
                            id="edit-cargo"
                            value={selectedColaborador.cargo || ""}
                            onChange={(e) =>
                              setSelectedColaborador({
                                ...selectedColaborador,
                                cargo: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-setor">Setor</Label>
                          <Select
                            value={
                              selectedColaborador.setor_id?.toString() || "0"
                            }
                            onChange={(value) =>
                              setSelectedColaborador({
                                ...selectedColaborador,
                                setor_id:
                                  value && value !== "0"
                                    ? Number.parseInt(value as string)
                                    : undefined,
                              })
                            }
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
                                {setores.map((setor) => (
                                  <ListBox.Item
                                    key={setor.id}
                                    id={setor.id.toString()}
                                    textValue={setor.nome}
                                  >
                                    {setor.nome}
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </div>
                      </div>
                    )}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button onPress={editarColaborador}>
                      Salvar Alterações
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        </div>
      </div>
    </ProtectedRoute>
  );
}

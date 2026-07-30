"use client";

import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Table,
  Tabs,
  toast,
} from "@heroui/react";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Building,
  Edit,
  Plus,
  Search,
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

  // Estados para gerenciamento de usuários admin
  const [colaboradoresAdmin, setColaboradoresAdmin] = useState<
    ColaboradorAdmin[]
  >([]);
  const [searchTermAdmin, setSearchTermAdmin] = useState("");
  const [isAddAdminTempOpen, setIsAddAdminTempOpen] = useState(false);
  const [selectedColaboradorAdmin, setSelectedColaboradorAdmin] =
    useState<ColaboradorAdmin | null>(null);
  const [adminTempData, setAdminTempData] = useState({
    colaborador_id: "",
    admin_ate: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [colaboradoresRes, setoresRes, usuariosAdminRes] =
        await Promise.all([
          fetch("/api/colaboradores"),
          fetch("/api/admin/setores"),
          fetch(`/api/admin/usuarios?user_email=${user?.email}`),
        ]);

      if (colaboradoresRes.ok && setoresRes.ok) {
        const colaboradoresData = await colaboradoresRes.json();
        const setoresData = await setoresRes.json();

        setColaboradores(colaboradoresData);
        setSetores(setoresData);

        // Carregar dados de usuários admin se o usuário tem permissão
        if (usuariosAdminRes.ok) {
          const usuariosAdminData = await usuariosAdminRes.json();
          setColaboradoresAdmin(usuariosAdminData);
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

  const filteredColaboradores = colaboradores.filter((colaborador) => {
    const matchesSearch =
      colaborador.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      colaborador.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterDepartamento === "todos" ||
      colaborador.departamento === filterDepartamento;

    return matchesSearch && matchesFilter;
  });

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

  // Funções para gerenciamento de usuários admin
  const filteredColaboradoresAdmin = colaboradoresAdmin.filter(
    (colaborador) =>
      colaborador.nome.toLowerCase().includes(searchTermAdmin.toLowerCase()) ||
      colaborador.email.toLowerCase().includes(searchTermAdmin.toLowerCase()),
  );

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

  const departamentosUnicos = [
    ...new Set(colaboradores.map((c) => c.departamento)),
  ];
  const colaboradoresAtivos = colaboradores.filter(
    (c) => c.status === "ativo",
  ).length;
  const totalSetores = setores.length;

  // Verificar se o usuário é admin permanente
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
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
              <h1 className="text-3xl font-bold text-gray-900">
                Painel Administrativo
              </h1>
              <p className="text-gray-600">
                Gerencie colaboradores e setores da empresa
              </p>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Colaboradores
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {colaboradores.length}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Colaboradores Ativos
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {colaboradoresAtivos}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Building className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total Setores
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {totalSetores}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Inativos
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {colaboradores.length - colaboradoresAtivos}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          <Tabs defaultSelectedKey="colaboradores" className="space-y-6">
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

            <Tabs.Panel id="colaboradores">
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
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Pesquisar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={filterDepartamento}
                      onChange={(value) =>
                        setFilterDepartamento(value as string)
                      }
                      placeholder="Filtrar por departamento"
                      className="w-full sm:w-48"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item
                            id="todos"
                            textValue="Todos os departamentos"
                          >
                            Todos os departamentos
                          </ListBox.Item>
                          {departamentosUnicos.map((dept) => (
                            <ListBox.Item key={dept} id={dept} textValue={dept}>
                              {dept}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <Table.ScrollContainer>
                        <Table.Content aria-label="Colaboradores">
                          <Table.Header>
                            <Table.Column isRowHeader>Nome</Table.Column>
                            <Table.Column className="hidden sm:table-cell">
                              Email
                            </Table.Column>
                            <Table.Column>Departamento</Table.Column>
                            <Table.Column className="hidden md:table-cell">
                              Setor
                            </Table.Column>
                            <Table.Column>Status</Table.Column>
                            <Table.Column className="text-right">
                              Ações
                            </Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {filteredColaboradores.length === 0 ? (
                              <Table.Row>
                                <Table.Cell
                                  colSpan={6}
                                  className="text-center py-8"
                                >
                                  <div className="flex flex-col items-center gap-2">
                                    <AlertCircle className="w-8 h-8 text-gray-400" />
                                    <p className="text-gray-500">
                                      Nenhum colaborador encontrado
                                    </p>
                                  </div>
                                </Table.Cell>
                              </Table.Row>
                            ) : (
                              filteredColaboradores.map((colaborador) => (
                                <Table.Row key={colaborador.id}>
                                  <Table.Cell className="font-medium">
                                    {colaborador.nome}
                                  </Table.Cell>
                                  <Table.Cell className="hidden sm:table-cell text-gray-600">
                                    {colaborador.email}
                                  </Table.Cell>
                                  <Table.Cell>
                                    <Badge variant="secondary">
                                      {colaborador.departamento}
                                    </Badge>
                                  </Table.Cell>
                                  <Table.Cell className="hidden md:table-cell text-gray-600">
                                    {colaborador.setor_nome || "Não definido"}
                                  </Table.Cell>
                                  <Table.Cell>
                                    <Badge
                                      variant={
                                        colaborador.status === "ativo"
                                          ? "primary"
                                          : "secondary"
                                      }
                                    >
                                      {colaborador.status === "ativo"
                                        ? "Ativo"
                                        : "Inativo"}
                                    </Badge>
                                  </Table.Cell>
                                  <Table.Cell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onPress={() => {
                                          setSelectedColaborador(colaborador);
                                          setIsEditColaboradorOpen(true);
                                        }}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant={
                                          colaborador.status === "ativo"
                                            ? "danger"
                                            : undefined
                                        }
                                        size="sm"
                                        onPress={() =>
                                          inativarColaborador(colaborador.id)
                                        }
                                      >
                                        {colaborador.status === "ativo" ? (
                                          <Trash2 className="w-4 h-4" />
                                        ) : (
                                          <Users className="w-4 h-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </Table.Cell>
                                </Table.Row>
                              ))
                            )}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  </div>
                </Card.Content>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel id="setores">
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
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {setores.length === 0 ? (
                      <div className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-12">
                        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-gray-500 text-lg">
                          Nenhum setor cadastrado
                        </p>
                        <p className="text-gray-400 mt-2">
                          Clique em "Novo Setor" para adicionar
                        </p>
                      </div>
                    ) : (
                      setores.map((setor) => (
                        <Card
                          key={setor.id}
                          className="border-l-4 border-l-blue-500"
                        >
                          <Card.Header className="pb-3">
                            <div className="flex items-center justify-between">
                              <Card.Title className="text-lg">
                                {setor.nome}
                              </Card.Title>
                              <Badge variant="secondary">
                                {setor.total_colaboradores} pessoas
                              </Badge>
                            </div>
                            <Card.Description>
                              {setor.descricao}
                            </Card.Description>
                          </Card.Header>
                          <Card.Content>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Users className="w-4 h-4" />
                                <span>
                                  Responsável:{" "}
                                  {setor.responsavel || "Não definido"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Building className="w-4 h-4" />
                                <span>
                                  {setor.total_colaboradores} colaborador(es)
                                </span>
                              </div>
                            </div>
                          </Card.Content>
                        </Card>
                      ))
                    )}
                  </div>
                </Card.Content>
              </Card>
            </Tabs.Panel>

            {/* Nova aba para gerenciamento de usuários admin */}
            <Tabs.Panel id="usuarios-admin">
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
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Pesquisar por nome ou email..."
                          value={searchTermAdmin}
                          onChange={(e) => setSearchTermAdmin(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Table>
                      <Table.ScrollContainer>
                        <Table.Content aria-label="Usuários Admin">
                          <Table.Header>
                            <Table.Column isRowHeader>Nome</Table.Column>
                            <Table.Column>Email</Table.Column>
                            <Table.Column>Departamento</Table.Column>
                            <Table.Column>Status Admin</Table.Column>
                            <Table.Column>Admin até</Table.Column>
                            <Table.Column>Ações</Table.Column>
                          </Table.Header>
                          <Table.Body>
                            {filteredColaboradoresAdmin.length === 0 ? (
                              <Table.Row>
                                <Table.Cell
                                  colSpan={6}
                                  className="text-center py-8"
                                >
                                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                  <p className="text-gray-500">
                                    Nenhum colaborador encontrado
                                  </p>
                                </Table.Cell>
                              </Table.Row>
                            ) : (
                              filteredColaboradoresAdmin.map((colaborador) => (
                                <Table.Row key={colaborador.id}>
                                  <Table.Cell className="font-medium">
                                    {colaborador.nome}
                                  </Table.Cell>
                                  <Table.Cell>{colaborador.email}</Table.Cell>
                                  <Table.Cell>
                                    {colaborador.departamento}
                                  </Table.Cell>
                                  <Table.Cell>
                                    {colaborador.admin_permanente ? (
                                      <Badge className="bg-blue-100 text-blue-800">
                                        Admin Permanente
                                      </Badge>
                                    ) : colaborador.tipo === "admin" ? (
                                      <Badge className="bg-yellow-100 text-yellow-800">
                                        Admin Temporário
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">Usuário</Badge>
                                    )}
                                  </Table.Cell>
                                  <Table.Cell>
                                    {colaborador.admin_temporario_ate ? (
                                      <span className="text-sm">
                                        {new Date(
                                          colaborador.admin_temporario_ate,
                                        ).toLocaleDateString("pt-BR")}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </Table.Cell>
                                  <Table.Cell>
                                    {!colaborador.admin_permanente &&
                                      colaborador.tipo === "admin" && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onPress={() =>
                                            removerAdminTemporario(
                                              colaborador.id,
                                            )
                                          }
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="w-4 h-4 mr-1" />
                                          Remover Admin
                                        </Button>
                                      )}
                                  </Table.Cell>
                                </Table.Row>
                              ))
                            )}
                          </Table.Body>
                        </Table.Content>
                      </Table.ScrollContainer>
                    </Table>
                  </Card.Content>
                </Card>
              ) : (
                <Card>
                  <Card.Content className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Acesso Restrito
                    </h3>
                    <p className="text-gray-600 text-center">
                      Apenas administradores permanentes podem gerenciar
                      usuários admin.
                    </p>
                  </Card.Content>
                </Card>
              )}
            </Tabs.Panel>
          </Tabs>

          {/* Dialog de Edição de Colaborador */}
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

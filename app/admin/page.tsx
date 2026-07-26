"use client";

import { Navbar } from "@/components/navbar";
import { ProtectedRoute } from "@/components/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
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

  const { toast } = useToast();

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
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive",
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
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
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

        toast({
          title: "Colaborador adicionado!",
          description: "Novo colaborador foi cadastrado com sucesso.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description:
            error.error || "Não foi possível adicionar o colaborador.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao adicionar colaborador:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o colaborador.",
        variant: "destructive",
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

        toast({
          title: "Colaborador atualizado!",
          description: "Dados do colaborador foram atualizados com sucesso.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description:
            error.error || "Não foi possível atualizar o colaborador.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao editar colaborador:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o colaborador.",
        variant: "destructive",
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
        toast({
          title: "Status atualizado!",
          description: `Colaborador ${
            colaborador.status === "ativo" ? "inativado" : "ativado"
          } com sucesso.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description:
            error.error || "Não foi possível alterar o status do colaborador.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do colaborador.",
        variant: "destructive",
      });
    }
  };

  const adicionarSetor = async () => {
    if (!newSetor.nome) {
      toast({
        title: "Erro",
        description: "Nome do setor é obrigatório.",
        variant: "destructive",
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

        toast({
          title: "Setor adicionado!",
          description: "Novo setor foi cadastrado com sucesso.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.error || "Não foi possível adicionar o setor.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao adicionar setor:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o setor.",
        variant: "destructive",
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
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
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

        toast({
          title: "Admin temporário definido!",
          description: data.message,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description:
            error.error || "Não foi possível definir admin temporário.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao definir admin temporário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível definir admin temporário.",
        variant: "destructive",
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
        toast({
          title: "Privilégios removidos!",
          description: data.message,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Erro",
          description: error.error || "Não foi possível remover privilégios.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao remover admin temporário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover privilégios.",
        variant: "destructive",
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
      <div className="min-h-screen bg-gray-50">
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
              <CardContent className="p-6">
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
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
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="colaboradores" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
              <TabsTrigger value="setores">Setores</TabsTrigger>
              <TabsTrigger value="usuarios-admin">Usuários Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="colaboradores">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle>Gerenciar Colaboradores</CardTitle>
                      <CardDescription>
                        Cadastre e gerencie todos os colaboradores da empresa
                      </CardDescription>
                    </div>
                    <Dialog
                      open={isAddColaboradorOpen}
                      onOpenChange={setIsAddColaboradorOpen}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="w-4 h-4" />
                          Novo Colaborador
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Adicionar Novo Colaborador</DialogTitle>
                          <DialogDescription>
                            Cadastre um novo colaborador na empresa
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
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
                            <Label htmlFor="departamento">Departamento</Label>
                            <Select
                              value={newColaborador.departamento}
                              onValueChange={(value) =>
                                setNewColaborador({
                                  ...newColaborador,
                                  departamento: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o departamento" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TI">TI</SelectItem>
                                <SelectItem value="RH">RH</SelectItem>
                                <SelectItem value="Vendas">Vendas</SelectItem>
                                <SelectItem value="Marketing">
                                  Marketing
                                </SelectItem>
                                <SelectItem value="Financeiro">
                                  Financeiro
                                </SelectItem>
                                <SelectItem value="Operações">
                                  Operações
                                </SelectItem>
                                <SelectItem value="Jurídico">
                                  Jurídico
                                </SelectItem>
                              </SelectContent>
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
                              onValueChange={(value) =>
                                setNewColaborador({
                                  ...newColaborador,
                                  setor_id: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o setor" />
                              </SelectTrigger>
                              <SelectContent>
                                {setores.map((setor) => (
                                  <SelectItem
                                    key={setor.id}
                                    value={setor.id.toString()}
                                  >
                                    {setor.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={adicionarColaborador}>
                            Cadastrar Colaborador
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
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
                      onValueChange={setFilterDepartamento}
                    >
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filtrar por departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">
                          Todos os departamentos
                        </SelectItem>
                        {departamentosUnicos.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead className="hidden sm:table-cell">
                            Email
                          </TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead className="hidden md:table-cell">
                            Setor
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredColaboradores.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <AlertCircle className="w-8 h-8 text-gray-400" />
                                <p className="text-gray-500">
                                  Nenhum colaborador encontrado
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredColaboradores.map((colaborador) => (
                            <TableRow key={colaborador.id}>
                              <TableCell className="font-medium">
                                {colaborador.nome}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-gray-600">
                                {colaborador.email}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {colaborador.departamento}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-gray-600">
                                {colaborador.setor_nome || "Não definido"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    colaborador.status === "ativo"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {colaborador.status === "ativo"
                                    ? "Ativo"
                                    : "Inativo"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedColaborador(colaborador);
                                      setIsEditColaboradorOpen(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant={
                                      colaborador.status === "ativo"
                                        ? "destructive"
                                        : "default"
                                    }
                                    size="sm"
                                    onClick={() =>
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
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="setores">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <CardTitle>Gerenciar Setores</CardTitle>
                      <CardDescription>
                        Visualize e organize os setores da empresa
                      </CardDescription>
                    </div>
                    <Dialog
                      open={isAddSetorOpen}
                      onOpenChange={setIsAddSetorOpen}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4" />
                          Novo Setor
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Novo Setor</DialogTitle>
                          <DialogDescription>
                            Crie um novo setor para organizar os colaboradores
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="nome-setor">Nome do Setor</Label>
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
                            <Label htmlFor="descricao-setor">Descrição</Label>
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
                        <DialogFooter>
                          <Button onClick={adicionarSetor}>Criar Setor</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>

                <CardContent>
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
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">
                                {setor.nome}
                              </CardTitle>
                              <Badge variant="secondary">
                                {setor.total_colaboradores} pessoas
                              </Badge>
                            </div>
                            <CardDescription>{setor.descricao}</CardDescription>
                          </CardHeader>
                          <CardContent>
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
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Nova aba para gerenciamento de usuários admin */}
            <TabsContent value="usuarios-admin">
              {isAdminPermanente ? (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <CardTitle>Gerenciar Usuários Admin</CardTitle>
                        <CardDescription>
                          Defina admins temporários para outros colaboradores
                        </CardDescription>
                      </div>
                      <Dialog
                        open={isAddAdminTempOpen}
                        onOpenChange={setIsAddAdminTempOpen}
                      >
                        <DialogTrigger asChild>
                          <Button>
                            <UserPlus className="w-4 h-4" />
                            Definir Admin Temporário
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Definir Admin Temporário</DialogTitle>
                            <DialogDescription>
                              Conceda privilégios administrativos temporários a
                              um colaborador
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="colaborador-admin">
                                Colaborador
                              </Label>
                              <Select
                                value={adminTempData.colaborador_id}
                                onValueChange={(value) =>
                                  setAdminTempData({
                                    ...adminTempData,
                                    colaborador_id: value,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um colaborador" />
                                </SelectTrigger>
                                <SelectContent>
                                  {colaboradoresAdmin
                                    .filter(
                                      (col) =>
                                        !col.admin_permanente &&
                                        col.tipo !== "admin",
                                    )
                                    .map((colaborador) => (
                                      <SelectItem
                                        key={colaborador.id}
                                        value={colaborador.id.toString()}
                                      >
                                        {colaborador.nome} ({colaborador.email})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
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
                                min={new Date().toISOString().split("T")[0]}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={definirAdminTemporario}>
                              Definir Admin
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead>Status Admin</TableHead>
                          <TableHead>Admin até</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredColaboradoresAdmin.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500">
                                Nenhum colaborador encontrado
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredColaboradoresAdmin.map((colaborador) => (
                            <TableRow key={colaborador.id}>
                              <TableCell className="font-medium">
                                {colaborador.nome}
                              </TableCell>
                              <TableCell>{colaborador.email}</TableCell>
                              <TableCell>{colaborador.departamento}</TableCell>
                              <TableCell>
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
                              </TableCell>
                              <TableCell>
                                {colaborador.admin_temporario_ate ? (
                                  <span className="text-sm">
                                    {new Date(
                                      colaborador.admin_temporario_ate,
                                    ).toLocaleDateString("pt-BR")}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {!colaborador.admin_permanente &&
                                  colaborador.tipo === "admin" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        removerAdminTemporario(colaborador.id)
                                      }
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Remover Admin
                                    </Button>
                                  )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Acesso Restrito
                    </h3>
                    <p className="text-gray-600 text-center">
                      Apenas administradores permanentes podem gerenciar
                      usuários admin.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Dialog de Edição de Colaborador */}
          <Dialog
            open={isEditColaboradorOpen}
            onOpenChange={setIsEditColaboradorOpen}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Colaborador</DialogTitle>
                <DialogDescription>
                  Atualize os dados do colaborador
                </DialogDescription>
              </DialogHeader>
              {selectedColaborador && (
                <div className="grid gap-4 py-4">
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
                    <Label htmlFor="edit-departamento">Departamento</Label>
                    <Select
                      value={selectedColaborador.departamento}
                      onValueChange={(value) =>
                        setSelectedColaborador({
                          ...selectedColaborador,
                          departamento: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TI">TI</SelectItem>
                        <SelectItem value="RH">RH</SelectItem>
                        <SelectItem value="Vendas">Vendas</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Financeiro">Financeiro</SelectItem>
                        <SelectItem value="Operações">Operações</SelectItem>
                        <SelectItem value="Jurídico">Jurídico</SelectItem>
                      </SelectContent>
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
                      value={selectedColaborador.setor_id?.toString() || "0"}
                      onValueChange={(value) =>
                        setSelectedColaborador({
                          ...selectedColaborador,
                          setor_id: value ? Number.parseInt(value) : undefined,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Nenhum</SelectItem>
                        {setores.map((setor) => (
                          <SelectItem
                            key={setor.id}
                            value={setor.id.toString()}
                          >
                            {setor.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button onClick={editarColaborador}>Salvar Alterações</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  );
}

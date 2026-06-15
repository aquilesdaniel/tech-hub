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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Award,
  Calendar,
  Edit,
  ExternalLink,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Colaborador {
  id: number;
  nome: string;
  email: string;
  departamento: string;
}

interface Certificacao {
  id: number;
  colaborador_id: number;
  colaborador_nome: string;
  nome: string;
  tipo: string;
  instituicao: string;
  data_obtencao: string;
  data_vencimento?: string | null;
  url_credencial?: string | null;
  observacoes?: string | null;
}

export default function CertificacoesPage() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [certificacoes, setCertificacoes] = useState<Certificacao[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCertificacao, setSelectedCertificacao] =
    useState<Certificacao | null>(null);
  const [newCertificacao, setNewCertificacao] = useState({
    colaborador_id: "",
    nome: "",
    tipo: "",
    instituicao: "",
    data_obtencao: "",
    data_vencimento: "",
    url_credencial: "",
    observacoes: "",
  });
  const { toast } = useToast();

  const tiposCertificacao = [
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
    fetchData();
  }, [user]);

  useEffect(() => {
    // Para usuários não-admin, definir automaticamente o colaborador_id
    if (user?.tipo !== "admin" && user?.id) {
      setNewCertificacao((prev) => ({
        ...prev,
        colaborador_id: user.id.toString(),
      }));
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const params =
        user?.tipo === "admin" ? "" : `?colaborador_id=${user?.id}`;
      const [certificacoesRes, colaboradoresRes] = await Promise.all([
        fetch(`/api/certificacoes${params}`),
        fetch("/api/colaboradores"),
      ]);

      if (certificacoesRes.ok && colaboradoresRes.ok) {
        const certificacoesData = await certificacoesRes.json();
        const colaboradoresData = await colaboradoresRes.json();

        setCertificacoes(certificacoesData);
        setColaboradores(colaboradoresData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCertificacoes = certificacoes.filter((cert) => {
    const matchesSearch =
      cert.colaborador_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.instituicao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterTipo === "todos" || cert.tipo === filterTipo;

    return matchesSearch && matchesFilter;
  });

  const adicionarCertificacao = async () => {
    if (
      !newCertificacao.colaborador_id ||
      !newCertificacao.nome ||
      !newCertificacao.tipo ||
      !newCertificacao.instituicao ||
      !newCertificacao.data_obtencao
    ) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/certificacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaborador_id: parseInt(newCertificacao.colaborador_id),
          nome: newCertificacao.nome,
          tipo: newCertificacao.tipo,
          instituicao: newCertificacao.instituicao,
          data_obtencao: newCertificacao.data_obtencao,
          data_vencimento: newCertificacao.data_vencimento || null,
          url_credencial: newCertificacao.url_credencial || null,
          observacoes: newCertificacao.observacoes || null,
        }),
      });

      if (response.ok) {
        toast({
          title: "Certificação adicionada!",
          description: "Nova certificação foi registrada com sucesso.",
        });

        setIsAddDialogOpen(false);
        setNewCertificacao({
          colaborador_id: "",
          nome: "",
          tipo: "",
          instituicao: "",
          data_obtencao: "",
          data_vencimento: "",
          url_credencial: "",
          observacoes: "",
        });

        // Recarregar a página para garantir que os dados sejam atualizados
        window.location.reload();
      }
    } catch (error) {
      console.error("Erro ao adicionar certificação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a certificação.",
        variant: "destructive",
      });
    }
  };

  const editarCertificacao = async () => {
    console.log("Função editarCertificacao chamada");
    console.log("selectedCertificacao:", selectedCertificacao);
    console.log("newCertificacao:", newCertificacao);

    if (!selectedCertificacao) {
      console.log("Nenhuma certificação selecionada");
      return;
    }

    try {
      console.log("Enviando requisição PATCH...");
      const response = await fetch(
        `/api/certificacoes/${selectedCertificacao.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: newCertificacao.nome,
            tipo: newCertificacao.tipo,
            instituicao: newCertificacao.instituicao,
            data_obtencao: newCertificacao.data_obtencao,
            data_vencimento: newCertificacao.data_vencimento || null,
            url_credencial: newCertificacao.url_credencial || null,
            observacoes: newCertificacao.observacoes || null,
          }),
        },
      );

      console.log("Response status:", response.status);
      const responseData = await response.text();
      console.log("Response data:", responseData);

      if (response.ok) {
        console.log("Atualização bem-sucedida");
        fetchData();
        setIsEditDialogOpen(false);
        setSelectedCertificacao(null);

        toast({
          title: "Certificação atualizada!",
          description: "As informações da certificação foram atualizadas.",
        });
      } else {
        console.log("Erro na resposta:", responseData);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a certificação.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao editar certificação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a certificação.",
        variant: "destructive",
      });
    }
  };

  const removerCertificacao = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover esta certificação?")) return;

    try {
      const response = await fetch(`/api/certificacoes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
        toast({
          title: "Certificação removida!",
          description: "A certificação foi removida com sucesso.",
        });
      }
    } catch (error) {
      console.error("Erro ao remover certificação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a certificação.",
        variant: "destructive",
      });
    }
  };

  const abrirDialogEdicao = (certificacao: Certificacao) => {
    setSelectedCertificacao(certificacao);
    setNewCertificacao({
      colaborador_id: certificacao.colaborador_id.toString(),
      nome: certificacao.nome,
      tipo: certificacao.tipo,
      instituicao: certificacao.instituicao,
      data_obtencao: certificacao.data_obtencao,
      data_vencimento: certificacao.data_vencimento || "",
      url_credencial: certificacao.url_credencial || "",
      observacoes: certificacao.observacoes || "",
    });
    setIsEditDialogOpen(true);
  };

  const podeEditarCertificacao = (certificacao: Certificacao) => {
    return user?.tipo === "admin" || certificacao.colaborador_id === user?.id;
  };

  const tiposUnicos = [...new Set(certificacoes.map((c) => c.tipo))];

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
    <ProtectedRoute>
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
                Controle de Certificações
              </h1>
              <p className="text-gray-600">
                Gerencie certificações dos colaboradores
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Award className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total de Certificações
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {certificacoes.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Certificações Sênior
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {
                        certificacoes.filter(
                          (c) => c.tipo === "Certificação Senior",
                        ).length
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Lista de Certificações</CardTitle>
                  <CardDescription>
                    {user?.tipo === "admin"
                      ? "Todas as certificações dos colaboradores"
                      : "Suas certificações"}
                  </CardDescription>
                </div>
                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4" />
                      Nova Certificação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Adicionar Nova Certificação</DialogTitle>
                      <DialogDescription>
                        Registre uma nova certificação
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {user?.tipo === "admin" && (
                        <div className="grid gap-2">
                          <Label htmlFor="colaborador">Colaborador</Label>
                          <Select
                            value={newCertificacao.colaborador_id}
                            onValueChange={(value) =>
                              setNewCertificacao({
                                ...newCertificacao,
                                colaborador_id: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um colaborador" />
                            </SelectTrigger>
                            <SelectContent>
                              {colaboradores.map((colaborador) => (
                                <SelectItem
                                  key={colaborador.id}
                                  value={colaborador.id.toString()}
                                >
                                  {colaborador.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="nome">Nome da Certificação</Label>
                          <Input
                            id="nome"
                            value={newCertificacao.nome}
                            onChange={(e) =>
                              setNewCertificacao({
                                ...newCertificacao,
                                nome: e.target.value,
                              })
                            }
                            placeholder="Ex: AWS Solutions Architect"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="tipo">Tipo</Label>
                          <Select
                            value={newCertificacao.tipo}
                            onValueChange={(value) =>
                              setNewCertificacao({
                                ...newCertificacao,
                                tipo: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {tiposCertificacao.map((tipo) => (
                                <SelectItem key={tipo} value={tipo}>
                                  {tipo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="instituicao">Instituição</Label>
                        <Input
                          id="instituicao"
                          value={newCertificacao.instituicao}
                          onChange={(e) =>
                            setNewCertificacao({
                              ...newCertificacao,
                              instituicao: e.target.value,
                            })
                          }
                          placeholder="Ex: Amazon Web Services"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="data_obtencao">
                            Data de Obtenção
                          </Label>
                          <Input
                            id="data_obtencao"
                            type="date"
                            value={newCertificacao.data_obtencao}
                            onChange={(e) =>
                              setNewCertificacao({
                                ...newCertificacao,
                                data_obtencao: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="data_vencimento">
                            Data de Vencimento (Opcional)
                          </Label>
                          <Input
                            id="data_vencimento"
                            type="date"
                            value={newCertificacao.data_vencimento}
                            onChange={(e) =>
                              setNewCertificacao({
                                ...newCertificacao,
                                data_vencimento: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="url_credencial">
                          URL da Credencial (Opcional)
                        </Label>
                        <Input
                          id="url_credencial"
                          type="url"
                          value={newCertificacao.url_credencial}
                          onChange={(e) =>
                            setNewCertificacao({
                              ...newCertificacao,
                              url_credencial: e.target.value,
                            })
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="observacoes">
                          Observações (Opcional)
                        </Label>
                        <Textarea
                          id="observacoes"
                          value={newCertificacao.observacoes}
                          onChange={(e) =>
                            setNewCertificacao({
                              ...newCertificacao,
                              observacoes: e.target.value,
                            })
                          }
                          placeholder="Informações adicionais..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={adicionarCertificacao}>
                        Adicionar Certificação
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
                    placeholder="Pesquisar por nome, certificação ou instituição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {tiposUnicos.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {filteredCertificacoes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      Nenhuma certificação encontrada
                    </p>
                  </div>
                ) : (
                  filteredCertificacoes.map((certificacao) => (
                    <Card
                      key={certificacao.id}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold break-all">
                                {certificacao.nome}
                              </h3>
                              <Badge
                                className="whitespace-nowrap"
                                variant={
                                  certificacao.tipo === "Certificação Senior"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {certificacao.tipo}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-2">
                              <strong>Colaborador:</strong>{" "}
                              {certificacao.colaborador_nome}
                            </p>
                            <p className="text-gray-600 mb-2">
                              <strong>Instituição:</strong>{" "}
                              {certificacao.instituicao}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <span>
                                <strong>Obtida em:</strong>{" "}
                                {new Date(
                                  certificacao.data_obtencao,
                                ).toLocaleDateString("pt-BR")}
                              </span>
                              {certificacao.data_vencimento && (
                                <span>
                                  <strong>Vence em:</strong>{" "}
                                  {new Date(
                                    certificacao.data_vencimento,
                                  ).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                            </div>
                            {certificacao.observacoes && (
                              <p className="text-gray-600 mt-2">
                                <strong>Observações:</strong>{" "}
                                {certificacao.observacoes}
                              </p>
                            )}
                          </div>
                          <div className="flex sm:flex-row flex-col sm:w-fit w-full gap-2">
                            {certificacao.url_credencial && (
                              <Button
                                className="flex sm:w-fit w-full"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    certificacao.url_credencial!,
                                    "_blank",
                                  )
                                }
                              >
                                <ExternalLink className="w-4 h-4" />
                                Ver Credencial
                              </Button>
                            )}
                            {podeEditarCertificacao(certificacao) && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    abrirDialogEdicao(certificacao)
                                  }
                                >
                                  <Edit className="w-4 h-4" />
                                  Editar
                                </Button>

                                <Button
                                  className=""
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    removerCertificacao(certificacao.id)
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Remover
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Certificação</DialogTitle>
              <DialogDescription>
                Atualize as informações da certificação
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_nome">Nome da Certificação</Label>
                  <Input
                    id="edit_nome"
                    value={newCertificacao.nome}
                    onChange={(e) =>
                      setNewCertificacao({
                        ...newCertificacao,
                        nome: e.target.value,
                      })
                    }
                    placeholder="Ex: AWS Solutions Architect"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_tipo">Tipo</Label>
                  <Select
                    value={newCertificacao.tipo}
                    onValueChange={(value) =>
                      setNewCertificacao({
                        ...newCertificacao,
                        tipo: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposCertificacao.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_instituicao">Instituição</Label>
                <Input
                  id="edit_instituicao"
                  value={newCertificacao.instituicao}
                  onChange={(e) =>
                    setNewCertificacao({
                      ...newCertificacao,
                      instituicao: e.target.value,
                    })
                  }
                  placeholder="Ex: Amazon Web Services"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_data_obtencao">Data de Obtenção</Label>
                  <Input
                    id="edit_data_obtencao"
                    type="date"
                    value={newCertificacao.data_obtencao}
                    onChange={(e) =>
                      setNewCertificacao({
                        ...newCertificacao,
                        data_obtencao: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_data_vencimento">
                    Data de Vencimento (Opcional)
                  </Label>
                  <Input
                    id="edit_data_vencimento"
                    type="date"
                    value={newCertificacao.data_vencimento}
                    onChange={(e) =>
                      setNewCertificacao({
                        ...newCertificacao,
                        data_vencimento: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_url_credencial">
                  URL da Credencial (Opcional)
                </Label>
                <Input
                  id="edit_url_credencial"
                  type="url"
                  value={newCertificacao.url_credencial}
                  onChange={(e) =>
                    setNewCertificacao({
                      ...newCertificacao,
                      url_credencial: e.target.value,
                    })
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_observacoes">Observações (Opcional)</Label>
                <Textarea
                  id="edit_observacoes"
                  value={newCertificacao.observacoes}
                  onChange={(e) =>
                    setNewCertificacao({
                      ...newCertificacao,
                      observacoes: e.target.value,
                    })
                  }
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  editarCertificacao();
                }}
                type="button"
              >
                Atualizar Certificação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}

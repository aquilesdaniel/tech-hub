"use client";

import { StatTile } from "@/components/dashboard/stat-tile";
import { diasAte, inteiro, percentual } from "@/components/dashboard/viz";
import { Navbar } from "@/components/navbar";
import { Paginador } from "@/components/paginador";
import { ProtectedRoute } from "@/components/protected-route";
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
  Spinner,
  Table,
  TextArea,
  toast,
} from "@heroui/react";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Calendar,
  CalendarClock,
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
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");

  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalFiltrado, setTotalFiltrado] = useState(0);
  const [tiposDisponiveis, setTiposDisponiveis] = useState<string[]>([]);
  const [resumo, setResumo] = useState({
    total: 0,
    senior: 0,
    vencendo90: 0,
    vencidas: 0,
    colaboradoresCertificados: 0,
    instituicoes: 0,
  });
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
    const timer = setTimeout(() => {
      setBuscaAplicada(searchTerm);
      setPagina(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchData();
  }, [user, pagina, itensPorPagina, buscaAplicada, filterTipo]);

  useEffect(() => {
    if (user?.tipo !== "admin" && user?.id) {
      setNewCertificacao((prev) => ({
        ...prev,
        colaborador_id: user.id.toString(),
      }));
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({
        page: String(pagina),
        limit: String(itensPorPagina),
      });

      const meuId = Number(user?.id);
      if (user?.tipo !== "admin" && Number.isFinite(meuId))
        params.set("colaborador_id", String(meuId));
      if (buscaAplicada) params.set("search", buscaAplicada);
      if (filterTipo !== "todos") params.set("tipo", filterTipo);

      const [certificacoesRes, colaboradoresRes] = await Promise.all([
        fetch(`/api/certificacoes?${params}`),
        fetch("/api/colaboradores"),
      ]);

      if (certificacoesRes.ok && colaboradoresRes.ok) {
        const certificacoesData = await certificacoesRes.json();
        const colaboradoresData = await colaboradoresRes.json();

        setCertificacoes(certificacoesData.data ?? []);
        setTotalPaginas(certificacoesData.totalPages ?? 1);
        setTotalFiltrado(certificacoesData.total ?? 0);
        if (certificacoesData.resumo) setResumo(certificacoesData.resumo);
        if (certificacoesData.tipos)
          setTiposDisponiveis(certificacoesData.tipos);

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

  const adicionarCertificacao = async () => {
    if (
      !newCertificacao.colaborador_id ||
      !newCertificacao.nome ||
      !newCertificacao.tipo ||
      !newCertificacao.instituicao ||
      !newCertificacao.data_obtencao
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
        toast("Certificação adicionada!", {
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

        window.location.reload();
      }
    } catch (error) {
      console.error("Erro ao adicionar certificação:", error);
      toast.danger("Erro", {
        description: "Não foi possível adicionar a certificação.",
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

        toast("Certificação atualizada!", {
          description: "As informações da certificação foram atualizadas.",
        });
      } else {
        console.log("Erro na resposta:", responseData);
        toast.danger("Erro", {
          description: "Não foi possível atualizar a certificação.",
        });
      }
    } catch (error) {
      console.error("Erro ao editar certificação:", error);
      toast.danger("Erro", {
        description: "Não foi possível atualizar a certificação.",
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

  const ehAdmin = user?.tipo === "admin";
  const participacaoSenior =
    resumo.total > 0 ? (resumo.senior / resumo.total) * 100 : 0;

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
              <h1 className="text-3xl font-bold">Controle de Certificações</h1>
              <p>Gerencie certificações dos colaboradores</p>
            </div>
          </div>

          <section
            aria-label="Indicadores de certificações"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8"
          >
            <StatTile
              rotulo={ehAdmin ? "Certificações" : "Suas certificações"}
              valor={inteiro(resumo.total)}
              icone={Award}
              deltaLegenda={
                tiposDisponiveis.length > 0
                  ? `${inteiro(tiposDisponiveis.length)} tipo(s) diferentes`
                  : "nenhuma registrada ainda"
              }
            />
            <StatTile
              rotulo="Certificações Sênior"
              valor={inteiro(resumo.senior)}
              icone={BadgeCheck}
              deltaLegenda={
                resumo.total > 0
                  ? `${percentual(participacaoSenior, 0)} do total`
                  : "-"
              }
            />
            <StatTile
              rotulo={ehAdmin ? "Colaboradores certificados" : "Instituições"}
              valor={inteiro(
                ehAdmin
                  ? resumo.colaboradoresCertificados
                  : resumo.instituicoes,
              )}
              icone={Calendar}
              deltaLegenda={
                ehAdmin
                  ? `de ${inteiro(colaboradores.length)} cadastrados`
                  : "emissoras das suas credenciais"
              }
            />
            <StatTile
              rotulo="Vencendo em 90 dias"
              valor={inteiro(resumo.vencendo90)}
              icone={CalendarClock}
              deltaLegenda={
                resumo.vencidas > 0
                  ? `${inteiro(resumo.vencidas)} já vencida(s)`
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
                <Modal
                  isOpen={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <Button>
                    <Plus className="w-4 h-4" />
                    Nova Certificação
                  </Button>
                  <Modal.Backdrop>
                    <Modal.Container>
                      <Modal.Dialog className="max-w-2xl">
                        <Modal.CloseTrigger />
                        <Modal.Header>
                          <Modal.Heading>
                            Adicionar Nova Certificação
                          </Modal.Heading>
                        </Modal.Header>
                        <Modal.Body>
                          <p className="text-sm text-muted-foreground mb-2">
                            Registre uma nova certificação
                          </p>
                          <div className="grid gap-4 py-4">
                            {user?.tipo === "admin" && (
                              <div className="grid gap-2">
                                <Label htmlFor="colaborador">Colaborador</Label>
                                <Select
                                  value={newCertificacao.colaborador_id}
                                  onChange={(value) =>
                                    setNewCertificacao({
                                      ...newCertificacao,
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
                            )}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor="nome">
                                  Nome da Certificação
                                </Label>
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
                                  onChange={(value) =>
                                    setNewCertificacao({
                                      ...newCertificacao,
                                      tipo: value as string,
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
                                      {tiposCertificacao.map((tipo) => (
                                        <ListBox.Item
                                          key={tipo}
                                          id={tipo}
                                          textValue={tipo}
                                        >
                                          {tipo}
                                        </ListBox.Item>
                                      ))}
                                    </ListBox>
                                  </Select.Popover>
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
                              <TextArea
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
                        </Modal.Body>
                        <Modal.Footer>
                          <Button onPress={adicionarCertificacao}>
                            Adicionar Certificação
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
                    placeholder="Pesquisar por nome, certificação ou instituição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  selectedKey={filterTipo}
                  onSelectionChange={(chave) => {
                    setFilterTipo(String(chave));
                    setPagina(1);
                  }}
                  aria-label="Filtrar por tipo"
                >
                  <Select.Trigger className="w-full sm:w-48">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="todos" textValue="Todos os tipos">
                        Todos os tipos
                      </ListBox.Item>
                      {tiposDisponiveis.map((tipo) => (
                        <ListBox.Item key={tipo} id={tipo} textValue={tipo}>
                          {tipo}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              <div className="space-y-4">
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Certificações">
                      <Table.Header>
                        <Table.Column isRowHeader>Certificação</Table.Column>
                        <Table.Column>Tipo</Table.Column>
                        <Table.Column className="hidden lg:table-cell">
                          Colaborador
                        </Table.Column>
                        <Table.Column className="hidden md:table-cell">
                          Instituição
                        </Table.Column>
                        <Table.Column className="hidden sm:table-cell">
                          Obtida em
                        </Table.Column>
                        <Table.Column>Vencimento</Table.Column>
                        <Table.Column className="text-right">
                          Ações
                        </Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {certificacoes.length === 0 ? (
                          <Table.Row>
                            <Table.Cell
                              colSpan={7}
                              className="text-center py-8 text-muted"
                            >
                              Nenhuma certificação encontrada
                            </Table.Cell>
                          </Table.Row>
                        ) : (
                          certificacoes.map((certificacao) => {
                            const diasVencimento = diasAte(
                              certificacao.data_vencimento,
                            );

                            return (
                              <Table.Row key={certificacao.id}>
                                <Table.Cell className="font-medium">
                                  {certificacao.nome}
                                </Table.Cell>
                                <Table.Cell>
                                  <Chip className="whitespace-nowrap">
                                    {certificacao.tipo}
                                  </Chip>
                                </Table.Cell>
                                <Table.Cell className="hidden lg:table-cell text-muted">
                                  {certificacao.colaborador_nome}
                                </Table.Cell>
                                <Table.Cell className="hidden md:table-cell text-muted">
                                  {certificacao.instituicao}
                                </Table.Cell>
                                <Table.Cell className="hidden sm:table-cell text-muted">
                                  {new Date(
                                    certificacao.data_obtencao,
                                  ).toLocaleDateString("pt-BR")}
                                </Table.Cell>
                                <Table.Cell>
                                  {certificacao.data_vencimento ? (
                                    <div className="flex items-center gap-2">
                                      <span>
                                        {new Date(
                                          certificacao.data_vencimento,
                                        ).toLocaleDateString("pt-BR")}
                                      </span>
                                      {diasVencimento !== null &&
                                        diasVencimento < 0 && (
                                          <Chip size="sm" color="danger">
                                            Vencida
                                          </Chip>
                                        )}
                                      {diasVencimento !== null &&
                                        diasVencimento >= 0 &&
                                        diasVencimento <= 90 && (
                                          <Chip size="sm" color="warning">
                                            {inteiro(diasVencimento)} d
                                          </Chip>
                                        )}
                                    </div>
                                  ) : (
                                    <span className="text-muted">
                                      Sem validade
                                    </span>
                                  )}
                                </Table.Cell>
                                <Table.Cell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    {certificacao.url_credencial && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        aria-label="Ver credencial"
                                        onPress={() =>
                                          window.open(
                                            certificacao.url_credencial!,
                                            "_blank",
                                          )
                                        }
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                      </Button>
                                    )}
                                    {podeEditarCertificacao(certificacao) && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          aria-label="Editar certificação"
                                          onPress={() =>
                                            abrirDialogEdicao(certificacao)
                                          }
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="danger"
                                          size="sm"
                                          aria-label="Remover certificação"
                                          onPress={() =>
                                            removerCertificacao(certificacao.id)
                                          }
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </Table.Cell>
                              </Table.Row>
                            );
                          })
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>

                <Paginador
                  pagina={pagina}
                  totalPaginas={totalPaginas}
                  onMudarPagina={setPagina}
                  total={totalFiltrado}
                  itensPorPagina={itensPorPagina}
                  onMudarItensPorPagina={(itens) => {
                    setItensPorPagina(itens);
                    setPagina(1);
                  }}
                />
              </div>
            </Card.Content>
          </Card>
        </div>

        <Modal isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="max-w-2xl">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Editar Certificação</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <p className="text-sm text-muted-foreground mb-2">
                    Atualize as informações da certificação
                  </p>
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
                          onChange={(value) =>
                            setNewCertificacao({
                              ...newCertificacao,
                              tipo: value as string,
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
                              {tiposCertificacao.map((tipo) => (
                                <ListBox.Item
                                  key={tipo}
                                  id={tipo}
                                  textValue={tipo}
                                >
                                  {tipo}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
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
                        <Label htmlFor="edit_data_obtencao">
                          Data de Obtenção
                        </Label>
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
                      <Label htmlFor="edit_observacoes">
                        Observações (Opcional)
                      </Label>
                      <TextArea
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
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    onPress={() => {
                      editarCertificacao();
                    }}
                    type="button"
                  >
                    Atualizar Certificação
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}

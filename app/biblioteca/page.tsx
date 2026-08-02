"use client";

import { Navbar } from "@/components/navbar";
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
  Tabs,
  toast,
} from "@heroui/react";
import { ArrowLeft, BookOpen, Plus, Search, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Livro {
  id: number;
  titulo: string;
  autor: string;
  genero: string;
  isbn: string;
  disponivel: boolean;
  capa: string;
}

interface Colaborador {
  id: number;
  nome: string;
  email: string;
  departamento: string;
}

interface Emprestimo {
  id: number;
  livro_id: number;
  colaborador_id: number;
  data_emprestimo: string;
  data_prevista_devolucao: string;
  data_real_devolucao: string | null;
  status: string;
  livro_titulo?: string;
  colaborador_nome?: string;
}

export default function BibliotecaPage() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [livros, setLivros] = useState<Livro[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGenero, setFilterGenero] = useState("todos");
  const [isAddLivroOpen, setIsAddLivroOpen] = useState(false);
  const [isEmprestimoOpen, setIsEmprestimoOpen] = useState(false);
  const [selectedLivro, setSelectedLivro] = useState<Livro | null>(null);
  const [newLivro, setNewLivro] = useState({
    titulo: "",
    autor: "",
    genero: "",
    isbn: "",
    capa: "",
  });
  const [capaLoading, setCapaLoading] = useState(false);
  const [newEmprestimo, setNewEmprestimo] = useState({
    colaboradorId: "",
    dias: "14",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [livrosRes, colaboradoresRes, emprestimosRes] = await Promise.all([
        fetch("/api/biblioteca/livros"),
        fetch("/api/colaboradores"),
        fetch("/api/biblioteca/emprestimos"),
      ]);

      const livrosData = await livrosRes.json();
      const colaboradoresData = await colaboradoresRes.json();
      const emprestimosData = await emprestimosRes.json();

      setLivros(livrosData);
      setColaboradores(colaboradoresData);
      setEmprestimos(emprestimosData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const getColaboradorNome = (id: number) => {
    const colaborador = colaboradores.find((c) => c.id === id);
    return colaborador?.nome || "Desconhecido";
  };

  const getLivroTitulo = (id: number) => {
    const livro = livros.find((l) => l.id === id);
    return livro?.titulo || "Desconhecido";
  };

  const filteredLivros = livros.filter((livro) => {
    const matchesSearch =
      livro.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      livro.autor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterGenero === "todos" || livro.genero === filterGenero;

    return matchesSearch && matchesFilter;
  });

  const adicionarLivro = async () => {
    if (!newLivro.titulo || !newLivro.autor || !newLivro.genero) {
      toast.danger("Erro", {
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    try {
      const response = await fetch("/api/biblioteca/livros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLivro,
          disponivel: true,
          capa:
            newLivro.capa ||
            `/placeholder.svg?height=200&width=150&query=${encodeURIComponent(
              newLivro.titulo + " book",
            )}`,
        }),
      });

      if (response.ok) {
        fetchData();
        setIsAddLivroOpen(false);
        setNewLivro({ titulo: "", autor: "", genero: "", isbn: "", capa: "" });

        toast("Livro adicionado!", {
          description: "Novo livro foi adicionado ao catálogo.",
        });
      }
    } catch (error) {
      console.error("Erro ao adicionar livro:", error);
    }
  };

  const emprestarLivro = async () => {
    if (!selectedLivro || !newEmprestimo.colaboradorId) {
      toast.danger("Erro", {
        description: "Selecione um colaborador.",
      });
      return;
    }

    try {
      const dataEmprestimo = new Date();
      const dataPrevista = new Date();
      dataPrevista.setDate(
        dataPrevista.getDate() + Number.parseInt(newEmprestimo.dias),
      );

      // Criar empréstimo
      await fetch("/api/biblioteca/emprestimos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          livro_id: selectedLivro.id,
          colaborador_id: Number.parseInt(newEmprestimo.colaboradorId),
          data_emprestimo: dataEmprestimo.toISOString().split("T")[0],
          data_prevista_devolucao: dataPrevista.toISOString().split("T")[0],
          status: "emprestado",
        }),
      });

      // Atualizar disponibilidade do livro
      await fetch(`/api/biblioteca/livros/${selectedLivro.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponivel: false }),
      });

      fetchData();
      setIsEmprestimoOpen(false);
      setSelectedLivro(null);
      setNewEmprestimo({ colaboradorId: "", dias: "14" });

      toast("Empréstimo realizado!", {
        description: "Livro emprestado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao emprestar livro:", error);
    }
  };

  const devolverLivro = async (emprestimoId: number, livroId: number) => {
    try {
      // Atualizar empréstimo
      await fetch(`/api/biblioteca/emprestimos/${emprestimoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data_real_devolucao: new Date().toISOString().split("T")[0],
          status: "devolvido",
        }),
      });

      // Atualizar disponibilidade do livro
      await fetch(`/api/biblioteca/livros/${livroId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponivel: true }),
      });

      fetchData();

      toast("Devolução realizada!", {
        description: "Livro devolvido com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao devolver livro:", error);
    }
  };

  const generosUnicos = [...new Set(livros.map((l) => l.genero))];

  const abrirModalEmprestimo = (livro: Livro) => {
    setSelectedLivro(livro);
    setIsEmprestimoOpen(true);
    // Definir colaborador padrão imediatamente
    if (user) {
      setNewEmprestimo({
        colaboradorId: user.id.toString(),
        dias: "14",
      });
    }
  };

  const fecharModalEmprestimo = () => {
    setIsEmprestimoOpen(false);
    setSelectedLivro(null);
    setNewEmprestimo({
      colaboradorId: "",
      dias: "14",
    });
  };

  const buscarCapa = async () => {
    if (!newLivro.titulo) {
      toast.danger("Erro", {
        description: "Digite o título do livro para buscar a capa",
      });
      return;
    }

    setCapaLoading(true);
    try {
      const response = await fetch(
        `/api/biblioteca/livros/buscar-capa?titulo=${encodeURIComponent(
          newLivro.titulo,
        )}&autor=${encodeURIComponent(newLivro.autor)}`,
      );

      if (response.ok) {
        const data = await response.json();
        setNewLivro({
          ...newLivro,
          capa: data.capa,
          // Preencher automaticamente campos se encontrados
          titulo: data.titulo || newLivro.titulo,
          autor: data.autor || newLivro.autor,
          isbn: data.isbn || newLivro.isbn,
        });

        toast("Capa encontrada!", {
          description: "A capa do livro foi carregada automaticamente.",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar capa:", error);
      toast.danger("Erro", {
        description: "Não foi possível buscar a capa do livro",
      });
    } finally {
      setCapaLoading(false);
    }
  };

  const emprestimosAtivos = emprestimos.filter(
    (e) => e.status === "emprestado",
  );

  // Filter emprestimos for regular users to show only their own
  const userEmprestimos =
    user?.tipo === "admin"
      ? emprestimos
      : emprestimos.filter((e) => e.colaborador_id === user?.id);

  const userEmprestimosAtivos = userEmprestimos.filter(
    (e) => e.status === "emprestado",
  );

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
              <h1 className="text-3xl font-bold">Biblioteca</h1>
              <p>Gerencie empréstimos e catálogo de livros</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Total de Livros
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {livros.length}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BookOpen className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      Disponíveis
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {livros.filter((l) => l.disponivel).length}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Users className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {user?.tipo === "admin"
                        ? "Emprestados"
                        : "Seus Empréstimos"}
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {user?.tipo === "admin"
                        ? emprestimosAtivos.length
                        : userEmprestimosAtivos.length}
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          <Tabs defaultSelectedKey="catalogo" className="space-y-6">
            <Tabs.ListContainer>
              <Tabs.List className="grid w-full grid-cols-3">
                <Tabs.Tab id="catalogo">
                  Catálogo
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="emprestimos">
                  Empréstimos Ativos
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="historico">
                  Histórico
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>

            <Tabs.Panel id="catalogo">
              <Card>
                <Card.Header>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <Card.Title>Catálogo de Livros</Card.Title>
                      <Card.Description>
                        Todos os livros disponíveis na biblioteca
                      </Card.Description>
                    </div>
                    {user?.tipo === "admin" && (
                      <Modal
                        isOpen={isAddLivroOpen}
                        onOpenChange={setIsAddLivroOpen}
                      >
                        <Button>
                          <Plus className="w-4 h-4" />
                          Novo Livro
                        </Button>
                        <Modal.Backdrop>
                          <Modal.Container>
                            <Modal.Dialog>
                              <Modal.CloseTrigger />
                              <Modal.Header>
                                <Modal.Heading>
                                  Adicionar Novo Livro
                                </Modal.Heading>
                              </Modal.Header>
                              <Modal.Body>
                                <p className="text-sm text-gray-600">
                                  Adicione um novo livro ao catálogo da
                                  biblioteca
                                </p>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="titulo">Título</Label>
                                    <Input
                                      id="titulo"
                                      value={newLivro.titulo}
                                      onChange={(e) =>
                                        setNewLivro({
                                          ...newLivro,
                                          titulo: e.target.value,
                                        })
                                      }
                                      placeholder="Título do livro"
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="autor">Autor</Label>
                                    <Input
                                      id="autor"
                                      value={newLivro.autor}
                                      onChange={(e) =>
                                        setNewLivro({
                                          ...newLivro,
                                          autor: e.target.value,
                                        })
                                      }
                                      placeholder="Nome do autor"
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="genero">Gênero</Label>
                                    <Input
                                      id="genero"
                                      value={newLivro.genero}
                                      onChange={(e) =>
                                        setNewLivro({
                                          ...newLivro,
                                          genero: e.target.value,
                                        })
                                      }
                                      placeholder="Gênero do livro"
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="isbn">
                                      ISBN (opcional)
                                    </Label>
                                    <Input
                                      id="isbn"
                                      value={newLivro.isbn}
                                      onChange={(e) =>
                                        setNewLivro({
                                          ...newLivro,
                                          isbn: e.target.value,
                                        })
                                      }
                                      placeholder="ISBN do livro"
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Capa do Livro</Label>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onPress={buscarCapa}
                                        isDisabled={
                                          !newLivro.titulo || capaLoading
                                        }
                                        className="flex-1"
                                      >
                                        {capaLoading
                                          ? "Buscando..."
                                          : "Buscar Capa Automaticamente"}
                                      </Button>
                                    </div>
                                    {newLivro.capa && (
                                      <div className="flex gap-4 mt-2">
                                        <Image
                                          src={newLivro.capa}
                                          alt="Prévia da capa"
                                          width={80}
                                          height={120}
                                          className="rounded-lg object-cover border"
                                        />
                                        <div className="flex-1">
                                          <p className="text-sm text-gray-600 mb-2">
                                            Prévia da capa encontrada
                                          </p>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onPress={() =>
                                              setNewLivro({
                                                ...newLivro,
                                                capa: "",
                                              })
                                            }
                                          >
                                            Remover Capa
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </Modal.Body>
                              <Modal.Footer>
                                <Button onPress={adicionarLivro}>
                                  Adicionar Livro
                                </Button>
                              </Modal.Footer>
                            </Modal.Dialog>
                          </Modal.Container>
                        </Modal.Backdrop>
                      </Modal>
                    )}
                  </div>
                </Card.Header>
                <Card.Content>
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Pesquisar por título ou autor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select
                      value={filterGenero}
                      onChange={(value) => setFilterGenero(value as string)}
                      placeholder="Filtrar por gênero"
                    >
                      <Select.Trigger className="w-full sm:w-48">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="todos" textValue="Todos os gêneros">
                            Todos os gêneros
                          </ListBox.Item>
                          {generosUnicos.map((genero) => (
                            <ListBox.Item
                              key={genero}
                              id={genero}
                              textValue={genero}
                            >
                              {genero}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLivros.map((livro) => (
                      <Card
                        key={livro.id}
                        className={`${!livro.disponivel ? "opacity-75" : ""}`}
                      >
                        <Card.Content className="p-6">
                          <div className="flex gap-4">
                            <Image
                              src={livro.capa || "/placeholder.svg"}
                              alt={livro.titulo}
                              width={80}
                              height={120}
                              className="rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">
                                {livro.titulo}
                              </h3>
                              <p className="text-gray-600 mb-2">
                                {livro.autor}
                              </p>
                              <Chip className="mb-3">{livro.genero}</Chip>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <Chip
                                  color={
                                    livro.disponivel ? "default" : "danger"
                                  }
                                >
                                  {livro.disponivel
                                    ? "Disponível"
                                    : "Emprestado"}
                                </Chip>
                                {livro.disponivel && (
                                  <Button
                                    size="sm"
                                    onPress={() => abrirModalEmprestimo(livro)}
                                  >
                                    Emprestar
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card.Content>
                      </Card>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel id="emprestimos">
              <Card>
                <Card.Header>
                  <Card.Title>
                    {user?.tipo === "admin"
                      ? "Empréstimos Ativos"
                      : "Seus Empréstimos Ativos"}
                  </Card.Title>
                  <Card.Description>
                    {user?.tipo === "admin"
                      ? "Livros atualmente emprestados"
                      : "Livros que você emprestou"}
                  </Card.Description>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-4">
                    {userEmprestimosAtivos.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          {user?.tipo === "admin"
                            ? "Nenhum empréstimo ativo"
                            : "Você não possui empréstimos ativos"}
                        </p>
                      </div>
                    ) : (
                      userEmprestimosAtivos.map((emprestimo) => (
                        <Card
                          key={emprestimo.id}
                          className="border-l-4 border-l-yellow-500"
                        >
                          <Card.Content className="p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-1">
                                  {getLivroTitulo(emprestimo.livro_id)}
                                </h3>
                                <p className="text-gray-600 mb-2">
                                  Emprestado para:{" "}
                                  {getColaboradorNome(
                                    emprestimo.colaborador_id,
                                  )}
                                </p>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                  <span>
                                    Empréstimo:{" "}
                                    {new Date(
                                      emprestimo.data_emprestimo,
                                    ).toLocaleDateString("pt-BR")}
                                  </span>
                                  <span>
                                    Devolução prevista:{" "}
                                    {new Date(
                                      emprestimo.data_prevista_devolucao,
                                    ).toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                              </div>
                              {(user?.tipo === "admin" ||
                                emprestimo.colaborador_id === user?.id) && (
                                <Button
                                  onPress={() =>
                                    devolverLivro(
                                      emprestimo.id,
                                      emprestimo.livro_id,
                                    )
                                  }
                                  variant="outline"
                                >
                                  Devolver
                                </Button>
                              )}
                            </div>
                          </Card.Content>
                        </Card>
                      ))
                    )}
                  </div>
                </Card.Content>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel id="historico">
              <Card>
                <Card.Header>
                  <Card.Title>Histórico de Empréstimos</Card.Title>
                  <Card.Description>
                    Todos os empréstimos realizados
                  </Card.Description>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-4">
                    {emprestimos.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          Nenhum empréstimo registrado
                        </p>
                      </div>
                    ) : (
                      emprestimos.map((emprestimo) => (
                        <Card
                          key={emprestimo.id}
                          className={`border-l-4 ${
                            emprestimo.status === "emprestado"
                              ? "border-l-yellow-500"
                              : "border-l-green-500"
                          }`}
                        >
                          <Card.Content className="p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-1">
                                  {getLivroTitulo(emprestimo.livro_id)}
                                </h3>
                                <p className="text-gray-600 mb-2">
                                  {getColaboradorNome(
                                    emprestimo.colaborador_id,
                                  )}
                                </p>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                  <span>
                                    Empréstimo:{" "}
                                    {new Date(
                                      emprestimo.data_emprestimo,
                                    ).toLocaleDateString("pt-BR")}
                                  </span>
                                  {emprestimo.data_real_devolucao && (
                                    <span>
                                      Devolvido:{" "}
                                      {new Date(
                                        emprestimo.data_real_devolucao,
                                      ).toLocaleDateString("pt-BR")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Chip
                                color={
                                  emprestimo.status === "emprestado"
                                    ? "danger"
                                    : "default"
                                }
                              >
                                {emprestimo.status === "emprestado"
                                  ? "Emprestado"
                                  : "Devolvido"}
                              </Chip>
                            </div>
                          </Card.Content>
                        </Card>
                      ))
                    )}
                  </div>
                </Card.Content>
              </Card>
            </Tabs.Panel>
          </Tabs>

          {/* Dialog de Empréstimo */}
          <Modal isOpen={isEmprestimoOpen} onOpenChange={fecharModalEmprestimo}>
            <Modal.Backdrop>
              <Modal.Container>
                <Modal.Dialog>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading>Emprestar Livro</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <p className="text-sm text-gray-600">
                      {selectedLivro &&
                        `Emprestar "${selectedLivro.titulo}" para um colaborador`}
                    </p>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="colaborador-emprestimo">
                          Colaborador
                        </Label>
                        <Select
                          value={newEmprestimo.colaboradorId}
                          onChange={(value) =>
                            setNewEmprestimo({
                              ...newEmprestimo,
                              colaboradorId: value as string,
                            })
                          }
                          placeholder="Selecione um colaborador"
                          isDisabled={user?.tipo !== "admin"}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {(user?.tipo === "admin"
                                ? colaboradores
                                : colaboradores.filter((c) => c.id === user?.id)
                              ).map((colaborador) => (
                                <ListBox.Item
                                  key={colaborador.id}
                                  id={colaborador.id.toString()}
                                  textValue={`${colaborador.nome} - ${colaborador.departamento}`}
                                >
                                  {colaborador.nome} -{" "}
                                  {colaborador.departamento}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                        {user?.tipo !== "admin" && (
                          <p className="text-sm text-gray-500">
                            Você pode emprestar livros apenas para si mesmo
                          </p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="dias">Período (dias)</Label>
                        <Select
                          value={newEmprestimo.dias}
                          onChange={(value) =>
                            setNewEmprestimo({
                              ...newEmprestimo,
                              dias: value as string,
                            })
                          }
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item id="7" textValue="7 dias">
                                7 dias
                              </ListBox.Item>
                              <ListBox.Item id="14" textValue="14 dias">
                                14 dias
                              </ListBox.Item>
                              <ListBox.Item id="21" textValue="21 dias">
                                21 dias
                              </ListBox.Item>
                              <ListBox.Item id="30" textValue="30 dias">
                                30 dias
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    </div>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button onPress={emprestarLivro}>
                      Confirmar Empréstimo
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

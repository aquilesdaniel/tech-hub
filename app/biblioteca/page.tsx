"use client";

import { useConfirmacao } from "@/components/confirmacao";
import { StatTile } from "@/components/dashboard/stat-tile";
import { diasAte, inteiro, percentual } from "@/components/dashboard/viz";
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
  InputGroup,
  ListBox,
  Select,
  Tabs,
  TextField,
  toast,
  Typography,
} from "@heroui/react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BookOpen,
  Hand,
  Library,
  Plus,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import Image from "next/image";
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
  const confirmar = useConfirmacao();
  const [livros, setLivros] = useState<Livro[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  const [emprestimosAtivos, setEmprestimosAtivos] = useState<Emprestimo[]>([]);
  const [historico, setHistorico] = useState<Emprestimo[]>([]);
  const [paginaAtivos, setPaginaAtivos] = useState(1);
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const [totalPaginasAtivos, setTotalPaginasAtivos] = useState(1);
  const [totalPaginasHistorico, setTotalPaginasHistorico] = useState(1);
  const [totalAtivos, setTotalAtivos] = useState(0);
  const [totalHistorico, setTotalHistorico] = useState(0);
  const [buscaEmprestimos, setBuscaEmprestimos] = useState("");
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [resumo, setResumo] = useState({
    total: 0,
    ativos: 0,
    atrasados: 0,
    devolvidos: 0,
  });
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
    if (!user) {
      return;
    }

    fetchData();
  }, [user, paginaAtivos, paginaHistorico, itensPorPagina, buscaEmprestimos]);

  const fetchData = async () => {
    try {
      const base = new URLSearchParams({ limit: String(itensPorPagina) });
      if (buscaEmprestimos) base.set("search", buscaEmprestimos);
      const meuId = Number(user?.id);
      if (user?.tipo !== "admin" && Number.isFinite(meuId))
        base.set("colaborador_id", String(meuId));

      const paramsAtivos = new URLSearchParams(base);
      paramsAtivos.set("status", "emprestado");
      paramsAtivos.set("page", String(paginaAtivos));

      const paramsHistorico = new URLSearchParams(base);
      paramsHistorico.set("page", String(paginaHistorico));

      const [livrosRes, colaboradoresRes, ativosRes, historicoRes] =
        await Promise.all([
          fetch("/api/biblioteca/livros"),
          fetch("/api/colaboradores"),
          fetch(`/api/biblioteca/emprestimos?${paramsAtivos}`),
          fetch(`/api/biblioteca/emprestimos?${paramsHistorico}`),
        ]);

      const livrosData = await livrosRes.json();
      const colaboradoresData = await colaboradoresRes.json();
      const ativosData = await ativosRes.json();
      const historicoData = await historicoRes.json();

      setLivros(livrosData);
      setColaboradores(colaboradoresData);

      setEmprestimosAtivos(ativosData.data ?? []);
      setTotalPaginasAtivos(ativosData.totalPages ?? 1);
      setTotalAtivos(ativosData.total ?? 0);

      setHistorico(historicoData.data ?? []);
      setTotalPaginasHistorico(historicoData.totalPages ?? 1);
      setTotalHistorico(historicoData.total ?? 0);
      if (historicoData.resumo) setResumo(historicoData.resumo);
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
    const confirmado = await confirmar({
      titulo: "Devolver livro",
      descricao: `Confirmar a devolução de "${getLivroTitulo(livroId)}"? O livro voltará para o catálogo como disponível.`,
      rotuloConfirmar: "Devolver",
    });
    if (!confirmado) return;

    try {
      await fetch(`/api/biblioteca/emprestimos/${emprestimoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data_real_devolucao: new Date().toISOString().split("T")[0],
          status: "devolvido",
        }),
      });

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
      const params = new URLSearchParams({ titulo: newLivro.titulo });
      if (newLivro.autor) {
        params.set("autor", newLivro.autor);
      }

      const response = await fetch(
        `/api/biblioteca/livros/buscar-capa?${params}`,
      );
      const data = await response.json();

      if (!response.ok) {
        toast.danger("Erro", {
          description: data.error ?? "Não foi possível buscar a capa do livro.",
        });
        return;
      }

      if (!data.capa) {
        toast.warning("Capa não encontrada", {
          description: "Confira o título e o autor, ou informe a capa depois.",
        });
        return;
      }

      setNewLivro({
        ...newLivro,
        capa: data.capa,
        autor: newLivro.autor || data.autor || "",
        isbn: newLivro.isbn || data.isbn || "",
      });

      toast("Capa encontrada!", {
        description: "A capa do livro foi carregada automaticamente.",
      });
    } catch (error) {
      console.error("Erro ao buscar capa:", error);
      toast.danger("Erro", {
        description: "Não foi possível buscar a capa do livro.",
      });
    } finally {
      setCapaLoading(false);
    }
  };

  const ehAdmin = user?.tipo === "admin";

  const reiniciarPaginas = () => {
    setPaginaAtivos(1);
    setPaginaHistorico(1);
  };

  const colunasEmprestimoBase: ColumnDef<Emprestimo, any>[] = [
    {
      id: "livro",
      header: "Livro",
      accessorFn: (linha) =>
        linha.livro_titulo ?? getLivroTitulo(linha.livro_id),
      cell: (info) => (
        <span className="font-medium">{String(info.getValue() ?? "")}</span>
      ),
    },
    {
      id: "colaborador",
      header: "Colaborador",
      accessorFn: (linha) =>
        linha.colaborador_nome ?? getColaboradorNome(linha.colaborador_id),
      meta: { classe: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "data_emprestimo",
      header: "Empréstimo",
      cell: (info) =>
        new Date(String(info.getValue())).toLocaleDateString("pt-BR"),
      meta: { classe: "hidden md:table-cell text-muted" },
    },
  ];

  const colunasAtivos: ColumnDef<Emprestimo, any>[] = [
    ...colunasEmprestimoBase,
    {
      accessorKey: "data_prevista_devolucao",
      header: "Devolução prevista",
      cell: ({ row, getValue }) => {
        const dias = diasAte(row.original.data_prevista_devolucao);
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap">
              {new Date(String(getValue())).toLocaleDateString("pt-BR")}
            </span>
            {dias !== null && dias < 0 && (
              <Chip size="sm" color="danger">
                {inteiro(Math.abs(dias))} d de atraso
              </Chip>
            )}
          </div>
        );
      },
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) =>
        ehAdmin || row.original.colaborador_id === user?.id ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              aria-label="Devolver livro"
              onPress={() =>
                devolverLivro(row.original.id, row.original.livro_id)
              }
            >
              <RotateCcw />
              <span className="max-sm:hidden">Devolver</span>
            </Button>
          </div>
        ) : null,
      meta: { alinhar: "direita" },
    },
  ];

  const colunasHistorico: ColumnDef<Emprestimo, any>[] = [
    ...colunasEmprestimoBase,
    {
      accessorKey: "data_real_devolucao",
      header: "Devolvido em",
      cell: (info) =>
        info.getValue()
          ? new Date(String(info.getValue())).toLocaleDateString("pt-BR")
          : "-",
      meta: { classe: "text-muted" },
    },
    {
      accessorKey: "status",
      header: "Situação",
      cell: (info) => (
        <Chip color={info.getValue() === "emprestado" ? "danger" : "default"}>
          {info.getValue() === "emprestado" ? "Emprestado" : "Devolvido"}
        </Chip>
      ),
      meta: { alinhar: "direita" },
    },
  ];
  const livrosDisponiveis = livros.filter((l) => l.disponivel).length;
  const taxaDisponibilidade =
    livros.length > 0 ? (livrosDisponiveis / livros.length) * 100 : 0;

  if (loading) {
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
          titulo="Biblioteca"
          descricao="Gerencie empréstimos e catálogo de livros"
          voltarHref="/"
        />

        <section
          aria-label="Indicadores da biblioteca"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatTile
            rotulo="Acervo"
            valor={inteiro(livros.length)}
            icone={BookOpen}
            deltaLegenda={`${inteiro(livrosDisponiveis)} título(s) na estante agora`}
          />
          <StatTile
            rotulo="Disponibilidade"
            valor={percentual(taxaDisponibilidade, 0)}
            icone={Library}
            deltaLegenda={
              livros.length > 0
                ? `${inteiro(livrosDisponiveis)} de ${inteiro(livros.length)} livros`
                : "nenhum livro cadastrado"
            }
          />
          <StatTile
            rotulo={ehAdmin ? "Empréstimos ativos" : "Seus empréstimos"}
            valor={inteiro(resumo.ativos)}
            icone={Users}
            deltaLegenda={
              resumo.atrasados > 0
                ? `${inteiro(resumo.atrasados)} em atraso`
                : "nenhum em atraso"
            }
          />
          <StatTile
            rotulo={ehAdmin ? "Empréstimos no histórico" : "Seu histórico"}
            valor={inteiro(resumo.total)}
            icone={RotateCcw}
            deltaLegenda={`${inteiro(resumo.devolvidos)} já devolvido(s)`}
          />
        </section>

        <Tabs defaultSelectedKey="catalogo" className="gap-4">
          <Tabs.ListContainer>
            <Tabs.List className="grid w-full grid-cols-1 sm:grid-cols-3">
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

          <Tabs.Panel className="p-0" id="catalogo">
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
                    <ModalForm
                      isOpen={isAddLivroOpen}
                      onOpenChange={setIsAddLivroOpen}
                      titulo="Adicionar Novo Livro"
                      descricao="Adicione um novo livro ao catálogo da biblioteca"
                      gatilho={
                        <Button>
                          <Plus />
                          Novo Livro
                        </Button>
                      }
                      rotuloConfirmar="Adicionar Livro"
                      onConfirmar={adicionarLivro}
                    >
                      <LinhaCampos>
                        <CampoModal rotulo="Título" htmlFor="titulo">
                          <Input
                            id="titulo"
                            value={newLivro.titulo}
                            onChange={(e) =>
                              setNewLivro({
                                ...newLivro,
                                titulo: e.target.value,
                              })
                            }
                            variant="secondary"
                            placeholder="Título do livro"
                          />
                        </CampoModal>

                        <CampoModal rotulo="Autor" htmlFor="autor">
                          <Input
                            id="autor"
                            value={newLivro.autor}
                            onChange={(e) =>
                              setNewLivro({
                                ...newLivro,
                                autor: e.target.value,
                              })
                            }
                            variant="secondary"
                            placeholder="Nome do autor"
                          />
                        </CampoModal>
                      </LinhaCampos>

                      <LinhaCampos>
                        <CampoModal rotulo="Gênero" htmlFor="genero">
                          <Input
                            id="genero"
                            value={newLivro.genero}
                            onChange={(e) =>
                              setNewLivro({
                                ...newLivro,
                                genero: e.target.value,
                              })
                            }
                            variant="secondary"
                            placeholder="Gênero do livro"
                          />
                        </CampoModal>

                        <CampoModal rotulo="ISBN (opcional)" htmlFor="isbn">
                          <Input
                            id="isbn"
                            value={newLivro.isbn}
                            onChange={(e) =>
                              setNewLivro({
                                ...newLivro,
                                isbn: e.target.value,
                              })
                            }
                            variant="secondary"
                            placeholder="ISBN do livro"
                          />
                        </CampoModal>
                      </LinhaCampos>

                      <CampoModal rotulo="Capa do Livro">
                        <Button
                          type="button"
                          variant="outline"
                          onPress={buscarCapa}
                          isDisabled={!newLivro.titulo || capaLoading}
                          fullWidth
                        >
                          {capaLoading
                            ? "Buscando..."
                            : "Buscar Capa Automaticamente"}
                        </Button>

                        {newLivro.capa && (
                          <div className="mt-2 flex gap-4">
                            <Image
                              src={newLivro.capa}
                              alt="Prévia da capa"
                              width={80}
                              height={120}
                              className="rounded-lg border border-border object-cover"
                            />
                            <div className="flex-1">
                              <p className="mb-2 text-sm text-muted">
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
                      </CampoModal>
                    </ModalForm>
                  )}
                </div>
              </Card.Header>
              <Card.Content className="gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <TextField className="w-full max-w-full" name="email">
                    <InputGroup variant="secondary">
                      <InputGroup.Prefix>
                        <Search className="size-4 text-muted" />
                      </InputGroup.Prefix>
                      <InputGroup.Input
                        placeholder="Pesquisar por título ou autor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                  </TextField>

                  <Select
                    value={filterGenero}
                    onChange={(value) => setFilterGenero(value as string)}
                    placeholder="Filtrar por gênero"
                    variant="secondary"
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

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredLivros.map((livro) => (
                    <Card variant="secondary" key={livro.id}>
                      <Card.Content className="flex gap-4">
                        <Image
                          src={livro.capa || "/placeholder.svg"}
                          alt={livro.titulo}
                          width={80}
                          height={120}
                          className="h-30 w-20 shrink-0 rounded-lg object-cover"
                        />

                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div className="min-w-0">
                            <Card.Title className="truncate">
                              {livro.titulo}
                            </Card.Title>
                            <Typography
                              className="truncate"
                              color="muted"
                              type="body-sm"
                            >
                              {livro.autor}
                            </Typography>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Chip
                              color={livro.disponivel ? "success" : "danger"}
                              variant="soft"
                              size="sm"
                            >
                              {livro.disponivel ? "Disponível" : "Emprestado"}
                            </Chip>

                            <Chip color="accent" variant="soft" size="sm">
                              {livro.genero}
                            </Chip>
                          </div>

                          {livro.disponivel && (
                            <Button
                              size="sm"
                              className="mt-auto max-sm:w-full sm:w-fit"
                              onPress={() => abrirModalEmprestimo(livro)}
                            >
                              <Hand />
                              Emprestar
                            </Button>
                          )}
                        </div>
                      </Card.Content>
                    </Card>
                  ))}
                </div>
              </Card.Content>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel className="p-0" id="emprestimos">
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
                <DataTable
                  colunas={colunasAtivos}
                  dados={emprestimosAtivos}
                  rotulo="Empréstimos ativos"
                  vazio={
                    ehAdmin
                      ? "Nenhum empréstimo ativo"
                      : "Você não possui empréstimos ativos"
                  }
                  total={totalAtivos}
                  pagina={paginaAtivos}
                  totalPaginas={totalPaginasAtivos}
                  onMudarPagina={setPaginaAtivos}
                  itensPorPagina={itensPorPagina}
                  onMudarItensPorPagina={(itens) => {
                    setItensPorPagina(itens);
                    reiniciarPaginas();
                  }}
                  busca={buscaEmprestimos}
                  onMudarBusca={(valor) => {
                    setBuscaEmprestimos(valor);
                    reiniciarPaginas();
                  }}
                  placeholderBusca="Pesquisar por livro ou colaborador..."
                />
              </Card.Content>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel className="p-0" id="historico">
            <Card>
              <Card.Header>
                <Card.Title>Histórico de Empréstimos</Card.Title>
                <Card.Description>
                  Todos os empréstimos realizados
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <DataTable
                  colunas={colunasHistorico}
                  dados={historico}
                  rotulo="Histórico de empréstimos"
                  vazio="Nenhum empréstimo registrado"
                  total={totalHistorico}
                  pagina={paginaHistorico}
                  totalPaginas={totalPaginasHistorico}
                  onMudarPagina={setPaginaHistorico}
                  itensPorPagina={itensPorPagina}
                  onMudarItensPorPagina={(itens) => {
                    setItensPorPagina(itens);
                    reiniciarPaginas();
                  }}
                  busca={buscaEmprestimos}
                  onMudarBusca={(valor) => {
                    setBuscaEmprestimos(valor);
                    reiniciarPaginas();
                  }}
                  placeholderBusca="Pesquisar por livro ou colaborador..."
                />
              </Card.Content>
            </Card>
          </Tabs.Panel>
        </Tabs>

        <ModalForm
          isOpen={isEmprestimoOpen}
          onOpenChange={fecharModalEmprestimo}
          titulo="Emprestar Livro"
          descricao={
            selectedLivro
              ? `Emprestar "${selectedLivro.titulo}" para um colaborador`
              : undefined
          }
          rotuloConfirmar="Confirmar Empréstimo"
          onConfirmar={emprestarLivro}
        >
          <CampoModal rotulo="Colaborador" htmlFor="colaborador-emprestimo">
            <Select
              value={newEmprestimo.colaboradorId}
              onChange={(value) =>
                setNewEmprestimo({
                  ...newEmprestimo,
                  colaboradorId: value as string,
                })
              }
              variant="secondary"
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
                      {colaborador.nome} - {colaborador.departamento}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {user?.tipo !== "admin" && (
              <p className="text-sm text-muted">
                Você pode emprestar livros apenas para si mesmo
              </p>
            )}
          </CampoModal>

          <CampoModal rotulo="Período (dias)" htmlFor="dias">
            <Select
              value={newEmprestimo.dias}
              onChange={(value) =>
                setNewEmprestimo({
                  ...newEmprestimo,
                  dias: value as string,
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
          </CampoModal>
        </ModalForm>
      </LayoutPagina>
    </ProtectedRoute>
  );
}

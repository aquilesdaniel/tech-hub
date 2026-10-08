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

interface Book {
  id: number;
  titulo: string;
  autor: string;
  genero: string;
  isbn: string;
  disponivel: boolean;
  capa: string;
}

interface Employee {
  id: number;
  nome: string;
  email: string;
  departamento: string;
}

interface Loan {
  id: number;
  livro_id: number;
  colaborador_id: number;
  data_emprestimo: string;
  data_prevista_devolucao: string;
  data_real_devolucao: string | null;
  status: string;
  book_title?: string;
  employee_name?: string;
}

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const confirm = useConfirmation();
  const [books, setBooks] = useState<Book[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [history, setHistory] = useState<Loan[]>([]);
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [activeTotal, setActiveTotal] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loanSearch, setLoanSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    overdue: 0,
    returned: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGenre, setFilterGenre] = useState("all");
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isLoanOpen, setIsLoanOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [newBook, setNewBook] = useState({
    titulo: "",
    autor: "",
    genero: "",
    isbn: "",
    capa: "",
  });
  const [coverLoading, setCoverLoading] = useState(false);
  const [newLoan, setNewLoan] = useState({
    employeeId: "",
    days: "14",
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    fetchData();
  }, [user, activePage, historyPage, itemsPerPage, loanSearch]);

  const fetchData = async () => {
    try {
      const base = new URLSearchParams({ limit: String(itemsPerPage) });
      if (loanSearch) base.set("search", loanSearch);
      const myId = Number(user?.id);
      if (user?.tipo !== "admin" && Number.isFinite(myId))
        base.set("colaborador_id", String(myId));

      const activeParams = new URLSearchParams(base);
      activeParams.set("status", "emprestado");
      activeParams.set("page", String(activePage));

      const historyParams = new URLSearchParams(base);
      historyParams.set("page", String(historyPage));

      const [booksRes, employeesRes, activeRes, historyRes] =
        await Promise.all([
          fetch("/api/biblioteca/livros"),
          fetch("/api/colaboradores"),
          fetch(`/api/biblioteca/emprestimos?${activeParams}`),
          fetch(`/api/biblioteca/emprestimos?${historyParams}`),
        ]);

      const booksData = await booksRes.json();
      const employeesData = await employeesRes.json();
      const activeData = await activeRes.json();
      const historyData = await historyRes.json();

      setBooks(booksData);
      setEmployees(employeesData);

      setActiveLoans(activeData.data ?? []);
      setActiveTotalPages(activeData.totalPages ?? 1);
      setActiveTotal(activeData.total ?? 0);

      setHistory(historyData.data ?? []);
      setHistoryTotalPages(historyData.totalPages ?? 1);
      setHistoryTotal(historyData.total ?? 0);
      if (historyData.summary) setSummary(historyData.summary);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (id: number) => {
    const employee = employees.find((c) => c.id === id);
    return employee?.nome || "Desconhecido";
  };

  const getBookTitle = (id: number) => {
    const book = books.find((l) => l.id === id);
    return book?.titulo || "Desconhecido";
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.autor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterGenre === "all" || book.genero === filterGenre;

    return matchesSearch && matchesFilter;
  });

  const addBook = async () => {
    if (!newBook.titulo || !newBook.autor || !newBook.genero) {
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
          ...newBook,
          disponivel: true,
          capa:
            newBook.capa ||
            `/placeholder.svg?height=200&width=150&query=${encodeURIComponent(
              newBook.titulo + " book",
            )}`,
        }),
      });

      if (response.ok) {
        fetchData();
        setIsAddBookOpen(false);
        setNewBook({ titulo: "", autor: "", genero: "", isbn: "", capa: "" });

        toast("Livro adicionado!", {
          description: "Novo livro foi adicionado ao catálogo.",
        });
      }
    } catch (error) {
      console.error("Erro ao adicionar livro:", error);
    }
  };

  const lendBook = async () => {
    if (!selectedBook || !newLoan.employeeId) {
      toast.danger("Erro", {
        description: "Selecione um colaborador.",
      });
      return;
    }

    try {
      const loanDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(
        dueDate.getDate() + Number.parseInt(newLoan.days),
      );

      await fetch("/api/biblioteca/emprestimos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          livro_id: selectedBook.id,
          colaborador_id: Number.parseInt(newLoan.employeeId),
          data_emprestimo: loanDate.toISOString().split("T")[0],
          data_prevista_devolucao: dueDate.toISOString().split("T")[0],
          status: "emprestado",
        }),
      });

      await fetch(`/api/biblioteca/livros/${selectedBook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponivel: false }),
      });

      fetchData();
      setIsLoanOpen(false);
      setSelectedBook(null);
      setNewLoan({ employeeId: "", days: "14" });

      toast("Empréstimo realizado!", {
        description: "Livro emprestado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao emprestar livro:", error);
    }
  };

  const returnBook = async (loanId: number, bookId: number) => {
    const confirmed = await confirm({
      title: "Devolver livro",
      description: `Confirmar a devolução de "${getBookTitle(bookId)}"? O livro voltará para o catálogo como disponível.`,
      confirmLabel: "Devolver",
    });
    if (!confirmed) return;

    try {
      await fetch(`/api/biblioteca/emprestimos/${loanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data_real_devolucao: new Date().toISOString().split("T")[0],
          status: "devolvido",
        }),
      });

      await fetch(`/api/biblioteca/livros/${bookId}`, {
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

  const uniqueGenres = [...new Set(books.map((l) => l.genero))];

  const openLoanModal = (book: Book) => {
    setSelectedBook(book);
    setIsLoanOpen(true);

    if (user) {
      setNewLoan({
        employeeId: user.id.toString(),
        days: "14",
      });
    }
  };

  const closeLoanModal = () => {
    setIsLoanOpen(false);
    setSelectedBook(null);
    setNewLoan({
      employeeId: "",
      days: "14",
    });
  };

  const fetchCover = async () => {
    if (!newBook.titulo) {
      toast.danger("Erro", {
        description: "Digite o título do livro para buscar a capa",
      });
      return;
    }

    setCoverLoading(true);
    try {
      const params = new URLSearchParams({ titulo: newBook.titulo });
      if (newBook.autor) {
        params.set("autor", newBook.autor);
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

      setNewBook({
        ...newBook,
        capa: data.capa,
        autor: newBook.autor || data.autor || "",
        isbn: newBook.isbn || data.isbn || "",
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
      setCoverLoading(false);
    }
  };

  const isAdmin = user?.tipo === "admin";

  const resetPages = () => {
    setActivePage(1);
    setHistoryPage(1);
  };

  const baseLoanColumns: ColumnDef<Loan, any>[] = [
    {
      id: "book",
      header: "Livro",
      accessorFn: (row) =>
        row.book_title ?? getBookTitle(row.livro_id),
      cell: (info) => (
        <span className="font-medium">{String(info.getValue() ?? "")}</span>
      ),
    },
    {
      id: "employee",
      header: "Colaborador",
      accessorFn: (row) =>
        row.employee_name ?? getEmployeeName(row.colaborador_id),
      meta: { className: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "data_emprestimo",
      header: "Empréstimo",
      cell: (info) =>
        new Date(String(info.getValue())).toLocaleDateString("pt-BR"),
      meta: { className: "hidden md:table-cell text-muted" },
    },
  ];

  const activeColumns: ColumnDef<Loan, any>[] = [
    ...baseLoanColumns,
    {
      accessorKey: "data_prevista_devolucao",
      header: "Devolução prevista",
      cell: ({ row, getValue }) => {
        const days = daysUntil(row.original.data_prevista_devolucao);
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap">
              {new Date(String(getValue())).toLocaleDateString("pt-BR")}
            </span>
            {days !== null && days < 0 && (
              <Chip size="sm" color="danger">
                {formatInteger(Math.abs(days))} d de atraso
              </Chip>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) =>
        isAdmin || row.original.colaborador_id === user?.id ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              aria-label="Devolver livro"
              onPress={() =>
                returnBook(row.original.id, row.original.livro_id)
              }
            >
              <RotateCcw />
              <span className="max-sm:hidden">Devolver</span>
            </Button>
          </div>
        ) : null,
      meta: { align: "right" },
    },
  ];

  const historyColumns: ColumnDef<Loan, any>[] = [
    ...baseLoanColumns,
    {
      accessorKey: "data_real_devolucao",
      header: "Devolvido em",
      cell: (info) =>
        info.getValue()
          ? new Date(String(info.getValue())).toLocaleDateString("pt-BR")
          : "-",
      meta: { className: "text-muted" },
    },
    {
      accessorKey: "status",
      header: "Situação",
      cell: (info) => (
        <Chip color={info.getValue() === "emprestado" ? "danger" : "default"}>
          {info.getValue() === "emprestado" ? "Emprestado" : "Devolvido"}
        </Chip>
      ),
      meta: { align: "right" },
    },
  ];
  const availableBooks = books.filter((l) => l.disponivel).length;
  const availabilityRate =
    books.length > 0 ? (availableBooks / books.length) * 100 : 0;

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
          title="Biblioteca"
          description="Gerencie empréstimos e catálogo de livros"
          backHref="/"
        />

        <section
          aria-label="Indicadores da biblioteca"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatTile
            label="Acervo"
            value={formatInteger(books.length)}
            icon={BookOpen}
            deltaLabel={`${formatInteger(availableBooks)} título(s) na estante agora`}
          />
          <StatTile
            label="Disponibilidade"
            value={formatPercent(availabilityRate, 0)}
            icon={Library}
            deltaLabel={
              books.length > 0
                ? `${formatInteger(availableBooks)} de ${formatInteger(books.length)} livros`
                : "nenhum livro cadastrado"
            }
          />
          <StatTile
            label={isAdmin ? "Empréstimos ativos" : "Seus empréstimos"}
            value={formatInteger(summary.active)}
            icon={Users}
            deltaLabel={
              summary.overdue > 0
                ? `${formatInteger(summary.overdue)} em atraso`
                : "nenhum em atraso"
            }
          />
          <StatTile
            label={isAdmin ? "Empréstimos no histórico" : "Seu histórico"}
            value={formatInteger(summary.total)}
            icon={RotateCcw}
            deltaLabel={`${formatInteger(summary.returned)} já devolvido(s)`}
          />
        </section>

        <Tabs defaultSelectedKey="catalog" className="gap-4">
          <Tabs.ListContainer>
            <Tabs.List className="grid w-full grid-cols-1 sm:grid-cols-3">
              <Tabs.Tab id="catalog">
                Catálogo
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="loans">
                Empréstimos Ativos
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="history">
                Histórico
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel className="p-0" id="catalog">
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
                      isOpen={isAddBookOpen}
                      onOpenChange={setIsAddBookOpen}
                      title="Adicionar Novo Livro"
                      description="Adicione um novo livro ao catálogo da biblioteca"
                      trigger={
                        <Button>
                          <Plus />
                          Novo Livro
                        </Button>
                      }
                      confirmLabel="Adicionar Livro"
                      onConfirm={addBook}
                    >
                      <FieldRow>
                        <ModalField label="Título" htmlFor="title">
                          <Input
                            id="title"
                            value={newBook.titulo}
                            onChange={(e) =>
                              setNewBook({
                                ...newBook,
                                titulo: e.target.value,
                              })
                            }
                            variant="secondary"
                            placeholder="Título do livro"
                          />
                        </ModalField>

                        <ModalField label="Autor" htmlFor="author">
                          <Input
                            id="author"
                            value={newBook.autor}
                            onChange={(e) =>
                              setNewBook({
                                ...newBook,
                                autor: e.target.value,
                              })
                            }
                            variant="secondary"
                            placeholder="Nome do autor"
                          />
                        </ModalField>
                      </FieldRow>

                      <FieldRow>
                        <ModalField label="Gênero" htmlFor="genre">
                          <Input
                            id="genre"
                            value={newBook.genero}
                            onChange={(e) =>
                              setNewBook({
                                ...newBook,
                                genero: e.target.value,
                              })
                            }
                            variant="secondary"
                            placeholder="Gênero do livro"
                          />
                        </ModalField>

                        <ModalField label="ISBN (opcional)" htmlFor="isbn">
                          <Input
                            id="isbn"
                            value={newBook.isbn}
                            onChange={(e) =>
                              setNewBook({
                                ...newBook,
                                isbn: e.target.value,
                              })
                            }
                            variant="secondary"
                            placeholder="ISBN do livro"
                          />
                        </ModalField>
                      </FieldRow>

                      <ModalField label="Capa do Livro">
                        <Button
                          type="button"
                          variant="outline"
                          onPress={fetchCover}
                          isDisabled={!newBook.titulo || coverLoading}
                          fullWidth
                        >
                          {coverLoading
                            ? "Buscando..."
                            : "Buscar Capa Automaticamente"}
                        </Button>

                        {newBook.capa && (
                          <div className="mt-2 flex gap-4">
                            <Image
                              src={newBook.capa}
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
                                  setNewBook({
                                    ...newBook,
                                    capa: "",
                                  })
                                }
                              >
                                Remover Capa
                              </Button>
                            </div>
                          </div>
                        )}
                      </ModalField>
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
                    value={filterGenre}
                    onChange={(value) => setFilterGenre(value as string)}
                    placeholder="Filtrar por gênero"
                    variant="secondary"
                  >
                    <Select.Trigger className="w-full sm:w-48">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item id="all" textValue="Todos os gêneros">
                          Todos os gêneros
                        </ListBox.Item>
                        {uniqueGenres.map((genre) => (
                          <ListBox.Item
                            key={genre}
                            id={genre}
                            textValue={genre}
                          >
                            {genre}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredBooks.map((book) => (
                    <Card variant="secondary" key={book.id}>
                      <Card.Content className="flex gap-4">
                        <Image
                          src={book.capa || "/placeholder.svg"}
                          alt={book.titulo}
                          width={80}
                          height={120}
                          className="h-30 w-20 shrink-0 rounded-lg object-cover"
                        />

                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div className="min-w-0">
                            <Card.Title className="truncate">
                              {book.titulo}
                            </Card.Title>
                            <Typography
                              className="truncate"
                              color="muted"
                              type="body-sm"
                            >
                              {book.autor}
                            </Typography>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Chip
                              color={book.disponivel ? "success" : "danger"}
                              variant="soft"
                              size="sm"
                            >
                              {book.disponivel ? "Disponível" : "Emprestado"}
                            </Chip>

                            <Chip color="accent" variant="soft" size="sm">
                              {book.genero}
                            </Chip>
                          </div>

                          {book.disponivel && (
                            <Button
                              size="sm"
                              className="mt-auto max-sm:w-full sm:w-fit"
                              onPress={() => openLoanModal(book)}
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

          <Tabs.Panel className="p-0" id="loans">
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
                  columns={activeColumns}
                  data={activeLoans}
                  label="Empréstimos ativos"
                  emptyMessage={
                    isAdmin
                      ? "Nenhum empréstimo ativo"
                      : "Você não possui empréstimos ativos"
                  }
                  total={activeTotal}
                  page={activePage}
                  totalPages={activeTotalPages}
                  onPageChange={setActivePage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(count) => {
                    setItemsPerPage(count);
                    resetPages();
                  }}
                  search={loanSearch}
                  onSearchChange={(value) => {
                    setLoanSearch(value);
                    resetPages();
                  }}
                  searchPlaceholder="Pesquisar por livro ou colaborador..."
                />
              </Card.Content>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel className="p-0" id="history">
            <Card>
              <Card.Header>
                <Card.Title>Histórico de Empréstimos</Card.Title>
                <Card.Description>
                  Todos os empréstimos realizados
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <DataTable
                  columns={historyColumns}
                  data={history}
                  label="Histórico de empréstimos"
                  emptyMessage="Nenhum empréstimo registrado"
                  total={historyTotal}
                  page={historyPage}
                  totalPages={historyTotalPages}
                  onPageChange={setHistoryPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={(count) => {
                    setItemsPerPage(count);
                    resetPages();
                  }}
                  search={loanSearch}
                  onSearchChange={(value) => {
                    setLoanSearch(value);
                    resetPages();
                  }}
                  searchPlaceholder="Pesquisar por livro ou colaborador..."
                />
              </Card.Content>
            </Card>
          </Tabs.Panel>
        </Tabs>

        <ModalForm
          isOpen={isLoanOpen}
          onOpenChange={closeLoanModal}
          title="Emprestar Livro"
          description={
            selectedBook
              ? `Emprestar "${selectedBook.titulo}" para um colaborador`
              : undefined
          }
          confirmLabel="Confirmar Empréstimo"
          onConfirm={lendBook}
        >
          <ModalField label="Colaborador" htmlFor="loan-employee">
            <Select
              value={newLoan.employeeId}
              onChange={(value) =>
                setNewLoan({
                  ...newLoan,
                  employeeId: value as string,
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
                    ? employees
                    : employees.filter((c) => c.id === user?.id)
                  ).map((employee) => (
                    <ListBox.Item
                      key={employee.id}
                      id={employee.id.toString()}
                      textValue={`${employee.nome} - ${employee.departamento}`}
                    >
                      {employee.nome} - {employee.departamento}
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
          </ModalField>

          <ModalField label="Período (dias)" htmlFor="days">
            <Select
              value={newLoan.days}
              onChange={(value) =>
                setNewLoan({
                  ...newLoan,
                  days: value as string,
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
          </ModalField>
        </ModalForm>
      </PageLayout>
    </ProtectedRoute>
  );
}

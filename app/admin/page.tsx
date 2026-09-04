"use client";

import { StatTile } from "@/components/dashboard/stat-tile";
import { diasAte, inteiro, percentual } from "@/components/dashboard/viz";
import { useConfirmacao } from "@/components/confirmacao";
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
  const confirmar = useConfirmacao();
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
  const [candidatosAdmin, setCandidatosAdmin] = useState<ColaboradorAdmin[]>(
    [],
  );
  const [podeGerenciarAdmins, setPodeGerenciarAdmins] = useState(false);
  const [isAddAdminTempOpen, setIsAddAdminTempOpen] = useState(false);

  const [adminTempData, setAdminTempData] = useState({
    colaborador_id: "",
    admin_ate: "",
    tipo_acesso: "temporario" as "temporario" | "permanente",
  });

  const [isEditAdminOpen, setIsEditAdminOpen] = useState(false);
  const [adminEmEdicao, setAdminEmEdicao] = useState<ColaboradorAdmin | null>(
    null,
  );
  const [editAdminData, setEditAdminData] = useState({
    admin_ate: "",
    tipo_acesso: "temporario" as "temporario" | "permanente",
  });

  const [isEditSetorOpen, setIsEditSetorOpen] = useState(false);
  const [setorEmEdicao, setSetorEmEdicao] = useState<Setor | null>(null);
  const [editSetor, setEditSetor] = useState({ nome: "", descricao: "" });

  useEffect(() => {
    if (!user?.email) {
      return;
    }

    fetchData();
  }, [
    user?.email,
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

      const emailUsuario = user?.email;

      const paramsUsuarios = new URLSearchParams({
        user_email: emailUsuario ?? "",
        page: String(paginaUsuariosAdmin),
        limit: String(itensPorPagina),
      });
      if (buscaUsuariosAdmin) paramsUsuarios.set("search", buscaUsuariosAdmin);

      const [
        colaboradoresRes,
        setoresRes,
        setoresPaginaRes,
        usuariosAdminRes,
        candidatosAdminRes,
      ] = await Promise.all([
        fetch(`/api/colaboradores?${paramsColaboradores}`),
        fetch("/api/admin/setores"),
        fetch(`/api/admin/setores?${paramsSetores}`),
        emailUsuario
          ? fetch(`/api/admin/usuarios?${paramsUsuarios}`)
          : Promise.resolve(null),
        emailUsuario
          ? fetch(
              `/api/admin/usuarios?escopo=candidatos&user_email=${encodeURIComponent(emailUsuario)}`,
            )
          : Promise.resolve(null),
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

        if (usuariosAdminRes) {
          setPodeGerenciarAdmins(usuariosAdminRes.status !== 403);
        }

        if (usuariosAdminRes?.ok) {
          const usuariosAdminData = await usuariosAdminRes.json();
          setColaboradoresAdmin(usuariosAdminData.data ?? []);
          setTotalPaginasUsuariosAdmin(usuariosAdminData.totalPages ?? 1);
          setTotalUsuariosAdmin(usuariosAdminData.total ?? 0);
          if (usuariosAdminData.resumo)
            setResumoAdmins(usuariosAdminData.resumo);
        }

        if (candidatosAdminRes?.ok) {
          const candidatos = await candidatosAdminRes.json();
          setCandidatosAdmin(Array.isArray(candidatos) ? candidatos : []);
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
            isIconOnly
            variant="outline"
            aria-label="Editar colaborador"
            onPress={() => {
              setSelectedColaborador(row.original);
              setIsEditColaboradorOpen(true);
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
            onPress={() => inativarColaborador(row.original.id)}
          >
            {row.original.status === "ativo" ? <Trash2 /> : <Users />}
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
          <Users className="h-4 w-4" />
          {String(info.getValue() || "Não definido")}
        </span>
      ),
      meta: { classe: "hidden sm:table-cell text-muted" },
    },
    {
      accessorKey: "total_colaboradores",
      header: "Colaboradores",
      cell: (info) => <Chip>{Number(info.getValue() ?? 0)} pessoa(s)</Chip>,
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            isIconOnly
            variant="outline"
            aria-label="Editar setor"
            onPress={() => abrirEdicaoSetor(row.original)}
          >
            <Edit />
          </Button>
          <Button
            isIconOnly
            variant="danger"
            aria-label="Excluir setor"
            onPress={() => removerSetor(row.original)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
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
      cell: ({ row }) => {
        if (row.original.admin_permanente)
          return <Chip color="accent">Admin Permanente</Chip>;

        const dias = diasAte(row.original.admin_temporario_ate);
        if (dias !== null && dias < 0)
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
      meta: { classe: "text-muted" },
    },
    {
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            isIconOnly
            variant="outline"
            aria-label="Editar privilégios de admin"
            onPress={() => abrirEdicaoAdmin(row.original)}
          >
            <Edit />
          </Button>
          <Button
            isIconOnly
            variant="danger"
            aria-label="Remover privilégios de admin"
            onPress={() => removerAdminTemporario(row.original)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
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

    if (
      !selectedColaborador.nome.trim() ||
      !selectedColaborador.email.trim() ||
      !selectedColaborador.departamento
    ) {
      toast.danger("Erro", {
        description: "Nome, email e departamento são obrigatórios.",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/colaboradores/${selectedColaborador.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: selectedColaborador.nome,
            email: selectedColaborador.email,
            departamento: selectedColaborador.departamento,
            cargo: selectedColaborador.cargo ?? null,
            setor_id: selectedColaborador.setor_id ?? null,
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

  const abrirEdicaoSetor = (setor: Setor) => {
    setSetorEmEdicao(setor);
    setEditSetor({ nome: setor.nome, descricao: setor.descricao ?? "" });
    setIsEditSetorOpen(true);
  };

  const editarSetor = async () => {
    if (!setorEmEdicao) return;

    if (!editSetor.nome.trim()) {
      toast.danger("Erro", {
        description: "Nome do setor é obrigatório.",
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/setores/${setorEmEdicao.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: editSetor.nome.trim(),
          descricao: editSetor.descricao.trim(),
        }),
      });

      if (response.ok) {
        fetchData();
        setIsEditSetorOpen(false);
        setSetorEmEdicao(null);

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

  const removerSetor = async (setor: Setor) => {
    const confirmado = await confirmar({
      titulo: "Excluir setor",
      descricao: `Tem certeza que deseja excluir o setor "${setor.nome}"? Essa ação não pode ser desfeita.`,
      rotuloConfirmar: "Excluir",
      destrutivo: true,
    });
    if (!confirmado) return;

    try {
      const response = await fetch(`/api/admin/setores/${setor.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchData();
        toast("Setor excluído!", {
          description: `O setor "${setor.nome}" foi removido com sucesso.`,
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

  const salvarPrivilegiosAdmin = async (
    colaboradorId: number,
    dados: { tipo_acesso: "temporario" | "permanente"; admin_ate: string },
    aoConcluir: () => void,
  ) => {
    const permanente = dados.tipo_acesso === "permanente";

    if (!permanente && !dados.admin_ate) {
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
          colaborador_id: colaboradorId,
          admin_permanente: permanente,
          admin_ate: permanente ? null : dados.admin_ate,
          user_email: user?.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        fetchData();
        aoConcluir();

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

  const definirAdminTemporario = async () => {
    if (!adminTempData.colaborador_id) {
      toast.danger("Erro", {
        description: "Selecione um colaborador.",
      });
      return;
    }

    await salvarPrivilegiosAdmin(
      Number(adminTempData.colaborador_id),
      adminTempData,
      () => {
        setIsAddAdminTempOpen(false);
        setAdminTempData({
          colaborador_id: "",
          admin_ate: "",
          tipo_acesso: "temporario",
        });
      },
    );
  };

  const abrirEdicaoAdmin = (colaborador: ColaboradorAdmin) => {
    setAdminEmEdicao(colaborador);
    setEditAdminData({
      tipo_acesso: colaborador.admin_permanente ? "permanente" : "temporario",
      admin_ate: colaborador.admin_temporario_ate
        ? String(colaborador.admin_temporario_ate).slice(0, 10)
        : "",
    });
    setIsEditAdminOpen(true);
  };

  const fecharEdicaoAdmin = () => {
    setIsEditAdminOpen(false);
    setAdminEmEdicao(null);
    setEditAdminData({ admin_ate: "", tipo_acesso: "temporario" });
  };

  const editarAdmin = async () => {
    if (!adminEmEdicao) return;

    await salvarPrivilegiosAdmin(
      adminEmEdicao.id,
      editAdminData,
      fecharEdicaoAdmin,
    );
  };

  const removerAdminTemporario = async (colaborador: ColaboradorAdmin) => {
    const confirmado = await confirmar({
      titulo: "Remover acesso de admin",
      descricao: `Tem certeza que deseja remover os privilégios de admin de ${colaborador.nome}?`,
      rotuloConfirmar: "Remover acesso",
      destrutivo: true,
    });
    if (!confirmado) return;

    try {
      const response = await fetch(
        `/api/admin/usuarios?colaborador_id=${colaborador.id}&user_email=${encodeURIComponent(user?.email ?? "")}`,
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

  const departamentosUnicos = resumoColaboradores.departamentos;
  const colaboradoresAtivos = resumoColaboradores.ativos;

  const taxaAtividade =
    colaboradores.length > 0
      ? (colaboradoresAtivos / resumoColaboradores.total) * 100
      : 0;
  const totalAdmins = resumoAdmins.admins;

  const candidatosAdminDisponiveis = candidatosAdmin;

  const adminsTemporariosVisiveis = colaboradoresAdmin.filter((c) => {
    const dias = diasAte(c.admin_temporario_ate);
    return !c.admin_permanente && dias !== null && dias >= 0;
  }).length;

  const isAdminPermanente = podeGerenciarAdmins;

  if (loading) {
    return (
      <ProtectedRoute>
        <SpinnerTela />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <LayoutPagina>
        <CabecalhoPagina
          titulo="Painel Administrativo"
          descricao="Gerencie colaboradores e setores da empresa"
          voltarHref="/"
        />

        <section
          aria-label="Indicadores do quadro"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
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
            <Tabs.List className="grid w-full grid-cols-1 sm:grid-cols-3">
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

          <Tabs.Panel className="p-0" id="colaboradores">
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
                    isOpen={isAddColaboradorOpen}
                    onOpenChange={(aberto) => {
                      setIsAddColaboradorOpen(aberto);
                      if (!aberto)
                        setNewColaborador({
                          nome: "",
                          email: "",
                          departamento: "",
                          cargo: "",
                          setor_id: "",
                        });
                    }}
                    titulo="Adicionar Novo Colaborador"
                    descricao="Cadastre um novo colaborador na empresa"
                    gatilho={
                      <Button>
                        <UserPlus />
                        Novo Colaborador
                      </Button>
                    }
                    rotuloConfirmar="Cadastrar Colaborador"
                    onConfirmar={adicionarColaborador}
                  >
                    <LinhaCampos>
                      <CampoModal rotulo="Nome Completo" htmlFor="nome">
                        <Input
                          id="nome"
                          value={newColaborador.nome}
                          onChange={(e) =>
                            setNewColaborador({
                              ...newColaborador,
                              nome: e.target.value,
                            })
                          }
                          variant="secondary"
                          placeholder="Nome do colaborador"
                        />
                      </CampoModal>

                      <CampoModal rotulo="Email" htmlFor="email">
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
                          variant="secondary"
                          placeholder="email@empresa.com"
                        />
                      </CampoModal>
                    </LinhaCampos>

                    <LinhaCampos>
                      <CampoModal
                        rotulo="Departamento"
                        htmlFor="departamento"
                      >
                        <Select
                          aria-label="Departamento"
                          value={newColaborador.departamento || null}
                          onChange={(chave) =>
                            setNewColaborador({
                              ...newColaborador,
                              departamento: chave ? String(chave) : "",
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
                      </CampoModal>

                      <CampoModal rotulo="Cargo" htmlFor="cargo">
                        <Input
                          id="cargo"
                          value={newColaborador.cargo}
                          onChange={(e) =>
                            setNewColaborador({
                              ...newColaborador,
                              cargo: e.target.value,
                            })
                          }
                          variant="secondary"
                          placeholder="Ex: Analista, Gerente, Coordenador..."
                        />
                      </CampoModal>
                    </LinhaCampos>

                    <CampoModal rotulo="Setor" htmlFor="setor">
                      <Select
                        aria-label="Setor"
                        value={newColaborador.setor_id || null}
                        onChange={(chave) =>
                          setNewColaborador({
                            ...newColaborador,
                            setor_id: chave ? String(chave) : "",
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
                    </CampoModal>
                  </ModalForm>
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

          <Tabs.Panel className="p-0" id="setores">
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
                    isOpen={isAddSetorOpen}
                    onOpenChange={(aberto) => {
                      setIsAddSetorOpen(aberto);
                      if (!aberto) setNewSetor({ nome: "", descricao: "" });
                    }}
                    titulo="Adicionar Novo Setor"
                    descricao="Crie um novo setor para organizar os colaboradores"
                    gatilho={
                      <Button>
                        <Plus />
                        Novo Setor
                      </Button>
                    }
                    rotuloConfirmar="Criar Setor"
                    onConfirmar={adicionarSetor}
                  >
                    <CampoModal rotulo="Nome do Setor" htmlFor="nome-setor">
                      <Input
                        id="nome-setor"
                        value={newSetor.nome}
                        onChange={(e) =>
                          setNewSetor({
                            ...newSetor,
                            nome: e.target.value,
                          })
                        }
                        variant="secondary"
                        placeholder="Ex: Desenvolvimento, Suporte..."
                      />
                    </CampoModal>

                    <CampoModal rotulo="Descrição" htmlFor="descricao-setor">
                      <Input
                        id="descricao-setor"
                        value={newSetor.descricao}
                        onChange={(e) =>
                          setNewSetor({
                            ...newSetor,
                            descricao: e.target.value,
                          })
                        }
                        variant="secondary"
                        placeholder="Breve descrição do setor"
                      />
                    </CampoModal>
                  </ModalForm>
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

          <Tabs.Panel className="p-0" id="usuarios-admin">
            {isAdminPermanente ? (
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
                      onOpenChange={(aberto) => {
                        setIsAddAdminTempOpen(aberto);
                        if (!aberto)
                          setAdminTempData({
                            colaborador_id: "",
                            admin_ate: "",
                            tipo_acesso: "temporario",
                          });
                      }}
                      titulo="Definir Admin"
                      descricao="Conceda privilégios administrativos a um colaborador, com ou sem prazo"
                      gatilho={
                        <Button>
                          <UserPlus />
                          Definir Admin
                        </Button>
                      }
                      rotuloConfirmar="Definir Admin"
                      onConfirmar={definirAdminTemporario}
                    >
                      <CampoModal
                        rotulo="Colaborador"
                        htmlFor="colaborador-admin"
                      >
                        <Select
                          aria-label="Colaborador"
                          value={adminTempData.colaborador_id || null}
                          onChange={(chave) =>
                            setAdminTempData({
                              ...adminTempData,
                              colaborador_id: chave ? String(chave) : "",
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
                              {candidatosAdminDisponiveis.map((colaborador) => (
                                <ListBox.Item
                                  key={colaborador.id}
                                  id={colaborador.id.toString()}
                                  textValue={`${colaborador.nome} (${colaborador.email})`}
                                >
                                  {colaborador.nome} ({colaborador.email})
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>

                        {candidatosAdminDisponiveis.length === 0 && (
                          <p className="text-sm text-muted">
                            Nenhum colaborador disponível para receber acesso de
                            admin.
                          </p>
                        )}
                      </CampoModal>

                      <CampoModal
                        rotulo="Tipo de acesso"
                        htmlFor="tipo-acesso-admin"
                      >
                        <Select
                          aria-label="Tipo de acesso"
                          value={adminTempData.tipo_acesso}
                          onChange={(chave) =>
                            setAdminTempData({
                              ...adminTempData,
                              tipo_acesso:
                                chave === "permanente"
                                  ? "permanente"
                                  : "temporario",
                              admin_ate:
                                chave === "permanente"
                                  ? ""
                                  : adminTempData.admin_ate,
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
                                id="temporario"
                                textValue="Temporário (com prazo)"
                              >
                                Temporário (com prazo)
                              </ListBox.Item>
                              <ListBox.Item
                                id="permanente"
                                textValue="Permanente (sem prazo)"
                              >
                                Permanente (sem prazo)
                              </ListBox.Item>
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </CampoModal>

                      {adminTempData.tipo_acesso === "temporario" ? (
                        <CampoModal rotulo="Admin até" htmlFor="admin-ate">
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
                            variant="secondary"
                          />
                        </CampoModal>
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
                    colunas={colunasUsuariosAdmin}
                    dados={colaboradoresAdmin}
                    rotulo="Usuários admin"
                    vazio="Nenhum administrador encontrado"
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
          onOpenChange={(aberto) => {
            if (aberto) setIsEditAdminOpen(true);
            else fecharEdicaoAdmin();
          }}
          titulo="Editar Acesso de Admin"
          descricao={
            adminEmEdicao
              ? `Ajuste o acesso de ${adminEmEdicao.nome}`
              : "Ajuste o acesso do administrador"
          }
          rotuloConfirmar="Salvar Alterações"
          onConfirmar={editarAdmin}
        >
          <CampoModal
            rotulo="Tipo de acesso"
            htmlFor="edit-tipo-acesso-admin"
          >
            <Select
              aria-label="Tipo de acesso"
              value={editAdminData.tipo_acesso}
              onChange={(chave) =>
                setEditAdminData({
                  ...editAdminData,
                  tipo_acesso:
                    chave === "permanente" ? "permanente" : "temporario",
                  admin_ate:
                    chave === "permanente" ? "" : editAdminData.admin_ate,
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
                    id="temporario"
                    textValue="Temporário (com prazo)"
                  >
                    Temporário (com prazo)
                  </ListBox.Item>
                  <ListBox.Item
                    id="permanente"
                    textValue="Permanente (sem prazo)"
                  >
                    Permanente (sem prazo)
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </CampoModal>

          {editAdminData.tipo_acesso === "temporario" ? (
            <CampoModal rotulo="Admin até" htmlFor="edit-admin-ate">
              <Input
                id="edit-admin-ate"
                type="date"
                value={editAdminData.admin_ate}
                onChange={(e) =>
                  setEditAdminData({
                    ...editAdminData,
                    admin_ate: e.target.value,
                  })
                }
                min={new Date().toISOString().split("T")[0]}
                variant="secondary"
              />
            </CampoModal>
          ) : (
            <p className="text-sm text-muted">
              Admin permanente não expira e só pode ser revogado manualmente
              nesta tela.
            </p>
          )}
        </ModalForm>

        <ModalForm
          isOpen={isEditSetorOpen}
          onOpenChange={(aberto) => {
            setIsEditSetorOpen(aberto);
            if (!aberto) {
              setSetorEmEdicao(null);
              setEditSetor({ nome: "", descricao: "" });
            }
          }}
          titulo="Editar Setor"
          descricao="Atualize o nome e a descrição do setor"
          rotuloConfirmar="Salvar Alterações"
          onConfirmar={editarSetor}
        >
          <CampoModal rotulo="Nome do Setor" htmlFor="edit-nome-setor">
            <Input
              id="edit-nome-setor"
              value={editSetor.nome}
              onChange={(e) =>
                setEditSetor({ ...editSetor, nome: e.target.value })
              }
              variant="secondary"
              placeholder="Ex: Desenvolvimento, Suporte..."
            />
          </CampoModal>

          <CampoModal rotulo="Descrição" htmlFor="edit-descricao-setor">
            <Input
              id="edit-descricao-setor"
              value={editSetor.descricao}
              onChange={(e) =>
                setEditSetor({
                  ...editSetor,
                  descricao: e.target.value,
                })
              }
              variant="secondary"
              placeholder="Breve descrição do setor"
            />
          </CampoModal>
        </ModalForm>

        <ModalForm
          isOpen={isEditColaboradorOpen}
          onOpenChange={(aberto) => {
            setIsEditColaboradorOpen(aberto);
            if (!aberto) setSelectedColaborador(null);
          }}
          titulo="Editar Colaborador"
          descricao="Atualize os dados do colaborador"
          rotuloConfirmar="Salvar Alterações"
          onConfirmar={editarColaborador}
        >
          {selectedColaborador && (
            <>
              <LinhaCampos>
                <CampoModal rotulo="Nome Completo" htmlFor="edit-nome">
                  <Input
                    id="edit-nome"
                    value={selectedColaborador.nome}
                    onChange={(e) =>
                      setSelectedColaborador({
                        ...selectedColaborador,
                        nome: e.target.value,
                      })
                    }
                    variant="secondary"
                  />
                </CampoModal>

                <CampoModal rotulo="Email" htmlFor="edit-email">
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
                    variant="secondary"
                  />
                </CampoModal>
              </LinhaCampos>

              <LinhaCampos>
                <CampoModal
                  rotulo="Departamento"
                  htmlFor="edit-departamento"
                >
                  <Select
                    aria-label="Departamento"
                    value={selectedColaborador.departamento || null}
                    onChange={(chave) =>
                      setSelectedColaborador({
                        ...selectedColaborador,
                        departamento: chave ? String(chave) : "",
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
                </CampoModal>

                <CampoModal rotulo="Cargo" htmlFor="edit-cargo">
                  <Input
                    id="edit-cargo"
                    value={selectedColaborador.cargo || ""}
                    onChange={(e) =>
                      setSelectedColaborador({
                        ...selectedColaborador,
                        cargo: e.target.value,
                      })
                    }
                    variant="secondary"
                  />
                </CampoModal>
              </LinhaCampos>

              <CampoModal rotulo="Setor" htmlFor="edit-setor">
                <Select
                  value={selectedColaborador.setor_id?.toString() || "0"}
                  onChange={(value) =>
                    setSelectedColaborador({
                      ...selectedColaborador,
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
              </CampoModal>
            </>
          )}
        </ModalForm>
      </LayoutPagina>
    </ProtectedRoute>
  );
}
